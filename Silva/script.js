// ===== script.js — Client-side logic =====
// Depends on data.js being loaded first

// ===== CART STATE =====
let cart = [];

// ===== DOM ELEMENTS =====
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartCloseBtn = document.getElementById('cartCloseBtn');
const cartItemsEl = document.getElementById('cartItems');
const cartEmpty = document.getElementById('cartEmpty');
const cartFooter = document.getElementById('cartFooter');
const cartTotal = document.getElementById('cartTotal');
const orderWhatsApp = document.getElementById('orderWhatsApp');
const clearCartBtn = document.getElementById('clearCart');
const headerEl = document.getElementById('header');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navEl = document.getElementById('nav');
const productsGrid = document.getElementById('productsGrid');
const testimonialsGrid = document.getElementById('testimonialsGrid');
const commentForm = document.getElementById('commentForm');
const commentSuccess = document.getElementById('commentSuccess');
const starRating = document.getElementById('starRating');

// ===== WHATSAPP NUMBER =====
const WHATSAPP_NUMBER = '0000000000000';

// ===== RENDER PRODUCTS =====
function renderProducts(filterCategory) {
    const products = getProducts();
    const filter = filterCategory || 'todos';
    productsGrid.innerHTML = '';

    const filtered = filter === 'todos'
        ? products
        : products.filter(p => p.category === filter);

    if (filtered.length === 0) {
        productsGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:40px;">Nenhum produto encontrado nesta categoria.</p>';
        return;
    }

    filtered.forEach((product, i) => {
        const card = document.createElement('div');
        card.className = 'product-card reveal visible';
        card.dataset.category = product.category;
        card.style.animationDelay = `${i * 0.05}s`;

        const tagHTML = product.tag
            ? `<span class="product-tag ${product.tagClass || ''}">${product.tag}</span>`
            : '';

        card.innerHTML = `
            <div class="product-image" style="background: ${product.gradient};">
                <span class="product-emoji">${product.emoji}</span>
                ${tagHTML}
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-desc">${product.desc}</p>
                <div class="product-footer">
                    <span class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')} <small>/un</small></span>
                    <button class="add-to-cart-btn" data-name="${product.name}" data-price="${product.price.toFixed(2)}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                </div>
            </div>
        `;
        productsGrid.appendChild(card);
    });

    // Re-bind add-to-cart buttons
    productsGrid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            addToCart(btn.dataset.name, btn.dataset.price);
            btn.classList.add('added');
            const orig = btn.innerHTML;
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
            setTimeout(() => {
                btn.classList.remove('added');
                btn.innerHTML = orig;
            }, 800);
        });
    });
}

// ===== RENDER TESTIMONIALS =====
function renderTestimonials() {
    const comments = getComments();
    testimonialsGrid.innerHTML = '';

    if (comments.length === 0) {
        testimonialsGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:40px;">Nenhum depoimento ainda. Seja o primeiro!</p>';
        return;
    }

    comments.forEach((comment, i) => {
        const card = document.createElement('div');
        card.className = 'testimonial-card reveal visible';
        card.style.animationDelay = `${i * 0.08}s`;

        const starsHTML = '★'.repeat(comment.stars) + '☆'.repeat(5 - comment.stars);
        const initial = comment.name.charAt(0).toUpperCase();
        const dateStr = formatDate(comment.date);

        card.innerHTML = `
            <div class="testimonial-stars">${starsHTML}</div>
            <p class="testimonial-text">"${comment.text}"</p>
            <div class="testimonial-author">
                <div class="author-avatar">${initial}</div>
                <div>
                    <strong>${comment.name}</strong>
                    <span>${dateStr}</span>
                </div>
            </div>
        `;
        testimonialsGrid.appendChild(card);
    });
}

function formatDate(dateStr) {
    try {
        const d = new Date(dateStr + 'T12:00:00');
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
        return dateStr;
    }
}

// ===== STAR RATING =====
let selectedStars = 5;

starRating.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedStars = parseInt(btn.dataset.star);
        updateStarDisplay();
    });

    btn.addEventListener('mouseenter', () => {
        const hoverVal = parseInt(btn.dataset.star);
        starRating.querySelectorAll('.star-btn').forEach(s => {
            s.classList.toggle('hover', parseInt(s.dataset.star) <= hoverVal);
        });
    });
});

