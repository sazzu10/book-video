import socket
import asyncio
import os
import subprocess
import json
import edge_tts

old_getaddrinfo = socket.getaddrinfo
def getaddrinfo_v4(host, port, family=0, *args, **kwargs):
    target = '150.171.27.10' if host == 'speech.platform.bing.com' else host
    return old_getaddrinfo(target, port, socket.AF_INET, *args, **kwargs)
socket.getaddrinfo = getaddrinfo_v4

out_dir = "/sdcard/Download/voice_samples_v42_shaping"
os.makedirs(out_dir, exist_ok=True)

test_sentence = "एक शांत जंगल के पास, रामू नाम का एक सीधा-सादा लकड़हारा रहता था।"

async def test_prosody():
    # 1. Edge-TTS with pitch in Hz vs % vs st
    tests = [
        {"id": "pitch_0hz", "rate": "+15%", "pitch": "+0Hz"},
        {"id": "pitch_15pct", "rate": "+15%", "pitch": "+15%"},
        {"id": "pitch_22pct", "rate": "+18%", "pitch": "+22%"},
        {"id": "pitch_3st", "rate": "+15%", "pitch": "+3st"},
    ]
    
    for t in tests:
        raw_path = os.path.join(out_dir, f"edge_{t['id']}.mp3")
        try:
            comm = edge_tts.Communicate(test_sentence, "hi-IN-MadhurNeural", rate=t["rate"], pitch=t["pitch"])
            await comm.save(raw_path)
            print(f"Edge-TTS {t['id']} -> Success ({os.path.getsize(raw_path)} bytes)")
        except Exception as e:
            print(f"Edge-TTS {t['id']} -> Failed: {e}")

asyncio.run(test_prosody())

# Now test Rubberband and EQ on a clean base
clean_base = os.path.join(out_dir, "edge_pitch_0hz.mp3")

# Shaping 1: Rubberband pitch 1.15 + EQ
shaping_1 = os.path.join(out_dir, "shaped_rubberband_p115.mp3")
subprocess.run([
    "ffmpeg", "-y", "-i", clean_base,
    "-af", "rubberband=pitch=1.15:formant=shifted,highpass=f=90,equalizer=f=220:t=q:w=1.0:g=-3.5,equalizer=f=3200:t=q:w=1.2:g=3.0,treble=g=1.5",
    shaping_1
], check=True)

# Shaping 2: Rubberband pitch 1.20 + EQ
shaping_2 = os.path.join(out_dir, "shaped_rubberband_p120.mp3")
subprocess.run([
    "ffmpeg", "-y", "-i", clean_base,
    "-af", "rubberband=pitch=1.20:formant=shifted,highpass=f=95,equalizer=f=220:t=q:w=1.0:g=-4.0,equalizer=f=3300:t=q:w=1.2:g=3.5,treble=g=2.0",
    shaping_2
], check=True)

# Shaping 3: Edge pitch +15% with EQ (pure Edge-TTS + EQ)
edge_15 = os.path.join(out_dir, "edge_pitch_15pct.mp3")
shaping_3 = os.path.join(out_dir, "shaped_edge_15pct_eq.mp3")
if os.path.exists(edge_15):
    subprocess.run([
        "ffmpeg", "-y", "-i", edge_15,
        "-af", "highpass=f=90,equalizer=f=220:t=q:w=1.0:g=-3.0,equalizer=f=3200:t=q:w=1.2:g=2.5,treble=g=1.5",
        shaping_3
    ], check=True)

print("Audio processing complete. Measuring pitch / frequency...")
for f in sorted(os.listdir(out_dir)):
    if f.endswith(".mp3"):
        p = os.path.join(out_dir, f)
        # Measure pitch using ffmpeg showwaves or pitch detection
        # We can extract average frequency via astats
        probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", p], capture_output=True, text=True)
        dur = float(probe.stdout.strip())
        print(f"File: {f} | Duration: {dur:.2f}s | Size: {os.path.getsize(p)} bytes")
