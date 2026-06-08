# Vision

Rux is the operating layer for agentic work.

The first market is software because software gives the clearest proof surface: code, diffs, tests, reviews, deployments, reversions, and real user impact. But the larger ambition is not "a coding CLI." The ambition is a system that helps people and teams decide how AI work should be done, route that work to the right agents, coordinate the agents, record what happened, and improve the system over time.

The frontier is not access to models. The frontier is judgment.

Every serious operator will have many AI systems available: Claude Code, Codex, Gemini, Cursor, VS Code agents, Zed, hosted coding agents, provider-native workflows, review agents, research agents, and future tools we cannot name yet. Starting agents will become easy. Knowing which one to use, when to use more than one, what permissions to grant, what evidence to trust, and what to standardize will remain hard.

Rux should become the layer that makes those decisions tractable.

## The World Rux Is For

A developer or team should be able to bring a task to Rux and ask:

> What is the right agent setup for this work, what roster should run, what evidence supports that choice, what happened, and what should improve next?

That question has several parts:

- eval: which models, agents, modes, and effort levels work best for which tasks,
- routing: which provider, runner, model, effort, and permissions should be used now,
- orchestration: whether the task needs one agent, a leader/follower pair, a planner-coder-reviewer chain, repair, fanout, or another roster,
- interface: how this works across terminals, provider CLIs, desktop apps, editors, hosted agents, and future protocols,
- feedback: whether the run succeeded, failed, blocked, regressed, or was accepted downstream,
- self-improvement: what Rux and the target repo should change based on repeated evidence.

Rux should make this feel simple to the user. The system can hold the complexity; the interface should not leak unnecessary theory.

## North Star

For every meaningful unit of work:

```text
choose the right setup -> run it -> preserve the evidence -> learn from the outcome -> improve the next run
```

The north star is:

> Every run should make the next run smarter.

Not because Rux is magical. Because it keeps the record that humans and agents otherwise lose.

## The Product Thesis

AI work will not be won by one model, one IDE, one chat app, or one provider. Teams will use many tools. The winning layer is the one that makes those tools work as a system.

Rux should be that layer:

- an eval layer that records, ranks, and explains agent performance by task,
- a routing layer that chooses the right runner, model, effort, mode, and permissions,
- an orchestrator layer that designs the roster for the task and coordinates the work,
- an evidence layer that captures transcripts, diffs, checks, verdicts, costs, and downstream marks,
- an interface layer that plugs into existing CLIs, editors, desktop apps, hosted agents, and protocols,
- a self-improvement layer that proposes changes from repeated evidence without silently modifying itself.

The first versions can be humble. The destination is not.

## Why Coding First

Coding is the proving ground because it has feedback loops Rux can verify:

- files changed,
- tests and typechecks,
- review comments,
- commit and PR history,
- deployed outcomes,
- reverts and repairs.

That makes software the best place to build trust in the core loop. If Rux cannot make coding-agent work more observable, comparable, and improvable, it has no right to claim a broader operating layer.

But the shape is larger than coding:

```text
task -> roster -> runner -> record -> review -> improve
```

That loop can later serve engineering, operations, finance, research, support, sales, design, and other knowledge work. The broader platform is earned by proving the loop in software first.

## What Rux Must Feel Like

Rux should feel like a clean workbench for AI work:

- one place to see what ran,
- one place to understand what happened,
- one place to compare agents and rosters,
- one place to replay or export evidence,
- one place to decide what should run next,
- one place to see what the system has learned.

For individuals, it should make personal agent use less chaotic.

For teams, it should create shared operating memory without forcing everyone into the same provider, editor, model, or workflow.

## Interface Principle

Rux should meet users where they already work.

It should wrap and observe tools like Claude Code, Codex, Gemini, Cursor, VS Code, Zed, terminal workflows, hosted agents, and future protocols. It should not require users to abandon those tools. It should not become a credential vault or generic model proxy just because that is the familiar "AI gateway" shape.

The first durable interface is the evidence record:

- repo policy,
- append-only ledger,
- transcripts,
- adapter metadata,
- changed files,
- checks,
- verdicts,
- lifecycle marks,
- exports,
- replay metadata.

Once that record is trustworthy, richer interfaces can sit on top: dashboards, editor adapters, protocol bridges, hosted sync, team policy, and eventually broader workflow surfaces.

## Intelligence Model

Rux should not pretend to know before it has evidence.

The intelligence loop is:

1. Record the attempt.
2. Attach objective checks where possible.
3. Capture human and downstream judgment.
4. Explain what the run proves and what it does not prove.
5. Rank and recommend only from eligible evidence.
6. Design rosters from evidence, risk, and task shape.
7. Propose improvements with citations.

This is how Rux avoids benchmark theater and model hype. The most valuable intelligence is local and contextual: this repo, this team, this task shape, this failure history.

## Orchestration Model

Rux should design rosters, not sell swarm mythology.

Sometimes one agent is enough. Sometimes the right answer is a planner and a coder. Sometimes a reviewer should be separate. Sometimes a failed check should trigger a bounded repair. Sometimes a fanout or committee is worth the cost. Rux should explain why extra agents are needed, what each role is responsible for, and how the outcome will be judged.

The orchestration layer should grow from evidence:

- fixed rosters first,
- dynamic rosters later,
- parallel execution only when policy, provider terms, cost, and task risk justify it,
- no hidden autonomy without reviewable records.

## Self-Improvement

Rux should learn from usage and propose improvements to itself.

But self-improvement must be evidence-backed and human-governed. The system may notice repeated adapter failures, weak docs, missing checks, poor routing choices, bad roster defaults, or recurring user corrections. It may write proposals. It may cite run IDs. It may recommend changes.

It must not silently rewrite itself or the user's repo.

The point is not autonomy for its own sake. The point is compounding operational quality.

## Guardrails

- Evidence before confidence.
- Capture before routing.
- Routing before autonomy.
- Fixed rosters before dynamic rosters.
- Human and check evidence before automated judgment.
- Seamless interfaces before new surfaces.
- Proposal-only self-improvement before self-modification.
- Provider auth stays with providers unless a future security model earns more.
- Team standards should emerge from evidence, not taste.

## Final Frontier

The final frontier is a work system where humans and agents share memory, judgment, and improvement loops across tools, providers, teams, and time.

Rux starts with AI coding work. It should grow into the operating layer for agentic work.
