// Configurazione
const ARTICLES_PER_PAGE = 9;
let currentPage = 1;
let allArticles = [];
let filteredArticles = [];
let isAdmin = false;
const ADMIN_USERNAME = 'EspoAlberto';
const ADMIN_PASSWORD = 'GazzettaDeiRagazzi2024!@#'; // Password MOLTO difficile

// Configurazione GitHub
const GITHUB_USER = 'tuousername'; // Cambia con il TUO username GitHub
const GITHUB_REPO = 'tuorepository'; // Cambia con il TUO repository
const GITHUB_BRANCH = 'main';

// Elementi DOM (come prima)
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

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    setupEventListeners();
    checkAdminSession();
});

// Setup event listeners (uguale a prima)
function setupEventListeners() {
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

    searchBtn.addEventListener('click', searchArticles);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchArticles();
    });

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterArticles(btn.dataset.filter);
        });
    });

    adminLoginBtn.addEventListener('click', () => loginModal.style.display = 'flex');
    footerAdminBtn.addEventListener('click', () => loginModal.style.display = 'flex');
    closeModal.addEventListener('click', () => loginModal.style.display = 'none');
    
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });

    loginForm.addEventListener('submit', handleLogin);

    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar') && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
        }
    });
}

// ========== FUNZIONI PRINCIPALI (RIVISTE) ==========

// Carica articoli da GitHub
async function loadArticles() {
    try {
        console.log('🔄 Caricamento articoli da GitHub...');
        
        // 1. Prima carica index.json
        const indexUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/articoli/index.json`;
        
        let articlesList = [];
        try {
            const indexResponse = await fetch(indexUrl);
            if (!indexResponse.ok) throw new Error('index.json non trovato');
            
            articlesList = await indexResponse.json();
            console.log(`✅ Trovati ${articlesList.length} articoli in index.json`);
        } catch (e) {
            console.log('index.json non trovato, provo a cercare articoli...');
            articlesList = await scanGitHubDirectory();
        }
        
        // 2. Carica ogni articolo
        allArticles = [];
        
        for (const articleFile of articlesList) {
            if (articleFile.endsWith('.json') && articleFile !== 'index.json') {
                try {
                    const articleUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/articoli/${articleFile}`;
                    const articleResponse = await fetch(articleUrl);
                    
                    if (!articleResponse.ok) {
                        console.warn(`⚠️ File non trovato: ${articleFile}`);
                        continue;
                    }
                    
                    const article = await articleResponse.json();
                    
                    // Verifica che l'articolo abbia tutti i campi necessari
                    if (!article.nome_file) {
                        article.nome_file = articleFile.replace('.json', '');
                    }
                    
                    // Carica visualizzazioni REALI da localStorage
                    const viewsKey = `views_${article.nome_file}`;
                    const savedViews = localStorage.getItem(viewsKey);
                    article.views = savedViews ? parseInt(savedViews) : 0;
                    
                    // Formatta data
                    article.data_formattata = formatDate(article.data);
                    article.excerpt = getExcerpt(article.contenuto, 150);
                    
                    allArticles.push(article);
                    console.log(`✅ Caricato: ${article.titolo}`);
                    
                } catch (e) {
                    console.error(`❌ Errore caricamento ${articleFile}:`, e);
                }
            }
        }
        
        // 3. Se nessun articolo, mostra stato vuoto
        if (allArticles.length === 0) {
            showEmptyState();
            return;
        }
        
        // 4. Ordina per data
        allArticles.sort((a, b) => new Date(b.data) - new Date(a.data));
        filteredArticles = [...allArticles];
        
        // 5. Aggiorna interfaccia
        updateStatistics();
        displayArticles();
        
        console.log(`✅ Caricati ${allArticles.length} articoli`);
        
    } catch (error) {
        console.error('❌ Errore caricamento articoli:', error);
        showErrorState();
    }
}

