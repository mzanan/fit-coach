"use client";

import { useEffect, useState } from "react";

export function useElapsedSeconds(since: number, active: boolean): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;
  return Math.max(0, Math.floor((now - since) / 1000));
}
