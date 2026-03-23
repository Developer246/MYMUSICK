const BACKEND = "%%BACKEND_URL%%";

/* ═══════════════════════════════════════════
   ELEMENTOS DOM
═══════════════════════════════════════════ */
const searchInput    = document.getElementById("searchInput");
const searchSpinner  = document.getElementById("searchSpinner");
const homeState      = document.getElementById("homeState");
const resultsRoot    = document.getElementById("resultsRoot");
const songsSection   = document.getElementById("songsSection");
const artistsSection = document.getElementById("artistsSection");
const albumsSection  = document.getElementById("albumsSection");
const resultsEl      = document.getElementById("results");
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

let currentSongs     = [];
let currentSongIndex = -1;
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
  progressBar.value         = audio.currentTime / audio.duration;
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

function show(el, visible) {
  el.style.display = visible ? "" : "none";
}

// Thumbnail con fallback en cascada
function getThumb(song) {
  return song.thumbnail || `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`;
}

/* ═══════════════════════════════════════════
   VOLUMEN / CONTROLES
═══════════════════════════════════════════ */
volumeSlider.oninput = () => { audio.volume = parseFloat(volumeSlider.value); };

playPauseBtn.onclick = () => { audio.paused ? audio.play() : audio.pause(); };

prevBtn.onclick = () => {
  if (!currentSongs.length) return;
  const idx = currentSongIndex > 0 ? currentSongIndex - 1 : currentSongs.length - 1;
  playSongAtIndex(idx);
};

nextBtn.onclick = () => playNext();

function playNext() {
  if (!currentSongs.length) return;
  const idx = currentSongIndex < currentSongs.length - 1 ? currentSongIndex + 1 : 0;
  playSongAtIndex(idx);
}

function playSongAtIndex(idx) {
  const song = currentSongs[idx];
  if (!song) return;
  const cards = resultsEl.querySelectorAll(".song");
  const card  = cards[idx];
  const icon  = card?.querySelector(".song-play-icon");
  const cnv   = card?.querySelector("canvas");
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
    show(homeState, true);
    show(resultsRoot, false);
    return;
  }

  searchTimeout = setTimeout(() => buscar(q), 450);
});

