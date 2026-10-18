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

out_dir = "/sdcard/Download/voice_samples_v42"
os.makedirs(out_dir, exist_ok=True)

test_hindi_dev = "एक शांत जंगल के पास, रामू नाम का एक सीधा-सादा लकड़हारा रहता था।"
test_hindi_rom = "Ek shaant jangal ke paas, Ramu naam ka ek seedha-saadha lakadhara rehta tha."

candidates = [
    {"name": "hi-IN-MadhurNeural", "text": test_hindi_dev, "rate": "+0%", "pitch": "+0Hz", "desc": "Madhur default baseline"},
    {"name": "hi-IN-MadhurNeural", "text": test_hindi_dev, "rate": "+18%", "pitch": "+4Hz", "desc": "Madhur lively rate+18 pitch+4"},
    {"name": "hi-IN-MadhurNeural", "text": test_hindi_dev, "rate": "+24%", "pitch": "+6Hz", "desc": "Madhur energetic rate+24 pitch+6"},
    {"name": "mr-IN-ManoharNeural", "text": test_hindi_dev, "rate": "+15%", "pitch": "+2Hz", "desc": "Manohar (Marathi Devanagari) rate+15 pitch+2"},
    {"name": "mr-IN-ManoharNeural", "text": test_hindi_dev, "rate": "+0%", "pitch": "+0Hz", "desc": "Manohar default"},
    {"name": "en-US-AndrewMultilingualNeural", "text": test_hindi_dev, "rate": "+0%", "pitch": "+0Hz", "desc": "Andrew Multilingual with Devanagari"},
    {"name": "en-US-AndrewMultilingualNeural", "text": test_hindi_rom, "rate": "+0%", "pitch": "+0Hz", "desc": "Andrew Multilingual with Romanized Hindi"},
    {"name": "en-US-BrianMultilingualNeural", "text": test_hindi_dev, "rate": "+0%", "pitch": "+0Hz", "desc": "Brian Multilingual with Devanagari"},
    {"name": "en-US-BrianMultilingualNeural", "text": test_hindi_rom, "rate": "+0%", "pitch": "+0Hz", "desc": "Brian Multilingual with Romanized Hindi"},
    {"name": "ur-IN-SalmanNeural", "text": test_hindi_dev, "rate": "+0%", "pitch": "+0Hz", "desc": "Salman with Devanagari"},
    {"name": "ur-IN-SalmanNeural", "text": "ایک پرامن جنگل کے قریب، رامو نام کا ایک سیدھا سادہ لکڑہارا रहता تھا۔", "rate": "+0%", "pitch": "+0Hz", "desc": "Salman with Urdu/Nastaliq"},
    {"name": "ur-PK-AsadNeural", "text": "ایک پرامن جنگل کے قریب، رامو نام کا ایک سیدھا سادہ لکڑہارا رہتا تھا۔", "rate": "+0%", "pitch": "+0Hz", "desc": "Asad with Urdu/Nastaliq"},
    {"name": "en-IN-PrabhatNeural", "text": test_hindi_dev, "rate": "+0%", "pitch": "+0Hz", "desc": "Prabhat with Devanagari"},
    {"name": "en-IN-PrabhatNeural", "text": test_hindi_rom, "rate": "+0%", "pitch": "+0Hz", "desc": "Prabhat with Romanized Hindi"}
]

async def test_all():
    results = []
    for i, c in enumerate(candidates):
        filename = f"test_{i+1:02d}_{c['name'].replace('-', '_')}.mp3"
        filepath = os.path.join(out_dir, filename)
        status = "OK"
        dur = 0
        size = 0
        try:
            comm = edge_tts.Communicate(c['text'], c['name'], rate=c['rate'], pitch=c['pitch'], connect_timeout=10)
            await comm.save(filepath)
            size = os.path.getsize(filepath)
            if size < 500:
                status = f"EMPTY/TOO_SMALL ({size} bytes)"
            else:
                probe = subprocess.run([
                    "ffprobe", "-v", "error", "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1", filepath
                ], capture_output=True, text=True)
                dur = float(probe.stdout.strip())
        except Exception as e:
            status = f"ERROR: {str(e)}"
        
        res = {
            "index": i + 1,
            "voice": c['name'],
            "desc": c['desc'],
            "rate": c['rate'],
            "pitch": c['pitch'],
            "status": status,
            "duration": dur,
            "fileSize": size,
            "file": filepath
        }
        results.append(res)
        print(f"[{i+1}/{len(candidates)}] {c['name']} ({c['desc']}) -> {status} ({dur}s, {size} bytes)")
    
    with open(os.path.join(out_dir, "test_results.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

asyncio.run(test_all())
