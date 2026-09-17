# dsh-privacy-guard · 发送前隐私提醒

在 DeepSeek Harness 里，你准备把手机号、身份证号、银行卡号或 API 密钥发给模型之前，输入框下方会
出现一条提醒，并提供「一键打码」。

它是给**非安全专业的人**用的：不说教、不拦截发送，没匹配到东西的时候完全不出现。

## 能识别什么

| 规则 | 级别 | 说明 |
| --- | --- | --- |
| `private-key` | 高 | PEM 私钥头 |
| `api-key` | 高 | `sk-`、`ghp_` 等 GitHub token、`AKIA`、`AIza`、`xox?` |
| `id-card` | 高 | 18 位身份证号，**校验位必须正确** |
| `bank-card` | 高 | 13-19 位卡号（允许空格或短横线），**必须通过 Luhn 校验** |
| `phone-cn` | 中 | 中国大陆手机号 |
| `email` | 低 | 邮箱地址 |
| `ipv4` | 低 | 点分十进制 IP |

身份证和银行卡两条规则带校验位，正是因为这两种"形状"在正常内容里太常见：长得像卡号的 16 位订单号、
长得像身份证的长数字，都不会误报。

## 安装

需要 Node.js 20 或更新版本，以及 DeepSeek Harness 的 web profile。

    dsh plugin --profile web add github:ciceroyang/dsh-privacy-guard#v0.1.1

一条命令就装好并挂载：manifest 里声明了 `dsh.bundle`，profile 会把它加入 loader 树，浏览器端
则通过 `exports["./client"]` 提供。

想从本地源码目录加载，就手动挂：

    ln -sfn "$PWD/dsh-privacy-guard" ~/.dsh/profiles/web/node_modules/dsh-privacy-guard
    # 然后写进 ~/.dsh/profiles/web/cordis.patch.yml
    - insert:
        - id: privacy-guard
          name: dsh-privacy-guard

web profile 会热重载 patch，之后刷新页面即可。

无需构建：浏览器端产物已提交在仓库里，直接加载。

## 它不做什么

- **不往任何地方发送内容。** 检查全部在你的浏览器里、对草稿文本完成，不发网络请求、不写存储；卸载即无痕。
- **不阻止发送。** 决定权始终在你：可以打码，也可以照发。
- **不是万无一失。** 规则只认它认识的样子；没见过的密钥格式会漏过。把它当第二双眼睛，别当 DLP 系统。

## 说明

- 提示里只显示前 2 位和后 2 位，中间部分不会进入界面、日志或 DOM。
- 「这次不管」只对当前这段草稿生效；改动草稿后提醒会回来。
- 规则就是 `lib/patterns.js` 里的纯数据，加一条 = 改数据 + 加测试。

## 测试

    node build.mjs && node --test

CI 还会重新构建一次，如果提交的 `lib/client.js` 和源码不一致就直接失败。

## 许可

MIT。维护者 [@ciceroyang](https://github.com/ciceroyang)。
