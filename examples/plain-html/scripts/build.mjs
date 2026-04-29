import { mkdirSync, writeFileSync } from "node:fs";
import "./check.mjs";

mkdirSync(new URL("../dist", import.meta.url), { recursive: true });
writeFileSync(new URL("../dist/.built", import.meta.url), "ok\n");
