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
  searchParams?: {
    adminOpenToken?: string | string[];
  };
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

function getSingleSearchParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
    return value[0];
  }
  return null;
}

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";
  const adminOpenToken = getSingleSearchParam(searchParams?.adminOpenToken);

  if (!session?.user?.email) {
    const callbackPath = adminOpenToken
      ? `/rooms/${params.code}?adminOpenToken=${encodeURIComponent(adminOpenToken)}`
      : `/rooms/${params.code}`;
    redirect(
      `/login?callbackUrl=${encodeURIComponent(callbackPath)}`,
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

  const hasAdminOpenAccess = Boolean(adminOpenToken);
  const canAccessClosedRoom = isAdmin || hasAdminOpenAccess;

  if (room.status !== "ACTIVE" && !canAccessClosedRoom) {
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
                Voltar ao painel
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
        <RoomClient
          code={params.code}
          adminOpenToken={adminOpenToken || undefined}
        />
      </section>
    </main>
  );
}
