export type HousePolarityInfo = {
  lightKeywords: string;
  lightSummary: string;
  shadowKeywords: string;
  shadowSummary: string;
};

export const HOUSE_POLARITIES: Record<number, HousePolarityInfo> = {
  1: {
    lightKeywords: "comeco consciente; curiosidade; presenca",
    lightSummary:
      "Eu inicio com clareza e abro espaco para o novo com confianca.",
    shadowKeywords: "apego a identidade; repeticao; inercia",
    shadowSummary:
      "Eu fico preso ao eu antigo e repito ciclos por medo de mudar.",
  },
  2: {
    lightKeywords: "discernimento; lucidez; ver o jogo",
    lightSummary:
      "Eu atravesso as aparencias e reconheco o real por tras do veu.",
    shadowKeywords: "delusao; projecao; engano",
    shadowSummary:
      "Eu confundo fantasia com verdade e me perco em interpretacoes.",
  },
  3: {
    lightKeywords: "limite sagrado; protecao; coragem",
    lightSummary:
      "Eu uso o fogo interno para me proteger e agir com firmeza.",
    shadowKeywords: "explosao; destruicao; agressividade",
    shadowSummary:
      "Eu descarrego a dor em ataque e queimo pontes sem perceber.",
  },
  4: {
    lightKeywords: "prosperidade com medida; recurso; merito",
    lightSummary: "Eu recebo e construo sem perder o centro.",
    shadowKeywords: "ganancia; vazio insaciavel; acumulo",
    shadowSummary:
      "Eu tento preencher um buraco interno com coisas e controle.",
  },
  5: {
    lightKeywords: "presenca no corpo; vitalidade; enraizamento",
    lightSummary: "Eu habito meu corpo e me torno estavel e vivo.",
    shadowKeywords: "compulsao sensorial; materialismo; excessos",
    shadowSummary:
      "Eu me anestesio no prazer e me desconecto do essencial.",
  },
  6: {
    lightKeywords: "consciencia de padroes; lealdade madura; desapego",
    lightSummary:
      "Eu reconheco meus vinculos e escolho com consciencia.",
    shadowKeywords: "prisao emocional; repeticao; dependencia",
    shadowSummary:
      "Eu me agarro ao conhecido e chamo isso de amor.",
  },
  7: {
    lightKeywords: "autoestima; dignidade; brilho interno",
    lightSummary: "Eu me valorizo sem precisar provar nada.",
    shadowKeywords: "arrogancia; intoxicacao do ego; exibicionismo",
    shadowSummary:
      "Eu me inflo para esconder inseguranca e vazio.",
  },
  8: {
    lightKeywords: "sobriedade; prudencia; cuidado com recursos",
    lightSummary:
      "Eu preservo energia e escolhas com sabedoria.",
    shadowKeywords: "inveja possessiva; mesquinhez; controle",
    shadowSummary:
      "Eu travo o fluxo e comparo minha vida com a do outro.",
  },
  9: {
    lightKeywords: "magnetismo criativo; prazer consciente; eros",
    lightSummary:
      "Eu canalizo desejo como forca criadora e presenca.",
    shadowKeywords: "indulgencia; vicio; compulsao",
    shadowSummary: "Eu viro refem do desejo e perco direcao.",
  },
  10: {
    lightKeywords: "disciplina; refinamento; foco",
    lightSummary:
      "Eu me lapido com constancia e transformo impulso em poder.",
    shadowKeywords: "autoflagelo; rigidez; punicao",
    shadowSummary:
      "Eu viro duro comigo e confundo controle com evolucao.",
  },
  11: {
    lightKeywords: "leveza; alegria; respiro",
    lightSummary:
      "Eu descanso sem fugir de mim e volto mais inteiro.",
    shadowKeywords: "fuga; escapismo; distracao",
    shadowSummary:
      "Eu me ocupo para nao sentir e chamo isso de vida.",
  },
  12: {
    lightKeywords: "inspiracao; ambicao limpa; estrela-guia",
    lightSummary:
      "Eu transformo comparacao em inspiracao e direcao.",
    shadowKeywords: "comparacao venenosa; rancor; olho verde",
    shadowSummary:
      "Eu diminuo o outro para nao encarar minha falta de acao.",
  },
  13: {
    lightKeywords: "pausa fertil; silencio; contemplacao",
    lightSummary:
      "Eu aceito o vazio como incubadora do proximo passo.",
    shadowKeywords: "niilismo; desanimo; abismo",
    shadowSummary:
      "Eu caio na ideia de que nada vale e abandono o caminho.",
  },
  14: {
    lightKeywords: "sensibilidade; percepcao; aura em camadas",
    lightSummary:
      "Eu sinto com precisao e leio o invisivel sem medo.",
    shadowKeywords: "dissociacao; instabilidade; fora do corpo",
    shadowSummary:
      "Eu me desencaixo da realidade para nao sentir a dor.",
  },
  15: {
    lightKeywords: "imaginacao criativa; visao; forma viva",
    lightSummary:
      "Eu sonho com consciencia e dou forma ao possivel.",
    shadowKeywords: "ilusao viciante; fuga; serpente na mente",
    shadowSummary:
      "Eu me enrosco na fantasia e perco o chao.",
  },
  16: {
    lightKeywords: "nao saudavel; autoprotecao; clareza",
    lightSummary:
      "Eu digo nao para me preservar e manter dignidade.",
    shadowKeywords: "odio; repulsa; rejeicao",
    shadowSummary:
      "Eu ataco o que me fere em vez de cuidar da ferida.",
  },
  17: {
    lightKeywords: "ternura; amparo; maos com agua",
    lightSummary: "Eu acolho sem invadir e cuido sem me perder.",
    shadowKeywords: "salvadorismo; invasao; maos prendendo",
    shadowSummary:
      "Eu ajudo para controlar e chamo isso de amor.",
  },
  18: {
    lightKeywords: "celebracao; gratidao; sol suave",
    lightSummary: "Eu celebro com presenca e compartilho luz real.",
    shadowKeywords: "euforia vazia; superficialidade; mascara",
    shadowSummary:
      "Eu sorrio por fora e abandono meu centro por dentro.",
  },
  19: {
    lightKeywords: "responsabilidade; direcao; escolha",
    lightSummary: "Eu ajo alinhado e assumo as consequencias.",
    shadowKeywords: "reatividade; atropelo; agir compulsivo",
    shadowSummary:
      "Eu faco por impulso e depois pago com caos.",
  },
  20: {
    lightKeywords: "generosidade; fluxo; doacao",
    lightSummary: "Eu dou sem me esvaziar e deixo a vida circular.",
    shadowKeywords: "martirio; compra de amor; culpa",
    shadowSummary:
      "Eu me sacrifico para ser aceito e viro refem.",
  },
  21: {
    lightKeywords: "reparacao; humildade; ajuste",
    lightSummary: "Eu reconheco erros e retifico com maturidade.",
    shadowKeywords: "culpa; autopunicao; vergonha",
    shadowSummary: "Eu me castigo e fico preso ao passado.",
  },
  22: {
    lightKeywords: "etica; alinhamento; verdade",
    lightSummary: "Eu escolho o certo mesmo quando ninguem ve.",
    shadowKeywords: "moralismo; rigidez; julgamento",
    shadowSummary:
      "Eu uso virtude para controlar e condenar.",
  },
  23: {
    lightKeywords: "colheita; prazer consciente; abundancia",
    lightSummary:
      "Eu desfruto do que construi sem perder consciencia.",
    shadowKeywords: "acomodacao; estagnacao; ilusao de premio",
    shadowSummary:
      "Eu paro de crescer porque confundo conforto com destino.",
  },
  24: {
    lightKeywords: "discernir influencias; corte lucido; protecao",
    lightSummary:
      "Eu escolho melhor meus circulos e me preservo.",
    shadowKeywords: "seducao; queda; contagio",
    shadowSummary:
      "Eu absorvo o pior do ambiente e me justifico.",
  },
  25: {
    lightKeywords: "mentoria; suporte; tribo",
    lightSummary: "Eu me fortaleco com vinculos que elevam.",
    shadowKeywords: "dependencia do grupo; conformismo; fusao",
    shadowSummary:
      "Eu terceirizo minha verdade para pertencer.",
  },
  26: {
    lightKeywords: "profundidade; compaixao; maturidade",
    lightSummary:
      "Eu atravesso a dor e ganho alma e verdade.",
    shadowKeywords: "vitimismo; afundar; desalento",
    shadowSummary:
      "Eu me identifico com a dor e perco potencia.",
  },
  27: {
    lightKeywords: "proposito; utilidade; seva",
    lightSummary: "Eu sirvo com sentido e isso me expande.",
    shadowKeywords: "autoapagamento; exaustao; anulacao",
    shadowSummary:
      "Eu me abandono para ser necessario.",
  },
  28: {
    lightKeywords: "fe madura; entrega; estabilidade",
    lightSummary: "Eu confio no processo sem perder discernimento.",
    shadowKeywords: "ingenuidade; promessa vazia; risco",
    shadowSummary:
      "Eu acredito sem ver e caio em armadilhas.",
  },
  29: {
    lightKeywords: "autonomia; critica lucida; questionar dogmas",
    lightSummary: "Eu penso por mim e volto ao que e real.",
    shadowKeywords: "fanatismo; cegueira; intolerancia",
    shadowSummary:
      "Eu escolho crenca acima da vida e endureco.",
  },
  30: {
    lightKeywords: "progresso; elevacao; impulso virtuoso",
    lightSummary:
      "Eu sigo um movimento interno que melhora minha vida.",
    shadowKeywords: "perfeccionismo; cobranca; rigidez",
    shadowSummary:
      "Eu me exijo tanto que paro de avancar.",
  },
  31: {
    lightKeywords: "refugio; protecao; recolhimento",
    lightSummary:
      "Eu me recolho para me reconstruir e retornar mais forte.",
    shadowKeywords: "esconderijo; evasao; medo",
    shadowSummary:
      "Eu me escondo do mundo para nao encarar escolhas.",
  },
  32: {
    lightKeywords: "centro; harmonia; presenca",
    lightSummary: "Eu permaneco no eixo mesmo quando tudo balanca.",
    shadowKeywords: "oscilacao; indecisao; paralisia",
    shadowSummary:
      "Eu fico no meio de tudo e nao escolho nada.",
  },
  33: {
    lightKeywords: "refinamento; sutileza; charme verdadeiro",
    lightSummary: "Eu atraio pelo ser, nao pela mascara.",
    shadowKeywords: "seducao; fumaca; superficialidade",
    shadowSummary:
      "Eu uso encanto para manipular e me desconecto.",
  },
  34: {
    lightKeywords: "autenticidade; nucleo; verdade sentida",
    lightSummary:
      "Eu volto ao que e essencial e simples dentro de mim.",
    shadowKeywords: "drama; craving; vicio emocional",
    shadowSummary:
      "Eu preciso de intensidade para sentir que existo.",
  },
  35: {
    lightKeywords: "purga; renascimento; coragem",
    lightSummary: "Eu limpo o que apodrece e renasco mais inteiro.",
    shadowKeywords: "tormento mental; culpa; loop",
    shadowSummary:
      "Eu giro em punicao interna e nao atravesso.",
  },
  36: {
    lightKeywords: "limpeza; transparencia; mente limpida",
    lightSummary: "Eu vejo com nitidez e ajo com simplicidade.",
    shadowKeywords: "obsessao por pureza; controle; esterilidade",
    shadowSummary:
      "Eu mato a vida tentando purificar tudo.",
  },
  37: {
    lightKeywords: "sabedoria viva; insight; compreensao",
    lightSummary:
      "Eu entendo de verdade e aplico com humildade.",
    shadowKeywords: "orgulho intelectual; pedantismo; distancia",
    shadowSummary:
      "Eu uso conhecimento para me separar do sentir.",
  },
  38: {
    lightKeywords: "vigor; energia; respiracao",
    lightSummary:
      "Eu recupero potencia e sinto a vida circular em mim.",
    shadowKeywords: "burnout; drenagem; excesso",
    shadowSummary:
      "Eu gasto alem do limite e viro sombra de mim mesmo.",
  },
  39: {
    lightKeywords: "soltar; limpar; liberar",
    lightSummary:
      "Eu deixo ir o que pesa e abro espaco para o novo.",
    shadowKeywords: "rejeicao; vergonha; repulsa",
    shadowSummary:
      "Eu expulso partes minhas e crio guerra interna.",
  },
  40: {
    lightKeywords: "integrar; distribuir; fluxo",
    lightSummary: "Eu conecto partes e volto ao todo.",
    shadowKeywords: "dispersao; perda; fragmento",
    shadowSummary:
      "Eu me espalho e perco presenca e consistencia.",
  },
  41: {
    lightKeywords: "humanidade; simplicidade; presenca",
    lightSummary: "Eu vivo o comum com alma e verdade.",
    shadowKeywords: "rotina cega; mecanicidade; trivialidade",
    shadowSummary:
      "Eu viro automatico e esqueco por que existo.",
  },
  42: {
    lightKeywords: "transmutacao; alquimia; coragem",
    lightSummary: "Eu transformo dor em forca e avanco.",
    shadowKeywords: "impaciencia; destruir; queimar tudo",
    shadowSummary:
      "Eu incendeio por dentro e por fora sem consciencia.",
  },
  43: {
    lightKeywords: "oportunidade rara; caminho; responsabilidade",
    lightSummary:
      "Eu honro a chance de estar aqui e caminho com intencao.",
    shadowKeywords: "apatia; desvio; desperdicio do dom",
    shadowSummary:
      "Eu deixo a vida passar e depois culpo o destino.",
  },
  44: {
    lightKeywords: "humildade; abertura; mente de aprendiz",
    lightSummary:
      "Eu aprendo com o real e solto certezas antigas.",
    shadowKeywords: "negacao; cegueira; teimosia",
    shadowSummary:
      "Eu fecho os olhos para o que nao quero ver.",
  },
  45: {
    lightKeywords: "orientacao; mapa verdadeiro; lucidez",
    lightSummary: "Eu encontro direcao e caminho com clareza.",
    shadowKeywords: "dogma; engessamento; certeza rigida",
    shadowSummary:
      "Eu transformo verdade em prisao.",
  },
  46: {
    lightKeywords: "precisao; escolha; separar real do ruido",
    lightSummary: "Eu decido com clareza e corto o excesso.",
    shadowKeywords: "sarcasmo; corte frio; critica corrosiva",
    shadowSummary:
      "Eu uso discernimento para ferir e me isolar.",
  },
  47: {
    lightKeywords: "serenidade; eixo interno; estabilidade",
    lightSummary:
      "Eu permaneco calmo e lucido no meio da tempestade.",
    shadowKeywords: "frieza; indiferenca; anestesia",
    shadowSummary:
      "Eu desligo o sentir e chamo isso de paz.",
  },
  48: {
    lightKeywords: "afirmacao; coragem; acao",
    lightSummary: "Eu me posiciono e avanco com firmeza.",
    shadowKeywords: "ataque; agressividade; pressa",
    shadowSummary:
      "Eu viro impulso e passo por cima.",
  },
  49: {
    lightKeywords: "acolhimento; intuicao; receptividade",
    lightSummary:
      "Eu recebo, sinto e confio no meu ritmo interno.",
    shadowKeywords: "passividade; dependencia; retracao",
    shadowSummary:
      "Eu espero que o outro decida por mim.",
  },
  50: {
    lightKeywords: "simplicidade; autodomino; maturidade",
    lightSummary:
      "Eu me fortaleco com sobriedade e constancia.",
    shadowKeywords: "superioridade; dureza; orgulho ascetico",
    shadowSummary:
      "Eu viro pedra e chamo isso de espiritualidade.",
  },
  51: {
    lightKeywords: "sustentar; construir; enraizar",
    lightSummary: "Eu crio base, estrutura e continuidade.",
    shadowKeywords: "apego; estagnacao; medo de mudar",
    shadowSummary:
      "Eu me agarro a seguranca e empaco.",
  },
  52: {
    lightKeywords: "firmeza protetora; corte do mal; ferocidade sagrada",
    lightSummary:
      "Eu protejo o que e vivo e coloco limites definitivos.",
    shadowKeywords: "abuso; crueldade; destruicao",
    shadowSummary:
      "Eu machuco para me sentir forte.",
  },
  53: {
    lightKeywords: "cura; receptividade; fluxo emocional",
    lightSummary:
      "Eu deixo o sentir fluir e me limpo por dentro.",
    shadowKeywords: "inundacao; melodrama; afogar",
    shadowSummary:
      "Eu me perco no emocional e viro tempestade.",
  },
  54: {
    lightKeywords: "constancia; devocao; caminho",
    lightSummary:
      "Eu pratico e me torno alguem novo, dia apos dia.",
    shadowKeywords: "vazio; obrigacao; ritual mecanico",
    shadowSummary:
      "Eu faco por habito e perco o espirito.",
  },
  55: {
    lightKeywords: "limites; presenca; identidade solida",
    lightSummary:
      "Eu sei quem sou sem precisar dominar ninguem.",
    shadowKeywords: "narcisismo; inflacao; espelho",
    shadowSummary:
      "Eu me torno centro do mundo para nao sentir medo.",
  },
  56: {
    lightKeywords: "alinhamento; vibracao sagrada; verdade",
    lightSummary:
      "Eu entro em sintonia e tudo se organiza dentro de mim.",
    shadowKeywords: "ruido; repeticao vazia; sem presenca",
    shadowSummary:
      "Eu repito forma sem essencia e me desconecto.",
  },
  57: {
    lightKeywords: "liberdade; leveza; movimento",
    lightSummary:
      "Eu me torno flexivel e sigo sem perder o eixo.",
    shadowKeywords: "volatilidade; instabilidade; fuga",
    shadowSummary:
      "Eu nao sustento nada e chamo isso de liberdade.",
  },
  58: {
    lightKeywords: "radiancia; vitalidade; carisma",
    lightSummary: "Eu brilho por ser quem sou, com naturalidade.",
    shadowKeywords: "vaidade; queimar-se; overexposure",
    shadowSummary:
      "Eu me exibo ate perder energia e verdade.",
  },
  59: {
    lightKeywords: "integridade; clareza; verdade compassiva",
    lightSummary: "Eu digo a verdade que cura e liberta.",
    shadowKeywords: "cinismo; dureza; verdade como arma",
    shadowSummary:
      "Eu firo com verdade para nao sentir.",
  },
  60: {
    lightKeywords: "esperanca pratica; confianca; forca interna",
    lightSummary:
      "Eu sustento luz real mesmo em tempos dificeis.",
    shadowKeywords: "mascara; negacao; positividade toxica",
    shadowSummary:
      "Eu ignoro a dor e crio mentira emocional.",
  },
  61: {
    lightKeywords: "prudencia; realismo; alerta lucido",
    lightSummary:
      "Eu enxergo riscos com maturidade e me protejo.",
    shadowKeywords: "rancor; cinismo; desalento",
    shadowSummary:
      "Eu me alimento do pior e apago a esperanca.",
  },
  62: {
    lightKeywords: "paz; suficiencia; contentamento",
    lightSummary: "Eu estou bem no simples e isso me fortalece.",
    shadowKeywords: "dependencia; fuga; apego ao prazer",
    shadowSummary:
      "Eu preciso de estimulo para nao encarar o vazio.",
  },
  63: {
    lightKeywords: "incubacao; recolhimento; repouso",
    lightSummary:
      "Eu descanso para renascer e reorganizar forcas.",
    shadowKeywords: "apagamento; torpor; depressao",
    shadowSummary:
      "Eu afundo e perco a ligacao com a vida.",
  },
  64: {
    lightKeywords: "instinto sabio; harmonia; cura",
    lightSummary:
      "Eu volto a natureza e reencontro meu ritmo.",
    shadowKeywords: "brutalidade; fome; instinto cego",
    shadowSummary:
      "Eu viro impulso sem consciencia e machuco.",
  },
  65: {
    lightKeywords: "contemplacao; silencio interno; profundidade",
    lightSummary: "Eu mergulho em mim e encontro verdade.",
    shadowKeywords: "exilio; fechamento; isolamento",
    shadowSummary:
      "Eu me retiro por medo e viro parede.",
  },
  66: {
    lightKeywords: "plenitude; uniao; extase sereno",
    lightSummary: "Eu toco o sagrado com paz e presenca.",
    shadowKeywords: "anestesia; fuga; vicio espiritual",
    shadowSummary:
      "Eu uso espiritualidade para nao viver o humano.",
  },
  67: {
    lightKeywords: "graca feroz; dissolucao; libertacao",
    lightSummary:
      "Eu aceito a limpeza profunda que quebra o que e falso.",
    shadowKeywords: "panico; resistencia; medo do caos",
    shadowSummary:
      "Eu luto contra a mudanca e sofro mais.",
  },
  68: {
    lightKeywords: "libertacao; expansao; unidade",
    lightSummary: "Eu me lembro do todo e respiro alem do eu.",
    shadowKeywords: "bypass espiritual; fuga do humano; vazio",
    shadowSummary:
      "Eu subo para nao encarar a vida real.",
  },
  69: {
    lightKeywords: "inteligencia criadora; visao; arquitetura do ser",
    lightSummary:
      "Eu crio com sabedoria e responsabilidade.",
    shadowKeywords: "complexo de deus; controle absoluto; hybris",
    shadowSummary:
      "Eu tento controlar tudo e perco humildade.",
  },
  70: {
    lightKeywords: "pureza equilibrada; serenidade; lucidez",
    lightSummary:
      "Eu escolho o que eleva sem negar a vida.",
    shadowKeywords: "apego a pureza; moralismo; esterilidade",
    shadowSummary:
      "Eu viro rigido e transformo pureza em prisao.",
  },
  71: {
    lightKeywords: "movimento com proposito; coragem; acao",
    lightSummary: "Eu ajo com direcao e faco acontecer.",
    shadowKeywords: "inquietacao; pressa; ansiedade",
    shadowSummary:
      "Eu corro sem rumo e me desgasto.",
  },
  72: {
    lightKeywords: "reset; rendicao ao ciclo; retorno",
    lightSummary:
      "Eu aceito o fim de um ciclo e recomeco limpo.",
    shadowKeywords: "esquecimento; apagao; abismo",
    shadowSummary:
      "Eu adormeco por dentro e deixo a vida me levar.",
  },
};
