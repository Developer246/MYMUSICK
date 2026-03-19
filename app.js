const BACKEND = "%%BACKEND_URL%%";

/* ═══════════════════════════════════════════
   ELEMENTOS DOM
═══════════════════════════════════════════ */
const searchInput    = document.getElementById("searchInput");
const searchSpinner  = document.getElementById("searchSpinner");
const resultsEl      = document.getElementById("results");
const resultsRoot    = document.getElementById("resultsRoot");
const homeState      = document.getElementById("homeState");
const songsSection   = document.getElementById("songsSection");
const artistsSection = document.getElementById("artistsSection");
const albumsSection  = document.getElementById("albumsSection");
const artistsGrid    = document.getElementById("artistsGrid");
const albumsGrid     = document.getElementById("albumsGrid");

const playPauseBtn   = document.getElementById("playPauseBtn");
const prevBtn        = document.getElementById("prevBtn");
const nextBtn        = document.getElementById("nextBtn");
const nowPlaying     = document.getElementById("nowPlaying");
const playerArtist   = document.getElementById("playerArtist");
const playerThumb    = document.getElementById("playerThumb");
const volumeSlider   = document.getElementById("volumeSlider");
const progressBar    = document.getElementById("progressBar");
const currentTimeEl  = document.getElementById("currentTime");
const durationEl     = document.getElementById("duration");
const player         = document.getElementById("player");
const openLoginBtn   = document.getElementById("openLogin");
const closeLoginBtn  = document.getElementById("closeLogin");
const loginModal     = document.getElementById("loginModal");

/* ═══════════════════════════════════════════
   AUDIO + ESTADO
═══════════════════════════════════════════ */
const audio = new Audio();
audio.volume = 0.8;

let currentSongIndex = -1;
let currentSongs     = [];   // lista activa de canciones
let currentSongCard  = null;
let searchTimeout    = null;
let activeCardCanvas = null;
let cardVizRunning   = false;

/* ═══════════════════════════════════════════
   EVENTOS DE AUDIO
═══════════════════════════════════════════ */
audio.addEventListener("play", () => {
  playPauseBtn.textContent = "⏸";
  playPauseBtn.classList.add("playing");
});

audio.addEventListener("pause", () => {
  playPauseBtn.textContent = "▶";
  playPauseBtn.classList.remove("playing");
  stopCardViz();
});

audio.addEventListener("ended", () => {
  playPauseBtn.textContent = "▶";
  playPauseBtn.classList.remove("playing");
  stopCardViz();
  resetCurrentCard();
  playNext();
});

audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  progressBar.value       = audio.currentTime / audio.duration;
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationEl.textContent    = formatTime(audio.duration);
});

progressBar.oninput = () => {
  if (audio.duration) audio.currentTime = progressBar.value * audio.duration;
};

/* ═══════════════════════════════════════════
   UTILIDADES
═══════════════════════════════════════════ */
function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function resetCurrentCard() {
  if (currentSongCard) {
    currentSongCard.classList.remove("active-song");
    const icon = currentSongCard.querySelector(".song-play-icon");
    if (icon) icon.textContent = "▶";
    currentSongCard = null;
  }
}

function showSection(section, show) {
  section.style.display = show ? "block" : "none";
}

/* ═══════════════════════════════════════════
   VOLUMEN / PLAY-PAUSE
═══════════════════════════════════════════ */
volumeSlider.oninput = () => { audio.volume = parseFloat(volumeSlider.value); };
playPauseBtn.onclick = () => { audio.paused ? audio.play() : audio.pause(); };

/* ═══════════════════════════════════════════
   PREV / NEXT
═══════════════════════════════════════════ */
prevBtn.onclick = () => {
  if (currentSongs.length === 0) return;
  const idx = currentSongIndex > 0 ? currentSongIndex - 1 : currentSongs.length - 1;
  playSongAtIndex(idx);
};

nextBtn.onclick = () => playNext();

function playNext() {
  if (currentSongs.length === 0) return;
  const idx = currentSongIndex < currentSongs.length - 1 ? currentSongIndex + 1 : 0;
  playSongAtIndex(idx);
}

function playSongAtIndex(idx) {
  const song = currentSongs[idx];
  if (!song) return;
  const card = resultsEl.children[idx];
  const icon = card?.querySelector(".song-play-icon");
  const cnv  = card?.querySelector("canvas");
  loadSong(song, card, icon, cnv, idx);
}

/* ═══════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════ */
openLoginBtn?.addEventListener("click", () => loginModal.showModal());
closeLoginBtn?.addEventListener("click", () => loginModal.close());

/* ═══════════════════════════════════════════
   BÚSQUEDA CON DEBOUNCE
═══════════════════════════════════════════ */
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();

  if (!q) {
    homeState.style.display    = "flex";
    resultsRoot.style.display  = "none";
    return;
  }

  searchTimeout = setTimeout(() => buscar(q), 450);
});

