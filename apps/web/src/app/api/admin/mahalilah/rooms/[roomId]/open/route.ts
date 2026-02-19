import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@hekate/database";

interface RouteParams {
  params: { roomId: string };
}

function getMahaLilahBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_MAHALILAH_URL ||
    process.env.NEXTAUTH_URL_MAHALILAH ||
    "https://mahalilahonline.com.br"
  );
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const room = await prisma.mahaLilahRoom.findUnique({
      where: { id: params.roomId },
      select: {
        id: true,
        code: true,
        status: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
    }

    const roomUrl = `${getMahaLilahBaseUrl()}/rooms/${room.code}`;

    return NextResponse.json({
      room: {
        id: room.id,
        code: room.code,
        status: room.status,
      },
      roomUrl,
    });
  } catch (error) {
    console.error("Erro ao abrir sala Maha Lilah (admin):", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
