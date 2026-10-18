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

scenes = [
    ("scene_001", "एक शांत जंगल के पास, रामू नाम का एक सीधा-सादा लकड़हारा रहता था।", "+36%", "+3Hz", 0.08),
    ("scene_002", "वह हर रोज़ अपनी पुरानी लोहे की कुल्हाड़ी से, सूखी लकड़ियाँ काटता था।", "+35%", "+3Hz", 0.08),
    ("scene_003", "अचानक... नदी किनारे पेड़ काटते हुए, उसकी कुल्हाड़ी पानी में जा गिरी!", "+38%", "+4Hz", 0.10),
    ("scene_004", "कुल्हाड़ी गहरे भँवर में समा गई... और बेबस रामू फूट-फूट कर रोने लगा।", "+30%", "+2Hz", 0.10),
    ("scene_005", "तभी... पावन लहरों के बीच से, एक करुणामयी दिव्य जलदेवी प्रकट हुईं!", "+32%", "+3Hz", 0.10),
    ("scene_006", "देवी ने पानी से एक चमचमाती... सोने की कुल्हाड़ी निकाली।", "+34%", "+3Hz", 0.08),
    ("scene_007", "रामू ने हाथ जोड़कर नम्रता से कहा—'हे देवी, यह सोने की कुल्हाड़ी मेरी नहीं है।'", "+36%", "+3Hz", 0.10),
    ("scene_008", "फिर देवी ने चाँदी की कुल्हाड़ी दिखाई, पर रामू ने उसे भी लेने से साफ़ मना कर दिया।", "+36%", "+3Hz", 0.10),
    ("scene_009", "तीसरी बार जब देवी ने उसकी पुरानी लोहे की कुल्हाड़ी निकाली—", "+38%", "+4Hz", 0.08),
    ("scene_010", "तो रामू खुशी से झूम उठा! देवी उसकी सच्चाई से अत्यंत प्रसन्न हुईं।", "+34%", "+3Hz", 0.10),
    ("scene_011", "देवी ने उपहार में तीनों कुल्हाड़ियाँ उसे दे दीं, और रामू हँसते-हँसते गाँव लौट आया।", "+34%", "+3Hz", 0.10),
    ("scene_012", "यह कहानी सिखाती है—कि ईमानदारी ही इंसान की सबसे बड़ी और सच्ची दौलत होती है।", "+30%", "+3Hz", 0.20),
]

out_dir = "/data/data/com.termux/files/home/book-video/episodes/the-honest-woodcutter-v4.1/audio"

async def generate_all():
    total_dur = 0.0
    for sid, text, rate, pitch, pause in scenes:
        raw_path = os.path.join(out_dir, f"{sid}.raw.mp3")
        final_path = os.path.join(out_dir, f"{sid}.mp3")
        for attempt in range(4):
            try:
                comm = edge_tts.Communicate(text, "hi-IN-MadhurNeural", rate=rate, pitch=pitch, connect_timeout=10)
                await comm.save(raw_path)
                break
            except Exception as e:
                if attempt == 3: raise e
                await asyncio.sleep(1.0)
        
        if pause > 0.04:
            subprocess.run(["ffmpeg", "-y", "-i", raw_path, "-af", f"apad=pad_dur={pause:.2f}", final_path], capture_output=True)
        else:
            os.replace(raw_path, final_path)
        if os.path.exists(raw_path):
            os.remove(raw_path)
            
        probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", final_path], capture_output=True, text=True)
        d = float(probe.stdout.strip())
        total_dur += d
        print(f"{sid}: {d:.2f}s (running: {total_dur:.2f}s)")
        
    print(f"\nTOTAL AUDIO DURATION: {total_dur:.2f} seconds!")

asyncio.run(generate_all())
