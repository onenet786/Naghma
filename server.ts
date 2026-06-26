import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI client
let aiInstance: GoogleGenAI | null = null;

function getGeminiAI(): GoogleGenAI | null {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
      console.warn("GEMINI_API_KEY is not configured or is a placeholder. Server will fall back to local database for search.");
      return null;
    }
    try {
      aiInstance = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log("Gemini AI SDK initialized successfully.");
    } catch (e) {
      console.error("Failed to initialize Gemini AI SDK:", e);
      return null;
    }
  }
  return aiInstance;
}

// Search and suggestion caches to avoid redundant Gemini calls and prevent 429 quota errors
const searchCache = new Map<string, any[]>();
const suggestCache = new Map<string, any>();

// Local File-based Database paths
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

// Structure for JSON database
interface DbSchema {
  songs: any[];
  collections: any[];
  playlists: any[];
  favorites: string[]; // songIds
  recentHistory: string[]; // songIds
}

// Initial Curated Seed Songs
const SEED_SONGS = [
  {
    id: "song-mehdi-1",
    youtubeId: "_nE-1bN5pSg",
    title: "Ranjish Hi Sahi",
    singerName: "Mehdi Hassan",
    urduSingerName: "مہدی حسن",
    filmName: "Mohabbat",
    decade: "1970s",
    genre: "Ghazal",
    thumbnailUrl: "https://img.youtube.com/vi/_nE-1bN5pSg/0.jpg",
    playCount: 124,
    isFeatured: true
  },
  {
    id: "song-farida-1",
    youtubeId: "8yL0z_uR9hI",
    title: "Aaj Jaane Ki Zid Na Karo",
    singerName: "Farida Khanum",
    urduSingerName: "فریدہ خانم",
    decade: "1970s",
    genre: "Ghazal",
    thumbnailUrl: "https://img.youtube.com/vi/8yL0z_uR9hI/0.jpg",
    playCount: 245,
    isFeatured: true
  },
  {
    id: "song-mehdi-2",
    youtubeId: "P-bFpL_YI5A",
    title: "Zindagi Mein To Sabhi Pyar Kiya Karte Hain",
    singerName: "Mehdi Hassan",
    urduSingerName: "مہدی حسن",
    filmName: "Azmat",
    decade: "1970s",
    genre: "Ghazal",
    thumbnailUrl: "https://img.youtube.com/vi/P-bFpL_YI5A/0.jpg",
    playCount: 98,
    isFeatured: false
  },
  {
    id: "song-nusrat-1",
    youtubeId: "gP_g4C6uN7E",
    title: "Ye Jo Halka Halka Suroor Hai",
    singerName: "Nusrat Fateh Ali Khan",
    urduSingerName: "نصرت فتح علی خان",
    decade: "1990s",
    genre: "Qawwali",
    thumbnailUrl: "https://img.youtube.com/vi/gP_g4C6uN7E/0.jpg",
    playCount: 450,
    isFeatured: true
  },
  {
    id: "song-sabri-1",
    youtubeId: "W-YfC0SgB0o",
    title: "Tajdar-e-Haram",
    singerName: "Sabri Brothers",
    urduSingerName: "صابری برادران",
    decade: "1970s",
    genre: "Qawwali",
    thumbnailUrl: "https://img.youtube.com/vi/W-YfC0SgB0o/0.jpg",
    playCount: 312,
    isFeatured: true
  },
  {
    id: "song-noor-1",
    youtubeId: "7V1gZ2U5K7A",
    title: "Chandni Raaten",
    singerName: "Noor Jehan",
    urduSingerName: "نور جہاں",
    filmName: "Dopatta",
    decade: "1950s",
    genre: "Film Song",
    thumbnailUrl: "https://img.youtube.com/vi/7V1gZ2U5K7A/0.jpg",
    playCount: 189,
    isFeatured: true
  },
  {
    id: "song-iqbal-1",
    youtubeId: "dK_N0W1P3W8",
    title: "Hum Dekhenge",
    singerName: "Iqbal Bano",
    urduSingerName: "اقبال بانو",
    decade: "1980s",
    genre: "Ghazal",
    thumbnailUrl: "https://img.youtube.com/vi/dK_N0W1P3W8/0.jpg",
    playCount: 220,
    isFeatured: false
  },
  {
    id: "song-ghulam-1",
    youtubeId: "0yY-v6eNfL4",
    title: "Chupke Chupke Raat Din",
    singerName: "Ghulam Ali",
    urduSingerName: "غلام علی",
    decade: "1980s",
    genre: "Ghazal",
    thumbnailUrl: "https://img.youtube.com/vi/0yY-v6eNfL4/0.jpg",
    playCount: 175,
    isFeatured: false
  },
  {
    id: "song-alamgir-1",
    youtubeId: "b7QdC8Bv8aE",
    title: "Albela Rahi",
    singerName: "Alamgir",
    urduSingerName: "عالمگیر",
    decade: "1970s",
    genre: "Pop",
    thumbnailUrl: "https://img.youtube.com/vi/b7QdC8Bv8aE/0.jpg",
    playCount: 164,
    isFeatured: true
  },
  {
    id: "song-rushdi-1",
    youtubeId: "hK-867oW08s",
    title: "Ko Ko Korina",
    singerName: "Ahmed Rushdi",
    urduSingerName: "احمد رشدی",
    filmName: "Armaan",
    decade: "1960s",
    genre: "Film Song",
    thumbnailUrl: "https://img.youtube.com/vi/hK-867oW08s/0.jpg",
    playCount: 299,
    isFeatured: true
  },
  {
    id: "song-farida-2",
    youtubeId: "n_HlZit-5-8",
    title: "Dil Jalane Ki Baat Karte Ho",
    singerName: "Farida Khanum",
    urduSingerName: "فریدہ خانم",
    decade: "1970s",
    genre: "Ghazal",
    thumbnailUrl: "https://img.youtube.com/vi/n_HlZit-5-8/0.jpg",
    playCount: 85,
    isFeatured: false
  },
  {
    id: "song-runa-1",
    youtubeId: "37p9j3bWJNo",
    title: "Dama Dam Mast Qalandar",
    singerName: "Runa Laila",
    urduSingerName: "رونا لیلیٰ",
    decade: "1970s",
    genre: "Folk",
    thumbnailUrl: "https://img.youtube.com/vi/37p9j3bWJNo/0.jpg",
    playCount: 198,
    isFeatured: false
  },
  {
    id: "song-nayyara-1",
    youtubeId: "7C_Z_x93yJg",
    title: "Ae Jazba-e-Dil Gar Main Chahoon",
    singerName: "Nayyara Noor",
    urduSingerName: "نیرہ نور",
    decade: "1980s",
    genre: "Ghazal",
    thumbnailUrl: "https://img.youtube.com/vi/7C_Z_x93yJg/0.jpg",
    playCount: 142,
    isFeatured: false
  },
  {
    id: "song-nusrat-2",
    youtubeId: "Mvj2oK6LgYk",
    title: "Mere Rashke Qamar",
    singerName: "Nusrat Fateh Ali Khan",
    urduSingerName: "نصرت فتح علی خان",
    decade: "1980s",
    genre: "Qawwali",
    thumbnailUrl: "https://img.youtube.com/vi/Mvj2oK6LgYk/0.jpg",
    playCount: 388,
    isFeatured: false
  },
  {
    id: "song-nayyara-2",
    youtubeId: "gNf-V5P89uY",
    title: "Watan Ki Mitti Gawah Rehna",
    singerName: "Nayyara Noor",
    urduSingerName: "نیرہ نور",
    decade: "1980s",
    genre: "Folk",
    thumbnailUrl: "https://img.youtube.com/vi/gNf-V5P89uY/0.jpg",
    playCount: 120,
    isFeatured: false
  },
  {
    id: "song-runa-2",
    youtubeId: "1f_I9O-4n8k",
    title: "Mera Babu Chhail Chhabila",
    singerName: "Runa Laila",
    urduSingerName: "رونا لیلیٰ",
    decade: "1970s",
    genre: "Pop",
    thumbnailUrl: "https://img.youtube.com/vi/1f_I9O-4n8k/0.jpg",
    playCount: 156,
    isFeatured: false
  },
  {
    id: "song-mehdi-3",
    youtubeId: "yGZ_Z3Cq5S8",
    title: "Gulon Mein Rang Bhare",
    singerName: "Mehdi Hassan",
    urduSingerName: "مہدی حسن",
    filmName: "Farangi",
    decade: "1960s",
    genre: "Ghazal",
    thumbnailUrl: "https://img.youtube.com/vi/yGZ_Z3Cq5S8/0.jpg",
    playCount: 110,
    isFeatured: false
  },
  {
    id: "song-nusrat-3",
    youtubeId: "9_U_A-pP880",
    title: "Lal Meri Pat Rakhiyo",
    singerName: "Nusrat Fateh Ali Khan",
    urduSingerName: "نصرت فتح علی خان",
    decade: "1990s",
    genre: "Qawwali",
    thumbnailUrl: "https://img.youtube.com/vi/9_U_A-pP880/0.jpg",
    playCount: 280,
    isFeatured: false
  },
  {
    id: "song-nusrat-4",
    youtubeId: "GjE8-L2m9g0",
    title: "Tumhe Dillagi Bhool Jani Paregi",
    singerName: "Nusrat Fateh Ali Khan",
    urduSingerName: "نصرت فتح علی خان",
    decade: "1990s",
    genre: "Qawwali",
    thumbnailUrl: "https://img.youtube.com/vi/GjE8-L2m9g0/0.jpg",
    playCount: 420,
    isFeatured: true
  },
  {
    id: "song-iqbal-2",
    youtubeId: "C2M_L69_vU0",
    title: "Dasht-e-Tanhai Mein",
    singerName: "Iqbal Bano",
    urduSingerName: "اقبال بانو",
    decade: "1980s",
    genre: "Ghazal",
    thumbnailUrl: "https://img.youtube.com/vi/C2M_L69_vU0/0.jpg",
    playCount: 95,
    isFeatured: false
  }
];

