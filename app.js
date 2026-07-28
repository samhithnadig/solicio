// --- Local Storage API Key Management ---
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const keyStatus = document.getElementById('keyStatus');

apiKeyInput.value = localStorage.getItem('os_gemini_key') || '';

saveKeyBtn.addEventListener('click', () => {
  localStorage.setItem('os_gemini_key', apiKeyInput.value.trim());
  keyStatus.textContent = '✓ Key Saved locally!';
  setTimeout(() => {
    keyStatus.textContent = 'Stored in browser localStorage';
  }, 2000);
});

// --- Extract YouTube Video ID ---
function getYouTubeId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

// --- Gemini AI Highlight Analyzer ---
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const apiKey = localStorage.getItem('os_gemini_key');
  const url = document.getElementById('ytUrlInput').value.trim();
  const status = document.getElementById('statusText');
  const clipsGrid = document.getElementById('clipsGrid');

  if (!apiKey) {
    alert("Please save your Gemini API Key in the sidebar first.");
    return;
  }

  const videoId = getYouTubeId(url);
  if (!videoId) {
    alert("Please enter a valid YouTube URL.");
    return;
  }

  status.style.color = "var(--teal)";
  status.textContent = "Analyzing video structure with Gemini AI...";

  // Structured Prompt for Gemini
  const prompt = `Analyze this video context for YouTube ID "${videoId}".
  Identify 3 viral 30-second highlight segments. 
  Respond ONLY with a valid JSON array matching this exact schema:
  [
    { "title": "Hook Title", "start": 15, "end": 45, "reason": "Why this moment is viral" }
  ]`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await res.json();

    // 1. Verify HTTP / JSON API errors
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || `HTTP ${res.status} Error`);
    }

    // 2. Verify response candidate structure exists
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      throw new Error("Gemini returned an empty response or flagged the prompt content.");
    }

    // 3. Extract and parse clean JSON
    const rawText = data.candidates[0].content.parts[0].text;
    const cleanJson = rawText.replace(/```json|```/g, '').trim();
    const clips = JSON.parse(cleanJson);

    renderClipPreviews(videoId, clips);
    status.textContent = `Found ${clips.length} highlight clips!`;

  } catch (err) {
    console.error("Gemini API Error:", err);
    status.style.color = "var(--red)";
    status.textContent = `Error: ${err.message}`;
  }
});

function renderClipPreviews(videoId, clips) {
  const grid = document.getElementById('clipsGrid');
  grid.innerHTML = '';

  clips.forEach((clip) => {
    const card = document.createElement('div');
    card.className = 'clip-card';
    card.innerHTML = `
      <div class="iframe-container">
        <iframe src="https://www.youtube-nocookie.com/embed/${videoId}?start=${clip.start}&end=${clip.end}&autoplay=0" allowfullscreen></iframe>
      </div>
      <h4 style="margin: 8px 0; font-size: 14px;">${clip.title}</h4>
      <p class="hint">${clip.start}s - ${clip.end}s</p>
      <p class="hint" style="margin-top: 4px;">${clip.reason}</p>
      <button class="btn-secondary" onclick="setCropRange(${clip.start}, ${clip.end})" style="margin-top: 8px;">Select for Local Crop</button>
    `;
    grid.appendChild(card);
  });
}

function setCropRange(start, end) {
  document.getElementById('cropStart').value = start;
  document.getElementById('cropEnd').value = end;
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

// --- Local FFmpeg.wasm Video Cropper ---
const { FFmpeg } = FFmpegWASM;
const { fetchFile, toBlobURL } = FFmpegUtil;
let ffmpeg = null;

document.getElementById('renderBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('localFileInput').files[0];
  const start = document.getElementById('cropStart').value;
  const end = document.getElementById('cropEnd').value;
  const renderBtn = document.getElementById('renderBtn');

  if (!fileInput) {
    alert("Please choose a local MP4 file to crop.");
    return;
  }

  renderBtn.disabled = true;
  renderBtn.textContent = "Loading Engine...";

  try {
    if (!ffmpeg) {
      ffmpeg = new FFmpeg();
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    }

    renderBtn.textContent = "Cropping 9:16 Video in Browser...";
    await ffmpeg.writeFile('input.mp4', await fetchFile(fileInput));

    const duration = end - start;
    await ffmpeg.exec([
      '-ss', start.toString(),
      '-i', 'input.mp4',
      '-t', duration.toString(),
      '-vf', 'crop=ih*(9/16):ih',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      'output.mp4'
    ]);

    const data = await ffmpeg.readFile('output.mp4');
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);

    document.getElementById('renderedVideo').src = url;
    document.getElementById('downloadLink').href = url;
    document.getElementById('renderOutput').style.display = 'block';

  } catch (e) {
    alert("Render error: " + e.message);
  } finally {
    renderBtn.disabled = false;
    renderBtn.textContent = "Render Vertical Clip";
  }
});
