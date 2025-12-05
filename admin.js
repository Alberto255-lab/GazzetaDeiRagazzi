// Funzioni admin per eliminazione articoli

// Elimina articolo
async function deleteArticle(articleId, button) {
    if (!isAdmin) {
        showNotification('Accesso negato', 'error');
        return;
    }
    
    // Conferma eliminazione
    if (!confirm('Sei sicuro di voler eliminare questo articolo? L\'operazione non è reversibile.')) {
        return;
    }
    
    try {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
        
        // Simula chiamata API (nel vero sito, chiameresti un endpoint server)
        await simulateDeleteRequest(articleId);
        
        // Rimuovi dalla lista
        const index = allArticles.findIndex(a => a.nome_file === articleId);
        if (index !== -1) {
            allArticles.splice(index, 1);
            filteredArticles = allArticles.filter(a => a.nome_file !== articleId);
        }
        
        // Rimuovi card
        const card = button.closest('.article-card');
        card.style.opacity = '0.5';
        card.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            card.remove();
            showNotification('Articolo eliminato', 'success');
            updateStats();
            
            // Se non ci sono più articoli nella pagina corrente, torna indietro
            if (document.querySelectorAll('.article-card').length === 0 && currentPage > 1) {
                currentPage--;
                displayArticles();
            } else {
                displayArticles(); // Ricarica per aggiornare numeri
            }
        }, 500);
        
    } catch (error) {
        console.error('Errore eliminazione:', error);
        showNotification('Errore eliminazione articolo', 'error');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-trash"></i> Elimina';
    }
}

// Simula richiesta eliminazione
function simulateDeleteRequest(articleId) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`Articolo ${articleId} eliminato`);
            resolve();
        }, 1000);
    });
}

// Aggiorna statistiche dopo eliminazione
function updateStats() {
    const totalArticles = allArticles.length;
    const totalViews = allArticles.reduce((sum, article) => sum + parseInt(article.views || 0), 0);
    const totalImages = allArticles.reduce((sum, article) => sum + (article.immagini || 0), 0);
    
    totalArticlesEl.textContent = totalArticles;
    totalViewsEl.textContent = totalViews;
    totalImagesEl.textContent = totalImages;
    footerStatsEl.textContent = `${totalArticles} articoli • ${totalViews} visualizzazioni`;
}

// Esporta dati (opzionale)
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
    
    showNotification('Articoli esportati', 'success');
}

// Pulisci tutte le visualizzazioni
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
}

// Aggiungi pulsanti admin extra (opzionale)
function addAdminControls() {
    if (!isAdmin) return;
    
    const filters = document.querySelector('.filters .container');
    const adminControls = document.createElement('div');
    adminControls.className = 'admin-controls';
    adminControls.innerHTML = `
        <button class="admin-btn" onclick="exportArticles()" title="Esporta tutti gli articoli">
            <i class="fas fa-download"></i> Esporta
        </button>
        <button class="admin-btn" onclick="resetViews()" title="Resetta visualizzazioni">
            <i class="fas fa-sync"></i> Resetta Views
        </button>
        <button class="admin-btn logout-btn" onclick="logoutAdmin()" title="Esci dalla modalità admin">
            <i class="fas fa-sign-out-alt"></i> Logout
        </button>
    `;
    
    filters.appendChild(adminControls);
    
    // Stili per controlli admin
    const style = document.createElement('style');
    style.textContent = `
        .admin-controls {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border-color);
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

// Controlla e aggiungi controlli admin al caricamento
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (isAdmin) {
            addAdminControls();
        }
    }, 1000);
});
