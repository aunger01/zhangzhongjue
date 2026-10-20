#!/usr/bin/env node
/**
 * 把 dist-offline/ 的「外链多文件」内联成「真·单文件 HTML」。
 *
 * 用法：先 `npm run build:offline`，再 `npm run build:single`
 * 产出：dist-offline/掌中诀-单文件版.html —— 双击 / 邮件 / 微信分发即可用，
 *      无服务器、无外部依赖、断网可跑。
 *
 * 三个必须记住的坑（踩过）：
 * 1. 内联 <script> 的 defer 会被浏览器忽略（defer 只对外部脚本生效）。
 *    若留在 <head> 里就会同步执行，此时 #root 还没解析 → 挂载失败。故必须挪到 </body> 前。
 * 2. 内联脚本里若出现字面量 </script>，HTML 解析器会提前截断，必须转义成 <\/script>。
 * 3. **String.replace 的替换串不是纯文本**：`$&`、`` $` ``、`$'`、`$$` 会被当成特殊指令，
 *    而压缩后的 JS 里 `$&` 这类序列满地都是，直接传字符串会把 500 KB 代码搅碎成语法错误
 *    （症状：控制台 `Unexpected token '<'`，页面白屏）。故一律用**函数式替换** `() => replacement`。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const SRC_DIR = resolve(process.cwd(), 'dist-offline');
const OUT = join(SRC_DIR, '掌中诀-单文件版.html');

const html = readFileSync(join(SRC_DIR, 'index.html'), 'utf8');
const js = readFileSync(join(SRC_DIR, 'app.js'), 'utf8').replaceAll('</script>', '<\\/script>');
const css = readFileSync(join(SRC_DIR, 'app.css'), 'utf8').replaceAll('</style>', '<\\/style>');
const svg = readFileSync(join(SRC_DIR, 'favicon.svg')).toString('base64');

/** 期望恰好命中一次，否则说明构建产物结构变了，直接失败而不是产出半成品 */
function replaceOnce(source, pattern, replacement, label) {
  const hits = source.match(pattern);
  const count = hits ? hits.length : 0;
  console.log(`替换 ${label.padEnd(28)} 命中=${count}`);
  if (count !== 1) throw new Error(`期望 ${label} 恰好命中 1 次，实际 ${count} 次`);
  // 必须传函数：字符串替换串里的 $& / $` / $' / $$ 会被当成特殊指令，毁掉压缩后的 JS
  return source.replace(pattern, () => replacement);
}

let out = html;
out = replaceOnce(
  out,
  /<link rel="icon" type="image\/svg\+xml" href="\.\/favicon\.svg"\s*\/?>/,
  `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${svg}" />`,
  'favicon → data URI',
);
out = replaceOnce(
  out,
  /<link rel="stylesheet" href="\.\/app\.css"\s*\/?>/,
  `<style>\n${css}\n</style>`,
  'app.css → <style>',
);
out = replaceOnce(out, /\s*<script defer src="\.\/app\.js"><\/script>/, '', '摘除 <head> 脚本');
out = replaceOnce(out, /<\/body>/, `<script>\n${js}\n</script>\n  </body>`, '脚本 → </body> 前');

// 兜底核验：不得再残留任何相对外链，否则不是「单文件」
const leftovers = ['src="./', 'href="./', "src='./", "href='./"].filter((t) => out.includes(t));
if (leftovers.length) throw new Error(`仍存在外部引用：${leftovers.join(', ')}`);

// 兜底核验：内联段必须与 app.js 原文逐字符一致（只允许 </script> 转义带来的差异），
// 任何替换串语义污染都会在这里被抓出来，而不是等页面白屏才发现。
const scriptOpen = out.lastIndexOf('<script>\n');
const scriptClose = out.lastIndexOf('\n</script>');
if (scriptOpen < 0 || scriptClose < 0 || scriptClose < scriptOpen) {
  throw new Error('内联脚本段落定位失败');
}
const inlined = out.slice(scriptOpen + '<script>\n'.length, scriptClose);
if (inlined !== js) {
  throw new Error(`内联脚本与 app.js 不一致（内联 ${inlined.length} 字符 / 原文 ${js.length} 字符）`);
}
// 语法校验：用 Node 的解析器把 app.js 原文编译一遍，坏代码在这里就该炸
try {
  new vm.Script(readFileSync(join(SRC_DIR, 'app.js'), 'utf8'));
} catch (err) {
  throw new Error(`app.js 语法校验失败：${err.message}`);
}
console.log(`核验 内联脚本完整=${inlined.length} 字符 · 语法通过`);

writeFileSync(OUT, out, 'utf8');
console.log(`已写出 ${OUT}  ${(Buffer.byteLength(out) / 1024).toFixed(1)} KB`);
