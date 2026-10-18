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

out_dir = "/sdcard/Download/voice_samples"
os.makedirs(out_dir, exist_ok=True)

test_sentence = "एक शांत जंगल के पास, रामू नाम का एक सीधा-सादा लकड़हारा रहता था। वह रोज़ मेहनत से सूखी लकड़ियां काटता और अपनी ईमानदारी पर जीता था।"

comparisons = [
    {
        "id": "sample_1_madhur_baseline",
        "voice": "hi-IN-MadhurNeural",
        "rate": "+0%",
        "pitch": "+0Hz",
        "label": "hi-IN-Madhur Baseline (Default Mature/Formal)"
    },
    {
        "id": "sample_2_madhur_youthful_warm",
        "voice": "hi-IN-MadhurNeural",
        "rate": "+16%",
        "pitch": "+3Hz",
        "label": "hi-IN-Madhur Calibrated Young Storyteller (~25-30 vocal age)"
    },
    {
        "id": "sample_3_madhur_energetic",
        "voice": "hi-IN-MadhurNeural",
        "rate": "+22%",
        "pitch": "+5Hz",
        "label": "hi-IN-Madhur Fast Youthful Pacing (~22-26 vocal age)"
    },
    {
        "id": "sample_4_manohar_marathi",
        "voice": "mr-IN-ManoharNeural",
        "rate": "+15%",
        "pitch": "+2Hz",
        "label": "mr-IN-Manohar Indian Devanagari Voice"
    },
    {
        "id": "sample_5_andrew_multilingual",
        "voice": "en-US-AndrewMultilingualNeural",
        "rate": "+5%",
        "pitch": "+0Hz",
        "label": "en-US-Andrew Multilingual Neural"
    }
]

async def run_eval():
    results = []
    print("=== Generating Voice Comparison Samples ===")
    for item in comparisons:
        wav_path = os.path.join(out_dir, f"{item['id']}.mp3")
        print(f"Generating: {item['label']}...")
        communicate = edge_tts.Communicate(test_sentence, item["voice"], rate=item["rate"], pitch=item["pitch"])
        await communicate.save(wav_path)

        # Probe stats
        probe = subprocess.run([
            "ffprobe", "-v", "error", "-show_entries", "format=duration,size,bit_rate",
            "-of", "json", wav_path
        ], capture_output=True, text=True)
        probe_data = json.loads(probe.stdout)
        dur = float(probe_data["format"]["duration"])
        size = int(probe_data["format"]["size"])

        # Astats
        astat = subprocess.run([
            "ffmpeg", "-i", wav_path, "-af", "astats=metadata=1:reset=1", "-f", "null", "-"
        ], capture_output=True, text=True)
        rms = -20.0
        for line in astat.stderr.splitlines():
            if "RMS level dB:" in line:
                try:
                    rms = float(line.split(":")[1].strip())
                except:
                    pass

        item_result = {
            "id": item["id"],
            "label": item["label"],
            "voice": item["voice"],
            "rate": item["rate"],
            "pitch": item["pitch"],
            "duration": round(dur, 2),
            "fileSize": size,
            "rmsDb": rms,
            "path": wav_path
        }
        results.append(item_result)
        print(f"  -> Generated: {dur:.2f}s | Size: {size} bytes | Path: {wav_path}")

    # Write summary
    summary_path = os.path.join(out_dir, "comparison_manifest.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved comparison manifest to {summary_path}")

asyncio.run(run_eval())
