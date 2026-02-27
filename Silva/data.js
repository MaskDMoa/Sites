// ===== data.js — Shared Data Layer (localStorage) =====
// This file manages products and comments data using localStorage.
// Used by both index.html (client) and admin.html (admin panel).

const STORAGE_KEYS = {
    PRODUCTS: 'silva_products',
    COMMENTS: 'silva_comments'
};

// ===== DEFAULT DATA =====
const DEFAULT_PRODUCTS = [
    { id: 1, name: 'Pão Francês', price: 0.00, desc: 'Crocante por fora, macio por dentro. O clássico de todo dia.', category: 'paes', emoji: '🥖', gradient: 'linear-gradient(135deg, #f5e6c8 0%, #dcc7a0 100%)', tag: 'Mais Vendido', tagClass: 'tag-popular' },
    { id: 2, name: 'Pão de Forma', price: 0.00, desc: 'Macio e fresquinho, perfeito para sanduíches.', category: 'paes', emoji: '🍞', gradient: 'linear-gradient(135deg, #e8d5b7 0%, #c4a87a 100%)', tag: '', tagClass: '' },
    { id: 3, name: 'Pão Integral', price: 0.00, desc: 'Saudável e saboroso, rico em fibras naturais.', category: 'paes', emoji: '🌾', gradient: 'linear-gradient(135deg, #c5a882 0%, #9b7d55 100%)', tag: '', tagClass: '' },
    { id: 4, name: 'Rosca Doce', price: 0.00, desc: 'A famosa rosca da Silva, macia e coberta de açúcar.', category: 'doces', emoji: '🍩', gradient: 'linear-gradient(135deg, #f0c6d4 0%, #d4929e 100%)', tag: 'Favorito', tagClass: 'tag-fav' },
    { id: 5, name: 'Pão de Queijo', price: 0.00, desc: 'Receita mineira, crocante por fora e elástico por dentro.', category: 'salgados', emoji: '🧀', gradient: 'linear-gradient(135deg, #fce5a8 0%, #e0c47a 100%)', tag: 'Quentinho', tagClass: 'tag-hot' },
    { id: 6, name: 'Bolo Caseiro', price: 0.00, desc: 'Fofinho e molhado, com cobertura de chocolate belga.', category: 'doces', emoji: '🎂', gradient: 'linear-gradient(135deg, #8b5e3c 0%, #5c3a24 100%)', tag: '', tagClass: '' },
    { id: 7, name: 'Sonho de Creme', price: 0.00, desc: 'Recheado com creme de baunilha e coberto de açúcar.', category: 'doces', emoji: '🧁', gradient: 'linear-gradient(135deg, #ffecd2 0%, #e6a87d 100%)', tag: '', tagClass: '' },
    { id: 8, name: 'Coxinha', price: 0.00, desc: 'Crocante, recheada com frango desfiado cremoso.', category: 'salgados', emoji: '🍗', gradient: 'linear-gradient(135deg, #f5d89a 0%, #d4a24e 100%)', tag: '', tagClass: '' },
    { id: 9, name: 'Empada', price: 0.00, desc: 'Massa crocante com recheio generoso de frango ou palmito.', category: 'salgados', emoji: '🥧', gradient: 'linear-gradient(135deg, #c9a857 0%, #997832 100%)', tag: '', tagClass: '' },
    { id: 10, name: 'Pão Doce', price: 0.00, desc: 'Massinha macia e levemente adocicada, irresistível.', category: 'doces', emoji: '🥐', gradient: 'linear-gradient(135deg, #f7c59f 0%, #d4956b 100%)', tag: '', tagClass: '' }
];

const DEFAULT_COMMENTS = [
    { id: 1, name: 'Maria Souza', text: 'O pão francês da Silva é simplesmente o melhor da cidade. Crocante por fora e macio por dentro, como deve ser!', stars: 5, date: '2025-12-15' },
    { id: 2, name: 'João Pereira', text: 'A rosca doce é uma perdição! Encomendo toda semana para o café da família. Qualidade sempre impecável.', stars: 5, date: '2025-11-20' },
    { id: 3, name: 'Ana Costa', text: 'Desde que descobri a Panificadora Silva, não compro pão em outro lugar. Atendimento nota 10!', stars: 5, date: '2025-10-08' }
];

// ===== DATA ACCESS FUNCTIONS =====

function getProducts() {
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!stored) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
        return [...DEFAULT_PRODUCTS];
    }
    return JSON.parse(stored);
}

function saveProducts(products) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

function getComments() {
    const stored = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    if (!stored) {
        localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(DEFAULT_COMMENTS));
        return [...DEFAULT_COMMENTS];
    }
    return JSON.parse(stored);
}

function saveComments(comments) {
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments));
}

// ===== PRODUCT CRUD =====

function addProduct(product) {
    const products = getProducts();
    product.id = Date.now();
    products.push(product);
    saveProducts(products);
    return product;
}

function updateProduct(id, updatedData) {
    const products = getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index > -1) {
        products[index] = { ...products[index], ...updatedData };
        saveProducts(products);
        return products[index];
    }
    return null;
}

function deleteProduct(id) {
    const products = getProducts().filter(p => p.id !== id);
    saveProducts(products);
}

// ===== COMMENTS CRUD =====

function addComment(comment) {
    const comments = getComments();
    comment.id = Date.now();
    comment.date = new Date().toISOString().split('T')[0];
    comments.unshift(comment); // Add to beginning (newest first)
    saveComments(comments);
    return comment;
}

function deleteComment(id) {
    const comments = getComments().filter(c => c.id !== id);
    saveComments(comments);
}

// ===== UTILITY =====

function getNextProductId() {
    const products = getProducts();
    return products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
}

function resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(DEFAULT_COMMENTS));
}
