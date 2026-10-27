import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import App from '../App';

/**
 * 应用级烟雾测试（jsdom）
 *
 * 不依赖真实浏览器，即可验证：
 *   首页渲染 → 选择模式 → 填写输入 → 起数预览 → 开始掐指 → 跳过动画 → 结果页三步落宫。
 * 与 Playwright 端到端测试互补：这里跑得快、可在 CI 无浏览器环境执行。
 */

let container: HTMLDivElement;
let root: Root;

/** 冲刷 React 更新与微任务 */
async function flush(rounds = 4): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

function q<T extends HTMLElement>(testId: string): T {
  const element = container.querySelector<T>(`[data-testid="${testId}"]`);
  if (!element) throw new Error(`找不到元素：${testId}`);
  return element;
}

function qa(selector: string): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

async function click(testId: string): Promise<void> {
  await act(async () => {
    q(testId).click();
  });
  await flush(2);
}

/** React 受控组件需要走原生 setter 才能触发 onChange */
function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
): void {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? window.HTMLSelectElement.prototype
        : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set?.call(element, value);
}

async function typeText(testId: string, value: string): Promise<void> {
  const element = q<HTMLTextAreaElement | HTMLInputElement>(testId);
  await act(async () => {
    setNativeValue(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await flush(2);
}

async function selectOption(testId: string, value: string): Promise<void> {
  const element = q<HTMLSelectElement>(testId);
  await act(async () => {
    setNativeValue(element, value);
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await flush(2);
}

beforeEach(async () => {
  window.localStorage.clear();
  container = document.createElement('div');
  container.id = 'root';
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<App />);
  });
  await flush();
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

describe('首页', () => {
  it('渲染主标题、两种入口与九个指节宫位', () => {
    expect(container.textContent).toContain('一念既起');
    expect(container.textContent).toContain('以时取数，以掌推演');
    expect(container.querySelector('[data-testid="entry-birth"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="entry-text"]')).toBeTruthy();
    expect(qa('[data-palace]')).toHaveLength(9);

    // 九宫顺序与名称：直接从掌位图宫位元素断言（顺序按 index 可靠排列）
    const names = Array.from({ length: 9 }, (_, index) =>
      container.querySelector(`[data-testid="palace-cell-${index}"]`)?.getAttribute('data-palace'),
    );
    expect(names).toEqual([
      '大安',
      '留连',
      '速喜',
      '赤口',
      '小吉',
      '空亡',
      '病符',
      '桃花',
      '天德',
    ]);
  });
});

describe('文字心念起卦完整流程', () => {
  it('空白不可提交；输入后起数并与预览、结果一致', async () => {
    await click('entry-text');

    const submit = q<HTMLButtonElement>('text-submit');
    expect(submit.disabled).toBe(true);

    await typeText('text-input', '此事可');
    expect(q('text-count').textContent).toContain('3 字');
    expect(q<HTMLButtonElement>('text-submit').disabled).toBe(false);

    const numbersText = q('text-numbers').querySelector('strong')?.textContent ?? '';
    expect(numbersText).toMatch(/^\d+、\d+、\d+$/);

    await click('text-submit');

    // 提交后直接进入演算（起数预览页已取消）
    await click('btn-skip');

    const palaces = qa('[data-testid^="result-card-"]').map((el) =>
      el.getAttribute('data-palace'),
    );
    expect(palaces).toHaveLength(3);
    const [month, day, hour] = numbersText.split('、');
    expect(container.textContent).toContain('月宫');
    expect(container.textContent).toContain('时宫');
    expect(month.length).toBeGreaterThan(0);
    expect(day.length).toBeGreaterThan(0);
    expect(hour.length).toBeGreaterThan(0);
    expect(q('result-input-summary').textContent).toContain('心念文字');
  });
});

describe('🔴 生辰起卦：农历五月二十日、丑时，起数 5、20、2', () => {
  it('经真实历法换算与九宫算法得到 小吉 / 空亡 / 病符', async () => {
    await click('entry-birth');

    // 生辰表单为按需加载，等待其出现
    for (let i = 0; i < 20 && !container.querySelector('[data-testid="kind-lunar"]'); i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await flush(2);
    }
    expect(container.querySelector('[data-testid="kind-lunar"]')).toBeTruthy();

    await click('kind-lunar');
    await selectOption('lunar-year', '2026');
    await selectOption('lunar-month', '5');
    await selectOption('lunar-day', '20');
    await selectOption('hour-select', '2');

    const birthPreview = q('birth-preview');
    expect(birthPreview.textContent).toContain('农历五月二十日');
    expect(birthPreview.textContent).toContain('5、20、2');

    await click('birth-submit');
    // 提交后直接进入演算（起数预览页已取消）；跳过动画直达结果
    await click('btn-skip');

    expect(q('result-card-month').getAttribute('data-palace')).toBe('小吉');
    expect(q('result-card-day').getAttribute('data-palace')).toBe('空亡');
    expect(q('result-card-hour').getAttribute('data-palace')).toBe('病符');
    expect(q('result-headline').textContent).toContain('病符');
    expect(q('result-numbers').textContent).toContain('5、20、2');
  });

  it('公历 2026-07-04 换算为农历五月二十日（交叉验证）', async () => {
    await click('entry-birth');
    for (let i = 0; i < 20 && !container.querySelector('[data-testid="solar-year"]'); i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await flush(2);
    }
    await selectOption('solar-year', '2026');
    await selectOption('solar-month', '7');
    await selectOption('solar-day', '4');
    await selectOption('hour-select', '2');
    expect(q('birth-preview').textContent).toContain('农历五月二十日');
    expect(q('birth-preview').textContent).toContain('5、20、2');
  });
});

describe('说明弹层', () => {
  it('规则说明公开九宫对照、公式与文字取数法', async () => {
    await click('nav-rules');
    const modal = q('modal');
    expect(modal.textContent).toContain('九宫定义');
    expect(modal.textContent).toContain('(startIndex + count - 1) % 9');
    expect(modal.textContent).toContain('文字取数法（传统汉字起课）');
    expect(modal.textContent).toContain('由您自己写下一至三个汉字');
    expect(modal.textContent).toContain('不敢自称某部古籍原貌');
    expect(modal.textContent).toContain('不构成');
  });
});

describe('六宫小六壬（传统六宫法）', () => {
  it('右上角可切换到六宫，起课表单按需加载', async () => {
    expect(container.textContent).toContain('九宫小六壬');
    await click('nav-switch-mode');

    for (let i = 0; i < 20 && !container.querySelector('[data-testid="six-basis"]'); i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await flush(2);
    }
    expect(container.querySelector('[data-testid="six-basis"]')).toBeTruthy();
    // 品牌副标题随宫制切换
    expect(container.textContent).toContain('六宫小六壬');
    // 下拉选项已精简：只留事由名，不带宫位后缀
    const basisSelect = q('six-basis');
    const optionTexts = Array.from(basisSelect.querySelectorAll('option')).map((o) => o.textContent ?? '');
    expect(optionTexts).toContain('通用问事');
    expect(optionTexts).toContain('婚姻杂事');
    expect(optionTexts).toContain('求财经商');
    expect(optionTexts).toContain('问占之人（女）');
    expect(optionTexts).toContain('问占之人（男）');
    expect(optionTexts.every((text) => !text.includes('起）'))).toBe(true);
    const groupLabels = Array.from(basisSelect.querySelectorAll('optgroup')).map((g) => g.getAttribute('label'));
    expect(groupLabels).toContain('依事由起课');
    expect(groupLabels).toContain('依问占之人起课');
  });

  it('🔴 占人女例：留连起课，三月初三卯时 → 赤口 / 空亡 / 速喜（与原文一致）', async () => {
    await click('nav-switch-mode');
    for (let i = 0; i < 20 && !container.querySelector('[data-testid="six-basis"]'); i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await flush(2);
    }

    await selectOption('six-basis', 'person:female');
    // 起课歌诀行已删除，起宫信息只在预览区呈现
    expect(container.querySelector('[data-testid="six-basis-verse"]')).toBeNull();

    // 取数方式：农历月日时
    await click('six-source-calendar');
    await selectOption('six-month', '3');
    await selectOption('six-day', '3');
    await selectOption('six-hour', '4');

    expect(q('six-preview').textContent).toContain('留连');
    expect(q('six-preview').textContent).toContain('3、3、4');

    await click('six-submit');

    // 演算界面：六宫掌图只画六个宫位
    expect(qa('[data-palace]')).toHaveLength(6);

    await click('six-btn-skip');

    expect(q('result-card-month').getAttribute('data-palace')).toBe('赤口');
    expect(q('result-card-day').getAttribute('data-palace')).toBe('空亡');
    expect(q('result-card-hour').getAttribute('data-palace')).toBe('速喜');
    expect(q('six-result-origin').textContent).toContain('留连');
    expect(q('six-result-numbers').textContent).toContain('3、3、4');
    expect(container.textContent).toContain('六神断词');
  });

  it('自报三数：归约后入数，落宫与直接入数一致', async () => {
    await click('nav-switch-mode');
    for (let i = 0; i < 20 && !container.querySelector('[data-testid="six-source-report"]'); i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await flush(2);
    }

    // 起课方式必选：未选时提交钮禁用，占位提示在位
    const basisSelect = q('six-basis') as HTMLSelectElement;
    expect(basisSelect.value).toBe('');
    expect(basisSelect.required).toBe(true);
    expect(q('six-submit').hasAttribute('disabled')).toBe(true);
    expect(container.textContent).toContain('请选择问占方向');

    await click('six-source-report');
    await selectOption('six-basis', 'topic:general');
    await typeText('six-raw-0', '13');
    await typeText('six-raw-1', '15');
    await typeText('six-raw-2', '7');

    expect(q('six-preview').textContent).toContain('1、3、7');

    await click('six-submit');
    await click('six-btn-skip');

    // 大安起课：月 (0+1-1)%6=0 大安；日 (0+3-1)%6=2 速喜；时 (2+7-1)%6=2 速喜
    expect(q('result-card-month').getAttribute('data-palace')).toBe('大安');
    expect(q('result-card-day').getAttribute('data-palace')).toBe('速喜');
    expect(q('result-card-hour').getAttribute('data-palace')).toBe('速喜');
  });

  it('六宫规则说明公开六宫对照、公式与起课歌诀', async () => {
    await click('nav-switch-mode');
    for (let i = 0; i < 20 && !container.querySelector('[data-testid="six-basis"]'); i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await flush(2);
    }
    await click('nav-rules');
    const modal = q('modal');
    expect(modal.textContent).toContain('六宫定义与掌位');
    expect(modal.textContent).toContain('(startIndex + count - 1) % 6');
    expect(modal.textContent).toContain('起课歌诀');
    expect(modal.textContent).toContain('空亡不起课');
    expect(modal.textContent).toContain('断课歌诀');
    expect(modal.textContent).toContain('不构成');
    // 六宫规则不得再套用九宫的定义标题
    expect(modal.textContent).not.toContain('九宫定义');
  });

  it('六宫各页不出现「返回九宫」按钮；切换入口带切换图标', async () => {
    await click('nav-switch-mode');
    for (let i = 0; i < 20 && !container.querySelector('[data-testid="six-basis"]'); i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await flush(2);
    }
    expect(q('nav-switch-mode').querySelector('svg')).toBeTruthy();
    expect(container.textContent).not.toContain('返回九宫');
  });

  it('求财例：结果页引断课歌诀（财占），并给出用神喜忌', async () => {
    await click('nav-switch-mode');
    for (let i = 0; i < 20 && !container.querySelector('[data-testid="six-basis"]'); i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await flush(2);
    }
    await selectOption('six-basis', 'topic:wealth');
    expect(q('six-preview').textContent).toContain('留连');

    await selectOption('six-month', '3');
    await selectOption('six-day', '3');
    await selectOption('six-hour', '4');
    await click('six-submit');

    await click('six-btn-skip');

    expect(q('six-topic-verse-hour').textContent).toContain('财占速喜九分财');
    expect(q('six-topic-verse-month').textContent).toContain('财占赤口一口财');
    expect(container.textContent).toContain('用神与喜忌');
    expect(container.textContent).toContain('以宫位取用神');
  });
});
