"use client";

import { useContext, useState } from "react";

import { RailContext, type RailState } from "@/components/shell/RailContext";
import { railCookie } from "@/lib/railCookie";

export function useRailState(initialCollapsed: boolean): RailState {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = railCookie(next, window.location.protocol === "https:");
  }

  return { collapsed, toggle };
}

export function useRail(): RailState {
  return useContext(RailContext);
}
