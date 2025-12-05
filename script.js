// Configurazione
const ARTICLES_PER_PAGE = 9;
let currentPage = 1;
let allArticles = [];
let filteredArticles = [];
let isAdmin = false;
const ADMIN_USERNAME = 'EspoAlberto';
const ADMIN_PASSWORD = 'admin123'; // CAMBIA QUESTA PASSWORD!

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
});

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

// Carica articoli da file locali (SENZA SERVER!)
async function loadArticles() {
    try {
        let articlesData = [];
        
        // PRIMA PROVA: Carica da index.json (se esiste su GitHub Pages)
        try {
            const response = await fetch('articoli/index.json');
            if (response.ok) {
                articlesData = await response.json();
                console.log(`✅ Caricati ${articlesData.length} articoli da index.json`);
            } else {
                throw new Error('index.json non trovato');
            }
        } catch (e1) {
            console.log('index.json non trovato, provo a caricare articoli singoli...');
            
            // SECONDA PROVA: Prova a trovare tutti i file JSON nella cartella articoli/
            try {
                // Lista di file JSON che potrebbero esistere
                const possibleFiles = [
                    '20240115_1430_La_nuova_legge_sul_lavoro.json',
                    '20240115_1500_Titolo_esempio.json',
                    'esempio1.json',
                    'esempio2.json'
                ];
                
                // Prova a caricare ogni file
                const loadedFiles = [];
                for (const file of possibleFiles) {
                    try {
                        const response = await fetch(`articoli/${file}`);
                        if (response.ok) {
                            loadedFiles.push(file);
                            console.log(`✅ Trovato: ${file}`);
                        }
                    } catch (e) {
                        // File non trovato, continua
                    }
                }
                
                articlesData = loadedFiles;
                
                if (loadedFiles.length === 0) {
                    // TERZA PROVA: Crea articoli di esempio per demo
                    console.log('Nessun articolo trovato, creo dati di esempio...');
                    articlesData = await createSampleArticles();
                }
                
            } catch (e2) {
                console.error('Errore ricerca articoli:', e2);
                articlesData = await createSampleArticles();
            }
        }
        
        // Ora carica ogni articolo
        allArticles = [];
        let totalViews = 0;
        let totalImages = 0;
        
        for (const articleFile of articlesData) {
            if (articleFile.endsWith('.json')) {
                try {
                    const articleResponse = await fetch(`articoli/${articleFile}`);
                    if (!articleResponse.ok) continue;
                    
                    const article = await articleResponse.json();
                    
                    // Aggiungi nome_file se non esiste
                    if (!article.nome_file) {
                        article.nome_file = articleFile.replace('.json', '');
                    }
                    
                    // Aggiungi conteggio visualizzazioni
                    article.views = parseInt(localStorage.getItem(`views_${article.nome_file}`) || 0);
                    totalViews += article.views;
                    totalImages += article.immagini || 0;
                    
                    // Formatta data
                    article.data_formattata = formatDate(article.data);
                    article.excerpt = getExcerpt(article.contenuto, 150);
                    
                    allArticles.push(article);
                    
                } catch (e) {
                    console.warn(`Errore caricamento ${articleFile}:`, e);
                }
            }
        }
        
        // Se ancora nessun articolo, crea campioni
        if (allArticles.length === 0) {
            console.log('Creo articoli di esempio...');
            allArticles = getSampleArticles();
            totalViews = allArticles.reduce((sum, article) => sum + (article.views || 0), 0);
            totalImages = allArticles.reduce((sum, article) => sum + (article.immagini || 0), 0);
        }
        
        // Ordina per data (più recenti prima)
        allArticles.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        filteredArticles = [...allArticles];
        
        // Aggiorna statistiche
        totalArticlesEl.textContent = allArticles.length;
        totalViewsEl.textContent = totalViews;
        totalImagesEl.textContent = totalImages;
        footerStatsEl.textContent = `${allArticles.length} articoli • ${totalViews} visualizzazioni`;
        
        displayArticles();
        
    } catch (error) {
        console.error('Errore caricamento articoli:', error);
        showNotification('Errore caricamento articoli', 'error');
        showEmptyState();
    }
}

