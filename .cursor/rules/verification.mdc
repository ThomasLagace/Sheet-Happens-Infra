---
description: How to verify infra changes — Compose validity, smoke the stack
globs: docker-compose.yml,docker/**,Makefile
alwaysApply: false
---

# Verification (no app test suite here)

This repository has **no** Playwright, PHPUnit, ESLint, or Prettier suite.
Do not add FE/API test runners here; those live in the cloned app repos.

## Before calling infra work done

1. `docker compose config` — must succeed (valid Compose file).
2. If services or images changed: `make build` or `make up` and confirm the
   touched services become healthy / reachable.
3. If Nginx locations changed: smoke `http://localhost/` (frontend) and
   `http://localhost/api` (API) as applicable.
4. If `agent/` changed: update its copies under `.cursor/` and `.claude/`.

## What not to do

- Do not point verification at a “real” remote API; use the Compose network.
- Do not require Edge, Vite unit tests, or `composer test` inside this repo
  for infra PRs — run those in Frontend / Api when changing those codebases.
- Prefer documenting a short manual smoke checklist in the PR when automation
  does not exist yet.
