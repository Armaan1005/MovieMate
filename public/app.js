// State
let movies = [];
let allMovies = []; // Store all fetched movies
let displayedMovies = []; // Currently displayed movies
let searchHistory = [];
let currentPage = 1;
let currentQuery = '';
let currentSortOrder = 'default';
let currentGenre = null; // Store current genre for pagination
let lastFetchedPage = 0; // Track the last page we fetched for filters
const MOVIES_PER_PAGE = 12;
const API_BASE = window.location.origin;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  loadHistory();
  setupEventListeners();
  loadTrending(); // Load trending movies on start
});

// Theme
function loadTheme() {
  const saved = localStorage.getItem('mm:dark');
  const isDark = saved === '1';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  const icon = document.querySelector('#themeToggle i');
  if (icon) {
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  }
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = newTheme;
  localStorage.setItem('mm:dark', newTheme === 'dark' ? '1' : '0');
  const icon = document.querySelector('#themeToggle i');
  if (icon) {
    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
}

// History
function loadHistory() {
  try {
    searchHistory = JSON.parse(localStorage.getItem('mm:history') || '[]');
    renderHistory();
  } catch (e) {
    searchHistory = [];
  }
}

function saveHistory() {
  localStorage.setItem('mm:history', JSON.stringify(searchHistory));
}

function addToHistory(query) {
  if (!query) return;
  searchHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
  saveHistory();
  renderHistory();
}

function renderHistory() {
  const historyEl = document.getElementById('history');
  const clearBtn = document.getElementById('clearHistoryBtn');
  
  if (searchHistory.length === 0) {
    historyEl.innerHTML = '';
    clearBtn.style.display = 'none';
    return;
  }
  
  historyEl.innerHTML = searchHistory.slice(0, 6)
    .map(h => `<button onclick="searchFromHistory('${h}')">${h}</button>`)
    .join('');
  
  clearBtn.style.display = 'block';
}

function clearHistory() {
  if (confirm('Clear all search history?')) {
    searchHistory = [];
    saveHistory();
    renderHistory();
  }
}

function searchFromHistory(query) {
  document.getElementById('searchInput').value = query;
  search(query);
}

// Load trending movies
async function loadTrending() {
  showLoader(true);
  
  try {
    console.log('🔥 Loading trending movies...');
    const response = await fetch(`${API_BASE}/api/trending`);
    const data = await response.json();
    
    if (data.error) {
      console.error('API Error:', data.error);
      return;
    }

    allMovies = data.results || [];
    currentPage = 1;
    currentQuery = 'trending';
    currentSortOrder = 'default';
    currentGenre = null; // Clear genre filter when loading trending
    lastFetchedPage = 0; // Reset page counter
    console.log('Trending movies loaded:', allMovies.length);
    displayMoviesWithPagination('<i class="fas fa-fire"></i> Trending Movies');
    
    // Hide suggestion box when returning to home
    hideSuggestion();
  } catch (error) {
    console.error('Trending error:', error);
  } finally {
    showLoader(false);
  }
}

// Sort movies
function sortMovies(sortBy) {
  currentSortOrder = sortBy;
  
  if (sortBy === 'year') {
    allMovies.sort((a, b) => {
      const yearA = parseInt(a.release_date) || 0;
      const yearB = parseInt(b.release_date) || 0;
      return yearB - yearA; // Newest first
    });
  } else if (sortBy === 'rating') {
    allMovies.sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return ratingB - ratingA; // Highest first
    });
  } else {
    // Default order (as fetched)
    // Don't sort, keep original order
  }
  
  currentPage = 1;
  displayMoviesWithPagination();
}

// Display movies with pagination
async function displayMoviesWithPagination(title) {
  const startIndex = 0;
  const endIndex = currentPage * MOVIES_PER_PAGE;
  displayedMovies = allMovies.slice(startIndex, endIndex);
  
  renderMovies(title);
  
  // Show/hide Load More button
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  // Always show Load More for filtered results, or if there are more movies in allMovies
  if (currentGenre || endIndex < allMovies.length) {
    loadMoreBtn.style.display = 'inline-block';
  } else {
    loadMoreBtn.style.display = 'none';
  }
}

