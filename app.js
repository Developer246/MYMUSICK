const BACKEND = "https://mymusick-backend-production.up.railway.app";

/* ELEMENTOS */

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

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");


/* AUDIO */

const audio = new Audio();
audio.volume = volumeSlider.value;


/* VISUALIZER SETUP */

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser();

const source = audioCtx.createMediaElementSource(audio);

source.connect(analyser);
analyser.connect(audioCtx.destination);

analyser.fftSize = 256;

const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);


/* BUSCADOR */

searchInput.addEventListener("keydown", async e => {

if(e.key !== "Enter") return;

const query = searchInput.value.trim();
if(!query) return;

resultsEl.innerHTML = "Buscando...";

const res = await fetch(`${BACKEND}/search?q=${encodeURIComponent(query)}`);

const songs = await res.json();

renderSongs(songs);

});


/* RENDER */

function renderSongs(songs){

resultsEl.innerHTML = "";

songs.forEach(song => {

const div = document.createElement("div");

div.className = "song";

div.innerHTML = `
<img src="${song.thumbnail}">
<div class="song-info">
<strong>${song.title}</strong>
<small>${song.artist}</small>
</div>
`;

div.onclick = ()=> loadSong(song);

resultsEl.appendChild(div);

});

}


/* CARGAR CANCIÓN */

function loadSong(song){

player.style.display = "flex";

nowPlaying.textContent = song.title;
playerArtist.textContent = song.artist;

playerThumb.src = song.thumbnail;

audio.src = `${BACKEND}/stream/${song.id}`;

audio.play();

canvas.classList.remove("hidden");

startVisualizer();

}


/* PLAY PAUSE */

playPauseBtn.onclick = ()=>{

if(audio.paused) audio.play();
else audio.pause();

};


/* VOLUMEN */

volumeSlider.oninput = ()=>{

audio.volume = volumeSlider.value;

};


/* PROGRESO */

audio.addEventListener("timeupdate",()=>{

if(audio.duration){

progressBar.value = audio.currentTime / audio.duration;

currentTimeEl.textContent = formatTime(audio.currentTime);
durationEl.textContent = formatTime(audio.duration);

}

});


progressBar.oninput = ()=>{

audio.currentTime = progressBar.value * audio.duration;

};


function formatTime(sec){

const m = Math.floor(sec/60);
const s = Math.floor(sec%60).toString().padStart(2,"0");

return `${m}:${s}`;

}


/* VISUALIZADOR */

function startVisualizer(){

canvas.width = canvas.offsetWidth;
canvas.height = 80;

function draw(){

requestAnimationFrame(draw);

analyser.getByteFrequencyData(dataArray);

ctx.clearRect(0,0,canvas.width,canvas.height);

const bars = 60;
const step = Math.floor(bufferLength/bars);
const barWidth = canvas.width/bars;

const center = canvas.height/2;

for(let i=0;i<bars;i++){

const value = dataArray[i*step];
const height = (value/255)*center;

const x = i*barWidth;

ctx.fillStyle = "#04CDA8";

ctx.fillRect(x,center-height,barWidth*0.7,height);
ctx.fillRect(x,center,barWidth*0.7,height);

}

}

draw();

}
