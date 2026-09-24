import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { hiveMeta, severityOf, toneClasses, type Tone } from "@/lib/status";

export function Badge({ tone = "neutral", icon: Icon, children, className = "" }: { tone?: Tone; icon?: LucideIcon; children: ReactNode; className?: string }) {
  const t = toneClasses[tone];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${t.bg} ${t.border} ${t.text} ${className}`}>
      {Icon && <Icon className="h-3 w-3" aria-hidden />}
      {children}
    </span>
  );
}

export function HiveStatusBadge({ status }: { status: string }) {
  const m = hiveMeta(status);
  return <Badge tone={m.tone} icon={m.icon}>{m.label}</Badge>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  const m = severityOf(severity);
  return <Badge tone={m.tone} icon={m.icon}>{m.label}</Badge>;
}

export function Dot({ tone, pulse }: { tone: Tone; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${toneClasses[tone].dot}`} />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${toneClasses[tone].dot}`} />
    </span>
  );
}
