#!/usr/bin/env node
import { Command } from "commander";
import { registerAddCommand } from "./commands/add.js";
import { registerAuditCommand } from "./commands/audit.js";
import { registerEvidenceCommand } from "./commands/evidence.js";
import { registerInitCommand } from "./commands/init.js";
import { registerVerifyCommand } from "./commands/verify.js";

const program = new Command();

program.name("ashlar").description("Ashlar component registry CLI").version("0.0.0");

registerInitCommand(program);
registerAddCommand(program);
registerAuditCommand(program);
registerVerifyCommand(program);
registerEvidenceCommand(program);

program.parse();
