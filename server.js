import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory cache
const CACHE = new Map();
const TTL = 1000 * 60 * 5; // 5 min

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to check cache
function getCached(key) {
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.t < TTL) {
    return hit.v;
  }
  return null;
}

function setCache(key, value) {
  CACHE.set(key, { v: value, t: Date.now() });
}

// API Routes

// Get trending movies (popular/top movies)
app.get('/api/trending', async (req, res) => {
  try {
    const cacheKey = 'trending:movies:v2'; // Changed cache key to force refresh
    
    const cached = getCached(cacheKey);
    if (cached) {
      console.log('✅ Cache hit for trending movies');
      return res.json(cached);
    }

    const API_KEY = process.env.OMDB_API_KEY;
    if (!API_KEY || API_KEY === 'your_omdb_api_key_here') {
      console.error('❌ OMDB_API_KEY not configured!');
      return res.status(500).json({ 
        error: 'OMDB_API_KEY not set. Get your free key at https://www.omdbapi.com/apikey.aspx'
      });
    }

    // Fetch popular movie franchises/series to create a trending list
    const popularSearches = [
      'Avengers', 'Star Wars', 'Batman', 'Spider-Man', 'Harry Potter', 
      'Marvel', 'Iron Man', 'Thor', 'Superman', 'X-Men', 'Deadpool',
      'Fast Furious', 'Mission Impossible', 'James Bond', 'Jurassic',
      'Lord Rings', 'Pirates Caribbean', 'Transformers', 'Indiana Jones',
      'Captain America', 'Guardians Galaxy', 'Ant-Man', 'Doctor Strange'
    ];
    const allMovies = [];

    console.log('🔥 Fetching trending movies...');

    for (const searchTerm of popularSearches) {
      const url = `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(searchTerm)}&type=movie&page=1`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.Response === 'True' && data.Search) {
        allMovies.push(...data.Search.slice(0, 4)); // Take top 4 from each search
      }
    }

    // Remove duplicates and filter out movies without posters
    const uniqueMovies = Array.from(new Map(allMovies.map(m => [m.imdbID, m])).values())
      .filter(movie => movie.Poster && movie.Poster !== 'N/A');
    const shuffled = uniqueMovies.sort(() => 0.5 - Math.random()).slice(0, 72); // Increased from 24 to 72

    const normalized = {
      results: shuffled.map(movie => ({
        id: movie.imdbID,
        title: movie.Title,
        release_date: movie.Year,
        poster_path: movie.Poster,
        overview: ''
      })),
      total_results: shuffled.length
    };

    console.log(`✅ Loaded ${normalized.results.length} trending movies`);
    setCache(cacheKey, normalized);
    res.json(normalized);
  } catch (error) {
    console.error('❌ Trending error:', error);
    res.status(500).json({ error: 'Failed to fetch trending movies: ' + error.message });
  }
});

// Search movies
app.get('/api/search', async (req, res) => {
  try {
    const { q = '', year = '', page = '1' } = req.query;
    const cacheKey = `search:${q}:${year}:${page}`;
    
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit for: ${cacheKey}`);
      return res.json(cached);
    }

    const API_KEY = process.env.OMDB_API_KEY;
    if (!API_KEY || API_KEY === 'your_omdb_api_key_here') {
      console.error('❌ OMDB_API_KEY not configured!');
      return res.status(500).json({ 
        error: 'OMDB_API_KEY not set. Get your free key at https://www.omdbapi.com/apikey.aspx'
      });
    }

    const url = q 
      ? `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(q)}&type=movie&page=${page}${year ? `&y=${year}` : ''}`
      : `https://www.omdbapi.com/?apikey=${API_KEY}&s=avengers&type=movie&page=${page}`;

    console.log(`🔍 Searching OMDb: "${q || 'avengers'}"${year ? ` (${year})` : ''}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Check for API errors
    if (data.Response === 'False') {
      console.log(`⚠️ OMDb API Error: ${data.Error}`);
      return res.json({
        results: [],
        total_results: 0,
        page: parseInt(page),
        message: data.Error
      });
    }
    
    const normalized = {
      results: data.Search ? data.Search
        .filter(movie => movie.Poster && movie.Poster !== 'N/A')
        .map(movie => ({
          id: movie.imdbID,
          title: movie.Title,
          release_date: movie.Year,
          poster_path: movie.Poster,
          overview: ''
        })) : [],
      total_results: data.totalResults ? parseInt(data.totalResults) : 0,
      page: parseInt(page)
    };

    console.log(`✅ Found ${normalized.results.length} movies`);
    setCache(cacheKey, normalized);
    res.json(normalized);
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ error: 'Failed to fetch movies: ' + error.message });
  }
});

// Get movie details
app.get('/api/movie', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'id required' });
    }

    const cacheKey = `movie:${id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit for movie: ${id}`);
      return res.json(cached);
    }

    const API_KEY = process.env.OMDB_API_KEY;
    if (!API_KEY || API_KEY === 'your_omdb_api_key_here') {
      return res.status(500).json({ error: 'OMDB_API_KEY not set' });
    }

    const url = `https://www.omdbapi.com/?apikey=${API_KEY}&i=${id}&plot=full`;
    
    console.log(`🎬 Fetching movie details: ${id}`);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.Response === 'False') {
      console.log(`⚠️ Movie not found: ${id}`);
      return res.status(404).json({ error: data.Error });
    }
    
    const normalized = {
      id: data.imdbID,
      title: data.Title,
      release_date: data.Released,
      poster_path: data.Poster !== 'N/A' ? data.Poster : null,
      overview: data.Plot !== 'N/A' ? data.Plot : '',
      vote_average: data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : 0,
      runtime: data.Runtime,
      genre: data.Genre,
      director: data.Director,
      actors: data.Actors,
      awards: data.Awards
    };
    
    console.log(`✅ Movie details loaded: ${data.Title}`);
    setCache(cacheKey, normalized);
    res.json(normalized);
  } catch (error) {
    console.error('❌ Movie details error:', error);
    res.status(500).json({ error: 'Failed to fetch movie details: ' + error.message });
  }
});