// Initial Curated Seed Collections
const SEED_COLLECTIONS = [
  {
    id: "col-mehdi",
    name: "Mehdi Hassan's Ghazal Gems",
    description: "The Shahenshah-e-Ghazal's timeless, majestic masterpieces of love, loss, and poetry.",
    coverImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=60",
    songIds: ["song-mehdi-1", "song-mehdi-2", "song-mehdi-3"]
  },
  {
    id: "col-noor",
    name: "Noor Jehan Film Classics",
    description: "Iconic cinematic melodies sung by Malika-e-Tarannum, Madam Noor Jehan.",
    coverImage: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&auto=format&fit=crop&q=60",
    songIds: ["song-noor-1", "song-rushdi-1"]
  },
  {
    id: "col-qawwali",
    name: "Golden Era Qawwali Classics",
    description: "Immersive Sufi ecstasy from legends Nusrat Fateh Ali Khan and the Sabri Brothers.",
    coverImage: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&auto=format&fit=crop&q=60",
    songIds: ["song-nusrat-1", "song-nusrat-2", "song-nusrat-3", "song-nusrat-4", "song-sabri-1"]
  },
  {
    id: "col-folk",
    name: "Sufi & Folk Heritage",
    description: "Rich traditional folk, ghazals, and regional melodies that celebrate pure Pakistani soul.",
    coverImage: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=60",
    songIds: ["song-farida-1", "song-farida-2", "song-iqbal-1", "song-iqbal-2", "song-runa-1", "song-nayyara-1", "song-nayyara-2"]
  },
  {
    id: "col-pop",
    name: "PTV Nostalgia & Pop Legends",
    description: "Nostalgic 70s and 80s tunes that defined the golden age of television and pop music.",
    coverImage: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&auto=format&fit=crop&q=60",
    songIds: ["song-alamgir-1", "song-runa-2"]
  }
];

