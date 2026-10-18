import socket
import asyncio
import os
import sys
import edge_tts

old_getaddrinfo = socket.getaddrinfo
def getaddrinfo_v4(host, port, family=0, *args, **kwargs):
    target = '150.171.27.10' if host == 'speech.platform.bing.com' else host
    return old_getaddrinfo(target, port, socket.AF_INET, *args, **kwargs)
socket.getaddrinfo = getaddrinfo_v4

text = "एक शांत जंगल के पास, रामू नाम का एक सीधा-सादा लकड़हारा रहता था।"
out_path = "/data/data/com.termux/files/home/book-video/tmp_test_tts.mp3"

async def test_robust():
    print("Testing robust edge-tts...")
    for attempt in range(4):
        try:
            communicate = edge_tts.Communicate(text, "hi-IN-MadhurNeural", rate="+28%", pitch="+3Hz", connect_timeout=10)
            await communicate.save(out_path)
            print(f"Success on attempt {attempt + 1}! File size: {os.path.getsize(out_path)}")
            return
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            await asyncio.sleep(1.5)

asyncio.run(test_robust())
