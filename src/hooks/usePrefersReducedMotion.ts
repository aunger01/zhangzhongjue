import { useEffect, useState } from 'react';

/** 通用媒体查询 hook（SSR / 无 matchMedia 环境下安全降级） */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return defaultValue;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const list = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    if (typeof list.addEventListener === 'function') {
      list.addEventListener('change', handler);
      return () => list.removeEventListener('change', handler);
    }
    // 旧版 Safari
    list.addListener(handler);
    return () => list.removeListener(handler);
  }, [query]);

  return matches;
}

/** 系统是否要求减少动态效果 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
