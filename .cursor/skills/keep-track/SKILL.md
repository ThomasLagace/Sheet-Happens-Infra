---
name: archive-log
description: Maintain a running, deduplicated log of every change made to this project in a single ARCHIVE.md file. Use this skill for EVERY task in this repo, no exceptions — before writing any plan, code, or edit, you must first read ARCHIVE.md (if it exists) and explicitly acknowledge its contents; after finishing a prompt, you must append one concise paragraph describing what changed and why. Trigger this whenever you are about to plan work, write code, edit files, or wrap up a response in a repo that uses this skill.
---

# Archive Log

A lightweight discipline for keeping a single, trustworthy history of *what changed and why* — without letting documentation balloon into its own maintenance burden.

This skill has two non-negotiable halves. Skipping either one defeats the purpose:

1. **Read before you plan.** Before proposing or starting any plan, edit, or piece of code, open `ARCHIVE.md` (create it if it doesn't exist yet — see template below) and read it in full. Do not begin planning until you have done this. If the file is empty or missing, note that this is the first entry and proceed. If it has content, your plan must take it into account — don't propose something that contradicts, re-solves, or ignores a decision already recorded there.
2. **Write after you finish.** At the end of any prompt where you made a change (code, config, architecture decision, file structure, etc.), append exactly one entry to `ARCHIVE.md`: a single paragraph, no more. It should read like a compressed lab notebook — what changed and the key reasoning behind it — not a diff, not a bullet list, not a changelog copy. If a prompt produced no lasting change (a question was answered, nothing was modified), do not write an entry.

## Step 1 — Acknowledge before planning

At the start of any task:

- Check whether `ARCHIVE.md` exists at the project root.
- If it exists, read it fully before forming a plan. Treat it as ground truth about the project's history — more reliable than re-deriving intent from the code alone.
- If it does not exist, create it with the header template below and treat this as entry #1.
- State in one short line that you've reviewed it (e.g. "Reviewed ARCHIVE.md — N prior entries, most recent covers X.") before diving into the plan. This is a checkpoint, not a summary — don't restate every past entry, just confirm you've read them.

## Step 2 — Avoid duplicating what's already documented

Before appending a new entry:

- Scan existing entries for the same file, feature, or decision. If what you did this turn is a continuation of an already-logged change (not a new fact), fold it into context mentally, but only write a new entry if there's something new to say — a new reason, a reversal, a new file touched, a new constraint discovered.
- Never re-describe a change that's already fully captured by a prior entry, even if you touched the same file again for an unrelated reason. Reference it by date instead of repeating it, e.g. "Building on the auth refactor (see 2026-09-18): ..."
- If you're unsure whether something counts as new, default to brevity: a half-sentence addendum to the relevant existing entry is better than a redundant full paragraph.

## Step 3 — Write the entry

Append (never overwrite or reorder) using this format:

```
## YYYY-MM-DD — <short title>
<One paragraph. What changed, and the key reasoning behind it — not a step-by-step account.>
```

Rules for the paragraph:

- **One paragraph, hard limit.** If you're tempted to use a list or sub-headings, you're documenting too much — compress to the decision and its rationale.
- Prioritize *why* over *what*: the diff already shows what changed; the paragraph's job is to capture the reasoning, trade-offs, or constraints that aren't visible in the code itself.
- Skip preamble ("In this session I..."). Start directly with the substance.
- No entry, however small, gets a full paragraph if a clause tacked onto an existing entry says the same thing with less noise.

## Template for a new ARCHIVE.md

```
# Archive

A running log of changes made to this project and the reasoning behind them.
Read this file before planning any new work; append one paragraph per change when you finish.

## YYYY-MM-DD — <short title>
<paragraph>
```

## Example entries (for calibration)

```
## 2026-09-18 — Auth: switch from session cookies to JWT
Session cookies didn't survive the move to a separate API domain (cross-site cookie blocking), so auth now issues short-lived JWTs with a refresh endpoint; chose JWT over server-side session storage to avoid adding a shared session store just for this.

## 2026-09-20 — Add rate limiting to /api/upload
Uploads were unthrottled and a single client could exhaust disk quota; added a per-IP token bucket (10 req/min) rather than per-user, since uploads are pre-auth in the current flow.
```

Notice each entry is one paragraph, states the reasoning (not just the mechanics), and a later change that builds on one of these would reference it by date rather than re-explaining it.