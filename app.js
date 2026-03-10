const BACKEND = "%%BACKEND_URL%%";

/* === ELEMENTOS === */
const searchInput   = document.getElementById("searchInput");
const resultsEl     = document.getElementById("results");
const playPauseBtn  = document.getElementById("playPauseBtn");
const nowPlaying    = document.getElementById("nowPlaying");
const playerArtist  = document.getElementById("playerArtist");
const playerThumb   = document.getElementById("playerThumb");
const volumeSlider  = document.getElementById("volumeSlider");
const progressBar   = document.getElementById("progressBar");
const currentTimeEl = document.getElementById("currentTime");
const durationEl    = document.getElementById("duration");
const player        = document.getElementById("player");
const openLoginBtn  = document.getElementById("openLogin");
const closeLoginBtn = document.getElementById("closeLogin");
const loginModal    = document.getElementById("loginModal");

/* === AUDIO === */
const audio = new Audio();
audio.volume = volumeSlider.value;

/* === ESTADO === */
let currentSongCard = null;
let searchTimeout   = null;

/* === EVENTOS DE AUDIO === */
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
  if (currentSongCard) {
    currentSongCard.querySelector(".song-play-icon").textContent = "▶";
    currentSongCard.classList.remove("active-song");
    currentSongCard = null;
  }
});

/* === PROGRESO === */
audio.addEventListener("timeupdate", () => {
  if (audio.duration) {
    progressBar.value = audio.currentTime / audio.duration;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent    = formatTime(audio.duration);
  }
});

progressBar.oninput = () => {
  if (audio.duration) audio.currentTime = progressBar.value * audio.duration;
};

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* === VOLUMEN === */
volumeSlider.oninput = () => { audio.volume = volumeSlider.value; };

/* === PLAY / PAUSE === */
playPauseBtn.onclick = () => {
  audio.paused ? audio.play() : audio.pause();
};

/* === LOGIN === */
openLoginBtn.addEventListener("click", () => loginModal.showModal());
closeLoginBtn.addEventListener("click", () => loginModal.close());

/* === BÚSQUEDA con debounce === */
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();
  if (!q) { resultsEl.innerHTML = ""; return; }
  searchTimeout = setTimeout(() => buscar(q), 500);
});

async function buscar(query) {
  resultsEl.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const resp = await fetch(`${BACKEND}/search?q=${encodeURIComponent(query)}`);
    const songs = await resp.json();
    renderSongs(songs);
  } catch (e) {
    resultsEl.innerHTML = '<p class="status-msg">❌ Error al buscar. Revisa tu conexión.</p>';
  }
}

/* === BARRAS ANIMADAS EN CARD === */
let activeCardCanvas = null;
let cardVizRunning   = false;

function startCardViz(cnv) {
  if (activeCardCanvas === cnv && cardVizRunning) return;
  stopCardViz();
  activeCardCanvas = cnv;
  cardVizRunning   = true;
  cnv.classList.add("card-viz-active");
  const c = cnv.getContext("2d");

  function draw() {
    if (!cardVizRunning || activeCardCanvas !== cnv) return;
    requestAnimationFrame(draw);
    c.clearRect(0, 0, cnv.width, cnv.height);

    const bars     = 12;
    const barW     = cnv.width / bars;
    const center   = cnv.height / 2;
    const t        = Date.now() / 280;

    for (let i = 0; i < bars; i++) {
      const h = (Math.sin(t + i * 0.5) * 0.5 + 0.5)
              * (Math.sin(t * 0.6 + i * 0.3) * 0.3 + 0.7)
              * center * 0.85 + 2;
      const x = i * barW;
      c.fillStyle = "#04CDA8";
      c.fillRect(x + 1, center - h, barW - 2, h);
      c.fillRect(x + 1, center,     barW - 2, h);
    }
  }
  draw();
}

function stopCardViz() {
  if (activeCardCanvas) {
    const c = activeCardCanvas.getContext("2d");
    c.clearRect(0, 0, activeCardCanvas.width, activeCardCanvas.height);
    activeCardCanvas.classList.remove("card-viz-active");
  }
  cardVizRunning   = false;
  activeCardCanvas = null;
}

/* === RENDER CANCIONES === */
function renderSongs(songs) {
  if (!songs.length) {
    resultsEl.innerHTML = '<p class="status-msg">No se encontraron resultados.</p>';
    return;
  }
  resultsEl.innerHTML = "";
  songs.forEach((song, i) => {
    const card = document.createElement("div");
    card.className = "song";
    card.style.animationDelay = (i * 0.04) + "s";

    // Wrapper del thumbnail con canvas encima
    const imgWrap = document.createElement("div");
    imgWrap.className = "song-img-wrap";

    const img = document.createElement("img");
    img.src     = song.thumbnail || "";
    img.alt     = song.title;
    img.loading = "lazy";

    const cnv = document.createElement("canvas");
    cnv.className = "card-viz";

    // Ajustar tamaño del canvas cuando la imagen carga
    img.onload = () => {
      cnv.width  = img.offsetWidth  || 136;
      cnv.height = img.offsetHeight || 136;
    };

    imgWrap.append(img, cnv);

    const nombre = document.createElement("strong");
    nombre.textContent = song.title || "Sin título";

    const artista = document.createElement("small");
    artista.textContent = song.artist || "";

    const playIcon = document.createElement("div");
    playIcon.className   = "song-play-icon";
    playIcon.textContent = "▶";

    card.append(imgWrap, nombre, artista, playIcon);
    card.addEventListener("click", () => loadSong(song, card, playIcon, cnv));
    resultsEl.appendChild(card);
  });
}

/* === CARGAR CANCIÓN === */
function loadSong(song, card, playIcon, cnv) {
  // Limpiar card anterior
  if (currentSongCard && currentSongCard !== card) {
    currentSongCard.classList.remove("active-song");
    currentSongCard.querySelector(".song-play-icon").textContent = "▶";
  }

  // Misma canción → toggle
  if (currentSongCard === card) {
    if (audio.paused) {
      audio.play();
      // tamaño por si acaso
      cnv.width  = cnv.offsetWidth  || 136;
      cnv.height = cnv.offsetHeight || 136;
      startCardViz(cnv);
    } else {
      audio.pause();
      stopCardViz();
    }
    return;
  }

  currentSongCard = card;
  card.classList.add("active-song");
  playIcon.textContent = "⏸";

  player.style.display      = "flex";
  nowPlaying.textContent    = song.title;
  playerArtist.textContent  = song.artist || "";
  playerThumb.src           = song.thumbnail || "";
  progressBar.value         = 0;
  currentTimeEl.textContent = "0:00";
  durationEl.textContent    = "0:00";

  audio.src = `${BACKEND}/stream/${song.id}`;
  audio.play().then(() => {
    cnv.width  = cnv.offsetWidth  || 136;
    cnv.height = cnv.offsetHeight || 136;
    startCardViz(cnv);
  }).catch(e => console.warn("Play bloqueado:", e));
}

/* === SIDEBAR ACTIVO === */
document.querySelectorAll(".iconsdbar a").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".iconsdbar a")
            .forEach(l => l.classList.remove("active"));
    link.classList.add("active");
  });
});
