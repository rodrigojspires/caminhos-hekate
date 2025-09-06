import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { nanoid } from 'nanoid'

// Verificar se o usuário é admin
async function checkAdminPermission() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return { error: 'Não autorizado', status: 401 }
  }

  if (session.user.role !== 'ADMIN') {
    return { error: 'Acesso negado. Apenas administradores podem fazer upload de arquivos.', status: 403 }
  }

  return { user: session.user }
}

// Configurações de upload
const UPLOAD_CONFIG = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  uploadDir: 'public/uploads',
  maxFilenameLength: 100
}

// Função para sanitizar nome do arquivo
function sanitizeFilename(filename: string): string {
  // Remove caracteres especiais e espaços
  const sanitized = filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()

  // Limita o tamanho do nome
  if (sanitized.length > UPLOAD_CONFIG.maxFilenameLength) {
    const ext = sanitized.split('.').pop()
    const name = sanitized.substring(0, UPLOAD_CONFIG.maxFilenameLength - (ext?.length || 0) - 1)
    return `${name}.${ext}`
  }

  return sanitized
}

// Função para gerar nome único do arquivo
function generateUniqueFilename(originalName: string): string {
  const ext = originalName.split('.').pop()
  const sanitizedName = sanitizeFilename(originalName.replace(`.${ext}`, ''))
  const uniqueId = nanoid(8)
  return `${sanitizedName}_${uniqueId}.${ext}`
}

export async function POST(request: NextRequest) {
  try {
    // Verificar permissões
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json(
        { message: authCheck.error },
        { status: authCheck.status }
      )
    }

    // Obter dados do formulário
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string || 'general'

    if (!file) {
      return NextResponse.json(
        { message: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    if (!UPLOAD_CONFIG.allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          message: `Tipo de arquivo não permitido. Tipos aceitos: ${UPLOAD_CONFIG.allowedTypes.join(', ')}` 
        },
        { status: 400 }
      )
    }

    // Validar tamanho do arquivo
    if (file.size > UPLOAD_CONFIG.maxFileSize) {
      return NextResponse.json(
        { 
          message: `Arquivo muito grande. Tamanho máximo: ${UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB` 
        },
        { status: 400 }
      )
    }

    // Criar diretório se não existir
    const uploadDir = join(process.cwd(), UPLOAD_CONFIG.uploadDir, type)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Gerar nome único para o arquivo
    const filename = generateUniqueFilename(file.name)
    const filepath = join(uploadDir, filename)

    // Converter arquivo para buffer e salvar
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Gerar URL pública
    const publicUrl = `/uploads/${type}/${filename}`

    return NextResponse.json({
      message: 'Upload realizado com sucesso',
      url: publicUrl,
      filename,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Endpoint para deletar arquivo
export async function DELETE(request: NextRequest) {
  try {
    // Verificar permissões
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json(
        { message: authCheck.error },
        { status: authCheck.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const filepath = searchParams.get('filepath')

    if (!filepath) {
      return NextResponse.json(
        { message: 'Caminho do arquivo não fornecido' },
        { status: 400 }
      )
    }

    // Validar que o arquivo está no diretório de uploads
    if (!filepath.startsWith('/uploads/')) {
      return NextResponse.json(
        { message: 'Caminho de arquivo inválido' },
        { status: 400 }
      )
    }

    const fullPath = join(process.cwd(), 'public', filepath)

    // Verificar se o arquivo existe
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { message: 'Arquivo não encontrado' },
        { status: 404 }
      )
    }

    // Deletar arquivo
    const { unlink } = await import('fs/promises')
    await unlink(fullPath)

    return NextResponse.json({
      message: 'Arquivo deletado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao deletar arquivo:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}