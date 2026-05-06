import { readCapsuleManifest, readVerifiedCapsuleManifest } from "./capsule.js";
import { getComponent, listComponents, readRegistryTrustRoot, type RegistryComponent } from "./registry.js";

export type PublicCapsuleTrustInput = {
  components?: string[];
  cosignPath?: string;
  cwd: string;
  registryPath: string;
};

export type PublicCapsuleTrustCapsule = {
  bundle: string;
  bundleHash: string;
  certificateIdentity: string;
  certificateOidcIssuer: string;
  component: string;
  signedPayloadHash: string;
  version: string;
};

export type PublicCapsuleTrustResult = {
  capsules: PublicCapsuleTrustCapsule[];
  errors: string[];
};

function selectedComponents(input: PublicCapsuleTrustInput): RegistryComponent[] {
  if (!input.components || input.components.length === 0) {
    return listComponents(input.cwd, input.registryPath).map((component) =>
      getComponent(input.cwd, component.name, input.registryPath),
    );
  }

  return input.components.map((component) => getComponent(input.cwd, component, input.registryPath));
}

export function verifyPublicCapsuleTrust(
  input: PublicCapsuleTrustInput,
): PublicCapsuleTrustResult {
  const errors: string[] = [];
  const capsules: PublicCapsuleTrustCapsule[] = [];
  const trustRoot = readRegistryTrustRoot(input.cwd, input.registryPath);

  if (!trustRoot) {
    return {
      capsules,
      errors: ["registry trust root is missing"],
    };
  }
  if (!trustRoot.sigstore) {
    errors.push("registry trust root must include a Sigstore trust policy");
  } else if (trustRoot.sigstore.bundleVerification !== "cosign") {
    errors.push('registry trust root must set sigstore.bundleVerification to "cosign"');
  }

  let components: RegistryComponent[];
  try {
    components = selectedComponents(input);
  } catch (error) {
    return {
      capsules,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }

  for (const component of components) {
    try {
      const manifest = readCapsuleManifest(component.directory, component.name);
      if (!manifest.sigstore) {
        errors.push(`${component.name}@${component.version}: missing capsule Sigstore bundle metadata`);
        continue;
      }

      const verified = readVerifiedCapsuleManifest({
        directory: component.directory,
        name: component.name,
        version: component.version,
        layer: component.layer,
        stability: component.stability,
        registryCapsuleHash: component.capsuleHash,
        trustRoot,
        cosignPath: input.cosignPath,
      });
      if (!verified.sigstore) {
        errors.push(`${component.name}@${component.version}: missing capsule Sigstore bundle metadata`);
        continue;
      }

      capsules.push({
        bundle: verified.sigstore.bundle,
        bundleHash: verified.sigstore.bundleHash,
        certificateIdentity: verified.sigstore.certificateIdentity,
        certificateOidcIssuer: verified.sigstore.certificateOidcIssuer,
        component: component.name,
        signedPayloadHash: verified.sigstore.signedPayloadHash,
        version: component.version,
      });
    } catch (error) {
      errors.push(
        `${component.name}@${component.version}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return { capsules, errors };
}
