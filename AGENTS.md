# Agent Instructions

Read this file before work in this repo.

## Product Shape

Rux is the selected product name for a test-first tool that records AI coding runs through one simple loop:

```
plan -> run -> record -> review -> improve
```

Keep the product agent-first, creator-friendly, and boring in the right places. Do not turn it into a generic LLM gateway, SaaS admin panel, benchmark website, or workflow-theory project.

Runtime naming lives in `src/identity.mjs`; package publishing stays gated by local smoke tests, real provider smoke tests, checked provider task evidence, and the release checklist.

## Working Rules

- Keep the current state in `docs/STATE.md` accurate after meaningful work.
- Prefer small docs and runnable examples over long strategy notes.
- Re-implement from scratch. Borrow concepts from other projects, never code or project-specific machinery.
- Treat adapter behavior as volatile. Verify provider CLI commands against the installed tool before documenting exact flags.
- Do not store provider credentials. Inherit auth from the wrapped CLI or the user's environment.
- Do not add telemetry by default.
- Refuse parallel runs over one subscription CLI account by default. Let users opt in only when they confirm their provider terms and account setup allow it.
- Do not let the tool silently change its own source code. Improvement loops may propose changes with evidence; a human decides.
- If a task needs multiple agents, state why one agent is not enough.
- If a feature adds new nouns, push back unless it clearly reduces user effort.

## Rux Dogfood

Rux is the default evidence layer for substantial agent-owned work.

- Before non-trivial implementation, review, or repair work, run `rux plan "<task>" --cwd "$PWD"` and use it as a read-only roster/evidence preview.
- When delegating to a provider CLI, use `rux run "<task>" --runner claude|codex|gemini --provider-mode plan|write --cwd "$PWD" --check "<repo check>"` instead of invoking the provider directly.
- For tightly scoped write tasks, add `--write-scope "path[,path...]"` so out-of-scope edits become failed evidence instead of silent drift.
- If Rux refuses a real provider run because the worktree is dirty, do not pass `--allow-dirty` unless the dirty files are intentionally part of the provider context and the user has accepted that risk.
- Do not spawn nested Codex/Claude/Gemini runs only to satisfy this rule when the current agent is already doing the work; use `rux record "<task>" --runner codex|claude|gemini --check "<repo check>" --cwd "$PWD"` after the work instead.
- After reviewing a Rux run, attach `rux verdict <run-id> accepted|partial|rejected --cwd "$PWD" --note "<why>"`.
- Capture dogfood feedback with `rux report "<summary>" --kind bug|ux|adapter|docs|routing|orchestration|install|idea|success|other --source-repo "$PWD" --run-id <id-if-any> --command "<command>" --note "<details>" --cwd "$PWD"`.
- If Rux is unavailable or would block an urgent/trivial task, continue and mention why the run or report was not captured.

## Post-Goal Lead Review

After a goal is genuinely achieved and before creating the next goal, ask Claude CLI for lead-style review/advice using `prompts/post-goal-review.md`. Keep the prompt sanitized by default; do not send private repo names, local paths, proprietary code, secrets, customer data, or unpublished workspace details unless the user explicitly approves that disclosure after being told the risk. Record any unavailable requested model alias and the fallback used.

## Documentation Contract

This repo should stay readable in minutes:

- `README.md` tells a new user what this is.
- `docs/VISION.md` tells us the product arc and guardrails.
- `docs/STATE.md` tells the creator what is true now.
- `docs/ARCHITECTURE.md` explains the system in one sitting.
- `docs/V0_PLAN.md` tells us what to build first and what not to build.
- `docs/STANDARDS.md` defines coding and release standards.
- `docs/DECISIONS.md` records sticky decisions.

Do not add new docs until the existing ones cannot carry the work cleanly.
