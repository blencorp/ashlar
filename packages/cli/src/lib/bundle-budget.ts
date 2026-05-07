import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { readVerifiedCapsuleManifest } from "./capsule.js";
import { getComponent, listComponents, type RegistryComponent } from "./registry.js";

export type BundleBudgetComponentReport = {
  bundleBudget?: {
    cssGzipBytes?: number;
    jsGzipBytes?: number;
  };
  cssGzipBytes: number;
  cssFiles: string[];
  cssRawBytes: number;
  gzipBytes: number;
  jsFiles: string[];
  jsGzipBytes: number;
  jsRawBytes: number;
  layer: string;
  name: string;
  rawBytes: number;
  stability: string;
  version: string;
};

export type BundleBudgetReport = {
  components: BundleBudgetComponentReport[];
  generatedAt: string;
  status: "pass" | "fail";
  summary: {
    componentCount: number;
    cssGzipBytes: number;
    cssFiles: number;
    cssRawBytes: number;
    gzipBytes: number;
    maxCssGzipBytes: number;
    maxJsGzipBytes: number | null;
    jsGzipBytes: number;
    jsFiles: number;
    jsRawBytes: number;
    rawBytes: number;
  };
};

export function checkBundleBudget(input: {
  components: string[];
  cwd: string;
  maxCssGzipBytes?: number | null;
  maxJsGzipBytes?: number | null;
  registryPath: string;
}): BundleBudgetReport {
  const components =
    input.components.length > 0
      ? input.components.map((name) => getComponent(input.cwd, name, input.registryPath))
      : listComponents(input.cwd, input.registryPath)
          .filter((component) => component.layer === "L0")
          .map((component) => getComponent(input.cwd, component.name, input.registryPath));
  const reports = components.map((component) => componentBundleReport(component));
  const css = combinedAssetSummary(components, reports, "cssFiles");
  const js = combinedAssetSummary(components, reports, "jsFiles");
  const rawBytes = css.rawBytes + js.rawBytes;
  const gzipBytes = css.gzipBytes + js.gzipBytes;
  const maxCssGzipBytes =
    input.maxCssGzipBytes ?? manifestBundleBudget(reports, "cssGzipBytes", "CSS");
  const maxJsGzipBytes =
    input.maxJsGzipBytes === undefined
      ? optionalManifestBundleBudget(reports, "jsGzipBytes")
      : input.maxJsGzipBytes;
  const cssPass = css.gzipBytes <= maxCssGzipBytes;
  const jsPass = maxJsGzipBytes === null || js.gzipBytes <= maxJsGzipBytes;

  return {
    generatedAt: new Date().toISOString(),
    status: cssPass && jsPass ? "pass" : "fail",
    summary: {
      componentCount: reports.length,
      cssFiles: reports.reduce((total, report) => total + report.cssFiles.length, 0),
      cssRawBytes: css.rawBytes,
      cssGzipBytes: css.gzipBytes,
      jsFiles: reports.reduce((total, report) => total + report.jsFiles.length, 0),
      jsRawBytes: js.rawBytes,
      jsGzipBytes: js.gzipBytes,
      rawBytes,
      gzipBytes,
      maxCssGzipBytes,
      maxJsGzipBytes,
    },
    components: reports,
  };
}

function componentBundleReport(component: RegistryComponent): BundleBudgetComponentReport {
  const manifest = readVerifiedCapsuleManifest({
    directory: component.directory,
    name: component.name,
    version: component.version,
    layer: component.layer,
    stability: component.stability,
    registryCapsuleHash: component.capsuleHash,
    trustRoot: component.trustRoot,
  });
  const cssFiles = Object.keys(manifest.files)
    .filter((file) => file.endsWith(".css"))
    .sort();
  const jsFiles = Object.keys(manifest.files)
    .filter((file) => [".js", ".mjs", ".cjs"].some((extension) => file.endsWith(extension)))
    .sort();
  const css = componentAssetSummary(component, cssFiles);
  const js = componentAssetSummary(component, jsFiles);

  return {
    name: component.name,
    version: component.version,
    layer: component.layer,
    stability: component.stability,
    bundleBudget: manifest.bundleBudget,
    cssFiles,
    cssRawBytes: css.rawBytes,
    cssGzipBytes: css.gzipBytes,
    jsFiles,
    jsRawBytes: js.rawBytes,
    jsGzipBytes: js.gzipBytes,
    rawBytes: css.rawBytes + js.rawBytes,
    gzipBytes: css.gzipBytes + js.gzipBytes,
  };
}

function manifestBundleBudget(
  reports: BundleBudgetComponentReport[],
  key: "cssGzipBytes" | "jsGzipBytes",
  label: string,
): number {
  const missing = reports.filter((report) => report.bundleBudget?.[key] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `Bundle budget requires --max-${label.toLowerCase()}-gzip or manifest bundleBudget.${key} for: ${missing
        .map((report) => report.name)
        .join(", ")}`,
    );
  }

  return reports.reduce((total, report) => total + (report.bundleBudget?.[key] ?? 0), 0);
}

function optionalManifestBundleBudget(
  reports: BundleBudgetComponentReport[],
  key: "jsGzipBytes",
): number | null {
  return reports.every((report) => report.bundleBudget?.[key] !== undefined)
    ? reports.reduce((total, report) => total + (report.bundleBudget?.[key] ?? 0), 0)
    : null;
}

function componentAssetSummary(
  component: RegistryComponent,
  files: string[],
): { gzipBytes: number; rawBytes: number } {
  const text = files
    .map((file) => readFileSync(join(component.directory, file), "utf8"))
    .join("\n");

  return {
    rawBytes: Buffer.byteLength(text, "utf8"),
    gzipBytes: text.length > 0 ? gzipSync(Buffer.from(text)).length : 0,
  };
}

function combinedAssetSummary(
  components: RegistryComponent[],
  reports: BundleBudgetComponentReport[],
  key: "cssFiles" | "jsFiles",
): { gzipBytes: number; rawBytes: number } {
  const text = reports
    .flatMap((report) =>
      report[key].map((file) =>
        readFileSync(join(componentByName(components, report.name).directory, file), "utf8"),
      ),
    )
    .join("\n");

  return {
    rawBytes: Buffer.byteLength(text, "utf8"),
    gzipBytes: text.length > 0 ? gzipSync(Buffer.from(text)).length : 0,
  };
}

function componentByName(components: RegistryComponent[], name: string): RegistryComponent {
  const component = components.find((item) => item.name === name);
  if (!component) {
    throw new Error(`Component missing from bundle report: ${name}`);
  }

  return component;
}
