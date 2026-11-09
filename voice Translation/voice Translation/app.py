from flask import Flask, render_template, request, jsonify
from deep_translator import GoogleTranslator
import edge_tts
import asyncio
import uuid
import base64
import io
import os
import socket
import requests
import logging
from pydub import AudioSegment
import speech_recognition as sr

app = Flask(__name__)

# Build a language list from deep-translator's GoogleTranslator supported languages.
translator = GoogleTranslator(source="auto", target="en")
google_languages = translator.get_supported_languages(as_dict=True)

# Priority languages
priority_language_names = [
    "english",
    "hindi",
    "telugu",
    "tamil",
    "kannada",
    "malayalam",
    "marathi",
    "gujarati",
    "punjabi",
    "bengali",
    "urdu",
    "french",
    "german",
    "spanish",
    "italian",
    "portuguese",
    "russian",
    "chinese (simplified)",
    "chinese (traditional)",
    "japanese",
    "korean",
    "arabic",
    "turkish",
    "thai",
    "vietnamese",
]

LANGUAGE_METADATA = {
    'en': {'flag': '🇺🇸', 'native': 'English'},
    'hi': {'flag': '🇮🇳', 'native': 'हिन्दी'},
    'te': {'flag': '🇮🇳', 'native': 'తెలుగు'},
    'ta': {'flag': '🇮🇳', 'native': 'தமிழ்'},
    'kn': {'flag': '🇮🇳', 'native': 'ಕನ್ನಡ'},
    'ml': {'flag': '🇮🇳', 'native': 'മലയാളം'},
    'mr': {'flag': '🇮🇳', 'native': 'मराठी'},
    'gu': {'flag': '🇮🇳', 'native': 'ગુજરાતી'},
    'pa': {'flag': '🇮🇳', 'native': 'ਪੰਜਾਬੀ'},
    'bn': {'flag': '🇮🇳', 'native': 'বাংলা'},
    'ur': {'flag': '🇵🇰', 'native': 'اردو'},
    'es': {'flag': '🇪🇸', 'native': 'Español'},
    'fr': {'flag': '🇫🇷', 'native': 'Français'},
    'de': {'flag': '🇩🇪', 'native': 'Deutsch'},
    'it': {'flag': '🇮🇹', 'native': 'Italiano'},
    'pt': {'flag': '🇵🇹', 'native': 'Português'},
    'ru': {'flag': '🇷🇺', 'native': 'Русский'},
    'ja': {'flag': '🇯🇵', 'native': '日本語'},
    'ko': {'flag': '🇰🇷', 'native': '한국어'},
    'zh-CN': {'flag': '🇨🇳', 'native': '简体中文'},
    'zh-TW': {'flag': '🇹🇼', 'native': '繁體中文'},
    'ar': {'flag': '🇸🇦', 'native': 'العربية'},
    'tr': {'flag': '🇹🇷', 'native': 'Türkçe'},
    'th': {'flag': '🇹🇭', 'native': 'ไทย'},
    'vi': {'flag': '🇻🇳', 'native': 'Tiếng Việt'},
    'nl': {'flag': '🇳🇱', 'native': 'Nederlands'},
    'pl': {'flag': '🇵🇱', 'native': 'Polski'},
    'sv': {'flag': '🇸🇪', 'native': 'Svenska'},
    'id': {'flag': '🇮🇩', 'native': 'Bahasa Indonesia'},
}

# Preserve all supported languages, ordered by priority
ordered_language_names = [
    name for name in priority_language_names if name in google_languages
]
ordered_language_names += sorted(
    name for name in google_languages
    if name not in priority_language_names
)

LANGUAGES = []
for name in ordered_language_names:
    code = google_languages[name]
    meta = LANGUAGE_METADATA.get(code, {})
    flag = meta.get('flag', '🌐')
    native = meta.get('native', name.title())
    display_label = f"{flag} {name.title()} ({native})" if native.lower() != name.lower() else f"{flag} {name.title()}"
    LANGUAGES.append((code, display_label, flag, name.title()))

