import { readFileSync } from "node:fs";
import { describeErrors, validate } from "./schema-validate.js";
import { getComponent, type RegistryComponent } from "./registry.js";

export type ManualTranscriptType = "keyboard" | "screen-reader";

type ManualTranscriptStep = {
  id: string;
  action: string;
  expected: string;
  observed: string;
  result: "pass" | "pass-with-note" | "fail" | "blocked";
};

export type ManualTranscriptArtifact = {
  $schema: "https://ashlar.dev/schemas/manual-transcript.schema.json";
  schemaVersion: "1.0";
  component: string;
  version: string;
  transcriptType: ManualTranscriptType;
  reviewedAt: string;
  reviewer: string;
  environment: {
    browser: string;
    browserVersion?: string;
    os: string;
    assistiveTechnology?: string;
    assistiveTechnologyVersion?: string;
    inputDevice?: string;
  };
  steps: ManualTranscriptStep[];
  result: "pass" | "pass-with-note" | "fail" | "blocked";
  summary: string;
  knownLimitations?: unknown[];
};

type TranscriptTemplateInput = {
  component: string;
  cwd: string;
  registryPath: string;
  transcriptType: ManualTranscriptType;
  reviewedAt?: Date;
};

type ValidateTranscriptInput = {
  component?: string;
  cwd: string;
  expectedType?: ManualTranscriptType;
  path: string;
  registryPath: string;
};

export function isManualTranscriptType(value: string | undefined): value is ManualTranscriptType {
  return value === "keyboard" || value === "screen-reader";
}

function hasPlaceholderText(value: unknown): boolean {
  const normalized = JSON.stringify(value).toLowerCase();
  return /\b(todo|tbd|placeholder)\b/.test(normalized);
}

export function checkManualTranscriptCompletion(transcript: ManualTranscriptArtifact): string[] {
  const findings: string[] = [];

  if (hasPlaceholderText(transcript)) {
    findings.push("contains TODO, TBD, or placeholder text");
  }

  if (transcript.result === "blocked" || transcript.result === "fail") {
    findings.push(`overall result is ${transcript.result}`);
  }

  const incompleteSteps = transcript.steps.filter(
    (step) => step.result === "blocked" || step.result === "fail",
  );
  if (incompleteSteps.length > 0) {
    findings.push(
      `step result is blocked or fail: ${incompleteSteps.map((step) => step.id).join(", ")}`,
    );
  }

  return findings;
}

function genericKeyboardSteps(detail: RegistryComponent): ManualTranscriptStep[] {
  const label = `${detail.name}@${detail.version}`;
  return [
    {
      id: "keyboard-focus-order",
      action: `Tab to ${label} from the preceding control, then Shift+Tab back.`,
      expected:
        "Focus reaches the component in visual order and the focus indicator remains visible.",
      observed: "TODO: record observed focus order and focus visibility.",
      result: "blocked",
    },
    {
      id: "keyboard-activation",
      action: `Activate ${label} with the documented keyboard command for this component.`,
      expected: "Keyboard activation matches the native or documented interaction contract.",
      observed: "TODO: record observed activation behavior.",
      result: "blocked",
    },
    {
      id: "keyboard-disabled-state",
      action: `Repeat focus and activation checks for disabled, invalid, or unavailable ${label} states when present in the fixture.`,
      expected: "Unavailable controls do not activate and expose a clear visual state.",
      observed:
        "TODO: record observed disabled or unavailable behavior, or state that it is not applicable.",
      result: "blocked",
    },
  ];
}

function buttonKeyboardSteps(): ManualTranscriptStep[] {
  return [
    {
      id: "button-focus-visible",
      action: "Tab to the Ashlar Button from the preceding control, then Shift+Tab away and back.",
      expected:
        "Focus lands on the native button in visual order and the focus indicator is clearly visible.",
      observed: "TODO: record observed focus order and focus visibility.",
      result: "blocked",
    },
    {
      id: "button-enter-activation",
      action: "With focus on the Ashlar Button, press Enter.",
      expected: "The native button activation fires once without requiring pointer input.",
      observed: "TODO: record observed Enter activation behavior.",
      result: "blocked",
    },
    {
      id: "button-space-activation",
      action: "With focus on the Ashlar Button, press Space.",
      expected: "The native button activation fires once without scrolling the page unexpectedly.",
      observed: "TODO: record observed Space activation behavior.",
      result: "blocked",
    },
  ];
}

