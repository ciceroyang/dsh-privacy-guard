# dsh-privacy-guard

A send-time privacy reminder for DeepSeek Harness: before you hand a phone number, an ID number, a
card number or an API key to a model, a strip appears under the composer and offers to mask it.

Built for people who are not security professionals. It does not lecture, it does not block the send,
and it stays completely silent until the text actually matches something.

## What it catches

| rule | severity | note |
| --- | --- | --- |
| `private-key` | high | a PEM private-key header |
| `api-key` | high | `sk-`, `ghp_`/`gho_`/`ghu_`/`ghs_`/`ghr_`, `github_pat_`, `AKIA`, `AIza`, `xox?` |
| `id-card` | high | 18-digit ID number, **checksum verified** |
| `bank-card` | high | 13-19 digits with optional spaces or dashes, **Luhn verified** |
| `phone-cn` | medium | mainland mobile number |
| `email` | low | email address |
| `ipv4` | low | dotted-quad IP address |

The two checksum-verified rules exist because their shapes are common in innocent data. A 16-digit
order number that looks like a card, or a long numeric id that looks like an ID number, does not fire.

## Install

Requires Node.js 20 or newer and a DeepSeek Harness web profile.

    dsh plugin --profile web add github:ciceroyang/dsh-privacy-guard#v0.1.1

One command installs the package and mounts it: the manifest declares `dsh.bundle`, so the
profile adds the package to its loader tree, and the browser half is served from
`exports["./client"]`.

From a local checkout instead, mount it by hand:

    ln -sfn "$PWD/dsh-privacy-guard" ~/.dsh/profiles/web/node_modules/dsh-privacy-guard
    # then in ~/.dsh/profiles/web/cordis.patch.yml
    - insert:
        - id: privacy-guard
          name: dsh-privacy-guard

The web profile reloads the patch live; refresh the page afterwards.

No build step: the browser bundle is committed and served as-is.

## What it does not do

- **It does not send anything anywhere.** The scan runs in your browser, on the draft text, with no
  network call and no storage write. Uninstalling the plugin removes every trace of it.
- **It does not block the send.** You stay in charge: mask it, or press send anyway.
- **It is not a guarantee.** Pattern matching finds the shapes it knows. A secret it has never seen
  the shape of will pass. Treat it as a second pair of eyes, not as a data-loss-prevention system.

## Notes

- Masked samples only ever show a two-character prefix and a two-character suffix. The middle never
  reaches the screen, the logs or the DOM.
- "Ignore" silences the strip for the current draft only; editing the draft brings it back.
- Rules live in `lib/patterns.js` as plain data. Adding one is a data change plus a test.

## Test

    node build.mjs && node --test

CI also rebuilds the bundle and fails if the committed `lib/client.js` differs from its sources.

## Licence

MIT. Maintained by [@ciceroyang](https://github.com/ciceroyang).