async function buscar(query) {
  show(searchSpinner, true);
  show(homeState, false);
  show(resultsRoot, true);

  resultsEl.innerHTML   = '<div class="loading-spinner"></div>';
  artistsGrid.innerHTML = "";
  albumsGrid.innerHTML  = "";

  try {
    const resp = await fetch(`${BACKEND}/search?q=${encodeURIComponent(query)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data    = await resp.json();
    const songs   = Array.isArray(data.songs)   ? data.songs   : [];
    const artists = Array.isArray(data.artists) ? data.artists : [];
    const albums  = Array.isArray(data.albums)  ? data.albums  : [];

    currentSongs     = songs;
    currentSongIndex = -1;

    // Canciones
    if (songs.length > 0) {
      renderSongs(songs);
      show(songsSection, true);
    } else {
      resultsEl.innerHTML = '<p class="status-msg">Sin canciones para esta búsqueda.</p>';
      show(songsSection, true);
    }

    // Artistas
    if (artists.length > 0) {
      renderArtists(artists);
      show(artistsSection, true);
    } else {
      show(artistsSection, false);
    }

    // Álbumes
    if (albums.length > 0) {
      renderAlbums(albums);
      show(albumsSection, true);
    } else {
      show(albumsSection, false);
    }

    if (!songs.length && !artists.length && !albums.length) {
      resultsEl.innerHTML = '<p class="status-msg">No se encontraron resultados.</p>';
    }

  } catch (err) {
    console.error("Error en búsqueda:", err);
    resultsEl.innerHTML = '<p class="status-msg">❌ Error al buscar. Revisa tu conexión.</p>';
    show(songsSection, true);
    show(artistsSection, false);
    show(albumsSection, false);
  } finally {
    show(searchSpinner, false);
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
    card.style.animationDelay = `${i * 0.04}s`;

    // Imagen + canvas
    const imgWrap = document.createElement("div");
    imgWrap.className = "song-img-wrap";

    const img = document.createElement("img");
    // Usar thumbnail del backend (mejor resolución via getBestThumbnail)
    img.src     = getThumb(song);
    img.alt     = song.title || "Sin título";
    img.loading = "lazy";
    // Fallback si la imagen no carga
    img.onerror = () => {
      img.onerror = null;
      img.src = `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`;
    };

    const cnv = document.createElement("canvas");
    cnv.className = "card-viz";

    imgWrap.append(img, cnv);

    const titleEl = document.createElement("strong");
    titleEl.textContent = song.title || "Sin título";

    const artistEl = document.createElement("small");
    artistEl.textContent = song.artist || "Artista desconocido";

    const albumEl = document.createElement("span");
    albumEl.className   = "song-album";
    albumEl.textContent = song.album || "";

    const durEl = document.createElement("span");
    durEl.className   = "song-duration";
    durEl.textContent = song.duration || "";

    const playIcon = document.createElement("div");
    playIcon.className   = "song-play-icon";
    playIcon.textContent = "▶";

    card.append(imgWrap, titleEl, artistEl, albumEl, durEl, playIcon);

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
      img.onerror   = () => img.replaceWith(makeAvatarPlaceholder());
      card.appendChild(img);
    } else {
      card.appendChild(makeAvatarPlaceholder());
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

function makeAvatarPlaceholder() {
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
      img.onerror   = () => img.replaceWith(makeCoverPlaceholder());
      card.appendChild(img);
    } else {
      card.appendChild(makeCoverPlaceholder());
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

function makeCoverPlaceholder() {
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

  currentSongCard  = card || null;
  currentSongIndex = index ?? -1;

  if (card) {
    card.classList.add("active-song");
    if (playIcon) playIcon.textContent = "⏸";
  }

  player.style.display      = "flex";
  nowPlaying.textContent    = song.title  || "Sin título";
  playerArtist.textContent  = song.artist || "";

  // Usar thumbnail del backend para el player también
  playerThumb.src     = getThumb(song);
  playerThumb.onerror = () => {
    playerThumb.onerror = null;
    playerThumb.src = `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`;
  };

  progressBar.value         = 0;
  currentTimeEl.textContent = "0:00";
  durationEl.textContent    = "0:00";

  // ── Actualizar título de la pestaña ───────────────────────────────────
  document.title = `${song.title} — ${song.artist || "MyMusick"}`;

  // ── Media Session API (título + imagen en notificaciones del SO) ──────
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  song.title  || "Sin título",
      artist: song.artist || "Desconocido",
      album:  song.album  || "",
      artwork: [
        { src: getThumb(song), sizes: "512x512", type: "image/jpeg" },
      ],
    });

    navigator.mediaSession.setActionHandler("play",     () => audio.play());
    navigator.mediaSession.setActionHandler("pause",    () => audio.pause());
    navigator.mediaSession.setActionHandler("previoustrack", () => prevBtn.onclick());
    navigator.mediaSession.setActionHandler("nexttrack",     () => nextBtn.onclick());
  }

  // Hacer HEAD request primero para que el browser conozca Content-Length
  // Esto resuelve el 0:00 cuando se accede directo al stream
  fetch(`${BACKEND}/stream/${song.id}`, { method: "HEAD" }).catch(() => {});
  audio.src = `${BACKEND}/stream/${song.id}`;
  audio.play()
    .then(() => {
      if (cnv && card) {
        const imgEl  = card.querySelector("img");
        cnv.width    = imgEl?.offsetWidth  || 136;
        cnv.height   = imgEl?.offsetHeight || 136;
        startCardViz(cnv);
      }
    })
    .catch(err => console.warn("Reproducción bloqueada:", err));
}

/* ═══════════════════════════════════════════
   VISUALIZADOR
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
