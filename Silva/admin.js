// ===== admin.js — Admin Panel Logic =====

// ===== ADMIN PASSWORD (change this!) =====
const ADMIN_PASSWORD = 'silva2026';

// ===== DOM ELEMENTS =====
const loginScreen = document.getElementById('loginScreen');
const loginForm = document.getElementById('loginForm');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const togglePassword = document.getElementById('togglePassword');
const adminDashboard = document.getElementById('adminDashboard');
const logoutBtn = document.getElementById('logoutBtn');

// Tabs
const adminTabs = document.querySelectorAll('.admin-tab');
const tabProducts = document.getElementById('tabProducts');
const tabComments = document.getElementById('tabComments');

// Products
const btnAddProduct = document.getElementById('btnAddProduct');
const productModal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
const productModalTitle = document.getElementById('productModalTitle');
const productModalClose = document.getElementById('productModalClose');
const productModalCancel = document.getElementById('productModalCancel');
const productEditId = document.getElementById('productEditId');
const productsTableBody = document.getElementById('productsTableBody');

// Stats
const statProducts = document.getElementById('statProducts');
const statComments = document.getElementById('statComments');
const statAvgRating = document.getElementById('statAvgRating');
const commentsCountEl = document.getElementById('commentsCount');

// Comments
const adminCommentsList = document.getElementById('adminCommentsList');

// Reset
const btnResetData = document.getElementById('btnResetData');

// ===== AUTH =====
const LOGGED_IN_KEY = 'silva_admin_logged';

function checkAuth() {
    if (sessionStorage.getItem(LOGGED_IN_KEY) === 'true') {
        showDashboard();
    }
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (loginPassword.value === ADMIN_PASSWORD) {
        sessionStorage.setItem(LOGGED_IN_KEY, 'true');
        loginError.style.display = 'none';
        showDashboard();
    } else {
        loginError.style.display = 'flex';
        loginPassword.value = '';
        loginPassword.focus();
    }
});

togglePassword.addEventListener('click', () => {
    const type = loginPassword.type === 'password' ? 'text' : 'password';
    loginPassword.type = type;
});

logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem(LOGGED_IN_KEY);
    loginScreen.style.display = '';
    adminDashboard.style.display = 'none';
    loginPassword.value = '';
});

function showDashboard() {
    loginScreen.style.display = 'none';
    adminDashboard.style.display = '';
    refreshAll();
}

// ===== TABS =====
adminTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        adminTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.dataset.tab;
        tabProducts.classList.toggle('active', target === 'products');
        tabComments.classList.toggle('active', target === 'comments');
    });
});

// ===== STATS =====
function updateStats() {
    const products = getProducts();
    const comments = getComments();

    statProducts.textContent = products.length;
    statComments.textContent = comments.length;
    commentsCountEl.textContent = `${comments.length} depoimento${comments.length !== 1 ? 's' : ''}`;

    if (comments.length > 0) {
        const avg = (comments.reduce((s, c) => s + c.stars, 0) / comments.length).toFixed(1);
        statAvgRating.textContent = avg + '★';
    } else {
        statAvgRating.textContent = '—';
    }
}

