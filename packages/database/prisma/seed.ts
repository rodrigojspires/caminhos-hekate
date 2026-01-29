import { PrismaClient } from '@prisma/client';

// Try to load .env files if dotenv is available; otherwise, continue
async function tryLoadDotenv() {
  try {
    const [{ config }, path] = await Promise.all([
      import('dotenv') as Promise<{ config: (options?: any) => void }>,
      import('path') as Promise<typeof import('path')>,
    ])
    // 1) Repo root .env (../../.env when running from packages/database)
    config({ path: path.resolve(process.cwd(), '../../.env') })
    // 2) Local .env (packages/database/.env) if present
    config()
  } catch {
    // Ignore if dotenv is not installed; rely on environment
  }
}

import * as bcrypt from 'bcryptjs';

async function main() {
  await tryLoadDotenv()
  const prisma = new PrismaClient();
  console.log('🌱 Iniciando seed...');

  // Limpar dados existentes
  await prisma.$transaction([
    // Ordem importa para evitar violações de FK
    prisma.paymentTransaction.deleteMany(),
    prisma.userSubscription.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.quizAttempt.deleteMany(),
    prisma.quiz.deleteMany(),
    prisma.certificate.deleteMany(),
    prisma.progress.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.module.deleteMany(),
    prisma.course.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.reaction.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.post.deleteMany(),
    prisma.topic.deleteMany(),
    prisma.download.deleteMany(),
    prisma.review.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.couponUsage.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.inventory.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.subscriptionPlan.deleteMany(),
    prisma.address.deleteMany(),
    prisma.notificationPreference.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.emailTemplate.deleteMany(),
    prisma.whatsAppTemplate.deleteMany(),
    prisma.setting.deleteMany(),
  ]);

  // Criar usuário admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@caminhosdehekate.com.br'
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
  let admin = existingAdmin

  if (!admin) {
    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'HekateAdmin#2024', 10)
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: adminPassword,
        name: 'Administrador',
        role: 'ADMIN',
        subscriptionTier: 'SACERDOCIO',
        emailVerified: new Date(),
      },
    })
    console.log('✅ Usuário admin criado')
  } else {
    console.log('✅ Usuário admin já existe, mantendo dados')
  }

  // Criar planos de assinatura
  const plans = await Promise.all([
    prisma.subscriptionPlan.create({
      data: {
        tier: 'FREE',
        name: 'Visitante',
        description: 'Acesso gratuito ao conteúdo público',
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: {
          access: ['Conteúdo público', 'Comunidade limitada'],
          courses: 0,
          downloads: 0,
        },
      },
    }),
    prisma.subscriptionPlan.create({
      data: {
        tier: 'INICIADO',
        name: 'Iniciado',
        description: 'Primeiros passos nos mistérios de Hekate',
        monthlyPrice: 47,
        yearlyPrice: 470,
        features: {
          access: ['Conteúdo Iniciado', 'Comunidade básica', 'Meditações guiadas'],
          courses: 2,
          downloads: 5,
        },
        maxCourses: 2,
        maxDownloads: 5,
      },
    }),
    prisma.subscriptionPlan.create({
      data: {
        tier: 'ADEPTO',
        name: 'Adepto',
        description: 'Aprofundamento nos ensinamentos',
        monthlyPrice: 97,
        yearlyPrice: 970,
        features: {
          access: ['Todo conteúdo Adepto', 'Comunidade completa', 'Rituais mensais', 'Suporte prioritário'],
          courses: 5,
          downloads: 15,
        },
        maxCourses: 5,
        maxDownloads: 15,
      },
    }),
    prisma.subscriptionPlan.create({
      data: {
        tier: 'SACERDOCIO',
        name: 'Sacerdócio',
        description: 'Acesso completo aos mistérios sagrados',
        monthlyPrice: 197,
        yearlyPrice: 1970,
        features: {
          access: ['Acesso total', 'Mentoria em grupo', 'Rituais exclusivos', 'Certificações'],
          courses: -1, // ilimitado
          downloads: -1,
        },
      },
    }),
  ]);

  console.log('✅ Planos de assinatura criados');

  // Criar categorias
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Rituais',
        slug: 'rituais',
        description: 'Ferramentas e itens para práticas ritualísticas',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Livros & E-books',
        slug: 'livros-ebooks',
        description: 'Material de estudo e aprofundamento',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Objetos Sagrados',
        slug: 'objetos-sagrados',
        description: 'Ícones, estátuas e símbolos de Hekate',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Cursos Digitais',
        slug: 'cursos-digitais',
        description: 'Cursos e workshops online',
      },
    }),
  ]);

  console.log('✅ Categorias criadas');

  // Criar produtos físicos
  const physicalProducts = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Vela Consagrada de Hekate',
        slug: 'vela-consagrada-hekate',
        description: 'Vela ritualística consagrada com ervas sagradas de Hekate. Ideal para invocações, meditações e oferendas.',
        shortDescription: 'Vela ritualística consagrada',
        type: 'PHYSICAL',
        categoryId: categories[0].id,
        featured: true,
        images: ['vela-hekate-1.jpg', 'vela-hekate-2.jpg'],
        variants: {
          create: [
            {
              sku: 'VELA-PRETA',
              name: 'Vela Preta - Proteção',
              price: 35,
              stock: 20,
              weight: 200,
              attributes: { cor: 'Preta', tamanho: '15cm' },
            },
            {
              sku: 'VELA-DOURADA',
              name: 'Vela Dourada - Prosperidade',
              price: 45,
              stock: 15,
              weight: 200,
              attributes: { cor: 'Dourada', tamanho: '15cm' },
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Incensário de Bronze Strophalos',
        slug: 'incensario-bronze-strophalos',
        description: 'Incensário artesanal em bronze com o símbolo Strophalos de Hekate. Perfeito para purificação de ambientes sagrados.',
        shortDescription: 'Incensário artesanal em bronze',
        type: 'PHYSICAL',
        categoryId: categories[0].id,
        images: ['incensario-1.jpg', 'incensario-2.jpg'],
        variants: {
          create: {
            sku: 'INC-BRONZE',
            name: 'Incensário Bronze 10cm',
            price: 120,
            stock: 8,
            weight: 500,
            dimensions: { width: 10, height: 5, depth: 10 },
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Estátua de Hekate Triformis',
        slug: 'estatua-hekate-triformis',
        description: 'Estátua em resina de Hekate em sua forma tríplice, representando os três reinos. Peça única para altar.',
        shortDescription: 'Estátua de Hekate Triformis em resina',
        type: 'PHYSICAL',
        categoryId: categories[2].id,
        featured: true,
        images: ['estatua-hekate-1.jpg', 'estatua-hekate-2.jpg', 'estatua-hekate-3.jpg'],
        variants: {
          create: [
            {
              sku: 'EST-P',
              name: 'Estátua Pequena 15cm',
              price: 180,
              stock: 10,
              weight: 300,
              dimensions: { width: 8, height: 15, depth: 8 },
            },
            {
              sku: 'EST-G',
              name: 'Estátua Grande 30cm',
              price: 350,
              comparePrice: 400,
              stock: 5,
              weight: 800,
              dimensions: { width: 15, height: 30, depth: 15 },
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Kit de Ervas Sagradas de Hekate',
        slug: 'kit-ervas-sagradas',
        description: 'Conjunto de 7 ervas sagradas associadas a Hekate: absinto, mandrágora, beladona (simbólica), alecrim, lavanda, mirra e olíbano.',
        shortDescription: 'Kit com 7 ervas sagradas',
        type: 'PHYSICAL',
        categoryId: categories[0].id,
        images: ['kit-ervas-1.jpg', 'kit-ervas-2.jpg'],
        variants: {
          create: {
            sku: 'KIT-ERVAS',
            name: 'Kit Completo 7 Ervas',
            price: 67,
            stock: 25,
            weight: 150,
          },
        },
      },
    }),
  ]);

  console.log('✅ Produtos físicos criados');

  // Criar produtos digitais
  const digitalProducts = await Promise.all([
    prisma.product.create({
      data: {
        name: 'E-book: Os Mistérios de Hekate',
        slug: 'ebook-misterios-hekate',
        description: 'Guia completo sobre a deusa Hekate, sua história, símbolos e práticas modernas. 200 páginas de conhecimento iniciático.',
        shortDescription: 'E-book completo sobre Hekate',
        type: 'DIGITAL',
        categoryId: categories[1].id,
        featured: true,
        images: ['ebook-misterios-cover.jpg'],
        variants: {
          create: {
            sku: 'EBOOK-MH',
            name: 'E-book PDF',
            price: 47,
            stock: 9999, // Digital não tem limite de estoque
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Ritual Guiado: Invocação de Hekate',
        slug: 'ritual-guiado-invocacao',
        description: 'Áudio guiado de 45 minutos para invocação e conexão com Hekate. Inclui preparação, invocação e fechamento.',
        shortDescription: 'Áudio de ritual guiado',
        type: 'DIGITAL',
        categoryId: categories[3].id,
        images: ['ritual-audio-cover.jpg'],
        variants: {
          create: {
            sku: 'AUDIO-INV',
            name: 'Áudio MP3',
            price: 27,
            stock: 9999,
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Meditação: Jornada aos Três Reinos',
        slug: 'meditacao-tres-reinos',
        description: 'Meditação guiada de 30 minutos para explorar os três reinos de Hekate: Céu, Terra e Submundo.',
        shortDescription: 'Meditação guiada',
        type: 'DIGITAL',
        categoryId: categories[3].id,
        images: ['meditacao-cover.jpg'],
        variants: {
          create: {
            sku: 'MED-3R',
            name: 'Áudio MP3',
            price: 19,
            stock: 9999,
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Oráculo de Hekate - Cartas para Impressão',
        slug: 'oraculo-hekate-pdf',
        description: 'Conjunto de 44 cartas oraculares de Hekate em PDF de alta resolução para impressão. Inclui manual de interpretação.',
        shortDescription: 'Oráculo em PDF para impressão',
        type: 'DIGITAL',
        categoryId: categories[1].id,
        images: ['oraculo-cover.jpg'],
        variants: {
          create: {
            sku: 'ORAC-PDF',
            name: 'PDF Alta Resolução',
            price: 67,
            comparePrice: 87,
            stock: 9999,
          },
        },
      },
    }),
  ]);

  console.log('✅ Produtos digitais criados');

  // Criar cursos
  const courses = await Promise.all([
    prisma.course.create({
      data: {
        title: 'Magia de Hekate — Fundamentos',
        slug: 'magia-hekate-fundamentos',
        description: 'Curso introdutório aos mistérios e práticas de Hekate. Ideal para iniciantes que desejam estabelecer uma conexão profunda com a deusa.',
        shortDescription: 'Introdução aos mistérios de Hekate',
        featuredImage: 'curso-fundamentos-cover.jpg',
        tier: 'INICIADO',
        accessModels: ['ONE_TIME', 'SUBSCRIPTION'],
        status: 'PUBLISHED',
        duration: 480, // 8 horas
        level: 'BEGINNER',
        objectives: ['Compreender a história de Hekate', 'Estabelecer prática devocional', 'Criar altar sagrado', 'Realizar primeiros rituais'],
        requirements: ['Mente aberta', 'Comprometimento com a prática', 'Diário mágico'],
        publishedAt: new Date(),
        modules: {
          create: [
            {
              title: 'História e Mitologia',
              description: 'Explorando as origens e evolução de Hekate',
              order: 1,
              lessons: {
                create: [
                  {
                    title: 'Hekate na Antiguidade',
                    description: 'Das origens anatólias ao mundo greco-romano',
                    content: 'Conteúdo detalhado sobre a história antiga de Hekate...',
                    videoUrl: 'video1.mp4',
                    videoDuration: 1800,
                    order: 1,
                    isFree: true,
                  },
                  {
                    title: 'Símbolos e Atributos',
                    description: 'Chaves, tochas, strophalos e outros símbolos sagrados',
                    content: 'Exploração profunda dos símbolos...',
                    videoUrl: 'video2.mp4',
                    videoDuration: 2400,
                    order: 2,
                  },
                ],
              },
            },
            {
              title: 'Práticas Devocionais',
              description: 'Estabelecendo uma prática regular',
              order: 2,
              lessons: {
                create: [
                  {
                    title: 'Criando seu Altar',
                    description: 'Como montar e consagrar um altar para Hekate',
                    content: 'Guia passo a passo para criar altar...',
                    videoUrl: 'video3.mp4',
                    videoDuration: 2100,
                    order: 1,
                  },
                  {
                    title: 'Oferendas e Deipna',
                    description: 'A prática tradicional das oferendas mensais',
                    content: 'Tradição do Deipna e oferendas modernas...',
                    videoUrl: 'video4.mp4',
                    videoDuration: 1800,
                    order: 2,
                  },
                ],
              },
            },
            {
              title: 'Primeiros Rituais',
              description: 'Introdução à prática ritual',
              order: 3,
              lessons: {
                create: [
                  {
                    title: 'Ritual de Conexão',
                    description: 'Estabelecendo vínculo com Hekate',
                    content: 'Ritual completo para primeira conexão...',
                    videoUrl: 'video5.mp4',
                    videoDuration: 2700,
                    order: 1,
                  },
                  {
                    title: 'Proteção e Limpeza',
                    description: 'Rituais básicos de proteção',
                    content: 'Técnicas de proteção e limpeza energética...',
                    videoUrl: 'video6.mp4',
                    videoDuration: 2400,
                    order: 2,
                  },
                ],
              },
            },
          ],
        },
      },
    }),
    prisma.course.create({
      data: {
        title: 'Mistérios de Hekate — Avançado',
        slug: 'misterios-hekate-avancado',
        description: 'Aprofundamento nos mistérios maiores de Hekate. Para praticantes experientes que buscam iniciação nos segredos mais profundos.',
        shortDescription: 'Mistérios avançados e iniciação',
        featuredImage: 'curso-avancado-cover.jpg',
        tier: 'SACERDOCIO',
        accessModels: ['SUBSCRIPTION'],
        status: 'PUBLISHED',
        duration: 720, // 12 horas
        level: 'ADVANCED',
        objectives: ['Dominar práticas avançadas', 'Trabalhar com os três reinos', 'Desenvolver clarividência', 'Liderar rituais'],
        requirements: ['Conclusão do curso Fundamentos', '1 ano de prática', 'Dedicação a Hekate'],
        publishedAt: new Date(),
        modules: {
          create: [
            {
              title: 'Os Três Reinos',
              description: 'Navegando entre Céu, Terra e Submundo',
              order: 1,
              lessons: {
                create: [
                  {
                    title: 'Jornada ao Submundo',
                    description: 'Práticas de descida e transformação',
                    content: 'Técnicas avançadas de jornada xamânica...',
                    videoUrl: 'adv-video1.mp4',
                    videoDuration: 3600,
                    order: 1,
                  },
                  {
                    title: 'Trabalho com Ancestrais',
                    description: 'Hekate como guia dos mortos',
                    content: 'Práticas de necromancia sagrada...',
                    videoUrl: 'adv-video2.mp4',
                    videoDuration: 3000,
                    order: 2,
                  },
                ],
              },
            },
            {
              title: 'Magia Avançada',
              description: 'Técnicas e práticas secretas',
              order: 2,
              lessons: {
                create: [
                  {
                    title: 'Pharmakeia - A Arte das Poções',
                    description: 'Herbologia sagrada de Hekate',
                    content: 'Preparação de poções e unguentos sagrados...',
                    videoUrl: 'adv-video3.mp4',
                    videoDuration: 4200,
                    order: 1,
                  },
                  {
                    title: 'Invocação e Possessão Divina',
                    description: 'Técnicas de incorporação',
                    content: 'Práticas avançadas de invocação...',
                    videoUrl: 'adv-video4.mp4',
                    videoDuration: 3600,
                    order: 2,
                  },
                ],
              },
            },
            {
              title: 'Iniciação Sacerdotal',
              description: 'O caminho do sacerdócio',
              order: 3,
              lessons: {
                create: [
                  {
                    title: 'Preparação para Iniciação',
                    description: 'Purificação e preparação ritual',
                    content: 'Processo completo de preparação...',
                    videoUrl: 'adv-video5.mp4',
                    videoDuration: 3000,
                    order: 1,
                  },
                  {
                    title: 'Ritual de Iniciação',
                    description: 'Cerimônia de consagração sacerdotal',
                    content: 'Ritual completo de iniciação...',
                    videoUrl: 'adv-video6.mp4',
                    videoDuration: 5400,
                    order: 2,
                  },
                ],
              },
            },
          ],
        },
      },
    }),
  ]);

  console.log('✅ Cursos criados');

  // Criar tópicos da comunidade
  const topics = await Promise.all([
    prisma.topic.create({
      data: {
        name: 'Práticas e Rituais',
        slug: 'praticas-rituais',
        description: 'Compartilhe suas experiências e aprenda novas práticas',
        icon: 'flame',
        color: '#DAA520',
        order: 1,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Estudos e Pesquisas',
        slug: 'estudos-pesquisas',
        description: 'Discussões acadêmicas e estudos aprofundados',
        icon: 'book',
        color: '#9333EA',
        order: 2,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Experiências Pessoais',
        slug: 'experiencias-pessoais',
        description: 'Relatos de jornadas e experiências com Hekate',
        icon: 'heart',
        color: '#EC4899',
        order: 3,
      },
    }),
  ]);

  console.log('✅ Tópicos criados');

  // Criar posts da comunidade
  const posts = await Promise.all([
    prisma.post.create({
      data: {
        title: 'Bem-vindos aos Caminhos de Hekate',
        slug: 'bem-vindos-caminhos-hekate',
        content: `# Bem-vindos, buscadores!

Que as tochas de Hekate iluminem sua jornada neste espaço sagrado de aprendizado e transformação.

Este é um lugar de encontro para todos aqueles que sentem o chamado da Grande Deusa dos Caminhos. Aqui, compartilhamos conhecimento, experiências e apoio mútuo em nossa jornada espiritual.

## O que você encontrará aqui:

- **Conhecimento Ancestral**: Estudos sobre a história, mitologia e práticas de Hekate
- **Práticas Modernas**: Adaptações contemporâneas dos antigos mistérios
- **Comunidade Acolhedora**: Um espaço seguro para compartilhar e aprender
- **Orientação Iniciática**: Caminhos estruturados de desenvolvimento espiritual

Lembre-se: cada jornada é única, e Hekate se revela de formas diferentes para cada devoto. Respeite o caminho dos outros enquanto trilha o seu próprio.

Que suas chaves abram as portas certas,
*Equipe Caminhos de Hekate*`,
        excerpt: 'Mensagem de boas-vindas à nossa comunidade iniciática',
        featuredImage: 'welcome-post.jpg',
        authorId: admin.id,
        topicId: topics[0].id,
        status: 'PUBLISHED',
        tier: 'FREE',
        isPinned: true,
        publishedAt: new Date(),
      },
    }),
    prisma.post.create({
      data: {
        title: 'Ritual Mensal: Deipna de Hekate',
        slug: 'ritual-mensal-deipna',
        content: `# O Deipna: A Ceia de Hekate

O Deipna é uma prática ancestral realizada na lua nova, quando oferecemos uma ceia à Hekate nas encruzilhadas.

## Preparação

1. **Data**: Última noite do mês lunar (lua nova)
2. **Local**: Preferencialmente uma encruzilhada em T ou Y
3. **Horário**: Após o pôr do sol

## Oferendas Tradicionais

- Pão ou bolo de mel
- Ovos
- Alho
- Cebola
- Peixe
- Vinho tinto ou leite
- Mel

## O Ritual

1. Prepare as oferendas em um prato
2. Acenda uma vela ou tocha
3. Caminhe até a encruzilhada sem olhar para trás
4. Deposite as oferendas com reverência
5. Faça sua invocação e pedidos
6. Retorne sem olhar para trás

*Lembre-se: as oferendas devem ser deixadas para os animais e necessitados - esta é uma forma de Hekate nutrir seus protegidos.*`,
        excerpt: 'Guia completo para realizar o tradicional Deipna',
        authorId: admin.id,
        topicId: topics[0].id,
        status: 'PUBLISHED',
        tier: 'FREE',
        publishedAt: new Date(),
      },
    }),
    prisma.post.create({
      data: {
        title: 'Os Símbolos Sagrados: Strophalos',
        slug: 'simbolos-sagrados-strophalos',
        content: `# O Strophalos de Hekate

O Strophalos, também conhecido como Roda de Hekate, é um dos símbolos mais poderosos e misteriosos da deusa.

## Origem e Significado

Este símbolo aparece nos Papiros Mágicos Gregos e nos Oráculos Caldeus. Representa:
- O movimento cósmico
- Os três reinos unidos
- O poder de transformação
- Proteção divina

## Uso Prático

O Strophalos pode ser usado para:
- Meditação e contemplação
- Proteção energética
- Portal para comunicação divina
- Foco em trabalhos mágicos

## Como Criar Seu Strophalos

*[Conteúdo exclusivo para membros Iniciados]*`,
        excerpt: 'Explorando o místico símbolo Strophalos',
        authorId: admin.id,
        topicId: topics[1].id,
        status: 'PUBLISHED',
        tier: 'INICIADO',
        publishedAt: new Date(),
      },
    }),
    prisma.post.create({
      data: {
        title: 'Pharmakeia: As Ervas de Hekate',
        slug: 'pharmakeia-ervas-hekate',
        content: `# A Arte da Pharmakeia

Hekate é conhecida como a Senhora das Ervas e Venenos, mestra da arte da Pharmakeia.

## As Ervas Sagradas

### Ervas Seguras para Prática Moderna:
- **Alecrim**: Proteção e clareza mental
- **Lavanda**: Purificação e paz
- **Artemísia**: Sonhos proféticos e visões
- **Louro**: Sabedoria e vitória
- **Mirra**: Consagração e elevação espiritual

## Preparação de Incensos

*[Receitas exclusivas para membros Adeptos]*

## Óleos Sagrados

*[Fórmulas secretas disponíveis apenas para o Sacerdócio]*`,
        excerpt: 'Herbologia sagrada nos mistérios de Hekate',
        authorId: admin.id,
        topicId: topics[1].id,
        status: 'PUBLISHED',
        tier: 'ADEPTO',
        publishedAt: new Date(),
      },
    }),
    prisma.post.create({
      data: {
        title: 'Jornada ao Submundo: Técnicas de Descida',
        slug: 'jornada-submundo-tecnicas',
        content: `# Descendo aos Reinos Profundos

O trabalho com o Submundo é uma das práticas mais profundas e transformadoras nos mistérios de Hekate.

## Preparação Necessária

Antes de iniciar esta jornada, é essencial:
- Ter estabelecido conexão sólida com Hekate
- Dominar técnicas de proteção psíquica
- Ter acompanhamento de praticante experiente

## A Descida Guiada

*[Conteúdo completo disponível apenas para o Sacerdócio]*

## Integração da Experiência

O retorno é tão importante quanto a descida...

*Este é um trabalho sério que requer preparação adequada. Não tente sem orientação apropriada.*`,
        excerpt: 'Práticas avançadas de jornada ao Submundo',
        authorId: admin.id,
        topicId: topics[2].id,
        status: 'PUBLISHED',
        tier: 'SACERDOCIO',
        publishedAt: new Date(),
      },
    }),
    prisma.post.create({
      data: {
        title: 'Lua Nova de Janeiro: Intenções e Rituais',
        slug: 'lua-nova-janeiro-intencoes',
        content: `# Trabalhando com a Lua Nova

A lua nova é o momento mais poderoso para trabalhar com Hekate, especialmente para:
- Novos começos
- Banimentos
- Proteção
- Mistérios ocultos

## Ritual Sugerido para Esta Lunação

Com a energia de renovação de janeiro, focamos em...

*[Ritual completo para membros Adeptos]*`,
        excerpt: 'Práticas e rituais para a lua nova',
        authorId: admin.id,
        topicId: topics[0].id,
        status: 'PUBLISHED',
        tier: 'ADEPTO',
        publishedAt: new Date(),
      },
    }),
  ]);

  console.log('✅ Posts da comunidade criados');

  // Criar templates de e-mail
  await Promise.all([
    prisma.emailTemplate.create({
      data: {
        name: 'welcome',
        slug: 'welcome',
        subject: 'Bem-vindo aos Caminhos de Hekate',
        htmlContent: `<h1>Que as tochas de Hekate iluminem seu caminho, {{name}}!</h1>
<p>Sua jornada nos mistérios sagrados começa agora.</p>`,
        textContent: `Que as tochas de Hekate iluminem seu caminho, {{name}}!
Sua jornada nos mistérios sagrados começa agora.`,
        variables: ['name', 'email'],
        createdBy: admin.id,
      },
    }),
    prisma.emailTemplate.create({
      data: {
        name: 'order-confirmation',
        slug: 'order-confirmation',
        subject: 'Pedido Confirmado - #{{orderNumber}}',
        htmlContent: `<h1>Seu pedido foi confirmado!</h1>
<p>Número do pedido: {{orderNumber}}</p>
<p>Total: R$ {{total}}</p>`,
        textContent: `Seu pedido foi confirmado!
Número do pedido: {{orderNumber}}
Total: R$ {{total}}`,
        variables: ['orderNumber', 'total', 'items'],
        createdBy: admin.id,
      },
    }),
  ]);

  console.log('✅ Templates de e-mail criados');

  // Criar configurações iniciais
  await Promise.all([
    prisma.setting.create({
      data: {
        key: 'site_name',
        value: 'Escola Iniciática Caminhos de Hekate',
        type: 'string',
        category: 'general',
      },
    }),
    prisma.setting.create({
      data: {
        key: 'site_description',
        value: 'Portal de mistérios, magia e transformação através dos ensinamentos de Hekate',
        type: 'string',
        category: 'general',
      },
    }),
    prisma.setting.create({
      data: {
        key: 'maintenance_mode',
        value: false,
        type: 'boolean',
        category: 'general',
      },
    }),
  ]);

  console.log('✅ Configurações criadas');

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log(`\n📧 Admin: ${process.env.ADMIN_EMAIL || 'admin@caminhosdehekate.com.br'}`);
  console.log(`🔑 Senha: ${process.env.ADMIN_PASSWORD || 'HekateAdmin#2024'}`);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  });
