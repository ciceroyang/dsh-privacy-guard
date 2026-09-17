/**
 * GENERATED FILE - do not edit.
 *
 * Source: lib/patterns.js + client/index.js
 * Rebuild: node build.mjs
 */
window.__ModuleLoader__.load({
	id: "dsh-privacy-guard",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");
  /**
   * Sensitive-content rules for dsh-privacy-guard.
   *
   * Pure data and pure functions: no DOM, no network, no dependencies, and no
   * clipboard or storage access. The browser half inlines this file and the host
   * half imports it, so both sides agree on exactly one rule set.
   *
   * A privacy reminder that fires on ordinary text is a reminder the user learns
   * to ignore. Every rule is therefore narrow, and the two rules whose shapes are
   * most common in innocent data - identity numbers and card numbers - carry a
   * checksum validator, so a number that merely looks right does not fire.
   *
   * @module dsh-privacy-guard/patterns
   */

  /** Severity ordering used for the banner colour and the summary line. */
  const LEVELS = ['low', 'medium', 'high']

  /**
   * GB 11643-1999 identity-number check digit (mod 11-2).
   * @param value - an 18-character candidate.
   * @returns whether the final digit matches the first seventeen.
   */
  function idCardChecksum(value) {
    const text = String(value)
    if (!/^[0-9]{17}[0-9Xx]$/.test(text)) return false
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    const codes = '10X98765432'
    let sum = 0
    for (let i = 0; i < 17; i += 1) sum += (text.charCodeAt(i) - 48) * weights[i]
    return codes.charAt(sum % 11) === text.charAt(17).toUpperCase()
  }

  /**
   * Luhn check digit, the checksum every payment card carries.
   * @param value - a candidate card number, separators allowed.
   * @returns whether the digits satisfy the checksum.
   */
  function luhn(value) {
    const digits = String(value).replace(/[^0-9]/g, '')
    if (digits.length < 12 || digits.length > 19) return false
    let sum = 0
    let double = false
    for (let i = digits.length - 1; i >= 0; i -= 1) {
      let digit = digits.charCodeAt(i) - 48
      if (double) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
      double = !double
    }
    return sum % 10 === 0
  }

  /**
   * One recognisable piece of personal or secret data.
   * - id: stable identifier, used by tests and by the dismiss bookkeeping.
   * - label: the Chinese label shown to the user.
   * - severity: 'high' for secrets and identity documents, 'low' for contact data.
   * - re: a global regular expression; lastIndex is reset before every use.
   * - keep: leading characters that may stay visible in the masked sample. The
   *   value 0 still shows a two-character prefix, which is enough to recognise
   *   which secret is at risk and not enough to leak it.
   * - validate: optional checksum gate applied to the raw match.
   */
  const RULES = [
    {
      id: 'private-key',
      label: '私钥内容',
      severity: 'high',
      keep: 0,
      re: /-----BEGIN [A-Z ]{0,40}PRIVATE KEY-----/g,
    },
    {
      id: 'api-key',
      label: 'API 密钥',
      severity: 'high',
      keep: 0,
      re: /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g,
    },
    {
      id: 'id-card',
      label: '身份证号',
      severity: 'high',
      keep: 4,
      re: /(?<![0-9])[1-9][0-9]{5}(?:19|20)[0-9]{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12][0-9]|3[01])[0-9]{3}[0-9Xx](?![0-9])/g,
      validate: idCardChecksum,
    },
    {
      id: 'bank-card',
      label: '银行卡号',
      severity: 'high',
      keep: 4,
      re: /(?<![0-9])(?:4[0-9]{3}|5[1-5][0-9]{2}|62[0-9]{2})(?:[ -]?[0-9]{4}){2,4}(?![0-9])/g,
      validate: luhn,
    },
    {
      id: 'phone-cn',
      label: '手机号',
      severity: 'medium',
      keep: 3,
      re: /(?<![0-9])1[3-9][0-9]{9}(?![0-9])/g,
    },
    {
      id: 'email',
      label: '邮箱地址',
      severity: 'low',
      keep: 2,
      re: /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+){1,4}(?![A-Za-z0-9.-])/g,
    },
    {
      id: 'ipv4',
      label: 'IP 地址',
      severity: 'low',
      keep: 0,
      re: /(?<![0-9.])(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(?:\.(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}(?![0-9.])/g,
    },
  ]

  /** Number of configured rules, for the host-side boot line. */
  function ruleCount() {
    return RULES.length
  }

  /**
   * Replace the middle of one matched value with asterisks.
   * @param value - the matched text.
   * @param keep - leading characters that may stay visible.
   * @returns a short, recognisable, non-reversible sample.
   */
  function maskValue(value, keep) {
    const text = String(value)
    const head = Math.max(0, Math.min(Number(keep) || 0, 6))
    if (text.length <= head + 2) return text.slice(0, Math.max(1, head)) + '***'
    return text.slice(0, Math.max(head, 2)) + '***' + text.slice(-2)
  }

  /**
   * Find every configured pattern in one draft.
   * Overlapping matches keep the earliest, which is the longest in practice
   * because the rule list runs from most specific to least specific.
   * @param text - the draft the user is about to send.
   * @returns matches in position order, each with a masked sample.
   */
  function scan(text) {
    if (typeof text !== 'string' || text.length === 0) return []
    const found = []
    for (const rule of RULES) {
      const re = new RegExp(rule.re.source, rule.re.flags)
      let match
      while ((match = re.exec(text)) !== null) {
        if (match[0].length === 0) {
          re.lastIndex += 1
          continue
        }
        if (typeof rule.validate === 'function' && !rule.validate(match[0])) continue
        found.push({
          id: rule.id,
          label: rule.label,
          severity: rule.severity,
          start: match.index,
          end: match.index + match[0].length,
          sample: maskValue(match[0], rule.keep),
        })
      }
    }
    found.sort(function (a, b) { return a.start - b.start || b.end - a.end })
    const kept = []
    let cursor = -1
    for (const hit of found) {
      if (hit.start >= cursor) {
        kept.push(hit)
        cursor = hit.end
      }
    }
    return kept
  }

  /**
   * The matches as one human-readable line, e.g. "手机号 x1、邮箱地址 x2".
   * @param hits - matches from scan().
   * @returns the summary, or an empty string when there is nothing to say.
   */
  function summarize(hits) {
    if (!Array.isArray(hits) || hits.length === 0) return ''
    const counts = new Map()
    for (const hit of hits) counts.set(hit.label, (counts.get(hit.label) || 0) + 1)
    return Array.from(counts).map(function (entry) { return entry[0] + ' x' + entry[1] }).join('、')
  }

  /**
   * The most severe level among the matches.
   * @param hits - matches from scan().
   * @returns 'high', 'medium', 'low', or null when there are no matches.
   */
  function worstLevel(hits) {
    if (!Array.isArray(hits) || hits.length === 0) return null
    let worst = 'low'
    for (const hit of hits) {
      if (LEVELS.indexOf(hit.severity) > LEVELS.indexOf(worst)) worst = hit.severity
    }
    return worst
  }

  /**
   * Rewrite the draft with every match replaced by a labelled placeholder.
   * @param text - the original draft.
   * @param hits - matches from scan(), which carry the offsets used here.
   * @returns the text the composer should hold after masking.
   */
  function redact(text, hits) {
    if (typeof text !== 'string') return text
    if (!Array.isArray(hits) || hits.length === 0) return text
    let out = ''
    let cursor = 0
    for (const hit of hits) {
      if (hit.start < cursor) continue
      out += text.slice(cursor, hit.start) + '[' + hit.label + '已打码]'
      cursor = hit.end
    }
    return out + text.slice(cursor)
  }

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

		exports.PrivacyGuard = PrivacyGuard;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
