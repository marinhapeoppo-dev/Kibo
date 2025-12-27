// Konfigurasi API
const API_BASE = 'http://localhost:3000/api';
let currentPage = 1;

// DOM Elements
const comicGrid = document.getElementById('comicGrid');
const loading = document.getElementById('loading');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const detailModal = document.getElementById('detailModal');
const readerModal = document.getElementById('readerModal');
const closeModalBtns = document.querySelectorAll('.close-modal, #closeReader');
const modalContent = document.getElementById('modalContent');
const readerImages = document.getElementById('readerImages');
const readerTitle = document.getElementById('readerTitle');
const prevChapterBtn = document.getElementById('prevChapter');
const nextChapterBtn = document.getElementById('nextChapter');
const themeToggle = document.getElementById('themeToggle');

// State
let currentDetailUrl = '';
let currentReadingData = null;

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
    loadLatestComics();
    setupEventListeners();
    setupTheme();
});

// Event Listeners
function setupEventListeners() {
    // Pagination
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadLatestComics();
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        currentPage++;
        loadLatestComics();
    });
    
    // Search
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // Modal
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            detailModal.classList.remove('active');
            readerModal.classList.remove('active');
        });
    });
    
    // Click outside modal
    window.addEventListener('click', (e) => {
        if (e.target === detailModal) detailModal.classList.remove('active');
        if (e.target === readerModal) readerModal.classList.remove('active');
    });
    
    // Chapter navigation
    prevChapterBtn.addEventListener('click', loadPrevChapter);
    nextChapterBtn.addEventListener('click', loadNextChapter);
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
}