// Load more movies
async function loadMore() {
  // Show inline loader below Load More button, hide the button
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const loadMoreLoader = document.getElementById('loadMoreLoader');
  loadMoreBtn.style.display = 'none';
  loadMoreLoader.style.display = 'block';
  
  currentPage++;
  
  // If we're viewing filtered movies and need to fetch more
  if (currentGenre && allMovies.length < currentPage * MOVIES_PER_PAGE) {
    try {
      const pageToFetch = lastFetchedPage + 1; // Fetch the next page
      console.log(`Fetching more ${currentGenre} movies - page ${pageToFetch}...`);
      
      const response = await fetch(`${API_BASE}/api/filter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: currentGenre, page: pageToFetch })
      });
      
      if (response.ok) {
        const data = await response.json();
        const newMovies = data.results || [];
        console.log(`Received ${newMovies.length} new movies`);
        
        // Filter out duplicates (just in case)
        const existingIds = new Set(allMovies.map(m => m.id));
        const uniqueNewMovies = newMovies.filter(m => !existingIds.has(m.id));
        
        if (uniqueNewMovies.length > 0) {
          allMovies = [...allMovies, ...uniqueNewMovies];
          lastFetchedPage = pageToFetch; // Update the last fetched page
          console.log(`✅ Added ${uniqueNewMovies.length} unique movies. Total: ${allMovies.length}`);
        } else {
          console.log('⚠️ No new unique movies found');
        }
      }
    } catch (error) {
      console.error('Error loading more filtered movies:', error);
    }
  }
  
  // Small delay to show the loading animation
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Hide inline loader
  loadMoreLoader.style.display = 'none';
  
  const previousHeight = document.documentElement.scrollHeight;
  
  await displayMoviesWithPagination(
    currentQuery === 'trending' ? '<i class="fas fa-fire"></i> Trending Movies' :
    currentGenre ? `${getGenreEmoji(currentGenre)} Top ${currentGenre.charAt(0).toUpperCase() + currentGenre.slice(1)} Movies (Highly Rated & Modern)` :
    `<i class="fas fa-search"></i> Search Results for "${currentQuery}"`
  );
  
  // Smooth scroll to new content
  setTimeout(() => {
    const newHeight = document.documentElement.scrollHeight;
    const scrollTarget = previousHeight - 100; // Scroll to where new content starts
    window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
  }, 100);
}

// Smart filter movies using AI
async function filterMovies(genre) {
  showLoader(true);
  hideSuggestion();

  try {
    console.log(`🎬 AI-powered filter for: ${genre}`);
    const response = await fetch(`${API_BASE}/api/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genre, page: 1 }) // Explicitly pass page 1
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Filter Error:', data.error);
      if (data.error.includes('GEMINI_API_KEY')) {
        alert('⚠️ GEMINI_API_KEY not configured!\n\n1. Get FREE key: https://ai.google.dev/\n2. Add to .env file\n3. Restart server');
      } else {
        alert(`Error: ${data.error}`);
      }
      return;
    }

    allMovies = data.results || [];
    currentPage = 1;
    currentQuery = genre;
    currentGenre = genre; // Store the genre for load more functionality
    lastFetchedPage = 1; // We just fetched page 1
    currentSortOrder = 'rating'; // Default to rating sort for filters
    console.log(`✅ Filtered movies loaded: ${allMovies.length} (currentGenre: ${currentGenre}, lastFetchedPage: ${lastFetchedPage})`);
    
    const genreDisplay = genre.charAt(0).toUpperCase() + genre.slice(1);
    const emoji = getGenreEmoji(genre);
    displayMoviesWithPagination(`${emoji} Top ${genreDisplay} Movies (Highly Rated & Modern)`);
  } catch (error) {
    console.error('Filter error:', error);
    alert('Failed to filter movies. Check console for details.');
  } finally {
    showLoader(false);
  }
}

