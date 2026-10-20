/**
 * 说明弹层：玩法说明 / 规则说明
 *
 * 规则说明是本项目的"透明度声明"：
 *   - 九宫定义与掌位对照全部公开；
 *   - 连续起宫规则与数学公式全部公开；
 *   - 文字取数法公开到「第几个字、几画、怎么归约」，不冒充古法；
 *   - 公历/农历换算说明可靠支持范围；
 *   - 隐私与娱乐用途提示。
 */

import {
  ALGORITHM_NAME,
  ALGORITHM_VERSION,
  FINGER_LABELS,
  PALACE_META,
  PALACE_CYCLE_TEXT,
  SEGMENT_LABELS,
} from '../features/divination/palaceConstants';
import { SHICHEN } from '../features/birth/timeMapping';
import {
  SUPPORTED_LUNAR_YEAR_MAX,
  SUPPORTED_LUNAR_YEAR_MIN,
  SUPPORTED_SOLAR_MAX,
  SUPPORTED_SOLAR_MIN,
} from '../features/birth/calendarRange';
import { TEXT_HARD_MAX } from '../features/text/textNumbering';
import { STROKE_CHAR_COUNT } from '../features/text/strokeNumbering';
import { INTERPRETATION_DISCLAIMER, PRIVACY_NOTICE } from '../features/interpretation/palaceMeanings';
import { Modal } from './Modal';
import './GuideModal.css';

export interface GuideModalProps {
  open: boolean;
  variant: 'play' | 'rules';
  onClose: () => void;
}

