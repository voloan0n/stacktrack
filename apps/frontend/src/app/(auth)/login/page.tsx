import SignInForm from "@/features/auth/components/SignInForm";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/features/auth/lib/server";
import AuthSidePanel from "@/features/auth/components/AuthSidePanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "StackTrack | Sign In",
  description: "Sign in to StackTrack to manage tickets, clients, and notifications.",
};

export default async function SignIn() {
  const user = await getServerUser();
  if (user) {
    redirect("/tickets");
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-12 sm:px-8 lg:px-12">
      <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <AuthSidePanel />
        <div className="flex w-full items-center justify-center">
          <SignInForm />
        </div>
      </div>
    </div>
  );
}
