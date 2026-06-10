# Post-Goal Lead Review Prompt

Use this after a goal is achieved, before setting the next goal.

Default safety rule: keep the prompt sanitized. Do not include private repo names, local paths, secrets, customer data, proprietary code, or unpublished workspace details unless the human explicitly approves sending that context to Claude.

```text
You are acting as lead reviewer/advisor for an open-source CLI product.

Goal just completed:
- <one-line goal>

Public or approved context:
- <what shipped>
- <what was verified>
- <what feedback or evidence drove the work>
- <known limitations>

Please advise concisely:
1. Was this goal actually the right step?
2. What risk remains?
3. What should the next small goal be?
4. What should the next large goal be?
5. What should we avoid doing next?

Return actionable guidance only.
```

Suggested local command shape:

```sh
claude --model opus --effort max --permission-mode plan --tools "" --no-session-persistence -p "$(cat prompts/post-goal-review.md)"
```

If a preferred model alias is unavailable, record the fallback in the handoff.
