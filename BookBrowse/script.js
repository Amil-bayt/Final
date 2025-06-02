let allBooks = [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let readingList = JSON.parse(localStorage.getItem('readingList')) || [];
let currentSection = 'books';

// DOM
const booksGrid = document.getElementById('booksGrid');
const favoritesGrid = document.getElementById('favoritesGrid');
const readingListGrid = document.getElementById('readingListGrid');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const sortSelect = document.getElementById('sortSelect');
const themeToggle = document.getElementById('themeToggle');
const navButtons = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');
const emptyFavorites = document.getElementById('emptyFavorites');
const emptyReadingList = document.getElementById('emptyReadingList');
const offlineIndicator = document.getElementById('offlineIndicator');
const shortcutsHelp = document.getElementById('shortcutsHelp');

document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    setupEventListeners();
    setupOfflineDetection();
    setupKeyboardShortcuts();
    loadBooks();
    updateFavoritesDisplay();
    updateReadingListDisplay();
});

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

function setupEventListeners() {
    themeToggle.addEventListener('click', toggleTheme);
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });
    
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    categorySelect.addEventListener('change', handleCategoryChange);
    sortSelect.addEventListener('change', handleSort);
}

function switchSection(sectionName) {
    currentSection = sectionName;
    
    navButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionName);
    });
    
    sections.forEach(section => {
        section.classList.toggle('active', section.id === sectionName + 'Section');
    });
    
    if (sectionName === 'favorites') {
        updateFavoritesDisplay();
    } else if (sectionName === 'readinglist') {
        updateReadingListDisplay();
    }
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            return;
        }

        switch (e.key) {
            case '1':
                e.preventDefault();
                switchSection('books');
                break;
            case '2':
                e.preventDefault();
                switchSection('favorites');
                break;
            case '3':
                e.preventDefault();
                switchSection('readinglist');
                break;
            case '/':
                e.preventDefault();
                searchInput.focus();
                break;
            case 't':
            case 'T':
                e.preventDefault();
                toggleTheme();
                break;
            case '?':
                e.preventDefault();
                toggleShortcutsHelp();
                break;
            case 'Escape':
                if (shortcutsHelp.style.display === 'flex') {
                    toggleShortcutsHelp();
                }
                break;
        }
    });
}

function toggleShortcutsHelp() {
    if (shortcutsHelp.style.display === 'flex') {
        shortcutsHelp.style.display = 'none';
    } else {
        shortcutsHelp.style.display = 'flex';
    }
}

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
    updateOnlineStatus();
}

async function loadBooks(query = 'programming', category = '') {
    try {
        showLoading(true);
        hideError();
        
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

function displayBooks(books) {
    if (!books || books.length === 0) {
        booksGrid.innerHTML = '<div class="empty-state">No books to display.</div>';
        return;
    }
    
    booksGrid.innerHTML = books.map(book => createBookCard(book)).join('');
}

function createBookCard(book) {
    const isFavorited = favorites.some(fav => fav.id === book.id);
    const isInReadingList = readingList.some(item => item.id === book.id);
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
                <button class="btn ${isInReadingList ? 'btn-danger' : 'btn-secondary'}" 
                        onclick="toggleReadingList('${book.id}')">
                    ${isInReadingList ? '📖 Remove from List' : '📚 Add to Reading List'}
                </button>
            </div>
        </div>
    `;
}

function toggleFavorite(bookId) {
    const book = allBooks.find(b => b.id === bookId) || 
                 favorites.find(f => f.id === bookId) ||
                 readingList.find(r => r.id === bookId);
    
    if (!book) return;
    
    const existingIndex = favorites.findIndex(fav => fav.id === bookId);
    
    if (existingIndex > -1) {
        favorites.splice(existingIndex, 1);
    } else {
        favorites.push(book);
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    if (currentSection === 'books') {
        displayBooks(allBooks);
    } else if (currentSection === 'favorites') {
        updateFavoritesDisplay();
    } else if (currentSection === 'readinglist') {
        updateReadingListDisplay();
    }
}

function toggleReadingList(bookId) {
    const book = allBooks.find(b => b.id === bookId) || 
                 favorites.find(f => f.id === bookId) ||
                 readingList.find(r => r.id === bookId);
    
    if (!book) return;
    
    const existingIndex = readingList.findIndex(item => item.id === bookId);
    
    if (existingIndex > -1) {
        readingList.splice(existingIndex, 1);
    } else {
        readingList.push(book);
    }
    
    localStorage.setItem('readingList', JSON.stringify(readingList));
    
    if (currentSection === 'books') {
        displayBooks(allBooks);
    } else if (currentSection === 'favorites') {
        updateFavoritesDisplay();
    } else if (currentSection === 'readinglist') {
        updateReadingListDisplay();
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

function updateReadingListDisplay() {
    if (readingList.length === 0) {
        readingListGrid.innerHTML = '';
        emptyReadingList.style.display = 'block';
    } else {
        emptyReadingList.style.display = 'none';
        readingListGrid.innerHTML = readingList.map(book => createReadingListCard(book)).join('');
    }
}

function createFavoriteCard(book) {
    const isInReadingList = readingList.some(item => item.id === book.id);
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
                <button class="btn ${isInReadingList ? 'btn-danger' : 'btn-secondary'}" 
                        onclick="toggleReadingList('${book.id}')">
                    ${isInReadingList ? '📖 Remove from List' : '📚 Add to Reading List'}
                </button>
                <button class="btn btn-danger" onclick="toggleFavorite('${book.id}')">🗑️ Remove</button>
            </div>
        </div>
    `;
}

function createReadingListCard(book) {
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
                <button class="btn btn-danger" onclick="toggleReadingList('${book.id}')">📖 Remove from List</button>
            </div>
        </div>
    `;
}

function handleSearch() {
    const query = searchInput.value.trim();
    const category = categorySelect.value;
    
    if (query.length === 0) {
        loadBooks('programming', category);
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
            break;
    }
    
    if (currentSection === 'books') {
        displayBooks(sortedBooks);
    }
}

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
