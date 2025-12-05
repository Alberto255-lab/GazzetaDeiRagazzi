// Configurazione
const ARTICLES_PER_PAGE = 9;
let currentPage = 1;
let allArticles = [];
let filteredArticles = [];
let isAdmin = false;
const ADMIN_USERNAME = 'EspoAlberto';
const ADMIN_PASSWORD = 'GazzettaRagazzi2024!'; // PASSWORD DIFFICILE

// Elementi DOM
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
    updatePageTitle();
});

// Aggiorna titolo pagina
function updatePageTitle() {
    document.title = 'La Gazzetta dei Ragazzi - Articoli';
}

// Setup event listeners
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

    // Admin login
    adminLoginBtn.addEventListener('click', () => loginModal.style.display = 'flex');
    footerAdminBtn.addEventListener('click', () => loginModal.style.display = 'flex');
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

// ========== FUNZIONI PRINCIPALI ==========

// Carica articoli
async function loadArticles() {
    try {
        console.log('🔄 Caricamento articoli...');
        
        // Prima prova a caricare da index.json
        let articlesList = [];
        
        try {
            const indexResponse = await fetch('articoli/index.json');
            if (indexResponse.ok) {
                articlesList = await indexResponse.json();
                console.log(`✅ Trovati ${articlesList.length} articoli in index.json`);
            } else {
                // Se index.json non esiste, cerca tutti i file .json
                articlesList = await scanArticlesDirectory();
            }
        } catch (e) {
            console.log('index.json non trovato, scansiono cartella...');
            articlesList = await scanArticlesDirectory();
        }
        
        // Ora carica ogni articolo
        allArticles = [];
        let totalViews = 0;
        let totalImages = 0;
        
        for (const articleFile of articlesList) {
            if (articleFile.endsWith('.json') && articleFile !== 'index.json') {
                try {
                    const articleResponse = await fetch(`articoli/${articleFile}`);
                    if (!articleResponse.ok) {
                        console.warn(`⚠️ File non trovato: ${articleFile}`);
                        continue;
                    }
                    
                    const article = await articleResponse.json();
                    
                    // Assicurati che nome_file sia presente
                    if (!article.nome_file) {
                        article.nome_file = articleFile.replace('.json', '');
                    }
                    
                    // Carica visualizzazioni da localStorage
                    const viewsKey = `views_${article.nome_file}`;
                    article.views = parseInt(localStorage.getItem(viewsKey) || '0');
                    totalViews += article.views;
                    totalImages += article.immagini || 0;
                    
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
        
        // Se nessun articolo, mostra stato vuoto
        if (allArticles.length === 0) {
            showEmptyState(true);
            return;
        }
        
        // Ordina per data (più recenti prima)
        allArticles.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        filteredArticles = [...allArticles];
        
        // Aggiorna statistiche
        updateStatistics();
        displayArticles();
        
        console.log(`✅ Caricati ${allArticles.length} articoli`);
        
    } catch (error) {
        console.error('❌ Errore caricamento articoli:', error);
        showEmptyState(false);
    }
}

// Scansiona cartella articoli
async function scanArticlesDirectory() {
    try {
        // Prova a ottenere lista file (funziona su GitHub Pages)
        const response = await fetch('articoli/');
        if (response.ok) {
            const html = await response.text();
            // Estrai nomi file da HTML (GitHub Pages mostra directory)
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const links = doc.querySelectorAll('a');
            const files = Array.from(links)
                .map(a => a.getAttribute('href'))
                .filter(href => href && href.endsWith('.json') && href !== 'index.json');
            return files;
        }
    } catch (e) {
        console.log('Impossibile scansionare cartella');
    }
    
    // Fallback: cerca file specifici
    return await trySpecificFiles();
}

// Prova file specifici
async function trySpecificFiles() {
    const testFiles = [
        '20240115_1430_esempio.json',
        '20240116_0930_test.json'
    ];
    
    const foundFiles = [];
    
    for (const file of testFiles) {
        try {
            const response = await fetch(`articoli/${file}`);
            if (response.ok) {
                foundFiles.push(file);
            }
        } catch (e) {
            // Continua
        }
    }
    
    return foundFiles;
}

// Stato vuoto
function showEmptyState(isFirstTime) {
    const message = isFirstTime ? 
        `<h3>Benvenuto su La Gazzetta dei Ragazzi!</h3>
         <p>Pubblica il tuo primo articolo usando il bot Telegram.</p>
         <p><strong>Passaggi:</strong></p>
         <ol style="text-align: left; max-width: 500px; margin: 20px auto;">
             <li>Avvia il bot Telegram sul tuo PC</li>
             <li>Scrivi <code>/articolo</code></li>
             <li>Segui le istruzioni</li>
             <li>Copia i file dalla cartella <code>articoli/</code> del bot</li>
             <li>Incollali nella cartella <code>articoli/</code> del sito</li>
         </ol>` :
        `<h3>Errore caricamento articoli</h3>
         <p>Controlla che i file siano nella cartella articoli/</p>`;
    
    articlesGrid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-newspaper"></i>
            ${message}
            <button onclick="location.reload()" class="reload-btn">
                <i class="fas fa-sync"></i> Ricarica
            </button>
        </div>
    `;
    
    // Nascondi paginazione
    pagination.style.display = 'none';
    
    // Aggiorna statistiche a 0
    updateStatistics();
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
    
    // Aggiorna paginazione
    const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    pageInfo.textContent = `Pagina ${currentPage} di ${totalPages}`;
    
    // Aggiungi event listener per le card
    document.querySelectorAll('.article-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-btn') && !e.target.closest('.admin-badge')) {
                const articleId = card.dataset.id;
                openArticle(articleId);
            }
        });
    });
}

// Crea HTML per una card articolo
function createArticleCard(article) {
    const hasImages = article.immagini && article.immagini > 0;
    const imageUrl = hasImages && article.immagini_files && article.immagini_files.length > 0 ? 
        `immagini/${article.immagini_files[0]}` : '';
    const adminClass = isAdmin ? 'admin-mode' : '';
    
    // Gestisci immagini mancanti
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
                        `<button class="delete-btn" onclick="event.stopPropagation(); deleteArticle('${article.nome_file}', this)">
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

// Apri articolo singolo
async function openArticle(articleId) {
    console.log(`Apro articolo: ${articleId}`);
    
    // Incrementa visualizzazioni
    const viewsKey = `views_${articleId}`;
    const currentViews = parseInt(localStorage.getItem(viewsKey) || '0');
    localStorage.setItem(viewsKey, currentViews + 1);
    
    // Aggiorna visualizzazioni nell'array
    const articleIndex = allArticles.findIndex(a => a.nome_file === articleId);
    if (articleIndex !== -1) {
        allArticles[articleIndex].views = currentViews + 1;
        updateStatistics();
    }
    
    // Salva articolo e vai alla pagina
    sessionStorage.setItem('currentArticle', articleId);
    window.location.href = 'articolo.html';
}

// ========== FUNZIONI UTILITY ==========

// Formatta data
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Data sconosciuta';
        }
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

// ========== FUNZIONI ADMIN ==========

// Gestione login admin
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
        
        // Attiva modalità admin
        enableAdminMode();
        
    } else {
        showNotification('Credenziali non valide', 'error');
    }
    
    loginForm.reset();
}

// Attiva modalità admin
function enableAdminMode() {
    // Aggiungi classe admin-mode a tutte le card
    document.querySelectorAll('.article-card').forEach(card => {
        card.classList.add('admin-mode');
    });
    
    // Aggiungi controlli admin
    addAdminControls();
}

// Controlla sessione admin
function checkAdminSession() {
    const isAdminSaved = localStorage.getItem('isAdmin');
    const loginTime = localStorage.getItem('adminLoginTime');
    
    if (isAdminSaved === 'true' && loginTime) {
        // Check se la sessione è scaduta (8 ore)
        const eightHours = 8 * 60 * 60 * 1000;
        if (Date.now() - parseInt(loginTime) < eightHours) {
            isAdmin = true;
            enableAdminMode();
        } else {
            // Sessione scaduta
            localStorage.removeItem('isAdmin');
            localStorage.removeItem('adminLoginTime');
        }
    }
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

// Elimina articolo (CON ELIMINAZIONE REALE)
async function deleteArticle(articleId, button) {
    if (!isAdmin) {
        showNotification('Accesso negato', 'error');
        return;
    }
    
    if (!confirm(`Sei sicuro di voler eliminare questo articolo?\n\nL'articolo verrà rimosso dal sito.`)) {
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
        
        // 2. Rimuovi da array locale
        allArticles.splice(articleIndex, 1);
        filteredArticles = allArticles.filter(a => a.nome_file !== articleId);
        
        // 3. Salva stato eliminato in localStorage
        const deletedArticles = JSON.parse(localStorage.getItem('deletedArticles') || '[]');
        deletedArticles.push(articleId);
        localStorage.setItem('deletedArticles', JSON.stringify(deletedArticles));
        
        // 4. Rimuovi visualizzazioni
        localStorage.removeItem(`views_${articleId}`);
        
        // 5. Anima eliminazione
        const card = button.closest('.article-card');
        card.style.opacity = '0.5';
        card.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                // Aggiorna display
                displayArticles();
                updateStatistics();
                showNotification('Articolo eliminato', 'success');
                
                // In un sistema reale, qui chiameresti un'API per eliminare dal server
                console.log(`Articolo ${articleId} eliminato`);
                
                // Aggiorna index.json (se esiste)
                updateIndexJsonAfterDelete(articleId);
                
            }, 300);
        }, 500);
        
    } catch (error) {
        console.error('Errore eliminazione:', error);
        showNotification('Errore eliminazione articolo', 'error');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-trash"></i> Elimina';
    }
}

