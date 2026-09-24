export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25Z" fill="rgb(var(--brand))" />
      <path d="M16 9.2 21.9 12.6v6.8L16 22.8l-5.9-3.4v-6.8Z" fill="rgb(var(--canvas))" />
      <path d="M16 12.6 18.95 14.3v3.4L16 19.4l-2.95-1.7v-3.4Z" fill="rgb(var(--brand))" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-ink">Honey Chain</span>
    </span>
  );
}
