/**
 * Prerender the Landing page into dist/index.html.
 *
 * Why: DukaHub is a client-rendered SPA, and Google has to run JavaScript to
 * see any content, which slows down (and sometimes blocks) indexing. This
 * script renders the landing page to real HTML at build time and injects it
 * into the served page — so crawlers read full content (headings, features,
 * FAQ, pricing, links) with zero JavaScript execution.
 *
 * Runs right after `vite build`. Only the `/` landing is pre-rendered; every
 * other route keeps the normal client-side SPA behaviour (they are behind
 * sign-in anyway and disallowed in robots.txt).
 *
 * Usage: node scripts/prerender.mjs   (invoked by the `build` script)
 */
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distIndex = path.join(rootDir, 'dist', 'index.html');

// Boot Vite in SSR middleware mode so it can transform/load TSX modules
// (reuses the project's vite.config.ts plugins, including the React plugin).
const vite = await createServer({
  root: rootDir,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

try {
  // 1) Load the Landing page through Vite's SSR pipeline.
  const { default: Landing } = await vite.ssrLoadModule('/src/pages/Landing.tsx');

  // 2) Render it to a static HTML string. StaticRouter provides the router
  //    context Landing needs for its <Link> components.
  const appHtml = renderToString(
    React.createElement(StaticRouter, { location: '/' }, React.createElement(Landing))
  );

  if (!appHtml || appHtml.length < 500) {
    throw new Error(`Suspiciously small prerendered output (${appHtml.length} chars) — aborting.`);
  }

  // 3) Inject the rendered HTML into the built SPA shell. Everything else in
  //    index.html (SEO meta, JSON-LD, verification tag, CSS/JS asset links,
  //    PWA registration) is left untouched.
  const shell = fs.readFileSync(distIndex, 'utf8');
  const rootTag = /<div[^>]*id="root"[^>]*><\/div>/;
  if (!rootTag.test(shell)) {
    throw new Error('Could not find <div id="root"></div> in dist/index.html — did vite build run first?');
  }

  const finalHtml = shell.replace(rootTag, `<div id="root">${appHtml}</div>`);
  fs.writeFileSync(distIndex, finalHtml);

  console.log(`✅ Pre-rendered landing injected into dist/index.html (${appHtml.length} chars of HTML)`);
} finally {
  await vite.close();
}