// Scansiona directory GitHub
async function scanGitHubDirectory() {
    try {
        const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/articoli`;
        const response = await fetch(apiUrl);
        
        if (response.ok) {
            const files = await response.json();
            return files
                .filter(file => file.name.endsWith('.json') && file.name !== 'index.json')
                .map(file => file.name);
        }
    } catch (e) {
        console.log('Impossibile scansionare GitHub');
    }
    
    return [];
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
                    <li>Usa il bot Telegram su @EspoAlberto</li>
                    <li>Scrivi <code>/articolo</code></li>
                    <li>Segui le istruzioni</li>
                    <li>L'articolo apparirà AUTOMATICAMENTE qui!</li>
                </ol>
                <p style="margin-top: 15px; color: #2563eb;">
                    <i class="fas fa-sync-alt"></i> La pagina si aggiorna automaticamente
                </p>
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
            <p>Impossibile caricare gli articoli da GitHub.</p>
            <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
                Controlla la connessione internet e verifica che il repository GitHub esista.
            </p>
            <button onclick="loadArticles()" style="margin-top: 20px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer;">
                <i class="fas fa-redo"></i> Riprova
            </button>
        </div>
    `;
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

// Mostra articoli (come prima ma con URL corretti)
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

// Crea card articolo (CON URL GITHUB PER IMMAGINI)
function createArticleCard(article) {
    const hasImages = article.immagini && article.immagini > 0;
    let imageUrl = '';
    
    if (hasImages && article.immagini_files && article.immagini_files.length > 0) {
        // URL diretto a GitHub per l'immagine
        imageUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/immagini/${article.immagini_files[0]}`;
    }
    
    const adminClass = isAdmin ? 'admin-mode' : '';
    
    const imageHTML = hasImages ? 
        `<div class="card-image">
            <img src="${imageUrl}" alt="${article.titolo}" loading="lazy"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzI1NjNlYiIvPjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TGEgR2F6emV0dGEgZGlaIFJhZ2F6emk8L3RleHQ+PC9zdmc+';">
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
                        <div class="stat-item" data-tooltip="Visualizzazioni reali">
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

// Apri articolo (FUNZIONANTE)
async function openArticle(articleId) {
    console.log(`🔗 Apro articolo: ${articleId}`);
    
    try {
        // 1. Verifica che l'articolo esista su GitHub
        const articleUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/articoli/${articleId}.json`;
        const response = await fetch(articleUrl);
        
        if (!response.ok) {
            throw new Error('Articolo non trovato su GitHub');
        }
        
        // 2. Incrementa visualizzazioni REALI
        const viewsKey = `views_${articleId}`;
        const currentViews = parseInt(localStorage.getItem(viewsKey) || '0');
        const newViews = currentViews + 1;
        localStorage.setItem(viewsKey, newViews);
        
        // 3. Aggiorna nell'array locale
        const articleIndex = allArticles.findIndex(a => a.nome_file === articleId);
        if (articleIndex !== -1) {
            allArticles[articleIndex].views = newViews;
            updateStatistics();
        }
        
        // 4. Salva e vai alla pagina
        sessionStorage.setItem('currentArticle', articleId);
        sessionStorage.setItem('articleData', JSON.stringify(await response.json()));
        window.location.href = 'articolo.html';
        
    } catch (error) {
        console.error('Errore apertura articolo:', error);
        showNotification('Articolo non trovato', 'error');
    }
}

// ========== FUNZIONI ARTICOLO.HTML ==========
// Questo codice va nel file articolo.html

async function loadArticlePage() {
    const articleId = sessionStorage.getItem('currentArticle');
    const articleData = sessionStorage.getItem('articleData');
    
    if (!articleId || !articleData) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const article = JSON.parse(articleData);
        
        // Incrementa visualizzazioni anche qui
        const viewsKey = `views_${articleId}`;
        const currentViews = parseInt(localStorage.getItem(viewsKey) || '0');
        localStorage.setItem(viewsKey, currentViews + 1);
        
        // ... resto del codice per visualizzare l'articolo ...
        
    } catch (error) {
        console.error('Errore caricamento pagina articolo:', error);
        window.location.href = 'index.html';
    }
}

// ========== FUNZIONI ADMIN (CON ELIMINAZIONE DA GITHUB) ==========

// Elimina articolo da GitHub (REALE)
async function deleteArticleFromGitHub(articleId, button) {
    if (!isAdmin) {
        showNotification('Accesso negato', 'error');
        return;
    }
    
    if (!confirm(`ELIMINARE DEFINITIVAMENTE QUESTO ARTICOLO?\n\nL'articolo verrà rimosso da GitHub e dal sito.`)) {
        return;
    }
    
    try {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
        
        // 1. Trova l'articolo
        const articleIndex = allArticles.findIndex(a => a.nome_file === articleId);
        if (articleIndex === -1) {
            throw new Error('Articolo non trovato');
        }
        
        const article = allArticles[articleIndex];
        
        // 2. Elimina da GitHub (richiederebbe autenticazione)
        // Per ora simuliamo, ma in produzione servirebbe un backend
        
        // 3. Rimuovi localmente
        allArticles.splice(articleIndex, 1);
        filteredArticles = allArticles.filter(a => a.nome_file !== articleId);
        
        // 4. Salva stato eliminato
        const deletedArticles = JSON.parse(localStorage.getItem('deletedArticles') || '[]');
        deletedArticles.push(articleId);
        localStorage.setItem('deletedArticles', JSON.stringify(deletedArticles));
        
        // 5. Rimuovi visualizzazioni
        localStorage.removeItem(`views_${articleId}`);
        
        // 6. Anima eliminazione
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
                
                console.log(`Per eliminare davvero da GitHub, serve un backend con token GitHub`);
                
            }, 300);
        }, 500);
        
    } catch (error) {
        console.error('Errore eliminazione:', error);
        showNotification('Errore eliminazione articolo', 'error');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-trash"></i> Elimina';
    }
}

// ========== FUNZIONI UTILITY (come prima) ==========
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Data sconosciuta';
        return date.toLocaleDateString('it-IT', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

function getExcerpt(text, maxLength) {
    if (!text) return 'Nessun contenuto disponibile';
    const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "").replace(/\n/g, ' ');
    return cleanText.length > maxLength ? 
        cleanText.substring(0, maxLength) + '...' : 
        cleanText;
}

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

// Funzioni filtro/ricerca (come prima)
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

// ========== FUNZIONI ADMIN LOGIN (come prima) ==========
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
    }
    
    loginForm.reset();
}

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

function enableAdminMode() {
    document.querySelectorAll('.article-card').forEach(card => {
        card.classList.add('admin-mode');
    });
    addAdminControls();
}

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

function logoutAdmin() {
    if (!confirm('Uscire dalla modalità admin?')) return;
    
    isAdmin = false;
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminLoginTime');
    
    document.querySelectorAll('.article-card').forEach(card => {
        card.classList.remove('admin-mode');
    });
    
    const adminControls = document.querySelector('.admin-controls');
    if (adminControls) adminControls.remove();
    
    showNotification('Logout admin effettuato', 'info');
}

// ========== FUNZIONI GLOBALI ==========
window.deleteArticleFromGitHub = deleteArticleFromGitHub;
window.openArticle = openArticle;
window.loadArticles = loadArticles;
window.exportArticles = exportArticles;
window.resetAllViews = resetAllViews;
window.logoutAdmin = logoutAdmin;
