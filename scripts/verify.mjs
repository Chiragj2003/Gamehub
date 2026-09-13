#!/usr/bin/env node
/**
 * Full pre-push verification, replicating what Vercel does:
 *   - no .env.local (Vercel Preview may have no env vars at all)
 *   - fresh .next
 *   - typecheck, lint, production build
 *
 * Usage: npm run verify
 */
import { spawnSync } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";

const ENV = ".env.local";
const HIDDEN = ".env.local.verify-hidden";

const run = (label, cmd, args) => {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) {
    console.error(`\n✖ ${label} failed (exit ${r.status})`);
    return false;
  }
  return true;
};

let hid = false;
if (existsSync(ENV)) {
  renameSync(ENV, HIDDEN);
  hid = true;
}
rmSync(".next", { recursive: true, force: true });

let ok = true;
try {
  ok = run("Typecheck", "npx", ["tsc", "--noEmit"]) && ok;
  ok = run("Lint", "npx", ["eslint", "app", "components", "lib", "scripts", "--max-warnings=0"]) && ok;
  ok = ok && run("Build (no env, clean .next)", "npx", ["next", "build"]);
} finally {
  if (hid) renameSync(HIDDEN, ENV);
}

console.log(ok ? "\n✔ All checks passed — safe to push." : "\n✖ Verification failed — do not push.");
process.exit(ok ? 0 : 1);
