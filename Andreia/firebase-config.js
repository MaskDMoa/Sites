// ===== firebase-config.js — Firebase Init + Firestore Helpers =====
// Usa Firebase Compat SDK (via CDN, sem bundler)

// ===== FIREBASE CONFIG =====
const firebaseConfig = {
    apiKey: "AIzaSyCNdTKD7ggyBkOyvXiG_u87MsoQ8Eb43vw",
    authDomain: "andreia-d1835.firebaseapp.com",
    projectId: "andreia-d1835",
    storageBucket: "andreia-d1835.firebasestorage.app",
    messagingSenderId: "270653165429",
    appId: "1:270653165429:web:99670bd7697f5ee348cd3c",
    measurementId: "G-MJ5CF6S1MC"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ===== COLLECTIONS =====
const COLLECTIONS = {
    PRODUCTS: 'products',
    COMMENTS: 'comments'
};

// ===== PRODUCTS CRUD =====

async function getProducts() {
    try {
        const snapshot = await db.collection(COLLECTIONS.PRODUCTS).orderBy('order', 'asc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        return [];
    }
}

async function addProduct(product) {
    try {
        // Get the highest order number
        const snapshot = await db.collection(COLLECTIONS.PRODUCTS).orderBy('order', 'desc').limit(1).get();
        const maxOrder = snapshot.empty ? 0 : (snapshot.docs[0].data().order || 0);
        product.order = maxOrder + 1;

        const docRef = await db.collection(COLLECTIONS.PRODUCTS).add(product);
        return { id: docRef.id, ...product };
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
        return null;
    }
}

async function updateProduct(id, updatedData) {
    try {
        await db.collection(COLLECTIONS.PRODUCTS).doc(id).update(updatedData);
        return { id, ...updatedData };
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        return null;
    }
}

async function deleteProduct(id) {
    try {
        await db.collection(COLLECTIONS.PRODUCTS).doc(id).delete();
        return true;
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        return false;
    }
}

// ===== COMMENTS CRUD =====

async function getComments() {
    try {
        const snapshot = await db.collection(COLLECTIONS.COMMENTS).orderBy('date', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        return [];
    }
}

async function addComment(comment) {
    try {
        comment.date = new Date().toISOString().split('T')[0];
        const docRef = await db.collection(COLLECTIONS.COMMENTS).add(comment);
        return { id: docRef.id, ...comment };
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        return null;
    }
}

async function updateComment(id, updatedData) {
    try {
        await db.collection(COLLECTIONS.COMMENTS).doc(id).update(updatedData);
        return { id, ...updatedData };
    } catch (error) {
        console.error('Erro ao atualizar comentário:', error);
        return null;
    }
}

async function deleteComment(id) {
    try {
        await db.collection(COLLECTIONS.COMMENTS).doc(id).delete();
        return true;
    } catch (error) {
        console.error('Erro ao excluir comentário:', error);
        return false;
    }
}

// ===== AUTH HELPERS =====

async function adminLogin(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Erro no login:', error);
        return { success: false, error: error.message };
    }
}

async function adminLoginWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        return { success: true, user: result.user };
    } catch (error) {
        console.error('Erro no login com Google:', error);
        return { success: false, error: error.message };
    }
}

async function adminLogout() {
    try {
        await auth.signOut();
        return true;
    } catch (error) {
        console.error('Erro no logout:', error);
        return false;
    }
}

function onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
}
