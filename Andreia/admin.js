// ===== admin.js — Admin Panel Logic (Firebase Auth + Firestore) =====

// ===== DOM ELEMENTS =====
const loginScreen = document.getElementById('loginScreen');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const loginErrorMsg = document.getElementById('loginErrorMsg');
const loginBtn = document.getElementById('loginBtn');
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

// Comments
const commentModal = document.getElementById('commentModal');
const commentEditForm = document.getElementById('commentEditForm');
const commentModalClose = document.getElementById('commentModalClose');
const commentModalCancel = document.getElementById('commentModalCancel');
const adminCommentsList = document.getElementById('adminCommentsList');
const commentsCountEl = document.getElementById('commentsCount');

// Stats
const statProducts = document.getElementById('statProducts');
const statComments = document.getElementById('statComments');
const statAvgRating = document.getElementById('statAvgRating');

// ===== AUTH — Firebase Auth =====
onAuthStateChanged((user) => {
    if (user) {
        showDashboard();
    } else {
        loginScreen.style.display = '';
        adminDashboard.style.display = 'none';
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';
    loginError.style.display = 'none';

    const result = await adminLogin(loginEmail.value.trim(), loginPassword.value);

    if (result.success) {
        loginError.style.display = 'none';
        // onAuthStateChanged will handle showing dashboard
    } else {
        const errorMessages = {
            'auth/user-not-found': 'Usuário não encontrado',
            'auth/wrong-password': 'Senha incorreta',
            'auth/invalid-email': 'Email inválido',
            'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde',
            'auth/invalid-credential': 'Email ou senha incorretos'
        };

        const code = result.error.includes('auth/') ? result.error.match(/auth\/[a-z-]+/)?.[0] : '';
        loginErrorMsg.textContent = errorMessages[code] || 'Email ou senha incorretos';
        loginError.style.display = 'flex';
        loginPassword.value = '';
        loginPassword.focus();
    }

    loginBtn.disabled = false;
    loginBtn.textContent = 'Entrar';
});

togglePassword.addEventListener('click', () => {
    const type = loginPassword.type === 'password' ? 'text' : 'password';
    loginPassword.type = type;
    togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
});

// Google Sign-In
const googleLoginBtn = document.getElementById('googleLoginBtn');
googleLoginBtn.addEventListener('click', async () => {
    googleLoginBtn.disabled = true;
    googleLoginBtn.textContent = 'Entrando...';
    loginError.style.display = 'none';

    const result = await adminLoginWithGoogle();

    if (!result.success) {
        loginErrorMsg.textContent = 'Erro ao fazer login com Google. Tente novamente.';
        loginError.style.display = 'flex';
    }

    googleLoginBtn.disabled = false;
    googleLoginBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Entrar com Google`;
});

logoutBtn.addEventListener('click', async () => {
    await adminLogout();
    loginScreen.style.display = '';
    adminDashboard.style.display = 'none';
    loginPassword.value = '';
    loginEmail.value = '';
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
async function updateStats() {
    const products = await getProducts();
    const comments = await getComments();

    statProducts.textContent = products.length;
    statComments.textContent = comments.length;
    commentsCountEl.textContent = `${comments.length} depoimento${comments.length !== 1 ? 's' : ''}`;

    if (comments.length > 0) {
        const avg = (comments.reduce((s, c) => s + (c.stars || 0), 0) / comments.length).toFixed(1);
        statAvgRating.textContent = avg + '★';
    } else {
        statAvgRating.textContent = '—';
    }
}

// ===== PRODUCTS TABLE =====
async function renderProductsTable() {
    const products = await getProducts();
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
                    <button class="action-btn action-edit" title="Editar" data-id="${product.id}">✏️</button>
                    <button class="action-btn action-delete" title="Excluir" data-id="${product.id}" data-name="${product.name}">🗑️</button>
                </div>
            </td>
        `;
        productsTableBody.appendChild(tr);
    });

    // Bind edit buttons
    productsTableBody.querySelectorAll('.action-edit').forEach(btn => {
        btn.addEventListener('click', () => editProductHandler(btn.dataset.id));
    });

    // Bind delete buttons
    productsTableBody.querySelectorAll('.action-delete').forEach(btn => {
        btn.addEventListener('click', () => confirmDeleteProduct(btn.dataset.id, btn.dataset.name));
    });
}

