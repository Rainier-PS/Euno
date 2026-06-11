const MUSIC_TRACKS = [
  { name:'Lofi Hip Hop Radio', channel:'Chillhop Music', id:'jfKfPfyJRdk' },
  { name:'Chill Lofi Study Beats', channel:'Lo-Fi Beats', id:'5qap5aO4i9A' },
  { name:'Jazz & Bossa Nova', channel:'Café Music BGM', id:'Dx5qFachd3A' },
  { name:'Deep Focus Music', channel:'Greenred Productions', id:'WPni755-Krg' },
  { name:'Peaceful Piano', channel:'Soothing Relaxation', id:'1ZYbU82GVz4' }
];
let currentTrackIdx = 0;

export function initMusic() {
  updateMusicTrack();
  document.getElementById('play-music') && document.getElementById('play-music').addEventListener('click', () => {
    const iframe = document.getElementById('music-iframe');
    if (!iframe) return;
    const src = iframe.src;
    if (src.includes('autoplay=0')) {
      iframe.src = src.replace('autoplay=0','autoplay=1');
      document.getElementById('play-music').innerHTML = '<span class="material-icons-round" aria-hidden="true">pause</span>Pause';
    } else if (src.includes('autoplay=1')) {
      iframe.src = src.replace('autoplay=1','autoplay=0');
      document.getElementById('play-music').innerHTML = '<span class="material-icons-round" aria-hidden="true">play_arrow</span>Play';
    }
  });
  document.getElementById('prev-music') && document.getElementById('prev-music').addEventListener('click', () => {
    currentTrackIdx = (currentTrackIdx - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
    updateMusicTrack();
  });
  document.getElementById('next-music') && document.getElementById('next-music').addEventListener('click', () => {
    currentTrackIdx = (currentTrackIdx + 1) % MUSIC_TRACKS.length;
    updateMusicTrack();
  });
}

function updateMusicTrack() {
  const track = MUSIC_TRACKS[currentTrackIdx];
  const nameEl = document.getElementById('track-name'); if(nameEl) nameEl.textContent = track.name;
  const chanEl = document.getElementById('track-channel'); if(chanEl) chanEl.textContent = track.channel;
  const iframe = document.getElementById('music-iframe');
  if (iframe) iframe.src = `https://www.youtube.com/embed/${track.id}?autoplay=0`;
  const playBtn = document.getElementById('play-music');
  if (playBtn) playBtn.innerHTML = '<span class="material-icons-round" aria-hidden="true">play_arrow</span>Play';
}
