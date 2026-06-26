export interface Song {
  id: string;
  youtubeId: string;
  title: string;
  singerName: string;
  urduSingerName?: string;
  filmName?: string;
  decade: string; // '1950s', '1960s', '1970s', '1980s', '1990s'
  genre: string; // 'Ghazal', 'Thumri', 'Film Song', 'Qawwali', 'Folk', 'Pop'
  thumbnailUrl: string;
  durationSeconds?: number;
  playCount: number;
  isFeatured?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  songIds: string[];
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: string;
}

export interface SearchFilters {
  query?: string;
  decade?: string;
  genre?: string;
  singer?: string;
}
