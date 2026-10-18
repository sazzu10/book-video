import socket
import asyncio
import os
import subprocess
import edge_tts

old_getaddrinfo = socket.getaddrinfo
def getaddrinfo_v4(host, port, family=0, *args, **kwargs):
    target = '150.171.27.10' if host == 'speech.platform.bing.com' else host
    return old_getaddrinfo(target, port, socket.AF_INET, *args, **kwargs)
socket.getaddrinfo = getaddrinfo_v4

out_dir = "/data/data/com.termux/files/home/book-video/tmp_voice_tests"
os.makedirs(out_dir, exist_ok=True)

test_hindi_text = "एक शांत जंगल के पास, रामू नाम का एक सीधा-सादा लकड़हारा रहता था। वह रोज़ मेहनत से सूखी लकड़ियां काटता और अपनी ईमानदारी पर जीता था।"

candidates = [
    ("hi-IN-MadhurNeural", "+0%", "+0Hz", "madhur_default.mp3"),
    ("hi-IN-MadhurNeural", "+15%", "+2Hz", "madhur_conversational_15_p2.mp3"),
    ("hi-IN-MadhurNeural", "+25%", "+4Hz", "madhur_youthful_25_p4.mp3"),
    ("mr-IN-ManoharNeural", "+0%", "+0Hz", "manohar_marathi_default.mp3"),
    ("mr-IN-ManoharNeural", "+15%", "+2Hz", "manohar_marathi_15_p2.mp3"),
    ("en-IN-PrabhatNeural", "+0%", "+0Hz", "prabhat_devanagari.mp3"),
    ("ur-IN-SalmanNeural", "+0%", "+0Hz", "salman_devanagari.mp3"),
]

async def test_voices():
    print("Testing candidate voices...")
    for voice, rate, pitch, fname in candidates:
        out_path = os.path.join(out_dir, fname)
        print(f"Generating with {voice} (rate={rate}, pitch={pitch})...")
        try:
            communicate = edge_tts.Communicate(test_hindi_text, voice, rate=rate, pitch=pitch)
            await communicate.save(out_path)
            # probe duration and size
            res = subprocess.run([
                "ffprobe", "-v", "error", "-show_entries", "format=duration,size",
                "-of", "default=noprint_wrappers=1", out_path
            ], capture_output=True, text=True)
            print(f"  -> SUCCESS {fname}: {res.stdout.strip().replace(chr(10), ', ')}")
        except Exception as e:
            print(f"  -> FAILED {voice}: {e}")

asyncio.run(test_voices())
