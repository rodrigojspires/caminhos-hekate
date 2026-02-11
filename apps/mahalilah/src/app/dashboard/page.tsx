import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { RULES } from "@hekate/mahalilah-core";
import { DashboardClient } from "@/components/mahalilah/DashboardClient";
import { Navbar } from "@/components/marketing/Navbar";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/dashboard")}`);
  }

  return (
    <>
      <Navbar />
      <main>
        <section style={{ display: "grid", gap: 20 }}>
          <header>
            <div className="badge">Painel do terapeuta</div>
            <h1 style={{ fontSize: 34, marginBottom: 6 }}>
              Minhas sessões Maha Lilah
            </h1>
            <p style={{ color: "var(--muted)" }}>
              Início canônico: casa {RULES.start.house} • necessário rolar 6
              para iniciar.
            </p>
          </header>
          <DashboardClient />
        </section>
      </main>
    </>
  );
}
