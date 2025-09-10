import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema parcial para atualização do template (apenas campos seguros e simples)
const emailTemplateUpdateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  subject: z.string().min(1, 'Assunto é obrigatório').optional(),
  htmlContent: z.string().min(1, 'Conteúdo HTML é obrigatório').optional(),
  textContent: z.string().optional(),
  variables: z.any().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.any().optional(),
  previewData: z.any().optional(),
  isDefault: z.boolean().optional(),
  slug: z.string().min(1).optional(),
});

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Acesso negado. Apenas administradores podem acessar.' }, { status: 403 }) };
  }

  return { session } as const;
}

// GET /api/admin/email-templates/[id] - Obter template por ID
export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  try {
    const auth = await assertAdmin();
    if ('error' in auth) return auth.error;

    const { id } = context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID do template é obrigatório' }, { status: 400 });
    }

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        subject: true,
        htmlContent: true,
        textContent: true,
        variables: true,
        category: true,
        status: true,
        version: true,
        isDefault: true,
        tags: true,
        metadata: true,
        previewData: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Erro ao obter template:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/admin/email-templates/[id] - Atualizar template por ID
export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  try {
    const auth = await assertAdmin();
    if ('error' in auth) return auth.error;

    const { id } = context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID do template é obrigatório' }, { status: 400 });
    }

    const body = await request.json();
    const validated = emailTemplateUpdateSchema.parse(body);

    const exists = await prisma.emailTemplate.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 });
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...validated,
        updatedBy: auth.session.user.id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        subject: true,
        htmlContent: true,
        textContent: true,
        variables: true,
        category: true,
        status: true,
        version: true,
        isDefault: true,
        tags: true,
        metadata: true,
        previewData: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 });
    }
    console.error('Erro ao atualizar template:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/admin/email-templates/[id] - Excluir template por ID
export async function DELETE(_request: NextRequest, context: { params: { id: string } }) {
  try {
    const auth = await assertAdmin();
    if ('error' in auth) return auth.error;

    const { id } = context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID do template é obrigatório' }, { status: 400 });
    }

    const exists = await prisma.emailTemplate.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 });
    }

    await prisma.emailTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir template:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}