# Store active sessions:
# {
#   session_id: {
#     "users": {user_id: {"name": str, "language": str}},
#     "pending": {user_id: [message, ...]},
#     "signals": {user_id: [signal, ...]}
#   }
# }
active_sessions = {}

# Map language codes to TTS voices
VOICE_MAP = {
    'en': 'en-US-AriaNeural',
    'hi': 'hi-IN-SwaraNeural',
    'te': 'te-IN-ShrutiNeural',
    'ta': 'ta-IN-PallaviNeural',
    'kn': 'kn-IN-SapnaNeural',
    'ml': 'ml-IN-SobhanaNeural',
    'mr': 'mr-IN-AarohiNeural',
    'gu': 'gu-IN-DhwaniNeural',
    'pa': 'pa-IN-OjasNeural',
    'bn': 'bn-IN-TanishaaNeural',
    'ur': 'ur-PK-UzmaNeural',
    'fr': 'fr-FR-DeniseNeural',
    'de': 'de-DE-KatjaNeural',
    'es': 'es-ES-ElviraNeural',
    'it': 'it-IT-ElsaNeural',
    'pt': 'pt-PT-RaquelNeural',
    'ru': 'ru-RU-SvetlanaNeural',
    'ja': 'ja-JP-NanamiNeural',
    'ko': 'ko-KR-SunHiNeural',
    'zh-CN': 'zh-CN-XiaoxiaoNeural',
    'zh-TW': 'zh-TW-HsiaoChenNeural',
    'ar': 'ar-SA-ZariyahNeural',
    'tr': 'tr-TR-EmelNeural',
    'th': 'th-TH-PremwadeeNeural',
    'vi': 'vi-VN-HoaiMyNeural',
}


@app.route("/")
def home():
    return render_template(
        "index.html",
        languages=LANGUAGES,
        lan_ip=get_lan_ip(),
        rtc_ice_servers=get_rtc_ice_servers(),
    )


