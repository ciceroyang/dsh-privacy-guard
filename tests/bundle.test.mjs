/**
 * Contract test for the generated browser bundle.
 *
 * The bundle is a classic script that registers a factory on
 * window.__ModuleLoader__. Running it here against a stub loader, a stub React
 * and a stub slot registry proves three things without a browser: the bundle is
 * syntactically valid, it registers under the package name, and apply() wires
 * the component into the slot this plugin claims.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadBundle() {
  let registration = null
  globalThis.window = { __ModuleLoader__: { load(reg) { registration = reg } } }
  const react = {
    createElement: function () {
      return { type: arguments[0], props: arguments[1] || {}, children: Array.prototype.slice.call(arguments, 2) }
    },
    useMemo: function (fn) { return fn() },
    useState: function (initial) { return [typeof initial === 'function' ? initial() : initial, function () {}] },
    useEffect: function () {},
    useRef: function (value) { return { current: value } },
  }
  const code = readFileSync(join(root, 'lib/client.js'), 'utf8')
  new Function(code)()
  assert.ok(registration, 'the bundle must register with the module loader')
  const mod = registration.factory(function (name) {
    if (name === 'react') return react
    throw new Error('unexpected require: ' + name)
  })
  return { registration, mod }
}

function findByText(node, text) {
  if (node === null || node === undefined) return null
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findByText(child, text)
      if (hit) return hit
    }
    return null
  }
  if (typeof node !== 'object') return null
  if (node.children && node.children.indexOf(text) !== -1 && typeof node.props.onClick === 'function') return node
  return findByText(node.children, text)
}

test('the generated bundle registers under the package name', () => {
  const { registration } = loadBundle()
  assert.equal(registration.id, 'dsh-privacy-guard')
})

test('the client half declares the slot service and registers the composer strip', () => {
  const { mod } = loadBundle()
  assert.deepEqual(mod.inject, ['slots'])
  const injected = []
  const registered = []
  let style = null
  globalThis.document = {
    createElement: function () { style = { id: '', textContent: '', remove: function () {} }; return style },
    head: { append: function () {} },
  }
  const ctx = {
    effect: function (fn, label) {
      assert.equal(typeof label, 'string')
      assert.equal(typeof fn(), 'function')
    },
    slots: {
      inject: function (name, cb) { injected.push(name); cb() },
      register: function (options, Component) { registered.push({ options, Component }); return function () {} },
    },
  }
  mod.apply(ctx)
  assert.deepEqual(injected, ['conversation.composer.dock'])
  assert.equal(registered.length, 1)
  assert.equal(registered[0].options.name, 'conversation.composer.dock')
  assert.equal(registered[0].options.id, 'privacy-guard')
  assert.equal(typeof registered[0].Component, 'function')
  assert.ok(style && style.id === 'dsh-privacy-guard-style')
  assert.ok(style.textContent.indexOf('dpg-root') !== -1)
})

test('the strip stays silent without a match and appears with one', () => {
  const { mod } = loadBundle()
  const idle = { useInput: function () { return '' }, inputActions: { setDraft: function () {} } }
  assert.equal(mod.PrivacyGuard(idle), null)
  const active = { useInput: function () { return '身份证 11010519491231002X' }, inputActions: { setDraft: function () {} } }
  const node = mod.PrivacyGuard(active)
  assert.ok(node, 'a matching draft must render the strip')
  assert.equal(node.props['data-level'], 'high')
})

test('the mask button hands the redacted draft back to the composer', () => {
  const { mod } = loadBundle()
  const written = []
  const props = {
    useInput: function () { return '电话 13800138000，身份证 11010519491231002X' },
    inputActions: { setDraft: function (text) { written.push(text) } },
  }
  const node = mod.PrivacyGuard(props)
  const button = findByText(node, '一键打码')
  assert.ok(button, 'the strip must offer a mask action')
  button.props.onClick()
  assert.equal(written.length, 1)
  assert.ok(written[0].indexOf('[手机号已打码]') !== -1)
  assert.ok(written[0].indexOf('[身份证号已打码]') !== -1)
  assert.ok(written[0].indexOf('13800138000') === -1)
})
