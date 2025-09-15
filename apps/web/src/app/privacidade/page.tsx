export default function PrivacyPage() {
  return (
    <main className="container mx-auto px-4 py-10">
      <article className="prose prose-neutral max-w-3xl dark:prose-invert">
        <h1>Política de Privacidade</h1>
        <p>
          Esta Política descreve como a <strong>Caminhos de Hekate</strong> ("Nós") trata dados pessoais de usuários ("Você")
          em conformidade com a Lei Geral de Proteção de Dados Pessoais – LGPD (Lei nº 13.709/2018) e demais normas aplicáveis.
        </p>

        <h2>1. Controlador e Contato</h2>
        <p>
          Controlador: <strong>Caminhos de Hekate</strong> – E-mail para assuntos de privacidade (DPO):
          <a href="mailto:privacidade@caminhosdehekate.com.br"> privacidade@caminhosdehekate.com.br</a>.
        </p>

        <h2>2. Dados Tratados</h2>
        <ul>
          <li>Dados cadastrais: nome, e-mail, senha (hash), foto, preferências.</li>
          <li>Dados de uso: páginas acessadas, eventos de navegação, métricas, dispositivo, IP e logs.</li>
          <li>Transações: histórico de pedidos, pagamentos, assinaturas e notas fiscais.</li>
          <li>Comunidade/cursos: interações, progresso, certificados, mensagens e comentários.</li>
          <li>Cookies e tecnologias similares: ver <a href="/cookies">Política de Cookies</a>.</li>
        </ul>

        <h2>3. Bases Legais e Finalidades</h2>
        <ul>
          <li><strong>Execução de contrato</strong>: prestação do serviço, entrega de cursos, suporte, faturamento.</li>
          <li><strong>Obrigação legal/regulatória</strong>: guarda de registros, documentos fiscais e prevenção a fraudes.</li>
          <li><strong>Legítimo interesse</strong>: segurança, melhoria de experiência, estatísticas e prevenção de abuso, respeitados seus direitos.</li>
          <li><strong>Consentimento</strong>: comunicações de marketing e cookies não essenciais (revogável a qualquer tempo).</li>
        </ul>

        <h2>4. Compartilhamento com Terceiros</h2>
        <p>
          Compartilhamos dados com operadores essenciais (p.ex., provedores de hospedagem, e-mail transacional, processadores de pagamento,
          analytics, suporte e antifraude) estritamente para as finalidades acima. Exigimos contratos e medidas de segurança adequadas.
        </p>

        <h2>5. Transferências Internacionais</h2>
        <p>
          Poderá haver transferência internacional de dados em razão da infraestrutura de alguns fornecedores. Nesses casos, adotamos salvaguardas
          adequadas (p.ex., cláusulas contratuais ou certificações equivalentes) conforme a LGPD.
        </p>

        <h2>6. Retenção e Eliminação</h2>
        <p>
          Mantemos dados pelo tempo necessário para cumprir as finalidades, obrigações legais/contratuais e exercício regular de direitos.
          Após esse período, eliminamos ou anonimizamos os dados de forma segura.
        </p>

        <h2>7. Direitos do Titular</h2>
        <p>Nos termos da LGPD, você pode solicitar:</p>
        <ul>
          <li>Confirmação de tratamento e acesso aos dados;</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade;</li>
          <li>Portabilidade, mediante requisição expressa, observadas normas da ANPD;</li>
          <li>Informação sobre compartilhamentos e consequências da negativa;</li>
          <li>Revogação do consentimento, quando aplicável.</li>
        </ul>
        <p>
          Para exercer seus direitos, entre em contato pelo e-mail
          <a href="mailto:privacidade@caminhosdehekate.com.br"> privacidade@caminhosdehekate.com.br</a>. Podemos solicitar informações adicionais para comprovar sua identidade.
        </p>

        <h2>8. Segurança da Informação</h2>
        <p>
          Adotamos medidas técnicas e administrativas para proteger os dados contra acessos não autorizados, incidentes acidentais ou ilícitos (como perda,
          alteração, divulgação ou destruição). Apesar dos nossos esforços, nenhum serviço online é completamente imune a riscos.
        </p>

        <h2>9. Crianças e Adolescentes</h2>
        <p>
          A Plataforma é destinada a maiores de 18 anos. Quando aplicável a menores, exigiremos o consentimento específico e em destaque de pelo menos um dos pais
          ou responsável legal, nos termos do art. 14 da LGPD.
        </p>

        <h2>10. Cookies e Marketing</h2>
        <p>
          Utilizamos cookies para finalidades necessárias, analíticas e de marketing, conforme sua escolha no banner de consentimento.
          Você pode ajustar preferências a qualquer momento. Detalhes em <a href="/cookies">/cookies</a>.
        </p>

        <h2>11. Atualizações</h2>
        <p>
          Esta Política poderá ser atualizada para refletir mudanças legais, técnicas ou operacionais. A versão vigente é a publicada nesta página,
          com a data de atualização a seguir.
        </p>

        <h2>12. Contato com a ANPD</h2>
        <p>
          Caso entenda necessário, você pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD) após registrar demanda conosco.
        </p>

        <p><em>Última atualização: {new Date().toLocaleDateString('pt-BR')}</em></p>
      </article>
    </main>
  )
}
