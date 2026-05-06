import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import fg from "fast-glob";
import { findMatches, type AstGrepLanguage, type AstGrepMatch } from "./astgrep.js";
import { findElements, getAttribute, getRegion, parseHtml, type HtmlNode } from "./html.js";
import { findAuditTargets } from "./audit-runner.js";
import { languageForFile } from "./policy/languages.js";
import { listComponents } from "./registry.js";
import type { PolicyRegion } from "./policy/federal.js";

export type UswdsMigrationStatus = "ready" | "action-needed";

export type UswdsMigrationMatch = {
  file: string;
  uswds: string;
  selector: string;
  status: "available" | "gap";
  ashlarComponents: string[];
  plannedComponent?: string;
  recommendation: string;
  region?: PolicyRegion;
};

export type UswdsMigrationReport = {
  schemaVersion: "1.0";
  status: UswdsMigrationStatus;
  summary: {
    files: number;
    matches: number;
    available: number;
    gaps: number;
  };
  files: string[];
  matches: UswdsMigrationMatch[];
  nextCommands: string[];
};

type UswdsMigrationInput = {
  cwd: string;
  files?: string[];
  registryPath: string;
};

type UswdsMigrationRule = {
  uswds: string;
  classTokens?: string[];
  tagNames?: string[];
  ashlarComponents: string[];
  plannedComponent?: string;
  recommendation: string;
};

const migrationRules: UswdsMigrationRule[] = [
  {
    uswds: "USWDS Banner",
    classTokens: ["usa-banner"],
    tagNames: ["usa-banner"],
    ashlarComponents: ["banner"],
    recommendation:
      "Replace with the signed Ashlar banner capsule and keep it near the top of <body>.",
  },
  {
    uswds: "USWDS Alert",
    classTokens: ["usa-alert"],
    ashlarComponents: ["alert"],
    recommendation: "Replace with the signed Ashlar alert capsule for semantic status messaging.",
  },
  {
    uswds: "USWDS Button",
    classTokens: ["usa-button"],
    ashlarComponents: ["button"],
    recommendation:
      "Replace with the signed Ashlar button capsule and preserve native <button> semantics.",
  },
  {
    uswds: "USWDS Form Group",
    classTokens: ["usa-form-group"],
    ashlarComponents: ["form-field"],
    recommendation:
      "Replace label, hint, error, and control wrapping with the Ashlar form-field capsule.",
  },
  {
    uswds: "USWDS Text Input",
    classTokens: ["usa-input"],
    ashlarComponents: ["text-input"],
    recommendation: "Replace simple text entry with the Ashlar text-input capsule.",
  },
  {
    uswds: "USWDS Error Message",
    classTokens: ["usa-error-message"],
    ashlarComponents: ["form-field", "error-summary"],
    recommendation:
      "Move field-level errors into Ashlar form-field and summarize blocking errors with error-summary.",
  },
  {
    uswds: "USWDS Identifier",
    classTokens: ["usa-identifier"],
    ashlarComponents: ["identifier"],
    recommendation:
      "Replace with the signed Ashlar identifier capsule and preserve required agency trust links.",
  },
  {
    uswds: "USWDS Radio",
    classTokens: ["usa-radio"],
    ashlarComponents: ["radio-group"],
    recommendation:
      "Replace with the signed Ashlar radio-group capsule and preserve native fieldset, legend, and input[type=radio] semantics.",
  },
  {
    uswds: "USWDS Checkbox",
    classTokens: ["usa-checkbox"],
    ashlarComponents: ["checkbox"],
    recommendation:
      "Replace with the signed Ashlar checkbox capsule and preserve native input[type=checkbox] semantics.",
  },
  {
    uswds: "USWDS Select",
    classTokens: ["usa-select"],
    ashlarComponents: ["select"],
    recommendation:
      "Replace with the signed Ashlar select capsule and preserve native <select> semantics.",
  },
  {
    uswds: "USWDS Textarea",
    classTokens: ["usa-textarea"],
    ashlarComponents: ["textarea"],
    recommendation:
      "Replace with the signed Ashlar textarea capsule and preserve native <textarea> semantics.",
  },
  {
    uswds: "USWDS Date Picker",
    classTokens: ["usa-date-picker"],
    ashlarComponents: ["date-input"],
    recommendation:
      "Use the signed Ashlar date-input capsule for simple single-date fields. This is not full calendar-picker parity for restricted-date or range behavior.",
  },
  {
    uswds: "USWDS Date Range Picker",
    classTokens: ["usa-date-range-picker"],
    ashlarComponents: [],
    plannedComponent: "date-picker",
    recommendation:
      "No signed Ashlar date-range picker capsule exists yet. Use paired date-input fields only when range semantics and validation are handled explicitly.",
  },
];