// ===== PRODUCTS TABLE =====
function renderProductsTable() {
    const products = getProducts();
    productsTableBody.innerHTML = '';

    if (products.length === 0) {
        productsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px;">Nenhum produto cadastrado.</td></tr>';
        return;
    }

    const categoryLabels = { paes: 'Pães', doces: 'Doces', salgados: 'Salgados' };

    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="table-product">
                    <span class="table-product-emoji">${product.emoji}</span>
                    <div>
                        <strong>${product.name}</strong>
                        <small>${product.desc}</small>
                    </div>
                </div>
            </td>
            <td><span class="badge badge-category">${categoryLabels[product.category] || product.category}</span></td>
            <td><strong>R$ ${product.price.toFixed(2).replace('.', ',')}</strong></td>
            <td>${product.tag ? `<span class="badge ${product.tagClass}">${product.tag}</span>` : '—'}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn action-edit" title="Editar" onclick="editProduct(${product.id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="action-btn action-delete" title="Excluir" onclick="confirmDeleteProduct(${product.id}, '${product.name.replace(/'/g, "\\'")}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </td>
        `;
        productsTableBody.appendChild(tr);
    });
}

// ===== PRODUCT MODAL =====
function openProductModal(editId) {
    productModal.style.display = 'flex';
    if (editId) {
        productModalTitle.textContent = 'Editar Produto';
        const product = getProducts().find(p => p.id === editId);
        if (product) {
            productEditId.value = product.id;
            document.getElementById('prodName').value = product.name;
            document.getElementById('prodPrice').value = product.price;
            document.getElementById('prodDesc').value = product.desc;
            document.getElementById('prodCategory').value = product.category;
            document.getElementById('prodEmoji').value = product.emoji;
            document.getElementById('prodTag').value = product.tag || '';
            document.getElementById('prodTagClass').value = product.tagClass || '';
            document.getElementById('prodGradient').value = product.gradient || '';
        }
    } else {
        productModalTitle.textContent = 'Adicionar Produto';
        productEditId.value = '';
        productForm.reset();
        document.getElementById('prodGradient').value = 'linear-gradient(135deg, #f5e6c8 0%, #dcc7a0 100%)';
    }
}

function closeProductModal() {
    productModal.style.display = 'none';
    productForm.reset();
    productEditId.value = '';
}

btnAddProduct.addEventListener('click', () => openProductModal());
productModalClose.addEventListener('click', closeProductModal);
productModalCancel.addEventListener('click', closeProductModal);

productModal.addEventListener('click', (e) => {
    if (e.target === productModal) closeProductModal();
});

productForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = {
        name: document.getElementById('prodName').value.trim(),
        price: parseFloat(document.getElementById('prodPrice').value),
        desc: document.getElementById('prodDesc').value.trim(),
        category: document.getElementById('prodCategory').value,
        emoji: document.getElementById('prodEmoji').value.trim(),
        tag: document.getElementById('prodTag').value.trim(),
        tagClass: document.getElementById('prodTagClass').value,
        gradient: document.getElementById('prodGradient').value.trim() || 'linear-gradient(135deg, #f5e6c8 0%, #dcc7a0 100%)'
    };

    const editId = productEditId.value;
    if (editId) {
        updateProduct(parseInt(editId), data);
        showToast('Produto atualizado com sucesso!');
    } else {
        addProduct(data);
        showToast('Produto adicionado com sucesso!');
    }

    closeProductModal();
    refreshAll();
});

function editProduct(id) {
    openProductModal(id);
}

function confirmDeleteProduct(id, name) {
    if (confirm(`Tem certeza que deseja excluir "${name}"?`)) {
        deleteProduct(id);
        showToast('Produto excluído.');
        refreshAll();
    }
}

// ===== COMMENTS LIST =====
function renderCommentsList() {
    const comments = getComments();
    adminCommentsList.innerHTML = '';

    if (comments.length === 0) {
        adminCommentsList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">Nenhum depoimento ainda.</p>';
        return;
    }

    comments.forEach(comment => {
        const stars = '★'.repeat(comment.stars) + '☆'.repeat(5 - comment.stars);
        const card = document.createElement('div');
        card.className = 'admin-comment-card';
        card.innerHTML = `
            <div class="admin-comment-header">
                <div class="admin-comment-author">
                    <div class="author-avatar">${comment.name.charAt(0).toUpperCase()}</div>
                    <div>
                        <strong>${comment.name}</strong>
                        <span class="admin-comment-date">${comment.date}</span>
                    </div>
                </div>
                <div class="admin-comment-actions">
                    <span class="admin-comment-stars">${stars}</span>
                    <button class="action-btn action-delete" title="Excluir depoimento" onclick="confirmDeleteComment(${comment.id}, '${comment.name.replace(/'/g, "\\'")}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
            <p class="admin-comment-text">"${comment.text}"</p>
        `;
        adminCommentsList.appendChild(card);
    });
}

function confirmDeleteComment(id, name) {
    if (confirm(`Excluir o depoimento de "${name}"?`)) {
        deleteComment(id);
        showToast('Depoimento excluído.');
        refreshAll();
    }
}

// ===== RESET DATA =====
btnResetData.addEventListener('click', () => {
    if (confirm('Tem certeza? Isso vai restaurar todos os produtos e depoimentos para os dados padrão. Esta ação não pode ser desfeita.')) {
        resetToDefaults();
        showToast('Dados restaurados para o padrão!');
        refreshAll();
    }
});

// ===== TOAST NOTIFICATIONS =====
function showToast(message) {
    const existing = document.querySelector('.admin-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'admin-toast';
    toast.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        ${message}
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== REFRESH ALL =====
function refreshAll() {
    updateStats();
    renderProductsTable();
    renderCommentsList();
}

// ===== INIT =====
checkAuth();
