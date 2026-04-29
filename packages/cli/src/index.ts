#!/usr/bin/env node
import { Command } from "commander";
import { registerAddCommand } from "./commands/add.js";
import { registerAuditCommand } from "./commands/audit.js";
import { registerDesignCommand } from "./commands/design.js";
import { registerEvidenceCommand } from "./commands/evidence.js";
import { registerInitCommand } from "./commands/init.js";
import { registerSearchCommand } from "./commands/search.js";
import { registerVerifyCommand } from "./commands/verify.js";
import { registerViewCommand } from "./commands/view.js";

const program = new Command();

program.name("ashlar").description("Ashlar component registry CLI").version("0.0.0");

registerInitCommand(program);
registerAddCommand(program);
registerAuditCommand(program);
registerVerifyCommand(program);
registerEvidenceCommand(program);
registerSearchCommand(program);
registerViewCommand(program);
registerDesignCommand(program);

program.parse();
