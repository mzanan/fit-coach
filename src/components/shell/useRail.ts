"use client";

import { createContext, useContext, useState } from "react";

import { railCookie } from "@/lib/railCookie";

interface RailState {
  collapsed: boolean;
  toggle: () => void;
}

export const RailContext = createContext<RailState>({
  collapsed: false,
  toggle: () => {},
});

export function useRailState(initialCollapsed: boolean): RailState {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = railCookie(next);
  }

  return { collapsed, toggle };
}

export function useRail(): RailState {
  return useContext(RailContext);
}
