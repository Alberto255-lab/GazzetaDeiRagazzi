// ========== CONFIGURAZIONE ==========
const ARTICLES_PER_PAGE = 9;
let currentPage = 1;
let allArticles = [];
let filteredArticles = [];
let isAdmin = false;

// Configurazione GitHub (MODIFICA QUESTI!)
const GITHUB_USER = 'EspoAlberto'; // TUA username GitHub
const GITHUB_REPO = 'gazzetta-ragazzi'; // TUO repository
const GITHUB_BRANCH = 'main';

// Credenziali Admin (MODIFICA LA PASSWORD SE VUOI)
const ADMIN_USERNAME = 'EspoAlberto';
const ADMIN_PASSWORD = 'GazzettaDeiRagazzi2024!@#';

// ========== ELEMENTI DOM ==========
const articlesGrid = document.getElementById('articles-grid');
const pagination = document.getElementById('pagination');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageInfo = document.getElementById('page-info');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const filterButtons = document.querySelectorAll('.filter-btn');
const loginModal = document.getElementById('login-modal');
const adminLoginBtn = document.getElementById('admin-login-btn');
const footerAdminBtn = document.getElementById('footer-admin-btn');
const closeModal = document.querySelector('.close-modal');
const loginForm = document.getElementById('login-form');
const notification = document.getElementById('notification');
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.querySelector('.nav-links');
const totalArticlesEl = document.getElementById('total-articles');
const totalViewsEl = document.getElementById('total-views');
const totalImagesEl = document.getElementById('total-images');
const footerStatsEl = document.getElementById('footer-stats');

// ========== INIZIALIZZAZIONE ==========
document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    setupEventListeners();
    checkAdminSession();
});

// ========== SETUP EVENT LISTENERS ==========
function setupEventListeners() {
    // Paginazione
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayArticles();
        }
    });

    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            displayArticles();
        }
    });

    // Ricerca
    searchBtn.addEventListener('click', searchArticles);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchArticles();
    });

    // Filtri
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterArticles(btn.dataset.filter);
        });
    });

    // Admin login (Campi VUOTI!)
    adminLoginBtn.addEventListener('click', () => {
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        loginModal.style.display = 'flex';
    });
    
    footerAdminBtn.addEventListener('click', () => {
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        loginModal.style.display = 'flex';
    });
    
    closeModal.addEventListener('click', () => loginModal.style.display = 'none');
    
    // Chiudi modale cliccando fuori
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });

    // Login form
    loginForm.addEventListener('submit', handleLogin);

    // Menu mobile
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Chiudi menu cliccando fuori
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar') && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
        }
    });
}

// ========== FUNZIONI ARTICOLI ==========

// Carica articoli da GitHub
async function loadArticles() {
    try {
        showLoading();
        
        // 1. Carica index.json
        const indexUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/articoli/index.json`;
        
        let articlesList = [];
        try {
            const response = await fetch(indexUrl);
            if (!response.ok) throw new Error('index.json non trovato');
            
            articlesList = await response.json();
            console.log(`✅ Index.json: ${articlesList.length} articoli`);
        } catch (e) {
            console.log('index.json non trovato');
            showEmptyState();
            return;
        }
        
        // 2. Carica ogni articolo
        allArticles = [];
        
        for (const articleFile of articlesList) {
            if (articleFile.endsWith('.json') && articleFile !== 'index.json') {
                try {
                    const articleUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/articoli/${articleFile}`;
                    const response = await fetch(articleUrl);
                    
                    if (!response.ok) {
                        console.warn(`⚠️ ${articleFile} non trovato`);
                        continue;
                    }
                    
                    const article = await response.json();
                    
                    // Assicurati che nome_file esista
                    if (!article.nome_file) {
                        article.nome_file = articleFile.replace('.json', '');
                    }
                    
                    // Visualizzazioni REALI da localStorage
                    const viewsKey = `views_${article.nome_file}`;
                    article.views = parseInt(localStorage.getItem(viewsKey) || '0');
                    
                    // Formatta data
                    article.data_formattata = formatDate(article.data);
                    article.excerpt = getExcerpt(article.contenuto, 150);
                    
                    allArticles.push(article);
                    
                } catch (e) {
                    console.error(`❌ Errore ${articleFile}:`, e);
                }
            }
        }
        
        // 3. Se nessun articolo
        if (allArticles.length === 0) {
            showEmptyState();
            return;
        }
        
        // 4. Ordina per data
        allArticles.sort((a, b) => new Date(b.data) - new Date(a.data));
        filteredArticles = [...allArticles];
        
        // 5. Aggiorna UI
        updateStatistics();
        displayArticles();
        
        console.log(`✅ Caricati ${allArticles.length} articoli`);
        
    } catch (error) {
        console.error('❌ Errore caricamento:', error);
        showErrorState();
    }
}