function genericScreenReaderSteps(detail: RegistryComponent): ManualTranscriptStep[] {
  const label = `${detail.name}@${detail.version}`;
  const requirements = (detail.ashlar.a11yRequirements ?? [])
    .map((requirement) => requirement.description)
    .filter(Boolean)
    .join(" ");
  return [
    {
      id: "screen-reader-name-role-state",
      action: `Navigate to ${label} with the screen reader's normal reading commands.`,
      expected: `The screen reader announces the accessible name, role, and relevant state.${requirements ? ` Requirements: ${requirements}` : ""}`,
      observed: "TODO: record the exact screen-reader announcement.",
      result: "blocked",
    },
    {
      id: "screen-reader-keyboard-activation",
      action: `Activate ${label} with the keyboard while the screen reader is running, when the component is interactive.`,
      expected: "Activation works and the screen reader announces any resulting state or feedback.",
      observed: "TODO: record the activation announcement and resulting behavior.",
      result: "blocked",
    },
    {
      id: "screen-reader-context",
      action:
        "Review the component in nearby page context, including labels, help text, and errors when present.",
      expected: "Context is discoverable without relying on visual position alone.",
      observed: "TODO: record whether surrounding context was announced or discoverable.",
      result: "blocked",
    },
  ];
}

function buttonScreenReaderSteps(): ManualTranscriptStep[] {
  return [
    {
      id: "button-screen-reader-name-role",
      action: "Navigate to the Ashlar Button with the screen reader's normal reading commands.",
      expected: "The screen reader announces the button's accessible name and native button role.",
      observed: "TODO: record the exact screen-reader announcement.",
      result: "blocked",
    },
    {
      id: "button-screen-reader-enter-activation",
      action: "Activate the Ashlar Button with Enter while the screen reader is running.",
      expected:
        "The button activates once and the screen reader does not obscure the activation target.",
      observed: "TODO: record the Enter activation announcement and resulting behavior.",
      result: "blocked",
    },
    {
      id: "button-screen-reader-space-activation",
      action: "Activate the Ashlar Button with Space while the screen reader is running.",
      expected:
        "The button activates once and the screen reader reports any resulting state or page feedback.",
      observed: "TODO: record the Space activation announcement and resulting behavior.",
      result: "blocked",
    },
  ];
}

function keyboardSteps(detail: RegistryComponent): ManualTranscriptStep[] {
  if (detail.name === "button") {
    return buttonKeyboardSteps();
  }

  return genericKeyboardSteps(detail);
}

function screenReaderSteps(detail: RegistryComponent): ManualTranscriptStep[] {
  if (detail.name === "button") {
    return buttonScreenReaderSteps();
  }

  return genericScreenReaderSteps(detail);
}

export function buildManualTranscriptTemplate(
  input: TranscriptTemplateInput,
): ManualTranscriptArtifact {
  const detail = getComponent(input.cwd, input.component, input.registryPath);
  const reviewedAt = input.reviewedAt ?? new Date();
  const transcriptType = input.transcriptType;
  const artifact: ManualTranscriptArtifact = {
    $schema: "https://ashlar.dev/schemas/manual-transcript.schema.json",
    schemaVersion: "1.0",
    component: detail.name,
    version: detail.version,
    transcriptType,
    reviewedAt: reviewedAt.toISOString(),
    reviewer: "TODO: reviewer name or email",
    environment:
      transcriptType === "keyboard"
        ? {
            browser: "TODO: browser",
            os: "TODO: operating system",
            inputDevice: "Keyboard",
          }
        : {
            browser: "TODO: browser",
            os: "TODO: operating system",
            assistiveTechnology:
              "TODO: screen reader (NVDA, JAWS, VoiceOver, Narrator, or equivalent)",
          },
    steps: transcriptType === "keyboard" ? keyboardSteps(detail) : screenReaderSteps(detail),
    result: "blocked",
    summary: "TODO: replace this blocked template with observed reviewer results.",
    knownLimitations: [],
  };

  const result = validate("manualTranscript", artifact);
  if (!result.ok) {
    throw new Error(`Generated manual transcript template is invalid:\n${describeErrors(result)}`);
  }

  return artifact;
}

export function readManualTranscriptArtifact(
  input: ValidateTranscriptInput,
): ManualTranscriptArtifact {
  const transcript = JSON.parse(readFileSync(input.path, "utf8")) as ManualTranscriptArtifact;
  const result = validate("manualTranscript", transcript);
  if (!result.ok) {
    throw new Error(
      `Invalid Ashlar manual transcript artifact at ${input.path}:\n${describeErrors(result)}`,
    );
  }

  if (input.expectedType && transcript.transcriptType !== input.expectedType) {
    throw new Error(
      `Manual transcript type mismatch: expected ${input.expectedType}, got ${transcript.transcriptType}.`,
    );
  }

  if (input.component) {
    const detail = getComponent(input.cwd, input.component, input.registryPath);
    if (transcript.component !== detail.name || transcript.version !== detail.version) {
      throw new Error(
        `Manual transcript target mismatch: expected ${detail.name}@${detail.version}, got ${transcript.component}@${transcript.version}.`,
      );
    }
  }

  return transcript;
}
