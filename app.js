// ==========================================
//          SOLICIO AI - CLIENT ENGINE
// ==========================================

// --- API Key Management ---
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const keyStatus = document.getElementById('keyStatus');

apiKeyInput.value = localStorage.getItem('solicio_gemini_key') || '';

saveKeyBtn.addEventListener('click', () => {
  localStorage.setItem('solicio_gemini_key', apiKeyInput.value.trim());
  keyStatus.textContent = '✓ Saved!';
  setTimeout(() => { keyStatus.textContent = 'Stored in browser localStorage'; }, 2000);
});

function getYouTubeId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

// --- Gemini Fallback API Engine ---
async function callGeminiWithFallback(apiKey, prompt) {
  const models = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash-lite'
  ];

  let lastError = '';

  for (const model of models) {
    try {
      console.log(`[Solicio] Attempting model: ${model}...`);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        lastError = data.error?.message || `HTTP ${res.status}`;
        continue;
      }

      if (data.candidates && data.candidates[0]?.content) {
        return { data, modelUsed: model };
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  throw new Error(`All Gemini endpoints failed: ${lastError}`);
}

// --- Analyze Button Event ---
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const apiKey = localStorage.getItem('solicio_gemini_key');
  const url = document.getElementById('ytUrlInput').value.trim();
  const status = document.getElementById('statusText');

  if (!apiKey) return alert("Please save your Gemini API Key in the sidebar.");
  const videoId = getYouTubeId(url);
  if (!videoId) return alert("Please enter a valid YouTube URL.");

  status.style.color = "var(--teal)";
  status.textContent = "Solicio AI is extracting viral moments...";

  const prompt = `Analyze video context for YouTube ID "${videoId}".
  Find 3 viral 30-second clips. 
  Respond strictly with JSON array:
  [
    { "title": "Hook Title", "start": 15, "end": 45, "reason": "Why it goes viral" }
  ]`;

  try {
    const { data, modelUsed } = await callGeminiWithFallback(apiKey, prompt);
    const rawText = data.candidates[0].content.parts[0].text;
    const cleanJson = rawText.replace(/```json|```/g, '').trim();
    const clips = JSON.parse(cleanJson);

    renderClipCards(videoId, clips);
    status.textContent = `Generated ${clips.length} clip segments using ${modelUsed}!`;
  } catch (err) {
    status.style.color = "var(--red)";
    status.textContent = `Error: ${err.message}`;
  }
});

// --- Render Zero-Crust Pre-cut Clip Cards ---
function renderClipCards(videoId, clips) {
  const grid = document.getElementById('clipsGrid');
  grid.innerHTML = '';

  clips.forEach((clip, idx) => {
    const card = document.createElement('div');
    card.className = 'clip-card';
    card.id = `card-${idx}`;
    card.innerHTML = `
      <div class="video-preview-container" id="preview-box-${idx}">
        <iframe src="https://www.youtube-nocookie.com/embed/${videoId}?start=${clip.start}&end=${clip.end}&autoplay=0" 
                style="width:100%; height:100%; border:none;"></iframe>
      </div>
      <h4 style="margin: 8px 0; text-align: center;">${clip.title}</h4>
      <p class="hint">${clip.start}s - ${clip.end}s</p>
      <p class="hint" style="text-align: center; margin-bottom: 12px;">${clip.reason}</p>
      <button class="btn-primary" onclick="autoGenerateCutClip('${videoId}', ${clip.start}, ${clip.end}, ${idx})" id="gen-btn-${idx}">
        ✂️ Generate Ready Cut Clip
      </button>
    `;
    grid.appendChild(card);
  });
}

// --- Browser Recording Capture Engine ---
let ytPlayer = null;

function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('ytPlayer', {
    height: '360',
    width: '640',
    playerVars: { 'autoplay': 0, 'controls': 0 }
  });
}

