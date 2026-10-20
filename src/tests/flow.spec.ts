import { expect, test, type Page } from '@playwright/test';

/**
 * 端到端流程测试
 *
 * 覆盖：生辰起卦完整流程、强制验收案例（农历五月二十日、丑时，起数 5、20、2 → 小吉/空亡/病符）、
 * 文字心念起卦流程、全部按钮行为、掌位图落点与算法一致、移动端无横向滚动、减少动效模式。
 */

/** 收集页面未处理异常与控制台错误 */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** 走完"生辰 → 农历五月二十日 → 丑时"的输入流程，停在预览页 */
async function fillAcceptanceInput(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('entry-birth')).toBeVisible();
  await page.getByTestId('entry-birth').click();

  await page.getByTestId('kind-lunar').click();
  await page.getByTestId('lunar-year').selectOption('2026');
  await page.getByTestId('lunar-month').selectOption('5');
  await page.getByTestId('lunar-day').selectOption('20');
  await page.getByTestId('hour-select').selectOption('2');

  await expect(page.getByTestId('birth-preview')).toContainText('农历五月二十日');
  await expect(page.getByTestId('birth-preview')).toContainText('起数');
  await page.getByTestId('birth-submit').click();
}

test.describe('首页', () => {
  test('主视觉与入口齐全，掌位图包含九个指节', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('一念既起');
    await expect(page.getByText('以时取数，以掌推演')).toBeVisible();
    await expect(page.getByTestId('entry-birth')).toBeVisible();
    await expect(page.getByTestId('entry-text')).toBeVisible();

    // 九个指节宫位全部存在，且九宫名称齐全（取自掌位图宫位元素的 data-palace 属性）
    const PALACE_NAMES = ['大安', '留连', '速喜', '赤口', '小吉', '空亡', '病符', '桃花', '天德'];
    for (let index = 0; index < 9; index += 1) {
      await expect(page.getByTestId(`palace-cell-${index}`)).toBeAttached();
      await expect(page.getByTestId(`palace-cell-${index}`)).toHaveAttribute(
        'data-palace',
        PALACE_NAMES[index],
      );
    }

    expect(errors).toEqual([]);
  });

  test('玩法说明与规则说明可打开并公开算法与文字取数规则', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-rules').click();
    const modal = page.getByTestId('modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('九宫定义');
    await expect(modal).toContainText('(startIndex + count - 1) % 9');
    await expect(modal).toContainText('文字取数法（传统汉字起课）');
    await expect(modal).toContainText('不敢自称某部古籍原貌');
    await modal.getByRole('button', { name: '关闭', exact: true }).click();
    await expect(modal).toBeHidden();
  });
});

