/**
 * 六宫小六壬说明（玩法 / 规则）
 *
 * 独立成模块并**按需加载**：九宫用户打开玩法 / 规则说明时不会下载六宫的
 * 宫位表、歌诀与断词；首屏只保留九宫自身的说明文案。
 */

import { FINGER_LABELS, SEGMENT_LABELS } from '../features/divination/palaceConstants';
import {
  INTERPRETATION_DISCLAIMER,
  PRIVACY_NOTICE,
} from '../features/interpretation/palaceMeanings';
import {
  SIX_ALGORITHM_NAME,
  SIX_ALGORITHM_VERSION,
  SIX_EVEN_NUMBERS,
  SIX_LUCKY_NUMBERS,
  SIX_ODD_NUMBERS,
  SIX_PALACE_CYCLE_TEXT,
  SIX_PALACE_META,
  SIX_PALACES,
  SIX_PERSON_ORIGIN,
  SIX_STEP_SUBJECT,
  SIX_TOPICS,
  SIX_TOPIC_VERSES,
  SIX_UNLUCKY_NUMBERS,
  SIX_VERSE_TOPIC_LABELS,
  type SixVerseTopicId,
} from '../features/six/sixConstants';
import {
  SIX_ELEMENT_CASES,
  SIX_INTERPRETATION_DISCLAIMER,
  SIX_LUCKY_DAY_RULES,
  SIX_PRIVACY_NOTICE,
} from '../features/six/sixMeanings';

/* ------------------------------------------------------------------ */
/* 六宫小六壬说明（玩法 / 规则）                                        */
/* ------------------------------------------------------------------ */

