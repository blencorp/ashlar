import { parse } from "parse5";

export type HtmlNode = {
  nodeName?: string;
  tagName?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: HtmlNode[];
  value?: string;
};

export function parseHtml(source: string): HtmlNode {
  return parse(source) as HtmlNode;
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
  return (getAttribute(node, "class") ?? "")
    .split(/\s+/)
    .some((className) => className === token || className.includes(token));
}

export function hasDataComponent(node: HtmlNode, component: string): boolean {
  return getAttribute(node, "data-ashlar-component")?.toLowerCase() === component.toLowerCase();
}