async function buscar(query) {
  // Mostrar spinner, ocultar home
  searchSpinner.style.display = "block";
  homeState.style.display     = "none";
  resultsRoot.style.display   = "block";

  // Limpiar secciones mientras carga
  resultsEl.innerHTML    = '<p class="status-msg">Buscando…</p>';
  artistsGrid.innerHTML  = "";
  albumsGrid.innerHTML   = "";

  try {
    const resp = await fetch(`${BACKEND}/search?q=${encodeURIComponent(query)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data    = await resp.json();
    const songs   = Array.isArray(data.songs)   ? data.songs   : [];
    const artists = Array.isArray(data.artists) ? data.artists : [];
    const albums  = Array.isArray(data.albums)  ? data.albums  : [];

    currentSongs     = songs;
    currentSongIndex = -1;

    // — Canciones —
    if (songs.length > 0) {
      renderSongs(songs);
      showSection(songsSection, true);
    } else {
      resultsEl.innerHTML = '<p class="status-msg">Sin canciones.</p>';
      showSection(songsSection, true);
    }

    // — Artistas —
    if (artists.length > 0) {
      renderArtists(artists);
      showSection(artistsSection, true);
    } else {
      showSection(artistsSection, false);
    }

    // — Álbumes —
    if (albums.length > 0) {
      renderAlbums(albums);
      showSection(albumsSection, true);
    } else {
      showSection(albumsSection, false);
    }

    // Si no hay nada
    if (songs.length === 0 && artists.length === 0 && albums.length === 0) {
      resultsEl.innerHTML = '<p class="status-msg">No se encontraron resultados.</p>';
    }

  } catch (err) {
    console.error("Error en búsqueda:", err);
    resultsEl.innerHTML = '<p class="status-msg">❌ Error al buscar. Revisa tu conexión.</p>';
    showSection(songsSection, true);
    showSection(artistsSection, false);
    showSection(albumsSection, false);
  } finally {
    searchSpinner.style.display = "none";
  }
}

/* ═══════════════════════════════════════════
   RENDER — CANCIONES
═══════════════════════════════════════════ */
function renderSongs(songs) {
  resultsEl.innerHTML = "";

  songs.forEach((song, i) => {
    const card = document.createElement("div");
    card.className = "song";
    card.style.animationDelay = `${i * 0.035}s`;

    // Imagen + canvas visualizador
    const imgWrap = document.createElement("div");
    imgWrap.className = "song-img-wrap";

    const img = document.createElement("img");
    img.src     = song.thumbnail || "";
    img.alt     = song.title || "Sin título";
    img.loading = "lazy";
    // Fallback si maxresdefault no existe
    img.onerror = () => { img.src = `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`; };

    const cnv = document.createElement("canvas");
    cnv.className = "card-viz";

    imgWrap.append(img, cnv);

    // Info
    const info = document.createElement("div");
    info.className = "song-info";

    const titleEl = document.createElement("strong");
    titleEl.textContent = song.title || "Sin título";

    const artistEl = document.createElement("small");
    artistEl.textContent = song.artist || "Artista desconocido";

    info.append(titleEl, artistEl);

    // Álbum
    const albumEl = document.createElement("span");
    albumEl.className   = "song-album";
    albumEl.textContent = song.album || "";

    // Duración
    const durEl = document.createElement("span");
    durEl.className   = "song-duration";
    durEl.textContent = song.duration || "";

    // Icono play
    const playIcon = document.createElement("div");
    playIcon.className   = "song-play-icon";
    playIcon.textContent = "▶";

    card.append(imgWrap, info, albumEl, durEl, playIcon);

    card.addEventListener("click", () => {
      if (currentSongCard === card) {
        audio.paused ? audio.play() : audio.pause();
        return;
      }
      loadSong(song, card, playIcon, cnv, i);
    });

    resultsEl.appendChild(card);
  });
}

/* ═══════════════════════════════════════════
   RENDER — ARTISTAS
═══════════════════════════════════════════ */
function renderArtists(artists) {
  artistsGrid.innerHTML = "";

  artists.forEach((artist, i) => {
    const card = document.createElement("div");
    card.className = "artist-card";
    card.style.animationDelay = `${i * 0.05}s`;

    if (artist.thumbnail) {
      const img = document.createElement("img");
      img.className = "artist-avatar";
      img.src       = artist.thumbnail;
      img.alt       = artist.name || "";
      img.loading   = "lazy";
      img.onerror   = () => img.replaceWith(placeholderAvatar());
      card.appendChild(img);
    } else {
      card.appendChild(placeholderAvatar());
    }

    const name = document.createElement("span");
    name.className   = "artist-name";
    name.textContent = artist.name || "Artista";

    card.appendChild(name);

    if (artist.subscribers) {
      const subs = document.createElement("span");
      subs.className   = "artist-subs";
      subs.textContent = artist.subscribers;
      card.appendChild(subs);
    }

    artistsGrid.appendChild(card);
  });
}

function placeholderAvatar() {
  const div = document.createElement("div");
  div.className   = "artist-avatar-placeholder";
  div.textContent = "🎤";
  return div;
}

/* ═══════════════════════════════════════════
   RENDER — ÁLBUMES
═══════════════════════════════════════════ */
function renderAlbums(albums) {
  albumsGrid.innerHTML = "";

  albums.forEach((album, i) => {
    const card = document.createElement("div");
    card.className = "album-card";
    card.style.animationDelay = `${i * 0.05}s`;

    if (album.thumbnail) {
      const img = document.createElement("img");
      img.className = "album-cover";
      img.src       = album.thumbnail;
      img.alt       = album.title || "";
      img.loading   = "lazy";
      img.onerror   = () => img.replaceWith(placeholderCover());
      card.appendChild(img);
    } else {
      card.appendChild(placeholderCover());
    }

    const title = document.createElement("span");
    title.className   = "album-title";
    title.textContent = album.title || "Álbum";

    const meta = document.createElement("span");
    meta.className   = "album-meta";
    meta.textContent = [album.artist, album.year].filter(Boolean).join(" · ");

    card.append(title, meta);
    albumsGrid.appendChild(card);
  });
}

function placeholderCover() {
  const div = document.createElement("div");
  div.className   = "album-cover-placeholder";
  div.textContent = "💿";
  return div;
}

/* ═══════════════════════════════════════════
   CARGAR Y REPRODUCIR CANCIÓN
═══════════════════════════════════════════ */
function loadSong(song, card, playIcon, cnv, index) {
  resetCurrentCard();
  stopCardViz();

  currentSongCard  = card;
  currentSongIndex = index ?? -1;

  if (card) {
    card.classList.add("active-song");
    if (playIcon) playIcon.textContent = "⏸";
  }

  // Actualizar player
  player.style.display      = "flex";
  nowPlaying.textContent    = song.title  || "Sin título";
  playerArtist.textContent  = song.artist || "";
  playerThumb.src           = song.thumbnail || "";
  playerThumb.onerror       = () => { playerThumb.src = ""; };

  progressBar.value         = 0;
  currentTimeEl.textContent = "0:00";
  durationEl.textContent    = "0:00";

  audio.src = `${BACKEND}/stream/${song.id}`;
  audio.play()
    .then(() => {
      if (cnv && card) {
        const imgEl = card.querySelector("img");
        cnv.width  = imgEl?.offsetWidth  || 52;
        cnv.height = imgEl?.offsetHeight || 52;
        startCardViz(cnv);
      }
    })
    .catch(err => console.warn("Reproducción bloqueada:", err));
}

/* ═══════════════════════════════════════════
   VISUALIZADOR DE BARRAS
═══════════════════════════════════════════ */
function startCardViz(cnv) {
  if (activeCardCanvas === cnv && cardVizRunning) return;
  stopCardViz();

  activeCardCanvas = cnv;
  cardVizRunning   = true;
  cnv.classList.add("card-viz-active");

  const ctx  = cnv.getContext("2d");
  const bars = 12;
  const barW = cnv.width / bars;

  function draw() {
    if (!cardVizRunning || activeCardCanvas !== cnv) return;
    requestAnimationFrame(draw);

    ctx.clearRect(0, 0, cnv.width, cnv.height);
    const center = cnv.height / 2;
    const t      = Date.now() / 280;

    for (let i = 0; i < bars; i++) {
      const h = (Math.sin(t + i * 0.5) * 0.5 + 0.5)
              * (Math.sin(t * 0.6 + i * 0.3) * 0.3 + 0.7)
              * center * 0.85 + 2;

      ctx.fillStyle = "#04CDA8";
      ctx.fillRect(i * barW + 1, center - h, barW - 2, h);
      ctx.fillRect(i * barW + 1, center,     barW - 2, h * 0.6);
    }
  }
  draw();
}

function stopCardViz() {
  if (!activeCardCanvas) return;
  const ctx = activeCardCanvas.getContext("2d");
  ctx.clearRect(0, 0, activeCardCanvas.width, activeCardCanvas.height);
  activeCardCanvas.classList.remove("card-viz-active");
  cardVizRunning   = false;
  activeCardCanvas = null;
}

/* ═══════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════ */
document.querySelectorAll(".iconsdbar a").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".iconsdbar a").forEach(l => l.classList.remove("active"));
    link.classList.add("active");
  });
});
