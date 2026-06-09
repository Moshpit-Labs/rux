# v0 Plan

## Goal

Ship a local CLI that can run real coding-agent tasks and record trustworthy outcomes. Recommendation comes after capture.

## Anti-Scope

v0.1 will not include:

- web dashboard,
- daemon,
- SaaS sync,
- RBAC,
- billing,
- API-key vault,
- generic LLM gateway,
- fanout orchestration,
- dynamic roster planner,
- learned routing,
- automatic self-improvement,
- IDE automation,
- public benchmark leaderboard,
- package publishing before release gates,
- public release automation before release gates,
- scheduled self-improvement.

## Milestones

### 1. Spine

- Choose TypeScript or Python.
- Add CLI shell.
- Auto-create `.rux/`.
- Write append-only ledger entries.
- Add `rux ls` and `rux show`.

Done when a fake runner can create a complete run record.

### 2. First Runner

- Add one real runner: Claude Code plan-mode capture.
- Detect installation and auth failure.
- Capture transcript and changed files.
- Normalize success, failure, timeout, and cancellation.

Done when a real or mocked Claude task can be run and explained from the ledger.

### 3. More Runners

- Add Codex CLI runner.
- Add Gemini CLI runner.
- Add `rux runners`.
- Add explicit `rux provider-smoke` release evidence.
- Keep runner contracts small and tested.

Done when the same task can be captured through the supported runners. Mocked smoke tests cover this; real Claude, Codex, and Gemini provider-smoke evidence is captured.

### 4. Outcome Labels

- Capture test/check commands and results.
- Capture explicit human verdict: accepted, rejected, partial, unknown.
- Capture explicit model, effort, and cost-hint metadata.
- Capture whether a run was later reverted or replayed.
- Add `rux mark <run-id> reverted|replayed|accepted-downstream` as append-only lifecycle evidence.
- Add a small `rux verdict <run-id>` command if the first pass needs it.
- Add explicit-file import for old sessions as low-confidence records.
- Add `rux outcome <run-id>` to explain what a run currently proves.
- Add `rux eval <run-id>` to explain whether a run can affect routing.

Done when a run has enough label data to support or reject a future recommendation.

### 5. Fixed Rosters

- Add `solo`.
- Add `pair`: implementer plus reviewer.
- Add `repair`: bounded retry after failed checks.
- Add `plan-code-review`: planner, coder, reviewer as a fixed chain for larger work.
- Refuse parallel-N over one subscription CLI account by default.

Done when child runs are visible in `show`.

### 6. Evidence-Based Suggestions

- Add a tiny task-kind classifier.
- Add `rux rank` for evidence-backed runner/model/effort/roster rankings.
- Suggest roster/runner from local history.
- Add `rux plan "<task>"` as a dry-run roster preview that reuses suggestion evidence and fixed rules.
- Use fixed rules before learned routing has enough data.
- Always explain the reason.
- Let the user override.

Done when suggestions cite previous run IDs, plans explain their evidence maturity, and imported low-confidence history is ignored by default.

### 7. Proposal Loop

- Add `rux report` for raw local feedback.
- Add `rux propose`.
- Summarize recent ledger entries.
- Generate a markdown proposal with cited run IDs.
- Never apply automatically.

Done when raw feedback and proposals are useful even if no code changes are made.

## v0.1 Cut

If scope pressure appears, ship only:

- `rux init`,
- `rux runners`,
- `rux run`,
- `rux provider-smoke --runner claude|codex|gemini`,
- `rux ls`,
- `rux show`,
- `rux outcome <run-id>`,
- `rux eval <run-id>`,
- `rux check <run-id> --command "COMMAND"`,
- `rux mark <run-id> reverted|replayed|accepted-downstream`,
- `rux import --from PATH`,
- `rux plan "<task>"`,
- `rux rank [--task-kind KIND]`,
- `rux suggest "<task>"`,
- `rux status`,
- `rux export [--run-id ID] [--include-transcripts]`,
- `rux policy`,
- `rux propose`,
- `rux report "<summary>"`,
- `rux doctor`,
- `rux release-check`,
- fixed sequential rosters,
- local ledger,
- transcript capture,
- changed-file capture,
- inline and post-run check result capture,
- model/effort/cost metadata capture,
- human verdict capture,
- downstream lifecycle mark capture,
- low-confidence import for selected old sessions,
- proposal-only improvement notes.

This is still valuable. It owns the record before it claims intelligence.

## First Roster Rules

Start simple:

- Use `solo` for small fixes, docs, and known files.
- Use `pair` when correctness matters more than speed.
- Use `repair` when a test/check command exists.
- Use `plan-code-review` for large, ambiguous, cross-file tasks.
- Do not use multiple implementers until v0 has enough ledger data and account policy to justify it.

## First Team Support

Team support in v0 means:

- repo-local ledger,
- committed policy file,
- shareable run summaries,
- explicit export for review.

It does not mean accounts, roles, billing, or a hosted backend.

## Release Gates

Do not publish until:

- `rux release-check` returns `ready: true`,
- `rux release-check --strict` passes,
- the package name is final,
- `private: true` has been deliberately removed,
- the git worktree is clean outside `.rux/`,
- local smoke tests pass,
- explicit Claude, Codex, and Gemini provider-smoke runs have been run,
- at least one routing-eligible real provider task has a check or human verdict,
- provider command flags have been checked against installed CLIs,
- docs describe current behavior without local-only language,
- and the license/name/readme are ready for public readers.

## First User Experience

The first successful user journey should be:

```text
rux runners
rux plan "fix the failing auth test"
rux run "fix the failing auth test" --runner claude --roster solo
rux show <run-id>
rux verdict <run-id>
```

The user should understand the state of the project by reading `docs/STATE.md`, not by scanning a roadmap pile.
