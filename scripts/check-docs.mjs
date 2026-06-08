#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const failures = [];

const requiredFiles = [
  "README.md",
  "AGENTS.md",
  "docs/VISION.md",
  "docs/STATE.md",
  "docs/ARCHITECTURE.md",
  "docs/V0_PLAN.md",
  "docs/STANDARDS.md",
  "docs/DECISIONS.md"
];

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) {
    failures.push(`Missing required doc: ${file}`);
  }
}

const packageJson = readJson("package.json");
const readme = readText("README.md");
const agents = readText("AGENTS.md");
const state = readText("docs/STATE.md");
const vision = readText("docs/VISION.md");
const standards = readText("docs/STANDARDS.md");
const decisions = readText("docs/DECISIONS.md");
const currentDocs = {
  "README.md": readme,
  "docs/STATE.md": state,
  "docs/VISION.md": vision,
  "docs/ARCHITECTURE.md": readText("docs/ARCHITECTURE.md"),
  "docs/V0_PLAN.md": readText("docs/V0_PLAN.md"),
  "docs/STANDARDS.md": standards,
  "docs/DECISIONS.md": decisions
};

mustInclude("README.md", readme, "Rux is an open-source, test-first run ledger");
mustInclude("README.md", readme, "It is not a model gateway");
mustInclude("README.md", readme, "[Vision](docs/VISION.md)");
mustInclude("README.md", readme, "[Standards](docs/STANDARDS.md)");
mustInclude("AGENTS.md", agents, "`docs/VISION.md` tells us the product arc and guardrails.");
mustInclude("AGENTS.md", agents, "`docs/DECISIONS.md` records sticky decisions.");
mustInclude("docs/STATE.md", state, "Swami-lite docs system");
mustInclude("docs/VISION.md", vision, "The frontier is not starting agents.");
mustInclude("docs/VISION.md", vision, "Rux exists to become the memory and decision layer");
mustInclude("docs/VISION.md", vision, "Capture before routing.");
mustInclude("docs/VISION.md", vision, "Beyond Coding");
mustInclude("docs/STANDARDS.md", standards, "weekly patch train");
mustInclude("docs/DECISIONS.md", decisions, "RUX-001: Capture Before Routing");
mustInclude("docs/DECISIONS.md", decisions, "RUX-006: Swami-Lite Docs");

const scripts = packageJson.scripts ?? {};
if (!scripts["check:docs"] || !scripts["check:docs"].includes("scripts/check-docs.mjs")) {
  failures.push("package.json must define check:docs using scripts/check-docs.mjs");
}
if (!scripts["release:verify"] || !scripts["release:verify"].includes("npm run check:docs")) {
  failures.push("release:verify must include npm run check:docs");
}

for (const [file, text] of Object.entries(currentDocs)) {
  forbid(file, text, /^# Agent Plane\b/m, "old Agent Plane document title");
  forbid(file, text, /\bRux is (a )?local-only\b/i, "local-only product framing");
  forbid(file, text, /\bRux is an? AI (coding )?gateway\b/i, "AI gateway product framing");
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`docs check failed: ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log("docs ok");
}

function readText(path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return "";
  return readFileSync(fullPath, "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function mustInclude(file, text, needle) {
  if (!text.includes(needle)) {
    failures.push(`${file} must include: ${needle}`);
  }
}

function forbid(file, text, pattern, label) {
  if (pattern.test(text)) {
    failures.push(`${file} contains forbidden ${label}`);
  }
}
