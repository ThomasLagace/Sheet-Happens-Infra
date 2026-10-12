---
name: akinator
description: >-
  Clarifies broad feature or bug-fix prompts by asking the operator every
  subjective question needed until the demand is concrete and crystal clear —
  no agent leaps of faith. Prefer project docs to answer or narrow questions;
  in CI or other no-operator environments, skip Q&A and lean harder on those
  docs. Use when starting a feature, bug fix, or any request that still leaves
  product/UX/scope choices open, or when the user invokes akinator.
---

# Akinator

Turn a vague feature or bug-fix request into an unambiguous brief before any
implementation. The agent must not invent product, UX, scope, or behavior
choices. Ask until nothing subjective remains — or, with no operator, resolve
only from documentation and flag what docs cannot decide.

## Operator vs no-operator

**Interactive operator** (normal IDE chat, human replies expected): run the
question loop below. Do not implement until the exit criteria pass.

**No operator** — skip all questions and go to [Doc-only mode](#doc-only-mode)
when any of these hold:

- `CI`, `GITHUB_ACTIONS`, `GITLAB_CI`, `BUILD_ID`, `JENKINS_URL`, or similar
  automation env is set
- The task is an automated PR / bot review with no human turn expected
- The user (or harness) explicitly says there is no operator / non-interactive

If unsure whether an operator is present, prefer asking once; if no reply
channel exists, use Doc-only mode.

## Before asking anything

1. Read the request and list every decision that would otherwise be a guess
   (behavior, UX copy, edge cases, acceptance criteria, out-of-scope
   boundaries, data shape, API vs local config, error handling, etc.).
2. **Consult docs first** so questions are fewer and sharper. Discover what
   this repo actually has (do not assume fixed filenames). Prefer, in order
   when they conflict:
   - Operator-stated priority, linked issue/PR, or “source of truth” docs the
     repo names as overriding others
   - Product / requirements / scope docs under `docs/`, `agent/`, or equivalent
   - Agent rules and skills already loaded for this project
   - `CONTRIBUTING`, `AGENTS`/`CLAUDE`, `README`, ADRs, and git/workflow docs
   - Domain or feature docs that match the request
3. For each open point, classify:
   - **Resolved by docs** — record the answer + source; do not ask.
   - **Partially constrained by docs** — ask only the remaining fork, citing
     what the docs already fix.
   - **Undocumented / subjective** — must ask the operator.

Never ask a question whose answer is already explicit in those docs.

## Question loop (operator present)

Repeat until [Exit criteria](#exit-criteria):

1. Ask **only** unresolved subjective points. Prefer a short batch of focused
   questions (typically 1–5) over one endless dump.
2. Prefer closed or semi-closed forms (A/B/C, yes/no, pick from a list) when
   options are known; open questions only when the space is unknown.
3. One concern per question. No “and also…” stacks.
4. If the operator’s answer creates new ambiguity, ask follow-ups — do not
   fill gaps yourself.
5. If the operator says “your call”, “whatever”, or similar: refuse the leap.
   Rephrase options and ask them to pick, or ask which doc/priority should
   decide. Do not treat deference as authorization to invent.
6. After each round, re-check docs in case a new answer points at an existing
   rule.

Stop asking only when the exit criteria pass — not when the prompt “feels”
clear enough to start coding.

## Exit criteria

Proceed to implementation (or hand off a brief) only when all are true:

- [ ] Goal and non-goals are explicit (including any scope limits the
      project docs define).
- [ ] Observable behavior and acceptance checks are stated (what “done”
      looks like).
- [ ] Subjective UX/product choices (copy, layout, defaults, empty/error
      states) are decided by the operator or by a cited doc — none left to
      agent taste.
- [ ] Edge cases called out in the request or docs are resolved or
      explicitly deferred by the operator.
- [ ] No remaining “probably”, “should be fine”, or silent default where
      another reasonable choice exists.

When exiting, give a short **Locked brief** (bullet list): decisions + doc
citations. Then implement against that brief only.

## Doc-only mode

No questions. Maximize use of the documentation list above.

1. Build the same decision list as in the interactive path.
2. Fill every point docs can fill; cite paths (and sections if obvious).
3. For anything still subjective after docs: **do not invent**. State it as
   an open risk / blocker in the brief (or PR note). Prefer the narrowest
   change that docs support; if docs are silent and a choice is required to
   ship, pick the option that least expands scope and label it
   `UNCONFIRMED (no operator)` in the brief.
4. Do not pretend the demand was crystal clear when it was not.

## Anti-patterns

- Starting to code while a product/UX fork is still open
- Asking questions already answered by project docs already consulted
- Infinite trivia: if a detail cannot affect implementation or acceptance,
  drop it
- “I’ll assume X” without operator confirmation or a doc citation
- Treating CI silence as consent for subjective choices
