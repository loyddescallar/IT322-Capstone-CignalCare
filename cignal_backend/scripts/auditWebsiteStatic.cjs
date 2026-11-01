'use strict';
/*
 * CignalCare+ non-destructive release check.
 * Reads frontend/backend source only. No DB access, network requests or secrets.
 * Coverage: declared pages, static navigation, bundled public assets,
 * relative imports, frontend axios calls and Express API route definitions.
 * Does NOT replace browser testing or production verification.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const FRONTEND = path.join(ROOT, 'Cignal_Frontend');
const SOURCE = path.join(FRONTEND, 'src');
const BACKEND = path.join(ROOT, 'cignal_backend');

function filesInside(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesInside(name);
    return entry.isFile() && /\.(jsx?|mjs|css)$/.test(entry.name) ? [name] : [];
  });
}

function fileExistsForImport(importer, reference) {
  if (!reference.startsWith('.')) return true;
  const target = path.resolve(path.dirname(importer), reference);
  return [target, ...['.js', '.jsx', '.mjs', '.css', '.json'].map((ext) => target + ext),
    ...['index.js', 'index.jsx', 'index.mjs'].map((f) => path.join(target, f))]
    .some((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

function pagePattern(route) {
  return new RegExp('^' + route.split('/').map((segment) => {
    if (segment.startsWith(':')) return '[^/]+';
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/') + '$');
}

function getFrontendPaths(source) {
  const found = new Set();
  const expressions = [
    /\bnavigate\(\s*(['"`])(\/[^'"`]+)\1/g,
    /\b(?:to|path)\s*[:=]\s*(['"`])(\/[^'"`]+)\1/g,
    /\b(?:to|path)\s*=\s*\{\s*(['"`])(\/[^'"`]+)\1/g,
  ];
  for (const regex of expressions) {
    for (const match of source.matchAll(regex)) {
      const href = match[2];
      if (/^\/(?:admin|user|troubleshoot|login|register|change-password|forgot-password|report-problem)(?:\/|$)/.test(href)) {
        let pathname = href.split('?')[0].replace(/\$\{[^}]+\}/g, 'CHECK_VALUE');
        // For code such as navigate('/admin/customers/' + id).
        if (pathname.endsWith('/')) pathname += 'CHECK_VALUE';
        found.add(pathname);
      }
    }
  }
  return [...found];
}

function audit() {
  const errors = [];
  const warnings = [];
  const stats = { frontendFiles: 0, pageRoutes: 0, navigationTargets: 0, publicAssetReferences: 0, relativeImports: 0, apiCalls: 0, backendApiRoutes: 0 };
  if (!fs.existsSync(SOURCE) || !fs.existsSync(BACKEND)) return { errors: ['Frontend or backend source folder not found. Run from the complete project, not a patch-only folder.'], warnings, stats };

  const app = fs.readFileSync(path.join(SOURCE, 'App.jsx'), 'utf8');
  const routes = [...app.matchAll(/<Route\s+path=['"]([^'"]+)['"]/g)].map((m) => m[1]).filter((x) => x !== '*');
  const patterns = routes.map(pagePattern);
  stats.pageRoutes = routes.length;

  const mounts = new Map();
  const server = fs.readFileSync(path.join(BACKEND, 'server.js'), 'utf8');
  for (const match of server.matchAll(/app\.use\(\s*['"](\/api\/[^'"]+)['"]\s*,\s*(\w+)\s*\)/g)) mounts.set(match[2], match[1]);
  const routeMethods = [];
  for (const line of fs.readdirSync(path.join(BACKEND, 'routes'))) {
    if (!line.endsWith('.js')) continue;
    const text = fs.readFileSync(path.join(BACKEND, 'routes', line), 'utf8');
    const routerVar = line.replace('Routes.js', 'Routes');
    const prefix = mounts.get(routerVar);
    if (!prefix) continue;
    for (const match of text.matchAll(/router\.(get|post|put|patch|delete)\(\s*['"](\/[^'"]*)['"]/g)) {
      routeMethods.push({ method: match[1], path: prefix.replace(/^\/api(?=\/|$)/, '') + (match[2] === '/' ? '' : match[2]) });
    }
  }
  stats.backendApiRoutes = routeMethods.length;

  for (const filename of filesInside(SOURCE)) {
    const rel = path.relative(ROOT, filename).replace(/\\/g, '/');
    const text = fs.readFileSync(filename, 'utf8');
    stats.frontendFiles++;

    for (const link of getFrontendPaths(text)) {
      stats.navigationTargets++;
      if (!patterns.some((pattern) => pattern.test(link))) errors.push(`Unmatched page route ${link} in ${rel}`);
    }

    for (const match of text.matchAll(/['"`]((?:\/(?:images|video|templates)\/)[^'"`?\s)]+)(?:\?[^'"`]*)?['"`]/g)) {
      const file = match[1];
      stats.publicAssetReferences++;
      if (!fs.existsSync(path.join(FRONTEND, 'public', file.slice(1)))) errors.push(`Missing public asset ${file} referenced in ${rel}`);
    }

    const imports = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])(\.[^'"]+)\1/g;
    for (const match of text.matchAll(imports)) {
      stats.relativeImports++;
      if (!fileExistsForImport(filename, match[2])) errors.push(`Missing source import ${match[2]} in ${rel}`);
    }

    // Static backend contract check; dynamically built URLs still need live testing.
    for (const match of text.matchAll(/axiosClient\.(get|post|put|patch|delete)\(\s*(['"`])(\/[^'"`\r\n]+)\2/g)) {
      const method = match[1];
      const captured = match[3];
      const endpoint = captured.split('?')[0].replace(/\$\{[^}]+\}/g, 'CHECK_VALUE');
      const isPrefix = endpoint.endsWith('/');
      stats.apiCalls++;
      const matched = routeMethods.some((route) => {
        if (route.method !== method) return false;
        const normalized = route.path.split('/').map((part) => part.startsWith(':') ? 'CHECK_VALUE' : part).join('/');
        return isPrefix ? normalized.startsWith(endpoint) : normalized === endpoint;
      });
      if (!matched) errors.push(`Unmatched ${method.toUpperCase()} API ${captured} in ${rel}`);
    }
  }
  const vercelConfig = path.join(FRONTEND, 'vercel.json');
  if (!fs.existsSync(vercelConfig)) warnings.push('Missing Vercel configuration; direct SPA refresh may fail.');
  else {
    try {
      const config = JSON.parse(fs.readFileSync(vercelConfig, 'utf8'));
      if (!config.rewrites?.some((rule) => rule.destination === '/index.html')) warnings.push('Vercel has no index.html SPA rewrite for deep links.');
    } catch { errors.push('Invalid Vercel configuration JSON.'); }
  }
  return { errors, warnings, stats };
}

if (require.main === module) {
  const result = audit();
  console.log('CignalCare+ static website audit (read-only)');
  for (const [name, value] of Object.entries(result.stats)) console.log(`  ${name}: ${value}`);
  result.warnings.forEach((message) => console.warn(`WARNING: ${message}`));
  result.errors.forEach((message) => console.error(`FAIL: ${message}`));
  console.log(result.errors.length ? `FAIL: ${result.errors.length} static issues` : 'PASS: no unresolved static navigation, API, import or public asset references');
  if (result.errors.length) process.exitCode = 1;
}

module.exports = { audit };