// AI Suggestion endpoint using Google Gemini API
app.post('/api/suggest', async (req, res) => {
  try {
    const { prefs, sampleMovies } = req.body || {};
    const API_KEY = process.env.OMDB_API_KEY;
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_KEY || GEMINI_KEY === 'your_gemini_key_here') {
      console.error('❌ GEMINI_API_KEY not configured!');
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY not set. Get your free key at https://ai.google.dev/'
      });
    }

    // Build a smart prompt for movie suggestions
    const movieList = sampleMovies?.length > 0 
      ? sampleMovies.map(m => `${m.title} (${m.release_date})`).join(', ')
      : 'popular movies';

    const prompt = `You are a movie recommendation expert. Based on these preferences: "${prefs}"

${sampleMovies?.length > 0 ? `Current search results include: ${movieList}` : ''}

Please suggest ONE specific movie that matches these preferences. 
IMPORTANT: Respond with ONLY the movie title and year in this exact format:
Movie Title (Year)

Example: Edge of Tomorrow (2014)

Do not include any explanation, just the title and year.`;

    console.log(`🤖 Asking Gemini for suggestion based on: "${prefs}"`);

    // Using Gemini model - try experimental first, fallback to stable
    let model = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
    
    // Fallback to stable model if experimental not available
    const stableModel = 'gemini-1.5-flash';
    
    console.log(`📡 Using model: ${model}`);
    
    const makeGeminiRequest = async (modelName) => {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_KEY}`;
      return await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 50,
          }
        })
      });
    };
    
    let geminiResponse = await makeGeminiRequest(model);
    
    // If experimental model fails, try stable model
    if (!geminiResponse.ok && model !== stableModel) {
      console.log(`⚠️  Model ${model} failed, trying ${stableModel}...`);
      model = stableModel;
      geminiResponse = await makeGeminiRequest(model);
    }
    
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('❌ Gemini API error:', geminiResponse.status, errorText);
      return res.status(500).json({ 
        error: `Gemini API error: ${geminiResponse.status}. Check your API key at https://ai.google.dev/`,
        details: errorText
      });
    }

    const geminiJson = await geminiResponse.json();
    console.log('🤖 Gemini response received');
    
    // Extract the movie title from Gemini's response
    const movieTitleRaw = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    console.log(`🎬 AI suggested: ${movieTitleRaw}`);
    
    // Extract title and year using regex
    const match = movieTitleRaw.match(/^(.+?)\s*\((\d{4})\)/);
    let movieTitle = match ? match[1].trim() : movieTitleRaw.replace(/\(\d{4}\)/, '').trim();
    const year = match ? match[2] : '';
    
    // Search OMDb for the suggested movie
    console.log(`🔍 Searching OMDb for: ${movieTitle}${year ? ` (${year})` : ''}`);
    const omdbUrl = `https://www.omdbapi.com/?apikey=${API_KEY}&t=${encodeURIComponent(movieTitle)}${year ? `&y=${year}` : ''}&type=movie&plot=full`;
    
    const omdbResponse = await fetch(omdbUrl);
    const omdbData = await omdbResponse.json();
    
    if (omdbData.Response === 'False') {
      console.log(`⚠️ Movie not found in OMDb, returning text suggestion`);
      return res.json({ 
        suggestion: `I recommend: ${movieTitleRaw}\n\nThis movie matches your preferences: "${prefs}"`,
        movieData: null
      });
    }
    
    // Build detailed movie data
    const movieData = {
      id: omdbData.imdbID,
      title: omdbData.Title,
      year: omdbData.Year,
      poster: omdbData.Poster !== 'N/A' ? omdbData.Poster : null,
      plot: omdbData.Plot !== 'N/A' ? omdbData.Plot : '',
      rating: omdbData.imdbRating !== 'N/A' ? omdbData.imdbRating : 'N/A',
      genre: omdbData.Genre !== 'N/A' ? omdbData.Genre : '',
      director: omdbData.Director !== 'N/A' ? omdbData.Director : '',
      actors: omdbData.Actors !== 'N/A' ? omdbData.Actors : '',
      runtime: omdbData.Runtime !== 'N/A' ? omdbData.Runtime : '',
      awards: omdbData.Awards !== 'N/A' ? omdbData.Awards : ''
    };
    
    console.log(`✅ Found movie details for: ${movieData.title}`);
    
    // Generate explanation using Gemini
    const explanationPrompt = `Why is "${movieData.title} (${movieData.year})" a perfect match for someone who wants: "${prefs}"? 
    
Movie details: ${movieData.genre} | ${movieData.director} | ${movieData.plot}

Provide a 2-3 sentence enthusiastic explanation of why this movie fits their preferences.`;

    const explanationResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: explanationPrompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 150 }
      })
    });
    
    const explanationJson = await explanationResponse.json();
    const explanation = explanationJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 
                       `This ${movieData.genre} film matches your preference for ${prefs.toLowerCase()}.`;
    
    res.json({ 
      movieData,
      explanation,
      suggestion: `**${movieData.title} (${movieData.year})**\n\n${explanation}`
    });
  } catch (error) {
    console.error('❌ Suggestion error:', error);
    res.status(500).json({ 
      error: 'Failed to generate suggestion: ' + error.message 
    });
  }
});