starRating.addEventListener('mouseleave', () => {
    starRating.querySelectorAll('.star-btn').forEach(s => s.classList.remove('hover'));
});

function updateStarDisplay() {
    starRating.querySelectorAll('.star-btn').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.star) <= selectedStars);
    });
}

// ===== COMMENT FORM SUBMISSION =====
commentForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('commentName').value.trim();
    const text = document.getElementById('commentText').value.trim();

    if (!name || !text) return;

    addComment({ name, text, stars: selectedStars });

    // Show success message
    commentForm.style.display = 'none';
    commentSuccess.style.display = 'flex';

    // Re-render testimonials
    renderTestimonials();

    // Reset form after delay
    setTimeout(() => {
        commentForm.reset();
        selectedStars = 5;
        updateStarDisplay();
        commentForm.style.display = '';
        commentSuccess.style.display = 'none';
    }, 4000);
});

// ===== HEADER SCROLL =====
window.addEventListener('scroll', () => {
    headerEl.classList.toggle('scrolled', window.scrollY > 60);
});

// ===== MOBILE MENU =====
mobileMenuBtn.addEventListener('click', () => {
    mobileMenuBtn.classList.toggle('active');
    navEl.classList.toggle('active');
});

navEl.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenuBtn.classList.remove('active');
        navEl.classList.remove('active');
    });
});

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offset = 80;
            window.scrollTo({
                top: target.getBoundingClientRect().top + window.pageYOffset - offset,
                behavior: 'smooth'
            });
        }
    });
});

// ===== SCROLL REVEAL =====
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), index * 100);
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ===== PRODUCT FILTER =====
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProducts(btn.dataset.filter);
    });
});

// ===== CART FUNCTIONS =====
function openCart() {
    cartSidebar.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    cartCount.textContent = totalItems;
    cartCount.classList.toggle('show', totalItems > 0);
    cartTotal.textContent = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;

    if (cart.length === 0) {
        cartEmpty.style.display = 'flex';
        cartFooter.style.display = 'none';
    } else {
        cartEmpty.style.display = 'none';
        cartFooter.style.display = 'flex';
    }

    renderCartItems();
}

function renderCartItems() {
    cartItemsEl.querySelectorAll('.cart-item').forEach(el => el.remove());

    cart.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">R$ ${(item.price * item.qty).toFixed(2).replace('.', ',')}</div>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="changeQty(${index}, -1)">−</button>
                <span>${item.qty}</span>
                <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
            </div>
            <button class="cart-item-remove" onclick="removeItem(${index})" title="Remover">✕</button>
        `;
        cartItemsEl.appendChild(el);
    });
}

function addToCart(name, price) {
    const existing = cart.findIndex(item => item.name === name);
    if (existing > -1) {
        cart[existing].qty += 1;
    } else {
        cart.push({ name, price: parseFloat(price), qty: 1 });
    }
    updateCartUI();
}

function changeQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    updateCartUI();
}

function removeItem(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// Event listeners
cartBtn.addEventListener('click', openCart);
cartCloseBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });

clearCartBtn.addEventListener('click', () => {
    cart = [];
    updateCartUI();
});

// ===== WHATSAPP ORDER =====
orderWhatsApp.addEventListener('click', () => {
    if (cart.length === 0) return;

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    let msg = '🍞 *Nova Encomenda — Panificadora Silva*\n\n📋 *Itens do pedido:*\n';
    cart.forEach(item => {
        msg += `▸ ${item.name} × ${item.qty} — R$ ${(item.price * item.qty).toFixed(2).replace('.', ',')}\n`;
    });
    msg += `\n💰 *Total estimado: R$ ${total.toFixed(2).replace('.', ',')}*\n\n📝 *Observações:* `;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
});

// ===== ACTIVE NAV LINK =====
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;
    sections.forEach(section => {
        const top = section.offsetTop - 100;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        const link = document.querySelector(`.nav-link[href="#${id}"]`);
        if (link) {
            const isActive = scrollY > top && scrollY <= top + height;
            link.style.color = isActive ? 'var(--burgundy)' : '';
            link.style.fontWeight = isActive ? '600' : '';
        }
    });
});

// ===== INIT =====
renderProducts('todos');
renderTestimonials();
updateCartUI();
