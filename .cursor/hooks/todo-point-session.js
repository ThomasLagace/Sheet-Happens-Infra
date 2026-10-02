#!/usr/bin/env node
/**
 * sessionStart: remind the agent how the per-todo commit hook expects plans to be progressed.
 */
"use strict";

const fs = require("fs");

try {
  fs.readFileSync(0, "utf8");
} catch {
  // ignore empty/invalid stdin
}

const additional_context = [
  "Plan-point auto-commit hook is active.",
  "When executing a scaffolded TODO/plan with bullet points:",
  "1) Work on exactly one todo point at a time.",
  "2) As soon as that point is finished, mark it completed with TodoWrite (prefer merge:true) before starting the next point.",
  "3) A project hook will create a local git commit using that todo text as the message.",
  "4) Do not push commits.",
  "5) Do not GPG/SSH sign or cosign commits.",
  "6) Do not create a redundant manual commit for the same completed point unless the hook reports that the auto-commit failed.",
].join(" ");

process.stdout.write(JSON.stringify({ additional_context }) + "\n");
process.exit(0);