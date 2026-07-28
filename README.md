<div align="center">
   <p>
    <img src="https://github.com/user-attachments/assets/f77911c0-b60f-4a8f-88da-cad68bcec561" alt="Solicio App Banner" width="100%" />
   </p>
  <p><strong>Transform YouTube videos into viral 9:16 Shorts & Reels — powered by AI & 100% in-browser WebAssembly.</strong></p>

  <p>
    <a href="https://solicio.samhithnadig.workers.dev/"><strong>⚡ Launch App</strong></a>
    ·
    <a href="https://github.com/samhithnadig/solicio/issues/new?template=bug_report.md">Report Bug</a>
    ·
    <a href="https://github.com/samhithnadig/solicio/issues/new?template=feature_request.md">Request Feature</a>
  </p>

  <p>
    <a href="https://solicio.samhithnadig.workers.dev/"><img src="https://img.shields.io/badge/Hosted%20On-Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Hosted on Cloudflare" /></a>
  </p>

  <br />
  <img src="<img width="1886" height="647" alt="image" src="https://github.com/user-attachments/assets/6d0885d4-e417-4abd-803e-f55666b8a9a5" />
" alt="Solicio App Banner" width="100%" />
  <br />
  <br />

</div>
---

## 💡 What is Solicio?

**Solicio** is an open-source, privacy-first web application designed for content creators. It takes YouTube videos, identifies the most engaging viral hooks using Google Gemini AI, and reframes them into vertical **9:16 format** for TikTok, YouTube Shorts, and Instagram Reels.

Unlike standard video tools, **Solicio performs all video processing locally in your browser** using WebAssembly (`FFmpeg.wasm`) and HTML5 Canvas. Your files or any info is never traced by us.

---

## ✨ Key Features

* ⚡ **Client-Side Video Processing:** Powered by `FFmpeg.wasm` and HTML5 Canvas 
* 🤖 **AI Highlight Detection:** Uses Google Gemini AI to scan transcripts and identify high-converting moments.
* 📱 **Real-Time 9:16 Canvas Reframe:** Interactive drag-and-crop visual frame optimized for vertical short-form platforms.
* 🔒 **Privacy First:** All video rendering occurs locally on your own GPU/CPU.
* 🌐 **Global Edge Delivery:** Hosted on Cloudflare Pages/Workers and Vercel for low latency worldwide.

---

## 🛠️ Architecture & Tech Stack

[ YouTube Video ] ──► [ Gemini AI ] ──► [ Highlight Timestamps ]
│
▼
[ Exported Clip ] ◄── [ FFmpeg.wasm ] ◄── [ HTML5 Canvas Crop ]


* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **AI Processing:** Google Gemini API
* **Video Engine:** [`FFmpeg.wasm`](https://github.com/ffmpegwasm/ffmpeg.wasm) & Canvas API
* **Hosting:** Cloudflare Workers / Pages

## 🚀 Quick Start (Local Development)

Because `FFmpeg.wasm` relies on `SharedArrayBuffer`, your local web server must send Cross-Origin Isolation headers (`COOP` and `COEP`).

### Prerequisites
* Node.js (v18 or higher) installed on your machine.

## 🤝 Contributing
Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.
Fork the Project  

Create your Feature Branch (git checkout -b feature/AmazingFeature)

Commit your Changes (git commit -m 'Add some AmazingFeature')

Push to the Branch (git push origin feature/AmazingFeature)

Open a Pull Request

## 📜 License
Distributed under the MIT License. See LICENSE for details.
