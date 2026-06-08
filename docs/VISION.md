# Vision

Rux exists to make AI coding work learn from itself.

The product starts as a small run ledger for coding agents. It records the task, runner, roster, transcript, files changed, checks, verdicts, and downstream marks. That record is the foundation. Without it, routing and orchestration are guesses.

## North Star

For any repo and task, a developer or team should be able to ask:

> What should run this, why, what happened last time, and what did we learn?

Rux should answer from evidence, not vibes.

## Product Arc

1. Capture trustworthy runs.
2. Explain outcomes and failure modes.
3. Recommend runners, models, effort, and rosters from local evidence.
4. Help teams standardize what works without forcing one provider or editor.
5. Propose improvements to itself and the repo, with citations, without applying them silently.

## Interface Bet

Rux should plug into the tools developers already use: Claude Code, Codex, Gemini, Cursor, VS Code, Zed, terminal workflows, and future agent protocols. It should not become a credential proxy, generic model gateway, or SaaS admin surface before the ledger earns that complexity.

The durable interface is the record:

- repo-local policy,
- append-only ledger,
- transcripts,
- checks,
- verdicts,
- exports,
- replay metadata.

Editors and hosted layers can arrive later. The evidence model should survive them.

## What Makes It Different

Many tools can start agents. Rux should know which attempts worked, which failed, and why.

The wedge is not another runner. The wedge is decision memory for real engineering work:

- which agent setup works for this task kind,
- when extra agents are worth the cost,
- what failure repeated,
- which checks are reliable,
- what the team should standardize.

## Guardrails

- Capture before routing.
- Fixed rosters before dynamic rosters.
- Human and check evidence before automated judgment.
- Proposal-only self-improvement before any self-modification.
- Provider CLIs keep their own auth and native behavior.
- Team features start as export/import and committed policy, not accounts and dashboards.

## Beyond Coding

The same loop could later apply to other engineering and non-engineering work: task, roster, runner, record, review, improve. That is a future possibility, not the v0 promise. Rux earns the broader platform only by becoming trustworthy for software work first.
