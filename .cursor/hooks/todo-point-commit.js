#!/usr/bin/env node
/**
 * postToolUse (TodoWrite): after each newly completed plan point, create a local
 * unsigned git commit with a message derived from that todo. Never push. Never sign/cosign.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function respond(payload) {
  process.stdout.write(JSON.stringify(payload || {}) + "\n");
}

function git(repo, args, extraEnv = {}) {
  return spawnSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });
}

function findGitRoot(start) {
  let dir = path.resolve(start || process.cwd());
  for (;;) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function collectRepos(candidates) {
  const repos = new Set();
  for (const candidate of candidates) {
    if (!candidate || !fs.existsSync(candidate)) continue;
    const root = findGitRoot(candidate);
    if (root) repos.add(root);

    let entries = [];
    try {
      entries = fs.readdirSync(candidate, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name === ".cursor") {
        continue;
      }
      const child = path.join(candidate, ent.name);
      if (fs.existsSync(path.join(child, ".git"))) repos.add(child);
    }
  }
  return [...repos];
}

function hasChanges(repo) {
  const result = git(repo, ["status", "--porcelain"]);
  return result.status === 0 && result.stdout.trim().length > 0;
}

function isSecretOrInternalPath(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/").toLowerCase();
  const base = path.basename(normalized);
  if (base === ".env" || base.startsWith(".env.")) return true;
  if (base.endsWith(".pem") || base.endsWith(".key")) return true;
  if (base === "credentials.json" || base === "secrets.json" || base === "id_rsa") return true;
  if (normalized.includes("/.cursor/hooks/state/")) return true;
  return false;
}

function porcelainPaths(repo) {
  const result = git(repo, ["status", "--porcelain", "-uall"]);
  if (result.status !== 0) return [];
  const paths = [];
  for (const line of result.stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const raw = line.slice(3);
    const filePath = raw.includes(" -> ") ? raw.split(" -> ").pop() : raw;
    if (filePath) paths.push(filePath);
  }
  return paths;
}

function stageSafe(repo) {
  const files = porcelainPaths(repo).filter((p) => !isSecretOrInternalPath(p));
  if (files.length === 0) return false;
  const add = git(repo, ["add", "--", ...files]);
  return add.status === 0;
}

function hasStagedChanges(repo) {
  const result = git(repo, ["diff", "--cached", "--quiet"]);
  // exit 1 => differences exist
  return result.status === 1;
}

function commitUnsigned(repo, message) {
  // Explicitly disable signing/cosigning. Never push from this hook.
  return spawnSync(
    "git",
    [
      "-C",
      repo,
      "-c",
      "commit.gpgsign=false",
      "-c",
      "gpg.format=openpgp",
      "commit",
      "--no-gpg-sign",
      "-m",
      message,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME,
        GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME,
      },
    }
  );
}

function statePath(conversationId) {
  const dir = path.join(os.tmpdir(), "cursor-todo-point-commit");
  fs.mkdirSync(dir, { recursive: true });
  const safeId = String(conversationId || "default").replace(/[^\w.-]+/g, "_");
  return path.join(dir, `${safeId}.json`);
}

function loadState(conversationId) {
  const file = statePath(conversationId);
  try {
    return { file, data: JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    return { file, data: { committedIds: [] } };
  }
}

function saveState(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function extractTodos(toolInput) {
  let input = toolInput;
  if (!input) return [];
  if (typeof input === "string") {
    try {
      input = JSON.parse(input);
    } catch {
      return [];
    }
  }
  return Array.isArray(input.todos) ? input.todos : [];
}

function todoKey(todo) {
  if (!todo) return null;
  if (todo.id) return String(todo.id);
  if (todo.content) return `content:${todo.content}`;
  return null;
}

function sanitizeMessage(content) {
  let message = String(content || "Complete plan point")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!message) message = "Complete plan point";
  if (message.length > 72) message = `${message.slice(0, 69)}...`;
  return message;
}

function buildCommitMessage(newlyCompleted) {
  if (newlyCompleted.length === 1) {
    return sanitizeMessage(newlyCompleted[0].content);
  }
  return sanitizeMessage(newlyCompleted.map((t) => t.content).join("; "));
}

function main() {
  let input;
  try {
    input = JSON.parse(readStdin() || "{}");
  } catch {
    respond({});
    return;
  }

  const toolName = input.tool_name || "";
  if (toolName && toolName !== "TodoWrite") {
    respond({});
    return;
  }

  const todos = extractTodos(input.tool_input);
  const completed = todos.filter((t) => t && t.status === "completed");
  const { file, data } = loadState(input.conversation_id);
  const already = new Set(Array.isArray(data.committedIds) ? data.committedIds : []);

  const newly = [];
  for (const todo of completed) {
    const key = todoKey(todo);
    if (!key || already.has(key)) continue;
    newly.push(todo);
  }

  if (newly.length === 0) {
    respond({});
    return;
  }

  const candidates = [input.cwd, ...(input.workspace_roots || [])].filter(Boolean);
  const repos = collectRepos(candidates).filter(hasChanges);
  const message = buildCommitMessage(newly);
  const results = [];

  if (repos.length === 0) {
    for (const todo of newly) {
      const key = todoKey(todo);
      if (key) already.add(key);
    }
    data.committedIds = [...already];
    saveState(file, data);
    respond({
      additional_context:
        `Todo-point commit hook: completed ${newly.length} plan point(s) ` +
        `("${message}") but found no dirty git repo to commit. No push/sign attempted.`,
    });
    return;
  }

  for (const repo of repos) {
    if (!hasChanges(repo)) continue;
    if (!stageSafe(repo)) {
      results.push(`${path.basename(repo)}: nothing safe to stage`);
      continue;
    }
    if (!hasStagedChanges(repo)) {
      results.push(`${path.basename(repo)}: nothing staged`);
      continue;
    }
    const commitResult = commitUnsigned(repo, message);
    if (commitResult.status === 0) {
      results.push(`${path.basename(repo)}: committed "${message}"`);
    } else {
      const err = (commitResult.stderr || commitResult.stdout || "unknown error")
        .trim()
        .split(/\r?\n/)[0];
      results.push(`${path.basename(repo)}: commit failed (${err})`);
    }
  }

  for (const todo of newly) {
    const key = todoKey(todo);
    if (key) already.add(key);
  }
  data.committedIds = [...already];
  saveState(file, data);

  respond({
    additional_context:
      `Auto-committed after completed plan point(s); unsigned local commit only; never pushed. ` +
      results.join("; "),
  });
}

main();