// Aggiorna index.json dopo eliminazione
async function updateIndexJsonAfterDelete(articleId) {
    try {
        const indexResponse = await fetch('articoli/index.json');
        if (!indexResponse.ok) return;
        
        const filesList = await indexResponse.json();
        const updatedList = filesList.filter(file => !file.includes(articleId));
        
        // Qui in un sistema reale, aggiorneresti il file sul server
        console.log(`Da rimuovere da index.json: ${articleId}.json`);
        
    } catch (e) {
        // Ignora se index.json non esiste
    }
}

// Aggiungi controlli admin
function addAdminControls() {
    if (!isAdmin) return;
    
    const filters = document.querySelector('.filters .container');
    if (!filters) return;
    
    // Rimuovi controlli esistenti
    const existingControls = document.querySelector('.admin-controls');
    if (existingControls) existingControls.remove();
    
    // Crea nuovi controlli
    const adminControls = document.createElement('div');
    adminControls.className = 'admin-controls';
    adminControls.innerHTML = `
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
            <button class="admin-btn" onclick="exportArticles()" title="Esporta articoli come JSON">
                <i class="fas fa-download"></i> Esporta
            </button>
            <button class="admin-btn" onclick="resetAllViews()" title="Resetta tutte le visualizzazioni">
                <i class="fas fa-sync"></i> Reset Views
            </button>
            <button class="admin-btn logout-btn" onclick="logoutAdmin()" title="Esci dalla modalità admin">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        </div>
    `;
    
    filters.appendChild(adminControls);
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
    const fileName = `gazzetta_ragazzi_${new Date().toISOString().split('T')[0]}.json`;
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', fileName);
    link.click();
    
    showNotification('Articoli esportati come JSON', 'success');
}

