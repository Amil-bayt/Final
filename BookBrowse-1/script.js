// Global variables
let allBooks = [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let currentSection = 'books';

// DOM elements
const booksGrid = document.getElementById('booksGrid');
const favoritesGrid = document.getElementById('favoritesGrid');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const sortSelect = document.getElementById('sortSelect');
const themeToggle = document.getElementById('themeToggle');
const navButtons = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');
const emptyFavorites = document.getElementById('emptyFavorites');
const offlineIndicator = document.getElementById('offlineIndicator');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    setupEventListeners();
    setupOfflineDetection();
    loadBooks();
    updateFavoritesDisplay();
});

// Theme management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Event listeners
function setupEventListeners() {
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Navigation
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });
    
    // Search and sort
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    categorySelect.addEventListener('change', handleCategoryChange);
    sortSelect.addEventListener('change', handleSort);
}

// Section switching
function switchSection(sectionName) {
    currentSection = sectionName;
    
    // Update nav buttons
    navButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionName);
    });
    
    // Update sections
    sections.forEach(section => {
        section.classList.toggle('active', section.id === sectionName + 'Section');
    });
    
    if (sectionName === 'favorites') {
        updateFavoritesDisplay();
    }
}

// Offline Detection
function setupOfflineDetection() {
    function updateOnlineStatus() {
        if (!navigator.onLine) {
            offlineIndicator.style.display = 'flex';
        } else {
            offlineIndicator.style.display = 'none';
        }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(); // Check initial status
}

// API functions
async function loadBooks(query = 'programming', category = '') {
    try {
        showLoading(true);
        hideError();
        
        // Build search query with category
        let searchQuery = query;
        if (category) {
            searchQuery = `${query} subject:${category}`;
        }
        
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=20&printType=books`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            throw new Error('No books found. Try a different search term.');
        }
        
        allBooks = data.items.map(item => ({
            id: item.id,
            title: item.volumeInfo.title || 'No Title',
            authors: item.volumeInfo.authors || ['Unknown Author'],
            description: item.volumeInfo.description || 'No description available.',
            imageUrl: item.volumeInfo.imageLinks?.thumbnail || null,
            downloadUrl: item.accessInfo?.pdf?.downloadLink || null,
            webReaderLink: item.accessInfo?.webReaderLink || null,
            previewLink: item.volumeInfo.previewLink || null,
            categories: item.volumeInfo.categories || []
        }));
        
        displayBooks(allBooks);
        showLoading(false);
        
    } catch (err) {
        console.error('Error loading books:', err);
        if (!navigator.onLine) {
            showError('You are offline. Please check your internet connection.');
        } else {
            showError(`Failed to load books: ${err.message}`);
        }
        showLoading(false);
    }
}

// Display functions
function displayBooks(books) {
    if (!books || books.length === 0) {
        booksGrid.innerHTML = '<div class="empty-state">No books to display.</div>';
        return;
    }
    
    booksGrid.innerHTML = books.map(book => createBookCard(book)).join('');
}

function createBookCard(book) {
    const isFavorited = favorites.some(fav => fav.id === book.id);
    const downloadButton = book.downloadUrl ? 
        `<a href="${book.downloadUrl}" class="btn btn-primary" target="_blank" rel="noopener">📄 Download PDF</a>` :
        (book.previewLink ? 
            `<a href="${book.previewLink}" class="btn btn-secondary" target="_blank" rel="noopener">👁️ Preview</a>` :
            `<button class="btn btn-secondary" disabled>No PDF Available</button>`);
    
    return `
        <div class="book-card">
            <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" 
                    onclick="toggleFavorite('${book.id}')" 
                    title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                ${isFavorited ? '❤️' : '🤍'}
            </button>
            
            ${book.imageUrl ? 
                `<img src="${book.imageUrl}" alt="${book.title}" class="book-image" 
                     onerror="this.style.display='none'">` : 
                `<div class="book-image" style="display: flex; align-items: center; justify-content: center; background-color: hsl(var(--border)); color: hsl(var(--text-secondary));">📚</div>`
            }
            
            <h3 class="book-title">${escapeHtml(book.title)}</h3>
            <p class="book-author">by ${book.authors.join(', ')}</p>
            <p class="book-description">${escapeHtml(book.description.substring(0, 150))}...</p>
            
            <div class="book-actions">
                ${downloadButton}
            </div>
        </div>
    `;
}

// Favorites management
function toggleFavorite(bookId) {
    const book = allBooks.find(b => b.id === bookId) || 
                 favorites.find(f => f.id === bookId);
    
    if (!book) return;
    
    const existingIndex = favorites.findIndex(fav => fav.id === bookId);
    
    if (existingIndex > -1) {
        favorites.splice(existingIndex, 1);
    } else {
        favorites.push(book);
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // Update UI
    if (currentSection === 'books') {
        displayBooks(allBooks);
    } else {
        updateFavoritesDisplay();
    }
}

function updateFavoritesDisplay() {
    if (favorites.length === 0) {
        favoritesGrid.innerHTML = '';
        emptyFavorites.style.display = 'block';
    } else {
        emptyFavorites.style.display = 'none';
        favoritesGrid.innerHTML = favorites.map(book => createFavoriteCard(book)).join('');
    }
}

function createFavoriteCard(book) {
    const downloadButton = book.downloadUrl ? 
        `<a href="${book.downloadUrl}" class="btn btn-primary" target="_blank" rel="noopener">📄 Download PDF</a>` :
        (book.previewLink ? 
            `<a href="${book.previewLink}" class="btn btn-secondary" target="_blank" rel="noopener">👁️ Preview</a>` :
            `<button class="btn btn-secondary" disabled>No PDF Available</button>`);
    
    return `
        <div class="book-card">
            <button class="favorite-btn favorited" 
                    onclick="toggleFavorite('${book.id}')" 
                    title="Remove from favorites">
                ❤️
            </button>
            
            ${book.imageUrl ? 
                `<img src="${book.imageUrl}" alt="${book.title}" class="book-image" 
                     onerror="this.style.display='none'">` : 
                `<div class="book-image" style="display: flex; align-items: center; justify-content: center; background-color: hsl(var(--border)); color: hsl(var(--text-secondary));">📚</div>`
            }
            
            <h3 class="book-title">${escapeHtml(book.title)}</h3>
            <p class="book-author">by ${book.authors.join(', ')}</p>
            <p class="book-description">${escapeHtml(book.description.substring(0, 150))}...</p>
            
            <div class="book-actions">
                ${downloadButton}
                <button class="btn btn-danger" onclick="toggleFavorite('${book.id}')">🗑️ Remove</button>
            </div>
        </div>
    `;
}

// Search and sort functions
function handleSearch() {
    const query = searchInput.value.trim();
    const category = categorySelect.value;
    
    if (query.length === 0) {
        loadBooks('programming', category); // Load default books with category
    } else if (query.length >= 2) {
        loadBooks(query, category);
    }
}

function handleCategoryChange() {
    const query = searchInput.value.trim() || 'programming';
    const category = categorySelect.value;
    loadBooks(query, category);
}

function handleSort() {
    const sortBy = sortSelect.value;
    let sortedBooks = [...allBooks];
    
    switch (sortBy) {
        case 'title':
            sortedBooks.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'author':
            sortedBooks.sort((a, b) => a.authors[0].localeCompare(b.authors[0]));
            break;
        case 'relevance':
        default:
            // Keep original order
            break;
    }
    
    if (currentSection === 'books') {
        displayBooks(sortedBooks);
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
}

function hideError() {
    error.style.display = 'none';
}

function showError(message) {
    error.textContent = message;
    error.style.display = 'block';
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
