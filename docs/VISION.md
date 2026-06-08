# Vision

The frontier is not starting agents. The frontier is making agentic work cumulative.

Every serious team will soon have many AI agents available: local CLIs, IDE agents, hosted agents, review agents, repair agents, research agents, and provider-native workflows. Starting them will become cheap. Trusting them, comparing them, coordinating them, and learning from them will remain hard.

Rux exists to become the memory and decision layer for that world.

It should let a developer or team ask:

> What should work on this, why, what happened before, what changed, what passed, what failed, and what should we do differently next time?

The answer should come from lived evidence, not vibes, vendor claims, benchmark theater, or whatever tool happens to be fashionable this week.

## The Long Bet

Software work is becoming agentic, but most agentic work is still amnesiac.

An agent plans, edits, reviews, or repairs. The terminal scrolls by. The editor changes. A test passes or fails. A human accepts, reverts, or retries. Then the important part disappears into chat history, shell scrollback, screenshots, or memory.

That is the missing layer.

Rux should turn each attempt into durable operating knowledge:

- what the task was,
- which agent setup was used,
- what roster shape was chosen,
- what changed,
- what checks ran,
- what the human decided,
- what happened downstream,
- what should be repeated,
- what should never happen again.

Over time, that record becomes a team's private intelligence layer for AI-assisted work.

## North Star

Rux is the evidence layer that helps humans and agents choose, run, review, and improve agentic work.

The north star is simple:

> Every meaningful agent run should make the next run smarter.

Not by magic. By record, review, comparison, and disciplined feedback.

## Product Arc

1. **Memory:** capture trustworthy runs and outcomes.
2. **Explanation:** show why a run succeeded, failed, blocked, or should not count.
3. **Recommendation:** suggest runners, models, effort levels, and rosters from real evidence.
4. **Orchestration:** design the right roster for the task, then coordinate agents without hiding their work.
5. **Governance:** help individuals and teams standardize what works without surrendering provider or editor choice.
6. **Self-improvement:** propose improvements to Rux and the target repo from cited evidence, never silent self-modification.

Coding is the first proving ground because it has visible artifacts, tests, diffs, review, and real consequences. If Rux cannot become trustworthy there, it has no right to generalize.

## What Rux Must Become

Rux should become the control memory beneath many surfaces:

- terminal-first workflows,
- Claude Code, Codex, Gemini, and future provider CLIs,
- Cursor, VS Code, Zed, and other editors,
- hosted coding agents,
- team review rituals,
- future agent protocols.

It should not ask users to abandon their tools. It should make their tools learn together.

The durable interface is the record:

- repo-local policy,
- append-only ledger,
- transcripts,
- checks,
- verdicts,
- lifecycle marks,
- exports,
- replay metadata.

If that record is right, dashboards, protocols, hosted sync, and deeper orchestration can arrive later without changing the soul of the product.

## What Makes It Different

Many tools can start agents. Rux should know which agent work deserves trust.

The wedge is decision memory:

- which agent setup works for this task kind,
- when extra agents are worth the cost,
- which rosters reduce risk,
- what failure keeps repeating,
- which checks actually protect the work,
- what the team should standardize,
- where the tool itself should improve.

Rux is not trying to be the smartest agent. It is trying to make the whole system smarter.

## Guardrails

- Capture before routing.
- Evidence before confidence.
- Fixed rosters before dynamic rosters.
- Human and check evidence before automated judgment.
- Local records before hosted coordination.
- Proposal-only self-improvement before any self-modification.
- Provider CLIs keep their own auth and native behavior.
- Team features start as export/import and committed policy, not accounts and dashboards.

## Beyond Coding

The deeper pattern is not limited to software:

```text
task -> roster -> runner -> record -> review -> improve
```

That loop can apply to engineering, operations, research, sales, finance, support, and other knowledge work. But the broader platform must be earned. Rux starts with software because software gives the cleanest proof surface: code, tests, diffs, review, deploys, and reversions.

The final frontier is a work system where humans and agents share memory, judgment, and improvement loops across tools and time.

Rux starts as a run ledger. It should grow into the evidence layer for agentic work.
