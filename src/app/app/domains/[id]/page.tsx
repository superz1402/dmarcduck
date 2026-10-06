import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { DomainDetail } from "@/components/domain-detail";

export const metadata: Metadata = { title: "Domain detail" };

export default async function DomainPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <DomainDetail domainId={id} />
    </div>
  );
}
