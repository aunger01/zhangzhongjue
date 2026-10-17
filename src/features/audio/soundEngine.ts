/**
 * 音效引擎
 *
 * 设计取舍：
 *   - 不使用任何音频文件，全部用 WebAudio 实时合成（体积为 0，无版权问题，无需网络请求）；
 *   - **默认开启**：受浏览器自动播放策略限制，AudioContext 只能在用户手势中创建/恢复，
 *     故采用惰性初始化——首个触发音效的交互（点击任一按钮）落在用户手势栈内，此时建上下文；
 *     若浏览器仍拦截，所有调用静默失败，绝不影响主要流程；
 *   - 用户可随时通过导航栏的音效按钮手动关闭/开启。
 */

export type SoundName = 'click' | 'land' | 'complete';

interface ToneSpec {
  type: OscillatorType;
  freq: number;
  /** 相对起始时间的延迟（秒） */
  delay: number;
  duration: number;
  gain: number;
  /** 结束频率（做轻微滑音） */
  endFreq?: number;
}

const TONES: Record<SoundName, ToneSpec[]> = {
  click: [{ type: 'triangle', freq: 880, delay: 0, duration: 0.045, gain: 0.07 }],
  land: [
    { type: 'sine', freq: 523.25, delay: 0, duration: 0.28, gain: 0.16, endFreq: 392 },
    { type: 'sine', freq: 784, delay: 0.02, duration: 0.22, gain: 0.07 },
  ],
  complete: [
    { type: 'sine', freq: 523.25, delay: 0, duration: 0.3, gain: 0.13 },
    { type: 'sine', freq: 659.25, delay: 0.14, duration: 0.3, gain: 0.12 },
    { type: 'sine', freq: 783.99, delay: 0.28, duration: 0.42, gain: 0.12 },
  ],
};

class SoundEngine {
  private ctx: AudioContext | null = null;

  /** 默认开启；音频上下文在首次可用手势中惰性创建 */
  private enabled = true;

  /** 用户开关状态 */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** 开启/关闭。开启时若当前处于用户手势内，会顺带创建/恢复音频上下文。 */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      this.ensureContext();
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** 播放一个音效；任何异常都被吞掉，不影响主流程 */
  play(name: SoundName): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      TONES[name].forEach((tone) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = tone.type;
        const start = now + tone.delay;
        osc.frequency.setValueAtTime(tone.freq, start);
        if (tone.endFreq) {
          osc.frequency.exponentialRampToValueAtTime(tone.endFreq, start + tone.duration);
        }
        // 简易 ADSR：短促起音 + 指数衰减
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(tone.gain, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + tone.duration + 0.02);
      });
    } catch {
      // 忽略：音效不能影响主要流程
    }
  }
}

/** 单例：整个应用共用一个音频上下文 */
export const soundEngine = new SoundEngine();