// Mostra stato di caricamento
function showLoading() {
    articlesGrid.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Caricamento articoli...</p>
        </div>
    `;
    pagination.style.display = 'none';
}

// Mostra stato vuoto
function showEmptyState() {
    articlesGrid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-newspaper"></i>
            <h3>Benvenuto su La Gazzetta dei Ragazzi!</h3>
            <p>Nessun articolo ancora pubblicato.</p>
            <div style="margin-top: 20px; background: #f0f9ff; padding: 20px; border-radius: 10px; max-width: 500px; margin-left: auto; margin-right: auto;">
                <p><strong>Per pubblicare il primo articolo:</strong></p>
                <ol style="text-align: left; margin-left: 20px;">
                    <li>Usa il bot Telegram</li>
                    <li>Scrivi <code>/articolo</code></li>
                    <li>Segui le istruzioni</li>
                    <li>L'articolo apparirà qui automaticamente!</li>
                </ol>
            </div>
        </div>
    `;
    pagination.style.display = 'none';
    updateStatistics();
}

// Mostra errore
function showErrorState() {
    articlesGrid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Errore di connessione</h3>
            <p>Impossibile caricare gli articoli.</p>
            <p><small>Verifica la configurazione GitHub</small></p>
            <button onclick="loadArticles()" class="reload-btn">
                <i class="fas fa-redo"></i> Riprova
            </button>
        </div>
    `;
    pagination.style.display = 'none';
}

// Aggiorna statistiche
function updateStatistics() {
    const totalArticles = allArticles.length;
    const totalViews = allArticles.reduce((sum, article) => sum + (article.views || 0), 0);
    const totalImages = allArticles.reduce((sum, article) => sum + (article.immagini || 0), 0);
    
    if (totalArticlesEl) totalArticlesEl.textContent = totalArticles;
    if (totalViewsEl) totalViewsEl.textContent = totalViews;
    if (totalImagesEl) totalImagesEl.textContent = totalImages;
    if (footerStatsEl) footerStatsEl.textContent = `${totalArticles} articoli • ${totalViews} visualizzazioni`;
}

// Mostra articoli nella griglia
function displayArticles() {
    const start = (currentPage - 1) * ARTICLES_PER_PAGE;
    const end = start + ARTICLES_PER_PAGE;
    const articlesToShow = filteredArticles.slice(start, end);
    
    if (articlesToShow.length === 0) {
        articlesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Nessun articolo trovato</h3>
                <p>Prova a cambiare filtro o ricerca</p>
            </div>
        `;
        pagination.style.display = 'none';
        return;
    }
    
    articlesGrid.innerHTML = articlesToShow.map(article => createArticleCard(article)).join('');
    pagination.style.display = 'flex';
    
    const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    pageInfo.textContent = `Pagina ${currentPage} di ${totalPages}`;
    
    document.querySelectorAll('.article-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-btn') && !e.target.closest('.admin-badge')) {
                const articleId = card.dataset.id;
                openArticle(articleId);
            }
        });
    });
}