const ignoredMigrationPaths = [
  "**/.git/**",
  "**/node_modules/**",
  "**/dist/**",
  "**/.turbo/**",
  "**/coverage/**",
];

function regionFromNode(node: HtmlNode): PolicyRegion | undefined {
  const region = getRegion(node);
  if (!region) {
    return undefined;
  }

  return {
    startLine: region.startLine,
    startColumn: region.startCol,
    endLine: region.endLine,
    endColumn: region.endCol,
  };
}

function regionFromAstGrep(match: AstGrepMatch): PolicyRegion {
  return {
    startLine: match.region.startLine,
    startColumn: match.region.startColumn,
    endLine: match.region.endLine,
    endColumn: match.region.endColumn,
  };
}

function tokensFromClassValue(value: string | undefined): Set<string> {
  return new Set((value ?? "").split(/\s+/).filter(Boolean));
}

function selectorForElement(
  tagName: string | undefined,
  id: string | undefined,
  matched: string,
): string {
  const tag = tagName?.toLowerCase() ?? "element";
  if (tag === matched) {
    return `${tag}${id ? `#${id}` : ""}`;
  }
  return `${tag}${id ? `#${id}` : ""}.${matched}`;
}

function ruleMatchForElement(
  tagName: string | undefined,
  tokens: Set<string>,
  rule: UswdsMigrationRule,
): string | undefined {
  tagName = tagName?.toLowerCase();
  if (tagName && rule.tagNames?.includes(tagName)) {
    return tagName;
  }

  return rule.classTokens?.find((token) => tokens.has(token));
}

function resolvePath(cwd: string, file: string): string {
  return isAbsolute(file) ? file : join(cwd, file);
}

function targetFiles(cwd: string, files: string[] | undefined): string[] {
  if (!files || files.length === 0) {
    return fg.sync("**/*.{html,tsx,jsx}", {
      cwd,
      onlyFiles: true,
      ignore: ignoredMigrationPaths,
    });
  }

  return [...new Set(files.flatMap((file) => findAuditTargets(cwd, file)))];
}

function pushMatch(
  matches: UswdsMigrationMatch[],
  input: {
    file: string;
    tagName?: string;
    id?: string;
    classTokens: Set<string>;
    region?: PolicyRegion;
    registryNames: Set<string>;
  },
): void {
  for (const rule of migrationRules) {
    const matched = ruleMatchForElement(input.tagName, input.classTokens, rule);
    if (!matched) {
      continue;
    }
    const available =
      rule.ashlarComponents.length > 0 &&
      rule.ashlarComponents.every((component) => input.registryNames.has(component));
    matches.push({
      file: input.file,
      uswds: rule.uswds,
      selector: selectorForElement(input.tagName, input.id, matched),
      status: available ? "available" : "gap",
      ashlarComponents: rule.ashlarComponents.filter((component) =>
        input.registryNames.has(component),
      ),
      plannedComponent: available ? undefined : rule.plannedComponent,
      recommendation: rule.recommendation,
      region: input.region,
    });
  }
}

