# Generates a soft placeholder pad (src/assets/music.wav) so you can verify audio works in Safari.
# Replace with the real track by dropping music.mp3 into the project root.
import wave, math, struct, os

sr = 44100
dur = 10.0
freqs = [261.63, 329.63, 392.00]   # soft C-major pad
amp = 0.12
n = int(sr * dur)
out = os.path.join(os.path.dirname(__file__), 'src', 'assets', 'music.wav')

frames = bytearray()
for i in range(n):
    t = i / sr
    trem = 0.85 + 0.15 * math.sin(2 * math.pi * 0.18 * t)
    s = sum(math.sin(2 * math.pi * f * t) for f in freqs) / len(freqs)
    env = 1.0
    if t < 1.0:
        env = t
    elif t > dur - 1.0:
        env = dur - t
    val = int(32767 * amp * trem * env * s)
    val = max(-32768, min(32767, val))
    frames += struct.pack('<h', val)

w = wave.open(out, 'w')
w.setnchannels(1)
w.setsampwidth(2)
w.setframerate(sr)
w.writeframes(bytes(frames))
w.close()
print('wrote', out, round(len(frames) / 1024), 'KB')
