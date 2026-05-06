import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { suggestComponentsForTask } from "./component-suggest.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("component suggestions", () => {
  it("suggests a service-flow stack from task language", () => {
    const report = suggestComponentsForTask({
      cwd: repoRoot,
      registryPath: "./registry",
      task: "Build a benefits application form with validation errors",
    });

    expect(report.suggestions.at(0)?.name).toBe("benefit-application");
    expect(report.suggestions.map((suggestion) => suggestion.name)).toEqual(
      expect.arrayContaining([
        "alert",
        "error-summary",
        "form-field",
        "text-input",
        "textarea",
        "date-input",
        "select",
        "radio-group",
        "checkbox",
        "benefit-application",
        "button",
        "banner",
        "identifier",
      ]),
    );
    expect(report.installCommand).toContain("benefit-application");
    expect(report.installCommand).toContain("error-summary");
    expect(report.notes.at(0)).toContain("Deterministic metadata suggestion");
  });

  it("does not invent capsules when metadata does not match", () => {
    const report = suggestComponentsForTask({
      cwd: repoRoot,
      registryPath: "./registry",
      task: "Build a map visualization",
    });

    expect(report.suggestions).toHaveLength(0);
    expect(report.installCommand).toBeUndefined();
  });

  it("suggests the signed checkbox capsule instead of reporting a checkbox gap", () => {
    const report = suggestComponentsForTask({
      cwd: repoRoot,
      registryPath: "./registry",
      task: "Collect consent with a checkbox",
    });

    expect(report.suggestions.at(0)?.name).toBe("checkbox");
    expect(report.installCommand).toContain("checkbox");
    expect(report.gaps.map((gap) => gap.plannedComponent)).not.toContain("checkbox");
  });

  it("suggests the signed radio-group capsule instead of reporting a radio gap", () => {
    const report = suggestComponentsForTask({
      cwd: repoRoot,
      registryPath: "./registry",
      task: "Ask yes or no eligibility questions",
    });

    expect(report.suggestions.map((suggestion) => suggestion.name)).toContain("radio-group");
    expect(report.installCommand).toContain("radio-group");
    expect(report.gaps.map((gap) => gap.plannedComponent)).not.toContain("radio-group");
  });

  it("suggests the signed identifier capsule for required federal trust links", () => {
    const report = suggestComponentsForTask({
      cwd: repoRoot,
      registryPath: "./registry",
      task: "Add the official government identifier with FOIA and privacy links",
    });

    expect(report.suggestions.map((suggestion) => suggestion.name)).toContain("identifier");
    expect(report.installCommand).toContain("identifier");
  });

  it("suggests the signed select capsule instead of reporting a select gap", () => {
    const report = suggestComponentsForTask({
      cwd: repoRoot,
      registryPath: "./registry",
      task: "Let people choose one state from a dropdown select",
    });

    expect(report.suggestions.at(0)?.name).toBe("select");
    expect(report.installCommand).toContain("select");
    expect(report.gaps.map((gap) => gap.plannedComponent)).not.toContain("select");
  });

  it("suggests the signed textarea capsule instead of reporting a textarea gap", () => {
    const report = suggestComponentsForTask({
      cwd: repoRoot,
      registryPath: "./registry",
      task: "Collect long answer comments in a textarea",
    });

    expect(report.suggestions.at(0)?.name).toBe("textarea");
    expect(report.installCommand).toContain("textarea");
    expect(report.gaps.map((gap) => gap.plannedComponent)).not.toContain("textarea");
  });

  it("suggests the signed date-input capsule for simple date fields", () => {
    const report = suggestComponentsForTask({
      cwd: repoRoot,
      registryPath: "./registry",
      task: "Collect date of birth",
    });

    expect(report.suggestions.at(0)?.name).toBe("date-input");
    expect(report.installCommand).toContain("date-input");
    expect(report.gaps.map((gap) => gap.plannedComponent)).not.toContain("date-input");
  });

  it("keeps complex date picker behavior as an explicit gap", () => {
    const report = suggestComponentsForTask({
      cwd: repoRoot,
      registryPath: "./registry",
      task: "Build a restricted date picker with a date range",
    });

    expect(report.suggestions.map((suggestion) => suggestion.name)).toContain("date-input");
    expect(report.gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability: "Date picker",
          plannedComponent: "date-picker",
        }),
      ]),
    );
  });
});
