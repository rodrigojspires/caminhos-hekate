export default function TermsPage() {
  return (
    <main className="container mx-auto px-4 py-10">
      <article className="prose prose-neutral max-w-3xl dark:prose-invert">
        <h1>Termos de Uso</h1>
        <p>
          Estes Termos de Uso regulam o acesso e a utilização da plataforma Caminhos de Hekate
          (&ldquo;Plataforma&rdquo;), de titularidade da <strong>Caminhos de Hekate</strong> (&ldquo;Nós&rdquo;). Ao utilizar a Plataforma,
          você (&ldquo;Usuário&rdquo;) concorda com estes Termos e com nossa <a href="/privacidade">Política de Privacidade</a>.
          Estes termos observam a legislação brasileira aplicável, incluindo o Código de Defesa do Consumidor (CDC) e a LGPD (Lei nº 13.709/2018).
        </p>

        <h2>1. Elegibilidade e Cadastro</h2>
        <p>
          Para utilizar a Plataforma, o Usuário deve ter 18 anos ou mais. Ao se cadastrar, você declara que as informações fornecidas são verdadeiras,
          completas e atualizadas, responsabilizando-se pela confidencialidade de suas credenciais.
        </p>

        <h2>2. Conta do Usuário</h2>
        <ul>
          <li>Você é responsável por todas as atividades realizadas com sua conta.</li>
          <li>Comunique-nos imediatamente sobre qualquer acesso não autorizado.</li>
          <li>Podemos suspender ou encerrar contas em caso de violação destes Termos ou de lei aplicável.</li>
        </ul>

        <h2>3. Conteúdos e Propriedade Intelectual</h2>
        <p>
          Todo o conteúdo da Plataforma (textos, vídeos, imagens, marcas, layouts e materiais dos cursos) é protegido por direitos de propriedade intelectual
          e licenciado para uso <em>estritamente pessoal e intransferível</em> do Usuário. É vedada a reprodução, distribuição, venda, cessão, disponibilização pública,
          engenharia reversa ou qualquer uso não autorizado, sob pena de medidas administrativas, civis e criminais.
        </p>

        <h2>4. Conduta do Usuário</h2>
        <ul>
          <li>É proibido publicar ou transmitir conteúdo ilegal, ofensivo, discriminatório, difamatório, ou que infrinja direitos de terceiros.</li>
          <li>É proibido tentar obter acesso indevido à Plataforma, contornar mecanismos de segurança ou compartilhar credenciais.</li>
          <li>Podemos moderar, remover conteúdo e aplicar sanções em caso de descumprimento.</li>
        </ul>

        <h2>5. Compras, Assinaturas e Cursos</h2>
        <ul>
          <li>Produtos e serviços digitais podem ser ofertados na modalidade avulsa ou por assinatura.</li>
          <li>Os preços, condições e prazos serão apresentados antes da conclusão da compra.</li>
          <li>Em assinaturas com renovação automática, você poderá cancelar a qualquer momento nas configurações da conta; o acesso permanece até o fim do ciclo vigente.</li>
        </ul>

        <h2>6. Direito de Arrependimento (CDC)</h2>
        <p>
          Em compras realizadas fora do estabelecimento comercial (internet), o consumidor pode desistir no prazo de 7 (sete) dias a contar do recebimento do produto/serviço.
          Honramos esse direito conforme o art. 49 do CDC. Para conteúdos digitais disponibilizados imediatamente, caso você já tenha acessado/consumido o conteúdo,
          poderemos solicitar confirmação expressa de ciência do início imediato da execução e, quando aplicável, realizar estorno proporcional ou integral conforme a fruição.
          Em eventos com data marcada, podem existir regras específicas de cancelamento indicadas na oferta.
        </p>

        <h2>7. Política de Reembolso</h2>
        <p>
          Reembolsos seguem a legislação vigente e as condições informadas na oferta. Em caso de falhas técnicas que impeçam o acesso ao conteúdo ou serviço contratado,
          buscaremos corrigir com prioridade; persistindo o problema, haverá reembolso proporcional/ integral conforme o caso.
        </p>

        <h2>8. Disponibilidade e Manutenção</h2>
        <p>
          Empregamos melhores esforços para manter a Plataforma disponível. Interrupções podem ocorrer por manutenção programada, atualizações, fatores externos ou de força maior.
          Não garantimos disponibilidade ininterrupta, desempenho livre de erros ou compatibilidade com todo dispositivo/software.
        </p>

        <h2>9. Limitação de Responsabilidade</h2>
        <p>
          Na extensão permitida pela lei, não nos responsabilizamos por danos indiretos, lucros cessantes, perda de dados, ou prejuízos decorrentes de mau uso da Plataforma
          pelo Usuário ou por terceiros. Nada nestes Termos exclui direitos garantidos pelo CDC.
        </p>

        <h2>10. Privacidade e Proteção de Dados (LGPD)</h2>
        <p>
          Tratamos dados pessoais conforme a LGPD e nossa <a href="/privacidade">Política de Privacidade</a>, que descreve bases legais, finalidades,
          direitos do titular, prazos de retenção e canais de contato. Para detalhes sobre cookies, consulte nossa <a href="/cookies">Política de Cookies</a>.
        </p>

        <h2>11. Alterações dos Termos</h2>
        <p>
          Podemos atualizar estes Termos a qualquer tempo. A versão vigente será sempre publicada nesta página, com a data de atualização. Mudanças relevantes poderão ser
          comunicadas por e-mail ou notificação in-app.
        </p>

        <h2>12. Lei Aplicável e Foro</h2>
        <p>
          Aplica-se a legislação brasileira. Em relações de consumo, prevalece o foro do domicílio do consumidor. Nos demais casos, e na ausência de vedação legal,
          elege-se o foro da Comarca de São Paulo/SP.
        </p>

        <h2>13. Contato</h2>
        <p>
          Dúvidas sobre estes Termos: <a href="mailto:suporte@caminhosdehekate.com.br">suporte@caminhosdehekate.com.br</a>.
        </p>

        <p><em>Última atualização: {new Date().toLocaleDateString('pt-BR')}</em></p>
      </article>
    </main>
  )
}
