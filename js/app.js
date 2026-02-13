// App Logic

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('book');

    if (bookId) {
        loadBook(bookId);
    }

    setupUI();
});

// State
let currentBookContent = '';
let currentChapters = [];
let fontSize = 22; // px

function loadBook(id) {
    const readerContent = document.getElementById('readerContent');
    const bookTitleDisplay = document.getElementById('bookTitleDisplay');

    // First fetch the book info
    fetch(`books/${id}/info.json`)
        .then(response => {
            if (!response.ok) throw new Error("Could not load book info");
            return response.json();
        })
        .then(info => {
            bookTitleDisplay.textContent = info.title || "كتاب غير معروف";
            document.title = info.title ? `${info.title} | القارئ` : 'القارئ';

            // Now fetch the book content
            return fetch(`books/${id}/book.txt`);
        })
        .then(response => {
            if (!response.ok) throw new Error("Could not load book content");
            return response.text();
        })
        .then(text => {
            currentBookContent = text;
            parseBook(text);
        })
        .catch(err => {
            readerContent.innerHTML = `<div style="text-align:center; color:red; margin-top:50px;">خطأ في تحميل الملف: ${err.message}</div>`;
        });
}

function parseBook(text) {
    const lines = text.split('\n');
    const chapterList = [];
    let htmlContent = '';
    let chapterIndex = 0;

    // A simple parser looking for "## " as chapter headers
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('##')) {
            const title = trimmed.replace('##', '').trim();
            const id = `chap-${chapterIndex}`;
            chapterList.push({ title, id });

            htmlContent += `<h2 id="${id}" class="chapter-heading fade-in">${title}</h2>`;
            chapterIndex++;
        } else if (trimmed.length > 0) {
            htmlContent += `<p class="fade-in">${trimmed}</p>`;
        }
    });

    // Render Content
    const readerContent = document.getElementById('readerContent');
    readerContent.innerHTML = htmlContent;
    readerContent.style.fontSize = fontSize + 'px';

    // Render Sidebar
    renderSidebar(chapterList);
}

function renderSidebar(chapters) {
    const list = document.getElementById('chapterList');
    list.innerHTML = '';

    chapters.forEach(chap => {
        const li = document.createElement('li');
        li.className = 'chapter-item';
        li.textContent = chap.title;
        li.onclick = () => {
            const el = document.getElementById(chap.id);
            if (el) el.scrollIntoView({ behavior: 'smooth' });

            // Close sidebar on mobile
            if (window.innerWidth < 768) {
                document.getElementById('sidebar').classList.add('hidden');
                document.getElementById('readerContent').classList.add('full-width');
            }
        };
        list.appendChild(li);
    });

    currentChapters = chapters;
}

function setupUI() {
    // Sidebar Toggle
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('readerContent');
    const searchOverlay = document.getElementById('searchOverlay');


    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
        content.classList.toggle('full-width');
        // Close search if open
        searchOverlay.classList.remove('active');
    });

    // Font Size
    window.changeFontSize = (delta) => {
        fontSize += delta;
        if (fontSize < 12) fontSize = 12;
        if (fontSize > 48) fontSize = 48;
        content.style.fontSize = fontSize + 'px';
    };

    // Fullscreen
    window.toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // Scroll Top
    window.scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Search Toggle
    const searchBtn = document.getElementById('searchBtn');
    const closeSearch = document.getElementById('closeSearch');

    searchBtn.addEventListener('click', () => {
        searchOverlay.classList.toggle('active');
        sidebar.classList.add('hidden'); // Close sidebar to avoid overlap/clutter
        content.classList.add('full-width');
        if (searchOverlay.classList.contains('active')) {
            document.getElementById('searchInput').focus();
        }
    });

    closeSearch.addEventListener('click', () => {
        searchOverlay.classList.remove('active');
    });

    // Search Logic
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = '';

        if (!query || query.length < 2) return;

        const regex = new RegExp(query, 'gi');
        let matchCount = 0;

        const lines = currentBookContent.split('\n');
        let currentChapterTitle = "بداية الكتاب";
        let currentChapterId = "";
        let chapterIndex = -1; // -1 means before first chapter

        lines.forEach((line, index) => {
            if (line.trim().startsWith('##')) {
                currentChapterTitle = line.trim().replace('##', '').trim();
                chapterIndex++;
                currentChapterId = `chap-${chapterIndex}`;
            }

            if (matchCount > 50) return;

            if (line.match(regex) && !line.trim().startsWith('##')) {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';

                const highlighted = line.replace(regex, match => `<span class="highlight">${match}</span>`);

                resultItem.innerHTML = `
                    <div style="font-size:0.8em; color:var(--accent-color); margin-bottom:4px;">${currentChapterTitle}</div>
                    <div style="font-size:0.9rem;">${highlighted}</div>
                `;

                // Use closure to capture the ID at this moment
                const targetId = currentChapterId;
                resultItem.onclick = () => {
                    if (!targetId) {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        document.getElementById('searchOverlay').classList.remove('active');
                        return;
                    }
                    const chapterEl = document.getElementById(targetId);
                    if (chapterEl) {
                        chapterEl.scrollIntoView({ behavior: 'smooth' });
                        document.getElementById('searchOverlay').classList.remove('active');
                    }
                };
                resultsContainer.appendChild(resultItem);
                matchCount++;
            }
        });

        if (matchCount === 0) {
            resultsContainer.innerHTML = '<div style="padding:1rem; color:#666; text-align:center;">لا توجد نتائج</div>';
        }
    });

    // Favorites Logic
    const favBtn = document.getElementById('favBtn');
    const bookId = new URLSearchParams(window.location.search).get('book');

    if (bookId) {
        let favs = JSON.parse(localStorage.getItem('shiaLibFavs') || '[]');

        const updateFavIcon = () => {
            if (favs.includes(bookId)) {
                favBtn.innerHTML = '<i class="fas fa-star" style="color: var(--accent-color);"></i>';
            } else {
                favBtn.innerHTML = '<i class="far fa-star"></i>';
            }
        };
        updateFavIcon();

        favBtn.addEventListener('click', () => {
            favs = JSON.parse(localStorage.getItem('shiaLibFavs') || '[]');
            if (favs.includes(bookId)) {
                favs = favs.filter(id => id !== bookId);
            } else {
                favs.push(bookId);
            }
            localStorage.setItem('shiaLibFavs', JSON.stringify(favs));
            updateFavIcon();
        });
    }
}
