// Configurazione
const ADMIN_USERNAME = 'EspoAlberto';
const ADMIN_PASSWORD = 'GazzettaDeiRagazzi2024!@#'; // Password sicura

// Elementi DOM login
const loginModal = document.getElementById('login-modal');
const adminLoginBtn = document.getElementById('admin-login-btn');
const footerAdminBtn = document.getElementById('footer-admin-btn');
const closeModal = document.querySelector('.close-modal');
const loginForm = document.getElementById('login-form');

// Setup event listeners per login
function setupLoginListeners() {
    // Apri modale
    adminLoginBtn.addEventListener('click', () => {
        // Reset campi
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        loginModal.style.display = 'flex';
    });
    
    footerAdminBtn.addEventListener('click', () => {
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        loginModal.style.display = 'flex';
    });
    
    // Chiudi modale
    closeModal.addEventListener('click', () => loginModal.style.display = 'none');
    
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });
    
    // Gestione login form
    loginForm.addEventListener('submit', function(e) {
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
            
            // Pulisci campi
            this.reset();
            
        } else {
            showNotification('Credenziali non valide', 'error');
            // Shake animation
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 500);
        }
    });
}

// Aggiungi al tuo script.js esistente
// All'inizio, aggiungi: let isAdmin = false;
// Nell'init, aggiungi: setupLoginListeners();
// Aggiungi funzione enableAdminMode() che già hai
