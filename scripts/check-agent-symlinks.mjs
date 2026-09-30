/**
 * Assert that every shared agent artifact (agent/*.mdc and each
 * agent/<name>/SKILL.md) has at least one Git symlink (mode 120000)
 * somewhere in the repo pointing at it, and that each such link resolves
 * in the working tree to the same bytes as the agent source.
 *
 * Tool-agnostic: discovers links by scanning the Git index for symlinks
 * whose target resolves under agent/ (any provider's dotfiles).
 *
 * Usage (repo root):
 *   node scripts/check-agent-symlinks.mjs
 *   node scripts/check-agent-symlinks.mjs --fix
 * npm: npm run check:agent-symlinks | npm run fix:agent-symlinks
 *
 * --fix: rewrite the index when a tool path was staged as a regular
 * file copy of an agent source (common after `git add .` on Windows
 * hardlinks). Then re-run the assertion.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GIT_SYMLINK_MODE = '120000';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const errors = [];

function fail(message) {
    errors.push(message);
}

function git(args, { input, trim = true } = {}) {
    const result = spawnSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        shell: false,
        input,
    });
    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(
            `git ${args.join(' ')} failed: ${(result.stderr || result.stdout).trim()}`,
        );
    }
    const out = result.stdout || '';
    // Do not trim symlink blobs: trailing CR/LF is corruption we must detect.
    return trim ? out.trimEnd() : out;
}

function listAgentSources() {
    const agentDir = path.join(root, 'agent');
    const sources = [];
    if (!fs.existsSync(agentDir)) {
        return sources;
    }

    for (const entry of fs.readdirSync(agentDir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.mdc')) {
            sources.push(`agent/${entry.name}`);
        }
        if (entry.isDirectory()) {
            const skillPosix = `agent/${entry.name}/SKILL.md`;
            if (fs.existsSync(path.join(root, skillPosix))) {
                sources.push(skillPosix);
            }
        }
    }

    return sources.sort();
}

/** @returns {Map<string, { mode: string, hash: string }>} */
function indexedPaths() {
    const out = new Map();
    const listing = git(['ls-files', '-s', '-z']);
    if (!listing) {
        return out;
    }
    for (const record of listing.split('\0')) {
        if (!record) continue;
        const tab = record.indexOf('\t');
        if (tab === -1) continue;
        const meta = record.slice(0, tab);
        const filePath = record.slice(tab + 1).replace(/\\/g, '/');
        const [mode, hash] = meta.split(' ');
        out.set(filePath, { mode, hash });
    }
    return out;
}

function readGitBlob(hash) {
    return git(['cat-file', '-p', hash], { trim: false });
}

function normalizeRel(rel) {
    return path.posix.normalize(rel.replace(/\\/g, '/'));
}

/** Symlink blob text → posix target (strip CR/LF from Windows-tainted blobs). */
function cleanSymlinkTarget(raw) {
    return normalizeRel(String(raw).replace(/\r/g, '').replace(/\n/g, '').trim());
}

/** Resolve a symlink target recorded in git to a repo-relative posix path. */
function resolveSymlinkTarget(linkPosix, targetRaw) {
    const target = cleanSymlinkTarget(targetRaw);
    if (target.startsWith('/') || /^[A-Za-z]:/.test(target)) {
        return null;
    }
    const linkDir = path.posix.dirname(linkPosix);
    return normalizeRel(path.posix.join(linkDir, target));
}

function expectedRelativeTarget(linkPosix, agentPosix) {
    const linkDir = path.posix.dirname(linkPosix);
    return normalizeRel(path.posix.relative(linkDir, agentPosix));
}

function hashSymlinkTarget(targetRaw) {
    // Buffer input: avoid shell/encoding adding a trailing newline or CR.
    return git(['hash-object', '-w', '--stdin'], {
        input: Buffer.from(targetRaw, 'utf8'),
    });
}

function writeIndexSymlink(linkPosix, agentPosix) {
    const targetRaw = expectedRelativeTarget(linkPosix, agentPosix);
    const hash = hashSymlinkTarget(targetRaw);
    git([
        'update-index',
        '--add',
        '--cacheinfo',
        `${GIT_SYMLINK_MODE},${hash},${linkPosix}`,
    ]);
    return targetRaw;
}

/**
 * Paths that should be symlinks but were staged as regular copies of an
 * agent source (same blob hash), plus existing symlinks with a wrong
 * relative target.
 */
function collectIndexRepairs(index, agentSources) {
    /** @type {{ linkPosix: string, agentPosix: string, reason: string }[]} */
    const repairs = [];

    /** @type {Map<string, string>} content hash → agentPosix */
    const agentByContentHash = new Map();
    for (const agentPosix of agentSources) {
        const entry = index.get(agentPosix);
        const hash = entry
            ? entry.hash
            : git(['hash-object', agentPosix]).trim();
        agentByContentHash.set(hash, agentPosix);
    }

    for (const [linkPosix, entry] of index) {
        if (linkPosix === 'agent' || linkPosix.startsWith('agent/')) continue;

        if (entry.mode === GIT_SYMLINK_MODE) {
            const blob = readGitBlob(entry.hash);
            const resolved = resolveSymlinkTarget(linkPosix, blob);
            if (!resolved || !resolved.startsWith('agent/')) continue;
            if (!agentSources.includes(resolved)) continue;
            const want = expectedRelativeTarget(linkPosix, resolved);
            // Exact blob match: catches CRLF-tainted targets Windows tools sometimes write.
            if (blob !== want) {
                const shown = cleanSymlinkTarget(blob);
                repairs.push({
                    linkPosix,
                    agentPosix: resolved,
                    reason:
                        blob === shown
                            ? `wrong target "${blob}" → "${want}"`
                            : `tainted target ${JSON.stringify(blob)} → "${want}"`,
                });
            }
            continue;
        }

        if (entry.mode === '100644' || entry.mode === '100755') {
            const agentPosix = agentByContentHash.get(entry.hash);
            if (!agentPosix) continue;
            repairs.push({
                linkPosix,
                agentPosix,
                reason: `mode ${entry.mode} copy of ${agentPosix} → symlink`,
            });
        }
    }

    return repairs;
}

