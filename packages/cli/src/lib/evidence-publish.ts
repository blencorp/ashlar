import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import {
  buildCapsuleManifest,
  readVerifiedCapsuleManifest,
  signCapsuleManifest,
  verifyCapsuleSignature,
} from "./capsule.js";
import { checkEvidence } from "./evidence-check.js";
import {
  getComponent,
  readRegistryIndex,
  resolveRegistryRoot,
  type EvidencePacket,
} from "./registry.js";
import { sha256File } from "./hash.js";
import { describeErrors, validate } from "./schema-validate.js";

type PublishEvidenceInput = {
  component: string;
  cwd: string;
  evidencePath: string;
  keyId: string;
  registryPath: string;
  signingKeyPath: string;
};

export type PublishEvidenceResult = {
  accessibilityStatus: string;
  capsuleManifest: string;
  component: string;
  version: string;
  evidenceFile: string;
  evidenceReferences: Array<{
    reference: string;
    sha256: string;
    source: string;
    target: string;
  }>;
  capsuleHash: string;
  previousCapsuleHash: string;
  registryIndex: string;
  registryPath: string;
  signatureKeyId: string;
  sourceEvidence: string;
  stability: string;
  tool: "ashlar evidence publish";
};

function readEvidencePacket(path: string): EvidencePacket {
  const evidence = JSON.parse(readFileSync(path, "utf8")) as EvidencePacket;
  const result = validate("evidence", evidence);
  if (!result.ok) {
    throw new Error(`Invalid Ashlar evidence packet at ${path}:\n${describeErrors(result)}`);
  }

  return evidence;
}

function isExternalReference(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function parsedReferenceToken(token: string):
  | {
      fragment: string;
      path: string;
      trailing: string;
    }
  | undefined {
  const withoutTrailing = token.replace(/[),.;]+$/g, "");
  const trailing = token.slice(withoutTrailing.length);
  const [path = "", ...fragmentParts] = withoutTrailing.split("#");
  if (path.length === 0 || isExternalReference(path)) {
    return undefined;
  }

  return {
    fragment: fragmentParts.length > 0 ? `#${fragmentParts.join("#")}` : "",
    path,
    trailing,
  };
}

function localReferencePaths(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .trim()
    .split(/\s+/)
    .flatMap((token) => {
      const parsed = parsedReferenceToken(token);
      return parsed ? [parsed.path] : [];
    });
}

function capsuleEvidenceReferencePath(referencePath: string): string {
  const normalized = isAbsolute(referencePath)
    ? basename(referencePath)
    : referencePath.split(/[\\/]+/).join("/");
  const parts = normalized.split("/");
  if (parts.includes("..") || parts.some((part) => part.length === 0)) {
    throw new Error(`Evidence reference path must stay inside the capsule: ${referencePath}`);
  }

  return normalized.startsWith("evidence/") ? normalized : `evidence/${normalized}`;
}

function evidenceReferencePaths(evidence: EvidencePacket): string[] {
  const paths = new Set<string>();
  for (const item of evidence.wcag ?? []) {
    for (const path of localReferencePaths(item.evidence)) {
      paths.add(path);
    }
  }
  for (const item of evidence.baselineTests ?? []) {
    for (const path of localReferencePaths(item.evidence)) {
      paths.add(path);
    }
  }
  for (const item of evidence.manualTests ?? []) {
    if (typeof item.evidence !== "string") {
      continue;
    }
    for (const path of localReferencePaths(item.evidence)) {
      paths.add(path);
    }
  }

  return Array.from(paths).sort();
}

function rewriteEvidenceReferenceValue(value: unknown, rewrites: Map<string, string>): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .trim()
    .split(/\s+/)
    .map((token) => {
      const parsed = parsedReferenceToken(token);
      if (!parsed) {
        return token;
      }

      const rewrite = rewrites.get(parsed.path);
      return rewrite ? `${rewrite}${parsed.fragment}${parsed.trailing}` : token;
    })
    .join(" ");
}

function evidenceWithCapsuleReferences(
  evidence: EvidencePacket,
  rewrites: Map<string, string>,
): EvidencePacket {
  const next = JSON.parse(JSON.stringify(evidence)) as EvidencePacket;
  for (const item of next.wcag ?? []) {
    item.evidence = rewriteEvidenceReferenceValue(item.evidence, rewrites) as string | undefined;
  }
  for (const item of next.baselineTests ?? []) {
    item.evidence = rewriteEvidenceReferenceValue(item.evidence, rewrites) as string | undefined;
  }
  for (const item of next.manualTests ?? []) {
    item.evidence = rewriteEvidenceReferenceValue(item.evidence, rewrites);
  }

  return next;
}

