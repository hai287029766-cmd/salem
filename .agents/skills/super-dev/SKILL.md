---
name: super-dev
description: Super Dev Codex App/Desktop project skill entry.
when_to_use: Use when the user says /super-dev, $super-dev, super-dev:, or super-dev： to enter or resume the Super Dev pipeline.
version: 2.4.0
---

# Super Dev for Codex

## Activation Contract

- If this skill is invoked, Super Dev pipeline mode is active.
- Treat Codex App/Desktop `/super-dev` as equivalent to Codex CLI `$super-dev`.
- Treat `super-dev: <需求>` and `super-dev：<需求>` as the natural-language fallback.
- Do not explain what Super Dev is before acting.

## Required First Reply

- State that Super Dev pipeline mode is active.
- Read `AGENTS.md`, `super-dev.yaml`, `.super-dev/WORKFLOW.md`, `.super-dev/project.md`, and `.super-dev/SESSION_BRIEF.md` if present.
- State the current phase from project state. In this repository it is currently `docs_confirm` unless the state files say otherwise.
- If core docs are already present, stay at the confirmation gate instead of restarting research.

## Required Workflow

1. Detect whether the work is `new`, `evolve`, `variant`, `patch`, or `resume`.
2. Read `knowledge/` and `output/knowledge-cache/*-knowledge-bundle.json` when present.
3. Produce or update `output/*-research.md`.
4. Produce or update `output/*-prd.md`, `output/*-architecture.md`, and `output/*-uiux.md`.
5. Wait for explicit confirmation before Spec or coding.
6. Only then create `.super-dev/changes/*/proposal.md` and `.super-dev/changes/*/tasks.md`.
7. Implement frontend first, then preview confirmation, backend, quality, and delivery.

## Continuity Rules

- If the workflow is waiting for docs confirmation, preview confirmation, UI revision, architecture revision, or quality revision, stay inside that gate.
- User replies like `修改`, `补充`, `继续改`, `确认`, `通过`, and `继续` remain inside the current gate.
- Resume from `.super-dev/SESSION_BRIEF.md`, `.super-dev/workflow-state.json`, review state, and `output/*` rather than restarting from scratch.
- Do not silently fall back to ordinary chat.

## UI Rules

- Lock icon library, typography, design tokens, component ecosystem, and page skeleton from `output/*-uiux.md` before UI implementation.
- Do not use emoji as functional icons, decorative icons, or placeholders.
- For Salem, use `lucide-react` and the colonial dark wood / parchment visual direction in `output/salem-uiux.md`.

## Super Dev System Flow Contract

- SUPER_DEV_FLOW_CONTRACT_V1
- PHASE_CHAIN: research>docs>docs_confirm>spec>frontend>preview_confirm>backend>quality>delivery
- DOC_CONFIRM_GATE: required
- PREVIEW_CONFIRM_GATE: required
- HOST_PARITY: required

