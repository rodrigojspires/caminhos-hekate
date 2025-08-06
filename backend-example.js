// EXEMPLO DE BACKEND (Node.js + Express)
// Arquivo: backend-example.js

const express = require('express');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
app.use(express.json());

// Adicionar CORS para permitir comunicação com o frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Configure o Mercado Pago com sua ACCESS_TOKEN
const client = new MercadoPagoConfig({ 
    accessToken: 'APP_USR-2159140936318508-080522-57bda03ae0068d5502360bf76050c613-77986081', // SUBSTITUA pela sua access token
    options: { timeout: 5000 }
});

// Endpoint para criar preferência
app.post('/api/create-preference', async (req, res) => {
    console.log('📦 Recebido:', req.body);
    try {
        const preference = new Preference(client);
        
        const result = await preference.create({
            body: {
                items: req.body.items,
                back_urls: req.body.back_urls,
                auto_return: req.body.auto_return,
                statement_descriptor: req.body.statement_descriptor,
                external_reference: req.body.external_reference,
                notification_url: req.body.notification_url,
                payment_methods: {
                    excluded_payment_types: [],
                    installments: 12, // Máximo 12x
                },
                shipments: {
                    mode: "not_specified"
                }
            }
        });

        res.json({
            id: result.id,
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point
        });
    } catch (error) {
        console.error('Erro ao criar preferência:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Webhook para receber notificações do Mercado Pago
app.post('/webhooks/mercadopago', (req, res) => {
    const { type, data } = req.body;
    
    if (type === 'payment') {
        console.log('Payment ID:', data.id);
        // Aqui você pode verificar o status do pagamento
        // e atualizar seu banco de dados
    }
    
    res.status(200).send('OK');
});

// Páginas de retorno
app.get('/sucesso', (req, res) => {
    res.send(`
        <h1>Pagamento Realizado com Sucesso!</h1>
        <p>Obrigado pela sua compra. Você receberá um e-mail de confirmação em breve.</p>
        <a href="/">Voltar ao site</a>
    `);
});

app.get('/falha', (req, res) => {
    res.send(`
        <h1>Falha no Pagamento</h1>
        <p>Houve um problema com seu pagamento. Tente novamente.</p>
        <a href="/">Voltar ao site</a>
    `);
});

app.get('/pendente', (req, res) => {
    res.send(`
        <h1>Pagamento Pendente</h1>
        <p>Seu pagamento está sendo processado. Aguarde a confirmação.</p>
        <a href="/">Voltar ao site</a>
    `);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});