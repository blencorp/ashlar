import "./ashlar/ashlar.css";
import "./styles.css";

/**
 * The marketing site's only behavior is wiring copy buttons to <pre> blocks
 * marked with `data-copyable`. Everything else is static HTML + Ashlar tokens.
 *
 * This deliberately mirrors the project's "platform-first, low-bundle"
 * philosophy — the page has no framework runtime, no router, no state store.
 * If marketing needs grow, slot in islands rather than monolithizing.
 */

const COPY_RESET_MS = 2000;

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise<void>((resolve, reject) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const ok = document.execCommand("copy");
      ok ? resolve() : reject(new Error("execCommand copy returned false"));
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      textarea.remove();
    }
  });
}

function attachCopyButtons(): void {
  for (const pre of document.querySelectorAll<HTMLPreElement>("pre[data-copyable]")) {
    if (pre.querySelector(".copy-button")) {
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-button";
    button.setAttribute("aria-label", "Copy code to clipboard");
    button.dataset.state = "idle";

    const labelIdle = document.createElement("span");
    labelIdle.className = "copy-button__label";
    labelIdle.textContent = "Copy";
    button.appendChild(labelIdle);

    button.addEventListener("click", async () => {
      const code = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
      try {
        await copyToClipboard(code.trim());
        button.dataset.state = "copied";
        labelIdle.textContent = "Copied";
        setTimeout(() => {
          button.dataset.state = "idle";
          labelIdle.textContent = "Copy";
        }, COPY_RESET_MS);
      } catch (error) {
        button.dataset.state = "error";
        labelIdle.textContent = "Press ⌘C";
        console.error("Ashlar marketing: clipboard copy failed", error);
      }
    });

    pre.appendChild(button);
  }
}

attachCopyButtons();