async function autoGenerateCutClip(videoId, start, end, idx) {
  const genBtn = document.getElementById(`gen-btn-${idx}`);
  const previewBox = document.getElementById(`preview-box-${idx}`);

  genBtn.disabled = true;
  genBtn.textContent = "Processing 9:16 Cut Clip...";

  const durationSec = end - start;

  // Load video into hidden capture player
  ytPlayer.loadVideoById({
    videoId: videoId,
    startSeconds: start,
    endSeconds: end
  });

  const canvas = document.getElementById('cropCanvas');
  const ctx = canvas.getContext('2d');

  // Capture canvas media stream
  const stream = canvas.captureStream(30);
  const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks = [];

  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const videoUrl = URL.createObjectURL(blob);

    // Serve crust-free pre-cut vertical clip directly!
    previewBox.innerHTML = `
      <video src="${videoUrl}" controls autoplay loop></video>
    `;

    genBtn.disabled = false;
    genBtn.textContent = "Download Cut Clip (.webm / .mp4)";
    genBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `solicio-clip-${start}s-${end}s.webm`;
      a.click();
    };
  };

  // Render loop to crop 16:9 frame into 9:16 vertical canvas
  let renderInterval = setInterval(() => {
    const iframe = ytPlayer.getIframe();
    // Crop center 9:16 slice onto canvas
    ctx.drawImage(iframe, 160, 0, 320, 360, 0, 0, 720, 1280);
  }, 1000 / 30);

  mediaRecorder.start();

  // Stop recording automatically when the clip ends
  setTimeout(() => {
    clearInterval(renderInterval);
    ytPlayer.stopVideo();
    mediaRecorder.stop();
  }, durationSec * 1000);
}
// Function to fetch AI viral highlights using Gemini (Updated Model + Section Partitioning)
async function fetchGeminiViralHighlights(transcriptArray, videoDuration) {
  // Retrieve user's key from input or local storage (BYOK Architecture)
  const userApiKey = localStorage.getItem("user_gemini_key") || prompt("Enter your Gemini API Key:");
  if (!userApiKey) return null;

  // Updated Gemini API Endpoint
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userApiKey}`;

  // 1. Calculate time markers to divide the video into 3 distinct sections
  const totalSeconds = videoDuration || (transcriptArray.length ? transcriptArray[transcriptArray.length - 1].start : 1800);
  const midPoint = Math.floor(totalSeconds / 2);
  const finalThird = Math.floor(totalSeconds * 0.66);

  // 2. Format the full transcript with explicit timestamp tags
  const formattedTranscript = transcriptArray
    .map((item) => `[${Math.floor(item.start)}s]: ${item.text}`)
    .join("\n");

  // 3. System prompt enforcing strict timeline section boundaries
  const systemPrompt = `You are an elite short-form video editor for TikTok, YouTube Shorts, and Reels.
You are given a timestamped transcript for a video with a total duration of ${totalSeconds} seconds.

YOUR STRICT RULE:please see to that you have seen the whole transcript it may have been observed that you just put the initial clips n video which might seem that the tool may not be working also after choosing can you also tell why this clip was noticed by you and made you think that  it was essential to the users to use it and please reply it in the /"why_it_will_go_viral"
YOUR MANDATE:
You MUST output EXACTLY 3 viral clips (30–60s each). To guarantee full video coverage, you MUST select clips according to these strict rules:
You MUST output EXACTLY 3 viral clips (somewhat near 60s each). To guarantee full video coverage, you MUST select clips according to these strict rules:

- CLIP 1 (Beginning): Pick a highlight from timestamps between 0s and ${midPoint}s.
- CLIP 2 (Middle/Later): Pick a highlight from timestamps between ${midPoint}s and ${finalThird}s.
- CLIP 3 (End/Climax): Pick a highlight from timestamps between ${finalThird}s and ${totalSeconds}s.

STRICT RULE: Do NOT put all 3 clips in the first 5 minutes. If all clips are under 600s for a long video, the selection is INVALID.

STRICT RULE: please dont reply with very bad sentnces for catchy line see to that the title is actually related to the shortclip
Return ONLY a raw JSON array of 3 objects with no markdown formatting.
JSON Format:
[
  {
    "clip_title": "Short catchy title",
    "start_time": 962,
    "end_time": 1015,
    "why_it_will_go_viral": "Brief explanation of the psychological hook."
  }
]`;

  try {
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: systemPrompt },
              { text: `FULL TRANSCRIPT:\n${formattedTranscript}` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2, // Low temperature forces strict rule compliance
          maxOutputTokens: 2048
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "Gemini API Request Failed");
    }

    const rawText = data.candidates[0].content.parts[0].text;
    const clips = JSON.parse(rawText);

    console.log("Viral Clips Picked across Full Video:", clips);
    return clips;
  } catch (error) {
    console.error("Error generating highlights:", error);
    alert("Failed to analyze transcript. Check your API key or video transcript format.");
    return null;
  }
}
