import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  capsuleSignaturePayload,
  readVerifiedCapsuleManifest,
  verifyCapsuleSignature,
  type CapsuleManifest,
  type CapsuleSigstoreBundle,
  type CapsuleTrustRoot,
} from "./capsule.js";
import { sha256File, sha256Text } from "./hash.js";
import { writeJson } from "./project.js";
import { getComponent, listComponents, type RegistryComponent } from "./registry.js";
import { describeErrors, validate } from "./schema-validate.js";

export type SignCapsulesInput = {
  certificateIdentity?: string;
  certificateOidcIssuer?: string;
  components?: string[];
  cosignPath?: string;
  cwd: string;
  registryPath: string;
};

export type SignedCapsuleResult = {
  bundle: string;
  bundleHash: string;
  component: string;
  signedPayloadHash: string;
  version: string;
};

export type SignCapsulesResult = {
  capsules: SignedCapsuleResult[];
};

function trustedSigstorePolicy(trustRoot: CapsuleTrustRoot | undefined): {
  certificateIdentity: string;
  certificateOidcIssuer: string;
} {
  if (!trustRoot?.sigstore) {
    throw new Error("Registry trust root must include a Sigstore trust policy.");
  }
  const [certificateIdentity] = trustRoot.sigstore.certificateIdentities;
  const [certificateOidcIssuer] = trustRoot.sigstore.certificateOidcIssuers;
  if (!certificateIdentity || !certificateOidcIssuer) {
    throw new Error("Registry Sigstore trust policy must include at least one identity and issuer.");
  }

  return { certificateIdentity, certificateOidcIssuer };
}

