import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
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

  return (
    <main style={{ paddingTop: 20, paddingBottom: 72 }}>
      <section className="grid" style={{ gap: 14 }}>
        <RoomClient code={params.code} />
      </section>
    </main>
  );
}
