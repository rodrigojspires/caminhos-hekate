import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Navbar } from "@/components/marketing/Navbar";
import { FaturasClient } from "@/components/mahalilah/FaturasClient";

export default async function FaturasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/faturas")}`);
  }

  return (
    <>
      <Navbar />
      <main>
        <section style={{ display: "grid", gap: 20 }}>
          <header>
            <div className="badge">Cobranças</div>
            <h1 style={{ fontSize: 34, marginBottom: 6 }}>Minhas faturas</h1>
          </header>
          <FaturasClient />
        </section>
      </main>
    </>
  );
}
