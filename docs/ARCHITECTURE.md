# Architecture

## Shape

Rux has five primitives.

```
Task -> Roster -> Runner -> Run -> Ledger
```

## Primitives

### Task

A task is the user's request plus the repo path, budget hints, and constraints.

It should be small enough to run and review. If it is too large, Rux should propose a smaller task or a roster that makes the risk explicit.

### Roster

A roster is the shape of work.

v0.1 supports fixed sequential rosters. They are simple enough to inspect from the ledger and do not create parallel provider calls.

v0 rosters:

- `solo`: one runner does the task.
- `pair`: one runner implements, another reviews.
- `repair`: one runner attempts a bounded fix after a failed check.
- `plan-code-review`: a planner scopes the work, a coder implements, and a reviewer checks the result.

`rux ls` shows top-level parent runs. `rux show <run-id>` includes child runs for roster parents.

Deferred:

- `fanout`: multiple independent attempts, then pick or merge.
- `committee`: multiple reviewers.
- long-running autonomous workflows.

### Runner

A runner is a thin adapter around a real coding agent.

Most v0 runners are local CLI wrappers. They detect whether the tool exists, launch it, stream output, capture the transcript, and return a normalized result. The runner should preserve the provider's auth, settings, permissions, and native behavior.

Current local runner defaults:

- Claude: `claude --permission-mode plan --output-format text -p <task>`
- Codex: `codex exec --sandbox read-only --color never -C <cwd> <task>`
- Gemini: `gemini --approval-mode plan --output-format text --skip-trust -p <task>`

Local runner contract:

```text
detect() -> availability
run(task, cwd, options) -> event stream
normalize(events) -> result
```

Remote runners use the same result shape but a different execution contract:

```text
start(task, repo_ref, options) -> remote_job
poll(remote_job) -> status
fetch(remote_job) -> artifacts + transcript
normalize(artifacts) -> result
```

Remote runners matter for GitHub-hosted or provider-hosted coding agents that do not run as local subprocesses.

Result shape:

```text
id
runner
model
effort
roster
parent_id
role
source: live | imported
confidence: high | medium | low
status: ok | failed | timeout | auth_error | cancelled | malformed | unknown
started_at
ended_at
cwd
prompt_ref
transcript_ref
repo_snapshot
changed_files
checks
replay
cost_hint
notes
child_run_ids
```

Imported runs are allowed, but they are not equivalent to live captured runs. Import only reads a user-selected local file, stores the transcript, and writes `source: imported` plus `confidence: low`. It must not crawl provider history directories automatically. Imported runs can help continuity, but recommendation should ignore them unless later labels make them useful.

### Run

A run is one attempt to complete a task with a selected roster and runner set.

Runs can have child runs. A `pair` run may include an implementation child and a review child. A `repair` run may include a failed run and one or more retry children.

Roster parent runs capture the repo state before the first child and after the last child. Child runs still keep their own snapshots so the parent can explain the whole roster while `show` can inspect each role.

### Ledger

The ledger is the source of truth.

It is append-only JSONL stored locally. It records tasks, runner calls, adapter invocation metadata, status reasons, stderr signal classification, transcripts, repo snapshots, files changed, replay commands, inline checks, post-run checks, verdicts, and user feedback. Post-run check events carry their own repo snapshot and changed-file list, because they may be captured after the original provider run. The ledger powers history, replay, evals, routing, and improvement proposals.

## Core Flow

```text
1. User asks Rux to run a task.
2. Rux detects available runners.
3. User chooses a runner and roster, or accepts a suggestion.
4. Rux executes the roster.
5. Each runner event is recorded.
6. The final run is summarized in the ledger.
7. Later commands read the ledger to explain, compare, replay, or propose improvements.
```

Retrospective import uses a smaller flow:

```text
1. User selects a local transcript or session artifact.
2. Rux copies it into the repo-local transcript store.
3. Rux writes a low-confidence imported run event.
4. User may attach a verdict later.
```

## Interfaces

### CLI

The CLI is the first interface.

