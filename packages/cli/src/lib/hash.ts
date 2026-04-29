import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function sha256Text(input: string): string {
  const normalized = input.replace(/\r\n/g, "\n");
  return `sha256:${createHash("sha256").update(normalized, "utf8").digest("hex")}`;
}

export function sha256File(path: string): string {
  return sha256Text(readFileSync(path, "utf8"));
}