test.describe('🔴 强制验收案例：农历五月二十日、丑时，起数 5、20、2', () => {
  test('真实算法得到 小吉 → 空亡 → 病符（跳过动画路径）', async ({ page }) => {
    const errors = watchErrors(page);
    await fillAcceptanceInput(page);

    // 预览页显示起数与三数


    // 演算界面就绪
    await expect(page.getByTestId('session-status')).toBeVisible();
    await page.getByTestId('btn-skip').click();

    // 结果页
    await expect(page.getByTestId('result-card-month')).toHaveAttribute('data-palace', '小吉');
    await expect(page.getByTestId('result-card-day')).toHaveAttribute('data-palace', '空亡');
    await expect(page.getByTestId('result-card-hour')).toHaveAttribute('data-palace', '病符');
    await expect(page.getByTestId('result-headline')).toContainText('病符');

    // 每张宫卡都可展开「完整计数路径」：位数 === 该步起数，末位 === 落宫
    const steps = [
      { step: 'month', count: 5, palace: '小吉' },
      { step: 'day', count: 20, palace: '空亡' },
      { step: 'hour', count: 2, palace: '病符' },
    ] as const;
    for (const { step, count, palace } of steps) {
      const card = page.getByTestId(`result-card-${step}`);
      await card.getByRole('button', { name: '查看完整计数路径' }).click();
      const path = card.locator('.result-card__path');
      await expect(path.locator('li')).toHaveCount(count);
      await expect(path.locator('li').first()).not.toHaveClass(/is-landed/);
      await expect(path.locator('li').last()).toHaveClass(/is-landed/);
      await expect(path.locator('li').last()).toContainText(palace);
      await card.getByRole('button', { name: '收起计数路径' }).click();
      await expect(path).toBeHidden();
    }

    expect(errors).toEqual([]);
  });

  test('逐步完成动画后同样得到三步结果，且落点与算法路径一致', async ({ page }) => {
    await fillAcceptanceInput(page);

    // 切换为手动逐步（默认自动继续），并把速度调到 2× 减少等待
    await page.getByTestId('btn-mode-toggle').click();
    await page.getByTestId('btn-speed-toggle').click();

    // 第一步：大安起数 5 → 小吉
    await expect(page.getByTestId('session-status')).toContainText('掐指推演中');
    await expect(page.getByTestId('step-landed')).toContainText('小吉', { timeout: 20_000 });
    await expect(page.getByTestId('counter-ordinal')).toHaveText('第 5 位');

    await page.getByTestId('btn-next-step').click();
    await expect(page.getByTestId('step-landed')).toContainText('空亡', { timeout: 20_000 });
    await expect(page.getByTestId('counter-ordinal')).toHaveText('第 20 位');

    await page.getByTestId('btn-next-step').click();
    await expect(page.getByTestId('step-landed')).toContainText('病符', { timeout: 20_000 });
    await expect(page.getByTestId('counter-ordinal')).toHaveText('第 2 位');

    await page.getByTestId('btn-next-step').click();
    await expect(page.getByTestId('result-card-hour')).toHaveAttribute('data-palace', '病符');
  });

  test('暂停 / 继续 / 上一步 / 重新演算 均可用，且不改变结果', async ({ page }) => {
    await fillAcceptanceInput(page);

    // 切换为手动逐步，保证断言时序确定
    await page.getByTestId('btn-mode-toggle').click();

    // 切换为手动逐步，保证断言时序确定
    await page.getByTestId('btn-mode-toggle').click();

    // 暂停后状态文字变化，计数停住（保持 1× 速度，确保有足够时间命中动画中段）
    await page.getByTestId('btn-pause-resume').click();
    await expect(page.getByTestId('session-status')).toContainText('已暂停');
    const frozen = await page.getByTestId('counter-ordinal').textContent();
    await page.waitForTimeout(700);
    expect(await page.getByTestId('counter-ordinal').textContent()).toBe(frozen);

    // 继续
    await page.getByTestId('btn-pause-resume').click();
    await expect(page.getByTestId('session-status')).toContainText('掐指推演中');

    // 等第一步落宫后"上一步"按钮不可用（已在第一步）
    await expect(page.getByTestId('step-landed')).toContainText('小吉', { timeout: 20_000 });
    await expect(page.getByTestId('btn-prev-step')).toBeDisabled();

    // 进入第二步后可以回退
    await page.getByTestId('btn-next-step').click();
    await expect(page.getByTestId('step-landed')).toContainText('空亡', { timeout: 20_000 });
    await expect(page.getByTestId('btn-prev-step')).toBeEnabled();
    await page.getByTestId('btn-prev-step').click();
    await expect(page.getByTestId('step-landed')).toContainText('小吉');

    // 重新演算：回到第一步起宫，结果不变
    await page.getByTestId('btn-restart').click();
    await expect(page.getByTestId('session-status')).toContainText('就位', { timeout: 10_000 });
    await expect(page.getByTestId('step-landed')).toContainText('小吉', { timeout: 20_000 });

    await page.getByTestId('btn-skip').click();
    await expect(page.getByTestId('result-card-month')).toHaveAttribute('data-palace', '小吉');
    await expect(page.getByTestId('result-card-day')).toHaveAttribute('data-palace', '空亡');
    await expect(page.getByTestId('result-card-hour')).toHaveAttribute('data-palace', '病符');
  });

  test('结果页可复制文字、可再次占测', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await fillAcceptanceInput(page);
    await page.getByTestId('btn-skip').click();

    await page.getByTestId('btn-copy').click();
    await expect(page.getByTestId('share-state')).toContainText('复制');

    await page.getByTestId('btn-new').click();
    await expect(page.getByTestId('entry-birth')).toBeVisible();
  });
});

test.describe('文字心念起卦', () => {
  test('空白不可提交，输入后起数并完成占测', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.getByTestId('entry-text').click();

    // 空白不可提交
    await expect(page.getByTestId('text-submit')).toBeDisabled();

    await page.getByTestId('text-input').fill('此事可');
    await expect(page.getByTestId('text-count')).toContainText('3 字');

    // 展开取数明细，规则与数字一致
    await page.getByRole('button', { name: '展开取数明细' }).click();
    await expect(page.locator('.text-form__detail')).toContainText('归约公式');

    const numbersText = await page.getByTestId('text-numbers').locator('strong').textContent();
    expect(numbersText).toMatch(/^\d+、\d+、\d+$/);

    await page.getByTestId('text-submit').click();
    await page.getByTestId('btn-skip').click();

    await expect(page.getByTestId('result-card-month')).toBeVisible();
    await expect(page.getByTestId('result-card-day')).toBeVisible();
    await expect(page.getByTestId('result-card-hour')).toBeVisible();
    await expect(page.getByTestId('result-input-summary')).toContainText('心念文字');

    expect(errors).toEqual([]);
  });

  test('标点与空格不影响起数（规范化后一致）', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('entry-text').click();
    await page.getByTestId('text-input').fill('问前程');
    const plain = await page.getByTestId('text-numbers').locator('strong').textContent();

    await page.getByTestId('text-input').fill(' 问 前，程！ ');
    const punctuated = await page.getByTestId('text-numbers').locator('strong').textContent();
    expect(punctuated).toBe(plain);
  });
});