export function GuideModal({ open, variant, onClose }: GuideModalProps) {
  return (
    <Modal open={open} title={variant === 'play' ? '玩法说明' : '规则说明'} onClose={onClose}>
      {variant === 'play' ? (
        <div className="guide">
          <section>
            <h3>一、两种起卦方式</h3>
            <ul>
              <li>
                <strong>生辰起卦</strong>：输入公历或农历出生日期与时辰，选择该年确有闰月的月份可在闰月测试。系统会先把公历真实换算为农历，再取农历月、农历日、时辰数字作为三数。
              </li>
              <li>
                <strong>心念起卦</strong>：自己写下一到三个汉字（写哪几个字由你定，取字即取象），系统按公开的文字取数法把文字换算成三个数字。原文只在当前页面内存中使用。
              </li>
            </ul>
          </section>

          <section>
            <h3>二、三步掐指</h3>
            <ol>
              <li>第一步（月）：从大安起数，起宫本身计作第 1 位，按九宫顺序循环数到农历月份数字。</li>
              <li>第二步（日）：从月宫的落宫继续起数，数到农历日期数字。</li>
              <li>第三步（时）：从日宫的落宫继续起数，数到时辰数字，所得即为最终落宫。</li>
            </ol>
            <p className="faint">
              手掌上的每一步移动都来自算法生成的真实路径，动画只是"把路径演给你看"，不会自己推算宫位。
            </p>
          </section>

          <section>
            <h3>三、操作按钮</h3>
            <ul>
              <li>暂停 / 继续：随时停下观察当前落点，再接着看。</li>
              <li>上一步 / 下一步：手动逐步推进；也可在设置中打开"自动继续"。</li>
              <li>跳过动画：直接看结果，输入与结果完全不变。</li>
              <li>重新演算：用同一输入重播一遍，结果必然一致。</li>
              <li>动画速度：0.5× / 1× / 2×，只影响观看速度。</li>
            </ul>
          </section>

          <section>
            <h3>四、结果怎么读</h3>
            <ul>
              <li>三张卡片分别对应月宫（起因）、日宫（过程）、时宫（结果 / 应期）。</li>
              <li>每张卡片都可展开查看该步的完整计数路径。</li>
              <li>综合解读包含整体判断、逐步解析、积极因素、需要留意与行动建议。</li>
              <li>结果可以复制为文字，也可以在本地生成一张分享卡片（不上传任何数据）。</li>
            </ul>
          </section>

          <section>
            <h3>五、免责与隐私</h3>
            <p>{INTERPRETATION_DISCLAIMER}</p>
            <p>{PRIVACY_NOTICE}</p>
          </section>
        </div>
      ) : (
        <div className="guide">
          <section>
            <h3>一、九宫定义（正式宫位，非附加神煞）</h3>
            <p className="faint">
              本项目采用九宫顺序，病符、桃花、天德均为正式宫位，不使用常见六宫算法。
              从指尖朝手掌方向理解：远节最靠近指尖，近节最靠近手掌。
            </p>
            <div className="guide__table-wrap">
              <table className="guide__table">
                <caption className="faint">九宫与指节对照</caption>
                <thead>
                  <tr>
                    <th scope="col">序号</th>
                    <th scope="col">宫位</th>
                    <th scope="col">手指</th>
                    <th scope="col">指节</th>
                    <th scope="col">算法索引</th>
                  </tr>
                </thead>
                <tbody>
                  {PALACE_META.map((palace) => (
                    <tr key={palace.id}>
                      <td className="mono-num">{palace.order}</td>
                      <td className="guide__palace">{palace.name}</td>
                      <td>{FINGER_LABELS[palace.finger]}</td>
                      <td>{SEGMENT_LABELS[palace.segment]}</td>
                      <td className="mono-num">{palace.index}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3>二、九宫循环顺序</h3>
            <p>{PALACE_CYCLE_TEXT}</p>
          </section>

          <section>
            <h3>三、连续起宫规则与公式</h3>
            <p>
              月份永远从大安起数；起宫本身计作第 1 位；月份的落宫成为日期的起宫，日期的落宫成为时辰的起宫。
            </p>
            <pre className="guide__code">{`// 算法索引：大安 0、留连 1、速喜 2、赤口 3、小吉 4、空亡 5、病符 6、桃花 7、天德 8
resultIndex = (startIndex + count - 1) % 9`}</pre>
            <p className="faint">
              算法标识：{ALGORITHM_NAME}（{ALGORITHM_VERSION}）。演算开始后本次结果即被固定，
              暂停、继续、回看、跳过、改速度都不会重新计算。
            </p>
          </section>

          <section>
            <h3>四、十二时辰映射</h3>
            <div className="guide__table-wrap">
              <table className="guide__table">
                <caption className="faint">时辰由用户直接选择，不需要自己换算</caption>
                <thead>
                  <tr>
                    <th scope="col">时辰</th>
                    <th scope="col">常用时间范围</th>
                    <th scope="col">数字</th>
                  </tr>
                </thead>
                <tbody>
                  {SHICHEN.map((shichen) => (
                    <tr key={shichen.number}>
                      <td>{shichen.name}</td>
                      <td className="mono-num">{shichen.range}</td>
                      <td className="mono-num">{shichen.number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3>五、公历 / 农历换算</h3>
            <p>
              换算由经过验证的历法库在浏览器本地完成，不使用硬编码偏移，也不猜测结果。可靠支持范围：
              公历 {SUPPORTED_SOLAR_MIN.year}-{SUPPORTED_SOLAR_MIN.month}-{SUPPORTED_SOLAR_MIN.day} 至{' '}
              {SUPPORTED_SOLAR_MAX.year}-{SUPPORTED_SOLAR_MAX.month}-{SUPPORTED_SOLAR_MAX.day}，农历年{' '}
              {SUPPORTED_LUNAR_YEAR_MIN}–{SUPPORTED_LUNAR_YEAR_MAX} 年。超出的日期会明确报错，不会返回猜测值。
            </p>
          </section>

          <section>
            <h3>六、文字取数法（传统汉字起课）</h3>
            <p>
              取数依传统汉字起课：<strong>由您自己写下一至三个汉字</strong>，写哪几个字本身即是取象，
              故程序不替您挑选、也不截取。每个字按其规范笔画起数；不足三字时
              <strong>从大安起日、日上起时</strong>。完整规则如下，可逐条核对。
            </p>
            <ol>
              <li>
                对文本执行 Unicode NFC 规范化，提取有效汉字（空格、换行、标点、数字、字母、表情符号均不计入）。
              </li>
              <li>有效汉字须为 1～{STROKE_CHAR_COUNT} 个；超过三个请自行删减，程序不会自动截取。</li>
              <li>
                每个笔画数归约为 1～9：((笔画 − 1) mod 9) + 1。归约只压缩数位，不改变落宫。
              </li>
              <li>
                三个字：三数即三字笔画；两个字：[1, 第 1 字笔画, 第 2 字笔画]；一个字：[1,
                该字笔画, 时辰数字]。
              </li>
              <li>
                单字档的时辰数字取 1～12（子时为 1），<strong>不经 1～9 归约</strong>
                ，原样入数；因起宫公式本身取模，落宫结果不受影响。
              </li>
              <li>所得三数完全复用同一套九宫连续起宫算法。</li>
            </ol>
            <p className="note-warn">
              请注意：<strong>取数方式</strong>依传统汉字起课，但<strong>九宫落宫体系</strong>
              （在传统六神之外增设病符、桃花、天德）是本网站的整理方式，不敢自称某部古籍原貌。
              笔画以简体规范笔顺为准；生僻字与部首暂不支持，会明确提示而不会猜测。
            </p>
            <p className="faint">
              请写 1～{STROKE_CHAR_COUNT} 个汉字；输入框可容纳至 {TEXT_HARD_MAX}{' '}
              个字符，是便于您先写下、再自行删减，程序不会替您截取。相同文字必然得到相同的三个数。
            </p>
          </section>

          <section>
            <h3>七、限制、隐私与用途</h3>
            <p>{INTERPRETATION_DISCLAIMER}</p>
            <p>{PRIVACY_NOTICE}</p>
            <p className="faint">
              本站为纯前端站点：所有计算、换算与解读都在你的浏览器内完成，不需要后端、数据库、账号或付费 AI 服务。
            </p>
          </section>
        </div>
      )}
    </Modal>
  );
}