export function SixGuide({ variant }: { variant: 'six-play' | 'six-rules' }) {
  if (variant === 'six-play') {
    return (
      <div className="guide">
        <section>
          <h3>一、与九宫玩法有什么不同</h3>
          <ul>
            <li>
              <strong>宫位只有六个</strong>：大安、留连、速喜、赤口、小吉、空亡；没有病符、桃花、天德。
            </li>
            <li>
              <strong>起宫不固定</strong>：九宫永远从大安起正月；六宫要依事由或占人决定从哪一宫起数，
              这是传统六宫法的核心。
            </li>
            <li>
              <strong>空亡不起课</strong>：空亡是空，无实际东西存在，故只作落宫，不作起宫。
            </li>
            <li>两套玩法各自独立，右上角可随时互切；历史记录按宫制分栏显示。</li>
          </ul>
        </section>

        <section>
          <h3>二、选起宫依据</h3>
          <ul>
            <li>
              <strong>通用问事</strong>：不指定事由时，以大安为正月，月上起日、日上起时。
            </li>
            <li>
              <strong>依事由起课</strong>：婚姻杂事→大安（官喜宫）；求财经商→留连（财帛宫）；
              疾厄病苦→速喜（寿宫）；官司诉讼→赤口（监察宫）；外出旅行→小吉（驿马宫）。
            </li>
            <li>
              <strong>依占人起课</strong>：女起重阴，留连是重阴，故女起留连；男起重阳，小吉是重阳，故男起小吉。
            </li>
          </ul>
        </section>

        <section>
          <h3>三、三步掐指</h3>
          <ol>
            <li>第一步（月）：从所选起宫起数，起宫本身计作第 1 位，按六宫顺序循环数到农历月份数字。</li>
            <li>第二步（日）：从月宫的落宫继续起数，数到农历日期数字。</li>
            <li>第三步（时）：从日宫的落宫继续起数，数到时辰数字，所得即为最终落宫。</li>
          </ol>
          <p className="faint">
            六宫循环：{SIX_PALACE_CYCLE_TEXT}
          </p>
        </section>

        <section>
          <h3>四、取数方式</h3>
          <ul>
            <li>
              <strong>农历月日时</strong>：默认按此刻预填（公历自动换算为农历），也可手动改，或按事发的时辰填。
            </li>
            <li>
              <strong>自报三数（变通取数法）</strong>：任意取三个数——电话尾数、座位号、随手想到的数都行，
              只收正整数、大小不限，关键是第一印象、第一感觉。超过 6 的数按六宫周天取余折算到 1～6 再入数，
              落宫与直接数原数完全一致。
            </li>
          </ul>
        </section>

        <section>
          <h3>五、结果怎么读</h3>
          <ul>
            <li>月位看父母、长辈、上级；日位看自身、亲属、家内；时位看子孙、晚辈、财物方位。</li>
            <li>结果页会列出月、日、时三位的六神断词（原文），以及用神喜忌的生克提示。</li>
            <li>操作按钮与九宫一致：暂停 / 继续、上一步 / 下一步、跳过动画、重新演算、动画速度。</li>
          </ul>
        </section>

        <section>
          <h3>六、免责与隐私</h3>
          <p>{INTERPRETATION_DISCLAIMER}</p>
          <p>{PRIVACY_NOTICE}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="guide">
      <section>
        <h3>一、六宫定义与掌位</h3>
        <p className="faint">
          六宫只落在"根 / 尖"两节：大安食指根部、留连食指尖部、速喜中指尖部、
          赤口无名指尖部、小吉无名指根部、空亡中指根部。中间一节不承载宫位。
        </p>
        <div className="guide__table-wrap">
          <table className="guide__table">
            <caption className="faint">六宫与指节对照</caption>
            <thead>
              <tr>
                <th scope="col">序号</th>
                <th scope="col">宫位</th>
                <th scope="col">手指</th>
                <th scope="col">指节</th>
                <th scope="col">五行</th>
                <th scope="col">临神</th>
                <th scope="col">谋事日</th>
              </tr>
            </thead>
            <tbody>
              {SIX_PALACE_META.map((palace) => (
                <tr key={palace.id}>
                  <td className="mono-num">{palace.order}</td>
                  <td className="guide__palace">{palace.name}</td>
                  <td>{FINGER_LABELS[palace.finger]}</td>
                  <td>{SEGMENT_LABELS[palace.segment]}</td>
                  <td>{palace.element}</td>
                  <td>{palace.guardian}</td>
                  <td className="mono-num">{palace.days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3>二、掐指顺序与公式</h3>
        <p>{SIX_PALACE_CYCLE_TEXT}</p>
        <pre className="guide__code">{`// 六宫算法索引：大安 0、留连 1、速喜 2、赤口 3、小吉 4、空亡 5
resultIndex = (startIndex + count - 1) % 6`}</pre>
        <p className="faint">
          算法标识：{SIX_ALGORITHM_NAME}（{SIX_ALGORITHM_VERSION}）。演算开始后本次结果即被固定，
          暂停、继续、回看、跳过、改速度都不会重新计算。
        </p>
      </section>

      <section>
        <h3>三、起课歌诀（事由起宫）</h3>
        <div className="guide__table-wrap">
          <table className="guide__table">
            <thead>
              <tr>
                <th scope="col">事由</th>
                <th scope="col">宫名</th>
                <th scope="col">起宫</th>
                <th scope="col">歌诀</th>
              </tr>
            </thead>
            <tbody>
              {SIX_TOPICS.map((topic) => (
                <tr key={topic.id}>
                  <td>{topic.label}</td>
                  <td>{topic.palaceLabel}</td>
                  <td className="guide__palace">{topic.origin}</td>
                  <td className="faint">{topic.verse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note-warn">
          空亡不起课——空亡是空，无实际东西存在，所以不以空亡起课；空亡只作为落宫出现。
        </p>
      </section>

      <section>
        <h3>四、占人起课</h3>
        <ul>
          <li>
            <strong>女起重阴</strong>：{SIX_PERSON_ORIGIN.female.note}
          </li>
          <li>
            <strong>男起重阳</strong>：{SIX_PERSON_ORIGIN.male.note}
          </li>
        </ul>
      </section>

      <section>
        <h3>五、变通取数：阴阳与吉凶数</h3>
        <ul>
          <li>单数 {SIX_ODD_NUMBERS.join('、')} 为阳；双数 {SIX_EVEN_NUMBERS.join('、')} 为阴。</li>
          <li>吉数：{SIX_LUCKY_NUMBERS.join('、')}；凶数：{SIX_UNLUCKY_NUMBERS.join('、')}。</li>
          <li>
            除固定时辰、来宾报时辰外，还可任意取三个数、写三个汉字、任抽三张扑克等；
            随机取数（电话号、座位号、房间号、年龄数、手机号）千变万化，<strong>关键是第一印象、第一感觉</strong>。
          </li>
          <li>
            本站取数实现：超过 6 的数按 <span className="mono-num">((n − 1) mod 6) + 1</span> 六宫周天取余后入数；
            折算前后对 6 同余，故只缩短计数过程，落宫与直接入数完全一致。
          </li>
        </ul>
      </section>

      <section>
        <h3>六、月、日、时三级取象与用神</h3>
        <ul>
          <li>月份：{SIX_STEP_SUBJECT.month}。</li>
          <li>日子：{SIX_STEP_SUBJECT.day}。</li>
          <li>时辰：{SIX_STEP_SUBJECT.hour}。</li>
        </ul>
        <p>
          <strong>取用神</strong>：占事以宫位取用神——占婚姻以大安、求财以留连、疾病以速喜、官司以赤口、
          出行以小吉为用神；通用问事无指定宫位，以日宫（自身）为用神；占人以四季为用神——春木、夏火、秋金、冬水，依生月所在季节而定。
        </p>
        <p>
          <strong>用神喜忌</strong>：用神与吉神相冲克，主吉事不吉，办事无成，喜事成空；与凶神相冲克，
          主凶事不凶，凶中有吉，化险为夷；与吉神相生，主吉事更吉，喜上加喜；与凶神相生，主凶事更凶，雪上加霜；
          用神受冲克或逢空亡，主事情虚假，吉凶变动不定。
        </p>
        <p className="faint">
          本站按课内其余宫位的五行逐一与用神比对生克，给出喜忌提示；不作确定性断言。
        </p>
      </section>

      <section>
        <h3>七、断课歌诀（分事由）</h3>
        <p className="faint">
          问明事由时，落宫另有专门断语，直接依歌诀断课，再与断词互为参证。
        </p>
        <div className="guide__table-wrap">
          <table className="guide__table">
            <thead>
              <tr>
                <th scope="col">事由</th>
                <th scope="col">落宫</th>
                <th scope="col">歌诀</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(SIX_TOPIC_VERSES) as SixVerseTopicId[]).map((topicId) =>
                SIX_PALACES.map((palace) => (
                  <tr key={`${topicId}-${palace}`}>
                    <td>{SIX_VERSE_TOPIC_LABELS[topicId]}</td>
                    <td className="guide__palace">{palace}</td>
                    <td className="faint">{SIX_TOPIC_VERSES[topicId][palace]}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3>八、五行取事与看吉日</h3>
        <ul>
          {SIX_ELEMENT_CASES.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>：{item.text}
            </li>
          ))}
        </ul>
        <p className="faint">看吉日：</p>
        <ul>
          {SIX_LUCKY_DAY_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <p className="note-warn">
          大运、流年、岁运推演与完整的五行取事库属于进阶内容，本站暂未开放，以免以简驭繁。
        </p>
      </section>

      <section>
        <h3>九、限制、隐私与用途</h3>
        <p>{SIX_INTERPRETATION_DISCLAIMER}</p>
        <p>{SIX_PRIVACY_NOTICE}</p>
        <p className="faint">
          六宫的起课、断词与歌诀依《小六壬精华》整理；掌图与算法分离，改插画不会改变任何计算结果。
          本站为纯前端站点：所有计算、换算与解读都在你的浏览器内完成。
        </p>
      </section>
    </div>
  );
}
