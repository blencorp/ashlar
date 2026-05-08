import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type JsonRecord = Record<string, unknown>;

type ComponentDoc = {
  name: string;
  description: string;
  family: string;
  stability: string;
  selector: string;
  evidenceStatus: string;
};

export function ComponentIndex() {
  const components = readComponents();

  return (
    <table className="ashlar-component-index">
      <caption>Ashlar registry capsules</caption>
      <thead>
        <tr className="ashlar-component-row" data-header="true">
          <th scope="col">Capsule</th>
          <th scope="col">Family</th>
          <th scope="col">Evidence</th>
          <th scope="col">Contract</th>
        </tr>
      </thead>
      <tbody>
        {components.map((component) => (
          <tr className="ashlar-component-row" key={component.name}>
            <td>
              <strong>{component.name}</strong>
              <small>{component.description}</small>
            </td>
            <td>
              {component.family}
              <small>{component.stability}</small>
            </td>
            <td>{component.evidenceStatus}</td>
            <td>
              <code>{component.selector}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function readComponents(): ComponentDoc[] {
  const componentsRoot = resolve(process.cwd(), "../..", "registry", "components");

  if (!existsSync(componentsRoot)) {
    return [];
  }

  return readdirSync(componentsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readComponent(componentsRoot, entry.name))
    .filter((component): component is ComponentDoc => Boolean(component))
    .sort((a, b) => a.family.localeCompare(b.family) || a.name.localeCompare(b.name));
}

function readComponent(componentsRoot: string, name: string): ComponentDoc | undefined {
  const versionRoot = resolve(componentsRoot, name, "0.0.1");
  const cemPath = resolve(versionRoot, `${name}.cem.json`);
  const evidencePath = resolve(versionRoot, `${name}.evidence.json`);

  if (!existsSync(cemPath)) {
    return undefined;
  }

  const cem = json(cemPath);
  const evidence = existsSync(evidencePath) ? json(evidencePath) : {};
  const declaration = firstDeclaration(cem);
  const ashlar = record(declaration?._ashlar);

  return {
    name,
    description: stringValue(declaration?.description, "No description provided."),
    family: familyLabel(stringValue(ashlar?.layer, "unknown")),
    stability: stringValue(ashlar?.stability, "unknown"),
    selector: stringValue(ashlar?.selector, "n/a"),
    evidenceStatus: stringValue(evidence.accessibilityStatus, "not-reviewed"),
  };
}

function json(path: string): JsonRecord {
  return JSON.parse(readFileSync(path, "utf8")) as JsonRecord;
}

function familyLabel(layer: string): string {
  const labels: Record<string, string> = {
    "application-blocks": "application blocks",
    "framework-adapters": "framework adapters",
    "interactive-components": "interactive controls",
    "markup-primitives": "foundations",
    "service-patterns": "service patterns",
  };
  return labels[layer] ?? layer;
}

function firstDeclaration(cem: JsonRecord): JsonRecord | undefined {
  const modules = array(cem.modules);
  for (const moduleValue of modules) {
    const declarations = array(record(moduleValue)?.declarations);
    const declaration = declarations.find((value) => record(value));
    if (declaration) {
      return record(declaration);
    }
  }
  return undefined;
}

function record(value: unknown): JsonRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}
