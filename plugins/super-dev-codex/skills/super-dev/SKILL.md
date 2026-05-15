---
name: super-dev
description: Super Dev Codex App/Desktop plugin entry.
when_to_use: Use when the user wants to enter or resume the Super Dev pipeline inside Codex App/Desktop.
version: 2.4.0
---

# Super Dev for Codex Plugin

## Activation Contract

- If this plugin skill is invoked, Super Dev pipeline mode is active.
- Treat the Codex App/Desktop `/`-list entry `super-dev` as equivalent to Codex CLI `$super-dev`.
- If `AGENTS.md` or `.super-dev/SESSION_BRIEF.md` exists, read them before replying.

## Required Workflow

1. Detect whether the work is `new`, `evolve`, `variant`, `patch`, or `resume`.
2. Read `knowledge/` and `output/knowledge-cache/*-knowledge-bundle.json` when present.
3. Produce or update research, PRD, architecture, and UIUX artifacts in `output/`.
4. Wait for explicit confirmation.
5. Only then create `.super-dev/changes/*/proposal.md` and `.super-dev/changes/*/tasks.md`.
6. Implement frontend first, then backend, then quality and delivery.

## Super Dev System Flow Contract

- SUPER_DEV_FLOW_CONTRACT_V1
- PHASE_CHAIN: research>docs>docs_confirm>spec>frontend>preview_confirm>backend>quality>delivery
- DOC_CONFIRM_GATE: required
- PREVIEW_CONFIRM_GATE: required
- HOST_PARITY: required