// Theme
function setupTheme() {
    const savedTheme = localStorage.getItem('kibo-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('kibo-theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

// Load Latest Comics
async function loadLatestComics() {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/latest/${currentPage}`);
        const comics = await response.json();
        
        renderComics(comics);
        updatePagination();
    } catch (error) {
        console.error('Error loading comics:', error);
        comicGrid.innerHTML = '<p class="error">Gagal memuat komik. Silakan coba lagi.</p>';
    } finally {
        showLoading(false);
    }
}

function renderComics(comics) {
    if (!comics || comics.length === 0) {
        comicGrid.innerHTML = '<p class="error">Tidak ada komik ditemukan.</p>';
        return;
    }
    
    comicGrid.innerHTML = comics.map(comic => `
        <div class="comic-card" data-url="${comic.detailUrl}">
            <img src="${comic.thumbnailUrl}" alt="${comic.title}" class="comic-image" onerror="this.src='https://via.placeholder.com/280x350/1a1a1a/ffffff?text=No+Image'">
            <div class="comic-info">
                <h3 class="comic-title">${comic.title}</h3>
                <div class="comic-meta">
                    <span class="comic-type">${comic.type || 'Manga'}</span>
                    <span class="comic-chapter">${comic.latestChapter || 'Ch. ?'}</span>
                </div>
                <p class="comic-description">${comic.shortDescription || comic.concept || 'Tidak ada deskripsi'}</p>
            </div>
        </div>
    `).join('');
    
    // Add click event to comic cards
    document.querySelectorAll('.comic-card').forEach(card => {
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-url');
            loadComicDetail(url);
        });
    });
}

// Load Comic Detail
async function loadComicDetail(url) {
    showLoading(true);
    currentDetailUrl = url;
    
    try {
        const response = await fetch(`${API_BASE}/detail?url=${encodeURIComponent(url)}`);
        const detail = await response.json();
        
        renderDetailModal(detail);
        detailModal.classList.add('active');
    } catch (error) {
        console.error('Error loading detail:', error);
        alert('Gagal memuat detail komik');
    } finally {
        showLoading(false);
    }
}

function renderDetailModal(detail) {
    modalContent.innerHTML = `
        <div class="detail-header">
            <img src="${detail.headerImageUrl || detail.thumbnailUrl}" alt="${detail.title}" class="detail-bg" onerror="this.style.display='none'">
            <div class="detail-overlay">
                <img src="${detail.thumbnailUrl}" alt="${detail.title}" class="detail-poster" onerror="this.src='https://via.placeholder.com/200x280/1a1a1a/ffffff?text=No+Image'">
                <div class="detail-title">
                    <h2>${detail.title}</h2>
                    <p class="detail-subtitle">${detail.indonesianTitle}</p>
                    <div class="genre-list">
                        ${detail.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="detail-body">
            <div class="detail-grid">
                <div class="detail-item">
                    <h4>Tipe</h4>
                    <p>${detail.type}</p>
                </div>
                <div class="detail-item">
                    <h4>Status</h4>
                    <p>${detail.status}</p>
                </div>
                <div class="detail-item">
                    <h4>Pengarang</h4>
                    <p>${detail.author}</p>
                </div>
                <div class="detail-item">
                    <h4>Arah Baca</h4>
                    <p>${detail.readingDirection}</p>
                </div>
            </div>
            
            <div class="synopsis">
                <h3><i class="fas fa-book-open"></i> Sinopsis</h3>
                <p>${detail.synopsis || 'Tidak ada sinopsis tersedia.'}</p>
            </div>
            
            <div class="chapter-list">
                <h3><i class="fas fa-list"></i> Daftar Chapter</h3>
                ${detail.chapters && detail.chapters.length > 0 ? 
                    detail.chapters.map(chapter => `
                        <div class="chapter-item">
                            <div class="chapter-left">
                                <div class="chapter-name">${chapter.chapter}</div>
                                <div class="chapter-date">${chapter.releaseDate}</div>
                            </div>
                            <div class="chapter-right">
                                <span class="chapter-views">${chapter.views} views</span>
                                <button class="btn-read" data-url="${chapter.chapterUrl}">Baca</button>
                            </div>
                        </div>
                    `).join('') :
                    '<p>Tidak ada chapter tersedia.</p>'
                }
            </div>
        </div>
    `;
    
    // Add event listeners to read buttons
    modalContent.querySelectorAll('.btn-read').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const chapterUrl = btn.getAttribute('data-url');
            loadChapter(chapterUrl);
        });
    });
}

// Load Chapter
async function loadChapter(url) {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/read?url=${encodeURIComponent(url)}`);
        const readingData = await response.json();
        
        currentReadingData = readingData;
        renderChapter(readingData);
        readerModal.classList.add('active');
        detailModal.classList.remove('active');
    } catch (error) {
        console.error('Error loading chapter:', error);
        alert('Gagal memuat chapter');
    } finally {
        showLoading(false);
    }
}

function renderChapter(data) {
    readerTitle.textContent = `${data.title} - ${data.chapter}`;
    
    readerImages.innerHTML = data.comicImages && data.comicImages.length > 0 ? 
        data.comicImages.map(img => `
            <img src="${img}" alt="Page" class="reader-image" onerror="this.src='https://via.placeholder.com/800x1200/1a1a1a/ffffff?text=Gambar+Tidak+Tersedia'">
        `).join('') :
        '<p>Gambar tidak tersedia.</p>';
    
    // Update navigation buttons
    prevChapterBtn.disabled = !data.prevChapter;
    nextChapterBtn.disabled = !data.nextChapter;
}

async function loadPrevChapter() {
    if (currentReadingData && currentReadingData.prevChapter) {
        await loadChapter(currentReadingData.prevChapter);
    }
}

async function loadNextChapter() {
    if (currentReadingData && currentReadingData.nextChapter) {
        await loadChapter(currentReadingData.nextChapter);
    }
}

// Search
async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        
        renderComics(results);
        currentPage = 1;
        updatePagination(true);
    } catch (error) {
        console.error('Error searching:', error);
        comicGrid.innerHTML = '<p class="error">Gagal melakukan pencarian.</p>';
    } finally {
        showLoading(false);
    }
}

// Utility Functions
function showLoading(show) {
    loading.classList.toggle('active', show);
}

function updatePagination(isSearch = false) {
    currentPageSpan.textContent = currentPage;
    prevPageBtn.disabled = currentPage === 1;
    
    if (isSearch) {
        nextPageBtn.disabled = true;
    } else {
        nextPageBtn.disabled = false;
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        detailModal.classList.remove('active');
        readerModal.classList.remove('active');
    }
    
    if (readerModal.classList.contains('active')) {
        if (e.key === 'ArrowLeft') loadPrevChapter();
        if (e.key === 'ArrowRight') loadNextChapter();
    }
});