// Crea articoli di esempio per demo
async function createSampleArticles() {
    // Crea alcuni file JSON di esempio
    const sampleFiles = ['esempio1.json', 'esempio2.json', 'esempio3.json'];
    
    // Se stai in sviluppo locale, puoi creare i file fisicamente
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Modalità sviluppo: creo articoli di esempio...');
        
        const sampleArticles = [
            {
                nome_file: 'esempio1',
                titolo: "Benvenuto nella Gazzetta Ufficiale",
                data: "2024-01-15T14:30:00.000Z",
                autore: "EspoAlberto",
                contenuto: "Questo è il primo articolo di esempio. Pubblica i tuoi articoli usando il bot Telegram! Il sito si aggiornerà automaticamente con i nuovi contenuti.",
                parole: 45,
                immagini: 0,
                immagini_files: []
            },
            {
                nome_file: 'esempio2',
                titolo: "Come pubblicare articoli",
                data: "2024-01-14T10:15:00.000Z",
                autore: "EspoAlberto",
                contenuto: "Per pubblicare un articolo:\n1. Usa il bot Telegram\n2. Scrivi /articolo\n3. Segui le istruzioni\n4. I file si creano automaticamente!",
                parole: 38,
                immagini: 1,
                immagini_files: ["esempio.jpg"]
            },
            {
                nome_file: 'esempio3',
                titolo: "Il futuro della pubblicazione digitale",
                data: "2024-01-13T16:45:00.000Z",
                autore: "EspoAlberto",
                contenuto: "La pubblicazione digitale sta rivoluzionando il modo in cui condividiamo informazioni. Con questo sistema, puoi pubblicare articoli in tempo reale direttamente da Telegram.",
                parole: 52,
                immagini: 2,
                immagini_files: ["futuro1.jpg", "futuro2.jpg"]
            }
        ];
        
        // In un sito reale, questi file esisterebbero già
        // Qui li restituiamo come array di nomi file
        return sampleFiles;
    }
    
    return sampleFiles;
}

// Ottieni articoli di esempio (se nessun file reale)
function getSampleArticles() {
    return [
        {
            nome_file: 'esempio1',
            titolo: "Benvenuto nella Gazzetta Ufficiale",
            data: "2024-01-15T14:30:00.000Z",
            data_formattata: "15/01/2024 14:30",
            autore: "EspoAlberto",
            contenuto: "Questo è il primo articolo di esempio. Pubblica i tuoi articoli usando il bot Telegram!",
            excerpt: "Questo è il primo articolo di esempio. Pubblica i tuoi articoli usando il bot Telegram...",
            parole: 25,
            immagini: 0,
            immagini_files: [],
            views: Math.floor(Math.random() * 100)
        },
        {
            nome_file: 'esempio2',
            titolo: "Come pubblicare articoli",
            data: "2024-01-14T10:15:00.000Z",
            data_formattata: "14/01/2024 10:15",
            autore: "EspoAlberto",
            contenuto: "Per pubblicare un articolo:\n1. Usa il bot Telegram\n2. Scrivi /articolo\n3. Segui le istruzioni",
            excerpt: "Per pubblicare un articolo: 1. Usa il bot Telegram 2. Scrivi /articolo 3. Segui le istruzioni...",
            parole: 32,
            immagini: 1,
            immagini_files: ["esempio.jpg"],
            views: Math.floor(Math.random() * 150)
        },
        {
            nome_file: 'esempio3',
            titolo: "Il futuro della pubblicazione digitale",
            data: "2024-01-13T16:45:00.000Z",
            data_formattata: "13/01/2024 16:45",
            autore: "EspoAlberto",
            contenuto: "La pubblicazione digitale sta rivoluzionando il modo in cui condividiamo informazioni.",
            excerpt: "La pubblicazione digitale sta rivoluzionando il modo in cui condividiamo informazioni...",
            parole: 42,
            immagini: 2,
            immagini_files: ["futuro1.jpg", "futuro2.jpg"],
            views: Math.floor(Math.random() * 200)
        }
    ];
}

