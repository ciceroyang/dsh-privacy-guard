import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scan, redact, maskValue, summarize, worstLevel, luhn, idCardChecksum, ruleCount } from '../lib/patterns.js'

const ids = hits => hits.map(h => h.id)

test('the catalogue is non-trivial and every rule has a distinct id', () => {
  assert.ok(ruleCount() >= 6)
})

test('an identity number fires only when its check digit is right', () => {
  assert.deepEqual(ids(scan('身份证 11010519491231002X 请核对')), ['id-card'])
  // Same shape, last digit wrong by one: the checksum must reject it.
  assert.deepEqual(scan('身份证 110105194912310021 请核对'), [])
})

test('a card number fires only when it satisfies Luhn', () => {
  assert.deepEqual(ids(scan('卡号 4111 1111 1111 1111')), ['bank-card'])
  assert.deepEqual(scan('卡号 4111 1111 1111 1112'), [])
})

test('Luhn rejects short and over-long digit runs', () => {
  assert.equal(luhn('411111111111'), false)
  assert.equal(luhn('41111111111111111111'), false)
  assert.equal(luhn('4111111111111111'), true)
  assert.equal(idCardChecksum('11010519491231002x'), true)
})

test('phone, key, private-key, email and IP each fire on a realistic sample', () => {
  assert.deepEqual(ids(scan('联系我 13800138000，谢谢')), ['phone-cn'])
  assert.deepEqual(ids(scan('key sk-abcdefghijklmnopqrstuvwxyz01')), ['api-key'])
  assert.deepEqual(ids(scan('token ghp_' + 'a'.repeat(36))), ['api-key'])
  assert.deepEqual(ids(scan('AKIAIOSFODNN7EXAMPLE')), ['api-key'])
  assert.deepEqual(ids(scan('-----BEGIN RSA PRIVATE KEY-----')), ['private-key'])
  assert.deepEqual(ids(scan('发到 someone@example.com 就行')), ['email'])
  assert.deepEqual(ids(scan('服务器 192.168.1.1 挂了')), ['ipv4'])
})

test('ordinary text produces nothing', () => {
  for (const text of [
    '今天 2026 年 9 月 17 日，版本 1.2.3',
    '订单号 202609170001 已发货',
    '会议 13:00 开始，预计 90 分钟',
    '第一章 第 3 节',
    '价格 1288 元，折扣 0.85',
    '1.2.3.4.5 不是 IP',
  ]) {
    assert.deepEqual(scan(text), [], 'unexpected hit in: ' + text)
  }
})

test('empty and non-string input is safe', () => {
  assert.deepEqual(scan(''), [])
  assert.deepEqual(scan(undefined), [])
  assert.deepEqual(scan(null), [])
  assert.deepEqual(scan(12345), [])
})

test('a masked sample never contains the middle of the secret', () => {
  const hits = scan('key sk-abcdefghijklmnopqrstuvwxyz01 end')
  assert.equal(hits.length, 1)
  assert.ok(hits[0].sample.startsWith('sk'))
  assert.ok(!hits[0].sample.includes('cdefghijklmnop'))
  assert.ok(hits[0].sample.includes('***'))
})

test('maskValue keeps a short value recognisable without leaking it', () => {
  assert.equal(maskValue('13800138000', 3), '138***00')
  assert.equal(maskValue('sk-abcdefghijklmnopqrstuvwxyz01', 0), 'sk***01')
})

test('a number embedded in a longer digit run is not extracted', () => {
  assert.deepEqual(scan('1380013800013800138000'), [])
  assert.deepEqual(scan('订单 2026091700010013800138000'), [])
})

test('two separated matches both survive, in position order, without overlap', () => {
  const hits = scan('先打 13800138000，备用 13900139000')
  assert.equal(hits.length, 2)
  assert.ok(hits[0].start < hits[1].start)
  for (let i = 1; i < hits.length; i += 1) assert.ok(hits[i].start >= hits[i - 1].end)
})

test('redact replaces exactly the matched spans and keeps the rest', () => {
  const text = '身份证 11010519491231002X，电话 13800138000。'
  const hits = scan(text)
  const out = redact(text, hits)
  assert.equal(out, '身份证 [身份证号已打码]，电话 [手机号已打码]。')
  assert.ok(!out.includes('11010519491231002X'))
  assert.ok(!out.includes('13800138000'))
})

test('redact without hits returns the text unchanged', () => {
  assert.equal(redact('没有敏感信息', []), '没有敏感信息')
  assert.equal(redact('', []), '')
})

test('summarize and worstLevel describe the match set', () => {
  const hits = scan('电话 13800138000 邮箱 a@b.com 邮箱 c@d.com')
  assert.equal(summarize(hits), '手机号 x1、邮箱地址 x2')
  assert.equal(worstLevel(hits), 'medium')
  assert.equal(worstLevel([]), null)
  assert.equal(worstLevel(scan('AKIAIOSFODNN7EXAMPLE')), 'high')
})
