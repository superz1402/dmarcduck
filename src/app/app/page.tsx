import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Dashboard } from "@/components/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AppPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Dashboard userEmail={user.email} />
    </div>
  );
}
