import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { getUser } from "@/lib/session";

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <LoginForm />
    </main>
  );
}
