const BACKEND = "https://mymusick-backend-production.up.railway.app";

/* ===================== ELEMENTOS DOM ===================== */
const searchInput = document.getElementById("searchInput");
const resultsEl = document.getElementById("results");
const playPauseBtn = document.getElementById("playPauseBtn");
const nowPlaying = document.getElementById("nowPlaying");
const playerArtist = document.getElementById("playerArtist");
const playerThumb = document.getElementById("playerThumb");
const volumeSlider = document.getElementById("volumeSlider");
const progressBar = document.getElementById("progressBar");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const player = document.getElementById("player");
const openLoginBtn = document.getElementById("openLogin");
const closeLoginBtn = document.getElementById("closeLogin");
const loginModal = document.getElementById("loginModal");

/* ===================== AUDIO ===================== */
const audio = new Audio();
audio.volume = 0.7;

let currentSongCard = null;
let searchTimeout = null;
let activeCardCanvas = null;
let cardVizRunning = false;

/* ===================== EVENTOS DE AUDIO ===================== */
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
});

audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  progressBar.value = audio.currentTime / audio.duration;
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration);
});

progressBar.oninput = () => {
  if (audio.duration) audio.currentTime = progressBar.value * audio.duration;
};

/* ===================== UTILIDADES ===================== */
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

/* ===================== VOLUMEN ===================== */
volumeSlider.oninput = () => {
  audio.volume = parseFloat(volumeSlider.value);
};

/* ===================== PLAY / PAUSE ===================== */
playPauseBtn.onclick = () => {
  audio.paused ? audio.play() : audio.pause();
};

/* ===================== LOGIN ===================== */
openLoginBtn?.addEventListener("click", () => loginModal.showModal());
closeLoginBtn?.addEventListener("click", () => loginModal.close());

/* ===================== BÚSQUEDA CON DEBOUNCE ===================== */
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();

  if (!q) {
    resultsEl.innerHTML = "";
    return;
  }

  searchTimeout = setTimeout(() => buscar(q), 450);
});

async function buscar(query) {
  resultsEl.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const resp = await fetch(`${BACKEND}/search?q=${encodeURIComponent(query)}`);

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();
    const songs = Array.isArray(data.songs) ? data.songs : [];

    if (songs.length === 0) {
      resultsEl.innerHTML = '<p class="status-msg">No se encontraron resultados.</p>';
      return;
    }

    renderSongs(songs);

  } catch (err) {
    console.error("Error en búsqueda:", err);
    resultsEl.innerHTML = '<p class="status-msg">❌ Error al buscar. Revisa tu conexión.</p>';
  }
}

/* ===================== RENDERIZADO DE CANCIONES ===================== */
function renderSongs(songs) {
  resultsEl.innerHTML = "";

  songs.forEach((song, i) => {
    const card = document.createElement("div");
    card.className = "song";
    card.style.animationDelay = `${i * 0.04}s`;

    const imgWrap = document.createElement("div");
    imgWrap.className = "song-img-wrap";

    const img = document.createElement("img");
    img.src = song.thumbnail || "";
    img.alt = song.title || "Sin título";
    img.loading = "lazy";

    const cnv = document.createElement("canvas");
    cnv.className = "card-viz";

    imgWrap.append(img, cnv);

    const titleEl = document.createElement("strong");
    titleEl.textContent = song.title || "Sin título";

    const artistEl = document.createElement("small");
    artistEl.textContent = song.artist || "Artista desconocido";

    const playIcon = document.createElement("div");
    playIcon.className = "song-play-icon";
    playIcon.textContent = "▶";

    card.append(imgWrap, titleEl, artistEl, playIcon);

    // Evento de reproducción
    card.addEventListener("click", () => loadSong(song, card, playIcon, cnv));

    resultsEl.appendChild(card);
  });
}

/* ===================== CARGAR Y REPRODUCIR CANCIÓN ===================== */
function loadSong(song, card, playIcon, cnv) {
  // Si es la misma canción → toggle play/pause
  if (currentSongCard === card) {
    audio.paused ? audio.play() : audio.pause();
    return;
  }

  // Resetear tarjeta anterior
  resetCurrentCard();

  currentSongCard = card;
  card.classList.add("active-song");
  playIcon.textContent = "⏸";

  // Actualizar reproductor inferior
  player.style.display = "flex";
  nowPlaying.textContent = song.title || "Sin título";
  playerArtist.textContent = song.artist || "";
  playerThumb.src = song.thumbnail || "";

  // Resetear progreso
  progressBar.value = 0;
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "0:00";

  // Cargar y reproducir
  audio.src = `${BACKEND}/stream/${song.id}`;

  audio.play()
    .then(() => {
      // Ajustar tamaño del canvas después de cargar imagen
      if (img = card.querySelector("img")) {
        cnv.width = img.offsetWidth || 136;
        cnv.height = img.offsetHeight || 136;
      }
      startCardViz(cnv);
    })
    .catch(err => console.warn("Reproducción bloqueada por el navegador:", err));
}

/* ===================== VISUALIZADOR DE BARRAS EN CARD ===================== */
function startCardViz(cnv) {
  if (activeCardCanvas === cnv && cardVizRunning) return;

  stopCardViz();
  activeCardCanvas = cnv;
  cardVizRunning = true;
  cnv.classList.add("card-viz-active");

  const ctx = cnv.getContext("2d");
  const bars = 12;
  const barW = cnv.width / bars;

  function draw() {
    if (!cardVizRunning || activeCardCanvas !== cnv) return;
    requestAnimationFrame(draw);

    ctx.clearRect(0, 0, cnv.width, cnv.height);
    const center = cnv.height / 2;
    const t = Date.now() / 280;

    for (let i = 0; i < bars; i++) {
      const height = (Math.sin(t + i * 0.5) * 0.5 + 0.5) *
                     (Math.sin(t * 0.6 + i * 0.3) * 0.3 + 0.7) *
                     center * 0.85 + 2;

      ctx.fillStyle = "#04CDA8";
      ctx.fillRect(i * barW + 1, center - height, barW - 2, height);
      ctx.fillRect(i * barW + 1, center, barW - 2, height * 0.6);
    }
  }
  draw();
}

function stopCardViz() {
  if (!activeCardCanvas) return;
  const ctx = activeCardCanvas.getContext("2d");
  ctx.clearRect(0, 0, activeCardCanvas.width, activeCardCanvas.height);
  activeCardCanvas.classList.remove("card-viz-active");
  cardVizRunning = false;
  activeCardCanvas = null;
}

/* ===================== SIDEBAR ===================== */
document.querySelectorAll(".iconsdbar a").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".iconsdbar a").forEach(l => l.classList.remove("active"));
    link.classList.add("active");
  });
});
