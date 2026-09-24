import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark className="h-10 w-10" />
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-ink-3">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-canvas hover:bg-brand-strong">Back to home</Link>
    </div>
  );
}
