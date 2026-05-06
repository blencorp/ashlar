import { searchRegistryComponents, type ComponentSearchResult } from "./component-search.js";
import { getComponent, listComponents } from "./registry.js";

export type ComponentSuggestInput = {
  cwd: string;
  registryPath?: string;
  task: string;
  limit?: number;
};

export type ComponentSuggestion = ComponentSearchResult & {
  suggestionScore: number;
};

export type ComponentSuggestReport = {
  task: string;
  suggestions: ComponentSuggestion[];
  installCommand?: string;
  gaps: ComponentSuggestionGap[];
  notes: string[];
};

type IntentRule = {
  id: string;
  triggers: string[];
  components: string[];
  reason: string;
  weight?: number;
};

export type ComponentSuggestionGap = {
  id: string;
  capability: string;
  recommendation: string;
  plannedComponent?: string;
};

type CapabilityGapRule = ComponentSuggestionGap & {
  triggers: string[];
};

const intentRules: IntentRule[] = [
  {
    id: "benefit-application-pattern",
    triggers: ["benefit", "benefits", "eligibility"],
    components: ["benefit-application"],
    reason: "benefit application pattern",
    weight: 110,
  },
  {
    id: "service-flow",
    triggers: ["application", "apply", "benefit", "benefits", "eligibility", "service flow"],
    components: [
      "benefit-application",
      "banner",
      "form-field",
      "text-input",
      "textarea",
      "date-input",
      "select",
      "radio-group",
      "checkbox",
      "button",
      "error-summary",
      "alert",
      "identifier",
    ],
    reason: "service-flow composition",
    weight: 45,
  },
  {
    id: "federal-trust",
    triggers: ["federal", "government", "gov", "official", "trust", "banner", "identifier"],
    components: ["banner", "identifier"],
    reason: "official-site trust marker",
    weight: 80,
  },
  {
    id: "identifier",
    triggers: ["identifier", "footer", "privacy", "foia", "agency links", "required links"],
    components: ["identifier", "banner"],
    reason: "agency identifier trust links",
    weight: 85,
  },
  {
    id: "form",
    triggers: ["form", "field", "input", "submit", "question", "questions"],
    components: [
      "form-field",
      "text-input",
      "textarea",
      "date-input",
      "select",
      "radio-group",
      "checkbox",
      "button",
      "error-summary",
    ],
    reason: "form building block",
    weight: 50,
  },
  {
    id: "select",
    triggers: ["select", "dropdown", "drop down", "picklist", "choose one", "state"],
    components: ["select"],
    reason: "bounded choice select control",
    weight: 100,
  },
  {
    id: "textarea",
    triggers: ["textarea", "long answer", "explain", "comments", "description"],
    components: ["textarea"],
    reason: "long-answer textarea control",
    weight: 100,
  },
  {
    id: "date-input",
    triggers: ["date", "dob", "birth date", "date of birth", "single date"],
    components: ["date-input"],
    reason: "simple single-date input",
    weight: 100,
  },
  {
    id: "radio-group",
    triggers: ["radio", "yes no", "yes or no", "choice", "choices", "eligibility"],
    components: ["radio-group", "form-field", "error-summary"],
    reason: "radio choice group",
    weight: 90,
  },
  {
    id: "checkbox",
    triggers: ["checkbox", "check box", "agreement", "consent", "terms"],
    components: ["checkbox", "form-field", "error-summary"],
    reason: "checkbox consent or multi-select control",
    weight: 70,
  },
  {
    id: "validation",
    triggers: ["error", "errors", "invalid", "validation", "required", "missing"],
    components: [
      "error-summary",
      "alert",
      "form-field",
      "text-input",
      "textarea",
      "date-input",
      "select",
      "checkbox",
    ],
    reason: "validation and error recovery",
    weight: 50,
  },
  {
    id: "status",
    triggers: ["alert", "notice", "status", "warning", "success", "info"],
    components: ["alert"],
    reason: "status messaging",
    weight: 50,
  },
];

