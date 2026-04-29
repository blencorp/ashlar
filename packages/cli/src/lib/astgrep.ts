import { Lang, parse, type NapiConfig, type SgNode } from "@ast-grep/napi";

/**
 * Region in 1-indexed line/column form, matching SARIF's region shape.
 * ast-grep returns 0-indexed positions, so we add 1 at the boundary.
 */
export type AstGrepRegion = {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};

export type AstGrepLanguage = "html" | "tsx" | "jsx" | "css" | "typescript" | "javascript";

const languageMap: Record<AstGrepLanguage, Lang> = {
  html: Lang.Html,
  tsx: Lang.Tsx,
  jsx: Lang.Tsx,
  css: Lang.Css,
  typescript: Lang.TypeScript,
  javascript: Lang.JavaScript,
};

export function napiLang(language: AstGrepLanguage): Lang {
  return languageMap[language];
}

export function regionForNode(node: SgNode): AstGrepRegion {
  const range = node.range();
  return {
    startLine: range.start.line + 1,
    startColumn: range.start.column + 1,
    endLine: range.end.line + 1,
    endColumn: range.end.column + 1,
  };
}

export type AstGrepMatch = {
  text: string;
  region: AstGrepRegion;
};

/**
 * Run an ast-grep rule against a source string and return all matches with
 * their text and 1-indexed source ranges. Throws if the language is not
 * built-in to @ast-grep/napi.
 */
export function findMatches(
  language: AstGrepLanguage,
  source: string,
  rule: NapiConfig,
): AstGrepMatch[] {
  const root = parse(napiLang(language), source).root();
  return root.findAll(rule).map((node) => ({
    text: node.text(),
    region: regionForNode(node),
  }));
}

export { type NapiConfig, type SgNode };
