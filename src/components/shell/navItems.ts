import {
  Activity,
  Dumbbell,
  Home,
  MessageCircle,
  Settings,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export interface NavTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_TABS: NavTab[] = [
  { href: "/", label: "Today", icon: Home },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/body", label: "Body", icon: Activity },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/settings", label: "More", icon: Settings },
];

export const SIDE_NAV_ITEMS: NavTab[] = [
  { href: "/", label: "Today", icon: Home },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/body", label: "Body", icon: Activity },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/catalog", label: "Catalog", icon: UtensilsCrossed },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isNavActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
