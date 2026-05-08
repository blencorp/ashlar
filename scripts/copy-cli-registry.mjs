#!/usr/bin/env node
import { cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const source = resolve(repoRoot, "registry");
const destination = resolve(repoRoot, "packages", "cli", "dist", "registry");

if (!existsSync(resolve(source, "index.json"))) {
  throw new Error(`Registry index not found at ${source}`);
}

rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, { recursive: true });
