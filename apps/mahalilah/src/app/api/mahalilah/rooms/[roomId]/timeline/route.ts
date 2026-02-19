import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@hekate/database";

interface RouteParams {
  params: { roomId: string };
}

function buildCardImageUrl(
  deckId: string,
  imageExtension: string,
  cardNumber: number,
) {
  const normalizedExtension = imageExtension.replace(/^\./, "");
  return `/api/mahalilah/decks/${deckId}/images/${cardNumber}.${normalizedExtension}`;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const url = new URL(request.url);
    const context = url.searchParams.get("context");
    const isRoomContext = context === "room";

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const room = await prisma.mahaLilahRoom.findUnique({
      where: { id: params.roomId },
      select: {
        id: true,
        createdByUserId: true,
        isVisibleToPlayers: true,
        therapistSoloPlay: true,
        code: true,
        participants: {
          select: { id: true, userId: true, role: true },
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

    const requesterParticipant = room.participants.find(
      (participant) => participant.userId === session.user.id,
    );
    const therapistParticipant = room.participants.find(
      (participant) => participant.role === "THERAPIST",
    );
    const isCreator = room.createdByUserId === session.user.id;

    if (!isCreator && !room.isVisibleToPlayers && !isRoomContext) {
      return NextResponse.json(
        {
          error:
            "Esta sessão ainda não foi disponibilizada pelo terapeuta para visualização.",
        },
        { status: 403 },
      );
    }

    const shouldUseTherapistScopeForRoomView = Boolean(
      !isCreator &&
        isRoomContext &&
        room.therapistSoloPlay &&
        requesterParticipant?.role === "PLAYER" &&
        therapistParticipant?.id,
    );

    const participantScopeId = !isCreator
      ? shouldUseTherapistScopeForRoomView
        ? therapistParticipant?.id ?? null
        : requesterParticipant?.id ?? null
      : null;

    const [moves, aiReports, standaloneDraws] = await prisma.$transaction([
      prisma.mahaLilahMove.findMany({
        where: participantScopeId
          ? { roomId: room.id, participantId: participantScopeId }
          : { roomId: room.id },
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
            orderBy: { createdAt: "asc" },
            include: {
              card: {
                include: {
                  deck: true,
                },
              },
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
        where: participantScopeId
          ? { roomId: room.id, participantId: participantScopeId }
          : { roomId: room.id },
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
        where: participantScopeId
          ? { roomId: room.id, moveId: null, drawnByParticipantId: participantScopeId }
          : { roomId: room.id, moveId: null },
        orderBy: { createdAt: "asc" },
        include: {
          card: {
            include: {
              deck: true,
            },
          },
          drawnBy: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
    ]);

    const mapDrawWithCard = (draw: any) => ({
      ...draw,
      card: draw.card
        ? {
            id: draw.card.id,
            cardNumber: draw.card.cardNumber,
            description: draw.card.description,
            keywords: draw.card.keywords,
            observation: draw.card.observation,
            imageUrl: buildCardImageUrl(
              draw.card.deck.id,
              draw.card.deck.imageExtension,
              draw.card.cardNumber,
            ),
            deck: {
              id: draw.card.deck.id,
              name: draw.card.deck.name,
              imageDirectory: draw.card.deck.imageDirectory,
              imageExtension: draw.card.deck.imageExtension,
            },
          }
        : null,
    });

    return NextResponse.json({
      room: { id: room.id, code: room.code },
      moves: moves.map((move) => ({
        ...move,
        cardDraws: move.cardDraws.map(mapDrawWithCard),
      })),
      aiReports,
      cardDraws: standaloneDraws.map(mapDrawWithCard),
    });
  } catch (error) {
    console.error("Erro ao carregar timeline Maha Lilah:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
