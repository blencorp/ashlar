const supportsColor =
  Boolean(process.stdout.isTTY) && !process.env.NO_COLOR && process.env.FORCE_COLOR !== "0";

const color = {
  blue: (value: string) => (supportsColor ? `\u001b[34m${value}\u001b[39m` : value),
  bold: (value: string) => (supportsColor ? `\u001b[1m${value}\u001b[22m` : value),
  cyan: (value: string) => (supportsColor ? `\u001b[36m${value}\u001b[39m` : value),
  dim: (value: string) => (supportsColor ? `\u001b[2m${value}\u001b[22m` : value),
  green: (value: string) => (supportsColor ? `\u001b[32m${value}\u001b[39m` : value),
  red: (value: string) => (supportsColor ? `\u001b[31m${value}\u001b[39m` : value),
  yellow: (value: string) => (supportsColor ? `\u001b[33m${value}\u001b[39m` : value),
};

export const ashlarArt = String.raw`
    _        _     _
   / \   ___| |__ | | __ _ _ __
  / _ \ / __| '_ \| |/ _' | '__|
 / ___ \\__ \ | | | | (_| | |
/_/   \_\___/_| |_|_|\__,_|_|
`.replace(/^\n|\n$/g, "");

export function renderBrandHeader(subtitle = "Source-owned UI for public services"): string {
  return `${color.blue(ashlarArt)}\n${color.bold("Ashlar")} ${color.dim(subtitle)}`;
}

export function printBrandHeader(subtitle?: string): void {
  console.log(renderBrandHeader(subtitle));
}

export function renderFooter(): string {
  return color.dim("Built with love by the good people at BLEN - https://blencorp.com");
}

export function printFooter(): void {
  console.log("");
  console.log(renderFooter());
}

export function printSection(title: string): void {
  console.log("");
  console.log(color.bold(title));
}

export function printKeyValue(key: string, value: string | number | boolean): void {
  console.log(`  ${color.dim(`${key}:`)} ${value}`);
}

export function printListItem(value: string): void {
  console.log(`  - ${value}`);
}

export function printCommand(value: string, reason?: string): void {
  console.log(`  ${color.cyan(value)}`);
  if (reason) {
    console.log(`    ${color.dim(reason)}`);
  }
}

export function formatStatus(status: string): string {
  const normalized = status.toUpperCase();
  if (["PASS", "OK", "READY", "CURRENT", "UPDATED"].includes(normalized)) {
    return color.green(normalized);
  }
  if (["FAIL", "ERROR", "BLOCKED", "CONFLICTED"].includes(normalized)) {
    return color.red(normalized);
  }
  if (["WARN", "WARNING", "ACTION", "SKIPPED"].includes(normalized)) {
    return color.yellow(normalized);
  }
  return normalized;
}

export function printSuccess(message: string): void {
  console.log(`${formatStatus("ok")} ${message}`);
}

export function printError(message: string): void {
  console.error(`${formatStatus("error")} ${message}`);
}
