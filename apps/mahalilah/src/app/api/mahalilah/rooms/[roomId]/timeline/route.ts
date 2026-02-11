import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@hekate/database";

interface RouteParams {
  params: { roomId: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const room = await prisma.mahaLilahRoom.findUnique({
      where: { id: params.roomId },
      select: {
        id: true,
        createdByUserId: true,
        code: true,
        participants: {
          select: { userId: true },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Sala não encontrada" },
        { status: 404 },
      );
    }

    const isRoomParticipant = room.participants.some(
      (participant) => participant.userId === session.user.id,
    );
    if (room.createdByUserId !== session.user.id && !isRoomParticipant) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const [moves, aiReports, standaloneDraws] = await prisma.$transaction([
      prisma.mahaLilahMove.findMany({
        where: { roomId: room.id },
        orderBy: { createdAt: "asc" },
        include: {
          participant: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          therapyEntries: {
            include: {
              participant: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
          cardDraws: {
            include: {
              drawnBy: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
        },
      }),
      prisma.mahaLilahAiReport.findMany({
        where: { roomId: room.id },
        orderBy: { createdAt: "desc" },
        include: {
          participant: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
      prisma.mahaLilahCardDraw.findMany({
        where: { roomId: room.id, moveId: null },
        orderBy: { createdAt: "asc" },
        include: {
          drawnBy: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      room: { id: room.id, code: room.code },
      moves,
      aiReports,
      cardDraws: standaloneDraws,
    });
  } catch (error) {
    console.error("Erro ao carregar timeline Maha Lilah:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
