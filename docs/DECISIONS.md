# Decisions

This is the lightweight decision log for Rux. Add entries when a choice would otherwise become tribal memory or cause repeat mistakes.

## RUX-001: Capture Before Routing

- Date: 2026-06-08
- Decision: Rux records real runs and outcomes before it claims learned routing.
- Reason: Routing without labels is theater. Checks, verdicts, changed files, and downstream marks are the first trustworthy signals.
- Consequence: `suggest`, `rank`, and `plan` must explain evidence maturity and stay conservative when the ledger is thin.
- Revisit when: repeated task evidence exists across multiple runners, rosters, and repos.

## RUX-002: Wrap Provider CLIs, Do Not Become a Model Gateway

- Date: 2026-06-08
- Decision: Rux wraps existing coding-agent CLIs and inherits their auth, settings, and native behavior.
- Reason: Developers already use Claude Code, Codex, Gemini, editors, and terminals. Rux should add memory around those tools, not replace them.
- Consequence: Provider credentials are not stored in Rux, and adapter flags must be verified against installed CLIs.
- Revisit when: a hosted runner layer exists and needs a separate auth/security model.

## RUX-003: stdout Is Machine Output, stderr Is Human/Progress Output

- Date: 2026-06-08
- Decision: Rux keeps JSON on stdout and sends provider output, progress, checks, and diagnostics to stderr.
- Reason: Scripts need parseable output, while humans need to see long-running provider behavior and prompts.
- Consequence: Provider questions and Rux heartbeats must be visible without corrupting JSON stdout.
- Revisit when: an interactive TUI or protocol transport becomes the primary interface.

## RUX-004: Safety Failures Stay Failed

- Date: 2026-06-08
- Decision: If a provider asks for input or changes files in plan mode, Rux records the run but does not treat it as successful routing evidence.
- Reason: Silent success on unsafe or incomplete execution would poison the ledger.
- Consequence: `provider_needs_input` becomes blocked, and `provider_plan_changed_files` becomes failed even if checks pass.
- Revisit when: adapters can express provider approval/input state through structured APIs.

## RUX-005: Release Train Over Tiny Publishes

- Date: 2026-06-08
- Decision: Normal fixes batch into a weekly patch train; emergency patches are reserved for dangerous execution, data loss, broken installs, provider auth/security breakage, or unusable packages.
- Reason: Publishing every small fix creates version noise and lowers trust.
- Consequence: Version bumps happen only at release cut, and `release:verify` remains the publish gate.
- Revisit when: release volume or user adoption requires a more formal cadence.

## RUX-006: Swami-Lite Docs

- Date: 2026-06-08
- Decision: Rux adopts Swami's recurrence-prevention principle with a smaller docs system: vision, state, architecture, plan, standards, decisions, and docs checks.
- Reason: Repeat hiccups should become documented decisions or verifiable checks, but Rux should stay readable in minutes.
- Consequence: No manifest, generated wiki, or phase machinery until the repo earns it.
- Revisit when: docs drift becomes frequent enough to justify stronger indexing or generation.

## RUX-007: Feedback Reports Before External Issue Automation

- Date: 2026-06-09
- Decision: Agents record Rux dogfood feedback with `rux report` before any GitHub issue or hosted tracker automation exists.
- Reason: Early learning should be local, low-friction, and broader than failures. Confusing UX, adapter friction, ideas, and successful patterns are all useful evidence.
- Consequence: Report events and markdown files live in the repo-local `.rux/` store, can link to run IDs and commands, and do not change source, routing policy, or external issue state.
- Revisit when: the hosted/team layer is ready to sync curated reports into shared backlog workflows.

## RUX-008: Dirty Worktrees Block Real Provider Runs

- Date: 2026-06-09
- Decision: Rux refuses to launch real provider CLIs when the target git worktree has uncommitted changes outside `.rux/`, unless the user passes `--allow-dirty`.
- Reason: Dogfood found that running provider CLIs in a shared dirty checkout can race with concurrent agent/user work and destroy uncommitted changes.
- Consequence: Users must commit, stash, revert, or explicitly override before real provider execution. Fake runs stay allowed in dirty trees for local ledger development.
- Revisit when: worktree isolation is implemented and can safely run providers away from the user's active checkout.

## RUX-009: Write Scope Violations Are Failed Runs

- Date: 2026-06-09
- Decision: Rux lets users declare allowed files/directories with `--write-scope` and records a failed run when providers edit outside that scope.
- Reason: Dogfood showed Gemini write mode editing files outside explicit task scope. Until Rux has stronger isolation or patch approval, scope breaches must become visible negative evidence.
- Consequence: `write_scope_violation` appears in run status, output signal, eval routing blockers, outcome risks, and exports.
- Revisit when: provider adapters can enforce write allowlists before edits, not just classify them after the run.

## RUX-010: Manual Current-Session Records Count, But Do Not Replace Adapter Evidence

- Date: 2026-06-09
- Decision: `rux record` captures current-session work after the fact without launching a nested provider CLI.
- Reason: Dogfood showed that agents using Rux from inside an active Codex session could only run `rux plan` plus `rux report`; nesting another provider run just to satisfy capture would waste tokens and distort the evidence loop.
- Consequence: Manual records can become recommendation evidence when they are high-confidence and backed by checks or verdicts. They remain clearly marked as manual, are down-weighted in scoring, carry a `manual_capture` outcome risk, respect `--write-scope`, and do not satisfy release gates that require adapter-observed provider task evidence.
- Revisit when: Codex, Claude, Gemini, or editor integrations expose a first-class way for Rux to observe the active session directly.

## RUX-011: Post-Goal Claude Review Is A Ritual, Not Infrastructure

- Date: 2026-06-10
- Decision: After a goal is achieved, use Claude CLI for lead-style review/advice before setting the next goal, but keep the mechanism to one prompt template and an explicit command.
- Reason: The user wants a recurring second-opinion loop, but turning it into a daemon, scheduler, or service would add process weight before the product earns it.
- Consequence: `prompts/post-goal-review.md` is the harness. Prompts are sanitized by default; private workspace details require explicit user approval after the disclosure risk is stated. If a requested model alias is unavailable, the fallback must be reported.
- Revisit when: goal closeouts become frequent enough that manual invocation is the bottleneck.
