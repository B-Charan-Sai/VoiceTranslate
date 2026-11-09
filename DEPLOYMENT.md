# 🚀 VoxTranslate AI • Deployment & Mobile Permissions Guide

## 📱 Why Mobile Browsers Block Microphones on HTTP

All modern mobile browsers (Chrome on Android, Safari on iOS) enforce **Secure Contexts**.
When you open an address like `http://192.168.0.105:5000`:
- The browser flags the page as **"Not Secure" (HTTP)**.
- The browser **completely disables** the microphone API (`navigator.mediaDevices.getUserMedia`) and Web Speech Recognition (`webkitSpeechRecognition`).
- Tapping "Allow" or checking permissions in browser settings will still show "blocked" because the connection is unencrypted.

To enable microphone access on phones, the site **must be served over HTTPS** or `localhost`.

---

## 🌐 Option 1: 1-Click Free Global Cloud Deployment (Recommended)

Deploy your application to a free cloud hosting provider with automatic, valid SSL certificates.

### Deploying to Render (100% Free with Automatic HTTPS)
1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of VoxTranslate AI"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. Go to [Render.com](https://render.com) and create a free account.
3. Click **New +** -> **Web Service** -> Connect your GitHub repository.
4. Render will automatically detect the settings from `render.yaml`:
   - **Environment**: `Python 3`
   - **Build Command**: `cd "voice Translation/voice Translation" && pip install -r requirements.txt`
   - **Start Command**: `cd "voice Translation/voice Translation" && gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 120`
5. Click **Create Web Service**.
6. Within 2-3 minutes, you'll receive your public HTTPS URL (e.g., `https://voxtranslate-ai.onrender.com`).
   - Open this on any iPhone, Android phone, or PC anywhere in the world.
   - Microphone permissions will be granted immediately!

---

## ⚡ Option 2: Test on Mobile Phone Right Now (Without Cloud Deploy)

If you want to test on your phone over Wi-Fi right now before deploying to the cloud:

### Method A: Allow Insecure Origin in Mobile Chrome
1. On your Android phone, open Chrome and type in the address bar:
   ```
   chrome://flags/#unsafely-treat-insecure-origin-as-secure
   ```
2. In the text box under that flag, enter your computer's address:
   ```
   http://192.168.0.105:5000
   ```
3. Change the dropdown from **Disabled** to **Enabled**.
4. Tap **Relaunch** at the bottom of Chrome.
5. Open `http://192.168.0.105:5000` on your phone — the microphone will now be allowed!

### Method B: Cloudflare Quick Tunnel (Instant Free HTTPS)
1. Download `cloudflared` for Windows from:
   `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi`
2. Run this command in a terminal:
   ```cmd
   cloudflared tunnel --url http://localhost:5000
   ```
3. Cloudflare will print a free HTTPS link (e.g., `https://random-words.trycloudflare.com`).
4. Open that link on your phone. It has a real SSL certificate, so microphone permissions work out of the box!

