export default function CookiesPage() {
  return (
    <main className="container mx-auto px-4 py-10">
      <article className="prose prose-neutral max-w-3xl dark:prose-invert">
        <h1>Política de Cookies</h1>
        <p>
          Esta Política de Cookies explica o que são cookies, como os utilizamos no site Caminhos de Hekate e como você
          pode gerenciar suas preferências. Ao continuar navegando, você concorda com o uso de cookies conforme descrito
          abaixo.
        </p>

        <h2>O que são Cookies?</h2>
        <p>
          Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você visita um site. Eles são amplamente
          utilizados para fazer o site funcionar corretamente, lembrar suas preferências e fornecer informações para melhorar a
          experiência do usuário e a performance do serviço.
        </p>

        <h2>Como usamos Cookies</h2>
        <p>Utilizamos cookies para as seguintes finalidades:</p>
        <ul>
          <li>
            <strong>Necessários:</strong> essenciais para o funcionamento do site (por exemplo, autenticação, segurança, manutenção de sessão e carrinho de compras).
          </li>
          <li>
            <strong>Analytics:</strong> ajudam a entender o uso do site (páginas visitadas, tempo de permanência, origem do tráfego) para melhorar conteúdo e navegação.
          </li>
          <li>
            <strong>Marketing:</strong> utilizados para personalização de conteúdo, recomendações e campanhas, inclusive medição de conversão.
          </li>
        </ul>

        <h2>Cookies de Terceiros</h2>
        <p>
          Alguns cookies podem ser definidos por terceiros (por exemplo, provedores de analytics, gateways de pagamento ou ferramentas
          de marketing). Não controlamos esses cookies diretamente; recomendamos consultar as políticas de privacidade dos respectivos
          fornecedores para mais detalhes.
        </p>

        <h2>Tempo de Retenção</h2>
        <p>
          A duração de armazenamento varia conforme o tipo de cookie. Alguns expiram ao encerrar a sessão do navegador, enquanto
          outros podem permanecer por um período maior para lembrar suas preferências em futuras visitas.
        </p>

        <h2>Gerenciamento de Preferências</h2>
        <p>
          Você pode gerenciar suas preferências pelo banner de consentimento exibido no rodapé do site. Também é possível ajustar as
          configurações do navegador para bloquear ou excluir cookies. Observe que desativar cookies necessários pode afetar o
          funcionamento do site.
        </p>

        <h2>Cookies que Podemos Utilizar</h2>
        <ul>
          <li><strong>cookie_consent</strong>: guarda suas preferências de consentimento.</li>
          <li><strong>session</strong> ou <strong>next-auth.session-token</strong>: identifica sua sessão autenticada.</li>
          <li><strong>analytics_*</strong>: métricas de uso e performance.</li>
        </ul>

        <h2>Atualizações desta Política</h2>
        <p>
          Podemos atualizar esta Política para refletir mudanças legais ou operacionais. A data da última atualização será
          ajustada abaixo.
        </p>

        <h2>Contato</h2>
        <p>
          Em caso de dúvidas sobre esta Política de Cookies, entre em contato pelo email de suporte informado em nossa página de contato.
        </p>

        <p><em>Última atualização: {new Date().toLocaleDateString('pt-BR')}</em></p>
      </article>
    </main>
  )
}
