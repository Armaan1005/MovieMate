# 🎬 MovieMate

AI-powered movie discovery app with smart recommendations, trending content, and advanced filters using OMDb API and Google Gemini.

![MovieMate](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)

## ✨ Features

- 🔥 **Trending Movies** - Discover 72 curated movies from 23 popular franchises
- 🎭 **Smart Filters** - Filter by genre (Action, Comedy, Drama, Horror, Sci-Fi, Romance, Mystery)
- 🤖 **AI-Powered Suggestions** - Get personalized movie recommendations using Google Gemini AI
- 🔍 **Advanced Search** - Search movies with real-time results from OMDb API
- 📄 **Pagination** - Load more movies seamlessly with inline loading animations
- 🌙 **Dark Mode** - Beautiful dark/light theme toggle with smooth transitions
- ⭐ **Detailed Info** - View ratings, runtime, cast, plot, and awards
- 📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile


## Home Screen
<img width="1901" height="1079" alt="image" src="https://github.com/user-attachments/assets/e82b7aaa-5675-4c94-a858-32275846b22d" />

## AI Reccomendation
<img width="1902" height="1079" alt="image" src="https://github.com/user-attachments/assets/c9719874-aa36-4ff9-973a-deb784740ba2" />



## 🚀 Quick Start

### Prerequisites

- Node.js (v20.0.0 or higher)
- npm or yarn
- OMDb API Key (free from [omdbapi.com](https://www.omdbapi.com/apikey.aspx))
- Google Gemini API Key (free from [ai.google.dev](https://ai.google.dev/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/moviemate.git
   cd moviemate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env` and add your API keys:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your keys:
   ```env
   OMDB_API_KEY=your_omdb_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.0-flash-exp
   PORT=3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **APIs**: OMDb API, Google Gemini AI
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Icons**: Font Awesome 6.5.1
- **Fonts**: Poppins (Google Fonts)

## 📁 Project Structure

```
MovieMate/
├── public/
│   ├── index.html      # Main HTML file
│   ├── app.js          # Frontend JavaScript
│   └── styles.css      # Styling and themes
├── server.js           # Express backend server
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore rules
├── package.json        # Dependencies and scripts
└── README.md           # Documentation
```

## 🎯 API Endpoints

### GET `/api/trending`
Returns 72 trending movies from popular franchises.

**Response:**
```json
[
  {
    "Title": "Movie Title",
    "Year": "2024",
    "imdbID": "tt1234567",
    "Type": "movie",
    "Poster": "https://..."
  }
]
```

### GET `/api/search?q={query}`
Search movies by title.

**Parameters:**
- `q` (required): Search query

### GET `/api/filter?genre={genre}&page={page}`
Filter movies by genre with pagination.

**Parameters:**
- `genre` (required): Genre name (action, comedy, drama, horror, sci-fi, romance, mystery)
- `page` (optional): Page number (default: 1)

### POST `/api/suggest`
Get AI-powered movie suggestions based on user preferences.

**Body:**
```json
{
  "description": "I like action movies with sci-fi elements"
}
```

### GET `/api/movie/{imdbId}`
Get detailed information about a specific movie.

## 🎨 Features in Detail

### Trending Movies
- Fetches from 23 popular franchises (Avengers, Star Wars, Batman, Spider-Man, Harry Potter, and more)
- Returns 72 unique movies with valid posters
- Cached for 5 minutes for optimal performance

### Smart Filters
- 7 genre categories with custom icons
- AI-powered recommendations for each genre
- Pagination support with "Load More" functionality
- Filters for highly-rated movies (IMDb rating > 7.0)

### AI Suggestions
- Powered by Google Gemini 2.0 Flash
- Natural language input
- Considers user preferences, mood, and viewing history
- Returns detailed movie information

### Dark Mode
- Smooth theme transitions
- Persistent user preference (localStorage)
- Optimized for readability in both modes

## 📝 Scripts

- `npm run dev` - Start development server with hot reload (nodemon)
- `npm start` - Start production server

## 🚀 Deployment

### Deploy to Vercel (Recommended) ⚡

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Armaan1005/MovieMate)

**One-Click Deploy:**
1. Click the "Deploy with Vercel" button above
2. Connect your GitHub account
3. Add environment variables:
   - `OMDB_API_KEY` - Your OMDb API key
   - `GEMINI_API_KEY` - Your Google Gemini API key
   - `GEMINI_MODEL` - `gemini-2.0-flash-exp`
   - `PORT` - `3000`
4. Click "Deploy"
5. Your app will be live in minutes!

**Manual Deploy:**
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Follow the prompts to deploy
4. Add environment variables in Vercel Dashboard
5. Run `vercel --prod` to deploy to production

### Deploy to Render

1. Push your code to GitHub
2. Create a new Web Service on [Render](https://render.com)
3. Connect your repository
4. Set the build command: `npm install`
5. Set the start command: `npm start`
6. Add environment variables (`OMDB_API_KEY`, `GEMINI_API_KEY`)
7. Deploy!

### Deploy to Railway

1. Connect your GitHub repository at [Railway](https://railway.app)
2. Add environment variables in the dashboard
3. Railway will auto-detect and deploy

### Deploy to VPS

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone https://github.com/Armaan1005/MovieMate.git
cd MovieMate
npm install

# Use PM2 for process management
npm install -g pm2
pm2 start server.js --name moviemate
pm2 startup
pm2 save
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [OMDb API](https://www.omdbapi.com/) - Movie database
- [Google Gemini](https://ai.google.dev/) - AI recommendations
- [Font Awesome](https://fontawesome.com/) - Icons
- [Google Fonts](https://fonts.google.com/) - Poppins font

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

Made with ❤️ by Armaan Patel
