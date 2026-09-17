/**
 * Browser half of dsh-privacy-guard.
 *
 * This file is a FACTORY BODY, not a module: build.mjs inlines it (plus
 * lib/patterns.js) into the generated lib/client.js, so everything below runs
 * inside the module-loader factory closure where React and the rule helpers are
 * already in scope.
 *
 * It renders one contribution into conversation.composer.dock - the ambient
 * strip below the composer card - and stays silent unless the current draft
 * actually matches a rule.
 */

const h = React.createElement

/** Injected stylesheet owner id; removed when the plugin unloads. */
const STYLE_ID = 'dsh-privacy-guard-style'

const CSS = [
  '.dpg-root {',
  '  display: flex;',
  '  flex-wrap: wrap;',
  '  gap: 6px 10px;',
  '  align-items: center;',
  '  margin: 0 0 6px;',
  '  padding: 7px 10px;',
  '  border: 1px solid var(--dsw-alias-border-l2);',
  '  border-left-width: 3px;',
  '  border-radius: 10px;',
  '  background: var(--dsw-alias-bg-layer-1);',
  '  color: var(--dsw-alias-label-secondary);',
  '  font: 12px/1.5 ui-sans-serif, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;',
  '}',
  '.dpg-root[data-level="high"] { border-left-color: var(--dsw-alias-state-error-primary, #d14343); }',
  '.dpg-root[data-level="medium"] { border-left-color: var(--dsw-alias-state-warn-primary); }',
  '.dpg-root[data-level="low"] { border-left-color: var(--dsw-alias-border-l3, #9aa4b2); }',
  '.dpg-icon {',
  '  flex: none;',
  '  font-weight: 650;',
  '  color: var(--dsw-alias-label-primary);',
  '}',
  '.dpg-text { flex: 1 1 220px; min-width: 0; }',
  '.dpg-chips { display: flex; flex-wrap: wrap; gap: 4px; }',
  '.dpg-chip {',
  '  padding: 1px 7px;',
  '  border: 1px solid var(--dsw-alias-border-l2);',
  '  border-radius: 999px;',
  '  background: var(--dsw-alias-bg-layer-2, transparent);',
  '  font-variant-numeric: tabular-nums;',
  '  white-space: nowrap;',
  '}',
  '.dpg-chip--more { color: var(--dsw-alias-label-tertiary); }',
  '.dpg-btn {',
  '  flex: none;',
  '  padding: 3px 10px;',
  '  border: 1px solid var(--dsw-alias-border-l2);',
  '  border-radius: 999px;',
  '  background: transparent;',
  '  color: var(--dsw-alias-label-primary);',
  '  font: inherit;',
  '  cursor: pointer;',
  '}',
  '.dpg-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }',
  '.dpg-btn--ghost { color: var(--dsw-alias-label-tertiary); }',
  '@media (prefers-reduced-motion: no-preference) {',
  '  .dpg-root { animation: dpg-in .18s ease-out; }',
  '  @keyframes dpg-in { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: none; } }',
  '}',
].join('\n')

/**
 * The reminder strip: one line, the matched labels, and the two actions that
 * matter - mask it, or send it as it is.
 * @param props - session-scope slot props; useInput and inputActions are the
 *   only members this component reads.
 * @returns the strip element, or null when there is nothing to warn about.
 */
function PrivacyGuard(props) {
  const draft = props.useInput(function (state) { return state.draft })
  const hits = React.useMemo(function () { return scan(typeof draft === 'string' ? draft : '') }, [draft])
  const dismissed = React.useState('')
  const dismissedFor = dismissed[0]
  const setDismissedFor = dismissed[1]
  const actions = props.inputActions

  if (hits.length === 0) return null
  if (dismissedFor === draft) return null

  const level = worstLevel(hits) || 'low'
  const chips = hits.slice(0, 4).map(function (hit) {
    return h('span', { className: 'dpg-chip', key: hit.id + ':' + hit.start }, hit.label + ' ' + hit.sample)
  })
  if (hits.length > 4) {
    chips.push(h('span', { className: 'dpg-chip dpg-chip--more', key: 'more' }, '还有 ' + (hits.length - 4) + ' 处'))
  }

  return h('div', { className: 'dpg-root', 'data-level': level, role: 'status' },
    h('span', { className: 'dpg-icon' }, '隐私提醒'),
    h('span', { className: 'dpg-text' }, '这段内容里有 ' + hits.length + ' 处敏感信息（' + summarize(hits) + '）。确认没问题可以直接发送。'),
    h('span', { className: 'dpg-chips' }, chips),
    h('button', {
      type: 'button',
      className: 'dpg-btn',
      onClick: function () {
        if (actions && typeof actions.setDraft === 'function') actions.setDraft(redact(draft, hits))
      },
    }, '一键打码'),
    h('button', {
      type: 'button',
      className: 'dpg-btn dpg-btn--ghost',
      onClick: function () { setDismissedFor(draft) },
    }, '这次不管'),
  )
}

/** Cordis services this browser half waits for: the slot registry. */
const inject = ['slots']

/**
 * Register the reminder strip below the composer card, and keep the stylesheet
 * tied to this fiber's lifetime.
 * @param ctx - browser-half plugin context.
 */
function apply(ctx) {
  ctx.effect(function () {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = CSS
    document.head.append(style)
    return function () { style.remove() }
  }, 'privacy-guard: stylesheet')

  ctx.slots.inject('conversation.composer.dock', function () {
    return ctx.slots.register({ name: 'conversation.composer.dock', id: 'privacy-guard' }, PrivacyGuard)
  })
}
