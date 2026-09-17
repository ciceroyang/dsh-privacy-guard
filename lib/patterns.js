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
export const LEVELS = ['low', 'medium', 'high']

/**
 * GB 11643-1999 identity-number check digit (mod 11-2).
 * @param value - an 18-character candidate.
 * @returns whether the final digit matches the first seventeen.
 */
export function idCardChecksum(value) {
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
export function luhn(value) {
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
export const RULES = [
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
export function ruleCount() {
  return RULES.length
}

/**
 * Replace the middle of one matched value with asterisks.
 * @param value - the matched text.
 * @param keep - leading characters that may stay visible.
 * @returns a short, recognisable, non-reversible sample.
 */
export function maskValue(value, keep) {
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
export function scan(text) {
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
export function summarize(hits) {
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
export function worstLevel(hits) {
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
export function redact(text, hits) {
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