// Load or Seed Database helper
function getDatabase(): DbSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialDb: DbSchema = {
      songs: SEED_SONGS,
      collections: SEED_COLLECTIONS,
      playlists: [
        {
          id: "playlist-my-favs",
          name: "Mera Guldasta (My Favorites)",
          songIds: ["song-mehdi-1", "song-farida-1", "song-nusrat-1"],
          createdAt: new Date().toISOString()
        }
      ],
      favorites: ["song-mehdi-1", "song-farida-1", "song-nusrat-1"],
      recentHistory: ["song-mehdi-1"]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
    return initialDb;
  }

  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Database reading failed, using in-memory fallbacks", e);
    return {
      songs: SEED_SONGS,
      collections: SEED_COLLECTIONS,
      playlists: [],
      favorites: [],
      recentHistory: []
    };
  }
}

function saveDatabase(db: DbSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (e) {
    console.error("Database saving failed:", e);
  }
}

// REST API Endpoints

// GET /api/songs - Gets all songs or filters them
app.get("/api/songs", (req, res) => {
  const db = getDatabase();
  let results = [...db.songs];

  const { decade, genre, query } = req.query;

  if (decade) {
    results = results.filter(s => s.decade === decade);
  }

  if (genre) {
    results = results.filter(s => s.genre === genre);
  }

  if (query) {
    const q = (query as string).toLowerCase();
    results = results.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.singerName.toLowerCase().includes(q) ||
      (s.urduSingerName && s.urduSingerName.includes(q)) ||
      (s.filmName && s.filmName.toLowerCase().includes(q))
    );
  }

  res.json(results);
});

