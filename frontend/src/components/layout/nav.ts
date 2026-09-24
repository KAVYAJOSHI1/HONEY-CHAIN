import {
  Activity, BarChart3, Bell, Boxes, BrainCircuit, GitCompareArrows, Hexagon, LayoutDashboard, Map, ScrollText, ShieldCheck, type LucideIcon,
} from "lucide-react";

export interface NavItem { href: string; label: string; icon: LucideIcon; exact?: boolean }
export interface NavGroup { label: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  {
    label: "Beekeeper",
    items: [
      { href: "/beekeeper", label: "Hive fleet", icon: LayoutDashboard, exact: true },
      { href: "/beekeeper/apiary", label: "Apiaries", icon: Hexagon },
      { href: "/ai-insights", label: "AI insights", icon: BrainCircuit },
      { href: "/alerts", label: "Alerts", icon: Bell },
    ],
  },
  {
    label: "KVIC authority",
    items: [
      { href: "/admin", label: "Command center", icon: Map, exact: true },
      { href: "/admin/batches", label: "Batch registry", icon: Boxes },
      { href: "/admin/batch-comparison", label: "Compare batches", icon: GitCompareArrows },
      { href: "/admin/analytics", label: "Analytics & reports", icon: BarChart3 },
      { href: "/admin/security", label: "Security", icon: ShieldCheck },
      { href: "/admin/audit-logs", label: "Audit trail", icon: ScrollText },
    ],
  },
  {
    label: "Platform",
    items: [{ href: "/system-health", label: "System health", icon: Activity }],
  },
];
