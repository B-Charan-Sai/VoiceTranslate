// =========================================
// VoxTranslate AI • Client Script
// =========================================

// DOM Elements - Core Panels & Forms
const joinPanel = document.getElementById('joinPanel');
const callPanel = document.getElementById('callPanel');
const joinForm = document.getElementById('join-form');
const sessionIdInput = document.getElementById('session_id');
const userNameInput = document.getElementById('user_name');
const userLanguageSelect = document.getElementById('user_language');
const randomRoomBtn = document.getElementById('randomRoomBtn');
const shareInviteBtn = document.getElementById('shareInviteBtn');
const shareQrBtn = document.getElementById('shareQrBtn');
const lanAddress = document.body.dataset.lanAddress;

// Call Header & Info
const callHeaderInfo = document.getElementById('callHeaderInfo');
const mainNavLinks = document.getElementById('mainNavLinks');
const sessionDisplay = document.getElementById('sessionDisplay');
const callStatusText = document.getElementById('callStatusText');
const callTimer = document.getElementById('callTimer');

// Call Layout Elements
const participantsGrid = document.getElementById('participantsGrid');
const audioVisualizerCanvas = document.getElementById('audioVisualizerCanvas');
const subtitlesOverlay = document.getElementById('subtitlesOverlay');
const subtitlesList = document.getElementById('subtitlesList');
const clearSubtitlesBtn = document.getElementById('clearSubtitlesBtn');
const exportTranscriptBtn = document.getElementById('exportTranscriptBtn');
const filterSubtitlesInput = document.getElementById('filterSubtitlesInput');
const minimizeSubtitlesBtn = document.getElementById('minimizeSubtitlesBtn');
const micPermissionBox = document.getElementById('micPermissionBox');
const micPermissionMessage = document.getElementById('micPermissionMessage');
const enableMicBtn = document.getElementById('enableMicBtn');

// Floating Controls
const pushToSpeakBtn = document.getElementById('pushToSpeakBtn');
const toggleMicBtn = document.getElementById('toggleMic');
const toggleSpeakerBtn = document.getElementById('toggleSpeaker');
const toggleSubtitlesBtn = document.getElementById('toggleSubtitles');
const changeLanguageBtn = document.getElementById('changeLanguageBtn');
const leaveCallBtn = document.getElementById('leaveCall');
const quickTextInput = document.getElementById('quick_text');
const sendQuickTextBtn = document.getElementById('sendQuickTextBtn');

// Audio Elements
const remoteAudioEl = document.getElementById('remoteAudio');
const ttsAudioEl = document.getElementById('ttsAudio');

// Modals
const qrModal = document.getElementById('qrModal');
const closeQrModalBtn = document.getElementById('closeQrModalBtn');
const qrCodeImg = document.getElementById('qrCodeImg');
const modalInviteUrlInput = document.getElementById('modalInviteUrlInput');
const modalCopyUrlBtn = document.getElementById('modalCopyUrlBtn');

const langModal = document.getElementById('langModal');
const closeLangModalBtn = document.getElementById('closeLangModalBtn');
const modalLanguageSelect = document.getElementById('modalLanguageSelect');
const confirmChangeLangBtn = document.getElementById('confirmChangeLangBtn');

// Audio Diagnostic Elements (Welcome Page)
const startMicTestBtn = document.getElementById('startMicTestBtn');
const testSpeakerBtn = document.getElementById('testSpeakerBtn');
const testMicIndicator = document.getElementById('testMicIndicator');
const testMicStatusTitle = document.getElementById('testMicStatusTitle');
const testMicStatusDesc = document.getElementById('testMicStatusDesc');
const testLevelFill = document.getElementById('testLevelFill');
const testLevelLabel = document.getElementById('testLevelLabel');

// Unlock Audio Playback on Mobile User Interaction
function unlockAudioPlayback() {
  [remoteAudioEl, ttsAudioEl].forEach((el) => {
    if (el) {
      el.play().then(() => {
        el.pause();
        el.currentTime = 0;
      }).catch(() => {});
    }
  });
}
document.addEventListener('click', unlockAudioPlayback, { once: true });
document.addEventListener('touchstart', unlockAudioPlayback, { once: true });

// Language Locales Map for Web Speech API
const languageLocaleMap = {
  en: 'en-US',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  bn: 'bn-IN',
  ur: 'ur-PK',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-PT',
  ru: 'ru-RU',
  'zh-cn': 'zh-CN',
  'zh-tw': 'zh-TW',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ar: 'ar-SA',
  tr: 'tr-TR',
  th: 'th-TH',
  vi: 'vi-VN',
  nl: 'nl-NL',
  pl: 'pl-PL',
  sv: 'sv-SE',
  id: 'id-ID',
};

