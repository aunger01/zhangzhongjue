/**
 * 本地分享卡片（Canvas 绘制）
 *
 * 纯前端生成 PNG：不上传任何数据，不依赖第三方服务或付费 API。
 *
 * 布局策略：**先量后排，两趟成图**。
 *   第一趟在离屏画布上只做 measureText 量算，得到全部内容所需高度；
 *   第二趟按该高度创建画布并逐块绘制。
 * 因此解读文字有多少就画多少，不再用固定高度 + slice 截断，
 * 也不会出现「图里只有开头几句」的情况。
 *
 * 若浏览器不支持 canvas.toBlob，则静默降级为「仅复制文字」。
 */

export interface ShareCardStep {
  /** 宫位标签，例如「月宫」 */
  label: string;
  /** 宫位名，例如「小吉」 */
  name: string;
  /** 该步起数次数（可选），例如 5 */
  count?: number;
}

export interface ShareCardBlock {
  title: string;
  /** 段落（自动换行，段间留白） */
  paragraphs?: string[];
  /** 列表项（自动换行，带金色圆点） */
  items?: string[];
}

export interface ShareCardData {
  inputSummary: string;
  numbersText: string;
  /** 顶部元信息，例如「2026-10-17 13:20 · 生辰起卦」 */
  metaLine?: string;
  palaces: ShareCardStep[];
  headline: string;
  blocks: ShareCardBlock[];
  footer: string;
}

const CARD_WIDTH = 760;
const PAD_X = 78;
const CONTENT_W = CARD_WIDTH - PAD_X * 2;

/** 标题字重（字号由副标题宽度反解，见 fitTitleSize） */
const TITLE_WEIGHT = '600';
const SUB_FONT = '20px';
const INPUT_FONT = '22px';
const NUM_FONT = '21px';
const CARD_LABEL_FONT = '16px';
const CARD_NAME_FONT = '600 36px';
const HEADLINE_FONT = '600 26px';
const SECTION_FONT = '600 21px';
const BODY_FONT = '19px';
const ITEM_FONT = '19px';
const FOOT_FONT = '15px';

const BODY_LH = 32;
const ITEM_LH = 31;

const SERIF = '"Songti SC", "STSong", "Noto Serif SC", "SimSun", serif';
const SANS = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

/* ---------- 标题排版 ----------
 * 要求：「掌中诀」的总宽与副标题「道门秘术 · 九宫小六壬」等宽，且两者都水平居中。
 * 做法：先量出副标题宽度，再反解标题字号（含少量字距），使三字总宽恰好等于该宽度。
 * 纯 measureText 推导，绘制与量算两趟结果完全一致。
 */
const TITLE_TEXT = '掌中诀';
const SUB_TITLE_TEXT = '道门秘术 · 九宫小六壬';
/** 标题字距（em）：0.42 让标题在等宽前提下仍保有疏朗感，字号落在 50 上下 */
const TITLE_TRACKING_EM = 0.42;

/** 含字距的文本总宽 */
function trackedWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  tracking: number,
): number {
  let width = 0;
  const chars = Array.from(text);
  chars.forEach((char, index) => {
    width += ctx.measureText(char).width;
    if (index < chars.length - 1) width += tracking;
  });
  return width;
}

/** 反解字号：使 trackedWidth(title, size * trackingEm) ≈ target */
function fitTitleSize(
  ctx: CanvasRenderingContext2D,
  target: number,
  trackingEm: number,
): number {
  let size = 46;
  for (let i = 0; i < 8; i += 1) {
    ctx.font = `${TITLE_WEIGHT} ${size}px ${SERIF}`;
    const width = trackedWidth(ctx, TITLE_TEXT, size * trackingEm);
    if (width <= 0) break;
    size *= target / width;
  }
  return size;
}

