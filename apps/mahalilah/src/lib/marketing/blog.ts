export type BlogSection = {
  heading: string
  paragraphs: string[]
}

export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  category: string
  date: string
  readTime: string
  coverLabel: string
  summary: string[]
  content: BlogSection[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'quando-uma-casa-se-repete-o-que-observar',
    title: 'Quando uma casa se repete: o que observar',
    excerpt:
      'Repetição de casas pode sinalizar temas que pedem tempo, sem pressa nem conclusões fechadas.',
    category: 'Prática',
    date: '2026-01-10',
    readTime: '6 min',
    coverLabel: 'Imagem de capa: tabuleiro com trilha repetida',
    summary: [
      'Observe ritmo, contexto e emoção antes de interpretar repetições.',
      'Use registros breves para comparar sessões com calma.',
      'Evite forçar significados: a repetição pode ser apenas pausa necessária.'
    ],
    content: [
      {
        heading: 'Repetição como um convite ao ritmo',
        paragraphs: [
          'Quando uma casa aparece novamente, o primeiro passo é observar o ritmo da sessão. A repetição pode indicar um tema recorrente, mas também pode ser só o tempo interno de quem joga.',
          'Uma boa prática é registrar o contexto: qual emoção estava presente, qual pergunta foi feita, e qual micro-ação ficou combinada.'
        ]
      },
      {
        heading: 'Comparar sem julgar',
        paragraphs: [
          'A comparação entre sessões ajuda a perceber mudanças sutis. Use o modo terapia para anotar intensidade emocional e sensações corporais, sem buscar uma resposta final.',
          'A repetição deixa pistas sobre o que precisa de cuidado. O objetivo não é acelerar a jornada, mas sustentá-la.'
        ]
      },
      {
        heading: 'Fechamento com leveza',
        paragraphs: [
          'Se a casa se repete, encerre com perguntas abertas: “O que está pedindo mais tempo?” ou “O que fica mais claro hoje?”',
          'A síntese por IA pode ajudar a organizar os registros, respeitando os limites definidos no plano.'
        ]
      }
    ]
  },
  {
    slug: 'como-conduzir-um-grupo-com-seguranca-emocional',
    title: 'Como conduzir um grupo com segurança emocional',
    excerpt:
      'Alinhamento de expectativas, combinados claros e consentimento fazem a diferença nas jornadas coletivas.',
    category: 'Grupo',
    date: '2026-01-12',
    readTime: '7 min',
    coverLabel: 'Imagem de capa: grupo em círculo com luz suave',
    summary: [
      'Comece com acordos simples e visíveis para todos.',
      'Distribua turnos de fala e mantenha o ritmo do grupo.',
      'Priorize segurança emocional antes de aprofundar temas sensíveis.'
    ],
    content: [
      {
        heading: 'Acordos antes da primeira jogada',
        paragraphs: [
          'Em grupo, a clareza é parte da segurança. Apresente o fluxo da sala e estabeleça limites: tempo de fala, confidencialidade e pausas possíveis.',
          'O consentimento pode ser registrado no início da sala para que todos se sintam amparados.'
        ]
      },
      {
        heading: 'Turnos com respeito ao ritmo coletivo',
        paragraphs: [
          'Cada jogador rola o próprio dado na sua vez. Isso traz senso de autonomia e organiza o tabuleiro sem sobreposições.',
          'Quando alguém precisa de mais tempo, o facilitador pode sinalizar e ajustar o fluxo, mantendo o grupo informado.'
        ]
      },
      {
        heading: 'Encerramento cuidadoso',
        paragraphs: [
          'Reserve um momento final para integrar o que surgiu. Convide cada pessoa a nomear um insight e uma micro-ação.',
          'A síntese por IA pode ser usada como apoio, sem substituir a escuta humana.'
        ]
      }
    ]
  },
  {
    slug: 'registro-terapeutico-em-3-minutos-um-metodo-simples',
    title: 'Registro terapêutico em 3 minutos: um método simples',
    excerpt:
      'Um ritual curto de registro após cada rodada evita esquecimento e melhora a continuidade da jornada.',
    category: 'Terapia',
    date: '2026-01-14',
    readTime: '5 min',
    coverLabel: 'Imagem de capa: caderno com anotações minimalistas',
    summary: [
      'Use 3 campos: emoção, corpo e micro-ação.',
      'Evite textos longos; clareza é suficiente.',
      'A consistência importa mais do que a extensão.'
    ],
    content: [
      {
        heading: 'Registro rápido, impacto profundo',
        paragraphs: [
          'Depois de cada rodada, reserve três minutos para registrar o essencial. O modo terapia organiza isso em campos simples, evitando que a sessão vire um diário longo.',
          'Com o tempo, esses registros se transformam em um mapa claro para o acompanhamento.'
        ]
      },
      {
        heading: 'Três perguntas básicas',
        paragraphs: [
          '1) Qual emoção está mais viva agora? 2) O que o corpo sinaliza? 3) Qual micro-ação posso assumir?',
          'Esse trio mantém o foco no presente sem bloquear a espontaneidade.'
        ]
      },
      {
        heading: 'Fechamento com continuidade',
        paragraphs: [
          'O histórico no perfil do terapeuta permite retomar pontos-chave em minutos. Isso fortalece a consistência entre sessões.',
          'Se fizer sentido, utilize a síntese por IA para organizar o panorama geral.'
        ]
      }
    ]
  },
  {
    slug: 'deck-randomico-como-usar-sem-forcar-significado',
    title: 'Deck randômico: como usar sem “forçar significado”',
    excerpt:
      'Cartas são disparadores. O cuidado está em ouvir o que faz sentido hoje, sem conclusões rígidas.',
    category: 'Perguntas',
    date: '2026-01-16',
    readTime: '6 min',
    coverLabel: 'Imagem de capa: cartas espalhadas em mesa escura',
    summary: [
      'Use o deck como gatilho de conversa, não como resposta final.',
      'Puxe 1 a 3 cartas quando sentir que a conversa precisa de ar.',
      'Mantenha a autonomia de quem joga para escolher o que fica.'
    ],
    content: [
      {
        heading: 'Cartas como espelho, não como regra',
        paragraphs: [
          'O deck randômico serve para abrir possibilidades. Ao puxar uma carta, convide a pessoa a dizer o que ressoa e o que não ressoa.',
          'Essa liberdade evita conclusões precipitadas e mantém o foco na experiência real.'
        ]
      },
      {
        heading: 'Quando puxar cartas',
        paragraphs: [
          'Use o deck quando o tabuleiro ficar denso ou quando uma pergunta pedir mais imagens. O importante é não interromper o fluxo natural.',
          'O Maha Lilah Online permite puxar 1 a 3 cartas a qualquer momento, independente da casa.'
        ]
      },
      {
        heading: 'Registro leve e presente',
        paragraphs: [
          'Anote apenas o que ficou vivo. O registro terapêutico deve manter a linguagem da pessoa, sem interpretar demais.',
          'A síntese por IA pode agrupar temas, mas o sentido final sempre é humano.'
        ]
      }
    ]
  },
  {
    slug: 'ia-como-espelho-perguntas-que-abrem-espaco',
    title: 'IA como espelho: perguntas que abrem espaço',
    excerpt:
      'Sugestões breves podem ajudar, mas a condução segue humana. Use a IA como apoio limitado.',
    category: 'Prática',
    date: '2026-01-18',
    readTime: '6 min',
    coverLabel: 'Imagem de capa: tela com anotações e luz suave',
    summary: [
      'Use a IA para gerar perguntas abertas, não respostas fechadas.',
      'Defina limites de uso por jogador e sessão.',
      'Sempre revise e escolha o que faz sentido no contexto.'
    ],
    content: [
      {
        heading: 'Perguntas antes de conselhos',
        paragraphs: [
          'Quando a IA sugere uma pergunta, ela ajuda a abrir espaço sem direcionar demais. O foco é ampliar a escuta.',
          'No Maha Lilah Online, a IA responde com dicas limitadas por jogador e sessão.'
        ]
      },
      {
        heading: 'Limites como cuidado',
        paragraphs: [
          'Definir limites não é restrição, é parte do cuidado. Ajuda a manter a presença humana e evita dependência de respostas prontas.',
          'O botão de síntese final organiza os registros, mas não substitui a conversa.'
        ]
      },
      {
        heading: 'Revisão consciente',
        paragraphs: [
          'Antes de usar uma sugestão, pergunte: isso respeita o ritmo da pessoa? faz sentido agora? se não, descarte.',
          'A autonomia segue com quem conduz a sessão.'
        ]
      }
    ]
  },
  {
    slug: 'limites-e-consentimento-acordos-antes-da-sessao',
    title: 'Limites e consentimento: acordos antes da sessão',
    excerpt:
      'A jornada ganha profundidade quando as pessoas sabem o que esperar e se sentem seguras.',
    category: 'Segurança',
    date: '2026-01-20',
    readTime: '7 min',
    coverLabel: 'Imagem de capa: duas mãos segurando um acordo simbólico',
    summary: [
      'Defina regras simples de convívio e confidencialidade.',
      'Crie um sinal para pausas ou interrupções.',
      'Registre consentimento logo na entrada da sala.'
    ],
    content: [
      {
        heading: 'Consentimento explícito',
        paragraphs: [
          'Antes de iniciar, explique o que será registrado e como a IA pode ser usada. O consentimento precisa ser claro para todos.',
          'O Maha Lilah Online permite registrar esse momento na sala.'
        ]
      },
      {
        heading: 'Limites claros aliviam ansiedade',
        paragraphs: [
          'Saber o que não será feito é tão importante quanto saber o que será feito. Combine limites sobre temas sensíveis e sobre tempo de fala.',
          'Esses acordos reduzem ansiedade e ajudam cada pessoa a se abrir no próprio ritmo.'
        ]
      },
      {
        heading: 'Encerramento respeitoso',
        paragraphs: [
          'Finalize com uma revisão dos combinados e uma checagem de como cada pessoa sai da sessão.',
          'A síntese final por IA pode apoiar a memória, mas o cuidado principal é humano.'
        ]
      }
    ]
  }
]

export const blogCategories = ['Terapia', 'Prática', 'Perguntas', 'Grupo', 'Segurança']
