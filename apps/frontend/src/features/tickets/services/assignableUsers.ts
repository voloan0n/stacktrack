export type AssignableUser = {
  id: string;
  name: string;
  email: string;
  avatarColor?: string | null;
  isAdmin?: boolean;
};

export async function fetchAssignableUsers(): Promise<AssignableUser[]> {
  const res = await fetch("/api/proxy/users/assignable", { cache: "no-store" });
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.message || "Failed to load users");
  }

  return json?.users || [];
}