function fixIndexCopies(agentSources) {
    const index = indexedPaths();
    const repairs = collectIndexRepairs(index, agentSources);
    if (repairs.length === 0) {
        console.log('fix-agent-symlinks: nothing to rewrite in the index');
        return 0;
    }

    for (const { linkPosix, agentPosix, reason } of repairs) {
        const targetRaw = writeIndexSymlink(linkPosix, agentPosix);
        console.log(`fixed ${linkPosix} → ${targetRaw} (${reason})`);
    }
    return repairs.length;
}

/**
 * @returns {Map<string, { linkPosix: string, targetRaw: string }[]>}
 *   agentPosix → links that point at it
 */
function discoverLinksToAgent(index, agentSources) {
    const agentSet = new Set(agentSources);
    /** @type {Map<string, { linkPosix: string, targetRaw: string }[]>} */
    const byAgent = new Map(agentSources.map((s) => [s, []]));

    for (const [linkPosix, entry] of index) {
        if (entry.mode !== GIT_SYMLINK_MODE) continue;
        if (linkPosix === 'agent' || linkPosix.startsWith('agent/')) continue;

        const blob = readGitBlob(entry.hash);
        const targetRaw = cleanSymlinkTarget(blob);
        const resolved = resolveSymlinkTarget(linkPosix, blob);
        if (!resolved || !resolved.startsWith('agent/')) continue;

        if (!agentSet.has(resolved)) {
            fail(
                `${linkPosix}: symlink resolves to "${resolved}", which is not a known agent/*.mdc or agent/*/SKILL.md source`,
            );
            continue;
        }

        const want = expectedRelativeTarget(linkPosix, resolved);
        if (blob !== want) {
            fail(
                `${linkPosix}: symlink target is ${JSON.stringify(blob)}, expected "${want}" (→ ${resolved})`,
            );
        }

        byAgent.get(resolved).push({ linkPosix, targetRaw });
    }

    return byAgent;
}

function assertWorktreeResolves(linkPosix, agentPosix, targetRaw) {
    const linkAbs = path.join(root, ...linkPosix.split('/'));
    const agentAbs = path.join(root, ...agentPosix.split('/'));

    if (!fs.existsSync(agentAbs)) {
        fail(`${agentPosix}: agent source missing`);
        return;
    }
    if (!fs.existsSync(linkAbs)) {
        fail(`${linkPosix}: working tree path missing`);
        return;
    }

    const agentBytes = fs.readFileSync(agentAbs);
    const linkBytes = fs.readFileSync(linkAbs);
    const asText = linkBytes.toString('utf8').trim().replace(/\\/g, '/');
    const targetNorm = normalizeRel(targetRaw);

    // Broken Windows checkout: git wrote the target path as a plain file.
    if (linkBytes.length < 200 && asText === targetNorm) {
        fail(
            `${linkPosix}: working tree is a plain path file ("${asText}"), not a resolved link — enable Developer Mode / core.symlinks and re-checkout (see docs/agent-symlinks.md)`,
        );
        return;
    }

    if (!agentBytes.equals(linkBytes)) {
        fail(
            `${linkPosix}: content does not match ${agentPosix} (copy or broken link?)`,
        );
    }
}

function assertAll(agentSources) {
    errors.length = 0;
    const index = indexedPaths();
    const byAgent = discoverLinksToAgent(index, agentSources);

    let linkCount = 0;
    for (const agentPosix of agentSources) {
        const links = byAgent.get(agentPosix) || [];
        if (links.length === 0) {
            fail(
                `${agentPosix}: no tool symlink found in the git index (add a mode-${GIT_SYMLINK_MODE} link from the tool path → this file)`,
            );
            continue;
        }
        for (const { linkPosix, targetRaw } of links) {
            linkCount += 1;
            assertWorktreeResolves(linkPosix, agentPosix, targetRaw);
        }
    }

    if (errors.length > 0) {
        console.error('check-agent-symlinks: FAILED\n');
        for (const message of errors) {
            console.error(`- ${message}`);
        }
        console.error(
            `\n${errors.length} issue(s). See AGENTS.md and docs/agent-symlinks.md.`,
        );
        console.error(
            'If `git add` turned symlinks into copies, run: npm run fix:agent-symlinks',
        );
        process.exit(1);
    }

    console.log(
        `check-agent-symlinks: OK (${agentSources.length} agent source(s), ${linkCount} tool link(s))`,
    );
}

function main() {
    const fix = process.argv.includes('--fix');
    const agentSources = listAgentSources();
    if (agentSources.length === 0) {
        console.error('check-agent-symlinks: no agent/*.mdc or agent/*/SKILL.md sources found');
        process.exit(1);
    }

    if (fix) {
        fixIndexCopies(agentSources);
    }

    assertAll(agentSources);
}

main();
