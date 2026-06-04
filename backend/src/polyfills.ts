// Must run before pdfjs-dist loads on Node.js (Render, Vercel serverless, etc.).
// Node 22+ may expose a broken global DOMMatrix; pdfjs-dist v5 requires a real constructor.

function installDomMatrixPolyfill(): void {
  const target: typeof globalThis =
    typeof globalThis !== "undefined" ? globalThis : (global as typeof globalThis);

  let needsPolyfill = typeof target.DOMMatrix !== "function";
  if (!needsPolyfill) {
    try {
      needsPolyfill = !(new target.DOMMatrix() instanceof target.DOMMatrix);
    } catch {
      needsPolyfill = true;
    }
  }

  if (needsPolyfill) {
    // dommatrix exports the CSSMatrix constructor as the CommonJS module itself.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    target.DOMMatrix = require("dommatrix");
  }
}

installDomMatrixPolyfill();