function getGenreEmoji(genre) {
  const emojis = {
    'action': '<i class="fas fa-fist-raised"></i>',
    'comedy': '<i class="fas fa-laugh"></i>',
    'drama': '<i class="fas fa-theater-masks"></i>',
    'horror': '<i class="fas fa-ghost"></i>',
    'sci-fi': '<i class="fas fa-rocket"></i>',
    'romance': '<i class="fas fa-heart"></i>',
    'thriller': '<i class="fas fa-user-secret"></i>'
  };
  return emojis[genre] || '<i class="fas fa-film"></i>';
}

// Search
async function search(queryOverride) {
  const query = queryOverride || document.getElementById('searchInput').value.trim();
  
  if (!query) {
    alert('Please enter a search term');
    return;
  }

  showLoader(true);
  hideSuggestion();

  try {
    const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.error) {
      console.error('API Error:', data.error);
      if (data.error.includes('OMDB_API_KEY')) {
        alert('⚠️ OMDB_API_KEY not configured!\n\n1. Get FREE key: https://www.omdbapi.com/apikey.aspx\n2. Add to .env file\n3. Restart server');
      } else {
        alert(`Error: ${data.error}`);
      }
      return;
    }

    allMovies = data.results || [];
    currentPage = 1;
    currentQuery = query;
    currentGenre = null; // Clear genre filter when searching
    lastFetchedPage = 0; // Reset page counter
    currentSortOrder = 'default';
    console.log('Movies found:', allMovies.length);
    displayMoviesWithPagination(`<i class="fas fa-search"></i> Search Results for "${query}"`);
    addToHistory(query);
  } catch (error) {
    console.error('Search error:', error);
    alert('Failed to search movies. Check console for details.');
  } finally {
    showLoader(false);
  }
}

