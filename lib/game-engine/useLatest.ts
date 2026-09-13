"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * A ref that always holds the most recent value of `value`.
 *
 * Game loops run outside React's render cycle and must read the current
 * callback or prop without being restarted when it changes. Writing to the
 * ref inside a layout effect (rather than during render) keeps it compatible
 * with the React Compiler, which forbids ref mutation while rendering.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