test.describe('历法输入', () => {
  test('公历输入实时换算为农历并展示起数', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('entry-birth').click();
    await page.getByTestId('solar-year').selectOption('2026');
    await page.getByTestId('solar-month').selectOption('7');
    await page.getByTestId('solar-day').selectOption('4');
    await page.getByTestId('hour-select').selectOption('2');

    const preview = page.getByTestId('birth-preview');
    await expect(preview).toContainText('农历五月二十日');
    await expect(preview).toContainText('起数');
    await expect(preview).toContainText('5、20、2');
  });

  test('切换公历/农历不会被重新解释，且给出明确提示', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('entry-birth').click();
    await page.getByTestId('solar-year').selectOption('1995');
    await page.getByTestId('kind-lunar').click();
    await expect(page.getByText('已切换到农历输入')).toBeVisible();
    await expect(page.getByTestId('lunar-year')).toHaveValue('1990');
    await page.getByTestId('kind-solar').click();
    await expect(page.getByTestId('solar-year')).toHaveValue('1995');
  });

  test('闰月标识仅在该年确有该闰月时可选', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('entry-birth').click();
    await page.getByTestId('kind-lunar').click();

    // 2025 年闰六月
    await page.getByTestId('lunar-year').selectOption('2025');
    await page.getByTestId('lunar-month').selectOption('6');
    await expect(page.getByTestId('lunar-leap')).toBeEnabled();
    await page.getByTestId('lunar-leap').check();
    await expect(page.getByTestId('birth-preview')).toContainText('闰六月');

    // 2026 年无闰月
    await page.getByTestId('lunar-year').selectOption('2026');
    await expect(page.getByTestId('lunar-leap')).toBeDisabled();
  });

  test('超出支持范围的公历年份不出现于选项中', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('entry-birth').click();
    // 生辰表单为按需加载，先等待其渲染完成
    await expect(page.getByTestId('solar-year')).toBeVisible();
    const options = await page.getByTestId('solar-year').locator('option').allTextContents();
    expect(options.length).toBe(201);
    expect(options[0]).toBe('2100');
    expect(options[options.length - 1]).toBe('1900');
    expect(options).not.toContain('1899');
    expect(options).not.toContain('2101');
  });
});

test.describe('减少动效模式', () => {
  test.use({ reducedMotion: 'reduce' });

  test('系统偏好减少动态效果时仍可完成完整流程', async ({ page }) => {
    await fillAcceptanceInput(page);
    await expect(page.getByTestId('step-landed')).toContainText('小吉', { timeout: 20_000 });
    await page.getByTestId('btn-skip').click();
    await expect(page.getByTestId('result-card-hour')).toHaveAttribute('data-palace', '病符');
  });
});

test.describe('移动端布局', () => {
  test('不出现横向滚动条，关键元素可见可点', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await expect(page.getByTestId('entry-birth')).toBeVisible();
    await page.getByTestId('entry-birth').click();
    await expect(page.getByTestId('kind-solar')).toBeVisible();

    const formOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(formOverflow).toBeLessThanOrEqual(1);
  });

  test('演算界面在窄屏下掌位图与控件均可见', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await fillAcceptanceInput(page);
    await expect(page.locator('.palm-svg')).toBeVisible();
    await expect(page.getByTestId('btn-skip')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.getByTestId('btn-skip').click();
    await expect(page.getByTestId('result-card-hour')).toHaveAttribute('data-palace', '病符');
  });
});

test.describe('结果可复现性', () => {
  test('相同输入两次占测结果完全一致', async ({ page }) => {
    await fillAcceptanceInput(page);
    await page.getByTestId('btn-skip').click();
    const headline1 = await page.getByTestId('result-headline').textContent();

    await page.getByTestId('btn-new').click();
    await fillAcceptanceInput(page);
    await page.getByTestId('btn-skip').click();
    const headline2 = await page.getByTestId('result-headline').textContent();
    expect(headline2).toBe(headline1);
  });

  test('历史记录入口可打开，声明本地保存', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-history').click();
    const modal = page.getByTestId('modal');
    await expect(modal).toContainText('localStorage');
    await expect(modal).toContainText('不会上传');
  });
});