// GET /api/search - Integrates Gemini-powered real-time discovery search with Google Search Grounding
app.get("/api/search", async (req, res) => {
  const db = getDatabase();
  const query = (req.query.q as string) || "";
  const filterDecade = req.query.decade as string;
  const filterGenre = req.query.genre as string;

  console.log(`Search request received: q="${query}", decade="${filterDecade}", genre="${filterGenre}"`);

  // Check searchCache to prevent hitting Gemini rate limits (429 Quota Exhausted)
  const cacheKey = `${query.toLowerCase().trim()}_${filterDecade || ""}_${filterGenre || ""}`;
  if (searchCache.has(cacheKey)) {
    console.log(`[Cache Hit] Returning cached search results for: "${cacheKey}"`);
    return res.json(searchCache.get(cacheKey));
  }

  // First, search inside local pre-populated database
  let localResults = [...db.songs];
  if (filterDecade) {
    localResults = localResults.filter(s => s.decade === filterDecade);
  }
  if (filterGenre) {
    localResults = localResults.filter(s => s.genre === filterGenre);
  }
  if (query.trim() !== "") {
    const q = query.toLowerCase().trim();
    localResults = localResults.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.singerName.toLowerCase().includes(q) ||
      (s.filmName && s.filmName.toLowerCase().includes(q)) ||
      (s.genre && s.genre.toLowerCase().includes(q)) ||
      (s.decade && s.decade.toLowerCase().includes(q))
    );
  }

  // If query is empty or we have plenty of local matches, or if Gemini API key is missing, return local results
  const ai = getGeminiAI();
  if (!query || localResults.length >= 4 || !ai) {
    console.log(`Returning ${localResults.length} local search results.`);
    // Cache the local results too, so we don't recalculate
    searchCache.set(cacheKey, localResults);
    return res.json(localResults);
  }

  // Dynamic search via Gemini Grounding
  try {
    console.log(`Leveraging Gemini Grounded Web Search for: "${query}"`);
    const prompt = `Find the top 3 YouTube video IDs for vintage Pakistani classics / old Pakistani songs related to the query: "${query}".
For each song, extract:
- Title of the song
- Singer / Artist name
- General decade (e.g., 1950s, 1960s, 1970s, 1980s, 1990s)
- Genre (e.g., Ghazal, Qawwali, Folk, Pop, Film Song)
- The exact YouTube video ID. Look carefully at search grounding URLs or video signatures (e.g., watch?v=VIDEO_ID).

Your response MUST be a JSON array of objects conforming to the requested schema. Return empty array if absolutely no matches.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              youtubeId: { type: Type.STRING, description: "The YouTube Video ID (e.g., hK-867oW08s)" },
              title: { type: Type.STRING, description: "The exact name of the song" },
              singerName: { type: Type.STRING, description: "The legendary singer name" },
              decade: { type: Type.STRING, description: "The decade, must be one of: 1950s, 1960s, 1970s, 1980s, 1990s" },
              genre: { type: Type.STRING, description: "The genre, must be one of: Ghazal, Qawwali, Folk, Pop, Film Song" }
            },
            required: ["youtubeId", "title", "singerName", "decade", "genre"]
          }
        }
      }
    });

    const text = response.text?.trim() || "[]";
    const dynamicSongs = JSON.parse(text);

    console.log("Parsed dynamic search results from Gemini:", dynamicSongs);

    // Filter out invalid items (missing youtube ID) and convert them to full Song objects
    const formattedDynamicSongs = dynamicSongs
      .filter((s: any) => s.youtubeId && s.youtubeId.length > 3)
      .map((s: any, idx: number) => {
        // Generate a stable dynamic ID
        const cleanTitle = s.title.toLowerCase().replace(/[^a-z0-9]/g, "-");
        return {
          id: `song-dyn-${cleanTitle}-${idx}`,
          youtubeId: s.youtubeId,
          title: s.title,
          singerName: s.singerName,
          decade: s.decade || "1980s",
          genre: s.genre || "Ghazal",
          thumbnailUrl: `https://img.youtube.com/vi/${s.youtubeId}/0.jpg`,
          playCount: Math.floor(Math.random() * 50) + 10,
          isFeatured: false
        };
      });

    // Add these dynamic songs to our persistent songs cache so they can be favorited/added to playlists!
    let updated = false;
    formattedDynamicSongs.forEach((dynSong: any) => {
      const exists = db.songs.find(s => s.youtubeId === dynSong.youtubeId);
      if (!exists) {
        db.songs.push(dynSong);
        updated = true;
      }
    });

    if (updated) {
      saveDatabase(db);
    }

    // Combine local results and dynamic results (deduplicating by youtubeId)
    const combined = [...localResults];
    formattedDynamicSongs.forEach((dynSong: any) => {
      if (!combined.some(s => s.youtubeId === dynSong.youtubeId)) {
        combined.push(dynSong);
      }
    });

    // Save to memory cache to reduce quota usage and speed up UI response
    searchCache.set(cacheKey, combined);
    res.json(combined);
  } catch (error) {
    console.error("Gemini search failed, falling back strictly to local search:", error);
    // Even if Gemini fails, return local results so the user gets a seamless experience
    res.json(localResults);
  }
});

