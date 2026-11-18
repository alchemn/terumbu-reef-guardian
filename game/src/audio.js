// All sound is synthesised with WebAudio — no audio files, no network.
// Bubble pops, pearl chimes, a hurt thud, wave horns, a win fanfare and a soft
// ambient pad that hums under the game. M toggles mute.
export function createAudio() {
  let ctx = null;
  let master = null;
  let padNodes = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, lowpass) {
    if (!ctx || !master) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 900;
    const gain = ctx.createGain();
    gain.gain.value = vol || 0.25;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  function startPad() {
    if (!ctx || padNodes) return;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.045;
    padGain.connect(master);
    const oscs = [];
    for (const freq of [110, 164.8, 220, 277.2]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 8;
      osc.connect(padGain);
      osc.start();
      oscs.push(osc);
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(padGain.gain);
    lfo.start();
    padNodes = { oscs, lfo, padGain };
  }

  return {
    unlock() {
      if (ensure()) startPad();
    },
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    pop(combo) {
      if (!ensure()) return;
      const step = Math.min(combo || 1, 8);
      tone(520 + step * 55, 0.12, 'sine', 0.22, 940 + step * 60);
      tone(1040 + step * 90, 0.09, 'triangle', 0.08, 1500);
    },
    chime() {
      if (!ensure()) return;
      tone(880, 0.25, 'sine', 0.16, 1320);
      tone(1318, 0.3, 'sine', 0.1, 1760, 0.05);
    },
    hurt() {
      if (!ensure()) return;
      tone(160, 0.28, 'sawtooth', 0.22, 55);
      noiseBurst(0.18, 0.2, 500);
    },
    heal() {
      if (!ensure()) return;
      tone(523, 0.18, 'sine', 0.18, 784);
      tone(784, 0.22, 'sine', 0.14, 1046, 0.08);
    },
    shieldUp() {
      if (!ensure()) return;
      tone(392, 0.16, 'triangle', 0.16, 784);
      tone(587, 0.2, 'triangle', 0.12, 1174, 0.06);
    },
    waveHorn() {
      if (!ensure()) return;
      tone(220, 0.35, 'triangle', 0.2, 330);
      tone(330, 0.4, 'triangle', 0.14, 440, 0.12);
    },
    win() {
      if (!ensure()) return;
      const notes = [523, 659, 784, 1046, 1318];
      notes.forEach((n, i) => tone(n, 0.4, 'triangle', 0.18, n * 1.01, i * 0.13));
    },
    lose() {
      if (!ensure()) return;
      const notes = [392, 330, 262, 196];
      notes.forEach((n, i) => tone(n, 0.4, 'sine', 0.16, n * 0.94, i * 0.16));
    },
    click() {
      if (!ensure()) return;
      tone(700, 0.06, 'square', 0.08, 900);
    },
  };
}