// Smart filter endpoint using AI to curate quality movies
app.post('/api/filter', async (req, res) => {
  try {
    const { genre, page = 1 } = req.body;
    const cacheKey = `filter:${genre}:${page}`;
    
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit for filter: ${genre} page ${page}`);
      return res.json(cached);
    }

    const API_KEY = process.env.OMDB_API_KEY;
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_KEY || GEMINI_KEY === 'your_gemini_key_here') {
      console.error('❌ GEMINI_API_KEY not configured!');
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY not set. Get your free key at https://ai.google.dev/'
      });
    }

    console.log(`🤖 Using AI to find best ${genre} movies (page ${page})...`);

    // Ask Gemini for top-rated modern movies in the genre
    const prompt = `List exactly 12 highly-rated, critically acclaimed ${genre} movies released after 2000. 
Focus on movies that are:
- IMDb rating 7.5 or higher
- Released between 2000-2024
- Well-known and widely available
- Diverse in style and themes
${page > 1 ? `\nIMPORTANT: Skip the first ${(page - 1) * 12} most popular movies and give me the next 12 different ones.` : ''}

Format: Movie Title (Year)
One movie per line. No explanations, just title and year.`;

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 300,
        }
      })
    });
    
    if (!geminiResponse.ok) {
      console.error('❌ Gemini API error');
      return res.status(500).json({ error: 'Failed to get AI recommendations' });
    }

    const geminiJson = await geminiResponse.json();
    const aiResponse = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    console.log(`🤖 AI suggested movies:\n${aiResponse}`);
    
    // Parse movie titles and years from AI response
    const movieLines = aiResponse.split('\n').filter(line => line.trim());
    const moviePromises = movieLines.map(async (line) => {
      const match = line.match(/^(?:\d+\.\s*)?(.+?)\s*\((\d{4})\)/);
      if (!match) return null;
      
      const title = match[1].trim();
      const year = match[2];
      
      try {
        const url = `https://www.omdbapi.com/?apikey=${API_KEY}&t=${encodeURIComponent(title)}&y=${year}&type=movie`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.Response === 'True' && data.Poster && data.Poster !== 'N/A') {
          const rating = parseFloat(data.imdbRating);
          if (!isNaN(rating) && rating >= 7.0) {
            return {
              id: data.imdbID,
              title: data.Title,
              release_date: data.Year,
              poster_path: data.Poster,
              overview: data.Plot !== 'N/A' ? data.Plot : '',
              rating: rating
            };
          }
        }
      } catch (err) {
        console.error(`Failed to fetch: ${title}`, err.message);
      }
      return null;
    });

    const results = (await Promise.all(moviePromises))
      .filter(movie => movie !== null)
      .sort((a, b) => b.rating - a.rating); // Sort by rating descending

    console.log(`✅ Found ${results.length} highly-rated ${genre} movies`);

    const response = {
      results,
      total_results: results.length
    };

    setCache(cacheKey, response);
    res.json(response);
  } catch (error) {
    console.error('❌ Filter error:', error);
    res.status(500).json({ error: 'Failed to filter movies: ' + error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎬 MovieMate server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
});
