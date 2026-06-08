# Agent Plane — concept review (June 2026)

> Outside review of the Agent Plane concept. Claims grounded in a web pass over the
> June 2026 coding-agent landscape; benchmark/model specifics deliberately omitted as
> unreliable. Items labeled *(uncertain)* need first-party verification.

Project note: treat "local-first" in this review as a cold-start warning, not a product directive to stay local-only. The current release posture is test first, then publish after the release gates pass. Repo-local capture is the v0 trust mechanism; opt-in team sharing and hosted layers can come later if the ledger proves useful.

## 1. What you're missing or underestimating
- **The category is already contested.** A "control plane / runner for coding agents" is not greenfield as of mid-2026: amux positions itself as exactly "the open-source control plane for AI coding agents" (parallel Claude Code sessions + dashboard), OpenHands shipped an Agent Control Plane, Microsoft's Conductor does deterministic YAML orchestration, and Composio's orchestrator does worktree-isolated parallel agents with auto-CI-fix. Unified headless wrappers (e.g. `headless-coder-sdk`) already abstract Claude/Codex/Gemini behind one interface. *The runner+dashboard layer is no longer a wedge.*
- **The eval has no ground truth.** Your intel layer's premise — "record outcomes, learn the right agent" — assumes you can label outcomes. "Was this PR good?" has no automatic label. SWE-bench is static/offline and doesn't transfer to *your* repo's tasks. This is the hardest and most underestimated part of the whole concept.
- **Local-first fights the data layer.** A single-user local tool generates far too few runs to learn meaningful routing/roster intelligence. Cold-start is structural, not a tuning problem.
- **The named targets move under you.** Wrapping specific CLIs is a treadmill — Gemini CLI is reportedly being sunset for individual users (folded toward "Antigravity") around mid-2026 *(uncertain, secondary sources)*. Vendors are also extending *upward* into your layer (Claude Code subagents, hooks). You'd be sandwiched.

## 2. Already solved / commodity — do not rebuild
- Headless invocation of each agent (Claude Code Agent SDK, Codex, Gemini SDK) and **unified multi-agent wrappers** over them.
- Parallel sessions, **git-worktree isolation**, branch-per-agent, dashboards (amux, Composio, Conductor, OpenHands ACP, Claude Squad/cmux).
- **Provider/model routing** (claude-code-router and friends) and sandboxing/credential-vault infra.
- Generic LLM gateways (you already excluded this — correctly).

## 3. Biggest risks
1. **No outcome ground truth** → routing on noisy signal is worse than no routing. This can sink the product.
2. **Cold-start vs. local-first** → the intel layer is inert until there's cross-run/cross-user data, which local-first denies you.
3. **Platform sandwich** → vendors above, open-source runners below; thin middle.
4. **Self-improvement loop is premature** → "propose improvements to itself" with no validated eval is theater, and a credibility risk if its proposals are bad.

## 4. v0 — include / exclude
**Include:** (a) a thin, faithful **runner** over 2 agents max (Claude Code + Codex), reusing an existing wrapper rather than rebuilding; (b) **honest outcome capture** — task, agent, model, diff, tests-passed/failed, human thumbs, time, cost — stored locally in a boring schema; (c) a **clean overview** of runs. That's it.

**Exclude from v0:** routing, roster planner, orchestrator-as-product, and the self-improvement loop. All four are worthless until capture produces data. Defer.

## 5. First three product bets
1. **Faithful, structured outcome capture is the moat-seed** — own the *record* before the *recommendation*.
2. **Test-pass + explicit human verdict is the only honest near-term label** — make eval lean on these, not on an LLM-judge fantasy.
3. **One layer above a single agent that a solo founder actually keeps open** — DX/overview is the v0 win; orchestration is later.

## 6. Hard pushback
- **Your brief contradicts itself.** "v0 should be lean" alongside a v0 that lists *five* layers (eval, routing, roster, orchestrator, self-improvement) is incoherent. Lean v0 = runner + capture, full stop.
- **Routing/roster/self-improvement are premature by definition** — they need outcome data you won't have on day one, and a label you don't yet know how to compute. Building them first is building the cart before the horse exists.
- **The runner is the commodity, not the wedge** — if you rebuild it from scratch (your "rebuild, don't reuse" instinct) you'll spend your whole runway re-deriving worktree isolation and session management that amux/Composio/Conductor already ship. Reuse or fork the runner; spend your originality on the eval→recommendation loop, which is the only genuinely unbuilt thing here.
- **"Local-first" + "learn the best roster" may be mutually exclusive at v0 scale.** Pick one as the v0 promise. Ship local-first *capture* and be honest that recommendation needs aggregate data later (opt-in).

**Net:** the concept's instinct — *records and recommends agents from real outcomes* — is the right and under-served idea. Everything wrapped around it (runner, orchestrator, dashboard, self-improvement) is either commodity or premature. Cut v0 to runner + honest capture, prove you can produce a trustworthy outcome label, and don't rebuild what amux/Conductor/Composio already give you.

---

## Sources
- [augmentcode.com — open-source agent orchestrators](https://www.augmentcode.com/tools/open-source-agent-orchestrators)
- [Microsoft — Conductor](https://opensource.microsoft.com/blog/2026/05/14/conductor-deterministic-orchestration-for-multi-agent-ai-workflows/)
- [Composio agent-orchestrator](https://github.com/ComposioHQ/agent-orchestrator)
- [amux.io](https://amux.io/)
- [OpenHands Agent Control Plane](https://www.businesswire.com/news/home/20260506314667/en/OpenHands-Launches-an-Agent-Control-Plane-to-Manage-Software-Agents)
- [headless-coder-sdk](https://github.com/OhadAssulin/headless-coder-sdk)
- [Claude Code headless docs](https://code.claude.com/docs/en/headless)
- [awesome-cli-coding-agents](https://github.com/bradAGI/awesome-cli-coding-agents)

*Hold loosely until verified first-party: the Gemini-CLI → Antigravity sunset, and any specific SWE-bench/model numbers from June 2026 search results — the argument doesn't depend on them.*
