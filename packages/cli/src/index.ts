#!/usr/bin/env node
import { Command } from "commander";
import { registerAddCommand } from "./commands/add.js";
import { registerAiEvalCommand } from "./commands/ai-eval.js";
import { registerAuditCommand } from "./commands/audit.js";
import { registerBundleCommand } from "./commands/bundle.js";
import { registerDesignCommand } from "./commands/design.js";
import { registerEvidenceCommand } from "./commands/evidence.js";
import { registerInitCommand } from "./commands/init.js";
import { registerMigrateCommand } from "./commands/migrate.js";
import { registerMcpCommand } from "./commands/mcp.js";
import { registerRegistryCommand } from "./commands/registry.js";
import { registerReleaseCommand } from "./commands/release.js";
import { registerSearchCommand } from "./commands/search.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerSuggestCommand } from "./commands/suggest.js";
import { registerThemeCommand } from "./commands/theme.js";
import { registerUpdateCommand } from "./commands/update.js";
import { registerVerifyCommand } from "./commands/verify.js";
import { registerViewCommand } from "./commands/view.js";

const program = new Command();

program.name("ashlar").description("Ashlar component registry CLI").version("0.0.0");

registerInitCommand(program);
registerAddCommand(program);
registerAiEvalCommand(program);
registerAuditCommand(program);
registerBundleCommand(program);
registerVerifyCommand(program);
registerEvidenceCommand(program);
registerSearchCommand(program);
registerStatusCommand(program);
registerSuggestCommand(program);
registerViewCommand(program);
registerDesignCommand(program);
registerUpdateCommand(program);
registerMigrateCommand(program);
registerMcpCommand(program);
registerThemeCommand(program);
registerRegistryCommand(program);
registerReleaseCommand(program);

await program.parseAsync();
