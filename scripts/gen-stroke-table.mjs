/**
 * 生成静态笔画表 src/features/text/strokeTable.ts
 *
 * 用法（一次性，仅开发机需要）：
 *   npm i -D cnchar
 *   node scripts/gen-stroke-table.mjs
 *
 * 设计说明：
 *   1. 运行时**不**依赖 cnchar —— 全量 cnchar(161KB) + cnchar-trad(345KB) 打进前端太重。
 *   2. 只抽取 GB2312 一二级字库（6768 字，覆盖日常书写 99.99%），生成「按笔画分组」的紧凑串。
 *   3. 分组编码比 {字:笔画} JSON 更省：实测 gzip 14.4KB vs 21.4KB。
 *   4. 未收录字（实测 36 个，全是部首：丨丿丶匚刂亠冫讠阝廴艹扌彳彡犭夂饣忄氵宀辶纟灬礻衤…）
 *      由 getStroke() 返回 null，界面必须显式报错，不可当 0 画处理。
 */

import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let cnchar;
try {
  cnchar = require('cnchar');
} catch {
  console.error('未找到 cnchar。请先执行：npm i -D cnchar');
  process.exit(1);
}

/** GB2312 区位码扫描：0xB0A1 ~ 0xF7FE */
const decodeGbk = new TextDecoder('gbk');
const chars = [];
for (let hi = 0xb0; hi <= 0xf7; hi += 1) {
  for (let lo = 0xa1; lo <= 0xfe; lo += 1) {
    const char = decodeGbk.decode(Uint8Array.from([hi, lo]));
    if (char.length === 1 && char !== '\uFFFD') chars.push(char);
  }
}
const unique = [...new Set(chars)];

const byStroke = new Map();
const missing = [];
for (const char of unique) {
  const stroke = cnchar.stroke(char);
  // ⚠️ cnchar 对未收录字返回 0，必须显式判 0
  if (Number.isInteger(stroke) && stroke > 0) {
    if (!byStroke.has(stroke)) byStroke.set(stroke, []);
    byStroke.get(stroke).push(char);
  } else {
    missing.push(char);
  }
}

const grouped = [...byStroke.keys()]
  .sort((a, b) => a - b)
  .map((stroke) => `${stroke}:${byStroke.get(stroke).join('')}`)
  .join('|');

const covered = unique.length - missing.length;
const gzipSize = gzipSync(Buffer.from(grouped, 'utf8'), { level: 9 }).length;

const banner = `/**
 * 静态汉字笔画表（自动生成，请勿手工编辑）
 *
 * 生成：node scripts/gen-stroke-table.mjs
 * 数据源：cnchar ${require('cnchar/package.json').version}（MIT）
 * 覆盖：GB2312 一二级字库 ${unique.length} 字，命中 ${covered} 字，笔画 ${Math.min(...byStroke.keys())}~${Math.max(...byStroke.keys())}
 * 体积：分组串 ${(grouped.length / 1024).toFixed(1)} KB / gzip ${(gzipSize / 1024).toFixed(1)} KB
 * 未收录：${missing.length} 字（部首与私用区字符），getStroke() 返回 null
 *
 * 编码格式：「笔画数:该笔画的所有字」以 | 分隔。
 * 例：3:三干于亏|4:王丰井…
 */

const GROUPED = '${grouped}';

let lookup: Map<string, number> | null = null;

function buildLookup(): Map<string, number> {
  const map = new Map<string, number>();
  for (const segment of GROUPED.split('|')) {
    const splitAt = segment.indexOf(':');
    const stroke = Number(segment.slice(0, splitAt));
    for (const char of segment.slice(splitAt + 1)) {
      map.set(char, stroke);
    }
  }
  return map;
}

/**
 * 查询单字笔画数。
 * @returns 笔画数；表内无此字时返回 null（调用方必须显式处理，不可当 0 画）
 */
export function getStroke(char: string): number | null {
  if (typeof char !== 'string' || char.length === 0) return null;
  const first = String.fromCodePoint(char.codePointAt(0) ?? 0);
  if (lookup === null) lookup = buildLookup();
  return lookup.get(first) ?? null;
}

/** 笔画表已收录的字数（供测试与界面说明使用） */
export const STROKE_TABLE_SIZE = ${covered};

/** 笔画表覆盖的笔画范围 */
export const STROKE_TABLE_RANGE: readonly [number, number] = [
  ${Math.min(...byStroke.keys())},
  ${Math.max(...byStroke.keys())},
];
`;

writeFileSync(new URL('../src/features/text/strokeTable.ts', import.meta.url), banner, 'utf8');

console.log(`字库 ${unique.length} 字，命中 ${covered}，未收录 ${missing.length}`);
console.log(`未收录：${missing.join('')}`);
console.log(`分组串 ${(grouped.length / 1024).toFixed(1)} KB，gzip ${(gzipSize / 1024).toFixed(1)} KB`);
