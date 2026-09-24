import { redirect } from "next/navigation";

// Legacy QR path — the canonical passport lives at /consumer/[batchId].
export default function LegacyPassport({ params }: { params: { batchId: string } }) {
  redirect(`/consumer/${encodeURIComponent(params.batchId)}`);
}