export function publishEvidence(input: PublishEvidenceInput): PublishEvidenceResult {
  const detail = getComponent(input.cwd, input.component, input.registryPath);
  if (!detail.trustRoot) {
    throw new Error("A registry trust root is required before publishing signed evidence.");
  }
  if (!detail.trustRoot.keys.some((key) => key.keyId === input.keyId)) {
    throw new Error(`Signing key id is not trusted by registry trust root: ${input.keyId}`);
  }

  const evidencePath = resolve(input.cwd, input.evidencePath);
  const evidence = readEvidencePacket(evidencePath);
  if (evidence.component !== detail.name) {
    throw new Error(`Evidence component is ${evidence.component}, expected ${detail.name}.`);
  }
  if (evidence.version !== detail.version) {
    throw new Error(`Evidence version is ${evidence.version}, expected ${detail.version}.`);
  }
  if (evidence.stability !== "stable" || evidence.accessibilityStatus !== "stable-evidence") {
    throw new Error("Only graduated stable-evidence packets can be published to the registry.");
  }

  const currentManifest = readVerifiedCapsuleManifest({
    directory: detail.directory,
    name: detail.name,
    version: detail.version,
    layer: detail.layer,
    stability: detail.stability,
    registryCapsuleHash: detail.capsuleHash,
    trustRoot: detail.trustRoot,
  });

  const result = checkEvidence([{ ...detail, evidence }], { evidenceRoot: input.cwd });
  const errors = result.findings.filter((finding) => finding.level === "error");
  if (errors.length > 0) {
    throw new Error(
      `Evidence packet is not ready for registry publication:\n${errors
        .map((finding) => `  ${finding.rule}: ${finding.message}`)
        .join("\n")}`,
    );
  }

  const rewrites = new Map<string, string>();
  const copyOperations = evidenceReferencePaths(evidence).map((referencePath) => {
    const sourceFromCwd = isAbsolute(referencePath)
      ? referencePath
      : resolve(input.cwd, referencePath);
    const source = existsSync(sourceFromCwd)
      ? sourceFromCwd
      : resolve(detail.directory, referencePath);
    if (!existsSync(source)) {
      throw new Error(`Evidence reference file not found: ${referencePath}`);
    }

    const target = capsuleEvidenceReferencePath(referencePath);
    rewrites.set(referencePath, target);
    return {
      reference: target,
      source,
      target: join(detail.directory, ...target.split("/")),
    };
  });
  for (const operation of copyOperations) {
    if (!existsSync(operation.target) || resolve(operation.source) === resolve(operation.target)) {
      continue;
    }
    if (!readFileSync(operation.source).equals(readFileSync(operation.target))) {
      throw new Error(
        `Evidence reference target already exists with different content: ${operation.reference}`,
      );
    }
  }
  const publishedEvidence = evidenceWithCapsuleReferences(evidence, rewrites);
  const plannedReferences = new Set(copyOperations.map((operation) => operation.reference));
  const missingPublishedReferences = evidenceReferencePaths(publishedEvidence).filter(
    (referencePath) =>
      !plannedReferences.has(referencePath) &&
      !existsSync(join(detail.directory, ...referencePath.split("/"))),
  );
  if (missingPublishedReferences.length > 0) {
    throw new Error(
      `Published evidence packet is not ready for registry publication:\n${missingPublishedReferences
        .map((reference) => `  evidence/stable-evidence-references: ${reference}`)
        .join("\n")}`,
    );
  }

  const evidenceText = `${JSON.stringify(publishedEvidence, null, 2)}\n`;
  const fileTextOverrides: Record<string, string> = {
    [`${detail.name}.evidence.json`]: evidenceText,
  };
  for (const operation of copyOperations) {
    fileTextOverrides[operation.reference] = readFileSync(operation.source, "utf8");
  }
  const manifest = buildCapsuleManifest({
    directory: detail.directory,
    name: detail.name,
    version: detail.version,
    layer: detail.layer,
    stability: evidence.stability,
    codemods: currentManifest.codemods,
    bundleBudget: currentManifest.bundleBudget,
    fileTextOverrides,
  });
  const signedManifest = signCapsuleManifest({
    manifest,
    keyId: input.keyId,
    privateKey: readFileSync(resolve(input.cwd, input.signingKeyPath)),
  });
  const signatureErrors = verifyCapsuleSignature(signedManifest, detail.trustRoot);
  if (signatureErrors.length > 0) {
    throw new Error(
      `Generated capsule signature could not be verified:\n${signatureErrors
        .map((error) => `  - ${error}`)
        .join("\n")}`,
    );
  }

  const manifestValidation = validate("capsule", signedManifest);
  if (!manifestValidation.ok) {
    throw new Error(
      `Generated capsule manifest is invalid:\n${describeErrors(manifestValidation)}`,
    );
  }

  const registryRoot = resolveRegistryRoot(input.cwd, input.registryPath);
  const index = readRegistryIndex(input.cwd, input.registryPath);
  const indexComponent = index.components[detail.name];
  if (!indexComponent) {
    throw new Error(`Registry index is missing component: ${detail.name}`);
  }
  indexComponent.stability = evidence.stability;
  indexComponent.capsuleHashes[detail.version] = signedManifest.capsule_hash;

  for (const operation of copyOperations) {
    if (resolve(operation.source) === resolve(operation.target)) {
      continue;
    }
    mkdirSync(dirname(operation.target), { recursive: true });
    copyFileSync(operation.source, operation.target);
  }
  writeFileSync(join(detail.directory, `${detail.name}.evidence.json`), evidenceText);
  writeFileSync(
    join(detail.directory, `${detail.name}.capsule.json`),
    `${JSON.stringify(signedManifest, null, 2)}\n`,
  );
  writeFileSync(join(registryRoot, "index.json"), `${JSON.stringify(index, null, 2)}\n`);

  return {
    accessibilityStatus: publishedEvidence.accessibilityStatus,
    capsuleManifest: join(detail.directory, `${detail.name}.capsule.json`),
    component: detail.name,
    version: detail.version,
    evidenceFile: join(detail.directory, `${detail.name}.evidence.json`),
    evidenceReferences: copyOperations.map((operation) => ({
      reference: operation.reference,
      sha256: sha256File(operation.target),
      source: operation.source,
      target: operation.target,
    })),
    capsuleHash: signedManifest.capsule_hash,
    previousCapsuleHash: currentManifest.capsule_hash,
    registryIndex: join(registryRoot, "index.json"),
    registryPath: input.registryPath,
    signatureKeyId: input.keyId,
    sourceEvidence: evidencePath,
    stability: publishedEvidence.stability,
    tool: "ashlar evidence publish",
  };
}