// Crea card articolo
function createArticleCard(article) {
    const hasImages = article.immagini && article.immagini > 0;
    let imageUrl = '';
    
    if (hasImages && article.immagini_files && article.immagini_files.length > 0) {
        imageUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/immagini/${article.immagini_files[0]}`;
    }
    
    const adminClass = isAdmin ? 'admin-mode' : '';
    
    const imageHTML = hasImages ? 
        `<div class="card-image">
            <img src="${imageUrl}" alt="${article.titolo}" loading="lazy"
                 onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\"no-image\"><i class=\"fas fa-newspaper\"></i></div>';">
            <div class="image-count">
                <i class="fas fa-image"></i> ${article.immagini}
            </div>
        </div>` :
        `<div class="card-image no-image">
            <i class="fas fa-newspaper"></i>
        </div>`;
    
    return `
        <div class="article-card ${adminClass}" data-id="${article.nome_file}">
            ${imageHTML}
            
            <div class="card-content">
                <h3>${article.titolo || 'Articolo senza titolo'}</h3>
                
                <div class="card-meta">
                    <div class="card-date">
                        <i class="far fa-calendar"></i>
                        ${article.data_formattata || 'Data sconosciuta'}
                    </div>
                    <div class="card-stats">
                        <div class="stat-item" data-tooltip="Visualizzazioni">
                            <i class="far fa-eye"></i>
                            ${article.views || 0}
                        </div>
                        <div class="stat-item" data-tooltip="Parole">
                            <i class="far fa-file-alt"></i>
                            ${article.parole || 0}
                        </div>
                    </div>
                </div>
                
                <p class="card-excerpt">${article.excerpt || 'Nessun contenuto disponibile'}</p>
                
                <div class="card-footer">
                    <a href="#" class="read-more" onclick="event.stopPropagation(); openArticle('${article.nome_file}')">
                        Leggi articolo <i class="fas fa-arrow-right"></i>
                    </a>
                    ${isAdmin ? 
                        `<button class="delete-btn" onclick="event.stopPropagation(); deleteArticleFromGitHub('${article.nome_file}', this)">
                            <i class="fas fa-trash"></i> Elimina
                        </button>` : 
                        ''
                    }
                </div>
            </div>
            
            ${isAdmin ? 
                `<div class="admin-badge">
                    <i class="fas fa-crown"></i> Admin
                </div>` : 
                ''
            }
        </div>
    `;
}

// Filtra articoli
function filterArticles(filter) {
    currentPage = 1;
    
    switch(filter) {
        case 'recent':
            filteredArticles = [...allArticles].sort((a, b) => 
                new Date(b.data) - new Date(a.data)
            );
            break;
            
        case 'popular':
            filteredArticles = [...allArticles].sort((a, b) => 
                (b.views || 0) - (a.views || 0)
            );
            break;
            
        case 'images':
            filteredArticles = allArticles.filter(article => 
                article.immagini && article.immagini > 0
            );
            break;
            
        default:
            filteredArticles = [...allArticles];
    }
    
    displayArticles();
}

// Cerca articoli
function searchArticles() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    currentPage = 1;
    
    if (!searchTerm) {
        filteredArticles = [...allArticles];
    } else {
        filteredArticles = allArticles.filter(article => 
            (article.titolo && article.titolo.toLowerCase().includes(searchTerm)) ||
            (article.contenuto && article.contenuto.toLowerCase().includes(searchTerm)) ||
            (article.autore && article.autore.toLowerCase().includes(searchTerm))
        );
    }
    
    displayArticles();
}

// ========== ARTICOLO SINGOLO ==========

// Apri articolo (FUNZIONANTE)
async function openArticle(articleId) {
    try {
        // Incrementa visualizzazioni REALI
        const viewsKey = `views_${articleId}`;
        const currentViews = parseInt(localStorage.getItem(viewsKey) || '0');
        localStorage.setItem(viewsKey, currentViews + 1);
        
        // Aggiorna nell'array
        const articleIndex = allArticles.findIndex(a => a.nome_file === articleId);
        if (articleIndex !== -1) {
            allArticles[articleIndex].views = currentViews + 1;
            updateStatistics();
            
            // Salva dati per pagina articolo
            sessionStorage.setItem('currentArticle', articleId);
            sessionStorage.setItem('articleData', JSON.stringify(allArticles[articleIndex]));
            
            // Vai alla pagina
            window.location.href = 'articolo.html';
        } else {
            showNotification('Articolo non trovato', 'error');
        }
        
    } catch (error) {
        console.error('Errore apertura articolo:', error);
        showNotification('Errore', 'error');
    }
}

// ========== FUNZIONI UTILITY ==========

// Formatta data
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Data sconosciuta';
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

// Estrai estratto
function getExcerpt(text, maxLength) {
    if (!text) return 'Nessun contenuto disponibile';
    const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "").replace(/\n/g, ' ');
    return cleanText.length > maxLength ? 
        cleanText.substring(0, maxLength) + '...' : 
        cleanText;
}

// Mostra notifica
function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    const icon = type === 'error' ? 'fas fa-exclamation-circle' :
                type === 'success' ? 'fas fa-check-circle' :
                'fas fa-info-circle';
    
    notification.innerHTML = `<i class="${icon}"></i> ${message}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ========== FUNZIONI ADMIN ==========

// Gestione login
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        isAdmin = true;
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('adminLoginTime', Date.now());
        
        loginModal.style.display = 'none';
        showNotification('Accesso admin effettuato', 'success');
        
        enableAdminMode();
        
    } else {
        showNotification('Credenziali non valide', 'error');
        // Animazione shake
        loginForm.classList.add('shake');
        setTimeout(() => loginForm.classList.remove('shake'), 500);
    }
    
    loginForm.reset();
}

// Controlla sessione admin
function checkAdminSession() {
    const isAdminSaved = localStorage.getItem('isAdmin');
    const loginTime = localStorage.getItem('adminLoginTime');
    
    if (isAdminSaved === 'true' && loginTime) {
        const eightHours = 8 * 60 * 60 * 1000;
        if (Date.now() - parseInt(loginTime) < eightHours) {
            isAdmin = true;
            enableAdminMode();
        } else {
            localStorage.removeItem('isAdmin');
            localStorage.removeItem('adminLoginTime');
        }
    }
}

