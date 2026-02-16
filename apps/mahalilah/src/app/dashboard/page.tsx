import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { RULES } from "@hekate/mahalilah-core";
import { DashboardClient } from "@/components/mahalilah/DashboardClient";
import { Navbar } from "@/components/marketing/Navbar";
import { withSeoDefaults } from "@/lib/marketing/seo";

export const metadata: Metadata = withSeoDefaults(
  {
    title: "Dashboard",
    description: "Painel interno do Maha Lilah Online para gestão de sessões e participantes.",
    openGraph: {
      title: "Dashboard Maha Lilah Online",
      description: "Painel interno do Maha Lilah Online para gestão de sessões e participantes.",
      url: "/dashboard",
    },
  },
  { noIndex: true },
);

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
            <div className="badge">Painel de sessões</div>
            <h1 style={{ fontSize: 34, marginBottom: 6 }}>
              Minhas sessões Maha Lilah
            </h1>
          </header>
          <DashboardClient />
        </section>
      </main>
    </>
  );
}
