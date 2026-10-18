import os
import json
import subprocess
import whisper

samples_dir = "/sdcard/Download/voice_samples_v42"
files = sorted([f for f in os.listdir(samples_dir) if f.endswith(".mp3")])

print(f"Found {len(files)} test audio files in {samples_dir}")

# Load whisper model
print("Loading Whisper model (base)...")
try:
    model = whisper.load_model("base")
    whisper_available = True
except Exception as e:
    print(f"Whisper load error: {e}")
    whisper_available = False

results = []
expected_text = "एक शांत जंगल के पास, रामू नाम का एक सीधा-सादा लकड़हारा रहता था।"

for f in files:
    path = os.path.join(samples_dir, f)
    # ffprobe duration & stats
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path], capture_output=True, text=True)
    try:
        dur = float(p.stdout.strip())
    except:
        dur = 0
    
    transcription = ""
    lang = ""
    if whisper_available and dur > 0:
        try:
            res = model.transcribe(path, language="hi")
            transcription = res.get("text", "").strip()
            lang = res.get("language", "")
        except Exception as err:
            transcription = f"ERR: {err}"
    
    # Audio frequency analysis via ffmpeg astats / ebur128
    f_stat = subprocess.run([
        "ffmpeg", "-i", path, "-af", "astats=metadata=1:reset=1", "-f", "null", "-"
    ], capture_output=True, text=True)
    rms = ""
    for line in f_stat.stderr.splitlines():
        if "RMS level dB:" in line:
            rms = line.split(":")[1].strip()
            break
            
    info = {
        "file": f,
        "duration": round(dur, 2),
        "rmsDb": rms,
        "whisper_transcription": transcription,
        "language_detected": lang
    }
    results.append(info)
    print(f"\n--- {f} ---")
    print(f"Duration: {dur:.2f}s | RMS: {rms} dB")
    print(f"Whisper: '{transcription}'")

with open(os.path.join(samples_dir, "evaluation_summary.json"), "w", encoding="utf-8") as out_f:
    json.dump(results, out_f, ensure_ascii=False, indent=2)
