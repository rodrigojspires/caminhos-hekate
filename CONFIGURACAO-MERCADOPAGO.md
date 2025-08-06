# 🛒 Configuração do Mercado Pago

## 📋 O que você precisa fazer no Mercado Pago:

### 1. **Criar Conta de Desenvolvedor**
- Acesse: https://www.mercadopago.com.br/developers
- Faça login com sua conta Mercado Pago
- Vá em "Suas integrações" → "Criar aplicação"

### 2. **Obter as Chaves da API**
Após criar a aplicação, você terá:

**🔑 Chaves de PRODUÇÃO (necessárias para Checkout Pro):**
- **Public Key:** `APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Access Token:** `APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

⚠️ **IMPORTANTE:** O Checkout Pro não aceita credenciais TEST-. Você precisa usar as chaves de produção (APP_USR-) mesmo para testes.

### 3. **Configurar no seu Site**

#### No arquivo `script.js` (linha 346):
```javascript
// SUBSTITUA por sua chave pública de PRODUÇÃO
const mp = new MercadoPago('APP_USR-sua-public-key-aqui', {
    locale: 'pt-BR'
});
```

#### No seu backend (se usar o exemplo):
```javascript
// SUBSTITUA por sua access token de PRODUÇÃO
accessToken: 'APP_USR-sua-access-token-aqui'
```

### 4. **URLs de Retorno (Configurar na aplicação MP)**
- **URL de sucesso:** `https://seudominio.com/sucesso`
- **URL de falha:** `https://seudominio.com/falha` 
- **URL pendente:** `https://seudominio.com/pendente`
- **Webhook:** `https://seudominio.com/webhooks/mercadopago`

### 5. **Configurações de Pagamento**

#### No painel do MP, configure:
- ✅ **PIX** habilitado
- ✅ **Cartão de crédito** habilitado
- ✅ **Parcelamento:** até 12x (você define se com ou sem juros)
- ✅ **Boleto bancário** (opcional)

### 6. **Usuários de Teste (para testar pagamentos)**
O Mercado Pago fornece usuários de teste:

**👤 Comprador de Teste:**
- **Email:** `test_user_123456@testuser.com`
- **Senha:** `qatest123`

**👤 Vendedor de Teste:**
- **Email:** `test_user_654321@testuser.com` 
- **Senha:** `qatest123`

### 7. **Métodos de Parcelamento**
```javascript
// No backend, definir regras de parcelamento:
payment_methods: {
    installments: 12, // máximo 12x
    default_installments: 1,
    excluded_payment_types: [], // vazio = aceita tudo
}
```

### 8. **Webhooks (Notificações)**
Configure no painel MP:
- **URL:** `https://seudominio.com/webhooks/mercadopago`
- **Eventos:** Payment, Plan, Subscription

## 🚀 Como Testar:

### Com Checkout Pro:
1. Use as chaves **APP_USR-** (produção)
2. Para testar SEM gerar cobranças reais:
   - Use cartões de teste do MP:
   - **Visa:** 4013 5406 8274 6260
   - **Mastercard:** 5031 7557 3453 0604
   - **PIX:** Use qualquer CPF válido
3. **ATENÇÃO:** Mesmo sendo teste, você precisa das chaves reais

### Dados de teste para cartão:
- **CVV:** qualquer 3 dígitos
- **Vencimento:** qualquer data futura
- **Nome:** qualquer nome
- **CPF:** 11144477735

**💡 Como testar:**
1. Use suas chaves TEST- no código
2. Faça uma compra no site
3. Na tela do MP, use um dos usuários de teste acima
4. Complete o pagamento para testar o fluxo completo

## 💡 Dicas Importantes:

1. **Comece sempre com TEST** antes de ir para produção
2. **SSL obrigatório** - seu site deve ter HTTPS
3. **Webhook é essencial** para confirmar pagamentos
4. **Valide sempre** os pagamentos no seu backend
5. **Guarde o payment_id** para consultas futuras

## 📱 Funcionalidades Implementadas:

✅ **Checkout dinâmico** - valores calculados automaticamente
✅ **PIX e Cartão** - métodos principais
✅ **Parcelamento** - até 12x conforme configuração
✅ **URLs de retorno** - sucesso, falha, pendente  
✅ **Webhook** - notificações automáticas
✅ **Responsivo** - funciona em mobile

## 🔧 Próximos Passos:

1. **Obter as chaves** no painel do MP
2. **Configurar no código** (script.js)
3. **Testar** com chaves de teste
4. **Subir o backend** (pode usar Vercel, Netlify, etc.)
5. **Ativar produção** quando tudo estiver funcionando

**Precisa de ajuda com alguma parte específica?**