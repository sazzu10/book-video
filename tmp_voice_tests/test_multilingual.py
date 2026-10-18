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
test_hindi_text = "एक शांत जंगल के पास, रामू नाम का एक सीधा-सादा लकड़हारा रहता था। वह रोज़ मेहनत से सूखी लकड़ियां काटता और अपनी ईमानदारी पर जीता था।"

async def test_multi():
    for v in ["en-US-AndrewMultilingualNeural", "en-US-BrianMultilingualNeural"]:
        out_path = os.path.join(out_dir, f"{v}.mp3")
        try:
            communicate = edge_tts.Communicate(test_hindi_text, v)
            await communicate.save(out_path)
            res = subprocess.run([
                "ffprobe", "-v", "error", "-show_entries", "format=duration,size",
                "-of", "default=noprint_wrappers=1", out_path
            ], capture_output=True, text=True)
            print(f"SUCCESS {v}: {res.stdout.strip().replace(chr(10), ', ')}")
        except Exception as e:
            print(f"FAILED {v}: {e}")

asyncio.run(test_multi())
