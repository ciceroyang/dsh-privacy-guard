/**
 * One-step bundler for the browser half.
 *
 * The harness serves exports["./client"] as a plain classic script that
 * registers a factory on window.__ModuleLoader__; there is no build tool in
 * the loop. This script concatenates the shared rule module (with its export
 * keywords stripped, because the factory body is one function scope) with the
 * component source and wraps both in the loader handshake the shipped bundles
 * use.
 *
 * Run: node build.mjs (or npm run build) after editing either source.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const read = relative => readFileSync(join(root, relative), 'utf8')
const pkg = JSON.parse(read('package.json'))

const SOURCES = ['lib/patterns.js', 'client/index.js']
const EXPORTS = ['PrivacyGuard', 'apply', 'inject']

/** Drop ESM export keywords: the factory closure supplies one shared scope. */
const inlineModule = source => source.replace(/^export (?=(?:const|let|var|function|class)\b)/gm, '')

/** Indent every non-empty line so the generated factory body stays readable. */
const indent = (source, width) => {
  const pad = ' '.repeat(width)
  return source
    .split('\n')
    .map(line => (line.trim() === '' ? '' : pad + line))
    .join('\n')
}

const body = SOURCES.map(file => inlineModule(read(file))).join('\n')
const exportLines = EXPORTS.map(name => '\t\texports.' + name + ' = ' + name + ';').join('\n')

const bundle = [
  '/**',
  ' * GENERATED FILE - do not edit.',
  ' *',
  ' * Source: ' + SOURCES.join(' + '),
  ' * Rebuild: node build.mjs',
  ' */',
  'window.__ModuleLoader__.load({',
  '\tid: ' + JSON.stringify(pkg.name) + ',',
  '\tfactory: (require) => {',
  '\t\tvar module = { exports: {} };',
  '\t\tvar exports = module.exports;',
  '\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
  '\t\tconst React = require("react");',
  indent(body, 2),
  exportLines,
  '\t\treturn module.exports;',
  '\t}',
  '});',
  '',
].join('\n')

writeFileSync(join(root, 'lib/client.js'), bundle)
process.stdout.write(pkg.name + ': wrote lib/client.js (' + bundle.length + ' bytes)\n')
