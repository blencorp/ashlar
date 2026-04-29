import type { Command } from "commander";

function emptySarif() {
  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "ashlar",
            informationUri: "https://github.com/blencorp/ashlar",
            rules: [],
          },
        },
        results: [],
      },
    ],
  };
}

export function registerAuditCommand(program: Command) {
  program
    .command("audit")
    .description("Validate Ashlar usage")
    .option("--sarif", "Emit SARIF")
    .action((options: { sarif?: boolean }) => {
      if (options.sarif) {
        console.log(JSON.stringify(emptySarif(), null, 2));
        return;
      }

      console.log("No findings");
    });
}
