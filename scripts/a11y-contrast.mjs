#!/usr/bin/env node
/**
 * DukaHub V2 — WCAG contrast audit (equivalent of Lighthouse "Color Contrast" + axe color-contrast).
 * Parses the design tokens in src/index.css and computes contrast ratios for the
 * meaningful text-on-background pairs, in both dark and light themes.
 *
 * Usage: node scripts/a11y-contrast.mjs
 * Exit code 1 if any required pair fails (4.5:1 normal text, 3:1 large text).
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'src/index.css'), 'utf8');

// ── Token parsing ──
function extractVars(block) {
  const vars = {};
  const re = /(--[\w-]+):\s*([^;]+);/g;
  let m;
  while ((m = re.exec(block))) vars[m[1]] = m[2].trim();
  return vars;
}

const darkBlock = css.match(/:root,\s*\.dark\s*\{([\s\S]*?)\}/)[1];
const lightBlock = css.match(/\.light\s*\{([\s\S]*?)\}/)[1];
const dark = extractVars(darkBlock);
const light = extractVars(lightBlock);

// ── Color math ──
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function parseRgba(v) {
  const m = v.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\)/);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), m[4] === undefined ? 1 : parseFloat(m[4])];
}
function blend(rgb, base, alpha) {
  return rgb.map((c, i) => Math.round(c * alpha + base[i] * (1 - alpha)));
}
function parseColor(v, vars) {
  v = v.trim();
  if (v.startsWith('#')) return hexToRgb(v);
  const rgba = parseRgba(v);
  if (rgba) return rgba;
  if (v.startsWith('var(--')) {
    const name = v.match(/var\(--([\w-]+)/)[1];
    return parseColor(vars['--' + name] || '#000000', vars);
  }
  if (v.startsWith('--')) return parseColor(vars[v] || '#000000', vars);
  return [0, 0, 0];
}
function lum(rgb) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = rgb.map(f);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(fg, bg) {
  const l1 = lum(fg), l2 = lum(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Blend a token color over a base (e.g. glass card over body) then return hex rgb
function resolveOn(token, baseToken, vars, alphaOverride) {
  const raw = parseColor(token, vars);
  const base = parseColor(baseToken, vars);
  const alpha = alphaOverride !== undefined ? alphaOverride : (raw.length === 4 ? raw[3] : 1);
  return blend([raw[0], raw[1], raw[2]], base, alpha);
}

// Tinted background: e.g. rgba(success, 0.12) over a surface
function tintedBg(colorToken, tintAlpha, baseToken, vars) {
  const c = parseColor(colorToken, vars);
  const base = parseColor(baseToken, vars);
  return blend([c[0], c[1], c[2]], base, tintAlpha);
}

// ── Audit pairs ──
// { fg, bg, base?, tint?, label, large? }
// bg values are resolved over the body/surface base where they're glass.
const PAIRS = [
  // Core text hierarchy on real surfaces
  { fg: '--text-primary', bg: '--bg-primary', label: 'body text on body' },
  { fg: '--text-primary', bg: '--bg-surface', label: 'body text on surface' },
  { fg: '--text-secondary', bg: '--bg-primary', label: 'secondary text on body' },
  { fg: '--text-secondary', bg: '--bg-surface', label: 'secondary text on surface' },
  { fg: '--text-secondary', bg: '--bg-surface2', label: 'secondary text on surface2' },
  { fg: '--text-muted', bg: '--bg-primary', label: 'muted text on body' },
  { fg: '--text-muted', bg: '--bg-surface', label: 'muted text on surface' },
  { fg: '--text-muted', bg: '--bg-surface2', label: 'muted text on surface2' },
  { fg: '--text-muted', bg: '--bg-surface', base: '--bg-primary', label: 'muted text on card (glass)' },
  { fg: '--text-muted', bg: '--bg-surface2', base: '--bg-primary', label: 'muted text on item (glass)' },
  // Accent / brand as text
  { fg: '--text-accent', bg: '--bg-surface', label: 'accent text on surface' },
  { fg: '--accent-primary', bg: '--bg-surface', label: 'brand text on surface' },
  { fg: '--accent-primary', bg: '--bg-surface', base: '--bg-primary', label: 'brand text on card' },
  // Badges (small text on 12% tint over surface)
  { fg: '--color-success', bg: '--color-success', base: '--bg-surface', tint: 0.12, label: 'success badge text' },
  { fg: '--color-danger', bg: '--color-danger', base: '--bg-surface', tint: 0.12, label: 'danger badge text' },
  { fg: '--color-warning', bg: '--color-warning', base: '--bg-surface', tint: 0.12, label: 'warning badge text' },
  { fg: '--color-info', bg: '--color-info', base: '--bg-surface', tint: 0.12, label: 'info badge text' },
  // Alerts (10% tint)
  { fg: '--color-success', bg: '--color-success', base: '--bg-surface', tint: 0.1, label: 'success alert text' },
  { fg: '--color-danger', bg: '--color-danger', base: '--bg-surface', tint: 0.1, label: 'danger alert text' },
  { fg: '--color-warning', bg: '--color-warning', base: '--bg-surface', tint: 0.1, label: 'warning alert text' },
  // Secondary buttons / tabs (text on tinted button bg over surface)
  { fg: '--text-secondary', bg: '--btn-secondary-bg', base: '--bg-surface', label: 'secondary button text' },
  { fg: '--btn-primary-text', bg: '--btn-primary-bg', label: 'primary button text' },
  // Inputs
  { fg: '--text-primary', bg: '--glass-input-bg', base: '--bg-surface', label: 'input text' },
];

const results = [];
let failed = 0;

for (const theme of ['dark', 'light']) {
  const vars = theme === 'dark' ? dark : light;
  console.log(`\n━━━ ${theme.toUpperCase()} THEME ━━━`);
  for (const p of PAIRS) {
    let fg = parseColor(p.fg, vars);
    let bg;
    if (p.tint !== undefined) {
      bg = tintedBg(p.bg, p.tint, p.base || p.bg, vars);
    } else if (p.base) {
      bg = resolveOn(p.bg, p.base, vars);
    } else {
      bg = resolveOn(p.bg, '--bg-primary', vars);
    }
    const ratio = contrast(fg, bg);
    const need = p.large ? 3.0 : 4.5;
    const ok = ratio >= need;
    if (!ok) failed++;
    results.push({ theme, label: p.label, ratio, ok, need });
    console.log(`  ${ok ? '✅' : '❌'} ${p.label.padEnd(30)} ${ratio.toFixed(2)}:1  (need ${need}:1)`);
  }
}

console.log(`\n${failed === 0 ? '✅ ALL PAIRS PASS' : `❌ ${failed} PAIRS FAIL`}`);
process.exit(failed === 0 ? 0 : 1);