// Mostra articoli nella griglia
function displayArticles() {
    const start = (currentPage - 1) * ARTICLES_PER_PAGE;
    const end = start + ARTICLES_PER_PAGE;
    const articlesToShow = filteredArticles.slice(start, end);
    
    if (articlesToShow.length === 0) {
        articlesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-newspaper"></i>
                <h3>Nessun articolo trovato</h3>
                <p>Prova a cambiare filtro o ricerca</p>
                <button onclick="loadArticles()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: var(--radius); cursor: pointer;">
                    <i class="fas fa-sync"></i> Ricarica
                </button>
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
            // Se non è un click su bottoni admin, apri articolo
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
    const imageUrl = hasImages ? `immagini/${article.immagini_files[0]}` : '';
    const adminClass = isAdmin ? 'admin-mode' : '';
    
    return `
        <div class="article-card ${adminClass}" data-id="${article.nome_file}">
            <div class="card-image">
                ${hasImages ? 
                    `<img src="${imageUrl}" alt="${article.titolo}" loading="lazy" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbW1hZ2luZSBub24gZGlzcG9uaWJpbGU8L3RleHQ+PC9zdmc+';">
                     <div class="image-count">
                        <i class="fas fa-image"></i>
                        ${article.immagini}
                     </div>` :
                    `<div class="no-image">
                        <i class="fas fa-newspaper"></i>
                     </div>`
                }
            </div>
            
            <div class="card-content">
                <h3>${article.titolo}</h3>
                
                <div class="card-meta">
                    <div class="card-date">
                        <i class="far fa-calendar"></i>
                        ${article.data_formattata}
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
                
                <p class="card-excerpt">${article.excerpt}</p>
                
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

// Stato vuoto
function showEmptyState() {
    articlesGrid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-newspaper"></i>
            <h3>Nessun articolo ancora</h3>
            <p>Pubblica il tuo primo articolo dal bot Telegram!</p>
            <div style="margin-top: 20px; text-align: left; max-width: 500px; margin-left: auto; margin-right: auto;">
                <p><strong>Come preparare il sito:</strong></p>
                <ol style="text-align: left; margin-left: 20px;">
                    <li>Usa il bot Telegram per pubblicare articoli</li>
                    <li>I file si salvano nella cartella <code>articoli/</code> del tuo PC</li>
                    <li>Copia tutti i file nella cartella <code>articoli/</code> del sito</li>
                    <li>Carica tutto su GitHub Pages</li>
                </ol>
                <p style="margin-top: 15px;"><em>Per ora vedi alcuni articoli di esempio.</em></p>
            </div>
            <button onclick="loadArticles()" style="margin-top: 1.5rem; padding: 0.8rem 2rem; background: var(--primary-color); color: white; border: none; border-radius: var(--radius); cursor: pointer; font-weight: 500;">
                <i class="fas fa-eye"></i> Mostra articoli di esempio
            </button>
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
            article.titolo.toLowerCase().includes(searchTerm) ||
            (article.contenuto && article.contenuto.toLowerCase().includes(searchTerm)) ||
            (article.autore && article.autore.toLowerCase().includes(searchTerm))
        );
    }
    
    displayArticles();
}

// ========== FUNZIONI ARTICOLO SINGOLO ==========

// Apri articolo singolo
function openArticle(articleId) {
    // Incrementa visualizzazioni
    const currentViews = parseInt(localStorage.getItem(`views_${articleId}`) || 0);
    localStorage.setItem(`views_${articleId}`, currentViews + 1);
    
    // Salva articolo per la pagina successiva
    sessionStorage.setItem('currentArticle', articleId);
    window.location.href = 'articolo.html';
}

// ========== FUNZIONI UTILITY ==========

// Formatta data
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
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
    if (localStorage.getItem('isAdmin') === 'true') {
        isAdmin = true;
        enableAdminMode();
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

// ========== FUNZIONI ELIMINAZIONE ARTICOLI ==========

// Elimina articolo (modalità client-side per demo)
async function deleteArticle(articleId, button) {
    if (!isAdmin) {
        showNotification('Accesso negato', 'error');
        return;
    }
    
    // Conferma eliminazione
    if (!confirm('Sei sicuro di voler eliminare questo articolo?\n\nATTENZIONE: Questa è una simulazione. In un sito reale, l\'articolo verrebbe eliminato dal server.')) {
        return;
    }
    
    try {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
        
        // Simula ritardo
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Trova e rimuovi l'articolo dall'array
        const articleIndex = allArticles.findIndex(a => a.nome_file === articleId);
        if (articleIndex !== -1) {
            allArticles.splice(articleIndex, 1);
        }
        
        // Aggiorna array filtrato
        filteredArticles = filteredArticles.filter(a => a.nome_file !== articleId);
        
        // Mostra animazione di eliminazione
        const card = button.closest('.article-card');
        card.style.transition = 'all 0.5s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            // Aggiorna display
            displayArticles();
            
            // Aggiorna statistiche
            updateStats();
            
            showNotification('Articolo eliminato (simulazione)', 'success');
            
            // In un sito reale, qui faresti una chiamata API per eliminare dal server
            console.log(`Articolo ${articleId} eliminato (simulazione)`);
            
        }, 500);
        
    } catch (error) {
        console.error('Errore eliminazione:', error);
        showNotification('Errore eliminazione articolo', 'error');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-trash"></i> Elimina';
    }
}

// Aggiorna statistiche
function updateStats() {
    const totalArticles = allArticles.length;
    const totalViews = allArticles.reduce((sum, article) => sum + parseInt(article.views || 0), 0);
    const totalImages = allArticles.reduce((sum, article) => sum + (article.immagini || 0), 0);
    
    if (totalArticlesEl) totalArticlesEl.textContent = totalArticles;
    if (totalViewsEl) totalViewsEl.textContent = totalViews;
    if (totalImagesEl) totalImagesEl.textContent = totalImages;
    if (footerStatsEl) footerStatsEl.textContent = `${totalArticles} articoli • ${totalViews} visualizzazioni`;
}

// ========== CONTROLLI ADMIN AVANZATI ==========

// Aggiungi controlli admin extra
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
        <button class="admin-btn" onclick="exportArticles()" title="Esporta tutti gli articoli">
            <i class="fas fa-download"></i> Esporta
        </button>
        <button class="admin-btn" onclick="resetViews()" title="Resetta tutte le visualizzazioni">
            <i class="fas fa-sync"></i> Resetta Views
        </button>
        <button class="admin-btn logout-btn" onclick="logoutAdmin()" title="Esci dalla modalità admin">
            <i class="fas fa-sign-out-alt"></i> Logout
        </button>
    `;
    
    filters.appendChild(adminControls);
    
    // Aggiungi stili
    if (!document.querySelector('#admin-styles')) {
        const style = document.createElement('style');
        style.id = 'admin-styles';
        style.textContent = `
            .admin-controls {
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin-top: 1.5rem;
                padding-top: 1.5rem;
                border-top: 1px solid var(--border-color);
                flex-wrap: wrap;
            }
            
            .admin-btn {
                padding: 0.6rem 1.2rem;
                background: var(--card-color);
                border: 2px solid var(--border-color);
                border-radius: var(--radius);
                cursor: pointer;
                font-weight: 500;
                color: var(--text-color);
                transition: var(--transition);
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.9rem;
            }
            
            .admin-btn:hover {
                border-color: var(--primary-color);
                color: var(--primary-color);
            }
            
            .logout-btn {
                background: #fef2f2;
                border-color: #fecaca;
                color: #dc2626;
            }
            
            .logout-btn:hover {
                background: #fee2e2;
                border-color: #fca5a5;
            }
        `;
        document.head.appendChild(style);
    }
}

// Esporta articoli come JSON
function exportArticles() {
    if (!isAdmin) {
        showNotification('Accesso negato', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(allArticles, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `articoli_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('Articoli esportati come JSON', 'success');
}

// Resetta tutte le visualizzazioni
function resetViews() {
    if (!isAdmin) {
        showNotification('Accesso negato', 'error');
        return;
    }
    
    if (!confirm('Resettare tutte le visualizzazioni?')) {
        return;
    }
    
    allArticles.forEach(article => {
        localStorage.removeItem(`views_${article.nome_file}`);
        article.views = 0;
    });
    
    updateStats();
    showNotification('Visualizzazioni resettate', 'success');
    
    // Ricarica articoli per aggiornare le card
    displayArticles();
}

// Logout admin
function logoutAdmin() {
    if (!confirm('Uscire dalla modalità admin?')) {
        return;
    }
    
    isAdmin = false;
    localStorage.removeItem('isAdmin');
    
    // Rimuovi classe admin-mode
    document.querySelectorAll('.article-card').forEach(card => {
        card.classList.remove('admin-mode');
    });
    
    // Rimuovi controlli admin
    const adminControls = document.querySelector('.admin-controls');
    if (adminControls) adminControls.remove();
    
    showNotification('Logout admin effettuato', 'info');
}

// ========== FUNZIONI GLOBALI (esposte) ==========
window.deleteArticle = deleteArticle;
window.openArticle = openArticle;
window.loadArticles = loadArticles;
window.exportArticles = exportArticles;
window.resetViews = resetViews;
window.logoutAdmin = logoutAdmin;
