// Navegação responsiva
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Fechar menu ao clicar em um link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Scroll suave para seções
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerHeight = document.querySelector('.header').offsetHeight;
            const targetPosition = target.offsetTop - headerHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Efeito de parallax no hero
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    const mysticalSymbol = document.querySelector('.mystical-symbol');
    
    if (hero && mysticalSymbol) {
        const rate = scrolled * -0.5;
        mysticalSymbol.style.transform = `translateY(${rate}px) rotate(${scrolled * 0.1}deg)`;
    }
});

// Animação de fade in ao scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
        }
    });
}, observerOptions);

// Observar elementos para animação
document.querySelectorAll('.petition-card, .curso-card, .produto-card, .symbol-card').forEach(el => {
    observer.observe(el);
});

// Header transparente/sólido baseado no scroll
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(20, 20, 40, 0.98)';
    } else {
        header.style.background = 'rgba(20, 20, 40, 0.95)';
    }
});

// Contador animado para preços
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = `R$ ${target}`;
            clearInterval(timer);
        } else {
            element.textContent = `R$ ${Math.floor(start)}`;
        }
    }, 16);
}

// Ativar contador quando a seção de preços for visível
const priceObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const priceElement = entry.target.querySelector('.price');
            if (priceElement && !priceElement.classList.contains('animated')) {
                priceElement.classList.add('animated');
                const priceValue = parseInt(priceElement.textContent.replace(/\D/g, ''));
                priceElement.textContent = 'R$ 0';
                animateCounter(priceElement, priceValue);
            }
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.ritual-cta').forEach(el => {
    priceObserver.observe(el);
});

// Efeito de typing para o título principal
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.textContent = '';
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Ativar efeito de typing quando a página carregar
window.addEventListener('load', () => {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        typeWriter(heroTitle, originalText, 80);
    }
});


// Efeito de hover nos cards
document.querySelectorAll('.petition-card, .curso-card, .produto-card, .symbol-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) scale(1)';
    });
});

// Botões de compra/inscrição
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (btn.textContent.includes('Comprar') || btn.textContent.includes('Inscrever') || btn.textContent.includes('Garantir') || btn.textContent.includes('Escolher')) {
            // Apenas efeito visual de clique para botões que não são links
            if (btn.tagName === 'BUTTON') {
                // Efeito visual de clique
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    btn.style.transform = '';
                }, 150);
                
                // Aqui você integraria com seu sistema de pagamento real
                // alert('Redirecionando para a página de pagamento...'); // Removido
            }
        }
    });
});

// Efeito de partículas no fundo do hero
function createParticles() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: #d4af37;
            border-radius: 50%;
            opacity: ${Math.random() * 0.5 + 0.2};
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float ${Math.random() * 3 + 2}s ease-in-out infinite;
            animation-delay: ${Math.random() * 2}s;
        `;
        hero.appendChild(particle);
    }
}

// Criar partículas quando a página carregar
window.addEventListener('load', createParticles);

// Lazy loading para imagens (se houver)
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Scroll to top button
const scrollToTopBtn = document.createElement('button');
scrollToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
scrollToTopBtn.className = 'scroll-to-top';
scrollToTopBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    background: #d4af37;
    color: #1a1a2e;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    z-index: 1000;
    font-size: 1.2rem;
`;

document.body.appendChild(scrollToTopBtn);

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollToTopBtn.style.opacity = '1';
        scrollToTopBtn.style.visibility = 'visible';
    } else {
        scrollToTopBtn.style.opacity = '0';
        scrollToTopBtn.style.visibility = 'hidden';
    }
});

scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Preloader
window.addEventListener('load', () => {
    const preloader = document.createElement('div');
    preloader.className = 'preloader';
    preloader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #1a1a2e;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        transition: opacity 0.5s ease;
    `;
    
    const loader = document.createElement('div');
    loader.innerHTML = '<i class="fas fa-moon"></i>';
    loader.style.cssText = `
        font-size: 3rem;
        color: #d4af37;
        animation: spin 2s linear infinite;
    `;
    
    preloader.appendChild(loader);
    document.body.appendChild(preloader);
    
    // Adicionar animação de spin
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    // Remover preloader após 1 segundo
    setTimeout(() => {
        preloader.style.opacity = '0';
        setTimeout(() => {
            preloader.remove();
        }, 500);
    }, 1000);
});

// Efeito de cursor personalizado
document.addEventListener('mousemove', (e) => {
    const cursor = document.querySelector('.custom-cursor');
    if (!cursor) {
        const newCursor = document.createElement('div');
        newCursor.className = 'custom-cursor';
        newCursor.style.cssText = `
            position: fixed;
            width: 20px;
            height: 20px;
            background: rgba(212, 175, 55, 0.5);
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            transition: transform 0.1s ease;
        `;
        document.body.appendChild(newCursor);
    }
    
    const customCursor = document.querySelector('.custom-cursor');
    customCursor.style.left = e.clientX - 10 + 'px';
    customCursor.style.top = e.clientY - 10 + 'px';
});

// Expandir cursor em elementos interativos
document.querySelectorAll('a, button, .btn').forEach(el => {
    el.addEventListener('mouseenter', () => {
        const cursor = document.querySelector('.custom-cursor');
        if (cursor) {
            cursor.style.transform = 'scale(2)';
            cursor.style.background = 'rgba(212, 175, 55, 0.8)';
        }
    });
    
    el.addEventListener('mouseleave', () => {
        const cursor = document.querySelector('.custom-cursor');
        if (cursor) {
            cursor.style.transform = 'scale(1)';
            cursor.style.background = 'rgba(212, 175, 55, 0.5)';
        }
    });
});

// Configuração do Mercado Pago
// SUBSTITUA pela sua chave pública de PRODUÇÃO (APP_USR-)
// O Checkout Pro NÃO aceita chaves TEST-
const mp = new MercadoPago('APP_USR-c157b8df-3ba9-43f8-afe2-1bb6b3842019', {
    locale: 'pt-BR'
});

// Função para criar pagamento dinâmico
async function criarPagamentoMP(titulo, valor, tipo = 'produto') {
    try {
        // Limpar valor (remover R$ e converter para número)
        const valorNumerico = parseFloat(valor.replace('R$', '').replace('.', '').replace(',', '.').trim());
        
        // Dados da preferência
        const preference = {
            items: [{
                title: titulo,
                unit_price: valorNumerico,
                quantity: 1,
                currency_id: 'BRL'
            }],
            back_urls: {
                success: `${window.location.origin}/sucesso`,
                failure: `${window.location.origin}/falha`,
                pending: `${window.location.origin}/pendente`
            },
            auto_return: 'approved',
            statement_descriptor: 'Caminhos de Hekate',
            external_reference: `${tipo}-${Date.now()}`,
            notification_url: `${window.location.origin}/webhooks/mercadopago`
        };

        // Enviar para seu backend criar a preferência
        console.log('🚀 Enviando para backend:', preference);
        
        const response = await fetch('/api/create-preference', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(preference)
        });

        console.log('📡 Resposta status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('📦 Dados recebidos:', data);
        
        if (data.id) {
            // Redirecionar para o checkout do Mercado Pago
            window.location.href = data.init_point;
        } else {
            throw new Error('Erro ao criar preferência - ID não encontrado');
        }
    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        alert('Erro ao processar pagamento. Tente novamente ou entre em contato.');
    }
}

// Integrar com os botões existentes
document.addEventListener('DOMContentLoaded', function() {
    // Botões de produtos individuais
    document.querySelectorAll('.checkout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const card = e.target.closest('.checkout-card');
            const titulo = card.querySelector('h3').textContent;
            const precoElement = card.querySelector('.new-price') || card.querySelector('.checkout-price');
            const preco = precoElement.textContent;
            
            criarPagamentoMP(titulo, preco, 'produto');
        });
    });

    // Botões de combos
    document.querySelectorAll('.combo-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const card = e.target.closest('.combo-card');
            const titulo = card.querySelector('h4').textContent;
            const preco = card.querySelector('.new-price').textContent;
            
            criarPagamentoMP(titulo, preco, 'combo');
        });
    });
});

console.log('🌙 Caminhos de Hekate - Site carregado com sucesso! 🌙');