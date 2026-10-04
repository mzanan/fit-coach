import { createContext } from "react";

export interface RailState {
  collapsed: boolean;
  toggle: () => void;
}

export const RailContext = createContext<RailState>({
  collapsed: false,
  toggle: () => {},
});
