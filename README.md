# Rux

Rux is an open-source, test-first run ledger for AI coding agents. It records real local agent sessions first, then uses that evidence to recommend better runner and roster choices over time.

It helps a developer or team answer one practical question:

> For this repo and this task, which agent setup should we use, what happened, and what did we learn?

It is not a model gateway. It does not proxy API calls, hide provider auth, or replace Claude Code, Codex, Gemini CLI, Cursor, Zed, VS Code, or other tools. It wraps the tools people already use, records what happened, and uses that evidence to recommend better runs over time.

Rux also carries the local operating policy for agent spend discipline. The committed `rux.policy.json` file includes a `token_governor` block that tells agents when to cap tool output, when to create handoffs, and when expensive models, high effort, subagents, or review agents need a named reason and artifact.

## Five-Minute Quickstart

```sh
npm install -g @moshpits/rux
rux init
rux status
```

Rux uses the Claude, Codex, and Gemini CLIs already installed and authenticated on your machine. It does not store provider credentials.

Try one recorded loop:

```sh
rux run "review the navigation code" --runner gemini
rux show <run-id>
rux verdict <run-id> accepted --note "Useful review"
```

When the current Codex/Claude/Gemini session already did the work, record it without starting a nested provider run:

```sh
rux record "implemented the stats filters in the current Codex session" --runner codex --check "npm test" --verdict accepted
```

In an interactive terminal, Rux prints readable output. When stdout is piped or redirected, Rux keeps JSON for scripts. Use `--json` any time you want JSON explicitly.

Example terminal output:

```text
Rux plan
Task: fix the failing auth test
Kind: test
Runner: codex (evidence)
Roster: solo (1 agent, sequential)
Evidence: local_evidence, maturity directional from 3 run(s)
Command
rux run 'fix the failing auth test' --runner codex --roster solo
```

## What Rux Records

Rux keeps a repo-local evidence trail for AI coding work:

- the task, runner, roster, provider mode, task kind, model, effort, and cost hints,
- the provider invocation, transcript reference, output signal, status, and effective status,
- repo state before and after, changed files, write-scope violations, and replay metadata,
- inline checks, post-run checks, human verdicts, lifecycle marks, and feedback reports,
- provider-smoke attempts for release readiness,
- manual current-session records when the active agent already did the work.

That record powers `show`, `eval`, `outcome`, `status`, `export`, `rank`, `suggest`, `plan`, `propose`, and `report`.

## What Rux Recommends

Rux recommends cautiously. `rank`, `suggest`, and `plan` use only eligible local evidence: checked or reviewed runs with enough provenance to be useful. Imported history, probe runs, provider-smoke runs, fake runs, failed safety runs, and vacuous checks do not quietly become routing proof.

Every recommendation carries an evidence maturity label:

- `none`: no usable local evidence yet,
- `thin`: useful for the next attempt, not a team standard,
- `directional`: enough to prefer, still keep review,
- `strong`: repeated positive local evidence,
- `mixed`: enough history exists, but outcomes disagree.

## What Rux Does Not Do

Rux does not replace your coding agent, store provider credentials, proxy model API calls, run a SaaS backend, add telemetry by default, or silently modify its own source. It wraps the tools you already use, records what happened, and proposes improvements with evidence. Humans decide what to run and what to change.

## Why Now

The space is not empty. Claude Code has dynamic workflows, AWS has CLI Agent Orchestrator, Zed has Agent Client Protocol, and the major coding agents are moving fast. The unsolved gap is not "how do I call a model?"

The gap is local decision memory for coding work:

- which agent works best for which kind of task,
- when extra agents are worth the cost,
- which roster should be used before work starts,
- what failed last time,
- and what a team should standardize without losing developer choice.

That memory starts with capture. If the record is weak, routing is theater.

## Useful Commands

```sh
rux runners
rux policy
rux plan "fix the failing auth test"
rux run "review the navigation code" --runner gemini
rux run "update the navigation code" --runner gemini --provider-mode write --check "npm run typecheck"
rux run "update only the stats filters" --runner codex --provider-mode write --write-scope "lib/stats/filters.ts,test/stats-filters.test.ts" --check "npm test"
rux record "implemented the stats filters in the current Codex session" --runner codex --check "npm test" --note "No nested provider run; current session did the work."
rux report "Gemini surfaced a question but the terminal flow was unclear" --kind ux --command "rux run ..." --note "The question appeared in the transcript but was easy to miss."
```

Provider output and Rux progress are mirrored to stderr while the provider runs, so questions, start/finish state, checks, and quiet long-running work are visible in the terminal without corrupting script output. The default provider mode is `plan`; use `--provider-mode write` when you want the wrapped provider to edit files. Real provider runs refuse dirty worktrees by default; commit, stash, or revert existing changes first, or pass `--allow-dirty` only when those changes are intentionally part of the provider context. Use `--write-scope` to declare the files or directories a provider is allowed to change; Rux records out-of-scope edits as failed runs.

Use `rux record` when the current agent session already did the work and you do not want to spawn a nested Claude/Codex/Gemini process just to satisfy the ledger. Manual records can help local recommendations when they have checks or verdicts, but they are down-weighted, labeled as manual evidence, and do not replace real provider-smoke or adapter-run evidence in the release gate. `--write-scope` applies to manual records too.

Use `rux policy` before substantial agent work when you need the local operating contract. The current token-governor policy is advisory: agents should follow it, and Rux-wrapped provider runs cap visible provider output while keeping full output in the transcript. Rux does not yet interrupt live provider sessions or broker arbitrary shell output outside `rux run`.

Start here:

- [Vision](docs/VISION.md)
- [State](docs/STATE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [v0 Plan](docs/V0_PLAN.md)
- [Standards](docs/STANDARDS.md)
- [Decisions](docs/DECISIONS.md)

## Naming

Rux is the selected release name. Runtime identity is centralized in `src/identity.mjs` so future naming adjustments stay small. The release posture is test first, then publish. Avoid "AI gateway" unless discussing the market, because gateway implies proxying model calls and credentials.
