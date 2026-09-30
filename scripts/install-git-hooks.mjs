/**
 * Configure this clone for shared agent/ symlinks. Invoked from npm
 * "prepare" after install (and safe no-op outside a git work tree):
 * - core.hooksPath=.githooks  (pre-commit repairs staged copies)
 * - core.symlinks=true        (checkout restores real symlinks when the OS allows)
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function git(args) {
    return spawnSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        shell: false,
    });
}

const inside = git(['rev-parse', '--is-inside-work-tree']);
if (inside.status !== 0 || inside.stdout.trim() !== 'true') {
    process.exit(0);
}

const steps = [
    { args: ['config', 'core.hooksPath', '.githooks'], ok: 'core.hooksPath=.githooks' },
    { args: ['config', 'core.symlinks', 'true'], ok: 'core.symlinks=true' },
];

let failed = false;
for (const { args, ok } of steps) {
    const result = git(args);
    if (result.status !== 0) {
        failed = true;
        console.warn(
            `install-git-hooks: could not set ${ok}:`,
            (result.stderr || result.stdout).trim(),
        );
        continue;
    }
    console.log(`install-git-hooks: ${ok}`);
}

if (failed) {
    console.error(
        'install-git-hooks: failed — run `npm install` again or set the configs manually (see docs/agent-symlinks.md)',
    );
    process.exit(1);
}
