const BACKEND = "%%BACKEND_URL%%";

/* =========================
   ELEMENTOS DEL DOM
========================= */

const searchInput  = document.getElementById("searchInput");
const resultsEl    = document.getElementById("results");
const canvasEl     = document.getElementById("canvas");
const ctx2d        = canvasEl.getContext("2d");

const playPauseBtn = document.getElementById("playPauseBtn");
const nowPlaying   = document.getElementById("nowPlaying");
const playerArtist = document.getElementById("playerArtist");
const playerThumb  = document.getElementById("playerThumb");
const volumeSlider = document.getElementById("volumeSlider");

const loginModal   = document.getElementById("loginModal");
const openLogin    = document.getElementById("openLogin");
const closeLogin   = document.getElementById("closeLogin");
const playerft = document.getElementById("player");
/* =========================
   LOGIN MODAL
========================= */

openLogin.onclick = () => loginModal.showModal();
closeLogin.onclick = () => loginModal.close();

/* =========================
   AUDIO PLAYER
========================= */

const audio = new Audio();
audio.volume = parseFloat(volumeSlider.value);

let currentSongEl = null;

/* =========================
   EVENTOS AUDIO
========================= */

audio.addEventListener("play", updatePlayerUI);

audio.addEventListener("pause", updatePlayerUI);

audio.addEventListener("ended", () => {

  updatePlayerUI();

  if (currentSongEl) {
    currentSongEl.classList.remove("active-song");
    currentSongEl = null;
  }

});

audio.addEventListener("error", () => {

  nowPlaying.textContent = "Error al reproducir — intenta otra canción";

});

/* =========================
   BUSCADOR
========================= */

searchInput.addEventListener("keydown", async (e) => {

  if (e.key !== "Enter") return;

  const query = searchInput.value.trim();

  if (!query) return;

  resultsEl.innerHTML = `
  <div class="status-msg">
  <div class="loading-spinner"></div>
  </div>
  `;

  try {

    const res = await fetch(`${BACKEND}/search?q=${encodeURIComponent(query)}`);

    if (!res.ok) throw new Error();

    const songs = await res.json();

    renderSongs(songs);

  } catch {

    resultsEl.innerHTML = `<p class="status-msg">Error al buscar 😕</p>`;

  }

});

/* =========================
   RENDER CANCIONES
========================= */

function renderSongs(songs) {

  resultsEl.innerHTML = "";

  if (!songs?.length) {

    resultsEl.innerHTML = `<p class="status-msg">No se encontraron resultados</p>`;

    return;

  }

  songs.forEach((song, i) => {

    const div = document.createElement("div");

    div.className = "song";
    div.tabIndex = 0;
    div.role = "listitem";

    div.style.animationDelay = `${i * 0.05}s`;

    div.innerHTML = `
      <img
      src="${song.thumbnail}"
      alt="Portada de ${song.title}"
      loading="lazy"
      crossorigin="anonymous">

      <div class="song-info">
        <strong title="${song.title}">${song.title}</strong>
        <small title="${song.artist}">${song.artist}</small>
      </div>

      <div class="song-play-icon">▶</div>
    `;

    div.addEventListener("mouseenter", () =>
      detectarColor(song.thumbnail, div)
    );

    div.addEventListener("mouseleave", () =>
      div.style.background = ""
    );

    div.addEventListener("click", () =>
      loadSong(song, div)
    );

    div.addEventListener("keydown", e => {

      if (e.key === "Enter") loadSong(song, div);

    });

    resultsEl.appendChild(div);

  });

}

/* =========================
   DETECTAR COLOR DOMINANTE
========================= */

function detectarColor(imgURL, element) {

  const img = new Image();

  img.crossOrigin = "anonymous";

  img.src = imgURL;

  img.onload = () => {

    canvasEl.width = Math.floor(img.width / 4);
    canvasEl.height = Math.floor(img.height / 4);

    ctx2d.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);

    const data = ctx2d.getImageData(
      0,
      0,
      canvasEl.width,
      canvasEl.height
    ).data;

    const colors = {};

    let max = 0;

    let dominant = "80,80,80";

    for (let i = 0; i < data.length; i += 32) {

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (r + g + b < 60 || r + g + b > 720) continue;

      const key = `${r},${g},${b}`;

      colors[key] = (colors[key] || 0) + 1;

      if (colors[key] > max) {

        max = colors[key];
        dominant = key;

      }

    }

    element.style.background = `rgba(${dominant},0.35)`;

  };

}

/* =========================
   CARGAR CANCIÓN
========================= */

function loadSong(song, el) {

  if (currentSongEl) {

    currentSongEl.classList.remove("active-song");

    const icon = currentSongEl.querySelector(".song-play-icon");

    if (icon) icon.textContent = "▶";

  }

  currentSongEl = el;

  if (el) {

    el.classList.add("active-song");

    const icon = el.querySelector(".song-play-icon");

    if (icon) icon.textContent = "⏸";

  }

  nowPlaying.textContent = song.title;

  playerArtist.textContent = song.artist;

  playerArtist.classList.add("visible");

  playerThumb.src = song.thumbnail || "";

  playerThumb.classList.add("visible");

  audio.src = `${BACKEND}/stream/${song.id}`;

  audio.load();
   player.style.display = "inline-block";

  audio.play().catch(err => {

    console.error("Error reproduciendo:", err);

  });

  playPauseBtn.classList.add("visible");

}

/* =========================
   PLAY / PAUSE
========================= */

function togglePlayPause() {

  if (!audio.src) return;

  audio.paused ? audio.play() : audio.pause();

}

playPauseBtn.addEventListener("click", togglePlayPause);

/* =========================
   UI DEL PLAYER
========================= */

function updatePlayerUI() {

  const playing = !audio.paused;

  playPauseBtn.textContent = playing ? "⏸" : "▶";

  playPauseBtn.classList.toggle("playing", playing);

  playPauseBtn.setAttribute(
    "aria-label",
    playing ? "Pausar" : "Reproducir"
  );

  if (currentSongEl) {

    const icon = currentSongEl.querySelector(".song-play-icon");

    if (icon) icon.textContent = playing ? "⏸" : "▶";

  }

}

/* =========================
   VOLUMEN
========================= */

volumeSlider.addEventListener("input", () => {

  audio.volume = parseFloat(volumeSlider.value);

});

/* =========================
   SIDEBAR ACTIVA
========================= */

document.querySelectorAll(".iconsdbar a").forEach(link => {

  link.addEventListener("click", function () {

    document
      .querySelectorAll(".iconsdbar a")
      .forEach(l => l.classList.remove("active"));

    this.classList.add("active");

  });

});
audio.addEventListener("timeupdate", () => {
  if (audio.duration) {
    progressBar.value = audio.currentTime / audio.duration;
  }
});
progressBar.addEventListener("input", () => {
  audio.currentTime = progressBar.value * audio.duration;
});