// GET /api/collections - Gets all curated collections
app.get("/api/collections", (req, res) => {
  const db = getDatabase();
  res.json(db.collections);
});

// GET /api/collections/:id - Gets a specific collection with its song items
app.get("/api/collections/:id", (req, res) => {
  const db = getDatabase();
  const collection = db.collections.find(c => c.id === req.params.id);
  if (!collection) {
    return res.status(404).json({ error: "Collection not found" });
  }

  // Populate song objects
  const songs = collection.songIds
    .map(id => db.songs.find(s => s.id === id))
    .filter(Boolean);

  res.json({
    ...collection,
    songs
  });
});

// GET /api/discover - Surprise me endpoint, returns a random classic song
app.get("/api/discover", (req, res) => {
  const db = getDatabase();
  if (db.songs.length === 0) {
    return res.status(404).json({ error: "No songs available" });
  }
  const randomIndex = Math.floor(Math.random() * db.songs.length);
  res.json(db.songs[randomIndex]);
});

// GET /api/singer/:name - Get songs by specific singer
app.get("/api/singer/:name", (req, res) => {
  const db = getDatabase();
  const name = req.params.name.toLowerCase();
  const results = db.songs.filter(s => 
    s.singerName.toLowerCase().includes(name) ||
    (s.urduSingerName && s.urduSingerName.toLowerCase().includes(name))
  );
  res.json(results);
});

// GET /api/trending - Gets the trending songs (sorted by play_count)
app.get("/api/trending", (req, res) => {
  const db = getDatabase();
  const sorted = [...db.songs].sort((a, b) => b.playCount - a.playCount);
  res.json(sorted.slice(0, 8));
});

// POST /api/songs/:id/play - Track play counts internally
app.post("/api/songs/:id/play", (req, res) => {
  const db = getDatabase();
  const song = db.songs.find(s => s.id === req.params.id);
  if (song) {
    song.playCount = (song.playCount || 0) + 1;
    
    // Add to recent history, avoiding duplicates
    db.recentHistory = [song.id, ...db.recentHistory.filter(id => id !== song.id)].slice(0, 15);
    
    saveDatabase(db);
    return res.json({ success: true, playCount: song.playCount });
  }
  res.status(404).json({ error: "Song not found" });
});

// Playlists API

// GET /api/playlists - Get all playlists
app.get("/api/playlists", (req, res) => {
  const db = getDatabase();
  res.json(db.playlists);
});

// POST /api/playlists - Create new playlist
app.post("/api/playlists", (req, res) => {
  const db = getDatabase();
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Playlist name is required" });
  }

  const newPlaylist = {
    id: `playlist-${Date.now()}`,
    name,
    songIds: [],
    createdAt: new Date().toISOString()
  };

  db.playlists.push(newPlaylist);
  saveDatabase(db);
  res.status(210).json(newPlaylist);
});