// ===== PRODUCT MODAL =====
async function openProductModal(editId) {
    productModal.style.display = 'flex';
    if (editId) {
        productModalTitle.textContent = 'Editar Produto';
        const products = await getProducts();
        const product = products.find(p => p.id === editId);
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

productForm.addEventListener('submit', async (e) => {
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
        await updateProduct(editId, data);
        showToast('Produto atualizado com sucesso!');
    } else {
        await addProduct(data);
        showToast('Produto adicionado com sucesso!');
    }

    closeProductModal();
    refreshAll();
});

async function editProductHandler(id) {
    await openProductModal(id);
}

async function confirmDeleteProduct(id, name) {
    if (confirm(`Tem certeza que deseja excluir "${name}"?`)) {
        await deleteProduct(id);
        showToast('Produto excluído.');
        refreshAll();
    }
}

// ===== COMMENTS LIST =====
async function renderCommentsList() {
    const comments = await getComments();
    adminCommentsList.innerHTML = '';

    if (comments.length === 0) {
        adminCommentsList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">Nenhum depoimento ainda.</p>';
        return;
    }

    comments.forEach(comment => {
        const stars = '★'.repeat(comment.stars || 0) + '☆'.repeat(5 - (comment.stars || 0));
        const card = document.createElement('div');
        card.className = 'admin-comment-card';
        card.innerHTML = `
            <div class="admin-comment-header">
                <div class="admin-comment-author">
                    <div class="author-avatar">${comment.name.charAt(0).toUpperCase()}</div>
                    <div>
                        <strong>${comment.name}</strong>
                        <span class="admin-comment-date">${comment.date || ''}</span>
                    </div>
                </div>
                <div class="admin-comment-actions">
                    <span class="admin-comment-stars">${stars}</span>
                    <button class="action-btn action-edit" title="Editar" data-id="${comment.id}">✏️</button>
                    <button class="action-btn action-delete" title="Excluir" data-id="${comment.id}" data-name="${comment.name}">🗑️</button>
                </div>
            </div>
            <p class="admin-comment-text">"${comment.text}"</p>
        `;
        adminCommentsList.appendChild(card);
    });

    // Bind edit buttons
    adminCommentsList.querySelectorAll('.action-edit').forEach(btn => {
        btn.addEventListener('click', () => editCommentHandler(btn.dataset.id));
    });

    // Bind delete buttons
    adminCommentsList.querySelectorAll('.action-delete').forEach(btn => {
        btn.addEventListener('click', () => confirmDeleteComment(btn.dataset.id, btn.dataset.name));
    });
}

// ===== COMMENT EDIT MODAL =====
async function editCommentHandler(id) {
    const comments = await getComments();
    const comment = comments.find(c => c.id === id);
    if (!comment) return;

    document.getElementById('commentEditId').value = comment.id;
    document.getElementById('editCommentName').value = comment.name;
    document.getElementById('editCommentText').value = comment.text;
    document.getElementById('editCommentStars').value = comment.stars || 5;
    commentModal.style.display = 'flex';
}

function closeCommentModal() {
    commentModal.style.display = 'none';
    commentEditForm.reset();
}

commentModalClose.addEventListener('click', closeCommentModal);
commentModalCancel.addEventListener('click', closeCommentModal);
commentModal.addEventListener('click', (e) => {
    if (e.target === commentModal) closeCommentModal();
});

commentEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('commentEditId').value;
    const data = {
        name: document.getElementById('editCommentName').value.trim(),
        text: document.getElementById('editCommentText').value.trim(),
        stars: parseInt(document.getElementById('editCommentStars').value)
    };

    await updateComment(id, data);
    showToast('Depoimento atualizado!');
    closeCommentModal();
    refreshAll();
});

async function confirmDeleteComment(id, name) {
    if (confirm(`Excluir o depoimento de "${name}"?`)) {
        await deleteComment(id);
        showToast('Depoimento excluído.');
        refreshAll();
    }
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message) {
    const existing = document.querySelector('.admin-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'admin-toast';
    toast.innerHTML = `✅ ${message}`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== REFRESH ALL =====
async function refreshAll() {
    await Promise.all([
        updateStats(),
        renderProductsTable(),
        renderCommentsList()
    ]);
}
