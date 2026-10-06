import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20">
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        An account lets you register domains, keep history, and (on paid plans)
        automate report collection. Already have one?{" "}
        <Link href="/login" className="text-accent underline underline-offset-2">
          Sign in
        </Link>
      </p>
      <div className="mt-8">
        <AuthForm mode="signup" />
      </div>
    </div>
  );
}