// POST /api/playlists/:id/add - Add song to playlist
app.post("/api/playlists/:id/add", (req, res) => {
  const db = getDatabase();
  const playlist = db.playlists.find(p => p.id === req.params.id);
  const { songId } = req.body;

  if (!playlist) {
    return res.status(404).json({ error: "Playlist not found" });
  }
  if (!songId) {
    return res.status(400).json({ error: "Song ID is required" });
  }

  if (!playlist.songIds.includes(songId)) {
    playlist.songIds.push(songId);
    saveDatabase(db);
  }

  res.json(playlist);
});

// POST /api/playlists/:id/remove - Remove song from playlist
app.post("/api/playlists/:id/remove", (req, res) => {
  const db = getDatabase();
  const playlist = db.playlists.find(p => p.id === req.params.id);
  const { songId } = req.body;

  if (!playlist) {
    return res.status(404).json({ error: "Playlist not found" });
  }

  playlist.songIds = playlist.songIds.filter(id => id !== songId);
  saveDatabase(db);
  res.json(playlist);
});

// Favorites API

// GET /api/favorites - Get all favorite songs
app.get("/api/favorites", (req, res) => {
  const db = getDatabase();
  const favSongs = db.favorites
    .map(id => db.songs.find(s => s.id === id))
    .filter(Boolean);
  res.json(favSongs);
});

// POST /api/favorites/toggle - Toggle favorite status of a song
app.post("/api/favorites/toggle", (req, res) => {
  const db = getDatabase();
  const { songId } = req.body;
  if (!songId) {
    return res.status(400).json({ error: "Song ID is required" });
  }

  const isFav = db.favorites.includes(songId);
  if (isFav) {
    db.favorites = db.favorites.filter(id => id !== songId);
  } else {
    db.favorites.push(songId);
  }

  saveDatabase(db);
  res.json({ songId, isFavorite: !isFav });
});

// GET /api/history - Get recently played songs
app.get("/api/history", (req, res) => {
  const db = getDatabase();
  const historySongs = db.recentHistory
    .map(id => db.songs.find(s => s.id === id))
    .filter(Boolean);
  res.json(historySongs);
});

