// ========== FIREBASE CONFIG (CDN v9 compat) ==========
// These scripts must be loaded in HTML before this file:
//   https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js
//   https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js

const firebaseConfig = {
    apiKey: "AIzaSyCPk1DnU5HZVDH-JCj7M6klb6GC9vi7Kto",
    authDomain: "judi-50ed0.firebaseapp.com",
    projectId: "judi-50ed0",
    storageBucket: "judi-50ed0.firebasestorage.app",
    messagingSenderId: "207922109010",
    appId: "1:207922109010:web:b33f42d0ad7308e91c1d8b",
    measurementId: "G-0ZJXRNP08J"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ========== HASH (SHA-256) ==========
async function hashSenha(senha) {
    const encoder = new TextEncoder();
    const data = encoder.encode(senha);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ========== SESSION ==========
// Stores user session in localStorage (works cross-device, persistent)
function setSession(userId, isAdmin = false, adminNome = '') {
    localStorage.setItem('session', JSON.stringify({ userId, isAdmin, adminNome }));
}

function getSession() {
    const s = localStorage.getItem('session');
    return s ? JSON.parse(s) : null;
}

function clearSession() {
    localStorage.removeItem('session');
}

// ========== ADMINS ==========
async function loginAdmin(nome, senha) {
    const adminDoc = await db.collection('admins').doc(nome).get();
    if (!adminDoc.exists) {
        return { success: false, error: 'Administrador não encontrado no sistema.' };
    }
    const inputHash = await hashSenha(senha);
    if (inputHash !== adminDoc.data().senhaHash) {
        return { success: false, error: 'Senha de administrador incorreta.' };
    }
    return { success: true };
}

// ========== SOLICITAÇÕES ==========
async function addSolicitacao(data) {
    const senhaHash = await hashSenha(data.senha);
    const doc = {
        nome: data.nome,
        contato: data.contato,
        motivo: data.motivo,
        senhaHash: senhaHash,
        status: 'pendente', // pendente, aprovado, rejeitado
        dataSolicitacao: firebase.firestore.FieldValue.serverTimestamp(),
        motivoRejeicao: '',
        usuarioId: '' // set when approved
    };
    const ref = await db.collection('solicitacoes').add(doc);
    return ref.id;
}

async function getSolicitacoes(statusFilter = null) {
    let query = db.collection('solicitacoes').orderBy('dataSolicitacao', 'desc');
    const snapshot = await query.get();
    let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (statusFilter) {
        results = results.filter(s => s.status === statusFilter);
    }
    return results;
}

async function getSolicitacao(id) {
    const doc = await db.collection('solicitacoes').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

async function getSolicitacaoPorNome(nome) {
    const snapshot = await db.collection('solicitacoes').get();
    const nomeLower = nome.toLowerCase().trim();
    return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .find(s => s.nome.toLowerCase().trim() === nomeLower) || null;
}

async function aprovarSolicitacao(solicitacaoId) {
    const sol = await getSolicitacao(solicitacaoId);
    if (!sol) throw new Error('Solicitação não encontrada');

    // Create user account as "candidato" (no cargo yet, can take exam)
    const userId = await addUsuario({
        nome: sol.nome,
        cargo: 'candidato',
        nivel: 'candidato',
        senhaHash: sol.senhaHash,
        contato: sol.contato
    });

    // Update solicitação
    await db.collection('solicitacoes').doc(solicitacaoId).update({
        status: 'aprovado',
        usuarioId: userId
    });

    return userId;
}

async function rejeitarSolicitacao(solicitacaoId, motivo) {
    await db.collection('solicitacoes').doc(solicitacaoId).update({
        status: 'rejeitado',
        motivoRejeicao: motivo || 'Sua solicitação não foi aprovada.'
    });
}

// ========== USUARIOS ==========
async function addUsuario(data) {
    const credencial = data.cargo !== 'candidato' ? await gerarCredencial(data.cargo) : '';
    const doc = {
        nome: data.nome,
        cargo: data.cargo,
        nivel: data.nivel,
        julgamentos: data.julgamentos || 0,
        casosVencidos: data.casosVencidos || 0,
        dataIngresso: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'ativo',
        fotoUrl: data.fotoUrl || '',
        credencial: credencial,
        carteirinhaUrl: '',
        bio: '',
        titulo: '',
        senhaHash: data.senhaHash || '',
        contato: data.contato || ''
    };
    const ref = await db.collection('usuarios').add(doc);
    return ref.id;
}

async function gerarCredencial(cargo) {
    const prefixos = {
        advogado: 'CPA',
        juiz: 'CMA',
        promotor: 'CPA-P',
        conselheiro: 'SCA'
    };
    const prefixo = prefixos[cargo] || 'GEN';
    const snapshot = await db.collection('usuarios').where('cargo', '==', cargo).get();
    const num = (snapshot.size + 1).toString().padStart(3, '0');
    return `${prefixo}-${num}`;
}

async function getUsuarios() {
    const snapshot = await db.collection('usuarios').orderBy('nome').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getUsuario(id) {
    const doc = await db.collection('usuarios').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

async function updateUsuario(id, data) {
    await db.collection('usuarios').doc(id).update(data);
}

async function deleteUsuario(id) {
    await db.collection('usuarios').doc(id).delete();
}

async function buscarUsuarioPorNome(nome) {
    const snapshot = await db.collection('usuarios').get();
    const nomeLower = nome.toLowerCase();
    return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.nome.toLowerCase().includes(nomeLower));
}

async function loginUsuario(nome, senha) {
    const snapshot = await db.collection('usuarios').get();
    const nomeLower = nome.toLowerCase().trim();
    const user = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .find(u => u.nome.toLowerCase().trim() === nomeLower);

    if (!user) return { success: false, error: 'Usuário não encontrado.' };
    if (!user.senhaHash) return { success: false, error: 'Conta sem senha. Contate um admin.' };

    const inputHash = await hashSenha(senha);
    if (inputHash !== user.senhaHash) return { success: false, error: 'Senha incorreta.' };

    return { success: true, user };
}

async function verificarSenhaUsuario(userId, senha) {
    const user = await getUsuario(userId);
    if (!user) return false;
    const inputHash = await hashSenha(senha);
    return inputHash === user.senhaHash;
}

// ========== PROVAS ==========
async function addProva(data) {
    const doc = {
        titulo: data.titulo,
        perguntas: data.perguntas, // each: { tipo: 'fechada'|'aberta', enunciado, alternativas?, correta? }
        notaMinima: data.notaMinima || 70,
        dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
        ativa: true
    };
    const ref = await db.collection('provas').add(doc);
    return ref.id;
}

async function getProvas() {
    const snapshot = await db.collection('provas').orderBy('dataCriacao', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getProva(id) {
    const doc = await db.collection('provas').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

async function updateProva(id, data) {
    await db.collection('provas').doc(id).update(data);
}

async function deleteProva(id) {
    await db.collection('provas').doc(id).delete();
}

// ========== RESULTADOS ==========
async function salvarResultado(data) {
    const doc = {
        usuarioId: data.usuarioId,
        usuarioNome: data.usuarioNome,
        provaId: data.provaId,
        provaTitulo: data.provaTitulo,
        nota: data.nota,
        aprovado: data.aprovado,
        respostas: data.respostas || [], // { pergunta, tipo, resposta, correta? }
        statusRevisao: data.temAberta ? 'pendente' : 'finalizado', // pendente = admin needs to review
        dataRealizacao: firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection('resultados').add(doc);
    return ref.id;
}

async function getResultados() {
    const snapshot = await db.collection('resultados').orderBy('dataRealizacao', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getResultadosPorUsuario(usuarioId) {
    const snapshot = await db.collection('resultados')
        .where('usuarioId', '==', usuarioId)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function updateResultado(id, data) {
    await db.collection('resultados').doc(id).update(data);
}

// ========== INTIMAÇÕES ==========
async function addIntimacao(remetente, alvoNomeLivre, conteudo) {
    try {
        const doc = {
            remetente,
            alvoNomeLivre,
            conteudo,
            status: 'enviada',
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
        };
        const ref = await db.collection('intimacoes').add(doc);

        // Try to notify the target if we find a user with this exact name
        const userQuery = await db.collection('usuarios').where('nome', '==', alvoNomeLivre).get();
        if (!userQuery.empty) {
            const uId = userQuery.docs[0].id;
            await addNotificacao(uId, `Nova intimação recebida de ${remetente}`, 'intimacoes.html');
        }

        return ref.id;
    } catch (e) { throw e; }
}

async function getIntimacoes(alvoOuRemetente = null) {
    try {
        let query = db.collection('intimacoes').orderBy('dataCriacao', 'desc');
        const snapshot = await query.get();
        let ints = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (alvoOuRemetente) {
            ints = ints.filter(i => i.remetente === alvoOuRemetente || i.alvoNomeLivre === alvoOuRemetente);
        }
        return ints;
    } catch (e) { throw e; }
}

// ========== NOTIFICAÇÕES ==========
async function addNotificacao(userId, texto, link = "") {
    try {
        const doc = {
            userId,
            texto,
            link,
            lida: false,
            data: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('notificacoes').add(doc);
    } catch (e) { console.error('Erro notificação:', e); }
}

async function getNotificacoes(userId) {
    try {
        const snapshot = await db.collection('notificacoes')
            .where('userId', '==', userId)
            .where('lida', '==', false)
            .get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.data?.seconds || 0) - (a.data?.seconds || 0));
    } catch (e) { return []; }
}

async function markNotificacaoLida(notifId) {
    try {
        await db.collection('notificacoes').doc(notifId).update({ lida: true });
    } catch (e) { console.error(e); }
}

// ========== ARTIGOS ==========
async function addArtigo(data) {
    const doc = {
        numero: data.numero,
        titulo: data.titulo,
        texto: data.texto,
        categoria: data.categoria || 'Geral',
        dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection('artigos').add(doc);
    return ref.id;
}
async function getArtigos() {
    const snapshot = await db.collection('artigos').orderBy('numero', 'asc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
async function updateArtigo(id, data) {
    await db.collection('artigos').doc(id).update(data);
}
async function deleteArtigo(id) {
    await db.collection('artigos').doc(id).delete();
}

// ========== JURISPRUDÊNCIA ==========
async function addJurisprudencia(data) {
    const doc = {
        titulo: data.titulo,
        descricao: data.descricao,
        autor: data.autor,
        dataPublicacao: firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection('jurisprudencia').add(doc);
    return ref.id;
}
async function getJurisprudencias() {
    const snapshot = await db.collection('jurisprudencia').orderBy('dataPublicacao', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
async function updateJurisprudencia(id, data) {
    await db.collection('jurisprudencia').doc(id).update(data);
}
async function deleteJurisprudencia(id) {
    await db.collection('jurisprudencia').doc(id).delete();
}

// ========== CONTRATOS ==========
async function addContrato(data) {
    const doc = {
        titulo: data.titulo,
        objeto: data.objeto,
        nomeParte1: data.nomeParte1,
        assinadoParte1: data.assinadoParte1 || false,
        nomeParte2: data.nomeParte2,
        assinadoParte2: data.assinadoParte2 || false,
        status: data.status || 'rascunho', // rascunho, aguardando_revisao, aprovado, rejeitado
        dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
        motivoRejeicao: ''
    };
    const ref = await db.collection('contratos').add(doc);
    return ref.id;
}
async function getContratos() {
    const snapshot = await db.collection('contratos').orderBy('dataCriacao', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
async function getContrato(id) {
    const doc = await db.collection('contratos').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}
async function updateContrato(id, data) {
    await db.collection('contratos').doc(id).update(data);
}

// ========== CRIMINOSOS ==========
async function addCriminoso(data) {
    const doc = {
        nome: data.nome,
        crimes: data.crimes,
        recompensa: data.recompensa || 0,
        foto: data.foto || '',
        status: data.status || 'Procurado',
        dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection('criminosos').add(doc);
    return ref.id;
}
async function getCriminosos() {
    const snapshot = await db.collection('criminosos').orderBy('recompensa', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
async function updateCriminoso(id, data) {
    await db.collection('criminosos').doc(id).update(data);
}
async function deleteCriminoso(id) {
    await db.collection('criminosos').doc(id).delete();
}

// ========== UTILS ==========
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `${icons[type] || ''} ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatDate(timestamp) {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getNivelLabel(cargo, nivel) {
    const labels = {
        candidato: { candidato: '📋 Candidato (Aguardando Prova)' },
        advogado: {
            iniciante: '🥉 Advogado Iniciante',
            pleno: '🥈 Advogado Pleno',
            senior: '🥇 Advogado Sênior',
            mestre: '👑 Mestre da Advocacia'
        },
        juiz: {
            temporario: '🥉 Juiz Temporário',
            efetivo: '🥈 Juiz Efetivo',
            superior: '👑 Magistrado Superior'
        },
        promotor: {
            iniciante: '⚔️ Promotor',
            pleno: '⚔️ Promotor Pleno',
            senior: '⚔️ Promotor Sênior'
        },
        conselheiro: {
            iniciante: '👑 Conselheiro Arcano',
            pleno: '👑 Conselheiro Arcano',
            senior: '👑 Conselheiro Arcano'
        }
    };
    return labels[cargo]?.[nivel] || `${cargo} — ${nivel}`;
}

function getLevelTheme(nivel) {
    const themes = {
        candidato: 'theme-iniciante',
        iniciante: 'theme-iniciante',
        pleno: 'theme-pleno',
        senior: 'theme-senior',
        mestre: 'theme-mestre',
        temporario: 'theme-temporario',
        efetivo: 'theme-efetivo',
        superior: 'theme-superior'
    };
    return themes[nivel] || 'theme-iniciante';
}

function getLevelPermissions(nivel) {
    const perms = {
        candidato: { canEditName: false, canEditBio: false, canEditFoto: false, canEditTitulo: false },
        iniciante: { canEditName: true, canEditBio: false, canEditFoto: false, canEditTitulo: false },
        temporario: { canEditName: true, canEditBio: false, canEditFoto: false, canEditTitulo: false },
        pleno: { canEditName: true, canEditBio: true, canEditFoto: false, canEditTitulo: false },
        efetivo: { canEditName: true, canEditBio: true, canEditFoto: true, canEditTitulo: false },
        senior: { canEditName: true, canEditBio: true, canEditFoto: true, canEditTitulo: false },
        mestre: { canEditName: true, canEditBio: true, canEditFoto: true, canEditTitulo: true },
        superior: { canEditName: true, canEditBio: true, canEditFoto: true, canEditTitulo: true }
    };
    return perms[nivel] || perms.candidato;
}

// ========== SIDEBAR & GOOGLE AUTH ==========
document.addEventListener('DOMContentLoaded', async () => {
    const session = getSession();
    if (session && session.userId && !session.isAdmin) {
        const user = await getUsuario(session.userId);
        if (user) {
            updateSidebarUserInfo(user);
        } else {
            // Session invalid, user was deleted — clear it
            clearSession();
            updateTopRightLink(null);
        }
    } else if (session && session.isAdmin) {
        updateSidebarUserInfo({ nome: session.adminNome, isAdmin: true });
    } else {
        // No session — visitor
        updateTopRightLink(null);
    }
});

// Updates the top-right widget link based on login state
function updateTopRightLink(user) {
    const link = document.getElementById('topRightUser');
    if (!link) return;
    if (user && !user.isAdmin && user.id) {
        link.href = `perfil.html?id=${user.id}`;
        link.title = 'Ver Meu Perfil';
    } else if (user && user.isAdmin) {
        link.href = 'admin.html';
        link.title = 'Painel Admin';
    } else {
        link.href = 'registro.html';
        link.title = 'Fazer Login';
    }
}

function updateSidebarUserInfo(user) {
    const nameEl = document.getElementById('sidebarUserName');
    const avatarImg = document.getElementById('sidebarAvatar');
    const avatarPlaceholder = document.getElementById('sidebarAvatarPlaceholder');
    const btnGoogle = document.getElementById('btnGoogleAuth');

    // Update the top-right link
    updateTopRightLink(user);

    if (nameEl) nameEl.textContent = user.isAdmin ? `🛡️ ${user.nome}` : user.nome;
    if (btnGoogle) {
        // If logged in, change button to Link Google or Logout
        if (!user.googleUid) {
            btnGoogle.textContent = '🔗 Sincronizar Google';
            btnGoogle.onclick = () => linkWithGoogle(user.isAdmin ? user.nome : user.id, user.isAdmin);
        } else {
            btnGoogle.textContent = 'Sair';
            btnGoogle.classList.replace('btn-secondary', 'btn-danger');
            btnGoogle.onclick = () => {
                clearSession();
                firebase.auth().signOut();
                window.location.reload();
            };
        }
        btnGoogle.style.display = 'block';
    }

    if (user.fotoUrl || user.carteirinhaUrl) {
        if (avatarImg) {
            avatarImg.src = user.fotoUrl || user.carteirinhaUrl;
            avatarImg.style.display = 'block';
        }
        if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
    } else {
        if (avatarImg) avatarImg.style.display = 'none';
        if (avatarPlaceholder) {
            avatarPlaceholder.textContent = user.isAdmin ? '🛡️' : (user.nome ? user.nome.charAt(0).toUpperCase() : '?');
            avatarPlaceholder.style.display = 'flex';
        }
    }

    // Notifications Widget
    if (!document.getElementById('notifWidget')) {
        const p = document.createElement('div');
        p.id = 'notifWidget';
        p.style.position = 'fixed';
        p.style.bottom = '20px';
        p.style.right = '20px';
        p.style.zIndex = '9999';
        document.body.appendChild(p);
    }

    if (!user.isAdmin) {
        getNotificacoes(user.id).then(notifs => {
            const widget = document.getElementById('notifWidget');
            if (notifs.length > 0) {
                widget.innerHTML = `<button class="btn btn-primary" onclick="showNotificacoesModal()" style="box-shadow:0 4px 15px rgba(255,215,0,0.5); padding:0.5rem 1rem;">🔔 <b>${notifs.length} Novas</b></button>`;
                window.unreadNotifs = notifs;
            } else {
                widget.innerHTML = `<button class="btn btn-secondary" onclick="showToast('Nenhuma notificação nova', 'info')" style="padding:0.5rem 1rem; opacity:0.8;">🔕 0</button>`;
                window.unreadNotifs = [];
            }
        });
    }
}

function showNotificacoesModal() {
    let container = document.getElementById('notifModalOverlay');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notifModalOverlay';
        container.className = 'modal-overlay';
        container.innerHTML = `
            <div class="modal card" style="max-width:400px; padding:1.5rem; text-align:center;">
                <h2 style="margin-bottom:1rem; color:var(--text-primary);">🔔 Minhas Notificações</h2>
                <div id="notifListContainer" style="display:flex; flex-direction:column; gap:0.8rem; text-align:left; max-height:300px; overflow-y:auto; margin-bottom:1rem;"></div>
                <button class="btn btn-secondary" style="width:100%;" onclick="document.getElementById('notifModalOverlay').classList.remove('active')">Fechar</button>
            </div>
        `;
        document.body.appendChild(container);
    }
    const listHtml = window.unreadNotifs.map(n => `
        <div style="background:var(--bg-lighter); padding:1rem; border-radius:6px; font-size:0.9rem; border-left:3px solid var(--gold); display:flex; justify-content:space-between; align-items:center;">
            <div>
                <span style="color:var(--text-primary); font-weight:bold;">${n.texto}</span>
                <br><span style="font-size:0.75rem; color:var(--text-muted);">${formatDate(n.data)}</span>
            </div>
            <button class="btn btn-primary btn-sm" onclick="markAndGo('${n.id}', '${n.link}')">Ok</button>
        </div>
    `).join('');
    document.getElementById('notifListContainer').innerHTML = listHtml;
    container.classList.add('active');
}

window.markAndGo = async function (id, link) {
    document.getElementById('notifModalOverlay').classList.remove('active');
    try { await markNotificacaoLida(id); } catch (e) { }
    if (link && link !== 'undefined') window.location.href = link;
    else window.location.reload();
}

async function loginWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        const gUser = result.user;

        // Check if there is a Judiciario user with this google uid
        const usersRef = db.collection('usuarios');
        const snapshot = await usersRef.where('googleUid', '==', gUser.uid).get();
        if (!snapshot.empty) {
            const judUser = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            setSession(judUser.id, false);
            updateSidebarUserInfo(judUser);
            showToast('Logado com sucesso via Google!');
            setTimeout(() => window.location.reload(), 1000);
            return;
        }

        // Check if there's an admin
        const adminsRef = db.collection('admins');
        const admSnap = await adminsRef.where('googleUid', '==', gUser.uid).get();
        if (!admSnap.empty) {
            const adm = { id: admSnap.docs[0].id, ...admSnap.docs[0].data() };
            setSession(adm.id, true, adm.id);
            updateSidebarUserInfo({ nome: adm.id, isAdmin: true, googleUid: adm.googleUid });
            showToast('Admin logado com sucesso via Google!');
            setTimeout(() => window.location.reload(), 1000);
            return;
        }

        showToast('Nenhuma conta encontrada para este Google.', 'error');
        setTimeout(() => showToast('Faça login normal primeiro e depois clique em Sincronizar Google.', 'info'), 1500);
        firebase.auth().signOut();
    } catch (e) {
        showToast('Erro no Google Login: ' + e.message, 'error');
    }
}

async function linkWithGoogle(userId, isAdmin = false) {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        const gUser = result.user;

        if (isAdmin) {
            await db.collection('admins').doc(userId).update({ googleUid: gUser.uid });
            updateSidebarUserInfo({ nome: userId, isAdmin: true, googleUid: gUser.uid });
        } else {
            await db.collection('usuarios').doc(userId).update({ googleUid: gUser.uid });
            const user = await getUsuario(userId);
            updateSidebarUserInfo(user);
        }
        showToast('Conta sincronizada com Google com sucesso!', 'success');
    } catch (e) {
        // Handle credential-already-in-use
        if (e.code === 'auth/credential-already-in-use') {
            showToast('Esta conta Google já está vinculada a outro usuário.', 'error');
        } else {
            showToast('Erro ao sincronizar: ' + e.message, 'error');
        }
    }
}
