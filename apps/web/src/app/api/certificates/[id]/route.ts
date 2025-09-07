import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import PDFDocument from 'pdfkit'

function generateCertificateNumber() {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `HEK-${y}${m}-${rand}`
}

async function createPdfBuffer({
  userName,
  courseTitle,
  hours,
  issuedAt,
  certificateNumber,
}: {
  userName: string
  courseTitle: string
  hours: number
  issuedAt: Date
  certificateNumber: string
}) {
  return await new Promise<Buffer>((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: any[] = []
    doc.on('data', (d) => chunks.push(d))
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    // Header
    doc
      .fontSize(20)
      .text('Escola Iniciática Caminhos de Hekate', { align: 'center' })
      .moveDown()

    doc
      .fontSize(28)
      .text('Certificado de Conclusão', { align: 'center' })
      .moveDown(2)

    // Recipient
    doc.fontSize(14).text('Concedido a:', { align: 'center' })
    doc.fontSize(22).text(userName, { align: 'center' }).moveDown()

    // Course details
    doc
      .fontSize(14)
      .text(`Pela conclusão do curso:`, { align: 'center' })
    doc
      .fontSize(18)
      .text(courseTitle, { align: 'center' })
      .moveDown()

    doc
      .fontSize(12)
      .text(`Carga horária: ${hours} horas`, { align: 'center' })
      .moveDown(2)

    // Footer details
    doc
      .fontSize(10)
      .text(`Emitido em: ${issuedAt.toLocaleDateString('pt-BR')}`, { align: 'center' })
    doc
      .fontSize(10)
      .text(`Número do certificado: ${certificateNumber}`, { align: 'center' })

    doc.end()
  })
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const userId = session.user.id
    const id = params.id

    // Try to find certificate by id that belongs to user
    let certificate = await prisma.certificate.findFirst({
      where: { id, userId },
      include: { course: true, user: true }
    })

    // If not found, maybe id is a courseId. If user completed, issue certificate.
    if (!certificate) {
      const course = await prisma.course.findUnique({ where: { id }, include: { modules: { select: { id: true } } } })
      if (!course) {
        return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 })
      }

      // Count lessons in course
      const moduleIds = course.modules.map((m) => m.id)
      const totalLessons = moduleIds.length
        ? await prisma.lesson.count({ where: { moduleId: { in: moduleIds } } })
        : 0

      const completedLessons = await prisma.progress.count({
        where: { userId, completed: true, lesson: { module: { courseId: id } } }
      })

      if (totalLessons === 0 || completedLessons < totalLessons) {
        return NextResponse.json({ error: 'Curso não concluído' }, { status: 400 })
      }

      // Find existing certificate for user+course or create one
      certificate = await prisma.certificate.upsert({
        where: { userId_courseId: { userId, courseId: id } },
        create: {
          userId,
          courseId: id,
          certificateNumber: generateCertificateNumber(),
        },
        update: {},
        include: { course: true, user: true }
      })
    }

    const hours = certificate.course.duration ? Math.round((certificate.course.duration || 0) / 60) : 0

    const pdf = await createPdfBuffer({
      userName: certificate.user.name || 'Aluno(a)',
      courseTitle: certificate.course.title,
      hours,
      issuedAt: certificate.issuedAt,
      certificateNumber: certificate.certificateNumber,
    })

    // Convert Buffer to ArrayBuffer for Web Response typing
    // Create a typed Uint8Array copy to satisfy TS BodyInit/BlobPart types
    const typed = new Uint8Array(pdf.length)
    typed.set(pdf)
    const blob = new Blob([typed], { type: 'application/pdf' })
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=certificado-${certificate.course.title.replace(/\s+/g, '-').toLowerCase()}.pdf`
      }
    })
  } catch (error) {
    console.error('Erro ao gerar certificado:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
