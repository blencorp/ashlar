/**
 * Per-language support matrix for the Ashlar validator.
 *
 * The validator declares what it can do and refuses to silently scan languages
 * it cannot. This matches the philosophy "polyglot validation, scoped honestly":
 * we ship coverage for languages where ast-grep has real first-party or
 * maintained third-party tree-sitter grammars, and we return a clear
 * `language-unsupported` finding for languages that lack maintained grammars
 * (Twig, Jinja, Nunjucks).
 *
 * See `docs/architecture/validation.md` for the full matrix and roadmap.
 */

export type LanguageSupport =
  | { status: "first-party" }
  | { status: "opt-in-with-grammar"; grammar: string; configKey: string }
  | { status: "unsupported"; reason: string };

export const languageSupport: Record<string, LanguageSupport> = {
  html: { status: "first-party" },
  tsx: { status: "first-party" },
  jsx: { status: "first-party" },
  css: { status: "first-party" },

  vue: {
    status: "opt-in-with-grammar",
    grammar: "tree-sitter-vue",
    configKey: "audit.languages.vue",
  },
  svelte: {
    status: "opt-in-with-grammar",
    grammar: "tree-sitter-svelte",
    configKey: "audit.languages.svelte",
  },
  astro: {
    status: "opt-in-with-grammar",
    grammar: "tree-sitter-astro",
    configKey: "audit.languages.astro",
  },
  erb: {
    status: "opt-in-with-grammar",
    grammar: "tree-sitter-embedded-template",
    configKey: "audit.languages.erb",
  },

  twig: {
    status: "unsupported",
    reason: "No maintained tree-sitter grammar as of 2026-04-29",
  },
  jinja: {
    status: "unsupported",
    reason: "Tree-sitter grammar is documented as incomplete",
  },
  nunjucks: {
    status: "unsupported",
    reason: "No maintained tree-sitter grammar; Jinja-compatible parser is incomplete",
  },
};

const extensionToLanguage: Record<string, string> = {
  html: "html",
  htm: "html",
  ts: "tsx",
  tsx: "tsx",
  js: "jsx",
  jsx: "jsx",
  mjs: "jsx",
  cjs: "jsx",
  css: "css",
  vue: "vue",
  svelte: "svelte",
  astro: "astro",
  erb: "erb",
  twig: "twig",
  jinja: "jinja",
  jinja2: "jinja",
  njk: "nunjucks",
  nunjucks: "nunjucks",
};

export function languageForExtension(extension: string): string | undefined {
  return extensionToLanguage[extension.replace(/^\./, "").toLowerCase()];
}

export function languageForFile(file: string): string | undefined {
  const dot = file.lastIndexOf(".");
  if (dot === -1) {
    return undefined;
  }
  return languageForExtension(file.slice(dot + 1));
}

export function isSupported(language: string, configuredLanguages: Set<string>): boolean {
  const support = languageSupport[language];
  if (!support) {
    return false;
  }
  if (support.status === "first-party") {
    return true;
  }
  if (support.status === "opt-in-with-grammar") {
    return configuredLanguages.has(language);
  }
  return false;
}

export function unsupportedReason(language: string): string {
  const support = languageSupport[language];
  if (!support) {
    return `Language "${language}" is not in the Ashlar validator support matrix.`;
  }
  if (support.status === "unsupported") {
    return support.reason;
  }
  if (support.status === "opt-in-with-grammar") {
    return `Language "${language}" requires opting in via ${support.configKey} with a maintained ${support.grammar} grammar.`;
  }
  return "";
}

export const supportedFirstPartyLanguages: ReadonlyArray<string> = Object.entries(languageSupport)
  .filter(([, support]) => support.status === "first-party")
  .map(([name]) => name);
