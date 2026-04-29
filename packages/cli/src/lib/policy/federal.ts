import {
  findElements,
  findFirstElement,
  getAttribute,
  getRegion,
  getTextContent,
  hasClassToken,
  hasDataComponent,
  parseHtml,
  type HtmlNode,
  type HtmlSourceLocation,
} from "../html.js";

export type PolicyRegion = {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};

export type PolicyFinding = {
  ruleId: string;
  message: string;
  file: string;
  level: "error" | "warning";
  standardStatus: "research" | "draft" | "pending" | "required" | "guidance";
  helpUri: string;
  evidence?: string;
  tags?: string[];
  fullDescription?: string;
  region?: PolicyRegion;
};

function regionFromLocation(location: HtmlSourceLocation): PolicyRegion {
  return {
    startLine: location.startLine,
    startColumn: location.startCol,
    endLine: location.endLine,
    endColumn: location.endCol,
  };
}

function regionForNode(node: HtmlNode | undefined): PolicyRegion | undefined {
  const location = getRegion(node);
  return location ? regionFromLocation(location) : undefined;
}

const titleHelpUri = "https://standards.digital.gov/standards/html-page-title/";
const metaDescriptionHelpUri = "https://standards.digital.gov/standards/meta-page-description/";
const bannerHelpUri = "https://standards.digital.gov/standards/banner/";
const identifierHelpUri = "https://designsystem.digital.gov/components/identifier/";

type WarningOptions = {
  evidence?: string;
  standardStatus?: PolicyFinding["standardStatus"];
  tags?: string[];
  fullDescription?: string;
  region?: PolicyRegion;
};

function warning(
  file: string,
  ruleId: string,
  message: string,
  helpUri: string,
  options: WarningOptions = {},
): PolicyFinding {
  return {
    ruleId,
    message,
    file,
    level: "warning",
    standardStatus: options.standardStatus ?? "pending",
    helpUri,
    evidence: options.evidence,
    tags: options.tags,
    fullDescription: options.fullDescription,
    region: options.region,
  };
}