Expected v0.1 surface:

```text
rux init [--force]
rux runners
rux provider-smoke --runner gemini --model gemini-pro --effort high
rux run "<task>" --runner claude --roster solo --model claude-sonnet --effort high --cost-hint 0.25
rux run "<task>" --runner claude --roster pair --reviewer-runner codex --model claude-sonnet
rux import --from ./old-session.txt --runner claude --task "Imported old session" --model claude-opus
rux plan "<task>"
rux rank --task-kind bugfix
rux suggest "<task>"
rux status
rux export --limit 10
rux export --run-id <run-id> --include-transcripts
rux policy
rux propose
rux doctor
rux release-check
rux ls
rux show <run-id>
rux outcome <run-id>
rux eval <run-id>
rux check <run-id> --command "npm test"
rux verdict <run-id> accepted
rux mark <run-id> reverted
```

### Files

Files are the plug-and-play layer for editors and desktop apps.

Rux should write:

- run summaries,
- transcripts,
- review notes,
- patch references,
- proposal notes.

This lets users keep working in Codex, Claude Code, Cursor, VS Code, Zed, or another editor without Rux trying to drive those UIs directly.

`rux export` is stdout-only. It gives teams a review packet without requiring SaaS sync. Transcript text is omitted by default; `--include-transcripts` must be explicit.

Run summaries, `show`, and `export` include a `replay` object. New live runs store the replay command when captured. Older runs derive replay metadata where possible. Imported sessions and roster child runs explain why they are not directly replayable.

`rux.policy.json` is committed repo policy. It captures safety defaults such as runner preference, default roster, provider auth ownership, transcript export default, self-improvement mode, and whether parallel provider-CLI runs are allowed. It is not a credential store.

`rux init` creates that policy file and adds `.rux/` to `.gitignore`. It does not create the ledger store and it does not call providers.

### Protocols

Protocol support should come after the core loop works.

- MCP is for tools and context.
- ACP is for editor-agent interoperability.
- A2A-style protocols may matter later for agent-agent messaging.

Do not lead with protocols. Lead with a reliable run ledger.

## Evaluation

The eval layer starts from real usage, not synthetic leaderboards. It must start as outcome capture before it becomes recommendation.

Minimum signals:

- task kind,
- runner,
- model,
- effort,
- roster,
- source and confidence,
- duration,
- exit status,
- checks passed,
- review verdict,
- user verdict,
- changed file count,
- repair count.

Recommendation uses top-level runs only. Child runs are evidence for the parent run, but they should not separately skew routing.

Near-term labels:

- test/check result,
- explicit human verdict,
- reviewer verdict when a pair or plan-code-review roster is used,
- downstream lifecycle mark: reverted, replayed, or accepted downstream.

`rux outcome <run-id>` is the label explanation surface. It says whether the run is currently backed by a downstream lifecycle mark, human verdict, captured checks, release-only provider smoke, imported history, failed status, or no label. `eval` includes the same outcome object and then adds routing eligibility, status reason, and adapter signals such as exit code, timeout state, output byte counts, and whether stderr looks like diagnostic output or failure evidence.

LLM judges may summarize, but they must not be the source of truth for v0.1.

The first ranking should be simple:

```text
For this task kind, in this repo, which runner/model/effort/roster has the best reviewed success rate within budget?
```

Anything more advanced should wait for enough ledger data.

Current ranking, suggestion, and planning behavior is deliberately smaller than learned routing. It uses a simple task-kind classifier, ignores fake runners, ignores imported runs, ignores child runs, ignores provider-smoke runs, ignores unlabeled provider runs, ignores checks that modified files, and returns `cold_start` unless positive labeled live evidence exists.

Recommendation outputs include evidence maturity:

- `none`: no eligible local task evidence.
- `thin`: one or two labeled runs for a setup; useful for the next attempt, not a team standard.
- `directional`: three to five labeled runs; enough to prefer, not enough to automate away review.
- `strong`: six or more repeated positive runs with no rejected evidence.
- `mixed`: enough runs exist, but outcomes disagree.

