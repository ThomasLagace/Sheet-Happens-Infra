---
description: Product and infra scope limits — do not expand without explicit request
---

# Scope limits

Do not add features or data that widen project scope unless the user explicitly asks.

## This repository

This repo is **local orchestration only** (Docker Compose, Nginx reverse
proxy, Makefile / clone scripts, shared agent docs). Do **not**:

- Implement Sheet Happens product UI, API business logic, or D&D rules here
- Commit application code under `frontend/` or `backend/` (those are local
  clones, gitignored) — change the Frontend / Api repositories instead
- Add a second app stack, extra reverse-proxy products, or unrelated services
  without an explicit request

## Product (Sheet Happens) — still out of scope unless asked

Even when changing infra that supports the apps, do not enable or assume:

- Multiclassing
- Classes other than Barbarian, Cleric, Fighter, Wizard, Rogue
- Races outside the base Player's Handbook
- Character level above 5
- More than one subclass per class
- More than 5 saved characters per user

Documentation and issues: **French**. Code (identifiers, comments) and commits: **English**.

Before marking infra work done: the touched stack path must start cleanly
(`make up` / `make build` as relevant) and `docker compose config` must be
valid. When `agent/` changed: its copies under `.cursor/` and `.claude/`
must be updated too.