function normalized(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function elementMatchesBanner(node: HtmlNode): boolean {
  return (
    node.tagName?.toLowerCase() === "usa-banner" ||
    hasClassToken(node, "usa-banner") ||
    hasClassToken(node, "ashlar-banner") ||
    hasDataComponent(node, "banner")
  );
}

function isElement(node: HtmlNode): boolean {
  return Boolean(node.tagName);
}

function bodyTopContainsBanner(document: HtmlNode): boolean {
  const body = findFirstElement(document, "body");
  const topLevelElements = (body?.childNodes ?? []).filter(isElement).slice(0, 3);

  return topLevelElements.some(
    (node) => elementMatchesBanner(node) || findElements(node, elementMatchesBanner).length > 0,
  );
}

function elementMatchesIdentifier(node: HtmlNode): boolean {
  return (
    hasClassToken(node, "usa-identifier") ||
    hasClassToken(node, "ashlar-identifier") ||
    hasDataComponent(node, "identifier")
  );
}

function findMetaDescription(document: HtmlNode): HtmlNode | undefined {
  return findElements(document, (node) => {
    if (node.tagName?.toLowerCase() !== "meta") {
      return false;
    }

    return getAttribute(node, "name")?.toLowerCase() === "description";
  }).at(0);
}

function linkMatches(link: HtmlNode, candidates: string[]): boolean {
  const text = normalized(getTextContent(link));
  const href = normalized(getAttribute(link, "href") ?? "");

  return candidates.some((candidate) => {
    const normalizedCandidate = normalized(candidate);
    return text.includes(normalizedCandidate) || href.includes(normalizedCandidate);
  });
}

const requiredIdentifierLinks = [
  { label: "About", candidates: ["about"] },
  { label: "Accessibility", candidates: ["accessibility"] },
  { label: "FOIA", candidates: ["foia", "freedom of information"] },
  { label: "No FEAR Act", candidates: ["no fear", "nofear"] },
  { label: "Office of Inspector General", candidates: ["inspector general", "oig"] },
  { label: "Performance reports", candidates: ["performance", "budget"] },
  { label: "Privacy", candidates: ["privacy"] },
];

export function auditFederalHtml(source: string, file: string): PolicyFinding[] {
  const document = parseHtml(source);
  const findings: PolicyFinding[] = [];
  const title = findFirstElement(document, "title");
  const titleText = title ? getTextContent(title).trim() : "";

  if (!titleText) {
    findings.push(
      warning(
        file,
        "federal/page-title-required",
        "Federal public-service pages need a descriptive HTML title.",
        titleHelpUri,
        {
          tags: ["federal-standard", "metadata"],
          fullDescription:
            "The HTML <title> element is required by the pending Federal Web Standard on HTML page titles.",
        },
      ),
    );
  } else if (titleText.length < 20) {
    findings.push(
      warning(
        file,
        "federal/page-title-min-length",
        "Federal Website Standards acceptance criteria call for HTML page titles of at least 20 characters.",
        titleHelpUri,
        {
          evidence: `Found ${titleText.length} characters.`,
          tags: ["federal-standard", "metadata"],
          fullDescription:
            "Short page titles are flagged by the pending Federal Web Standard's acceptance criterion.",
          region: regionForNode(title),
        },
      ),
    );
  }

  const metaDescription = findMetaDescription(document);
  const metaDescriptionContent = metaDescription
    ? (getAttribute(metaDescription, "content") ?? "").trim()
    : "";

  if (!metaDescriptionContent) {
    findings.push(
      warning(
        file,
        "federal/meta-description-required",
        "Federal public-service pages need a descriptive meta description.",
        metaDescriptionHelpUri,
        {
          tags: ["federal-standard", "metadata"],
          fullDescription:
            "The meta description element is required by the pending Federal Web Standard on meta page description.",
        },
      ),
    );
  } else if (metaDescriptionContent.length < 50) {
    findings.push(
      warning(
        file,
        "federal/meta-description-min-length",
        "Federal Website Standards acceptance criteria call for meta descriptions of at least 50 characters.",
        metaDescriptionHelpUri,
        {
          evidence: `Found ${metaDescriptionContent.length} characters.`,
          tags: ["federal-standard", "metadata"],
          fullDescription:
            "Short meta descriptions are flagged by the pending Federal Web Standard's acceptance criterion.",
          region: regionForNode(metaDescription),
        },
      ),
    );
  }

  if (!bodyTopContainsBanner(document)) {
    findings.push(
      warning(
        file,
        "federal/banner-required",
        "Federal public-service pages should include the federal government banner at the top of every page.",
        bannerHelpUri,
        {
          tags: ["federal-standard", "trust-marker"],
          fullDescription:
            'The federal government banner is required by the pending Federal Web Standard on the federal banner. Acceptable markers include <usa-banner>, class names containing usa-banner or ashlar-banner, and data-ashlar-component="banner".',
        },
      ),
    );
  }

  const identifier = findElements(document, elementMatchesIdentifier).at(0);
  if (!identifier) {
    findings.push(
      warning(
        file,
        "federal/identifier-required",
        "Federal public-service pages should include an identifier with required links.",
        identifierHelpUri,
        {
          standardStatus: "guidance",
          tags: ["uswds-guidance", "trust-marker"],
          fullDescription:
            "USWDS Identifier guidance and M-23-22 require trust-marker links (About, Accessibility, FOIA, No FEAR Act, OIG, Performance, Privacy). Identifier is not on standards.digital.gov; it is sourced from USWDS components and M-23-22.",
        },
      ),
    );
    return findings;
  }

  const links = findElements(identifier, (node) => node.tagName?.toLowerCase() === "a");
  for (const requiredLink of requiredIdentifierLinks) {
    if (!links.some((link) => linkMatches(link, requiredLink.candidates))) {
      findings.push(
        warning(
          file,
          "federal/identifier-required-link-missing",
          `Identifier is missing recognizable required-link coverage for ${requiredLink.label}.`,
          identifierHelpUri,
          {
            evidence: "Prototype detection checks normalized link text and href fragments.",
            standardStatus: "guidance",
            tags: ["uswds-guidance", "trust-marker"],
            fullDescription:
              "USWDS Identifier components require seven trust-marker links. Detection in this prototype is text and href substring; rich detection (parsed identifier metadata) lands in slice 2.",
            region: regionForNode(identifier),
          },
        ),
      );
    }
  }

  return findings;
}