`rux plan "<task>"` is `suggest` plus a fixed roster preview. It is dry-run only. It prints the selected runner, model, effort, roster, role order, runner-by-role mapping, evidence counts, evidence maturity, availability, and the command that would run. When it proposes more than one agent, it also explains why one agent is not enough. When no eligible task evidence exists, it prefers successful provider-smoke evidence in policy order before raw CLI availability. It does not call providers, write transcripts, or append ledger events.

In v0, `--model`, `--effort`, and `--cost-hint` are run metadata. Rux records them and ranks by them, but does not assume every provider CLI accepts the same flags.

`rux eval <run-id>` is the routing explanation surface for that behavior. It reports blockers such as `not_live`, `not_high_confidence`, `fake_runner`, `provider_smoke`, `child_run`, and `unlabeled`, plus outcome, score basis, status reason, adapter signals, stderr interpretation, and release-smoke evidence.

`rux status` is the creator/team overview. It combines ledger counts, outcome label distribution, recommendation evidence maturity, provider-smoke readiness, release blockers, recent runs, and next actions without calling providers or writing files. When it suggests the next capture command, it also says whether that command would call a provider, write ledger evidence, and need human review.

## Cold Start

Repo-local capture means the tool begins with little data. That is a product constraint, not an implementation detail. It keeps the first record trustworthy without making the product local-only.

Cold-start behavior:

- no learned routing claims before enough runs exist,
- imported low-confidence runs are continuity records, not proof,
- fixed rules are allowed if they are explained,
- every suggestion must cite the runs that support it,
- every plan must say whether it is evidence-backed or cold-start,
- teams can share evidence through explicit export/import or a hosted layer later.

## Subscription Safety

Rux must not turn one human subscription account into an unbounded worker pool.

Default policy:

- sequential runs are allowed through installed CLIs,
- parallel runs over one subscription-backed CLI are refused by default,
- users can opt in only after confirming their provider terms and account setup allow it,
- API-backed or team-managed credentials can have separate concurrency policy.

The v0 policy file encodes that default. `rux plan` may use policy for cold-start runner order and default roster; actual provider calls still use the wrapped CLI's installed auth and permissions.

## Readiness

`rux doctor` is read-only. It checks Node, git, ledger state, and whether provider CLIs are on PATH. It does not call provider services and does not prove auth.

`rux provider-smoke --runner claude|codex|gemini` is the deliberate release-evidence command. It creates a normal ledger run with `purpose: provider_smoke`, uses the provider's installed CLI/auth, and fails the smoke if files change. Provider-smoke runs prove adapter health; they are excluded from ranking and suggestion evidence, and cannot receive post-run checks, human verdicts, or downstream lifecycle marks.

`rux release-check` is also read-only. It reports publication blockers until npm scope, package file shape, package privacy, naming, docs, local scripts, committed repo state, explicit provider-smoke evidence, and at least one routing-eligible live provider task are ready. Mutating post-run checks are recorded, but they do not satisfy release evidence. Each gate carries a lifecycle: `one_time`, `release`, or `permanent`, so first-release decisions do not become permanent process by accident. `rux release-check --strict` returns a failing exit code while blockers remain, and npm `prepublishOnly` runs the strict gate through `npm run release:verify`.

## Self-Improvement

The improvement loop is deliberately conservative.

```text
ledger -> proposal -> human review -> normal code change
```

Every proposal must cite run IDs. Unsupported claims are discarded.

Current behavior is deterministic and local: `rux propose` writes a markdown proposal under `.rux/proposals/` and appends a proposal event to the ledger. It looks for missing labels, failed checks, imported low-confidence history, provider-smoke-only history, lack of positive provider task evidence, and release-check blockers.

Allowed proposal categories:

- runner health fixes,
- roster heuristics,
- prompt wording,
- new eval checks,
- docs corrections.

Forbidden in v0:

- silent source edits,
- automatic merges,
- unreviewed prompt mutation,
- telemetry upload by default.
