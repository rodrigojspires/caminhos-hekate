import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@hekate/database";
import { RoomClient } from "@/components/mahalilah/RoomClient";

interface RoomPageProps {
  params: { code: string };
}

export const dynamic = "force-dynamic";

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