// GET /api/gemini/suggest - Uses Gemini to suggest dynamic playlist/songs based on a theme or current mood
app.get("/api/gemini/suggest", async (req, res) => {
  const theme = (req.query.theme as string) || "romantic ghazal";
  const cacheKey = theme.toLowerCase().trim();

  // Try to use cache first to conserve Gemini quota and avoid 429 errors
  if (suggestCache.has(cacheKey)) {
    console.log(`[Cache Hit] Returning cached suggestions for theme: "${cacheKey}"`);
    return res.json(suggestCache.get(cacheKey));
  }

  // Pre-configured elegant poetic local fallbacks matching keywords
  const getFallbackGuldasta = () => {
    const lowerTheme = theme.toLowerCase();
    if (lowerTheme.includes("ghazal") || lowerTheme.includes("romantic") || lowerTheme.includes("sad") || lowerTheme.includes("love")) {
      return {
        title: "Sham-e-Ghazal: Melancholy of the Soul (شامِ غزل)",
        vibeDescription: "Timeless compositions of longing, devotion, and poetry sung by legendary monarchs of Ghazal.",
        suggestions: [
          { title: "Ranjish Hi Sahi", singer: "Mehdi Hassan" },
          { title: "Aaj Jaane Ki Zid Na Karo", singer: "Farida Khanum" },
          { title: "Dil Jalane Ki Baat Karte Ho", singer: "Farida Khanum" },
          { title: "Dasht-e-Tanhai Mein", singer: "Iqbal Bano" }
        ]
      };
    } else if (lowerTheme.includes("qawwali") || lowerTheme.includes("sufi") || lowerTheme.includes("devotional") || lowerTheme.includes("spiritual") || lowerTheme.includes("ecstasy")) {
      return {
        title: "Sura-e-Sufiyana: Spiritual Ecstasy (سرِ صوفیانہ)",
        vibeDescription: "High-energy mystic rhythms and celestial devotional qawwalis to spark transcendental joy and peaceful trance.",
        suggestions: [
          { title: "Ye Jo Halka Halka Suroor Hai", singer: "Nusrat Fateh Ali Khan" },
          { title: "Tajdar-e-Haram", singer: "Sabri Brothers" },
          { title: "Tumhe Dillagi Bhool Jani Paregi", singer: "Nusrat Fateh Ali Khan" },
          { title: "Lal Meri Pat Rakhiyo", singer: "Nusrat Fateh Ali Khan" }
        ]
      };
    } else if (lowerTheme.includes("pop") || lowerTheme.includes("happy") || lowerTheme.includes("upbeat") || lowerTheme.includes("dance") || lowerTheme.includes("party")) {
      return {
        title: "Tarang: Retro Pop Legends (ترنگ)",
        vibeDescription: "Vibrant retro tunes, foot-tapping pop, and breezy film melodies from the golden era of Pakistani music.",
        suggestions: [
          { title: "Ko Ko Korina", singer: "Ahmed Rushdi" },
          { title: "Mera Babu Chhail Chhabila", singer: "Runa Laila" },
          { title: "Albela Rahi", singer: "Alamgir" },
          { title: "Dama Dam Mast Qalandar", singer: "Runa Laila" }
        ]
      };
    } else if (lowerTheme.includes("patriotic") || lowerTheme.includes("watan") || lowerTheme.includes("national") || lowerTheme.includes("folk") || lowerTheme.includes("heritage")) {
      return {
        title: "Sohni Dharti: Cultural Roots (سوہنی دھرتی)",
        vibeDescription: "Socio-cultural and national folk anthems expressing pure devotion, rustic colors, and pride in our soil.",
        suggestions: [
          { title: "Watan Ki Mitti Gawah Rehna", singer: "Nayyara Noor" },
          { title: "Dama Dam Mast Qalandar", singer: "Runa Laila" },
          { title: "Ae Jazba-e-Dil Gar Main Chahoon", singer: "Nayyara Noor" },
          { title: "Hum Dekhenge", singer: "Iqbal Bano" }
        ]
      };
    }

    // Default general classic guldasta
    return {
      title: "Guldasta-e-Mausiqi: Eternal Masterpieces (گلدستۂ موسیقی)",
      vibeDescription: "A handpicked selection of eternal vintage Pakistani classics curated for your aesthetic pleasure.",
      suggestions: [
        { title: "Ranjish Hi Sahi", singer: "Mehdi Hassan" },
        { title: "Aaj Jaane Ki Zid Na Karo", singer: "Farida Khanum" },
        { title: "Ye Jo Halka Halka Suroor Hai", singer: "Nusrat Fateh Ali Khan" },
        { title: "Tajdar-e-Haram", singer: "Sabri Brothers" }
      ]
    };
  };

  const ai = getGeminiAI();
  if (!ai) {
    console.log("No Gemini API key available, using beautiful local fallback guldasta.");
    const fallback = getFallbackGuldasta();
    suggestCache.set(cacheKey, fallback);
    return res.json(fallback);
  }

  try {
    const prompt = `Based on the musical vibe/theme: "${theme}", curate a list of 4 classic Pakistani songs (1950s-1990s). Provide a poetic Urdu-themed guldasta title, a beautiful short guldasta description in English, and the suggested songs.
    
Your response MUST be JSON format conforming to the requested schema. Ensure the songs are authentic classic Pakistani songs from legends like Mehdi Hassan, Noor Jehan, Ghulam Ali, Iqbal Bano, Abida Parveen, Nayyara Noor, Nusrat Fateh Ali Khan, etc.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Poetic title in English and Urdu roman script (e.g., Shaam-e-Ghazal: Evening of Solitude)" },
            vibeDescription: { type: Type.STRING, description: "A gorgeous, poetic description explaining why these songs fit the theme" },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Song title" },
                  singer: { type: Type.STRING, description: "Legendary Pakistani singer name" }
                },
                required: ["title", "singer"]
              }
            }
          },
          required: ["title", "vibeDescription", "suggestions"]
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    // Save to suggestCache
    suggestCache.set(cacheKey, parsed);
    res.json(parsed);
  } catch (error) {
    console.error("Gemini song suggestions failed, applying robust fallback:", error);
    // On failure/quota exhaust (429), fall back to beautiful local guldastas seamlessly!
    const fallback = getFallbackGuldasta();
    res.json(fallback);
  }
});

// Vite Middleware integration for assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Naghma Server is active and listening on http://localhost:${PORT}`);
  });
}

startServer();
