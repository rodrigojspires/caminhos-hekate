import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir, access } from 'fs/promises'
import { join } from 'path'
import { existsSync, constants } from 'fs'
import { nanoid } from 'nanoid'

// Verificar se o usuário é admin
type AdminPermissionResult =
  | { error: string; status: number }
  | { user: Record<string, unknown> }

async function checkAdminPermission(): Promise<AdminPermissionResult> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return { error: 'Não autorizado', status: 401 }
  }

  if (session.user.role !== 'ADMIN') {
    return { error: 'Acesso negado. Apenas administradores podem fazer upload de arquivos.', status: 403 }
  }

  return { user: session.user }
}

const PUBLIC_ROOT = (() => {
  const candidates = [
    join(process.cwd(), 'apps', 'web', 'public'),
    join(process.cwd(), 'public')
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return join(process.cwd(), 'public')
})()

// Adiciona root privado para vídeos de cursos
const PRIVATE_ROOT = (() => {
  const envDir = process.env.PRIVATE_UPLOAD_ROOT
  const candidates = [
    envDir,
    '/app/uploads',
    join(process.cwd(), 'apps', 'web', 'private_uploads'),
    join(process.cwd(), 'private_uploads'),
  ].filter(Boolean) as string[]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return join(process.cwd(), 'apps', 'web', 'private_uploads')
})()

const BASE_UPLOAD_DIR = join(PUBLIC_ROOT, 'uploads')
const MAX_FILENAME_LENGTH = 100

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
const DOCUMENT_TYPES = [
  'application/pdf',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/json',
  'application/octet-stream'
]

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const VIDEO_MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB
const ASSET_MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

const UPLOAD_TYPE_CONFIG: Record<string, { allowedTypes: string[]; maxFileSize: number }> = {
  default: {
    allowedTypes: [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOCUMENT_TYPES],
    maxFileSize: VIDEO_MAX_FILE_SIZE
  },
  general: {
    allowedTypes: [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOCUMENT_TYPES],
    maxFileSize: VIDEO_MAX_FILE_SIZE
  },
  product: {
    allowedTypes: IMAGE_TYPES,
    maxFileSize: DEFAULT_MAX_FILE_SIZE
  },
  'course-images': {
    allowedTypes: IMAGE_TYPES,
    maxFileSize: DEFAULT_MAX_FILE_SIZE
  },
  'course-videos': {
    allowedTypes: VIDEO_TYPES,
    maxFileSize: VIDEO_MAX_FILE_SIZE
  },
  'lesson-assets': {
    allowedTypes: [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOCUMENT_TYPES],
    maxFileSize: ASSET_MAX_FILE_SIZE
  }
}

// Função para sanitizar nome do arquivo
function sanitizeFilename(filename: string): string {
  // Remove caracteres especiais e espaços
  const sanitized = filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()

  // Limita o tamanho do nome
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = sanitized.split('.').pop()
    const name = sanitized.substring(0, MAX_FILENAME_LENGTH - (ext?.length || 0) - 1)
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
    if ('error' in authCheck) {
      return NextResponse.json(
        { message: authCheck.error },
        { status: authCheck.status }
      )
    }

    // Obter dados do formulário
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const rawType = (formData.get('type') as string) || 'general'
    const sanitizedType = rawType
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
      .trim() || 'general'

    const uploadCategory = Object.prototype.hasOwnProperty.call(UPLOAD_TYPE_CONFIG, sanitizedType)
      ? sanitizedType
      : 'general'
    const typeConfig = UPLOAD_TYPE_CONFIG[uploadCategory]

    if (!file) {
      return NextResponse.json(
        { message: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    if (!typeConfig.allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          message: `Tipo de arquivo não permitido. Tipos aceitos: ${typeConfig.allowedTypes.join(', ')}` 
        },
        { status: 400 }
      )
    }

    // Validar tamanho do arquivo
    if (file.size > typeConfig.maxFileSize) {
      return NextResponse.json(
        { 
          message: `Arquivo muito grande. Tamanho máximo: ${Math.round(typeConfig.maxFileSize / (1024 * 1024))}MB` 
        },
        { status: 400 }
      )
    }

    // Criar diretório se não existir e preparar caminho/URL
    const isCourseVideo = uploadCategory === 'course-videos'
    let uploadDir = isCourseVideo
      ? join(PRIVATE_ROOT, 'uploads', uploadCategory)
      : join(BASE_UPLOAD_DIR, uploadCategory)
    let urlBase = isCourseVideo
      ? `/private/${uploadCategory}`
      : `/uploads/${uploadCategory}`

    if (!existsSync(uploadDir)) {
      try {
        await mkdir(uploadDir, { recursive: true })
      } catch {
        // ignore mkdir errors here; we'll handle access below
      }
    }

    // Se não for vídeo de curso, verificar permissão de escrita e fazer fallback para diretório privado se necessário
    if (!isCourseVideo) {
      try {
        await access(uploadDir, constants.W_OK)
      } catch {
        // Fallback: usar diretório privado /app/uploads
        uploadDir = join(PRIVATE_ROOT, 'uploads', uploadCategory)
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true })
        }
        // Ajustar URL para servir via API
        urlBase = `/api/media/public/uploads/${uploadCategory}`
      }
    }

    // Gerar nome único para o arquivo
    const filename = generateUniqueFilename(file.name)
    const filepath = join(uploadDir, filename)

    // Converter arquivo para buffer e salvar
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Gerar URL
    const url = `${urlBase}/${filename}`

    return NextResponse.json({
      message: 'Upload realizado com sucesso',
      url,
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
    if ('error' in authCheck) {
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

    const sanitizedPath = filepath.replace(/^\/+/, '')

    let fullPath: string | null = null
    if (sanitizedPath.startsWith('uploads/')) {
      fullPath = join(PUBLIC_ROOT, sanitizedPath)
    } else if (sanitizedPath.startsWith('api/media/public/uploads/')) {
      const rel = sanitizedPath.replace(/^api\/media\/public\//, '') // e.g. uploads/course-images/filename.jpg
      fullPath = join(PRIVATE_ROOT, rel)
    } else if (sanitizedPath.startsWith('private/course-videos/')) {
      const rel = sanitizedPath.replace(/^private\//, '') // e.g. course-videos/filename.mp4
      fullPath = join(PRIVATE_ROOT, 'uploads', rel)
    } else {
      return NextResponse.json(
        { message: 'Caminho de arquivo inválido' },
        { status: 400 }
      )
    }

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