/** 逐字绘制带字距的居中文案（总宽 = 字宽之和 + 字距） */
function drawTrackedCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  baselineY: number,
  size: number,
  trackingEm: number,
  color: string,
): void {
  const tracking = size * trackingEm;
  ctx.font = `${TITLE_WEIGHT} ${size}px ${SERIF}`;
  const total = trackedWidth(ctx, text, tracking);
  let x = centerX - total / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  Array.from(text).forEach((char) => {
    ctx.fillText(char, x, baselineY);
    x += ctx.measureText(char).width + tracking;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** 按字符宽度换行（中文逐字换行即可） */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    if (char === '\n') {
      lines.push(current);
      current = '';
      continue;
    }
    const next = current + char;
    if (ctx.measureText(next).width > maxWidth && current !== '') {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current || lines.length === 0) lines.push(current);
  return lines;
}

/** 绘制游标：measure=true 时只累加高度，不落笔 */
interface Painter {
  ctx: CanvasRenderingContext2D;
  measure: boolean;
  /** 当前行基线 y */
  y: number;
}

function paragraph(
  p: Painter,
  text: string,
  opts: {
    font: string;
    color: string;
    lineHeight: number;
    x: number;
    maxWidth: number;
    align: CanvasTextAlign;
  },
): void {
  const { ctx } = p;
  ctx.font = opts.font;
  const lines = wrapText(ctx, text, opts.maxWidth);
  for (const line of lines) {
    if (!p.measure) {
      ctx.textAlign = opts.align;
      ctx.fillStyle = opts.color;
      ctx.fillText(line, opts.x, p.y);
    }
    p.y += opts.lineHeight;
  }
}

/** 三宫卡片行 */
function drawPalaceRow(p: Painter, palaces: ShareCardStep[]): void {
  const { ctx } = p;
  const cardW = 186;
  const cardH = 158;
  const gap = 23;
  const totalW = cardW * 3 + gap * 2;
  const startX = (CARD_WIDTH - totalW) / 2;
  const top = p.y;

  palaces.slice(0, 3).forEach((item, index) => {
    const x = startX + index * (cardW + gap);
    if (!p.measure) {
      ctx.fillStyle = 'rgba(212,169,79,0.09)';
      roundRect(ctx, x, top, cardW, cardH, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(212,169,79,0.4)';
      ctx.lineWidth = 1.4;
      roundRect(ctx, x, top, cardW, cardH, 18);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = `${CARD_LABEL_FONT} ${SANS}`;
      ctx.fillStyle = 'rgba(169,188,180,0.85)';
      ctx.fillText(item.label, x + cardW / 2, top + 40);

      ctx.font = `${CARD_NAME_FONT} ${SERIF}`;
      ctx.fillStyle = '#f2dda7';
      ctx.fillText(item.name, x + cardW / 2, top + 100);

      if (typeof item.count === 'number') {
        ctx.font = `14px ${SANS}`;
        ctx.fillStyle = 'rgba(169,188,180,0.72)';
        ctx.fillText(`起 ${item.count} 数`, x + cardW / 2, top + 130);
      }
    }
  });

  p.y = top + cardH;
}

/** 一个小节能块 */
function drawBlock(p: Painter, block: ShareCardBlock): void {
  const { ctx } = p;

  // 小标题：金色竖线 + 标题文字
  if (!p.measure) {
    ctx.fillStyle = 'rgba(212,169,79,0.85)';
    ctx.fillRect(PAD_X, p.y - 17, 3, 20);
  }
  ctx.font = `${SECTION_FONT} ${SERIF}`;
  if (!p.measure) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#d4a94f';
    ctx.fillText(block.title, PAD_X + 14, p.y);
  }
  p.y += 40;

  for (const text of block.paragraphs ?? []) {
    paragraph(p, text, {
      font: `${BODY_FONT} ${SANS}`,
      color: 'rgba(212,223,217,0.88)',
      lineHeight: BODY_LH,
      x: PAD_X,
      maxWidth: CONTENT_W,
      align: 'left',
    });
    p.y += 12;
  }

  for (const text of block.items ?? []) {
    if (!p.measure) {
      ctx.fillStyle = 'rgba(212,169,79,0.9)';
      ctx.beginPath();
      ctx.arc(PAD_X + 5, p.y - 7, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    paragraph(p, text, {
      font: `${ITEM_FONT} ${SANS}`,
      color: 'rgba(212,223,217,0.88)',
      lineHeight: ITEM_LH,
      x: PAD_X + 20,
      maxWidth: CONTENT_W - 20,
      align: 'left',
    });
    p.y += 8;
  }

  p.y += 26;
}

/** 全部内容布局（量算与绘制共用同一套坐标推进，保证高度一致） */
function layout(p: Painter, data: ShareCardData): void {
  const { ctx } = p;
  const cx = CARD_WIDTH / 2;

  p.y = 96;

  // 副标题先量宽：标题字号要按它反解，两者等宽
  ctx.font = `${SUB_FONT} ${SANS}`;
  const subWidth = ctx.measureText(SUB_TITLE_TEXT).width;
  const titleSize = fitTitleSize(ctx, subWidth, TITLE_TRACKING_EM);

  // 标题「掌中诀」：字号反解后与副标题等宽，逐字居中绘制
  if (!p.measure) {
    drawTrackedCentered(
      ctx,
      TITLE_TEXT,
      cx,
      p.y,
      titleSize,
      TITLE_TRACKING_EM,
      '#f2dda7',
    );
  }
  p.y += 38;

  ctx.font = `${SUB_FONT} ${SANS}`;
  if (!p.measure) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(169,188,180,0.9)';
    ctx.fillText(SUB_TITLE_TEXT, cx, p.y);
  }
  p.y += 42;

  // 分隔线
  if (!p.measure) {
    ctx.strokeStyle = 'rgba(212,169,79,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_X + 20, p.y);
    ctx.lineTo(CARD_WIDTH - PAD_X - 20, p.y);
    ctx.stroke();
  }
  p.y += 44;

  // 元信息
  if (data.metaLine) {
    ctx.font = `15px ${SANS}`;
    if (!p.measure) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(140,160,152,0.9)';
      ctx.fillText(data.metaLine, cx, p.y);
    }
    p.y += 30;
  }

  // 输入摘要（可能较长，居中换行）
  paragraph(p, data.inputSummary, {
    font: `${INPUT_FONT} ${SANS}`,
    color: 'rgba(230,226,214,0.92)',
    lineHeight: 32,
    x: cx,
    maxWidth: CONTENT_W,
    align: 'center',
  });

  paragraph(p, `起数 ${data.numbersText}`, {
    font: `${NUM_FONT} ${SERIF}`,
    color: '#d4a94f',
    lineHeight: 26,
    x: cx,
    maxWidth: CONTENT_W,
    align: 'center',
  });

  p.y += 26;

  // 三宫卡片
  drawPalaceRow(p, data.palaces);
  p.y += 50;

  // 整体判断标题句
  paragraph(p, data.headline, {
    font: `${HEADLINE_FONT} ${SERIF}`,
    color: '#e6e2d6',
    lineHeight: 38,
    x: cx,
    maxWidth: CONTENT_W,
    align: 'center',
  });
  p.y += 34;

  // 正文各节
  data.blocks.forEach((block) => drawBlock(p, block));

  // 页脚
  p.y += 6;
  if (!p.measure) {
    ctx.strokeStyle = 'rgba(212,169,79,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_X, p.y);
    ctx.lineTo(CARD_WIDTH - PAD_X, p.y);
    ctx.stroke();
  }
  p.y += 34;

  paragraph(p, data.footer, {
    font: `${FOOT_FONT} ${SANS}`,
    color: 'rgba(125,144,137,0.9)',
    lineHeight: 24,
    x: cx,
    maxWidth: CONTENT_W,
    align: 'center',
  });

  p.y += 34;
}

function paintBackground(ctx: CanvasRenderingContext2D, H: number): void {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0c1a16');
  bg.addColorStop(0.55, '#08120f');
  bg.addColorStop(1, '#050a08');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, H);

  const glow = ctx.createRadialGradient(
    CARD_WIDTH / 2,
    -60,
    40,
    CARD_WIDTH / 2,
    -60,
    520,
  );
  glow.addColorStop(0, 'rgba(212,169,79,0.28)');
  glow.addColorStop(1, 'rgba(212,169,79,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_WIDTH, 420);

  ctx.strokeStyle = 'rgba(212,169,79,0.42)';
  ctx.lineWidth = 2;
  roundRect(ctx, 28, 28, CARD_WIDTH - 56, H - 56, 26);
  ctx.stroke();
}

export function renderShareCard(data: ShareCardData): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const scale = 2; // 高清输出

      // 第一趟：离屏量算所需高度（只测不打）
      const probe = document.createElement('canvas');
      probe.width = 8;
      probe.height = 8;
      const probeCtx = probe.getContext('2d');
      if (!probeCtx) {
        resolve(null);
        return;
      }
      const measured: Painter = { ctx: probeCtx, measure: true, y: 0 };
      layout(measured, data);
      const H = Math.max(1040, Math.ceil(measured.y));

      // 第二趟：按实际高度成图
      const canvas = document.createElement('canvas');
      canvas.width = CARD_WIDTH * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.scale(scale, scale);
      paintBackground(ctx, H);

      const painter: Painter = { ctx, measure: false, y: 0 };
      layout(painter, data);

      if (typeof canvas.toBlob !== 'function') {
        resolve(null);
        return;
      }
      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
    } catch {
      resolve(null);
    }
  });
}

/** 触发浏览器下载（本地生成，不经过任何服务端） */
export function downloadBlob(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch {
    // 忽略：下载失败不影响主流程
  }
}

/** 复制文本到剪贴板（带降级方案） */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 继续尝试降级方案
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
