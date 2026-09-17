/**
 * Host half of dsh-privacy-guard.
 *
 * The check itself runs in the browser, where the draft actually lives, so this
 * half owns no service and touches no request path. It exists to be a real
 * loader entry and to print the armed rule count once at boot, which is the
 * only place an operator can see which rules this build ships.
 *
 * @module dsh-privacy-guard
 */

import { ruleCount, RULES } from './lib/patterns.js'

/**
 * Announce the rules this build ships.
 * @param ctx - host plugin context.
 */
export function apply(ctx) {
  ctx.logger?.info?.('privacy-guard: 发送前隐私检查已挂载 - ' + ruleCount() + ' 条规则 (' + RULES.map(function (rule) { return rule.id }).join(', ') + ')')
}
