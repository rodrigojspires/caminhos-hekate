import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@hekate/database";
import { RoomClient } from "@/components/mahalilah/RoomClient";
import { withSeoDefaults } from "@/lib/marketing/seo";

interface RoomPageProps {
  params: { code: string };
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = withSeoDefaults(
  {
    title: "Sala Maha Lilah",
    description:
      "Sala privada do Maha Lilah Online para condução de jornadas terapêuticas ao vivo.",
    openGraph: {
      title: "Sala Maha Lilah Online",
      description:
        "Sala privada do Maha Lilah Online para condução de jornadas terapêuticas ao vivo.",
      url: "/rooms",
    },
  },
  { noIndex: true, canonicalPath: "/rooms" },
);

export default async function RoomPage({ params }: RoomPageProps) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  if (!session?.user?.email) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/rooms/${params.code}`)}`,
    );
  }

  const room = await prisma.mahaLilahRoom.findUnique({
    where: { code: params.code },
  });

  if (!room) {
    return (
      <main>
        <div className="card">Sala não encontrada.</div>
      </main>
    );
  }

  if (room.status !== "ACTIVE" && !isAdmin) {
    return (
      <main style={{ paddingTop: 20, paddingBottom: 72 }}>
        <section className="grid" style={{ gap: 14 }}>
          <div className="card" style={{ display: "grid", gap: 10 }}>
            <strong>Sala encerrada</strong>
            <span className="small-muted">
              A sala {room.code} já foi encerrada e não pode mais ser aberta no
              tabuleiro.
            </span>
            <div>
              <Link href="/dashboard" className="btn-secondary">
                Voltar ao dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={{ paddingTop: 20, paddingBottom: 72 }}>
      <section className="grid" style={{ gap: 14 }}>
        <RoomClient code={params.code} />
      </section>
    </main>
  );
}