def get_lan_ip():
    """Find the local address other devices can use to reach this server."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as address_probe:
            address_probe.connect(("8.8.8.8", 80))
            return address_probe.getsockname()[0]
    except OSError:
        return None


def get_rtc_ice_servers():
    """Return public STUN servers and optional TURN credentials for WebRTC."""
    ice_servers = [
        {"urls": "stun:stun.l.google.com:19302"},
        {"urls": "stun:stun1.l.google.com:19302"},
        {"urls": "stun:stun2.l.google.com:19302"},
    ]
    turn_urls = [
        url.strip()
        for url in os.getenv("VOICE_TURN_URLS", "").split(",")
        if url.strip()
    ]

    if not turn_urls:
        return ice_servers

    username = os.getenv("VOICE_TURN_USERNAME", "")
    credential = os.getenv("VOICE_TURN_CREDENTIAL", "")
    if not username or not credential:
        app.logger.warning(
            "VOICE_TURN_URLS is set but TURN credentials are missing; "
            "continuing with STUN only."
        )
        return ice_servers

    ice_servers.append({
        "urls": turn_urls,
        "username": username,
        "credential": credential,
    })
    return ice_servers


def build_user_list(session_id):
    users = active_sessions.get(session_id, {}).get("users", {})
    return [
        {
            "id": uid,
            "name": user["name"],
            "language": user["language"],
            "flag": LANGUAGE_METADATA.get(user["language"], {}).get('flag', '🌐'),
            "native": LANGUAGE_METADATA.get(user["language"], {}).get('native', user["language"].upper()),
        }
        for uid, user in users.items()
    ]


def get_google_tts_bytes(text: str, lang: str = 'en') -> bytes:
    """Fallback Google Translate TTS to generate speech as mp3 bytes."""
    url = 'https://translate.google.com/translate_tts'
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    words = text.split()
    chunks = []
    curr = []
    curr_len = 0
    for w in words:
        if curr_len + len(w) + 1 > 150:
            chunks.append(' '.join(curr))
            curr = [w]
            curr_len = len(w)
        else:
            curr.append(w)
            curr_len += len(w) + 1
    if curr:
        chunks.append(' '.join(curr))
    if not chunks:
        chunks = [text[:150]]

    audio_data = bytearray()
    for chunk in chunks:
        params = {'ie': 'UTF-8', 'tl': lang, 'client': 'tw-ob', 'q': chunk}
        try:
            r = requests.get(url, params=params, headers=headers, timeout=6)
            if r.status_code == 200:
                audio_data.extend(r.content)
        except Exception as e:
            app.logger.warning(f"Google TTS chunk failed: {e}")
    return bytes(audio_data)


async def synthesize_to_bytes(text_to_speak: str, selected_voice: str, language: str = 'en') -> bytes:
    """Use edge-tts to generate speech as bytes with Google TTS fallback."""
    try:
        communicate = edge_tts.Communicate(text_to_speak, selected_voice)
        audio_bytes = bytearray()
        async for chunk in communicate.stream():
            if chunk.get('type') == 'audio':
                audio_bytes.extend(chunk.get('data', b""))
        if audio_bytes:
            return bytes(audio_bytes)
    except Exception as e:
        app.logger.warning(f"edge-tts failed: {e}, falling back to Google Translate TTS")

    return get_google_tts_bytes(text_to_speak, language)


@app.route("/join_session", methods=["POST"])
def join_session_api():
    """Handle user joining a session via HTTP."""
    data = request.get_json(silent=True) or {}
    session_id = data.get('session_id', '').strip()
    user_name = data.get('user_name', 'Guest').strip()
    language_code = data.get('language_code', 'en').strip()
    user_id = str(uuid.uuid4())

    if not session_id:
        return jsonify({'ok': False, 'message': 'Session ID is required'}), 400

    # Create session if it doesn't exist
    if session_id not in active_sessions:
        active_sessions[session_id] = {
            "users": {},
            "pending": {},
            "signals": {},
        }

    # Add user to session
    active_sessions[session_id]["users"][user_id] = {
        'name': user_name,
        'language': language_code
    }
    active_sessions[session_id]["pending"][user_id] = []
    active_sessions[session_id]["signals"][user_id] = []

    return jsonify({
        'ok': True,
        'user_id': user_id,
        'session_id': session_id,
        'user_list': build_user_list(session_id),
    }), 200


def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Translate text reliably using Google client API with deep-translator fallbacks."""
    if not text or not text.strip():
        return ""

    source_lang = (source_lang or 'auto').strip().lower()
    target_lang = (target_lang or 'en').strip().lower()

    if source_lang == target_lang:
        return text

    # 1. Google Translate API (client=gtx) - fast, reliable, no 429 scraping block
    try:
        url = 'https://translate.googleapis.com/translate_a/single'
        params = {
            'client': 'gtx',
            'sl': source_lang,
            'tl': target_lang,
            'dt': 't',
            'q': text,
        }
        resp = requests.get(url, params=params, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data and data[0]:
                translated = ''.join([part[0] for part in data[0] if part and part[0]])
                if translated.strip():
                    return translated.strip()
    except Exception as e:
        app.logger.warning(f"Google gtx translation failed: {e}")

    # 2. deep-translator GoogleTranslator fallback
    try:
        translated = GoogleTranslator(source=source_lang, target=target_lang).translate(text)
        if translated and translated.strip():
            return translated.strip()
    except Exception as e:
        app.logger.warning(f"deep-translator Google failed: {e}")

    # 3. MyMemoryTranslator fallback
    try:
        from deep_translator import MyMemoryTranslator
        translated = MyMemoryTranslator(source=source_lang, target=target_lang).translate(text)
        if translated and translated.strip():
            return translated.strip()
    except Exception as e:
        app.logger.warning(f"MyMemory translation failed: {e}")

    return text


@app.route("/send_message", methods=["POST"])
def send_message_api():
    """Handle message from user and queue translated payloads per recipient with unique msg_id."""
    data = request.get_json(silent=True) or {}
    session_id = data.get('session_id')
    sender_id = data.get('user_id')
    text = data.get('text', '').strip()
    sender_language = data.get('sender_language', 'en')

    if not session_id or not text or session_id not in active_sessions:
        return jsonify({'ok': False, 'message': 'Invalid session or message'}), 400

    # Server-side 2.5-second deduplication
    import time
    now = time.time()
    session = active_sessions[session_id]
    recent = session.setdefault("recent_messages", [])

    session["recent_messages"] = [msg for msg in recent if (now - msg[2]) < 4.0]

    norm_text = text.lower().strip()
    for prev_sender, prev_text, prev_time in session["recent_messages"]:
        if prev_sender == sender_id and prev_text == norm_text and (now - prev_time) < 2.5:
            return jsonify({'ok': True, 'duplicate': True}), 200

    session["recent_messages"].append((sender_id, norm_text, now))

    # Generate unique message ID
    msg_id = uuid.uuid4().hex[:12]

    # Get all users in the session
    users_in_session = session["users"]
    pending = session["pending"]
    sender_name = users_in_session.get(sender_id, {}).get('name', 'Unknown')
    if not sender_language and sender_id in users_in_session:
        sender_language = users_in_session[sender_id].get('language', 'auto')

    # Fast translation cache per target language
    translation_cache = {}

    for user_id, user_info in users_in_session.items():
        if user_id == sender_id:
            continue  # Do not queue message for sender

        target_language = user_info.get('language', 'en')

        if sender_language == target_language:
            translated_text = text
        elif target_language in translation_cache:
            translated_text = translation_cache[target_language]
        else:
            translated_text = translate_text(text, sender_language, target_language)
            translation_cache[target_language] = translated_text

        app.logger.info(f"Queuing for user {user_id} ({target_language}): '{translated_text}' (orig: '{text}')")

        # Queue message for recipient
        pending[user_id].append({
            'msg_id': msg_id,
            'sender_id': sender_id,
            'sender_name': sender_name,
            'text': translated_text,
            'original_text': text,
            'language': target_language,
        })

    return jsonify({'ok': True, 'msg_id': msg_id}), 200


@app.route("/signal", methods=["POST"])
def signal_api():
    """Exchange WebRTC SDP offers, answers, and ICE candidates."""
    data = request.get_json(silent=True) or {}
    session_id = data.get('session_id')
    sender_id = data.get('sender_id')
    target_id = data.get('target_id')
    signal_data = data.get('signal')

    if not session_id or not sender_id or not signal_data or session_id not in active_sessions:
        return jsonify({'ok': False, 'message': 'Invalid signal parameters'}), 400

    session_signals = active_sessions[session_id].get("signals", {})

    if target_id and target_id in session_signals:
        session_signals[target_id].append({
            'from': sender_id,
            'signal': signal_data
        })
    else:
        # Broadcast to all other users in session
        for uid in session_signals:
            if uid != sender_id:
                session_signals[uid].append({
                    'from': sender_id,
                    'signal': signal_data
                })

    return jsonify({'ok': True}), 200


@app.route("/tts", methods=["POST"])
def tts_api():
    """Generate TTS audio on demand using edge-tts with Google TTS fallback."""
    data = request.get_json(silent=True) or {}
    text = data.get('text', '').strip()
    language = data.get('language', 'en')

    if not text:
        return jsonify({'ok': False, 'message': 'Text is required'}), 400

    voice = VOICE_MAP.get(language, 'en-US-AriaNeural')
    try:
        audio_bytes = asyncio.run(synthesize_to_bytes(text, voice, language))
        if not audio_bytes:
            return jsonify({'ok': False, 'message': 'No audio generated'}), 500
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
        return jsonify({'ok': True, 'audio_b64': audio_b64}), 200
    except Exception as e:
        app.logger.error(f"TTS generation failed: {e}")
        return jsonify({'ok': False, 'message': f'TTS failed: {str(e)}'}), 400


@app.route("/poll", methods=["POST"])
def poll_api():
    """Return queued messages, WebRTC signals, and latest participant list."""
    data = request.get_json(silent=True) or {}
    session_id = data.get('session_id')
    user_id = data.get('user_id')

    if not session_id or session_id not in active_sessions:
        return jsonify({'ok': False, 'message': 'Session not found'}), 404

    session = active_sessions[session_id]
    if user_id not in session["users"]:
        return jsonify({'ok': False, 'message': 'User not found in session'}), 404

    messages = session["pending"].get(user_id, [])
    session["pending"][user_id] = []

    signals = session.get("signals", {}).get(user_id, [])
    if user_id in session.get("signals", {}):
        session["signals"][user_id] = []

    return jsonify({
        'ok': True,
        'messages': messages,
        'signals': signals,
        'user_list': build_user_list(session_id),
    }), 200


@app.route("/leave_session", methods=["POST"])
def leave_session_api():
    """Handle user leaving a session."""
    data = request.get_json(silent=True) or {}
    session_id = data.get('session_id')
    user_id = data.get('user_id')

    if session_id in active_sessions and user_id in active_sessions[session_id]["users"]:
        del active_sessions[session_id]["users"][user_id]
        active_sessions[session_id]["pending"].pop(user_id, None)
        active_sessions[session_id]["signals"].pop(user_id, None)

        if not active_sessions[session_id]["users"]:
            del active_sessions[session_id]
            return jsonify({'ok': True, 'user_list': []}), 200

        return jsonify({'ok': True, 'user_list': build_user_list(session_id)}), 200

    return jsonify({'ok': False, 'message': 'Session or user not found'}), 404


@app.route("/change_language", methods=["POST"])
def change_language_api():
    """Update participant's language mid-call without reconnecting."""
    data = request.get_json(silent=True) or {}
    session_id = data.get('session_id')
    user_id = data.get('user_id')
    new_language = data.get('language_code', 'en').strip()

    if session_id in active_sessions and user_id in active_sessions[session_id]["users"]:
        active_sessions[session_id]["users"][user_id]["language"] = new_language
        return jsonify({
            'ok': True,
            'language': new_language,
            'user_list': build_user_list(session_id),
        }), 200

    return jsonify({'ok': False, 'message': 'Session or user not found'}), 404


@app.route("/health")
def health_check():
    """Health check for deployment platforms (Render, Railway, Docker, etc.)."""
    return jsonify({
        'status': 'healthy',
        'active_sessions': len(active_sessions),
        'supported_languages': len(LANGUAGES),
    }), 200


@app.route("/transcribe", methods=["POST"])
def transcribe_api():
    """Transcribe uploaded audio file using speech_recognition."""
    if 'audio' not in request.files:
        return jsonify({'ok': False, 'message': 'No audio file provided'}), 400

    audio_file = request.files['audio']
    language_code = request.form.get('language', 'en-US')

    try:
        audio_bytes = audio_file.read()
        recognizer = sr.Recognizer()

        try:
            with sr.AudioFile(io.BytesIO(audio_bytes)) as source:
                audio_data = recognizer.record(source)
                text = recognizer.recognize_google(audio_data, language=language_code)
                return jsonify({'ok': True, 'text': text}), 200
        except Exception:
            sound = AudioSegment.from_file(io.BytesIO(audio_bytes))
            wav_io = io.BytesIO()
            sound.export(wav_io, format="wav")
            wav_io.seek(0)
            with sr.AudioFile(wav_io) as source:
                audio_data = recognizer.record(source)
                text = recognizer.recognize_google(audio_data, language=language_code)
                return jsonify({'ok': True, 'text': text}), 200

    except sr.UnknownValueError:
        return jsonify({'ok': False, 'message': 'Could not understand audio. Please speak clearly.'}), 400
    except sr.RequestError as e:
        return jsonify({'ok': False, 'message': f'Speech service error: {e}'}), 500
    except Exception as e:
        return jsonify({'ok': False, 'message': f'Audio transcription failed: {str(e)}'}), 400


if __name__ == "__main__":
    import sys
    use_ssl = "--ssl" in sys.argv
    ssl_context = 'adhoc' if use_ssl else None
    protocol = "https" if use_ssl else "http"
    print(f"Starting Voice Translation App on {protocol}://0.0.0.0:5000...")
    app.run(debug=False, host="0.0.0.0", port=5000, ssl_context=ssl_context)

