// ==========================================
//            SOLICIO AI - CLIENT ENGINE
// ==========================================

let player = null;
let activeStopTimer = null;

// --- 1. API Key Sanitizer & Storage ---
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const keyStatus = document.getElementById('keyStatus');

if (apiKeyInput) {
  apiKeyInput.value = localStorage.getItem('solicio_gemini_key') || '';
}

if (saveKeyBtn) {
  saveKeyBtn.addEventListener('click', () => {
    const rawVal = apiKeyInput.value.trim();
    if (!rawVal) {
      if (keyStatus) {
        keyStatus.style.color = 'var(--red)';
        keyStatus.textContent = 'Please enter an API key.';
      }
      return;
    }
    localStorage.setItem('solicio_gemini_key', rawVal);
    if (keyStatus) {
      keyStatus.style.color = 'var(--teal)';
      keyStatus.textContent = 'Saved in localStorage';
      setTimeout(() => { keyStatus.textContent = ''; }, 2500);
    }
  });
}

function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

// --- 2. YouTube Embedded Player Logic ---
function onYouTubeIframeAPIReady() {
  player = new YT.Player('ytPlayer', {
    height: '100%',
    width: '100%',
    playerVars: {
      'autoplay': 0,
      'controls': 1,
      'modestbranding': 1,
      'rel': 0
    },
    events: {
      'onStateChange': onPlayerStateChange
    }
  });
}

function loadVideoIntoPlayer(videoId) {
  const placeholder = document.getElementById('playerPlaceholder');
  if (placeholder) {
    placeholder.style.display = 'none';
  }

  if (player && player.loadVideoById) {
    player.loadVideoById(videoId);
  }
}

function playSegment(startSec, endSec) {
  if (!player || !player.seekTo) return;

  if (activeStopTimer) clearTimeout(activeStopTimer);

  player.seekTo(startSec, true);
  player.playVideo();

  const durationMs = (endSec - startSec) * 1000;
  const timeLabel = document.getElementById('playerTimeLabel');
  if (timeLabel) timeLabel.textContent = `Playing clip (${startSec}s - ${endSec}s)`;

  activeStopTimer = setTimeout(() => {
    player.pauseVideo();
    if (timeLabel) timeLabel.textContent = `Clip Finished (${endSec}s)`;
  }, durationMs);
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PAUSED && activeStopTimer) {
    clearTimeout(activeStopTimer);
  }
}

// --- 3. Gemini Multi-Model Fallback Engine ---
async function callGemini(apiKey, systemPrompt, userContent) {
  const sanitizedKey = apiKey.trim();

  const models = [
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3-flash',
    'gemini-2.0-flash'
  ];

  const attemptedErrors = [];

  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${sanitizedKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemPrompt },
                { text: userContent }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        const errMsg = data.error?.message || `HTTP ${res.status}`;
        attemptedErrors.push(`[${model}]: ${errMsg}`);
        continue;
      }

      if (data.candidates && data.candidates[0]?.content) {
        return { data, modelUsed: model };
      }
    } catch (err) {
      attemptedErrors.push(`[${model}]: ${err.message}`);
    }
  }

  throw new Error(attemptedErrors.join(' | '));
}

// --- 4. Video Analysis Execution ---
document.getElementById('analyzeBtn')?.addEventListener('click', async () => {
  // --- ADDED DISCLAIMER ---
  const disclaimer = `LEGAL NOTICE:
Solicio AI is provided under the MIT License "as is". 
By proceeding, you agree that:
1. You are solely responsible for your use of this tool.
2. Clipping or reusing copyrighted material without permission may violate laws and is morally wrong.
3. The creator of this tool assumes no responsibility for copyright claims or legal actions taken against you.

Do you accept these terms and wish to continue?`;

  if (!confirm(disclaimer)) return;
  // --- END DISCLAIMER ---

  const activeInputKey = apiKeyInput?.value.trim();
  const apiKey = activeInputKey || localStorage.getItem('solicio_gemini_key');

  if (activeInputKey) {
    localStorage.setItem('solicio_gemini_key', activeInputKey);
  }

  const url = document.getElementById('ytUrlInput')?.value.trim();
  const status = document.getElementById('statusText');

  if (!apiKey) return alert("Please enter your Gemini API key in the sidebar.");
  const videoId = getYouTubeId(url);
  if (!videoId) return alert("Please enter a valid YouTube URL.");

  loadVideoIntoPlayer(videoId);

  if (status) {
    status.style.color = "var(--text-muted)";
    status.textContent = "Analyzing transcript & timeline sections...";
  }

  const systemPrompt = `You are a professional short-form video editor. 
Analyze the video context and output EXACTLY 3 viral clip recommendations spread evenly across the full runtime.

MANDATE:
- CLIP 1: Beginning section highlight.
- CLIP 2: Mid-game / middle section highlight.
- CLIP 3: End / Climax highlight.
- Each clip duration should be 30-60 seconds long.

Return ONLY a raw JSON array matching this structure:
[
  {
    "title": "Short Hook Title",
    "start": 45,
    "end": 95,
    "reason": "Why this key section hooks the audience."
  }
]`;

  const userContent = `Target YouTube Video ID: "${videoId}". Evaluate timeline markers for viral segments.`;

  try {
    const { data, modelUsed } = await callGemini(apiKey, systemPrompt, userContent);
    const rawText = data.candidates[0].content.parts[0].text;
    const cleanJson = rawText.replace(/```json|```/g, '').trim();
    const clips = JSON.parse(cleanJson);

    renderClipCards(clips, videoId);

    if (status) {
      status.style.color = "var(--teal)";
      status.textContent = `Generated ${clips.length} highlights using ${modelUsed}. Click any clip to preview!`;
    }
  } catch (err) {
    if (status) {
      status.style.color = "var(--red)";
      status.textContent = `Error: ${err.message}`;
    }
  }
});

// --- 5. Highlight Renderer ---
function renderClipCards(clips, videoId) {
  const grid = document.getElementById('clipsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';

  clips.forEach((clip) => {
    const card = document.createElement('div');
    card.className = 'clip-card';
    card.innerHTML = `
      ${thumbnailUrl ? `<img src="${thumbnailUrl}" class="clip-thumb" alt="Clip Preview" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px; margin-bottom: 12px;" />` : ''}
      <div class="clip-content">
        <h4 class="clip-title">${clip.title}</h4>
        <div class="clip-time">${clip.start}s - ${clip.end}s</div>
        <p class="clip-reason">${clip.reason}</p>
      </div>
      <button class="btn btn-secondary" style="width: 100%; margin-top: 12px;" onclick="playSegment(${clip.start}, ${clip.end})">
        Preview Clip Segment
      </button>
    `;
    grid.appendChild(card);
  });
}
