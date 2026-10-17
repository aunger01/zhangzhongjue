/**
 * 背景粒子
 * 数量受控（默认 16 项），缓慢漂浮，减少动效模式下静止显示。
 */

import { useMemo } from 'react';
import './Motes.css';

export interface MotesProps {
  count?: number;
  reducedMotion: boolean;
}

interface Mote {
  left: number;
  top: number;
  duration: number;
  delay: number;
  scale: number;
  variant: 'a' | 'b';
}

/** 用确定性算法生成粒子分布，避免每次渲染跳动 */
function buildMotes(count: number): Mote[] {
  const motes: Mote[] = [];
  for (let i = 0; i < count; i += 1) {
    const seed = (i * 2654435761) % 1000;
    const seed2 = (i * 40503 + 12345) % 1000;
    motes.push({
      left: (seed / 1000) * 100,
      top: 40 + (seed2 / 1000) * 58,
      duration: 16 + ((seed2 % 17) / 10) * 6,
      delay: (seed % 14) / 2,
      scale: 0.6 + ((seed2 % 7) / 10) * 1.1,
      variant: i % 3 === 0 ? 'b' : 'a',
    });
  }
  return motes;
}

export function Motes({ count = 16, reducedMotion }: MotesProps) {
  const motes = useMemo(() => buildMotes(count), [count]);

  return (
    <div className="motes" aria-hidden="true">
      {motes.map((mote, index) => (
        <span
          key={index}
          className={`mote ${mote.variant === 'b' ? 'mote--b' : ''}`}
          style={{
            left: `${mote.left}%`,
            top: `${mote.top}%`,
            animationDuration: reducedMotion ? '0s' : `${mote.duration}s`,
            animationDelay: reducedMotion ? '0s' : `${mote.delay}s`,
            transform: `scale(${mote.scale})`,
          }}
        />
      ))}
    </div>
  );
}
