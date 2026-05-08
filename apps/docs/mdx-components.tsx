import type { MDXComponents } from "mdx/types";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Callout } from "fumadocs-ui/components/callout";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

import { AshlarCommand } from "@/components/ashlar-command";
import { ComponentIndex } from "@/components/component-index";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Callout,
    Step,
    Steps,
    Tab,
    Tabs,
    AshlarCommand,
    ComponentIndex,
    ...components,
  };
}