function runCosign(args: string[], cwd: string, cosignPath: string): void {
  const result = spawnSync(cosignPath, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    throw new Error(`cosign could not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    throw new Error(`cosign ${args[0]} failed${output ? `:\n${output}` : ""}`);
  }
}

function sigstoreBundleMetadata(input: {
  bundle: string;
  bundleHash: string;
  certificateIdentity: string;
  certificateOidcIssuer: string;
  manifest: CapsuleManifest;
}): CapsuleSigstoreBundle {
  return {
    bundle: input.bundle,
    bundleHash: input.bundleHash,
    signedPayloadHash: sha256Text(capsuleSignaturePayload(input.manifest)),
    certificateIdentity: input.certificateIdentity,
    certificateOidcIssuer: input.certificateOidcIssuer,
  };
}

function assertValidSignedManifest(manifest: CapsuleManifest, trustRoot: CapsuleTrustRoot): void {
  const result = validate("capsule", manifest);
  if (!result.ok) {
    throw new Error(`Generated capsule manifest is invalid:\n${describeErrors(result)}`);
  }
  const signatureErrors = verifyCapsuleSignature(manifest, trustRoot, {
    directory: undefined,
  });
  const nonBundleErrors = signatureErrors.filter(
    (error) => !error.includes("capsule directory is required"),
  );
  if (nonBundleErrors.length > 0) {
    throw new Error(
      `Generated capsule Sigstore metadata is invalid:\n${nonBundleErrors
        .map((error) => `  - ${error}`)
        .join("\n")}`,
    );
  }
}

function selectedComponents(input: SignCapsulesInput): RegistryComponent[] {
  if (!input.components || input.components.length === 0) {
    return listComponents(input.cwd, input.registryPath).map((component) =>
      getComponent(input.cwd, component.name, input.registryPath),
    );
  }

  return input.components.map((component) => getComponent(input.cwd, component, input.registryPath));
}

function signComponent(input: {
  certificateIdentity: string;
  certificateOidcIssuer: string;
  component: RegistryComponent;
  cosignPath: string;
  cwd: string;
}): SignedCapsuleResult {
  const manifest = readVerifiedCapsuleManifest({
    directory: input.component.directory,
    name: input.component.name,
    version: input.component.version,
    layer: input.component.layer,
    stability: input.component.stability,
    registryCapsuleHash: input.component.capsuleHash,
    trustRoot: input.component.trustRoot,
    cosignPath: input.cosignPath,
  });
  if (!input.component.trustRoot) {
    throw new Error(`Registry trust root is required to sign ${input.component.name}.`);
  }

  const scratch = mkdtempSync(join(tmpdir(), "ashlar-sign-capsule-"));
  const payloadPath = join(scratch, `${input.component.name}.payload.json`);
  const tempBundlePath = join(scratch, `${input.component.name}.sigstore.json`);
  const bundle = `${input.component.name}.sigstore.json`;
  const finalBundlePath = join(input.component.directory, bundle);
  const manifestPath = join(input.component.directory, `${input.component.name}.capsule.json`);
  const previousManifest = readFileSync(manifestPath, "utf8");
  const hadBundle = existsSync(finalBundlePath);
  const previousBundle = hadBundle ? readFileSync(finalBundlePath) : undefined;

  try {
    const payload = capsuleSignaturePayload(manifest);
    writeFileSync(payloadPath, payload);
    runCosign(["sign-blob", "--yes", "--bundle", tempBundlePath, payloadPath], input.cwd, input.cosignPath);
    copyFileSync(tempBundlePath, finalBundlePath);

    const sigstore = sigstoreBundleMetadata({
      bundle,
      bundleHash: sha256File(finalBundlePath),
      certificateIdentity: input.certificateIdentity,
      certificateOidcIssuer: input.certificateOidcIssuer,
      manifest,
    });
    const signedManifest: CapsuleManifest = {
      ...manifest,
      sigstore,
    };

    assertValidSignedManifest(signedManifest, input.component.trustRoot);
    const verificationErrors = verifyCapsuleSignature(signedManifest, input.component.trustRoot, {
      cosignPath: input.cosignPath,
      directory: input.component.directory,
    });
    if (verificationErrors.length > 0) {
      throw new Error(
        `Generated capsule Sigstore bundle could not be verified:\n${verificationErrors
          .map((error) => `  - ${error}`)
          .join("\n")}`,
      );
    }

    writeJson(manifestPath, signedManifest);

    return {
      bundle,
      bundleHash: sigstore.bundleHash,
      component: input.component.name,
      signedPayloadHash: sigstore.signedPayloadHash,
      version: input.component.version,
    };
  } catch (error) {
    writeJson(manifestPath, JSON.parse(previousManifest));
    if (hadBundle && previousBundle) {
      writeFileSync(finalBundlePath, previousBundle);
    } else if (existsSync(finalBundlePath)) {
      unlinkSync(finalBundlePath);
    }
    throw error;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

export function signCapsuleBundles(input: SignCapsulesInput): SignCapsulesResult {
  const cosignPath = input.cosignPath ?? "cosign";
  const components = selectedComponents(input);
  if (components.length === 0) {
    return { capsules: [] };
  }

  const policy = trustedSigstorePolicy(components[0]?.trustRoot);
  const certificateIdentity = input.certificateIdentity ?? policy.certificateIdentity;
  const certificateOidcIssuer = input.certificateOidcIssuer ?? policy.certificateOidcIssuer;

  for (const component of components) {
    if (!component.trustRoot?.sigstore?.certificateIdentities.includes(certificateIdentity)) {
      throw new Error(
        `Certificate identity is not trusted for ${component.name}: ${certificateIdentity}`,
      );
    }
    if (!component.trustRoot.sigstore.certificateOidcIssuers.includes(certificateOidcIssuer)) {
      throw new Error(
        `Certificate OIDC issuer is not trusted for ${component.name}: ${certificateOidcIssuer}`,
      );
    }
    if (component.trustRoot.sigstore.bundleVerification !== "cosign") {
      throw new Error(
        `Registry trust root must set sigstore.bundleVerification to "cosign" before signing ${component.name}.`,
      );
    }
  }

  return {
    capsules: components.map((component) =>
      signComponent({
        certificateIdentity,
        certificateOidcIssuer,
        component,
        cosignPath,
        cwd: resolve(input.cwd),
      }),
    ),
  };
}
