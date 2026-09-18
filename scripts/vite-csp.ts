// Injects a Content-Security-Policy <meta> into the built index.html.
//
// GitHub Pages serves static files and cannot set HTTP headers, so a meta tag is the only way to ship a
// CSP. The policy is computed at build time: every inline <script> in the emitted HTML is hashed and the
// hash added to script-src, so the policy can never drift from the page it protects. If the bootstrap
// script changes, the hash changes with it.
//
// Note: frame-ancestors, sandbox and report-uri are ignored in a meta CSP. Clickjacking therefore cannot
// be blocked from here; it would need a header (a custom domain behind a CDN), and matters little for a
// page that has no accounts and no destructive one-click actions.
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

/** What the app genuinely needs at runtime. Anything outside this list is blocked by the browser. */
function policy(scriptHashes: readonly string[]): string {
  const directives: Record<string, string[]> = {
    // Nothing is allowed unless a directive below widens it.
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    // No plugins, and no form can post anywhere: the app has no forms that submit.
    'object-src': ["'none'"],
    'form-action': ["'none'"],
    // 'wasm-unsafe-eval' lets Pyodide compile its WebAssembly without allowing eval() of strings.
    // jsdelivr serves the Pyodide runtime. The hashes cover the theme bootstrap in index.html.
    'script-src': ["'self'", "'wasm-unsafe-eval'", 'https://cdn.jsdelivr.net', ...scriptHashes],
    // The Python and Monaco workers are same-origin modules; Vite may fall back to a blob worker.
    'worker-src': ["'self'", 'blob:'],
    'child-src': ["'self'", 'blob:'],
    // Monaco injects its own <style> elements, so inline styles cannot be forbidden.
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    'img-src': ["'self'", 'data:', 'blob:'],
    // Where the page may talk to: itself, and jsdelivr for the Pyodide runtime and packages.
    // Scope caveat: a meta CSP applies to this document only. A dedicated worker loaded over https takes
    // its policy from its own response headers, which GitHub Pages cannot set, so the Python worker is NOT
    // covered by this directive. The worker is kept safe by severing Python's JavaScript bridge in
    // pyWorker.ts, not by this policy.
    'connect-src': ["'self'", 'https://cdn.jsdelivr.net'],
    'manifest-src': ["'self'"],
  };
  return Object.entries(directives).map(([k, v]) => `${k} ${v.join(' ')}`).join('; ');
}

function sha256(source: string): string {
  return `'sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}'`;
}

export function csp(): Plugin {
  return {
    name: 'pyladder-csp',
    // Build only: the dev server needs inline scripts and a websocket that this policy would block.
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes: string[] = [];
        // Inline scripts only: a <script src=...> is covered by 'self' or the jsdelivr origin.
        for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
          hashes.push(sha256(m[1]));
        }
        const meta = `<meta http-equiv="Content-Security-Policy" content="${policy(hashes)}" />`;
        if (!/<head[^>]*>/i.test(html)) throw new Error('csp plugin: index.html has no <head> to inject into');
        return html.replace(/<head([^>]*)>/i, `<head$1>\n${meta}`);
      },
    },
  };
}