// WebRTC ICE configuration
const rtcConfig = {
  iceServers: window.VOICE_ICE_SERVERS || [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// Session State
let currentSession = null;
let currentUserId = null;
let currentUserNameVal = 'Guest';
let currentUserLangCode = 'en';

let localStream = null;
let peerConnections = {}; // targetUserId -> RTCPeerConnection
let sessionParticipants = []; // list of { id, name, language, flag, native }
let conversationTranscript = []; // full transcript history

let pollTimer = null;
let callDurationTimer = null;
let callStartTime = null;

let isMicMuted = false;
let isSpeakerMuted = false;
let isSubtitlesVisible = true;
let isCallActive = false;

let speechRecognition = null;
let isRecognitionActive = false;

// Audio Activity Detection & Visualizer State
let audioContext = null;
let analyser = null;
let micSource = null;
let vadAnimationId = null;
let currentVolumeLevel = 0;

// Random Room Code Generator
if (randomRoomBtn) {
  randomRoomBtn.addEventListener('click', () => {
    const randomCode = 'room-' + Math.floor(1000 + Math.random() * 9000);
    sessionIdInput.value = randomCode;
  });
}

// Prefill Room from URL query string
const roomFromInvite = new URLSearchParams(window.location.search).get('room');
if (roomFromInvite) {
  sessionIdInput.value = roomFromInvite;
}

// Navigation Tab Handler (Smooth Scrolling / View Switch)
document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
    link.classList.add('active');

    const targetTab = link.dataset.tab;
    if (targetTab === 'features') {
      const el = document.getElementById('featuresSection');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (targetTab === 'test-audio') {
      const el = document.getElementById('audioTestSection');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (targetTab === 'mobile-guide') {
      const el = document.getElementById('mobileGuideSection');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (targetTab === 'welcome') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
});

// Build Invite URL
function buildInviteUrl(sessionId) {
  const inviteUrl = new URL(window.location.href);
  const localHostnames = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

  if (localHostnames.includes(inviteUrl.hostname)) {
    if (lanAddress) {
      inviteUrl.hostname = lanAddress;
    }
  }

  inviteUrl.search = '';
  inviteUrl.searchParams.set('room', sessionId);
  inviteUrl.hash = '';
  return inviteUrl.toString();
}

// Copy Invite Link
if (shareInviteBtn) {
  shareInviteBtn.addEventListener('click', async () => {
    try {
      const inviteUrl = buildInviteUrl(currentSession);
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(inviteUrl);
          shareInviteBtn.innerHTML = '<i class="fas fa-check"></i> <span class="btn-text-responsive">Copied!</span>';
          setTimeout(() => {
            shareInviteBtn.innerHTML = '<i class="fas fa-link"></i> <span class="btn-text-responsive">Copy link</span>';
          }, 2000);
          return;
        } catch (error) {
          console.warn('Clipboard write error:', error);
        }
      }
      window.prompt('Copy this invite link for other devices:', inviteUrl);
    } catch (error) {
      alert(error.message || 'Could not create invite link.');
    }
  });
}

// QR Code Modal Handler
if (shareQrBtn) {
  shareQrBtn.addEventListener('click', () => {
    const inviteUrl = buildInviteUrl(currentSession);
    modalInviteUrlInput.value = inviteUrl;
    qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(inviteUrl)}`;
    qrModal.classList.remove('hidden');
  });
}

if (closeQrModalBtn) {
  closeQrModalBtn.addEventListener('click', () => qrModal.classList.add('hidden'));
}
if (qrModal) {
  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) qrModal.classList.add('hidden');
  });
}
if (modalCopyUrlBtn) {
  modalCopyUrlBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(modalInviteUrlInput.value);
      modalCopyUrlBtn.innerHTML = '<i class="fas fa-check"></i> Copied';
      setTimeout(() => {
        modalCopyUrlBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
      }, 2000);
    } catch (e) {
      modalInviteUrlInput.select();
      document.execCommand('copy');
    }
  });
}

// Mid-Call Language Switcher Modal
if (changeLanguageBtn) {
  changeLanguageBtn.addEventListener('click', () => {
    modalLanguageSelect.value = currentUserLangCode;
    langModal.classList.remove('hidden');
  });
}
if (closeLangModalBtn) {
  closeLangModalBtn.addEventListener('click', () => langModal.classList.add('hidden'));
}
if (langModal) {
  langModal.addEventListener('click', (e) => {
    if (e.target === langModal) langModal.classList.add('hidden');
  });
}

if (confirmChangeLangBtn) {
  confirmChangeLangBtn.addEventListener('click', async () => {
    const newLang = modalLanguageSelect.value;
    if (!newLang || !currentSession || !currentUserId) return;

    confirmChangeLangBtn.disabled = true;
    confirmChangeLangBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

    try {
      const res = await postJson('/change_language', {
        session_id: currentSession,
        user_id: currentUserId,
        language_code: newLang,
      });

      currentUserLangCode = newLang;
      userLanguageSelect.value = newLang;
      handleUserListUpdate(res.user_list || []);

      // Restart Speech Recognition with new language locale
      if (speechRecognition) {
        stopContinuousSpeechRecognition();
        setTimeout(() => {
          if (isCallActive && !isMicMuted) startContinuousSpeechRecognition();
        }, 200);
      }

      langModal.classList.add('hidden');
    } catch (err) {
      alert('Could not update language: ' + err.message);
    } finally {
      confirmChangeLangBtn.disabled = false;
      confirmChangeLangBtn.innerHTML = '<i class="fas fa-check"></i> Save & Switch Language';
    }
  });
}

// API Fetch Helper
async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }
  return data;
}

// Grant & Initialize Local Audio Stream
async function initLocalAudioStream() {
  try {
    if (!localStream) {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Microphone blocked: Browsers require HTTPS or localhost. To connect from a phone, run start_public_https.bat or see the Mobile/HTTPS Guide.'
        );
      }

      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setupAudioActivityAnalyzer(localStream);
    }
    if (isCallActive) {
      await addMicrophoneToExistingPeers();
    }
    if (micPermissionBox) micPermissionBox.classList.add('hidden');
    return true;
  } catch (error) {
    console.warn('Microphone permission error:', error);
    if (micPermissionMessage) {
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
        micPermissionMessage.textContent = 'Microphone permission was blocked. Allow microphone access in your browser site settings.';
      } else if (error.name === 'NotFoundError') {
        micPermissionMessage.textContent = 'No microphone device was detected. Connect a mic and try again.';
      } else {
        micPermissionMessage.textContent = error.message || 'Could not access the microphone.';
      }
    }
    if (micPermissionBox) micPermissionBox.classList.remove('hidden');
    return false;
  }
}

if (enableMicBtn) {
  enableMicBtn.addEventListener('click', async () => {
    enableMicBtn.disabled = true;
    enableMicBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Requesting...';
    const ok = await initLocalAudioStream();
    enableMicBtn.disabled = false;
    enableMicBtn.innerHTML = '<i class="fas fa-microphone"></i> Grant Mic';
    if (ok) {
      updateCallStatus('Microphone enabled');
    }
  });
}

async function addMicrophoneToExistingPeers() {
  for (const [peerId, pc] of Object.entries(peerConnections)) {
    for (const track of localStream.getAudioTracks()) {
      if (!pc.getSenders().some((sender) => sender.track && sender.track.id === track.id)) {
        pc.addTrack(track, localStream);
      }
    }

    if (pc.signalingState !== 'stable') continue;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await postJson('/signal', {
        session_id: currentSession,
        sender_id: currentUserId,
        target_id: peerId,
        signal: { sdp: pc.localDescription },
      });
    } catch (e) {
      console.warn('Error renegotiating track with peer:', e);
    }
  }
}

// Audio Activity & Wave Visualizer
function setupAudioActivityAnalyzer(stream) {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    micSource = audioContext.createMediaStreamSource(stream);
    micSource.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      if (!isCallActive) return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      currentVolumeLevel = sum / bufferLength;

      const localCard = document.getElementById(`participant-card-${currentUserId}`);
      if (currentVolumeLevel > 14 && !isMicMuted) {
        if (localCard) localCard.classList.add('speaking');
      } else {
        if (localCard) localCard.classList.remove('speaking');
      }

      drawWaveVisualizer(dataArray, bufferLength);
      vadAnimationId = requestAnimationFrame(checkVolume);
    };
    checkVolume();
  } catch (e) {
    console.warn('AudioContext analyzer warning:', e);
  }
}

// Draw Fluid Wave on Canvas
function drawWaveVisualizer(dataArray, bufferLength) {
  if (!audioVisualizerCanvas) return;
  const canvas = audioVisualizerCanvas;
  const ctx = canvas.getContext('2d');
  const width = (canvas.width = canvas.clientWidth);
  const height = (canvas.height = canvas.clientHeight);

  ctx.clearRect(0, 0, width, height);

  ctx.lineWidth = 2.5;
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#6366f1');
  gradient.addColorStop(0.5, '#06b6d4');
  gradient.addColorStop(1, '#a855f7');
  ctx.strokeStyle = gradient;

  ctx.beginPath();
  const sliceWidth = width / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * height) / 2;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  ctx.lineTo(width, height / 2);
  ctx.stroke();
}

// WebRTC Signaling Handler
async function createPeerConnection(targetUserId) {
  if (peerConnections[targetUserId]) {
    return peerConnections[targetUserId];
  }

  const pc = new RTCPeerConnection(rtcConfig);
  peerConnections[targetUserId] = pc;

  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      postJson('/signal', {
        session_id: currentSession,
        sender_id: currentUserId,
        target_id: targetUserId,
        signal: { candidate: event.candidate },
      }).catch((err) => console.error('Error sending ICE candidate:', err));
    }
  };

  pc.ontrack = (event) => {
    if (remoteAudioEl && event.streams && event.streams[0]) {
      remoteAudioEl.srcObject = event.streams[0];
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') {
      updateCallStatus('Connected • Live Audio Active');
    }
  };

  return pc;
}

async function handleIncomingSignal(signalItem) {
  const fromUserId = signalItem.from;
  const signalData = signalItem.signal;
  const pc = await createPeerConnection(fromUserId);

  if (signalData.sdp) {
    const desc = new RTCSessionDescription(signalData.sdp);
    await pc.setRemoteDescription(desc);

    if (desc.type === 'offer') {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await postJson('/signal', {
        session_id: currentSession,
        sender_id: currentUserId,
        target_id: fromUserId,
        signal: { sdp: pc.localDescription },
      });
    }
  } else if (signalData.candidate) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
    } catch (e) {
      console.warn('Error adding ICE candidate:', e);
    }
  }
}

async function connectToPeer(targetUserId) {
  const pc = await createPeerConnection(targetUserId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await postJson('/signal', {
    session_id: currentSession,
    sender_id: currentUserId,
    target_id: targetUserId,
    signal: { sdp: pc.localDescription },
  });
}

// Track processed message IDs and polling state
const processedMsgIds = new Set();
let isSpeakingIncomingAudio = false;
let isPollPending = false;

// Non-overlapping Smart Polling Loop
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  isPollPending = false;

  pollTimer = setInterval(async () => {
    if (!currentSession || !currentUserId || !isCallActive || isPollPending) return;

    isPollPending = true;
    try {
      const data = await postJson('/poll', {
        session_id: currentSession,
        user_id: currentUserId,
      });

      const updatedUsers = data.user_list || [];
      handleUserListUpdate(updatedUsers);

      if (data.signals && data.signals.length > 0) {
        for (const sig of data.signals) {
          await handleIncomingSignal(sig);
        }
      }

      if (data.messages && data.messages.length > 0) {
        data.messages.forEach((msg) => {
          const rendered = renderSubtitle(msg);
          if (rendered && !isSpeakerMuted && msg.sender_id !== currentUserId) {
            speakText(msg.text, msg.language);
          }
        });
      }
    } catch (error) {
      console.error('Polling error:', error);
    } finally {
      isPollPending = false;
    }
  }, 300);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  isPollPending = false;
}

// Manage User Grid UI
function handleUserListUpdate(newUsersList) {
  newUsersList.forEach((user) => {
    if (user.id !== currentUserId && currentUserId.localeCompare(user.id) < 0 && !peerConnections[user.id]) {
      connectToPeer(user.id).catch((error) => {
        console.error(`Could not connect to peer ${user.id}:`, error);
      });
    }
  });

  Object.keys(peerConnections).forEach((peerId) => {
    if (!newUsersList.some((u) => u.id === peerId)) {
      peerConnections[peerId].close();
      delete peerConnections[peerId];
    }
  });

  sessionParticipants = newUsersList;
  renderParticipantsGrid();
}

function renderParticipantsGrid() {
  participantsGrid.innerHTML = '';

  sessionParticipants.forEach((user) => {
    const isSelf = user.id === currentUserId;
    const initial = (user.name || 'U').charAt(0).toUpperCase();
    const flag = user.flag || '🌐';
    const langDisplay = user.native || user.language.toUpperCase();

    const card = document.createElement('div');
    card.className = 'participant-card';
    card.id = `participant-card-${user.id}`;

    card.innerHTML = `
      <div class="mic-badge ${isSelf ? (isMicMuted ? '' : 'active') : 'active'}">
        <i class="fas ${isSelf ? (isMicMuted ? 'fa-microphone-slash' : 'fa-microphone') : 'fa-microphone'}"></i>
      </div>
      <div class="avatar-wrapper">
        <div class="speaking-waves"></div>
        <div class="avatar-circle">${initial}</div>
      </div>
      <div class="participant-name">${user.name} ${isSelf ? '(You)' : ''}</div>
      <span class="participant-lang-badge">${flag} ${langDisplay}</span>
    `;

    participantsGrid.appendChild(card);
  });
}

// Continuous Live Speech Recognition
let lastSentTranscript = '';
let lastSentTimestamp = 0;

function startContinuousSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn('Web Speech API not supported in this browser environment; use Push to Speak.');
    return;
  }

  try {
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = false;
    speechRecognition.lang = languageLocaleMap[currentUserLangCode] || 'en-US';

    speechRecognition.onstart = () => {
      isRecognitionActive = true;
    };

    speechRecognition.onresult = async (event) => {
      if (isSpeakingIncomingAudio) return;

      const lastIndex = event.results.length - 1;
      const result = event.results[lastIndex];

      if (!result || !result.isFinal) return;

      const transcript = result[0].transcript.trim();
      const now = Date.now();

      if (transcript && isCallActive && !isMicMuted) {
        if (transcript.toLowerCase() === lastSentTranscript.toLowerCase() && now - lastSentTimestamp < 2500) {
          return;
        }

        lastSentTranscript = transcript;
        lastSentTimestamp = now;

        try {
          const res = await postJson('/send_message', {
            session_id: currentSession,
            user_id: currentUserId,
            text: transcript,
            sender_language: currentUserLangCode,
          });

          if (res.ok && res.msg_id) {
            renderSubtitle({
              msg_id: res.msg_id,
              sender_id: currentUserId,
              sender_name: currentUserNameVal,
              text: transcript,
              original_text: transcript,
              language: currentUserLangCode,
            });
          }
        } catch (err) {
          console.error('Error sending speech message:', err);
        }
      }
    };

    speechRecognition.onerror = (e) => {
      if (e.error === 'not-allowed') {
        if (micPermissionBox) micPermissionBox.classList.remove('hidden');
      }
    };

    speechRecognition.onend = () => {
      isRecognitionActive = false;
      if (isCallActive && !isMicMuted) {
        setTimeout(() => {
          try {
            speechRecognition.start();
          } catch (e) {}
        }, 150);
      }
    };

    speechRecognition.start();
  } catch (e) {
    console.warn('SpeechRecognition initialization warning:', e);
  }
}

function stopContinuousSpeechRecognition() {
  if (speechRecognition) {
    try {
      speechRecognition.stop();
    } catch (e) {}
    speechRecognition = null;
  }
  isRecognitionActive = false;
}

// Render Subtitle / Caption Line with Unique Msg ID Protection
function renderSubtitle(data) {
  if (data.msg_id) {
    if (processedMsgIds.has(data.msg_id)) return false;
    processedMsgIds.add(data.msg_id);
  }

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Record into transcript history
  conversationTranscript.push({
    sender: data.sender_name,
    time: timeStr,
    text: data.text,
    original_text: data.original_text,
    language: data.language,
  });

  const placeholder = subtitlesList.querySelector('.subtitle-placeholder');
  if (placeholder) placeholder.remove();

  const item = document.createElement('div');
  item.className = 'subtitle-item';

  const showOriginal = data.original_text && data.original_text.trim() !== data.text.trim();

  item.innerHTML = `
    <div class="subtitle-speaker">
      <span>${data.sender_name}</span>
      <span style="font-weight:400; font-size:0.75rem; color:#94a3b8;">${timeStr}</span>
    </div>
    <div class="subtitle-text">${data.text}</div>
    ${showOriginal ? `<div class="subtitle-original"><i class="fas fa-quote-left"></i> ${data.original_text}</div>` : ''}
  `;

  subtitlesList.appendChild(item);
  subtitlesList.scrollTop = subtitlesList.scrollHeight;
  return true;
}

// Clear Subtitles
if (clearSubtitlesBtn) {
  clearSubtitlesBtn.addEventListener('click', () => {
    subtitlesList.innerHTML = '<div class="subtitle-placeholder"><i class="fas fa-headset fa-2x"></i><p>Subtitles cleared. Live translated speech will appear here.</p></div>';
  });
}

// Minimize / Expand Subtitles Drawer
if (minimizeSubtitlesBtn) {
  minimizeSubtitlesBtn.addEventListener('click', () => {
    subtitlesOverlay.classList.toggle('minimized');
    const isMin = subtitlesOverlay.classList.contains('minimized');
    minimizeSubtitlesBtn.innerHTML = isMin ? '<i class="fas fa-chevron-up"></i>' : '<i class="fas fa-chevron-down"></i>';
  });
}

// Filter / Search Subtitles
if (filterSubtitlesInput) {
  filterSubtitlesInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const items = subtitlesList.querySelectorAll('.subtitle-item');
    items.forEach((item) => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(query) ? '' : 'none';
    });
  });
}

// Export Conversation Transcript as File
if (exportTranscriptBtn) {
  exportTranscriptBtn.addEventListener('click', () => {
    if (!conversationTranscript || conversationTranscript.length === 0) {
      alert('No conversation transcript to export yet.');
      return;
    }

    let output = `=================================================\n`;
    output += `VoxTranslate AI • Meeting Transcript\n`;
    output += `Room: ${currentSession || 'Unknown'} | Date: ${new Date().toLocaleDateString()}\n`;
    output += `=================================================\n\n`;

    conversationTranscript.forEach((entry, idx) => {
      output += `[${entry.time}] ${entry.sender}:\n`;
      output += `Translated: ${entry.text}\n`;
      if (entry.original_text && entry.original_text !== entry.text) {
        output += `Original:   ${entry.original_text}\n`;
      }
      output += `\n`;
    });

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${currentSession || 'call'}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// PCM Audio Recorder Fallback for Mobile / Push to Speak
class PCMRecorder {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.pcmData = [];
    this.sampleRate = 16000;
  }

  async start() {
    this.pcmData = [];
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.sampleRate = this.audioContext.sampleRate;

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputBuffer = e.inputBuffer.getChannelData(0);
      this.pcmData.push(new Float32Array(inputBuffer));
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  async stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    let totalLength = 0;
    for (let chunk of this.pcmData) {
      totalLength += chunk.length;
    }
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (let chunk of this.pcmData) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const downsampled = this.downsampleBuffer(merged, this.sampleRate, 16000);
    return this.encodeWAV(downsampled, 16000);
  }

  downsampleBuffer(buffer, initialSampleRate, targetSampleRate = 16000) {
    if (initialSampleRate === targetSampleRate) return buffer;
    const sampleRateRatio = initialSampleRate / targetSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0, count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let index = 44;
    for (let i = 0; i < samples.length; i++) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(index, s, true);
      index += 2;
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }
}

let activePcmRecorder = null;
let isPcmRecording = false;

// Push To Speak Button (Manual Audio Recording Fallback)
if (pushToSpeakBtn) {
  pushToSpeakBtn.addEventListener('click', async () => {
    if (isPcmRecording) {
      pushToSpeakBtn.classList.remove('recording');
      pushToSpeakBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span class="btn-label">Processing</span>';

      try {
        stopContinuousSpeechRecognition();
        const wavBlob = await activePcmRecorder.stop();
        const targetLocale = languageLocaleMap[currentUserLangCode] || 'en-US';

        const formData = new FormData();
        formData.append('audio', wavBlob, 'recording.wav');
        formData.append('language', targetLocale);

        const response = await fetch('/transcribe', { method: 'POST', body: formData });
        const data = await response.json();

        if (data.ok && data.text) {
          const res = await postJson('/send_message', {
            session_id: currentSession,
            user_id: currentUserId,
            text: data.text,
            sender_language: currentUserLangCode,
          });

          if (res.ok && res.msg_id) {
            renderSubtitle({
              msg_id: res.msg_id,
              sender_id: currentUserId,
              sender_name: currentUserNameVal,
              text: data.text,
              original_text: data.text,
              language: currentUserLangCode,
            });
          }
        } else {
          alert('Speech was not clear. Please speak again.');
        }
      } catch (err) {
        console.error('PCM Transcription error:', err);
      } finally {
        isPcmRecording = false;
        activePcmRecorder = null;
        pushToSpeakBtn.classList.remove('recording');
        pushToSpeakBtn.innerHTML = '<i class="fas fa-microphone"></i><span class="btn-label">Speak</span>';
        if (isCallActive && !isMicMuted) {
          setTimeout(() => startContinuousSpeechRecognition(), 300);
        }
      }
    } else {
      try {
        stopContinuousSpeechRecognition();
        activePcmRecorder = new PCMRecorder();
        await activePcmRecorder.start();
        isPcmRecording = true;
        pushToSpeakBtn.classList.add('recording');
        pushToSpeakBtn.innerHTML = '<i class="fas fa-stop"></i><span class="btn-label">Done</span>';
      } catch (err) {
        console.error('Mic start error:', err);
        alert('Microphone access denied. Please grant microphone permissions.');
        isPcmRecording = false;
        activePcmRecorder = null;
        pushToSpeakBtn.classList.remove('recording');
        pushToSpeakBtn.innerHTML = '<i class="fas fa-microphone"></i><span class="btn-label">Speak</span>';
      }
    }
  });
}

// Quick Text Send
async function handleSendQuickText() {
  if (!quickTextInput) return;
  const text = quickTextInput.value.trim();
  if (!text || !currentSession || !currentUserId) return;

  try {
    const res = await postJson('/send_message', {
      session_id: currentSession,
      user_id: currentUserId,
      text: text,
      sender_language: currentUserLangCode,
    });

    if (res.ok && res.msg_id) {
      renderSubtitle({
        msg_id: res.msg_id,
        sender_id: currentUserId,
        sender_name: currentUserNameVal,
        text: text,
        original_text: text,
        language: currentUserLangCode,
      });
    }
    quickTextInput.value = '';
  } catch (err) {
    console.error('Send message failed:', err);
  }
}

if (sendQuickTextBtn) {
  sendQuickTextBtn.addEventListener('click', handleSendQuickText);
}
if (quickTextInput) {
  quickTextInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendQuickText();
  });
}

// Neural Server TTS Playback with Native SpeechSynthesis Fallback
async function playServerTTS(text, langCode, onComplete) {
  if (!text || isSpeakerMuted) {
    if (onComplete) onComplete();
    return;
  }

  try {
    const res = await postJson('/tts', { text: text, language: langCode });
    if (res.ok && res.audio_b64) {
      const binaryString = atob(res.audio_b64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes.buffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = ttsAudioEl || new Audio();
      audio.src = audioUrl;

      isSpeakingIncomingAudio = true;

      const finishHandler = () => {
        isSpeakingIncomingAudio = false;
        URL.revokeObjectURL(audioUrl);
        if (onComplete) onComplete();
      };

      audio.onended = finishHandler;
      audio.onerror = (e) => {
        console.warn('TTS audio element error, falling back to speech synthesis:', e);
        finishHandler();
      };

      try {
        await audio.play();
        return;
      } catch (playErr) {
        console.warn('Audio play prevented or blocked:', playErr);
        isSpeakingIncomingAudio = false;
        URL.revokeObjectURL(audioUrl);
      }
    }
  } catch (err) {
    console.error('Server TTS error:', err);
  }

  playNativeSpeech(text, langCode, onComplete);
}

function playNativeSpeech(text, langCode, onComplete) {
  if (!text || isSpeakerMuted || !('speechSynthesis' in window)) {
    if (onComplete) onComplete();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const targetLang = (languageLocaleMap[langCode] || langCode || 'en-US').toLowerCase();
    const shortLang = (langCode || 'en').toLowerCase().split('-')[0];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    utterance.rate = 1.0;

    const voices = window.speechSynthesis.getVoices() || [];
    const matchingVoice = voices.find((v) => {
      const vLang = v.lang.toLowerCase().replace('_', '-');
      return vLang === targetLang || vLang.startsWith(shortLang);
    });
    if (matchingVoice) utterance.voice = matchingVoice;

    utterance.onstart = () => {
      isSpeakingIncomingAudio = true;
    };
    const finishHandler = () => {
      isSpeakingIncomingAudio = false;
      if (onComplete) onComplete();
    };
    utterance.onend = finishHandler;
    utterance.onerror = finishHandler;

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    isSpeakingIncomingAudio = false;
    console.warn('SpeechSynthesis error:', e);
    if (onComplete) onComplete();
  }
}

function speakText(text, langCode) {
  if (!text || isSpeakerMuted) return;

  stopContinuousSpeechRecognition();

  const resumeRecognitionAfterTTS = () => {
    setTimeout(() => {
      if (isCallActive && !isMicMuted && !isPcmRecording) {
        startContinuousSpeechRecognition();
      }
    }, 600);
  };

  playServerTTS(text, langCode, resumeRecognitionAfterTTS);
}

// Call Duration Timer
function startCallTimer() {
  callStartTime = Date.now();
  if (callDurationTimer) clearInterval(callDurationTimer);

  callDurationTimer = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - callStartTime) / 1000);
    const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const secs = String(elapsedSeconds % 60).padStart(2, '0');
    callTimer.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopCallTimer() {
  if (callDurationTimer) {
    clearInterval(callDurationTimer);
    callDurationTimer = null;
  }
  callTimer.textContent = '00:00';
}

function updateCallStatus(text) {
  callStatusText.textContent = text;
}

// Join Call Action
joinForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const sessionId = sessionIdInput.value.trim();
  const userName = userNameInput.value.trim();
  const userLanguage = userLanguageSelect.value;

  if (!sessionId || !userName) {
    alert('Please enter a room code and your display name.');
    return;
  }

  const joinSubmitBtn = joinForm.querySelector('button[type="submit"]');
  if (joinSubmitBtn) {
    joinSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining Call...';
    joinSubmitBtn.disabled = true;
  }

  currentUserNameVal = userName;
  currentUserLangCode = userLanguage;

  unlockAudioPlayback();

  try {
    const [data] = await Promise.all([
      postJson('/join_session', {
        session_id: sessionId,
        user_name: userName,
        language_code: userLanguage,
      }),
      initLocalAudioStream(),
    ]);

    currentSession = data.session_id;
    currentUserId = data.user_id;
    isCallActive = true;

    sessionDisplay.textContent = currentSession;
    joinPanel.classList.add('hidden');
    callPanel.classList.remove('hidden');
    callHeaderInfo.classList.remove('hidden');
    if (mainNavLinks) mainNavLinks.classList.add('hidden');

    updateCallStatus('WebRTC Live Audio Active');
    startCallTimer();

    handleUserListUpdate(data.user_list || []);
    startPolling();
    startContinuousSpeechRecognition();
  } catch (error) {
    console.error('Join call error:', error);
    alert(`Failed to join call: ${error.message || error}`);
  } finally {
    if (joinSubmitBtn) {
      joinSubmitBtn.innerHTML = '<i class="fas fa-phone-alt"></i> Join Voice Room Now';
      joinSubmitBtn.disabled = false;
    }
  }
});

// Call Control: Mute / Unmute Microphone
function handleToggleMic() {
  isMicMuted = !isMicMuted;

  if (localStream) {
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !isMicMuted;
    });
  }

  if (isMicMuted) {
    toggleMicBtn.className = 'control-btn mic-off';
    toggleMicBtn.innerHTML = '<i class="fas fa-microphone-slash"></i><span class="btn-label">Muted</span>';
    stopContinuousSpeechRecognition();
  } else {
    toggleMicBtn.className = 'control-btn mic-on';
    toggleMicBtn.innerHTML = '<i class="fas fa-microphone"></i><span class="btn-label">Mic</span>';
    startContinuousSpeechRecognition();
  }

  renderParticipantsGrid();
}

if (toggleMicBtn) {
  toggleMicBtn.addEventListener('click', handleToggleMic);
}

// Call Control: Mute / Unmute Speaker Audio Playback
function handleToggleSpeaker() {
  isSpeakerMuted = !isSpeakerMuted;

  if (remoteAudioEl) {
    remoteAudioEl.muted = isSpeakerMuted;
  }

  if (isSpeakerMuted) {
    toggleSpeakerBtn.className = 'control-btn speaker-off';
    toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-mute"></i><span class="btn-label">Muted</span>';
  } else {
    toggleSpeakerBtn.className = 'control-btn speaker-on';
    toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-up"></i><span class="btn-label">Audio</span>';
  }
}

if (toggleSpeakerBtn) {
  toggleSpeakerBtn.addEventListener('click', handleToggleSpeaker);
}

// Call Control: Toggle Subtitles
function handleToggleSubtitles() {
  isSubtitlesVisible = !isSubtitlesVisible;

  if (isSubtitlesVisible) {
    subtitlesOverlay.classList.remove('hidden');
    toggleSubtitlesBtn.className = 'control-btn subtitles-on';
  } else {
    subtitlesOverlay.classList.add('hidden');
    toggleSubtitlesBtn.className = 'control-btn subtitles-off';
  }
}

if (toggleSubtitlesBtn) {
  toggleSubtitlesBtn.addEventListener('click', handleToggleSubtitles);
}

// Call Control: Leave Call
function handleLeaveCall() {
  const sessId = currentSession;
  const usrId = currentUserId;

  isCallActive = false;
  currentSession = null;
  currentUserId = null;

  stopPolling();
  stopCallTimer();
  stopContinuousSpeechRecognition();

  if (localStream) {
    try {
      localStream.getTracks().forEach((t) => t.stop());
    } catch (e) {}
    localStream = null;
  }

  Object.keys(peerConnections).forEach((peerId) => {
    try {
      peerConnections[peerId].close();
    } catch (e) {}
  });
  peerConnections = {};

  if (audioContext) {
    try {
      audioContext.close();
    } catch (e) {}
    audioContext = null;
  }
  if (vadAnimationId) {
    cancelAnimationFrame(vadAnimationId);
  }

  joinPanel.classList.remove('hidden');
  callPanel.classList.add('hidden');
  callHeaderInfo.classList.add('hidden');
  if (mainNavLinks) mainNavLinks.classList.remove('hidden');
  subtitlesList.innerHTML = '<div class="subtitle-placeholder"><i class="fas fa-headset fa-2x"></i><p>Speak naturally in your microphone. Live translated speech will appear here in real-time.</p></div>';
  participantsGrid.innerHTML = '';

  if (sessId && usrId) {
    postJson('/leave_session', {
      session_id: sessId,
      user_id: usrId,
    }).catch((e) => console.warn('Error leaving session:', e));
  }
}

if (leaveCallBtn) {
  leaveCallBtn.addEventListener('click', handleLeaveCall);
  leaveCallBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleLeaveCall();
  }, { passive: false });
}

// =========================================
// AUDIO DIAGNOSTIC TESTER (WELCOME SCREEN)
// =========================================
let testAudioContext = null;
let testAnalyser = null;
let testMediaStream = null;
let testAnimId = null;
let isMicTesting = false;

if (startMicTestBtn) {
  startMicTestBtn.addEventListener('click', async () => {
    if (isMicTesting) {
      // Stop test
      isMicTesting = false;
      if (testMediaStream) {
        testMediaStream.getTracks().forEach((t) => t.stop());
        testMediaStream = null;
      }
      if (testAudioContext) {
        testAudioContext.close();
        testAudioContext = null;
      }
      if (testAnimId) cancelAnimationFrame(testAnimId);

      testMicIndicator.classList.remove('active');
      testMicStatusTitle.textContent = 'Microphone Test Stopped';
      testMicStatusDesc.textContent = 'Click "Start Microphone Test" to test again.';
      testLevelFill.style.width = '0%';
      testLevelLabel.textContent = '0%';
      startMicTestBtn.innerHTML = '<i class="fas fa-play"></i> Start Microphone Test';
    } else {
      // Start test
      try {
        startMicTestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Requesting Mic...';
        testMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        testAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        testAnalyser = testAudioContext.createAnalyser();
        testAnalyser.fftSize = 256;

        const src = testAudioContext.createMediaStreamSource(testMediaStream);
        src.connect(testAnalyser);

        isMicTesting = true;
        testMicIndicator.classList.add('active');
        testMicStatusTitle.textContent = 'Microphone Active & Working!';
        testMicStatusDesc.textContent = 'Speak into your microphone now to see the audio input level meter.';
        startMicTestBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Microphone Test';

        const bufLen = testAnalyser.frequencyBinCount;
        const dArray = new Uint8Array(bufLen);

        const loop = () => {
          if (!isMicTesting) return;
          testAnalyser.getByteFrequencyData(dArray);
          let sum = 0;
          for (let i = 0; i < bufLen; i++) sum += dArray[i];
          const avg = sum / bufLen;
          const pct = Math.min(100, Math.round((avg / 100) * 100));

          testLevelFill.style.width = `${pct}%`;
          testLevelLabel.textContent = `${pct}%`;
          testAnimId = requestAnimationFrame(loop);
        };
        loop();
      } catch (err) {
        testMicIndicator.classList.remove('active');
        testMicStatusTitle.textContent = 'Microphone Permission Blocked';
        testMicStatusDesc.textContent = err.message || 'Please allow microphone access in your browser.';
        startMicTestBtn.innerHTML = '<i class="fas fa-play"></i> Start Microphone Test';
      }
    }
  });
}

// Speaker Test (Plays gentle pleasant chime)
if (testSpeakerBtn) {
  testSpeakerBtn.addEventListener('click', () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3); // G5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);

      testSpeakerBtn.innerHTML = '<i class="fas fa-check"></i> Speaker Sound Played!';
      setTimeout(() => {
        testSpeakerBtn.innerHTML = '<i class="fas fa-volume-up"></i> Test Speaker Audio';
      }, 2000);
    } catch (e) {
      alert('Audio playback error: ' + e.message);
    }
  });
}
