import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Util simples para gerar slug a partir do nome
function makeSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Schema de validação para template de email
const emailTemplateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  subject: z.string().min(1, 'Assunto é obrigatório'),
  htmlContent: z.string().min(1, 'Conteúdo HTML é obrigatório'),
  textContent: z.string().optional(),
  // Categoria enum em Prisma; aceitamos string aqui e mapeamos ao salvar
  category: z.string().default('TRANSACTIONAL'),
  // Json em Prisma; array de strings é válido
  variables: z.array(z.string()).default([]),
  // Campo existente no schema Prisma
  tags: z.array(z.string()).default([]),
});

// GET /api/admin/email-templates - Listar todos os templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verificar se o usuário é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar.' },
        { status: 403 }
      );
    }

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        subject: true,
        htmlContent: true,
        textContent: true,
        category: true,
        status: true,
        isDefault: true,
        variables: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/admin/email-templates - Criar novo template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verificar se o usuário é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem criar templates.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = emailTemplateSchema.parse(body);

    // Verificar se já existe um template com mesmo nome
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: { name: validatedData.name }
    });

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Já existe um template com este nome' },
        { status: 400 }
      );
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name: validatedData.name,
        slug: makeSlug(validatedData.name),
        subject: validatedData.subject,
        htmlContent: validatedData.htmlContent,
        textContent: validatedData.textContent,
        category: validatedData.category as any,
        variables: validatedData.variables,
        tags: validatedData.tags,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        subject: true,
        htmlContent: true,
        textContent: true,
        category: true,
        status: true,
        isDefault: true,
        variables: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Erro ao criar template:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/email-templates - Atualizar template existente
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verificar se o usuário é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem atualizar templates.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do template é obrigatório' },
        { status: 400 }
      );
    }

    const validatedData = emailTemplateSchema.parse(updateData);

    // Verificar se já existe outro template com o mesmo nome
    const duplicateTemplate = await prisma.emailTemplate.findFirst({
      where: { 
        name: validatedData.name,
        id: { not: id }
      }
    });

    if (duplicateTemplate) {
      return NextResponse.json(
        { error: 'Já existe outro template com este nome' },
        { status: 400 }
      );
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        name: validatedData.name,
        slug: makeSlug(validatedData.name),
        subject: validatedData.subject,
        htmlContent: validatedData.htmlContent,
        textContent: validatedData.textContent,
        category: validatedData.category as any,
        variables: validatedData.variables,
        tags: validatedData.tags,
        updatedBy: session.user.id,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        subject: true,
        htmlContent: true,
        textContent: true,
        category: true,
        status: true,
        isDefault: true,
        variables: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Erro ao atualizar template:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}