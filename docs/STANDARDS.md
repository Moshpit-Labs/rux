# Rux Standards

Rux should stay small, checkable, and loud when something is unsafe or unclear.

## Coding Standards

- Correctness beats convenience. Do not hide provider failures, prompts, or safety mismatches behind a successful JSON response.
- Unknown input fails before execution. A mistyped flag must stop before any provider process starts.
- stdout is for machine-readable Rux output. Provider output, progress, checks, and diagnostics go to stderr.
- Provider adapters are volatile. Verify adapter flags against installed CLIs before documenting or releasing exact behavior.
- Structured records are append-only. Do not rewrite run history to make later evidence look cleaner.
- No provider credentials in Rux. Inherit auth from the wrapped CLI or environment.
- Standard library first. Add dependencies only when the repo cannot stay simple without them.
- Tests must cover the real failure mode before release. Parser fixes need parser tests; adapter fixes need provider/mock evidence; safety fixes need negative tests.
- No silent self-modification. Self-improvement writes proposals with evidence; humans decide what gets applied.
- Clean up started processes. A finished command should not leave provider processes, watchers, servers, or tunnels behind.

## Release System

Rux uses a weekly patch train by default. Small fixes batch until the next patch release.

Emergency patch releases are only for:

- dangerous execution behavior,
- data loss or corrupted ledger records,
- broken install or unusable published package,
- provider auth/security breakage,
- release tooling that blocks normal use.

Version bumps happen only when cutting a release. Local work should stay on the current published version until the release is intentionally prepared.

Before publishing:

- `npm run release:verify` must pass.
- A fresh install smoke must pass through the packed package.
- Adapter-affecting changes need at least one provider or mock provider smoke proving the changed path.
- Release notes must say what changed, what was verified, and what remains known-gap.

Versioning:

- Patch: fixes and small behavior hardening.
- Minor: new user-visible commands, modes, or ledger fields.
- Major: incompatible ledger, policy, command, or package behavior.
