# 🌙 Caminhos de Hékate

Site oficial dos Caminhos de Hékate - Portal dedicado aos ensinamentos, rituais e produtos relacionados à Deusa Hékate.

## ✨ Funcionalidades

- **Portal informativo** sobre Hékate e seus ensinamentos
- **Ritual especial** agendado para 13/08/2025 às 21h
- **Cursos online:**
  - Magia de Hékate
  - Demonologia Hekatina
- **Produtos esotéricos:**
  - Oráculo de Hékate
  - Caixa de Hékate
- **Sistema de pagamento** integrado com Mercado Pago
- **Design responsivo** e otimizado para mobile

## 🚀 Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Node.js + Express
- **Pagamentos:** Mercado Pago Checkout Pro
- **Deploy:** Vercel
- **Versionamento:** Git/GitHub

## 🔧 Como Executar Localmente

### Pré-requisitos
- Node.js 20.x
- Python 3 (para servidor HTTP)

### 1. Clone o repositório
```bash
git clone https://github.com/seunome/caminhos-hekate.git
cd caminhos-hekate
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure suas chaves do Mercado Pago
- Edite `script.js` linha 347: Substitua pela sua PUBLIC KEY
- Edite `backend-example.js` linha 12: Substitua pela sua ACCESS TOKEN

### 4. Execute o projeto

**Terminal 1 - Frontend:**
```bash
python3 -m http.server 8000
```

**Terminal 2 - Backend:**
```bash
npm start
```

### 5. Acesse a aplicação
- **Frontend:** http://localhost:8000
- **Backend:** http://localhost:3000

## 💳 Configuração do Mercado Pago

Consulte o arquivo `CONFIGURACAO-MERCADOPAGO.md` para instruções detalhadas.

## 🚀 Deploy na Vercel

```bash
npm i -g vercel
vercel
```

## 📱 Funcionalidades Implementadas

- ✅ Design responsivo com animações
- ✅ Navegação suave entre seções
- ✅ Sistema de checkout unificado
- ✅ Integração com Mercado Pago
- ✅ Múltiplos produtos e combos
- ✅ Páginas de retorno personalizadas
- ✅ Webhook para notificações

## 🔐 Segurança

- CORS configurado
- Validação de dados no backend
- Chaves de API protegidas
- HTTPS obrigatório em produção

## 📞 Contato

Para dúvidas sobre configuração ou desenvolvimento, consulte a documentação ou abra uma issue.

---

🌙 *Desenvolvido com dedicação para os Caminhos de Hékate* ✨