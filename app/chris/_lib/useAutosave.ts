"use client";

import { useEffect, useRef } from "react";

// Debounced autosave. Watches `deps`; after they stop changing for `delay` ms,
// calls `save`. Skips the initial mount (so opening an editor doesn't write).
// Used alongside an explicit Save button — both persist; the button also closes.
export function useAutosave(
  deps: ReadonlyArray<unknown>,
  save: () => void,
  opts?: { delay?: number; enabled?: boolean }
) {
  const delay = opts?.delay ?? 600;
  const enabled = opts?.enabled ?? true;
  const firstRun = useRef(true);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!enabled) return;
    const t = setTimeout(() => saveRef.current(), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