function scanHtml(
  matches: UswdsMigrationMatch[],
  file: string,
  source: string,
  registryNames: Set<string>,
): void {
  const document = parseHtml(source);
  for (const node of findElements(document, (item) => Boolean(item.tagName))) {
    pushMatch(matches, {
      file,
      tagName: node.tagName,
      id: getAttribute(node, "id"),
      classTokens: tokensFromClassValue(getAttribute(node, "class")),
      region: regionFromNode(node),
      registryNames,
    });
  }
}

function jsxLanguageForFile(file: string): AstGrepLanguage | undefined {
  const language = languageForFile(file);
  return language === "tsx" || language === "jsx" ? language : undefined;
}

function jsxElementMatches(language: AstGrepLanguage, source: string): AstGrepMatch[] {
  return [
    ...findMatches(language, source, {
      rule: { pattern: "<$TAG $$$ATTRS>$$$CHILDREN</$TAG>" },
    }),
    ...findMatches(language, source, {
      rule: { pattern: "<$TAG $$$ATTRS />" },
    }),
  ];
}

function staticJsxAttribute(openTag: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']*)["']`, "s"),
    new RegExp(`\\b${escaped}\\s*=\\s*\\{\\s*["']([^"']*)["']\\s*\\}`, "s"),
    new RegExp(`\\b${escaped}\\s*=\\s*\\{\\s*\\\`([^\\\`]*)\\\`\\s*\\}`, "s"),
  ];

  for (const pattern of patterns) {
    const match = openTag.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return undefined;
}

function scanJsx(
  matches: UswdsMigrationMatch[],
  file: string,
  source: string,
  registryNames: Set<string>,
  language: AstGrepLanguage,
): void {
  for (const match of jsxElementMatches(language, source)) {
    const openTag = match.text.match(/^<[^>]+>/s)?.[0] ?? match.text;
    const tagName = openTag.match(/^<\s*([A-Za-z][\w:-]*)/)?.[1]?.toLowerCase();
    pushMatch(matches, {
      file,
      tagName,
      id: staticJsxAttribute(openTag, "id"),
      classTokens: tokensFromClassValue(
        staticJsxAttribute(openTag, "className") ?? staticJsxAttribute(openTag, "class"),
      ),
      region: regionFromAstGrep(match),
      registryNames,
    });
  }
}

export function runUswdsMigration(input: UswdsMigrationInput): UswdsMigrationReport {
  const files = targetFiles(input.cwd, input.files);
  const registryNames = new Set(
    listComponents(input.cwd, input.registryPath).map((component) => component.name),
  );
  const matches: UswdsMigrationMatch[] = [];

  for (const file of files) {
    const path = resolvePath(input.cwd, file);
    if (!existsSync(path)) {
      matches.push({
        file,
        uswds: "Missing file",
        selector: file,
        status: "gap",
        ashlarComponents: [],
        recommendation: `Migration target not found: ${file}`,
      });
      continue;
    }

    const source = readFileSync(path, "utf8");
    const jsxLanguage = jsxLanguageForFile(file);
    if (jsxLanguage) {
      scanJsx(matches, file, source, registryNames, jsxLanguage);
    } else {
      scanHtml(matches, file, source, registryNames);
    }
  }

  const availableComponents = [
    ...new Set(matches.flatMap((match) => match.ashlarComponents)),
  ].sort();
  const nextCommands = [
    ...(availableComponents.length > 0 ? [`ashlar add ${availableComponents.join(" ")}`] : []),
    "ashlar audit --policy all <migrated-file-or-glob>",
    'ashlar suggest "Migrate a USWDS service flow"',
  ];

  return {
    schemaVersion: "1.0",
    status: matches.some((match) => match.status === "gap") ? "action-needed" : "ready",
    summary: {
      files: files.length,
      matches: matches.length,
      available: matches.filter((match) => match.status === "available").length,
      gaps: matches.filter((match) => match.status === "gap").length,
    },
    files,
    matches,
    nextCommands,
  };
}
