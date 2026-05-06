import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkReleaseProvenanceReadiness } from "./release-provenance.js";

let scratch: string;

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeValidFixture() {
  const packages = new Map([
    ["packages/schemas", "@ashlar/schemas"],
    ["packages/cli", "@ashlar/cli"],
    ["packages/ashlar", "ashlar"],
  ]);

  for (const [directory, name] of packages) {
    mkdirSync(join(scratch, directory), { recursive: true });
    writeJson(join(scratch, directory, "package.json"), {
      name,
      version: "0.0.0",
      type: "module",
      publishConfig: {
        access: "public",
        provenance: true,
      },
      repository: {
        type: "git",
        url: "https://github.com/blencorp/ashlar.git",
        directory,
      },
    });
  }

  mkdirSync(join(scratch, ".github", "workflows"), { recursive: true });
  writeFileSync(
    join(scratch, ".github", "workflows", "ci.yml"),
    [
      "name: CI",
      "permissions:",
      "  contents: read",
      "  id-token: write",
      "jobs:",
      "  checks:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - run: node packages/cli/dist/index.js release provenance-check",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(scratch, ".github", "workflows", "publish.yml"),
    [
      "name: Publish",
      "on:",
      "  workflow_dispatch:",
      "permissions:",
      "  contents: read",
      "  id-token: write",
      "jobs:",
      "  npm:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/setup-node@v6",
      "        with:",
      "          registry-url: https://registry.npmjs.org",
      "          package-manager-cache: false",
      "      - run: node packages/cli/dist/index.js release provenance-check",
      "      - run: pnpm release",
      "        env:",
      '          NPM_CONFIG_PROVENANCE: "true"',
      "      - run: node packages/cli/dist/index.js release provenance-verify-public",
      "      - run: mkdir -p reports && node packages/cli/dist/index.js release provenance-verify-public --json > reports/ashlar-npm-provenance.json",
      "",
    ].join("\n"),
  );
}

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "ashlar-release-provenance-test-"));
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("checkReleaseProvenanceReadiness", () => {
  it("passes when release package manifests and CI can support npm provenance", () => {
    writeValidFixture();

    const result = checkReleaseProvenanceReadiness(scratch);

    expect(result.errors).toEqual([]);
    expect(result.packages).toEqual([
      { directory: "packages/schemas", name: "@ashlar/schemas", version: "0.0.0" },
      { directory: "packages/cli", name: "@ashlar/cli", version: "0.0.0" },
      { directory: "packages/ashlar", name: "ashlar", version: "0.0.0" },
    ]);
  });

  it("reports package and CI gaps that would block npm provenance", () => {
    writeValidFixture();
    writeJson(join(scratch, "packages", "cli", "package.json"), {
      name: "@ashlar/cli",
      private: true,
      publishConfig: {
        access: "restricted",
        provenance: false,
      },
      repository: {
        type: "git",
        url: "https://github.com/blencorp/ashlar-fork.git",
        directory: "packages/wrong",
      },
    });
    writeFileSync(
      join(scratch, ".github", "workflows", "ci.yml"),
      ["name: CI", "permissions:", "  contents: read", ""].join("\n"),
    );
    writeFileSync(
      join(scratch, ".github", "workflows", "publish.yml"),
      [
        "name: Publish",
        "permissions:",
        "  contents: write",
        "jobs:",
        "  npm:",
        "    runs-on: self-hosted",
        "    steps:",
        "      - run: pnpm release",
        "        env:",
        "          NPM_TOKEN: $" + "{{ secrets.NPM_TOKEN }}",
        "",
      ].join("\n"),
    );

    const result = checkReleaseProvenanceReadiness(scratch);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        "packages/cli/package.json: package must not be private",
        'packages/cli/package.json: publishConfig.access must be "public"',
        "packages/cli/package.json: publishConfig.provenance must be true",
        "packages/cli/package.json: repository.url must be https://github.com/blencorp/ashlar.git",
        "packages/cli/package.json: repository.directory must be packages/cli",
        ".github/workflows/ci.yml: permissions.id-token must be write",
        ".github/workflows/ci.yml: must run ashlar release provenance-check in CI",
        ".github/workflows/publish.yml: must be manually dispatchable for controlled releases",
        ".github/workflows/publish.yml: permissions.id-token must be write",
        ".github/workflows/publish.yml: permissions.contents should be read",
        ".github/workflows/publish.yml: publish job must run on a GitHub-hosted runner",
        ".github/workflows/publish.yml: actions/setup-node must target registry.npmjs.org",
        ".github/workflows/publish.yml: release builds must disable package-manager cache",
        ".github/workflows/publish.yml: must run ashlar release provenance-check before publish",
        ".github/workflows/publish.yml: must verify public npm provenance after publish",
        ".github/workflows/publish.yml: must write public npm provenance JSON after publish",
        ".github/workflows/publish.yml: must force NPM_CONFIG_PROVENANCE=true",
        ".github/workflows/publish.yml: must not use long-lived npm tokens for trusted publishing",
      ]),
    );
  });
});
