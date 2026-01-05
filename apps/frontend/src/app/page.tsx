import { redirect } from "next/navigation";
import { getServerUser } from "@/features/auth/lib/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  redirect("/tickets");
}
