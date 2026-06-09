# Rux

Rux is an open-source, test-first run ledger for AI coding agents. It records real local agent sessions first, then uses that evidence to recommend better runner and roster choices over time.

It helps a developer or team answer one practical question:

> For this repo and this task, which agent setup should we use, what happened, and what did we learn?

It is not a model gateway. It does not proxy API calls, hide provider auth, or replace Claude Code, Codex, Gemini CLI, Cursor, Zed, VS Code, or other tools. It wraps the tools people already use, records what happened, and uses that evidence to recommend better runs over time.

## First Product

The first useful version is intentionally small:

- Detect local agent CLIs.
- Initialize repo-local policy and ignore rules.
- Plan a small sequential runner/roster before execution.
- Run a task through one selected agent.
- Run explicit provider smoke checks before release.
- Run fixed sequential rosters: `solo`, `pair`, `repair`, and `plan-code-review`.
- Record the prompt, runner, model, effort, transcript, adapter invocation, status reason, repo state, changed files, outcome, and cost hints in a local ledger.
- Capture tests/checks during or after a run, explicit human verdicts, and downstream lifecycle marks.
- Store replay metadata so captured runs can explain how they were invoked.
- Explain the outcome signal behind each run.
- Explain why a run does or does not count as routing evidence.
- Import selected old session artifacts as low-confidence history.
- Rank runner/model/effort/roster evidence by task kind.
- Suggest a runner only when local labeled evidence supports it.
- Write proposal-only improvement notes that cite run IDs.
- Capture local feedback reports for bugs, confusing UX, adapter issues, ideas, and useful wins.
- Export shareable run evidence for review.
- Keep repo-level runner safety defaults in a committed policy file.
- Check local readiness and release gates before publishing.
- Block accidental npm publish attempts with strict release verification.
- Show a clean project status for the current repo.
- Show a clean history of what ran and what happened.

After the record is trustworthy, Rux can make richer routing decisions, then earn more dynamic roster design.

## Why Now

The space is not empty. Claude Code has dynamic workflows, AWS has CLI Agent Orchestrator, Zed has Agent Client Protocol, and the major coding agents are moving fast. The unsolved gap is not "how do I call a model?"

The gap is local decision memory for coding work:

- which agent works best for which kind of task,
- when extra agents are worth the cost,
- which roster should be used before work starts,
- what failed last time,
- and what a team should standardize without losing developer choice.

That memory starts with capture. If the record is weak, routing is theater.

## Current State

This repo has the first v0.1 capture spine: a CLI with repo init, a fake runner, Claude plan-mode capture, Codex read-only capture, Gemini plan-mode capture, explicit provider smoke checks, fixed sequential rosters, dry-run roster planning, repo policy, explicit file import for old sessions, model/effort/cost metadata, JSONL ledger, transcript capture, repo-state capture, changed-file capture, inline and post-run check capture, `ls`, `show`, `outcome`, `eval`, `rank`, `suggest`, `plan`, `status`, `export`, `policy`, `propose`, `report`, `doctor`, `release-check`, human verdict events, downstream lifecycle marks, and local feedback reports.

## Install

```sh
npm install -g @moshpits/rux
rux --help
```

Rux uses provider CLIs already installed and authenticated on your machine. It does not store provider credentials.

Basic flow:

```sh
rux init
rux runners
rux run "review the navigation code" --runner gemini
rux run "update the navigation code" --runner gemini --provider-mode write --check "npm run typecheck"
rux report "Gemini surfaced a question but the terminal flow was unclear" --kind ux --command "rux run ..." --note "The question appeared in the transcript but was easy to miss."
```

`rux run` keeps stdout as JSON for scripts. Provider output and Rux progress are mirrored to stderr while the provider runs, so questions, start/finish state, checks, and quiet long-running work are visible in the terminal. The default provider mode is `plan`; use `--provider-mode write` when you want the wrapped provider to edit files. If a provider asks for input, Rux records the run as `blocked`. If a provider changes files while Rux asked for plan mode, Rux records the run as `failed`.

Start here:

- [Vision](docs/VISION.md)
- [State](docs/STATE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [v0 Plan](docs/V0_PLAN.md)
- [Standards](docs/STANDARDS.md)
- [Decisions](docs/DECISIONS.md)

## Naming

Rux is the selected release name. Runtime identity is centralized in `src/identity.mjs` so future naming adjustments stay small. The release posture is test first, then publish. Avoid "AI gateway" unless discussing the market, because gateway implies proxying model calls and credentials.