// Attiva modalità admin
function enableAdminMode() {
    document.querySelectorAll('.article-card').forEach(card => {
        card.classList.add('admin-mode');
    });
    
    addAdminControls();
}

// Aggiungi controlli admin
function addAdminControls() {
    if (!isAdmin) return;
    
    const filters = document.querySelector('.filters .container');
    if (!filters) return;
    
    const existingControls = document.querySelector('.admin-controls');
    if (existingControls) existingControls.remove();
    
    const adminControls = document.createElement('div');
    adminControls.className = 'admin-controls';
    adminControls.innerHTML = `
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
            <button class="admin-btn" onclick="exportArticles()">
                <i class="fas fa-download"></i> Esporta
            </button>
            <button class="admin-btn" onclick="resetAllViews()">
                <i class="fas fa-sync"></i> Reset Views
            </button>
            <button class="admin-btn logout-btn" onclick="logoutAdmin()">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        </div>
    `;
    
    filters.appendChild(adminControls);
}

// Elimina articolo (simulato - per versione reale serve backend)
async function deleteArticleFromGitHub(articleId, button) {
    if (!isAdmin) {
        showNotification('Accesso negato', 'error');
        return;
    }
    
    if (!confirm(`ELIMINARE QUESTO ARTICOLO?\n\nL'articolo verrà rimosso dal sito.`)) {
        return;
    }
    
    try {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
        
        // Simula eliminazione (in produzione serve backend con token GitHub)
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Rimuovi localmente
        const articleIndex = allArticles.findIndex(a => a.nome_file === articleId);
        if (articleIndex !== -1) {
            allArticles.splice(articleIndex, 1);
        }
        
        filteredArticles = allArticles.filter(a => a.nome_file !== articleId);
        
        // Salva come eliminato
        const deletedArticles = JSON.parse(localStorage.getItem('deletedArticles') || '[]');
        deletedArticles.push(articleId);
        localStorage.setItem('deletedArticles', JSON.stringify(deletedArticles));
        
        // Rimuovi visualizzazioni
        localStorage.removeItem(`views_${articleId}`);
        
        // Anima eliminazione
        const card = button.closest('.article-card');
        card.style.opacity = '0.5';
        card.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                displayArticles();
                updateStatistics();
                showNotification('Articolo eliminato (simulazione)', 'success');
                
                // In produzione, qui chiameresti: deleteFromGitHubAPI(articleId)
                console.log(`Per eliminazione reale su GitHub serve backend con token`);
                
            }, 300);
        }, 500);
        
    } catch (error) {
        console.error('Errore eliminazione:', error);
        showNotification('Errore eliminazione', 'error');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-trash"></i> Elimina';
    }
}

// Esporta articoli
function exportArticles() {
    if (!isAdmin) {
        showNotification('Accesso negato', 'error');
        return;
    }
    
    const data = {
        sito: "La Gazzetta dei Ragazzi",
        data_esportazione: new Date().toISOString(),
        totale_articoli: allArticles.length,
        articoli: allArticles
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const fileName = `gazzetta_export_${new Date().toISOString().split('T')[0]}.json`;
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', fileName);
    link.click();
    
    showNotification('Articoli esportati', 'success');
}

// Resetta tutte le visualizzazioni
function resetAllViews() {
    if (!isAdmin) {
        showNotification('Accesso negato', 'error');
        return;
    }
    
    if (!confirm('Resettare TUTTE le visualizzazioni?\n\nQuesta azione non può essere annullata.')) {
        return;
    }
    
    allArticles.forEach(article => {
        localStorage.removeItem(`views_${article.nome_file}`);
        article.views = 0;
    });
    
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('views_')) {
            localStorage.removeItem(key);
        }
    });
    
    updateStatistics();
    displayArticles();
    showNotification('Visualizzazioni resettate', 'success');
}

// Logout admin
function logoutAdmin() {
    if (!confirm('Uscire dalla modalità admin?')) {
        return;
    }
    
    isAdmin = false;
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminLoginTime');
    
    document.querySelectorAll('.article-card').forEach(card => {
        card.classList.remove('admin-mode');
    });
    
    const adminControls = document.querySelector('.admin-controls');
    if (adminControls) adminControls.remove();
    
    showNotification('Logout effettuato', 'info');
}

// ========== FUNZIONI GLOBALI ==========
window.deleteArticleFromGitHub = deleteArticleFromGitHub;
window.openArticle = openArticle;
window.loadArticles = loadArticles;
window.exportArticles = exportArticles;
window.resetAllViews = resetAllViews;
window.logoutAdmin = logoutAdmin;
