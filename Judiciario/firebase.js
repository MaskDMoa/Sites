// ========== FIREBASE CONFIG (CDN v9 compat) ==========
// These scripts must be loaded in HTML before this file:
//   https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js
//   https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js

const firebaseConfig = {
    apiKey: "",
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
// Stores user session in sessionStorage (works cross-device, per-tab)
function setSession(userId, isAdmin = false, adminNome = '') {
    sessionStorage.setItem('session', JSON.stringify({ userId, isAdmin, adminNome }));
}

function getSession() {
    const s = sessionStorage.getItem('session');
    return s ? JSON.parse(s) : null;
}

function clearSession() {
    sessionStorage.removeItem('session');
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