// Resetta tutte le visualizzazioni
function resetAllViews() {
    if (!isAdmin) {
        showNotification('Accesso negato', 'error');
        return;
    }
    
    if (!confirm('Resettare TUTTE le visualizzazioni? Questa azione non può essere annullata.')) {
        return;
    }
    
    // Rimuovi tutte le visualizzazioni
    allArticles.forEach(article => {
        localStorage.removeItem(`views_${article.nome_file}`);
        article.views = 0;
    });
    
    // Rimuovi tutte le chiavi views_
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('views_')) {
            localStorage.removeItem(key);
        }
    });
    
    updateStatistics();
    displayArticles();
    showNotification('Tutte le visualizzazioni sono state resettate', 'success');
}

// Logout admin
function logoutAdmin() {
    if (!confirm('Uscire dalla modalità admin?')) {
        return;
    }
    
    isAdmin = false;
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminLoginTime');
    
    // Rimuovi classe admin-mode
    document.querySelectorAll('.article-card').forEach(card => {
        card.classList.remove('admin-mode');
    });
    
    // Rimuovi controlli admin
    const adminControls = document.querySelector('.admin-controls');
    if (adminControls) adminControls.remove();
    
    showNotification('Logout admin effettuato', 'info');
}

// ========== FUNZIONI GLOBALI ==========
window.deleteArticle = deleteArticle;
window.openArticle = openArticle;
window.loadArticles = loadArticles;
window.exportArticles = exportArticles;
window.resetAllViews = resetAllViews;
window.logoutAdmin = logoutAdmin;
