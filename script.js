// Configurazione
const ARTICLES_PER_PAGE = 9;
let currentPage = 1;
let allArticles = [];
let filteredArticles = [];
let isAdmin = false;
const ADMIN_USERNAME = 'EspoAlberto';
const ADMIN_PASSWORD = 'admin123'; // Cambia questa password!

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

// Carica articoli dal server
async function loadArticles() {
    try {
        const response = await fetch('articoli/');
        const files = await response.json();
        
        allArticles = [];
        let totalViews = 0;
        let totalImages = 0;
        
        // Carica ogni articolo
        for (const file of files) {
            if (file.endsWith('.json')) {
                const articleResponse = await fetch(`articoli/${file}`);
                const article = await articleResponse.json();
                
                // Aggiungi conteggio visualizzazioni
                article.views = localStorage.getItem(`views_${article.nome_file}`) || 0;
                totalViews += parseInt(article.views);
                totalImages += article.immagini || 0;
                
                // Formatta data
                article.data_formattata = formatDate(article.data);
                article.excerpt = getExcerpt(article.contenuto, 150);
                
                allArticles.push(article);
            }
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
        articlesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Errore caricamento articoli</h3>
                <p>Impossibile caricare gli articoli. Controlla la connessione.</p>
            </div>
        `;
    }
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
                    `<img src="${imageUrl}" alt="${article.titolo}" loading="lazy">
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
            article.contenuto.toLowerCase().includes(searchTerm) ||
            article.autore.toLowerCase().includes(searchTerm)
        );
    }
    
    displayArticles();
}

// Apri articolo singolo
function openArticle(articleId) {
    // Incrementa visualizzazioni
    const currentViews = parseInt(localStorage.getItem(`views_${articleId}`) || 0);
    localStorage.setItem(`views_${articleId}`, currentViews + 1);
    
    // Salva articolo per la pagina successiva
    sessionStorage.setItem('currentArticle', articleId);
    window.location.href = 'articolo.html';
}

// Formatta data
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Estrai estratto
function getExcerpt(text, maxLength) {
    if (!text) return '';
    const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "");
    return cleanText.length > maxLength ? 
        cleanText.substring(0, maxLength) + '...' : 
        cleanText;
}

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
        
        // Ricarica articoli in modalità admin
        document.querySelectorAll('.article-card').forEach(card => {
            card.classList.add('admin-mode');
        });
        
        // Mostra bottoni delete
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.style.display = 'block';
        });
        
    } else {
        showNotification('Credenziali non valide', 'error');
    }
    
    loginForm.reset();
}

// Controlla sessione admin
function checkAdminSession() {
    if (localStorage.getItem('isAdmin') === 'true') {
        isAdmin = true;
        document.querySelectorAll('.article-card').forEach(card => {
            card.classList.add('admin-mode');
        });
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

// Logout admin (da usare in admin.js)
function logoutAdmin() {
    isAdmin = false;
    localStorage.removeItem('isAdmin');
    showNotification('Logout effettuato', 'info');
    
    document.querySelectorAll('.article-card').forEach(card => {
        card.classList.remove('admin-mode');
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.style.display = 'none';
    });
}
