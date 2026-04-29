import { parse } from "parse5";

export type HtmlSourceLocation = {
  startLine: number;
  startCol: number;
  startOffset: number;
  endLine: number;
  endCol: number;
  endOffset: number;
};

export type HtmlNode = {
  nodeName?: string;
  tagName?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: HtmlNode[];
  value?: string;
  sourceCodeLocation?: HtmlSourceLocation & {
    startTag?: HtmlSourceLocation;
    endTag?: HtmlSourceLocation;
  };
};

export function parseHtml(source: string): HtmlNode {
  return parse(source, { sourceCodeLocationInfo: true }) as HtmlNode;
}

export function getRegion(node: HtmlNode | undefined): HtmlSourceLocation | undefined {
  if (!node?.sourceCodeLocation) {
    return undefined;
  }

  const location = node.sourceCodeLocation;
  return {
    startLine: location.startLine,
    startCol: location.startCol,
    startOffset: location.startOffset,
    endLine: location.endLine,
    endCol: location.endCol,
    endOffset: location.endOffset,
  };
}

export function getAttribute(node: HtmlNode, name: string): string | undefined {
  return node.attrs?.find((attr) => attr.name.toLowerCase() === name.toLowerCase())?.value;
}

export function getTextContent(node: HtmlNode): string {
  if (node.value) {
    return node.value;
  }

  return (node.childNodes ?? []).map((child) => getTextContent(child)).join("");
}

export function findElements(node: HtmlNode, predicate: (node: HtmlNode) => boolean): HtmlNode[] {
  const matches = predicate(node) ? [node] : [];

  for (const child of node.childNodes ?? []) {
    matches.push(...findElements(child, predicate));
  }

  return matches;
}

export function findFirstElement(node: HtmlNode, tagName: string): HtmlNode | undefined {
  return findElements(node, (item) => item.tagName?.toLowerCase() === tagName.toLowerCase()).at(0);
}

export function hasClassToken(node: HtmlNode, token: string): boolean {
  return (getAttribute(node, "class") ?? "").split(/\s+/).some((className) => className === token);
}

export function hasDataComponent(node: HtmlNode, component: string): boolean {
  return getAttribute(node, "data-ashlar-component")?.toLowerCase() === component.toLowerCase();
}