function renderMovies(title = '<i class="fas fa-film"></i> Movies') {
  const grid = document.getElementById('moviesGrid');
  
  if (allMovies.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding:2rem; color:var(--muted);">No movies found. Try a different search.</p>';
    document.getElementById('loadMoreBtn').style.display = 'none';
    return;
  }

  const titleHTML = title ? `
    <div style="grid-column: 1/-1; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 1rem;">
      <h2 style="margin: 0; font-size: 1.5rem; color: var(--text); font-weight: 600;">${title}</h2>
      <select id="sortSelect" onchange="sortMovies(this.value)" class="sort-select">
        <option value="default" ${currentSortOrder === 'default' ? 'selected' : ''}><i class="fas fa-sync"></i> Sort By: Default</option>
        <option value="year" ${currentSortOrder === 'year' ? 'selected' : ''}><i class="fas fa-calendar"></i> Sort By: Year</option>
        <option value="rating" ${currentSortOrder === 'rating' ? 'selected' : ''}><i class="fas fa-star"></i> Sort By: Rating</option>
      </select>
    </div>
  ` : '';
  
  // Filter out movies without posters
  const moviesWithPosters = displayedMovies.filter(movie => movie.poster_path && movie.poster_path !== 'N/A');
  
  grid.innerHTML = titleHTML + moviesWithPosters.map(movie => {
    const title = (movie.title || 'Unknown').replace(/'/g, "\\'");
    
    return `
    <div class="card" onclick="viewMovie('${movie.id}')">
      <img src="${movie.poster_path}" alt="${title}" onerror="this.style.display='none'; this.parentElement.style.display='none';" />
      <div class="content">
        <h3>${title}</h3>
        <small>${movie.release_date || 'N/A'}</small>
        ${movie.overview ? `<p class="overview">${movie.overview.slice(0, 100)}${movie.overview.length > 100 ? '…' : ''}</p>` : ''}
      </div>
    </div>
  `}).join('');
}

async function viewMovie(id) {
  showLoader(true);
  try {
    const response = await fetch(`${API_BASE}/api/movie?id=${id}`);
    const movie = await response.json();
    
    if (movie.error) {
      alert(`Error: ${movie.error}`);
      return;
    }

    // Display movie details in modal
    const modalContent = document.getElementById('movieDetailsContent');
    modalContent.innerHTML = `
      <div style="display: flex; gap: 1.5rem; align-items: flex-start;">
        <div style="flex-shrink: 0;">
          ${movie.poster_path 
            ? `<img src="${movie.poster_path}" alt="${movie.title}" style="width: 200px; height: 300px; object-fit: cover; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);" />`
            : `<div style="width: 200px; height: 300px; background: var(--muted); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--card); font-size: 0.9rem; text-align: center; padding: 1rem;">No Poster</div>`
          }
        </div>
        <div style="flex: 1; min-width: 0;">
          <h3 style="margin: 0 0 0.75rem; font-size: 1.75rem; color: var(--accent);">
            ${movie.title}
          </h3>
          <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap;">
            <span style="background: var(--accent); color: white; padding: 0.3rem 0.75rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem; font-weight: 600;"><i class="fas fa-star"></i> ${movie.vote_average}/10</span>
            <span style="color: var(--muted); display: inline-flex; align-items: center; gap: 0.3rem;"><i class="fas fa-calendar"></i> ${movie.release_date}</span>
            <span style="color: var(--muted); display: inline-flex; align-items: center; gap: 0.3rem;"><i class="fas fa-clock"></i> ${movie.runtime}</span>
          </div>
          <div style="margin-bottom: 1rem;">
            <p style="color: var(--muted); font-size: 0.95rem; margin: 0;">
              <strong>Genre:</strong> ${movie.genre}
            </p>
          </div>
          <div style="margin-bottom: 1rem;">
            <p style="margin: 0; line-height: 1.6; font-size: 1rem;">
              <strong style="color: var(--accent);">Plot</strong>
            </p>
            <p style="margin: 0.5rem 0 0; line-height: 1.6; color: var(--text);">
              ${movie.overview}
            </p>
          </div>
            <div style="font-size: 0.9rem; color: var(--muted); line-height: 1.5; border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 1rem;">
            <p style="margin: 0 0 0.5rem;"><strong>Director:</strong> ${movie.director}</p>
            <p style="margin: 0 0 0.5rem;"><strong>Cast:</strong> ${movie.actors}</p>
            ${movie.awards && movie.awards !== 'N/A' ? `<p style="margin: 0.75rem 0 0; color: var(--accent); font-weight: 600;"><i class="fas fa-trophy"></i> ${movie.awards}</p>` : ''}
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('movieModal').style.display = 'flex';
  } catch (error) {
    console.error('Movie details error:', error);
    alert('Failed to load movie details');
  } finally {
    showLoader(false);
  }
}

function closeMovieModal() {
  document.getElementById('movieModal').style.display = 'none';
}

// Suggestion
function showSuggestModal() {
  document.getElementById('suggestModal').style.display = 'flex';
}

function closeSuggestModal() {
  document.getElementById('suggestModal').style.display = 'none';
}

async function getSuggestion() {
  const prefs = document.getElementById('prefsInput').value.trim();
  
  if (!prefs) {
    alert('Please enter your preferences');
    return;
  }

  closeSuggestModal();
  showLoader(true);

  try {
    console.log('🤖 Requesting AI suggestion...');
    const response = await fetch(`${API_BASE}/api/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prefs,
        sampleMovies: displayedMovies.slice(0, 5)
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('AI Error:', data.error);
      if (data.error.includes('GEMINI_API_KEY')) {
        alert('⚠️ GEMINI_API_KEY not configured!\n\n1. Get FREE key: https://ai.google.dev/\n2. Add to .env file\n3. Restart server');
      } else {
        alert(`Error: ${data.error}`);
      }
      return;
    }

    console.log('✅ Got AI suggestion!');
    
    // Display suggestion with movie details
    const suggestionBox = document.getElementById('suggestion');
    const suggestionText = document.getElementById('suggestionText');
    
    if (data.movieData) {
      // Show movie card with poster and details
      const movie = data.movieData;
      suggestionText.innerHTML = `
        <div style="display: flex; gap: 1rem; align-items: flex-start;">
          <div style="flex-shrink: 0;">
            ${movie.poster 
              ? `<img src="${movie.poster}" alt="${movie.title}" style="width: 140px; height: 210px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" />`
              : `<div style="width: 140px; height: 210px; background: var(--muted); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--card); font-size: 0.85rem; text-align: center; padding: 1rem;">No Poster</div>`
            }
          </div>
          <div style="flex: 1; min-width: 0;">
            <h3 style="margin: 0 0 0.5rem; font-size: 1.25rem; color: var(--accent);">
              ${movie.title} (${movie.year})
            </h3>
            <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem; font-size: 0.85rem;">
              <span style="background: var(--accent); color: white; padding: 0.2rem 0.6rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="fas fa-star"></i> ${movie.rating}</span>
              <span style="color: var(--muted); display: inline-flex; align-items: center; gap: 0.25rem;"><i class="fas fa-clock"></i> ${movie.runtime}</span>
            </div>
            <div style="margin-bottom: 0.75rem;">
              <p style="color: var(--muted); font-size: 0.85rem; margin: 0;">
                <strong>Genre:</strong> ${movie.genre}
              </p>
            </div>
            <div style="margin-bottom: 0.75rem;">
              <p style="margin: 0; line-height: 1.5; font-size: 0.9rem;">
                <strong style="color: var(--accent);">Why this movie?</strong>
              </p>
              <p style="margin: 0.25rem 0 0; line-height: 1.5; font-size: 0.9rem; color: var(--text);">
                ${data.explanation}
              </p>
            </div>
            <details style="margin-bottom: 0.75rem;">
              <summary style="cursor: pointer; color: var(--accent); font-weight: 600; user-select: none; font-size: 0.9rem; padding: 0.25rem 0;">
                <i class="fas fa-book-open"></i> Full Plot
              </summary>
              <p style="margin: 0.5rem 0 0; line-height: 1.5; color: var(--muted); font-size: 0.85rem;">
                ${movie.plot}
              </p>
            </details>
            <div style="font-size: 0.8rem; color: var(--muted); line-height: 1.4;">
              <p style="margin: 0 0 0.25rem;"><strong>Director:</strong> ${movie.director}</p>
              <p style="margin: 0;"><strong>Cast:</strong> ${movie.actors}</p>
            </div>
            ${movie.awards !== 'N/A' ? `<p style="margin: 0.5rem 0 0; font-size: 0.8rem; color: var(--accent);"><strong><i class="fas fa-trophy"></i> ${movie.awards}</strong></p>` : ''}
            <button 
              onclick="searchFromSuggestion('${movie.title.replace(/'/g, "\\'")}')" 
              style="margin-top: 0.75rem; padding: 0.5rem 1rem; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s;"
              onmouseover="this.style.background='var(--accent-hover)'; this.style.transform='translateY(-1px)'"
              onmouseout="this.style.background='var(--accent)'; this.style.transform='translateY(0)'"
            >
              <i class="fas fa-search"></i> Search Similar Movies
            </button>
          </div>
        </div>
      `;
    } else {
      // Fallback to text-only suggestion
      suggestionText.innerHTML = data.suggestion.replace(/\n/g, '<br>');
    }
    
    suggestionBox.style.display = 'block';
    
    // Scroll to suggestion
    suggestionBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    console.error('Suggestion error:', error);
    alert('Failed to get suggestion. Check console for details.');
  } finally {
    showLoader(false);
  }
}

function searchFromSuggestion(title) {
  document.getElementById('searchInput').value = title;
  hideSuggestion();
  search(title);
}

function hideSuggestion() {
  document.getElementById('suggestion').style.display = 'none';
}

// UI Helpers
function showLoader(show) {
  document.getElementById('loader').style.display = show ? 'block' : 'none';
}

// Event Listeners
function setupEventListeners() {
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') search();
  });
  
  // Close modals when clicking outside
  document.getElementById('suggestModal').addEventListener('click', (e) => {
    if (e.target.id === 'suggestModal') closeSuggestModal();
  });
  
  document.getElementById('movieModal').addEventListener('click', (e) => {
    if (e.target.id === 'movieModal') closeMovieModal();
  });
}
