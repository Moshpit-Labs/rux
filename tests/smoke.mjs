#!/usr/bin/env node

import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(import.meta.dirname, "..");
const cliPath = join(repoRoot, "src", "cli.mjs");
const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
const tempRoot = await mkdtemp(join(tmpdir(), "rux-smoke-"));
const tempBin = join(tempRoot, "bin");
const npmEnv = { NPM_CONFIG_CACHE: join(tempRoot, "npm-cache") };

try {
  run("git", ["init"], tempRoot);
  await writeFile(join(tempRoot, "README.md"), "# Smoke\n", "utf8");
  run("git", ["add", "README.md"], tempRoot);
  run("git", ["commit", "-m", "initial"], tempRoot, {
    GIT_AUTHOR_NAME: "Rux Smoke",
    GIT_AUTHOR_EMAIL: "smoke@example.com",
    GIT_COMMITTER_NAME: "Rux Smoke",
    GIT_COMMITTER_EMAIL: "smoke@example.com"
  });
  await installMockClaude(tempBin);
  await installMockCodex(tempBin);
  await installMockGemini(tempBin);

  const helpRun = run("node", [cliPath, "--help"]);
  assert(helpRun.stdout.includes("Usage:"), "--help should print usage");
  assert(helpRun.stdout.includes("rux init"), "--help should include init command");
  assert(helpRun.stdout.includes("rux run"), "--help should include run command");
  assert(helpRun.stdout.includes("rux check"), "--help should include post-run check command");
  assert(helpRun.stdout.includes("rux report"), "--help should include feedback report command");
  assert(helpRun.stdout.includes("--allow-dirty"), "--help should include dirty worktree override");
  assert(helpRun.stdout.includes("rux release-check [--cwd PATH] [--strict]"), "--help should include strict release-check flag");
  const shortHelpRun = run("node", [cliPath, "-h"]);
  assert(shortHelpRun.stdout.includes("Usage:"), "-h should print usage");
  const versionRun = run("node", [cliPath, "--version"]);
  assert(versionRun.stdout.trim() === `rux ${packageJson.version}`, "--version should print package version");
  const versionCommandRun = run("node", [cliPath, "version"]);
  assert(versionCommandRun.stdout.trim() === `rux ${packageJson.version}`, "version command should print package version");
  const unknownFlagRun = spawnSync("node", [
    cliPath,
    "run",
    "typo guard",
    "--runner",
    "gemini",
    "--privoder-mode",
    "write",
    "--cwd",
    tempRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(unknownFlagRun.status !== 0, "unknown flags should fail before running providers");
  assert(unknownFlagRun.stderr.includes("Unknown option --privoder-mode"), "unknown flag error should name the bad flag");
  assert(unknownFlagRun.stderr.includes("Did you mean --provider-mode?"), "unknown flag error should suggest provider-mode");

  const dirtyGuardRoot = join(tempRoot, "dirty-guard");
  await mkdir(dirtyGuardRoot, { recursive: true });
  run("git", ["init"], dirtyGuardRoot);
  await writeFile(join(dirtyGuardRoot, "README.md"), "# Dirty Guard\n", "utf8");
  run("git", ["add", "README.md"], dirtyGuardRoot);
  run("git", ["commit", "-m", "initial"], dirtyGuardRoot, {
    GIT_AUTHOR_NAME: "Rux Smoke",
    GIT_AUTHOR_EMAIL: "smoke@example.com",
    GIT_COMMITTER_NAME: "Rux Smoke",
    GIT_COMMITTER_EMAIL: "smoke@example.com"
  });
  await writeFile(join(dirtyGuardRoot, "dirty.txt"), "uncommitted\n", "utf8");
  const dirtyProviderGuard = spawnSync("node", [
    cliPath,
    "run",
    "dirty provider guard",
    "--runner",
    "codex",
    "--cwd",
    dirtyGuardRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(dirtyProviderGuard.status !== 0, "real provider runs should refuse dirty worktrees by default");
  assert(dirtyProviderGuard.stderr.includes("Refusing to run real provider runner(s) codex in a dirty worktree"), "dirty guard should explain the refusal");
  assert(dirtyProviderGuard.stderr.includes("dirty.txt"), "dirty guard should name dirty files");
  const dirtyFakeRun = spawnSync("node", [
    cliPath,
    "run",
    "dirty fake run",
    "--runner",
    "fake",
    "--cwd",
    dirtyGuardRoot
  ], { encoding: "utf8" });
  assert(dirtyFakeRun.status === 0, "fake runs should still work in dirty worktrees");
  const dirtyOverrideRun = spawnSync("node", [
    cliPath,
    "run",
    "dirty override run",
    "--runner",
    "codex",
    "--allow-dirty",
    "--cwd",
    dirtyGuardRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(dirtyOverrideRun.status === 0, "--allow-dirty should explicitly bypass the provider dirty guard");
  const dirtyOverrideSummary = JSON.parse(dirtyOverrideRun.stdout);
  assert(dirtyOverrideSummary.replay.command.includes("--allow-dirty"), "dirty override should stay visible in replay metadata");
  const repoReleaseCheck = JSON.parse(run("node", [cliPath, "release-check"], repoRoot).stdout);
  assert(repoReleaseCheck.identity.product === "Rux", "release-check should expose current product identity");
  assert(repoReleaseCheck.identity.cli === "rux", "release-check should expose current CLI identity");
  assert(repoReleaseCheck.identity.package_name === packageJson.name, "release-check should expose package identity");
  assert(repoReleaseCheck.identity.package_bin.includes("rux"), "release-check should expose package bin identity");
  assert(repoReleaseCheck.identity.store_dir === ".rux", "release-check should expose store identity");
  assert(repoReleaseCheck.identity.policy_file === "rux.policy.json", "release-check should expose policy file identity");
  assert(repoReleaseCheck.identity.name_status === "release_name_selected", "release-check should expose selected release naming");
  assert(repoReleaseCheck.identity.rename_surfaces.some((surface) => surface.includes("src/identity.mjs")), "release-check should list rename surfaces");
  assert(packageJson.name.startsWith("@moshpits/"), "package should use the moshpits npm org scope");
  assert(packageJson.scripts["prepublishOnly"] === "npm run release:verify", "package should gate npm publish through release verification");
  assert(packageJson.scripts["release:verify"].includes("release-check --strict"), "release verification should use strict release-check");
  const packDryRun = JSON.parse(run("npm", ["pack", "--dry-run", "--json"], repoRoot, npmEnv).stdout)[0];
  const packedPaths = packDryRun.files.map((file) => file.path);
  assert(packDryRun.name === packageJson.name, "pack dry-run should use package.json name");
  assert(packedPaths.includes("src/cli.mjs"), "package should include CLI source");
  assert(packedPaths.includes("src/identity.mjs"), "package should include identity source");
  assert(packedPaths.includes("rux.policy.json"), "package should include default policy");
  assert(!packedPaths.includes("AGENTS.md"), "package should not include agent instructions");
  assert(!packedPaths.some((path) => path.startsWith("tests/")), "package should not include smoke tests");
  assert(!packedPaths.some((path) => path.startsWith("docs/")), "package should not include internal docs");
  const packResult = JSON.parse(run("npm", ["pack", "--json", "--pack-destination", tempRoot], repoRoot, npmEnv).stdout)[0];
  const tarballPath = resolve(tempRoot, packResult.filename);
  assert(existsSync(tarballPath), "npm pack should write a local tarball");
  const packageInstallRoot = join(tempRoot, "package-install");
  run("npm", ["install", "--ignore-scripts", "--prefix", packageInstallRoot, tarballPath], repoRoot, npmEnv);
  const installedBin = join(packageInstallRoot, "node_modules", ".bin", process.platform === "win32" ? "rux.cmd" : "rux");
  assert(existsSync(installedBin), "installed package should expose rux bin");
  const installedVersionRun = run(installedBin, ["--version"]);
  assert(installedVersionRun.stdout.trim() === `rux ${packageJson.version}`, "installed package bin should print version");
  const installedHelpRun = run(installedBin, ["help"]);
  assert(installedHelpRun.stdout.includes("rux init"), "installed package bin should include init command");
  assert(installedHelpRun.stdout.includes("rux run"), "installed package bin should print help");
  assert(!packResult.files.some((file) => file.path === "tests" || file.path.startsWith("tests/")), "local tarball should not include tests");

  const coldPlanRun = spawnSync("node", [
    cliPath,
    "plan",
    "update the docs",
    "--cwd",
    tempRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(coldPlanRun.status === 0, "cold-start plan should complete");
  const coldPlan = JSON.parse(coldPlanRun.stdout);
  assert(coldPlan.dry_run === true, "plan should mark itself as a dry run");
  assert(coldPlan.would_execute === false, "plan should not execute providers");
  assert(coldPlan.recommendation.confidence === "cold_start", "cold-start plan should admit missing evidence");
  assert(coldPlan.recommendation.maturity.level === "none", "cold-start plan should expose missing evidence maturity");
  assert(coldPlan.recommendation.runner === "claude", "cold-start plan should prefer an available real runner");
  assert(coldPlan.runner_source === "availability_fallback", "cold-start runner should be labeled as availability fallback");
  assert(coldPlan.policy.source === "default", "cold-start plan without policy file should use default policy");
  assert(coldPlan.recommendation.roster === "solo", "cold-start docs work should stay solo");
  assert(coldPlan.recommendation.one_agent_not_enough === null, "solo plans should not invent a multi-agent rationale");
  assert(coldPlan.runner_by_role.implementer === "claude", "solo plan should resolve the implementer runner");
  assert(coldPlan.recommendation.roles.length === 1, "solo plan should preview one role");
  assert(coldPlan.command.includes("rux run"), "plan should include a runnable command");
  assert(!existsSync(join(tempRoot, ".rux")), "plan should not create the ledger store");

  const coldPolicy = JSON.parse(run("node", [cliPath, "policy", "--cwd", tempRoot]).stdout);
  assert(coldPolicy.exists === false, "policy should report missing policy file");
  assert(coldPolicy.source === "default", "policy should fall back to runtime defaults");
  assert(coldPolicy.policy.parallel_provider_cli_runs === false, "default policy should refuse parallel provider CLI runs");
  assert(!existsSync(join(tempRoot, ".rux")), "policy should remain read-only before the first run");

  const coldStatus = JSON.parse(run("node", [cliPath, "status", "--cwd", tempRoot]).stdout);
  assert(coldStatus.identity.cli === "rux", "status should expose CLI identity");
  assert(coldStatus.identity.package_name === null, "status should tolerate repos without package identity");
  assert(coldStatus.identity.rename_surfaces.some((surface) => surface.includes("package.json")), "status should list rename surfaces");
  assert(coldStatus.ledger.exists === false, "cold status should not create the ledger store");
  assert(coldStatus.policy.exists === false, "cold status should expose missing policy file");
  assert(coldStatus.ledger.runs === 0, "cold status should report zero runs");
  assert(coldStatus.evidence.eligible_runs === 0, "cold status should report no routing evidence");
  assert(coldStatus.evidence.maturity.strongest_level === "none", "cold status should expose missing evidence maturity");
  assert(coldStatus.next_capture.needed === true, "cold status should expose the next capture step");
  assert(coldStatus.next_capture.runner === "claude", "cold status should suggest the first available default runner");
  assert(coldStatus.next_capture.runner_source === "availability_fallback", "cold status should label availability fallback");
  assert(coldStatus.next_capture.provider_call_required === true, "cold status should disclose provider-call boundary");
  assert(coldStatus.next_capture.writes_ledger === true, "cold status should disclose ledger write boundary");
  assert(coldStatus.next_capture.human_review_required === true, "cold status should disclose review boundary");
  assert(coldStatus.next_capture.command.includes("rux run"), "cold status should include a command template");
  assert(coldStatus.next_capture.command.includes("--check"), "cold status command should include a check placeholder");
  assert(coldStatus.release.ready === false, "cold status should include release gate state");
  assert(coldStatus.next_actions.some((action) => action.includes("first live provider task")), "cold status should suggest the first capture step");
  assert(!existsSync(join(tempRoot, ".rux")), "status should remain read-only before the first run");

  const initResult = JSON.parse(run("node", [cliPath, "init", "--cwd", tempRoot]).stdout);
  assert(initResult.policy.created === true, "init should create policy file");
  assert(initResult.gitignore.written === true, "init should update gitignore");
  assert(initResult.gitignore.ignores_store === true, "init should ignore the local store");
  assert(existsSync(join(tempRoot, "rux.policy.json")), "init should write policy file");
  const initializedGitignore = await readFile(join(tempRoot, ".gitignore"), "utf8");
  assert(initializedGitignore.includes(".rux/"), "init should add store ignore rule");
  const initializedPolicy = JSON.parse(run("node", [cliPath, "policy", "--cwd", tempRoot]).stdout);
  assert(initializedPolicy.exists === true, "policy should see initialized policy file");
  assert(initializedPolicy.source === "file", "initialized policy should be file-backed");
  const secondInitResult = JSON.parse(run("node", [cliPath, "init", "--cwd", tempRoot]).stdout);
  assert(secondInitResult.policy.written === false, "init should not overwrite existing policy by default");
  assert(secondInitResult.gitignore.written === false, "init should not duplicate gitignore rule");
  const forceInitResult = JSON.parse(run("node", [cliPath, "init", "--cwd", tempRoot, "--force"]).stdout);
  assert(forceInitResult.policy.overwritten === true, "init --force should overwrite policy");
  assert(!existsSync(join(tempRoot, ".rux")), "init should not create the ledger store");

  await writeFile(join(tempRoot, "rux.policy.json"), JSON.stringify({
    schema_version: 1,
    preferred_runner_order: ["gemini", "codex", "claude"],
    default_roster: "solo",
    parallel_provider_cli_runs: false,
    provider_auth: "inherit_cli_environment",
    transcript_export_default: "omit",
    self_modification: "proposal_only"
  }, null, 2), "utf8");
  const filePolicy = JSON.parse(run("node", [cliPath, "policy", "--cwd", tempRoot]).stdout);
  assert(filePolicy.exists === true, "policy should load committed policy file");
  assert(filePolicy.policy.preferred_runner_order[0] === "gemini", "policy should preserve preferred runner order");
  const policyPlanRun = spawnSync("node", [
    cliPath,
    "plan",
    "update more docs",
    "--cwd",
    tempRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(policyPlanRun.status === 0, "policy-backed cold plan should complete");
  const policyPlan = JSON.parse(policyPlanRun.stdout);
  assert(policyPlan.recommendation.runner === "gemini", "policy-backed cold plan should use preferred runner order");
  assert(policyPlan.policy.source === "file", "policy-backed plan should report file policy source");

  const smokeOnlyRoot = join(tempRoot, "smoke-only");
  await mkdir(smokeOnlyRoot, { recursive: true });
  run("git", ["init"], smokeOnlyRoot);
  await writeFile(join(smokeOnlyRoot, "README.md"), "# Smoke Only\n", "utf8");
  run("git", ["add", "README.md"], smokeOnlyRoot);
  run("git", ["commit", "-m", "initial"], smokeOnlyRoot, {
    GIT_AUTHOR_NAME: "Rux Smoke",
    GIT_AUTHOR_EMAIL: "smoke@example.com",
    GIT_COMMITTER_NAME: "Rux Smoke",
    GIT_COMMITTER_EMAIL: "smoke@example.com"
  });
  await writeFile(join(smokeOnlyRoot, "rux.policy.json"), JSON.stringify({
    schema_version: 1,
    preferred_runner_order: ["codex", "gemini", "claude"],
    default_roster: "solo",
    parallel_provider_cli_runs: false,
    provider_auth: "inherit_cli_environment",
    transcript_export_default: "omit",
    self_modification: "proposal_only"
  }, null, 2), "utf8");
  const smokeOnlyGemini = spawnSync("node", [cliPath, "provider-smoke", "--runner", "gemini", "--allow-dirty", "--cwd", smokeOnlyRoot], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(smokeOnlyGemini.status === 0, "smoke-only gemini provider smoke should complete");
  const smokeOnlyGeminiSummary = JSON.parse(smokeOnlyGemini.stdout);
  const smokeOnlyCodex = spawnSync("node", [cliPath, "provider-smoke", "--runner", "codex", "--allow-dirty", "--cwd", smokeOnlyRoot], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(smokeOnlyCodex.status === 0, "smoke-only codex provider smoke should complete");
  const smokeOnlyCodexSummary = JSON.parse(smokeOnlyCodex.stdout);
  const smokeFallbackPlan = JSON.parse(run("node", [
    cliPath,
    "plan",
    "update docs",
    "--cwd",
    smokeOnlyRoot
  ], repoRoot, {
    PATH: `${tempBin}:${process.env.PATH ?? ""}`
  }).stdout);
  assert(smokeFallbackPlan.runner_source === "provider_smoke_fallback", "smoke-only plan should use provider-smoke fallback");
  assert(smokeFallbackPlan.recommendation.runner === "codex", "provider-smoke fallback should respect policy runner order");
  const smokeOnlyProposal = JSON.parse(run("node", [cliPath, "propose", "--cwd", smokeOnlyRoot]).stdout);
  assert(smokeOnlyProposal.findings.some((finding) => finding.title === "Capture a labeled provider task before routing"), "smoke-only proposal should distinguish adapter readiness from task quality");
  assert(smokeOnlyProposal.findings.some((finding) => finding.category === "release"), "smoke-only proposal should surface release blockers");
  assert(smokeOnlyProposal.release.ready === false, "smoke-only proposal should include release readiness");
  assert(smokeOnlyProposal.release.blockers.includes("real_provider_task_evidence"), "smoke-only proposal should include task-evidence release blocker");
  assert(smokeOnlyProposal.release.blocker_summary.one_time.includes("real_provider_task_evidence"), "smoke-only proposal should classify first task evidence as one-time");
  assert(smokeOnlyProposal.cited_run_ids.includes(smokeOnlyGeminiSummary.id), "smoke-only proposal should cite gemini smoke evidence");
  assert(smokeOnlyProposal.cited_run_ids.includes(smokeOnlyCodexSummary.id), "smoke-only proposal should cite codex smoke evidence");
  const smokeOnlyStatus = JSON.parse(run("node", [cliPath, "status", "--cwd", smokeOnlyRoot], repoRoot, {
    PATH: `${tempBin}:${process.env.PATH ?? ""}`
  }).stdout);
  assert(smokeOnlyStatus.evidence.live_provider_task_runs === 0, "smoke-only status should not count provider-smoke as task evidence");
  assert(smokeOnlyStatus.evidence.provider_smoke_runs === 2, "smoke-only status should count provider-smoke separately");
  assert(smokeOnlyStatus.next_capture.needed === true, "smoke-only status should still ask for task evidence");
  assert(smokeOnlyStatus.next_capture.runner === "codex", "smoke-only status should respect policy order for provider-smoke fallback");
  assert(smokeOnlyStatus.next_capture.runner_source === "provider_smoke_fallback", "smoke-only status should label smoke-backed runner choice");
  assert(smokeOnlyStatus.next_capture.provider_call_required === true, "smoke-only status should disclose provider-call boundary");
  assert(smokeOnlyStatus.next_capture.writes_ledger === true, "smoke-only status should disclose ledger write boundary");
  assert(smokeOnlyStatus.next_capture.human_review_required === true, "smoke-only status should disclose review boundary");
  assert(smokeOnlyStatus.next_capture.command.includes("--runner codex"), "smoke-only status should include a provider task command template");
  assert(smokeOnlyStatus.next_actions.some((action) => action.includes("first routing-eligible real provider task")), "smoke-only status should ask for real provider task evidence");
  assert(smokeOnlyStatus.latest_runs[0].task_summary && !smokeOnlyStatus.latest_runs[0].task_summary.includes("\n"), "status latest runs should include one-line task summary");
  const smokeOnlyReleaseCheck = JSON.parse(run("node", [cliPath, "release-check", "--cwd", smokeOnlyRoot]).stdout);
  assert(smokeOnlyReleaseCheck.gates.find((gate) => gate.name === "real_provider_task_evidence")?.ok === false, "release-check should not treat provider-smoke as task evidence");

  const mutatingOnlyRoot = join(tempRoot, "mutating-only");
  await mkdir(mutatingOnlyRoot, { recursive: true });
  run("git", ["init"], mutatingOnlyRoot);
  await writeFile(join(mutatingOnlyRoot, "README.md"), "# Mutating Only\n", "utf8");
  run("git", ["add", "README.md"], mutatingOnlyRoot);
  run("git", ["commit", "-m", "initial"], mutatingOnlyRoot, {
    GIT_AUTHOR_NAME: "Rux Smoke",
    GIT_AUTHOR_EMAIL: "smoke@example.com",
    GIT_COMMITTER_NAME: "Rux Smoke",
    GIT_COMMITTER_EMAIL: "smoke@example.com"
  });
  await writeFile(join(mutatingOnlyRoot, "rux.policy.json"), JSON.stringify({
    schema_version: 1,
    preferred_runner_order: ["codex", "gemini", "claude"],
    default_roster: "solo",
    parallel_provider_cli_runs: false,
    provider_auth: "inherit_cli_environment",
    transcript_export_default: "omit",
    self_modification: "proposal_only"
  }, null, 2), "utf8");
  const mutatingOnlyRun = spawnSync("node", [
    cliPath,
    "run",
    "codex release evidence mutation guard",
    "--runner",
    "codex",
    "--allow-dirty",
    "--cwd",
    mutatingOnlyRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(mutatingOnlyRun.status === 0, "mutating-only mocked codex run should complete");
  const mutatingOnlySummary = JSON.parse(mutatingOnlyRun.stdout);
  JSON.parse(run("node", [
    cliPath,
    "check",
    mutatingOnlySummary.id,
    "--command",
    "node -e \"require('node:fs').writeFileSync('release-mutated.txt','changed')\"",
    "--cwd",
    mutatingOnlyRoot
  ]).stdout);
  const mutatingOnlyReleaseCheck = JSON.parse(run("node", [cliPath, "release-check", "--cwd", mutatingOnlyRoot]).stdout);
  assert(mutatingOnlyReleaseCheck.gates.find((gate) => gate.name === "real_provider_task_evidence")?.ok === false, "release-check should not accept mutating checks as task evidence");
  assert(mutatingOnlyReleaseCheck.next_actions.some((action) => action.includes("routing-eligible live provider task")), "release-check should ask for routing-eligible provider task evidence");

  const coldExport = JSON.parse(run("node", [cliPath, "export", "--cwd", tempRoot]).stdout);
  assert(coldExport.runs.length === 0, "cold export should return no runs");
  assert(coldExport.counts.exported_runs === 0, "cold export should report zero exported runs");
  assert(coldExport.include_transcripts === false, "export should omit transcripts by default");
  assert(!existsSync(join(tempRoot, ".rux")), "export should remain read-only before the first run");

  const runResult = run("node", [
    cliPath,
    "run",
    "record a fake run in a temp repo",
    "--runner",
    "fake",
    "--cwd",
    tempRoot,
    "--check",
    "node --version"
  ]);
  const summary = JSON.parse(runResult.stdout);
  assert(summary.status === "ok", "fake run should be ok");
  assert(summary.status_reason === "completed", "fake run should classify completed status");
  assert(summary.runner === "fake", "fake run should use fake runner");
  assert(summary.adapter.command === "(built-in)", "fake run should expose built-in adapter metadata");
  assert(summary.adapter.exit_code === 0, "fake adapter metadata should expose exit code");
  assert(summary.adapter.stderr_signal.level === "none", "fake adapter metadata should classify empty stderr");
  assert(summary.adapter.metadata_sources.model === "not_observed", "fake adapter metadata should not invent model source");
  assert(summary.changed_files.length === 0, "fake run in clean repo should not report changed files");
  assert(summary.checks[0]?.source === "run_check", "inline run checks should record their source");
  assert(summary.repo.before.inside_work_tree === true, "run summary should include repo snapshot before the run");
  assert(summary.repo.after.inside_work_tree === true, "run summary should include repo snapshot after the run");
  assert(summary.repo.before.head === summary.repo.after.head, "unchanged fake run should keep the same git head");
  assert(summary.replay.available === true, "run summary should include replay metadata");
  assert(summary.replay.command.includes("rux run"), "run summary should include replay command");
  assert(summary.replay.command.includes("--check 'node --version'"), "run replay command should include captured check command");
  assert(summary.replay.provider_call_required === false, "fake run replay should not imply a provider call");
  assert(existsSync(join(tempRoot, summary.transcript_path)), "transcript should exist");

  const reportResult = JSON.parse(run("node", [
    cliPath,
    "report",
    "The fake runner made smoke feedback easy to capture",
    "--kind",
    "success",
    "--run-id",
    summary.id,
    "--command",
    summary.replay.command,
    "--note",
    "General dogfood feedback should not require a failure.",
    "--source-repo",
    tempRoot,
    "--cwd",
    tempRoot
  ]).stdout);
  assert(reportResult.type === "report", "report should append a report event");
  assert(reportResult.kind === "success", "report should support non-failure feedback kinds");
  assert(reportResult.run_id === summary.id, "report should preserve optional run link");
  assert(reportResult.run_found === true, "report should say whether the linked run exists");
  assert(reportResult.report_path.endsWith(".md"), "report should write a markdown report");
  assert(existsSync(join(tempRoot, reportResult.report_path)), "report markdown should exist");
  const reportMarkdown = await readFile(join(tempRoot, reportResult.report_path), "utf8");
  assert(reportMarkdown.includes("# Rux Feedback Report"), "report markdown should have a clear heading");
  assert(reportMarkdown.includes("Kind: success"), "report markdown should include feedback kind");
  assert(reportMarkdown.includes("This is raw feedback."), "report markdown should explain the guardrail");

  run("node", [
    cliPath,
    "verdict",
    summary.id,
    "accepted",
    "--note",
    "smoke passed",
    "--cwd",
    tempRoot
  ]);

  const showResult = run("node", [cliPath, "show", summary.id, "--cwd", tempRoot]);
  const shown = JSON.parse(showResult.stdout);
  assert(shown.run.id === summary.id, "show should return the run");
  assert(shown.run.replay.command === summary.replay.command, "show should expose replay metadata");
  assert(shown.run.adapter.command === "(built-in)", "show should expose adapter metadata");
  assert(shown.verdicts[0]?.verdict === "accepted", "show should include verdict");
  assert(shown.evaluation.outcome.label === "human_accepted", "show evaluation should include human outcome label");

  const fakeOutcome = JSON.parse(run("node", [cliPath, "outcome", summary.id, "--cwd", tempRoot]).stdout);
  assert(fakeOutcome.outcome.label === "human_accepted", "outcome should prefer human verdicts");
  assert(fakeOutcome.outcome.risks.includes("fake_runner"), "outcome should surface fake runner risk");
  assert(fakeOutcome.outcome.checks.total === 1, "outcome should include captured check count");
  const fakeEval = JSON.parse(run("node", [cliPath, "eval", summary.id, "--cwd", tempRoot]).stdout);
  assert(fakeEval.signals.repo_snapshot === true, "eval should expose repo snapshot availability");
  assert(Number.isInteger(fakeEval.signals.repo_dirty_before), "eval should include repo dirty count before the run");
  assert(fakeEval.status_reason === "completed", "eval should expose status reason");
  assert(fakeEval.signals.adapter_exit_code === 0, "eval should expose adapter exit code");
  assert(fakeEval.signals.adapter_stderr_signal === "none", "eval should expose adapter stderr signal");

  const ledgerPath = join(tempRoot, ".rux", "ledger");
  assert(existsSync(ledgerPath), "ledger directory should exist");

  const transcript = await readFile(join(tempRoot, summary.transcript_path), "utf8");
  assert(transcript.includes("runner: fake"), "transcript should contain fake runner output");

  const pairResult = run("node", [
    cliPath,
    "run",
    "review the docs change",
    "--runner",
    "fake",
    "--roster",
    "pair",
    "--cwd",
    tempRoot,
    "--check",
    "node --version"
  ]);
  const pairSummary = JSON.parse(pairResult.stdout);
  assert(pairSummary.roster === "pair", "pair run should keep pair roster");
  assert(pairSummary.role === "roster", "pair summary should be a roster parent");
  assert(pairSummary.status_reason === "completed", "pair parent should classify completed roster status");
  assert(pairSummary.adapter.notes[0].includes("child runs"), "pair parent should explain adapter metadata lives on children");
  assert(pairSummary.child_run_ids.length === 2, "pair run should create implementer and reviewer child runs");
  assert(pairSummary.checks.length === 1, "pair parent should include implementer check result");
  assert(pairSummary.repo.before.inside_work_tree === true, "pair parent should include repo snapshot before roster execution");
  assert(pairSummary.repo.after.inside_work_tree === true, "pair parent should include repo snapshot after roster execution");
  assert(pairSummary.replay.command.includes("--roster pair"), "roster parent replay should include roster command");

  const pairShow = JSON.parse(run("node", [cliPath, "show", pairSummary.id, "--cwd", tempRoot]).stdout);
  assert(pairShow.children.length === 2, "show should include pair child runs");
  assert(pairShow.evaluation.signals.repo_snapshot === true, "show evaluation should see roster parent repo snapshot");
  assert(pairShow.children.map((child) => child.role).join(",") === "implementer,reviewer", "pair children should keep role order");
  assert(pairShow.children.every((child) => child.replay.available === false), "child runs should ask callers to replay the parent roster");
  assert(pairShow.children.every((child) => child.replay.parent_command === pairSummary.replay.command), "child replay metadata should include the parent command");
  const pairTranscript = await readFile(join(tempRoot, pairSummary.transcript_path), "utf8");
  assert(pairTranscript.includes("## child runs"), "pair transcript should summarize child runs");

  const repairResult = run("node", [
    cliPath,
    "run",
    "repair only if the check fails",
    "--runner",
    "fake",
    "--roster",
    "repair",
    "--cwd",
    tempRoot,
    "--check",
    "node --version"
  ]);
  const repairSummary = JSON.parse(repairResult.stdout);
  const repairShow = JSON.parse(run("node", [cliPath, "show", repairSummary.id, "--cwd", tempRoot]).stdout);
  assert(repairSummary.roster === "repair", "repair run should keep repair roster");
  assert(repairShow.children.length === 1, "repair should skip second child when the first attempt passes");
  assert(repairShow.run.notes.some((note) => note.includes("Repair step skipped")), "repair parent should explain skipped repair");

  const chainResult = run("node", [
    cliPath,
    "run",
    "plan code review workflow",
    "--runner",
    "fake",
    "--roster",
    "plan-code-review",
    "--cwd",
    tempRoot
  ]);
  const chainSummary = JSON.parse(chainResult.stdout);
  const chainShow = JSON.parse(run("node", [cliPath, "show", chainSummary.id, "--cwd", tempRoot]).stdout);
  assert(chainSummary.roster === "plan-code-review", "chain run should keep plan-code-review roster");
  assert(chainShow.children.map((child) => child.role).join(",") === "planner,coder,reviewer", "chain children should keep role order");

  const listOutput = run("node", [cliPath, "ls", "--cwd", tempRoot]).stdout;
  assert(listOutput.includes(pairSummary.id), "ls should include roster parent runs");
  assert(!listOutput.includes(pairSummary.child_run_ids[0]), "ls should keep child runs out of the overview");
  assert(listOutput.includes("mark=-"), "ls should include lifecycle mark column");

  const oldSessionPath = join(tempRoot, "old-claude-session.txt");
  await writeFile(oldSessionPath, "Claude session transcript from before Rux existed.\nNo checks were captured.\n", "utf8");
  const importResult = run("node", [
    cliPath,
    "import",
    "--from",
    oldSessionPath,
    "--runner",
    "claude",
    "--task",
    "Imported old Claude session",
    "--cwd",
    tempRoot,
    "--started-at",
    "2026-06-01T00:00:00.000Z"
  ]);
  const importedSummary = JSON.parse(importResult.stdout);
  assert(importedSummary.source === "imported", "imported run should keep imported source");
  assert(importedSummary.confidence === "low", "imported run should be low confidence");
  assert(importedSummary.runner === "claude", "imported run should keep selected runner");
  assert(importedSummary.status === "unknown", "imported run should default to unknown status");
  assert(importedSummary.changed_files.length === 0, "imported run should not invent changed files");
  assert(importedSummary.checks.length === 0, "imported run should not invent checks");
  assert(importedSummary.repo.imported_at.inside_work_tree === true, "imported run should include repo context at import time");
  assert(importedSummary.replay.available === false, "imported run should not pretend to be replayable");

  const importedTranscript = await readFile(join(tempRoot, importedSummary.transcript_path), "utf8");
  assert(importedTranscript.includes("source: imported"), "imported transcript should mark source");
  assert(importedTranscript.includes("confidence: low"), "imported transcript should mark low confidence");
  assert(importedTranscript.includes("No checks were captured."), "imported transcript should include source text");

  run("node", [
    cliPath,
    "verdict",
    importedSummary.id,
    "partial",
    "--note",
    "old session imported only for continuity",
    "--cwd",
    tempRoot
  ]);
  const importedShow = JSON.parse(run("node", [cliPath, "show", importedSummary.id, "--cwd", tempRoot]).stdout);
  assert(importedShow.run.imported_from === oldSessionPath, "show should include imported source path");
  assert(importedShow.run.status_reason === "imported_unverified", "imported run should classify unverified status");
  assert(importedShow.run.adapter.notes[0].includes("Original provider invocation was not observed"), "imported run should preserve adapter uncertainty");
  assert(importedShow.run.replay.available === false, "show should preserve imported replay boundary");
  assert(importedShow.verdicts[0]?.verdict === "partial", "imported run should accept later verdicts");
  assert(importedShow.evaluation.routing.blockers.includes("not_live"), "show evaluation should explain imported routing blocker");
  const importedEval = JSON.parse(run("node", [cliPath, "eval", importedSummary.id, "--cwd", tempRoot]).stdout);
  assert(importedEval.routing.eligible === false, "eval should mark imported runs ineligible for routing");
  assert(importedEval.routing.blockers.includes("not_high_confidence"), "eval should show low confidence blocker");
  assert(importedEval.outcome.label === "human_partial", "eval should include imported human outcome after verdict");
  assert(importedEval.outcome.risks.includes("not_live"), "imported outcome should retain not-live risk");

  const claudeGuard = spawnSync("node", [
    cliPath,
    "run",
    "guard",
    "--runner",
    "claude",
    "--allow-dirty",
    "--model",
    "claude-sonnet-smoke",
    "--effort",
    "high",
    "--cost-hint",
    "0.42",
    "--cwd",
    tempRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(claudeGuard.status === 0, "mocked claude runner should complete");
  assert(claudeGuard.stderr.includes("rux: starting claude mode=plan"), "provider runs should print Rux start progress on stderr");
  assert(claudeGuard.stderr.includes("rux: claude finished exit=0"), "provider runs should print Rux finish progress on stderr");
  const claudeSummary = JSON.parse(claudeGuard.stdout);
  assert(claudeSummary.runner === "claude", "mocked claude run should use claude runner");
  assert(claudeSummary.status === "ok", "mocked claude run should be ok");
  assert(claudeSummary.status_reason === "completed", "mocked claude run should classify completed status");
  assert(claudeSummary.adapter.command === "claude", "mocked claude run should expose adapter command");
  assert(claudeSummary.adapter.argv.includes("--permission-mode"), "mocked claude adapter should expose argv");
  assert(claudeSummary.adapter.stdout_bytes > 0, "mocked claude adapter should expose stdout byte count");
  assert(claudeSummary.adapter.stderr_signal.level === "none", "mocked claude adapter should classify empty stderr");
  assert(claudeSummary.model === "claude-sonnet-smoke", "mocked claude run should capture model metadata");
  assert(claudeSummary.effort === "high", "mocked claude run should capture effort metadata");
  assert(claudeSummary.cost_hint.amount === 0.42, "mocked claude run should capture numeric cost hint");
  assert(claudeSummary.adapter.metadata_sources.model === "user_option", "mocked claude adapter should identify user-supplied model metadata");
  assert(claudeSummary.adapter.metadata_sources.effort === "user_option", "mocked claude adapter should identify user-supplied effort metadata");
  assert(claudeSummary.adapter.metadata_sources.cost_hint === "user_option", "mocked claude adapter should identify user-supplied cost metadata");
  assert(claudeSummary.replay.provider_call_required === true, "real runner replay should disclose provider call");
  assert(claudeSummary.replay.command.includes("--model claude-sonnet-smoke"), "real runner replay should include model metadata");
  assert(claudeSummary.replay.command.includes("--effort high"), "real runner replay should include effort metadata");
  assert(claudeSummary.replay.command.includes("--cost-hint 0.42"), "real runner replay should include cost hint");

  const claudeTranscript = await readFile(join(tempRoot, claudeSummary.transcript_path), "utf8");
  assert(claudeTranscript.includes("--permission-mode plan"), "claude runner should use plan permission mode");
  assert(claudeTranscript.includes("mock claude received"), "claude transcript should capture stdout");
  const claudeWriteRun = spawnSync("node", [
    cliPath,
    "run",
    "write claude guard",
    "--runner",
    "claude",
    "--allow-dirty",
    "--provider-mode",
    "write",
    "--cwd",
    tempRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(claudeWriteRun.status === 0, "mocked claude write-mode runner should complete");
  const claudeWriteSummary = JSON.parse(claudeWriteRun.stdout);
  const claudeWriteTranscript = await readFile(join(tempRoot, claudeWriteSummary.transcript_path), "utf8");
  assert(claudeWriteTranscript.includes("--permission-mode acceptEdits"), "claude write mode should accept edits instead of plan mode");
  run("node", [
    cliPath,
    "verdict",
    claudeSummary.id,
    "accepted",
    "--note",
    "mock claude accepted for suggestion smoke",
    "--cwd",
    tempRoot
  ]);
  const claudeEval = JSON.parse(run("node", [cliPath, "eval", claudeSummary.id, "--cwd", tempRoot]).stdout);
  assert(claudeEval.routing.eligible === true, "accepted live claude run should be routing eligible");
  assert(claudeEval.routing.score === 1, "accepted live claude run should score 1");
  assert(claudeEval.latest_verdict.verdict === "accepted", "eval should include latest human verdict");
  assert(claudeEval.outcome.label === "human_accepted", "eval should include human accepted outcome");
  assert(claudeEval.outcome.score === 1, "human accepted outcome should score 1");
  assert(claudeEval.model === "claude-sonnet-smoke", "eval should include model metadata");
  assert(claudeEval.effort === "high", "eval should include effort metadata");
  assert(claudeEval.cost_hint.amount === 0.42, "eval should include cost hint metadata");
  assert(claudeEval.signals.adapter_exit_code === 0, "eval should include adapter exit code");
  assert(claudeEval.signals.adapter_stdout_bytes > 0, "eval should include adapter output size");
  assert(claudeEval.signals.adapter_stderr_signal === "none", "eval should include adapter stderr signal");

  const codexRun = spawnSync("node", [cliPath, "run", "codex guard", "--runner", "codex", "--allow-dirty", "--cwd", tempRoot], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(codexRun.status === 0, "mocked codex runner should complete");
  const codexSummary = JSON.parse(codexRun.stdout);
  assert(codexSummary.runner === "codex", "mocked codex run should use codex runner");
  assert(codexSummary.status === "ok", "mocked codex run should be ok");
  assert(codexSummary.adapter.argv.includes("--sandbox"), "mocked codex adapter should expose sandbox argv");
  assert(codexSummary.adapter.stderr_signal.level === "diagnostic", "mocked codex adapter should classify successful stderr as diagnostic");
  const codexEval = JSON.parse(run("node", [cliPath, "eval", codexSummary.id, "--cwd", tempRoot]).stdout);
  assert(codexEval.signals.adapter_stderr_signal === "diagnostic", "eval should expose diagnostic stderr without treating it as failure");
  const codexOutcome = JSON.parse(run("node", [cliPath, "outcome", codexSummary.id, "--cwd", tempRoot]).stdout);
  assert(codexOutcome.outcome.label === "unlabeled", "outcome should mark unlabeled provider runs");
  assert(codexOutcome.outcome.risks.includes("missing_verdict_or_check"), "unlabeled outcome should explain missing signal");
  const codexPostRunCheckProcess = spawnSync("node", [
    cliPath,
    "check",
    codexSummary.id,
    "--command",
    "node --version",
    "--note",
    "verified after provider run",
    "--cwd",
    tempRoot
  ], {
    encoding: "utf8"
  });
  assert(codexPostRunCheckProcess.status === 0, "post-run check should complete through spawn path");
  assert(codexPostRunCheckProcess.stderr.includes("rux: running check: node --version"), "post-run checks should print start progress on stderr");
  assert(codexPostRunCheckProcess.stderr.includes("rux: check passed exit=0"), "post-run checks should print completion progress on stderr");
  const codexPostRunCheck = JSON.parse(codexPostRunCheckProcess.stdout);
  assert(codexPostRunCheck.type === "check", "post-run check should append a check event");
  assert(codexPostRunCheck.source === "post_run_check", "post-run check should record its source");
  assert(codexPostRunCheck.exit_code === 0, "post-run check should capture exit code");
  assert(codexPostRunCheck.repo.before.head === codexSummary.repo.after.head, "post-run check should capture repo state before the check");
  assert(codexPostRunCheck.repo.after.head === codexSummary.repo.after.head, "post-run check should capture repo state after the check");
  assert(Array.isArray(codexPostRunCheck.changed_files), "post-run check should report changed files");
  const checkedCodexOutcome = JSON.parse(run("node", [cliPath, "outcome", codexSummary.id, "--cwd", tempRoot]).stdout);
  assert(checkedCodexOutcome.outcome.label === "checks_passed", "post-run check should make outcome check-backed");
  assert(checkedCodexOutcome.outcome.checks.total === 1, "post-run check should be visible in outcome");
  const checkedCodexEval = JSON.parse(run("node", [cliPath, "eval", codexSummary.id, "--cwd", tempRoot]).stdout);
  assert(checkedCodexEval.routing.eligible === true, "post-run checked provider run should become routing eligible");
  assert(checkedCodexEval.signals.checks_total === 1, "eval should count post-run checks");
  assert(checkedCodexEval.signals.check_changed_files === 0, "eval should expose check-time file changes");
  assert(checkedCodexEval.routing.score_basis === "checks_passed", "post-run checked provider run should score from checks");

  const codexTranscript = await readFile(join(tempRoot, codexSummary.transcript_path), "utf8");
  assert(codexTranscript.includes("exec --sandbox read-only"), "codex runner should use read-only sandbox");
  assert(codexTranscript.includes("mock codex received"), "codex transcript should capture stdout");
  const codexWriteRun = spawnSync("node", [
    cliPath,
    "run",
    "codex write guard",
    "--runner",
    "codex",
    "--allow-dirty",
    "--provider-mode",
    "write",
    "--cwd",
    tempRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(codexWriteRun.status === 0, "mocked codex write-mode runner should complete");
  const codexWriteSummary = JSON.parse(codexWriteRun.stdout);
  const codexWriteTranscript = await readFile(join(tempRoot, codexWriteSummary.transcript_path), "utf8");
  assert(codexWriteTranscript.includes("exec --sandbox workspace-write"), "codex write mode should use workspace-write sandbox");

  const geminiRun = spawnSync("node", [cliPath, "run", "gemini guard", "--runner", "gemini", "--allow-dirty", "--cwd", tempRoot], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(geminiRun.status === 0, "mocked gemini runner should complete");
  const geminiSummary = JSON.parse(geminiRun.stdout);
  assert(geminiSummary.runner === "gemini", "mocked gemini run should use gemini runner");
  assert(geminiSummary.status === "ok", "mocked gemini run should be ok");

  const geminiTranscript = await readFile(join(tempRoot, geminiSummary.transcript_path), "utf8");
  assert(geminiTranscript.includes("--approval-mode plan"), "gemini runner should use plan approval mode");
  assert(geminiTranscript.includes("--skip-trust"), "gemini runner should skip workspace trust prompts for headless runs");
  assert(geminiTranscript.includes("mock gemini received"), "gemini transcript should capture stdout");
  const geminiWriteRun = spawnSync("node", [
    cliPath,
    "run",
    "gemini write guard",
    "--runner",
    "gemini",
    "--allow-dirty",
    "--provider-mode",
    "write",
    "--cwd",
    tempRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(geminiWriteRun.status === 0, "mocked gemini write-mode runner should complete");
  const geminiWriteSummary = JSON.parse(geminiWriteRun.stdout);
  const geminiWriteTranscript = await readFile(join(tempRoot, geminiWriteSummary.transcript_path), "utf8");
  assert(geminiWriteTranscript.includes("--approval-mode auto_edit"), "gemini write mode should use auto_edit approval mode");

  const blockedGeminiRun = spawnSync("node", [
    cliPath,
    "run",
    "needs provider approval",
    "--runner",
    "gemini",
    "--allow-dirty",
    "--cwd",
    tempRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(blockedGeminiRun.status === 0, "provider approval run should still record a run");
  assert(blockedGeminiRun.stderr.includes("rux: starting gemini mode=plan"), "provider progress should identify the runner and mode");
  assert(blockedGeminiRun.stderr.includes("Do you agree with this approach?"), "provider output should be visible on stderr while stdout stays JSON");
  const blockedGeminiSummary = JSON.parse(blockedGeminiRun.stdout);
  assert(blockedGeminiSummary.status === "blocked", "provider approval output should not be marked ok");
  assert(blockedGeminiSummary.status_reason === "provider_needs_input", "provider approval output should classify as needing input");
  assert(blockedGeminiSummary.output_signal.kind === "needs_input", "blocked run summary should expose output signal");
  const blockedGeminiOutcome = JSON.parse(run("node", [cliPath, "outcome", blockedGeminiSummary.id, "--cwd", tempRoot]).stdout);
  assert(blockedGeminiOutcome.outcome.label === "blocked_for_input", "blocked provider runs should get a distinct outcome");
  assert(blockedGeminiOutcome.outcome.risks.includes("provider_needs_input"), "blocked provider outcome should expose input risk");
  const blockedGeminiEval = JSON.parse(run("node", [cliPath, "eval", blockedGeminiSummary.id, "--cwd", tempRoot]).stdout);
  assert(blockedGeminiEval.routing.blockers.includes("run_not_ok"), "blocked provider runs should not become routing evidence");
  assert(blockedGeminiEval.signals.output_signal === "needs_input", "eval should expose output signal");
  const softBlockedGeminiRun = spawnSync("node", [
    cliPath,
    "run",
    "soft provider approval",
    "--runner",
    "gemini",
    "--allow-dirty",
    "--cwd",
    tempRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(softBlockedGeminiRun.status === 0, "soft provider approval run should record");
  const softBlockedGeminiSummary = JSON.parse(softBlockedGeminiRun.stdout);
  assert(softBlockedGeminiSummary.status === "blocked", "soft approval wording should be blocked");
  assert(softBlockedGeminiSummary.status_reason === "provider_needs_input", "soft approval wording should classify as needing input");

  const planChangedGeminiRun = spawnSync("node", [
    cliPath,
    "run",
    "plan mode edits",
    "--runner",
    "gemini",
    "--allow-dirty",
    "--cwd",
    tempRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(planChangedGeminiRun.status === 0, "plan-mode file changes should still record a run");
  const planChangedGeminiSummary = JSON.parse(planChangedGeminiRun.stdout);
  assert(planChangedGeminiSummary.status === "failed", "plan-mode file changes should fail the run");
  assert(planChangedGeminiSummary.status_reason === "provider_plan_changed_files", "plan-mode file changes should get a safety-specific reason");
  assert(planChangedGeminiSummary.output_signal.kind === "plan_changed_files", "plan-mode write violation should expose output signal");
  assert(planChangedGeminiSummary.changed_files.includes("plan-mode-edited.txt"), "plan-mode write violation should report changed file");
  const planChangedGeminiOutcome = JSON.parse(run("node", [cliPath, "outcome", planChangedGeminiSummary.id, "--cwd", tempRoot]).stdout);
  assert(planChangedGeminiOutcome.outcome.label === "run_failed", "plan-mode write violation should report a failed run, not a failed check");
  assert(planChangedGeminiOutcome.outcome.risks.includes("provider_plan_changed_files"), "plan-mode write violation should be an outcome risk");

  const checkedGeminiRun = spawnSync("node", [
    cliPath,
    "run",
    "gemini checked guard",
    "--runner",
    "gemini",
    "--allow-dirty",
    "--cwd",
    tempRoot,
    "--check",
    "node --version"
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(checkedGeminiRun.status === 0, "checked gemini run should complete");
  assert(checkedGeminiRun.stderr.includes("rux: running check: node --version"), "run checks should print start progress on stderr");
  assert(checkedGeminiRun.stderr.includes("rux: check passed exit=0"), "run checks should print completion progress on stderr");
  const checkedGeminiSummary = JSON.parse(checkedGeminiRun.stdout);
  const checkedGeminiOutcome = JSON.parse(run("node", [cliPath, "outcome", checkedGeminiSummary.id, "--cwd", tempRoot]).stdout);
  assert(checkedGeminiOutcome.outcome.label === "checks_passed", "outcome should mark check-passing provider runs");
  assert(checkedGeminiOutcome.outcome.score === 0.75, "check-passing outcome should use medium positive score");
  assert(checkedGeminiOutcome.outcome.checks.total === 1, "check-passing outcome should include check count");
  const failedCheckedCodexRun = spawnSync("node", [
    cliPath,
    "run",
    "codex failed post-run check guard",
    "--runner",
    "codex",
    "--allow-dirty",
    "--cwd",
    tempRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(failedCheckedCodexRun.status === 0, "mocked codex run for failed post-run check should complete");
  const failedCheckedCodexSummary = JSON.parse(failedCheckedCodexRun.stdout);
  const failedPostRunCheck = JSON.parse(run("node", [
    cliPath,
    "check",
    failedCheckedCodexSummary.id,
    "--command",
    "node -e \"process.exit(7)\"",
    "--cwd",
    tempRoot
  ]).stdout);
  assert(failedPostRunCheck.exit_code === 7, "post-run check should capture failing exit code");
  const failedCheckedCodexEval = JSON.parse(run("node", [cliPath, "eval", failedCheckedCodexSummary.id, "--cwd", tempRoot]).stdout);
  assert(failedCheckedCodexEval.outcome.label === "checks_failed", "failed post-run check should make outcome negative");
  assert(failedCheckedCodexEval.routing.eligible === true, "failed checked provider run should remain routing evidence");
  assert(failedCheckedCodexEval.routing.score === 0, "failed checked provider run should score zero");
  assert(failedCheckedCodexEval.routing.score_basis === "checks_failed", "failed checked provider run should explain score basis");

  const mutatingCheckedCodexRun = spawnSync("node", [
    cliPath,
    "run",
    "codex mutating post-run check guard",
    "--runner",
    "codex",
    "--allow-dirty",
    "--cwd",
    tempRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(mutatingCheckedCodexRun.status === 0, "mocked codex run for mutating post-run check should complete");
  const mutatingCheckedCodexSummary = JSON.parse(mutatingCheckedCodexRun.stdout);
  const mutatingPostRunCheck = JSON.parse(run("node", [
    cliPath,
    "check",
    mutatingCheckedCodexSummary.id,
    "--command",
    "node -e \"require('node:fs').writeFileSync('check-mutated.txt','changed')\"",
    "--cwd",
    tempRoot
  ]).stdout);
  assert(mutatingPostRunCheck.exit_code === 0, "mutating post-run check can still pass");
  assert(mutatingPostRunCheck.changed_files.includes("check-mutated.txt"), "post-run check should report files it changed");
  const mutatingCheckedCodexEval = JSON.parse(run("node", [cliPath, "eval", mutatingCheckedCodexSummary.id, "--cwd", tempRoot]).stdout);
  assert(mutatingCheckedCodexEval.outcome.label === "checks_passed", "mutating passing check should still be outcome-visible");
  assert(mutatingCheckedCodexEval.outcome.risks.includes("check_modified_files"), "mutating check should be visible as an outcome risk");
  assert(mutatingCheckedCodexEval.routing.eligible === false, "mutating checks should not become routing evidence");
  assert(mutatingCheckedCodexEval.routing.blockers.includes("check_modified_files"), "mutating checks should explain the routing blocker");

  const preSmokeReleaseCheck = JSON.parse(run("node", [cliPath, "release-check", "--cwd", tempRoot]).stdout);
  assert(preSmokeReleaseCheck.gates.find((gate) => gate.name === "policy_file")?.ok === true, "release-check should require committed policy file");
  assert(preSmokeReleaseCheck.gates.find((gate) => gate.name === "real_provider_task_evidence")?.ok === true, "release-check should accept routing-eligible live provider task evidence");
  assert(preSmokeReleaseCheck.gates.find((gate) => gate.name === "claude_smoke_evidence")?.ok === false, "release-check should require explicit claude provider-smoke evidence");
  assert(preSmokeReleaseCheck.gates.find((gate) => gate.name === "codex_smoke_evidence")?.ok === false, "release-check should require explicit codex provider-smoke evidence");
  assert(preSmokeReleaseCheck.gates.find((gate) => gate.name === "gemini_smoke_evidence")?.ok === false, "release-check should require explicit gemini provider-smoke evidence");

  const claudeProviderSmoke = spawnSync("node", [cliPath, "provider-smoke", "--runner", "claude", "--allow-dirty", "--cwd", tempRoot], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(claudeProviderSmoke.status === 0, "mocked claude provider smoke should complete");
  const claudeProviderSmokeSummary = JSON.parse(claudeProviderSmoke.stdout);
  assert(claudeProviderSmokeSummary.purpose === "provider_smoke", "claude provider smoke should mark purpose");
  assert(claudeProviderSmokeSummary.changed_files.length === 0, "claude provider smoke should not report file changes");
  assert(claudeProviderSmokeSummary.replay.command.includes("provider-smoke"), "provider smoke summary should include replay command");
  assert(claudeProviderSmokeSummary.replay.human_review_required === false, "provider smoke replay should not ask for task review");
  const claudeProviderSmokeEval = JSON.parse(run("node", [cliPath, "eval", claudeProviderSmokeSummary.id, "--cwd", tempRoot]).stdout);
  assert(claudeProviderSmokeEval.release.provider_smoke_evidence === true, "eval should mark provider-smoke release evidence");
  assert(claudeProviderSmokeEval.routing.blockers.includes("provider_smoke"), "eval should exclude provider smoke from routing");
  assert(!claudeProviderSmokeEval.routing.blockers.includes("unlabeled"), "provider smoke should not be treated as an unlabeled task run");
  assert(claudeProviderSmokeEval.outcome.label === "provider_smoke_passed", "provider smoke outcome should be release-only");
  assert(claudeProviderSmokeEval.outcome.confidence === "release_only", "provider smoke outcome should not imply task quality");
  const providerSmokeVerdict = spawnSync("node", [
    cliPath,
    "verdict",
    claudeProviderSmokeSummary.id,
    "accepted",
    "--cwd",
    tempRoot
  ], { encoding: "utf8" });
  assert(providerSmokeVerdict.status !== 0, "provider-smoke runs should reject human verdicts");
  assert(providerSmokeVerdict.stderr.includes("adapter readiness only"), "provider-smoke verdict rejection should explain the boundary");
  const providerSmokeMark = spawnSync("node", [
    cliPath,
    "mark",
    claudeProviderSmokeSummary.id,
    "accepted-downstream",
    "--cwd",
    tempRoot
  ], { encoding: "utf8" });
  assert(providerSmokeMark.status !== 0, "provider-smoke runs should reject lifecycle marks");
  assert(providerSmokeMark.stderr.includes("adapter readiness only"), "provider-smoke mark rejection should explain the boundary");
  const providerSmokeCheck = spawnSync("node", [
    cliPath,
    "check",
    claudeProviderSmokeSummary.id,
    "--command",
    "node --version",
    "--cwd",
    tempRoot
  ], { encoding: "utf8" });
  assert(providerSmokeCheck.status !== 0, "provider-smoke runs should reject post-run checks");
  assert(providerSmokeCheck.stderr.includes("adapter readiness only"), "provider-smoke check rejection should explain the boundary");

  const codexProviderSmoke = spawnSync("node", [cliPath, "provider-smoke", "--runner", "codex", "--allow-dirty", "--cwd", tempRoot], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(codexProviderSmoke.status === 0, "mocked codex provider smoke should complete");
  const codexProviderSmokeSummary = JSON.parse(codexProviderSmoke.stdout);
  assert(codexProviderSmokeSummary.purpose === "provider_smoke", "codex provider smoke should mark purpose");
  assert(codexProviderSmokeSummary.changed_files.length === 0, "codex provider smoke should not report file changes");

  const geminiProviderSmoke = spawnSync("node", [cliPath, "provider-smoke", "--runner", "gemini", "--allow-dirty", "--cwd", tempRoot], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(geminiProviderSmoke.status === 0, "mocked gemini provider smoke should complete");
  const geminiProviderSmokeSummary = JSON.parse(geminiProviderSmoke.stdout);
  assert(geminiProviderSmokeSummary.purpose === "provider_smoke", "gemini provider smoke should mark purpose");
  assert(geminiProviderSmokeSummary.changed_files.length === 0, "gemini provider smoke should not report file changes");

  const postSmokeReleaseCheck = JSON.parse(run("node", [cliPath, "release-check", "--cwd", tempRoot]).stdout);
  assert(postSmokeReleaseCheck.gates.find((gate) => gate.name === "claude_smoke_evidence")?.ok === true, "release-check should accept explicit claude provider-smoke evidence");
  assert(postSmokeReleaseCheck.gates.find((gate) => gate.name === "codex_smoke_evidence")?.ok === true, "release-check should accept explicit codex provider-smoke evidence");
  assert(postSmokeReleaseCheck.gates.find((gate) => gate.name === "gemini_smoke_evidence")?.ok === true, "release-check should accept explicit gemini provider-smoke evidence");
  const postSmokeList = run("node", [cliPath, "ls", "--cwd", tempRoot]).stdout;
  assert(postSmokeList.includes("Rux provider smoke for claude. Do not edit files."), "ls should keep provider-smoke tasks readable");
  assert(!postSmokeList.includes("\nDo not edit files."), "ls should collapse multi-line task text");

  const suggestResult = run("node", [cliPath, "suggest", "guard", "--cwd", tempRoot]);
  const suggestion = JSON.parse(suggestResult.stdout);
  assert(suggestion.recommendation.runner === "claude", "suggest should choose accepted live claude evidence");
  assert(suggestion.recommendation.model === "claude-sonnet-smoke", "suggest should include model metadata");
  assert(suggestion.recommendation.effort === "high", "suggest should include effort metadata");
  assert(suggestion.recommendation.confidence === "thin_local_evidence", "single accepted run should be thin evidence");
  assert(suggestion.recommendation.maturity.level === "thin", "suggest should expose recommendation maturity");
  assert(suggestion.evidence.maturity.strongest_level === "thin", "suggest evidence maturity should stay thin for one-run groups");
  assert(suggestion.evidence.eligible_runs === 4, "accepted and checked live provider runs should be eligible");
  assert(suggestion.evidence.ignored_reasons.fake_runner >= 1, "suggest should ignore fake runner history");
  assert(suggestion.evidence.ignored_reasons.not_live >= 1, "suggest should ignore imported history");
  assert(suggestion.evidence.ignored_reasons.unlabeled >= 1, "suggest should ignore unlabeled provider runs");
  assert(suggestion.evidence.ignored_reasons.check_modified_files >= 1, "suggest should ignore runs with mutating checks");
  assert(suggestion.evidence.ignored_reasons.provider_smoke >= 3, "suggest should ignore provider-smoke runs");

  const rankResult = run("node", [cliPath, "rank", "--task-kind", "general", "--cwd", tempRoot]);
  const ranking = JSON.parse(rankResult.stdout);
  assert(ranking.evidence.eligible_runs === 4, "rank should use eligible live provider runs for the scope");
  assert(ranking.rankings[0]?.candidates[0]?.runner === "claude", "rank should put accepted claude evidence first");
  assert(ranking.rankings[0]?.candidates[0]?.roster === "solo", "rank should include roster in candidates");
  assert(ranking.rankings[0]?.candidates[0]?.model === "claude-sonnet-smoke", "rank should include model in candidates");
  assert(ranking.rankings[0]?.candidates[0]?.effort === "high", "rank should include effort in candidates");
  assert(ranking.rankings[0]?.candidates[0]?.maturity.level === "thin", "rank should expose candidate maturity");
  assert(ranking.evidence.maturity.strongest_level === "thin", "rank should expose evidence maturity");
  assert(ranking.evidence.ignored_reasons.not_live >= 1, "rank should ignore imported history");
  assert(ranking.evidence.ignored_reasons.fake_runner >= 1, "rank should ignore fake runner history");
  assert(ranking.evidence.ignored_reasons.check_modified_files >= 1, "rank should ignore runs with mutating checks");
  assert(ranking.evidence.ignored_reasons.provider_smoke >= 3, "rank should ignore provider-smoke runs");

  const evidencePlanRun = spawnSync("node", [cliPath, "plan", "guard", "--cwd", tempRoot], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(evidencePlanRun.status === 0, "evidence-backed plan should complete");
  const evidencePlan = JSON.parse(evidencePlanRun.stdout);
  assert(evidencePlan.recommendation.runner === "claude", "plan should reuse accepted live claude evidence");
  assert(evidencePlan.recommendation.model === "claude-sonnet-smoke", "plan should carry evidence-backed model metadata");
  assert(evidencePlan.recommendation.effort === "high", "plan should carry evidence-backed effort metadata");
  assert(evidencePlan.recommendation.roster === "solo", "plan should reuse evidence-backed roster");
  assert(evidencePlan.recommendation.maturity.level === "thin", "plan should expose selected evidence maturity");
  assert(evidencePlan.runner_source === "evidence", "plan should label evidence-backed runner source");
  assert(evidencePlan.command.includes("--model claude-sonnet-smoke"), "plan command should include recommended model metadata");
  assert(evidencePlan.command.includes("--effort high"), "plan command should include recommended effort metadata");

  const overridePlanRun = spawnSync("node", [
    cliPath,
    "plan",
    "build an integration workflow architecture for release",
    "--runner",
    "claude",
    "--roster",
    "plan-code-review",
    "--planner-runner",
    "codex",
    "--reviewer-runner",
    "claude",
    "--cwd",
    tempRoot
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${tempBin}:${process.env.PATH ?? ""}` }
  });
  assert(overridePlanRun.status === 0, "override plan should complete");
  const overridePlan = JSON.parse(overridePlanRun.stdout);
  assert(overridePlan.recommendation.roster === "plan-code-review", "plan should honor explicit roster override");
  assert(overridePlan.runner_by_role.planner === "codex", "plan should honor planner runner override");
  assert(overridePlan.runner_by_role.coder === "claude", "plan should default coder to primary runner");
  assert(overridePlan.runner_by_role.reviewer === "claude", "plan should honor reviewer runner override");
  assert(overridePlan.recommendation.roles.map((role) => role.role).join(",") === "planner,coder,reviewer", "plan should preview fixed chain role order");
  assert(overridePlan.recommendation.one_agent_not_enough.includes("scoping, implementation, and review"), "multi-agent plans should explain why one agent is not enough");

  const doctorResult = run("node", [cliPath, "doctor", "--cwd", tempRoot], repoRoot, {
    PATH: `${tempBin}:${process.env.PATH ?? ""}`
  });
  const doctor = JSON.parse(doctorResult.stdout);
  assert(doctor.node.ok === true, "doctor should accept the current Node runtime");
  assert(doctor.git.inside_work_tree === true, "doctor should detect the temp git repo");
  assert(doctor.runners.find((runner) => runner.name === "claude")?.available === true, "doctor should see mocked claude on PATH");
  assert(doctor.runners.find((runner) => runner.name === "codex")?.available === true, "doctor should see mocked codex on PATH");
  assert(doctor.runners.find((runner) => runner.name === "gemini")?.available === true, "doctor should see mocked gemini on PATH");
  assert(doctor.store.runs >= 1, "doctor should summarize local run records");
  assert(doctor.store.checks >= 1, "doctor should count post-run check records");
  assert(doctor.store.reports >= 1, "doctor should count report records");

  const statusResult = run("node", [cliPath, "status", "--cwd", tempRoot], repoRoot, {
    PATH: `${tempBin}:${process.env.PATH ?? ""}`
  });
  const status = JSON.parse(statusResult.stdout);
  assert(status.ledger.runs >= 1, "status should summarize run records");
  assert(status.policy.exists === true, "status should expose committed policy file");
  assert(status.policy.parallel_provider_cli_runs === false, "status should expose concurrency policy");
  assert(status.outcomes.labels.human_accepted >= 1, "status should count human accepted outcomes");
  assert(status.ledger.checks >= 1, "status should count post-run check records");
  assert(status.ledger.reports >= 1, "status should count report records");
  assert(status.outcomes.labels.checks_passed >= 2, "status should count check-passing outcomes");
  assert(status.outcomes.labels.checks_failed >= 1, "status should count failing check outcomes");
  assert(status.outcomes.labels.provider_smoke_passed >= 3, "status should count provider smoke outcomes");
  assert(status.evidence.eligible_runs === 4, "status should summarize recommendation-eligible evidence");
  assert(status.evidence.maturity.strongest_level === "thin", "status should show thin maturity when no setup has repeated evidence");
  assert(status.evidence.ignored_reasons.check_modified_files >= 1, "status should expose mutating-check evidence as ignored");
  assert(status.evidence.live_provider_task_runs >= 4, "status should count live provider task runs separately from smoke");
  assert(status.evidence.provider_smoke_runs >= 3, "status should count provider-smoke runs separately");
  assert(status.next_capture.needed === false, "status should stop asking for first capture once eligible evidence exists");
  assert(status.next_capture.provider_call_required === false, "evidence-backed status should not ask for a provider call");
  assert(status.next_capture.writes_ledger === false, "evidence-backed status should not ask for a ledger write");
  assert(status.next_capture.human_review_required === false, "evidence-backed status should not ask for review");
  assert(status.provider_smoke.find((item) => item.runner === "codex")?.ok === true, "status should include codex smoke state");
  assert(status.provider_smoke.find((item) => item.runner === "gemini")?.ok === true, "status should include gemini smoke state");
  assert(status.release.blockers.includes("package_private_removed"), "status should include release blockers");
  assert(status.release.blocker_summary.one_time.includes("package_private_removed"), "status should expose one-time release blockers");
  assert(status.release.blocker_summary.permanent.includes("worktree_clean"), "status should expose permanent release blockers");
  assert(status.latest_runs.length > 0, "status should include recent run summaries");
  assert(status.latest_runs.every((item) => item.task_summary && !item.task_summary.includes("\n")), "status latest run summaries should be one-line");
  assert(status.notes.some((note) => note.includes("read-only")), "status should say it is read-only");

  const exportResult = JSON.parse(run("node", [cliPath, "export", "--cwd", tempRoot, "--limit", "3"]).stdout);
  assert(exportResult.scope === "recent_runs", "export should default to recent run scope");
  assert(exportResult.runs.length === 3, "export should honor limit");
  assert(exportResult.counts.truncated === true, "export should report truncation when limit is smaller than history");
  assert(exportResult.runs[0].outcome.label, "exported runs should include outcome summary");
  assert(exportResult.runs[0].routing, "exported runs should include routing summary");
  assert(exportResult.runs[0].replay, "exported runs should include replay metadata");
  assert("status_reason" in exportResult.runs[0], "exported runs should include status reason");
  assert(exportResult.runs[0].adapter, "exported runs should include adapter metadata");
  assert(!("transcript" in exportResult.runs[0]), "export should omit transcript text by default");

  const singleExport = JSON.parse(run("node", [
    cliPath,
    "export",
    "--cwd",
    tempRoot,
    "--run-id",
    summary.id,
    "--include-transcripts"
  ]).stdout);
  assert(singleExport.scope === "single_run", "single export should mark single run scope");
  assert(singleExport.include_transcripts === true, "single export should include transcript flag");
  assert(singleExport.runs.length === 1, "single export should contain one run");
  assert(singleExport.runs[0].id === summary.id, "single export should return requested run");
  assert(singleExport.runs[0].repo.before.head === summary.repo.before.head, "export should include repo snapshot");
  assert(singleExport.runs[0].replay.command === summary.replay.command, "export should preserve replay command");
  assert(singleExport.runs[0].adapter.command === "(built-in)", "export should preserve adapter metadata");
  assert(singleExport.runs[0].transcript.includes("runner: fake"), "single export should include transcript text when requested");
  const pairExport = JSON.parse(run("node", [
    cliPath,
    "export",
    "--cwd",
    tempRoot,
    "--run-id",
    pairSummary.id
  ]).stdout);
  assert(pairExport.runs[0].repo.before.head === pairSummary.repo.before.head, "export should preserve roster parent repo snapshot");
  const codexCheckExport = JSON.parse(run("node", [
    cliPath,
    "export",
    "--cwd",
    tempRoot,
    "--run-id",
    codexSummary.id
  ]).stdout);
  assert(codexCheckExport.runs[0].checks[0]?.source === "post_run_check", "export should preserve post-run check source");
  assert(codexCheckExport.runs[0].checks[0]?.repo?.before?.head === codexSummary.repo.after.head, "export should preserve post-run check repo state");
  assert(Array.isArray(codexCheckExport.runs[0].checks[0]?.changed_files), "export should preserve post-run check changed files");
  assert(!codexCheckExport.runs[0].replay.command.includes("node --version"), "post-run checks should not be folded into replay commands");
  assert(codexCheckExport.runs[0].routing.eligible === true, "export should use post-run checks in routing evaluation");

  const badExport = spawnSync("node", [cliPath, "export", "--cwd", tempRoot, "--limit", "0"], { encoding: "utf8" });
  assert(badExport.status !== 0, "export should reject invalid limit");
  assert(badExport.stderr.includes("--limit must be a positive integer"), "export should explain invalid limit");

  const releaseCheckResult = run("node", [cliPath, "release-check", "--cwd", repoRoot]);
  const releaseCheck = JSON.parse(releaseCheckResult.stdout);
  assert(releaseCheck.ready === true, "release-check should pass for the committed release repo");
  const strictReleaseCheckResult = spawnSync("node", [cliPath, "release-check", "--cwd", repoRoot, "--strict"], { encoding: "utf8" });
  assert(strictReleaseCheckResult.status === 0, "strict release-check should pass for the committed release repo");
  assert(JSON.parse(strictReleaseCheckResult.stdout).ready === true, "strict release-check should still print JSON");
  const nameGate = releaseCheck.gates.find((gate) => gate.name === "name_release_decision");
  assert(nameGate?.ok === true, "release-check should pass once the release name is selected");
  assert(nameGate?.lifecycle === "one_time", "release-check should classify name decision as one-time");
  assert(releaseCheck.blocker_summary.total === 0, "release-check should have no blockers for the committed release repo");
  assert(releaseCheck.gates.find((gate) => gate.name === "package_scope_matches_npm_org")?.ok === true, "release-check should require the moshpits npm org scope");
  assert(releaseCheck.gates.find((gate) => gate.name === "package_private_removed")?.ok === true, "release-check should pass once package privacy is deliberately removed");
  assert(releaseCheck.gates.find((gate) => gate.name === "package_private_removed")?.lifecycle === "one_time", "release-check should mark package privacy as one-time");
  assert(releaseCheck.gates.find((gate) => gate.name === "package_files_allowlist")?.ok === true, "release-check should require scoped package files");
  assert(releaseCheck.gates.find((gate) => gate.name === "policy_file")?.ok === true, "release-check should accept repo policy file");
  assert(releaseCheck.gates.find((gate) => gate.name === "prepublish_release_guard")?.ok === true, "release-check should require npm publish guard");
  assert(releaseCheck.gates.find((gate) => gate.name === "worktree_clean")?.ok === true, "release-check should pass for a clean committed release repo");
  assert(typeof releaseCheck.gates.find((gate) => gate.name === "real_provider_task_evidence")?.ok === "boolean", "release-check should report real provider task evidence gate state");
  assert(typeof releaseCheck.gates.find((gate) => gate.name === "gemini_smoke_evidence")?.ok === "boolean", "release-check should report gemini provider-smoke gate state");
  assert(releaseCheck.gates.find((gate) => gate.name === "no_local_only_language")?.ok === true, "release-check should confirm local-only wording is gone");

  const proposalResult = run("node", [cliPath, "propose", "--cwd", tempRoot]);
  const proposalSummary = JSON.parse(proposalResult.stdout);
  assert(proposalSummary.proposal_path.endsWith(".md"), "propose should write a markdown proposal");
  assert(proposalSummary.release.ready === false, "proposal should include release readiness");
  assert(proposalSummary.release.blocker_summary.by_lifecycle.one_time >= 1, "proposal should include release blocker lifecycle summary");
  assert(proposalSummary.findings.some((finding) => finding.category === "release"), "proposal should include release readiness finding");
  assert(proposalSummary.cited_run_ids.includes(importedSummary.id), "proposal should cite imported history when present");
  assert(proposalSummary.cited_run_ids.includes(geminiSummary.id), "proposal should cite unlabeled provider runs");
  const proposal = await readFile(join(tempRoot, proposalSummary.proposal_path), "utf8");
  assert(proposal.includes("# Rux Proposal"), "proposal should have a clear heading");
  assert(proposal.includes("- Release ready: no"), "proposal markdown should include release readiness");
  assert(proposal.includes("- One-time blockers:"), "proposal markdown should separate one-time blockers");
  assert(proposal.includes("Release-check is not ready."), "proposal markdown should include release blocker finding");
  assert(proposal.includes("This proposal is advisory."), "proposal should state the human-action guardrail");

  const lifecycleRun = JSON.parse(run("node", [
    cliPath,
    "run",
    "exercise lifecycle marks",
    "--runner",
    "fake",
    "--cwd",
    tempRoot
  ]).stdout);
  const acceptedMark = JSON.parse(run("node", [
    cliPath,
    "mark",
    lifecycleRun.id,
    "accepted-downstream",
    "--note",
    "merged after review",
    "--cwd",
    tempRoot
  ]).stdout);
  assert(acceptedMark.mark === "accepted-downstream", "mark should record downstream acceptance");
  const acceptedLifecycleOutcome = JSON.parse(run("node", [cliPath, "outcome", lifecycleRun.id, "--cwd", tempRoot]).stdout);
  assert(acceptedLifecycleOutcome.outcome.label === "accepted_downstream", "outcome should prefer downstream acceptance mark");

  run("node", [
    cliPath,
    "mark",
    lifecycleRun.id,
    "replayed",
    "--note",
    "rerun for comparison",
    "--cwd",
    tempRoot
  ]);
  run("node", [
    cliPath,
    "mark",
    lifecycleRun.id,
    "reverted",
    "--note",
    "rolled back after regression",
    "--cwd",
    tempRoot
  ]);

  const lifecycleShow = JSON.parse(run("node", [cliPath, "show", lifecycleRun.id, "--cwd", tempRoot]).stdout);
  assert(lifecycleShow.marks.length === 3, "show should include lifecycle marks");
  assert(lifecycleShow.evaluation.latest_mark.mark === "reverted", "eval should expose latest lifecycle mark");
  assert(lifecycleShow.evaluation.outcome.label === "reverted_downstream", "reverted mark should override earlier positive signals");
  assert(lifecycleShow.evaluation.outcome.risks.includes("replayed_downstream"), "outcome should retain replayed downstream risk");
  assert(lifecycleShow.evaluation.routing.blockers.includes("reverted_downstream"), "reverted runs should be blocked from routing");

  const lifecycleExport = JSON.parse(run("node", [cliPath, "export", "--cwd", tempRoot, "--run-id", lifecycleRun.id]).stdout);
  assert(lifecycleExport.runs[0].marks.length === 3, "export should include lifecycle marks");
  assert(lifecycleExport.runs[0].outcome.label === "reverted_downstream", "export should include lifecycle-aware outcome");

  const lifecycleStatus = JSON.parse(run("node", [cliPath, "status", "--cwd", tempRoot], repoRoot, {
    PATH: `${tempBin}:${process.env.PATH ?? ""}`
  }).stdout);
  assert(lifecycleStatus.ledger.marks >= 3, "status should count lifecycle marks");
  assert(lifecycleStatus.outcomes.labels.reverted_downstream >= 1, "status should count reverted downstream outcomes");
  const lifecycleDoctor = JSON.parse(run("node", [cliPath, "doctor", "--cwd", tempRoot], repoRoot, {
    PATH: `${tempBin}:${process.env.PATH ?? ""}`
  }).stdout);
  assert(lifecycleDoctor.store.marks >= 3, "doctor should count lifecycle marks");
  const lifecycleList = run("node", [cliPath, "ls", "--cwd", tempRoot]).stdout;
  assert(lifecycleList.includes("mark=reverted  exercise lifecycle marks"), "ls should show the latest lifecycle mark");

  console.log("smoke ok");
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

function run(command, args, cwd = repoRoot, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv }
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        `exit: ${result.status}`,
        result.stdout,
        result.stderr
      ].join("\n")
    );
  }

  return result;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function installMockClaude(binDir) {
  await mkdir(binDir, { recursive: true });
  const mockPath = join(binDir, "claude");
  await writeFile(
    mockPath,
    [
      "#!/bin/sh",
      "printf 'mock claude received:'",
      "for arg in \"$@\"; do printf ' [%s]' \"$arg\"; done",
      "printf '\\n'",
      ""
    ].join("\n"),
    "utf8"
  );
  await chmod(mockPath, 0o755);
}

async function installMockCodex(binDir) {
  await mkdir(binDir, { recursive: true });
  const mockPath = join(binDir, "codex");
  await writeFile(
    mockPath,
    [
      "#!/bin/sh",
      "printf 'mock codex diagnostic\\n' >&2",
      "printf 'mock codex received:'",
      "for arg in \"$@\"; do printf ' [%s]' \"$arg\"; done",
      "printf '\\n'",
      ""
    ].join("\n"),
    "utf8"
  );
  await chmod(mockPath, 0o755);
}

async function installMockGemini(binDir) {
  await mkdir(binDir, { recursive: true });
  const mockPath = join(binDir, "gemini");
  await writeFile(
    mockPath,
    [
      "#!/bin/sh",
      "case \" $* \" in",
      "  *\"plan mode edits\"*)",
      "    printf 'I changed a file even though the adapter requested plan mode.\\n'",
      "    printf 'changed\\n' > plan-mode-edited.txt",
      "    exit 0",
      "    ;;",
      "  *\"needs provider approval\"*)",
      "    printf 'I found a scoped implementation approach.\\n'",
      "    printf 'Do you agree with this approach? If so, I will draft the implementation plan.\\n'",
      "    exit 0",
      "    ;;",
      "  *\"soft provider approval\"*)",
      "    printf 'Does this targeted standardization approach align with your expectations?\\n'",
      "    printf 'Let me know and I will write up the formal plan.\\n'",
      "    exit 0",
      "    ;;",
      "esac",
      "printf 'mock gemini received:'",
      "for arg in \"$@\"; do printf ' [%s]' \"$arg\"; done",
      "printf '\\n'",
      ""
    ].join("\n"),
    "utf8"
  );
  await chmod(mockPath, 0o755);
}
