import type { MDXComponents } from "mdx/types";
import defaultMdxComponents from "fumadocs-ui/mdx";

import { AshlarCommand } from "@/components/ashlar-command";
import { ComponentIndex } from "@/components/component-index";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    AshlarCommand,
    ComponentIndex,
    ...components,
  };
}