const capabilityGapRules: CapabilityGapRule[] = [
  {
    id: "radio-group-unavailable",
    capability: "Radio group",
    triggers: ["radio", "yes no", "yes or no", "choice", "choices", "eligibility"],
    recommendation:
      "No signed Ashlar radio-group capsule exists yet. Use native fieldset, legend, label, and input[type=radio] semantics until the capsule ships.",
    plannedComponent: "radio-group",
  },
  {
    id: "checkbox-unavailable",
    capability: "Checkbox",
    triggers: ["checkbox", "check box", "agreement", "consent", "terms"],
    recommendation:
      "No signed Ashlar checkbox capsule exists yet. Use native label and input[type=checkbox] semantics and keep validation in the form-field/error-summary path.",
    plannedComponent: "checkbox",
  },
  {
    id: "select-unavailable",
    capability: "Select",
    triggers: ["select", "dropdown", "drop down", "picklist", "choose one"],
    recommendation:
      "No signed Ashlar select capsule exists yet. Prefer native select with a visible label until Ashlar ships the capsule.",
    plannedComponent: "select",
  },
  {
    id: "textarea-unavailable",
    capability: "Textarea",
    triggers: ["textarea", "long answer", "explain", "comments", "description"],
    recommendation:
      "No signed Ashlar textarea capsule exists yet. Use native textarea with form-field labeling and hint/error relationships.",
    plannedComponent: "textarea",
  },
  {
    id: "date-input-unavailable",
    capability: "Date input",
    triggers: ["date", "dob", "birth date", "date of birth", "single date"],
    recommendation:
      "No signed Ashlar date-input capsule exists yet. Use a clearly labeled native date or segmented text-input pattern and validate with audit before shipping.",
    plannedComponent: "date-input",
  },
  {
    id: "date-picker-unavailable",
    capability: "Date picker",
    triggers: ["date picker", "calendar picker", "date range", "range picker", "restricted date"],
    recommendation:
      "No signed Ashlar date-picker capsule exists yet. Use date-input only for simple single-date fields; complex calendar, restricted-date, and range behavior still needs custom validation before shipping.",
    plannedComponent: "date-picker",
  },
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function taskHasTrigger(task: string, trigger: string): boolean {
  return normalize(task).includes(normalize(trigger));
}

function addScore(
  scores: Map<string, { score: number; reasons: Set<string> }>,
  component: string,
  score: number,
  reason: string,
) {
  const current = scores.get(component) ?? { score: 0, reasons: new Set<string>() };
  current.score += score;
  current.reasons.add(reason);
  scores.set(component, current);
}

function baseResultForComponent(
  cwd: string,
  registryPath: string | undefined,
  name: string,
): ComponentSearchResult {
  const component = getComponent(cwd, name, registryPath);

  return {
    name: component.name,
    version: component.version,
    description: component.description,
    tier: component.tier,
    layer: component.layer,
    stability: component.stability,
    evidenceStatus: component.evidence.accessibilityStatus,
    score: 0,
    reasons: [],
    installCommand: `ashlar add ${component.name}`,
    policyMappings: component.policyMappings,
    platformFeatures: component.platformFeatures,
  };
}

function capabilityGapsForTask(task: string, registryNames: Set<string>): ComponentSuggestionGap[] {
  return capabilityGapRules
    .filter((rule) => rule.triggers.some((trigger) => taskHasTrigger(task, trigger)))
    .filter((rule) => !rule.plannedComponent || !registryNames.has(rule.plannedComponent))
    .map((rule) => ({
      id: rule.id,
      capability: rule.capability,
      recommendation: rule.recommendation,
      plannedComponent: rule.plannedComponent,
    }));
}

export function suggestComponentsForTask(input: ComponentSuggestInput): ComponentSuggestReport {
  const limit = input.limit ?? 13;
  const scores = new Map<string, { score: number; reasons: Set<string> }>();
  const registryNames = new Set(
    listComponents(input.cwd, input.registryPath).map((component) => component.name),
  );
  const gaps = capabilityGapsForTask(input.task, registryNames);

  for (const rule of intentRules) {
    if (!rule.triggers.some((trigger) => taskHasTrigger(input.task, trigger))) {
      continue;
    }

    for (const component of rule.components) {
      if (registryNames.has(component)) {
        addScore(scores, component, rule.weight ?? 50, rule.reason);
      }
    }
  }

  for (const result of searchRegistryComponents({
    cwd: input.cwd,
    registryPath: input.registryPath,
    query: input.task,
    limit: 20,
  })) {
    addScore(scores, result.name, result.score, result.reasons.at(0) ?? "metadata match");
  }

  const suggestions = [...scores.entries()]
    .map(([name, item]) => {
      const result = baseResultForComponent(input.cwd, input.registryPath, name);
      return {
        ...result,
        score: item.score,
        suggestionScore: item.score,
        reasons: [...item.reasons],
      };
    })
    .sort((a, b) => {
      if (b.suggestionScore !== a.suggestionScore) {
        return b.suggestionScore - a.suggestionScore;
      }
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);

  return {
    task: input.task,
    suggestions,
    installCommand:
      suggestions.length > 0
        ? `ashlar add ${suggestions.map((suggestion) => suggestion.name).join(" ")}`
        : undefined,
    gaps,
    notes: [
      "Deterministic metadata suggestion; no model or embedding service was called.",
      "Run ashlar view and ashlar evidence before adoption, then ashlar audit after integration.",
      ...(gaps.length > 0
        ? ["Some requested capabilities are not signed Ashlar capsules yet; do not invent them."]
        : []),
    ],
  };
}
