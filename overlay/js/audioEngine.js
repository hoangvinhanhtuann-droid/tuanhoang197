/**
 * Bộ xử lý Âm Thanh Thiền Đường & DSP Giọng Nam Trầm Ấm Đọc Kinh
 * - 6 Chế độ Nhạc Nền Thiền & Phật Giáo (Ngũ Cung 432Hz, Giai điệu A Di Đà Phật, Đàn Cổ Tranh & Tiêu Trúc,
 *   Chuông Xoay Tây Tạng, Chuông Gió Chùa Đêm, và Nhạc MP3 Tự Chọn từ máy tính)
 * - Chuông Đại Hồng Chung / Chuông Xoay (432Hz Harmonics)
 * - Tiếng Mõ Gỗ Tĩnh Tâm định kỳ
 * - Chuỗi lọc DSP (Low-Shelf Warmth EQ + Temple Hall Reverb) cho Giọng Đọc Kinh
 */

class TempleAudioEngine {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.reverbNode = null;
    this.masterGain = null;
    this.woodenFishTimer = null;
    this.ambientTimer = null;
    this.customAudioEl = null;
    this.isSpeaking = false;
    this.melodyStep = 0;

    this.config = {
      woodenFishEnabled: true,
      woodenFishBpm: 46,
      bellEnabled: true,
      bgMusicEnabled: true,
      bgMusicTrack: 'zen_pentatonic_432',
      customMp3Url: '',
      bgMusicVolume: 0.38,
      reverbLevel: 0.28,
      warmthDb: 4.5,
      playbackRate: 0.93
    };

    // Tự động khởi tạo âm thanh ngay khi nạp (tương thích OBS & TikTok Live Studio)
    setTimeout(() => this.initContext(), 100);
  }

  initContext() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.95;
        this.masterGain.connect(this.ctx.destination);

        this.reverbNode = this.createTempleReverbImpulse(2.4, 2.2);
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.unlocked = true;
      this.startWoodenFishLoop();
      this.restartAmbientMusic();
    } catch (err) {
      console.warn('[Audio] Auto init context deferred:', err.message);
    }
  }

  ensureUnlocked() {
    if (!this.ctx || !this.unlocked || (this.ctx && this.ctx.state === 'suspended')) {
      this.initContext();
    }
  }

  createTempleReverbImpulse(durationSec = 2.4, decay = 2.2) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * durationSec);
    const impulse = this.ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const env = Math.pow(1 - i / length, decay);
        data[i] = (Math.random() * 2 - 1) * env * 0.5;
      }
    }
    const convolver = this.ctx.createConvolver();
    convolver.buffer = impulse;
    return convolver;
  }

  updateConfig(newCfg = {}) {
    const prevBpm = this.config.woodenFishBpm;
    const prevWf = this.config.woodenFishEnabled;
    const prevTrack = this.config.bgMusicTrack;
    const prevMp3 = this.config.customMp3Url;
    const prevMusicEnabled = this.config.bgMusicEnabled;

    this.config = { ...this.config, ...newCfg };

    if (this.unlocked && (prevBpm !== this.config.woodenFishBpm || prevWf !== this.config.woodenFishEnabled)) {
      this.startWoodenFishLoop();
    }

    if (
      this.unlocked &&
      (prevTrack !== this.config.bgMusicTrack ||
        prevMp3 !== this.config.customMp3Url ||
        prevMusicEnabled !== this.config.bgMusicEnabled)
    ) {
      this.restartAmbientMusic();
    }

    if (this.customAudioEl) {
      const vol = this.config.bgMusicEnabled
        ? Math.max(0, Math.min(1, (Number(this.config.bgMusicVolume) || 0.38) * (this.isSpeaking ? 0.25 : 0.85)))
        : 0;
      this.customAudioEl.volume = vol;
    }
  }

  /**
   * Tiếng Chuông Chùa / Chuông Xoay Ngân Vang (432Hz Spiritual Tuning)
   */
  playTempleBell(intensity = 1.0) {
    this.ensureUnlocked();
    if (!this.ctx || !this.config.bellEnabled) return;
    const now = this.ctx.currentTime;
    const partials = [
      { freq: 216, amp: 0.42, decay: 4.2 },
      { freq: 432, amp: 0.30, decay: 3.6 },
      { freq: 654, amp: 0.16, decay: 2.8 },
      { freq: 882, amp: 0.10, decay: 2.1 },
      { freq: 1188, amp: 0.06, decay: 1.5 }
    ];

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(p.amp * intensity * 0.45, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + p.decay + 0.05);
    });
  }

  /**
   * Tiếng Mõ Gỗ Chánh Điện ("Cốc... Cốc...")
   */
  playWoodenFish() {
    this.ensureUnlocked();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(515, now);
    osc.frequency.exponentialRampToValueAtTime(395, now + 0.085);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(510, now);
    filter.Q.setValueAtTime(6.5, now);

    const vol = this.isSpeaking ? 0.11 : 0.21;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.13);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);

    if (typeof window.onWoodenFishBeat === 'function') {
      window.onWoodenFishBeat();
    }
  }

  startWoodenFishLoop() {
    if (this.woodenFishTimer) {
      clearInterval(this.woodenFishTimer);
      this.woodenFishTimer = null;
    }
    if (!this.config.woodenFishEnabled) return;
    const bpm = Math.max(24, Math.min(90, Number(this.config.woodenFishBpm) || 46));
    const intervalMs = Math.round((60 / bpm) * 1000);
    this.woodenFishTimer = setInterval(() => {
      if (this.unlocked && this.config.woodenFishEnabled) {
        this.playWoodenFish();
      }
    }, intervalMs);
  }

  /**
   * Hệ thống 6 Chế Độ Nhạc Nền Thiền Đường
   */
  restartAmbientMusic() {
    if (this.ambientTimer) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    if (this.customAudioEl) {
      try {
        this.customAudioEl.pause();
      } catch (_) {}
      this.customAudioEl = null;
    }

    this.ensureUnlocked();
    if (!this.ctx || !this.config.bgMusicEnabled) return;

    const track = this.config.bgMusicTrack || 'zen_pentatonic_432';

    // Chế độ 6: Phát file MP3 tùy chọn từ máy tính
    if (track === 'custom_mp3' && this.config.customMp3Url) {
      this.customAudioEl = new Audio(this.config.customMp3Url);
      this.customAudioEl.loop = true;
      this.customAudioEl.volume = Math.max(0, Math.min(1, (Number(this.config.bgMusicVolume) || 0.38) * 0.85));
      this.customAudioEl.play().catch(e => console.warn('[CustomMP3]', e));
      return;
    }

    const stepTick = () => {
      this.ensureUnlocked();
    if (!this.ctx || !this.config.bgMusicEnabled) return;
      const baseVol = (Number(this.config.bgMusicVolume) || 0.38) * (this.isSpeaking ? 0.08 : 0.22);
      const t = this.config.bgMusicTrack || 'zen_pentatonic_432';

      if (t === 'omitofo_chant_pad') {
        this.playOmitofoMelodyStep(baseVol);
      } else if (t === 'guzheng_lotus_pond') {
        this.playGuzhengFluteStep(baseVol);
      } else if (t === 'singing_bowl_meditation') {
        this.playSingingBowlStep(baseVol);
      } else if (t === 'temple_night_ambience') {
        this.playTempleNightStep(baseVol);
      } else {
        this.playZenPentatonicStep(baseVol);
      }
    };

    stepTick();
    const intervalMap = {
      zen_pentatonic_432: 4500,
      omitofo_chant_pad: 3200,
      guzheng_lotus_pond: 2600,
      singing_bowl_meditation: 5200,
      temple_night_ambience: 3800
    };
    this.ambientTimer = setInterval(stepTick, intervalMap[track] || 4200);
  }

  // 1. Nhạc Thiền Tĩnh Tâm 432Hz (Chuông Xoay & Hòa Âm Ngũ Cung)
  playZenPentatonicStep(vol) {
    const scale = [216, 243, 272.2, 324, 364.5, 432];
    const now = this.ctx.currentTime;
    const root = scale[this.melodyStep % 3];
    const fifth = scale[(this.melodyStep + 2) % scale.length];
    this.melodyStep++;

    [root, fifth].forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol * 0.65, now + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 5.4);
    });
  }

  // 2. Giai Điệu Niệm Phật A Di Đà (4 nốt "A Di Đà Phật" truyền thống bằng âm Đàn Tranh & Pad)
  playOmitofoMelodyStep(vol) {
    // Giai điệu Tịnh Độ 2 vế: [Mi - Sol - La - Sol] và [Rê - Mi - Sol - Rê]
    const phrases = [
      [329.63, 392.00, 440.00, 392.00],
      [293.66, 329.63, 392.00, 293.66]
    ];
    const phrase = phrases[this.melodyStep % 2];
    this.melodyStep++;
    const now = this.ctx.currentTime;

    // Pad trầm nền
    const padOsc = this.ctx.createOscillator();
    const padGain = this.ctx.createGain();
    padOsc.type = 'sine';
    padOsc.frequency.setValueAtTime(phrase[0] * 0.5, now);
    padGain.gain.setValueAtTime(0.0001, now);
    padGain.gain.linearRampToValueAtTime(vol * 0.45, now + 0.8);
    padGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.1);
    padOsc.connect(padGain);
    padGain.connect(this.masterGain);
    padOsc.start(now);
    padOsc.stop(now + 3.2);

    // 4 tiếng gảy Đàn Tranh ngân theo nhịp câu niệm "A - Di - Đà - Phật"
    phrase.forEach((freq, idx) => {
      const start = now + idx * 0.72;
      this.pluckStringNote(freq, start, vol * 0.85, 1.35);
    });
  }

  // 3. Cổ Tranh Liên Hoa Đêm Trăng (Đàn Tranh gảy ngũ cung & Tiêu Trúc ngân)
  playGuzhengFluteStep(vol) {
    const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
    const now = this.ctx.currentTime;
    const baseIdx = (this.melodyStep * 2) % (pentatonic.length - 3);
    this.melodyStep++;

    // Rải 3 nốt đàn tranh
    for (let i = 0; i < 3; i++) {
      const freq = pentatonic[(baseIdx + i) % pentatonic.length];
      this.pluckStringNote(freq, now + i * 0.45, vol * 0.8, 1.6);
    }

    // Tiếng Tiêu Trúc êm dịu
    const fluteOsc = this.ctx.createOscillator();
    const fluteFilter = this.ctx.createBiquadFilter();
    const fluteGain = this.ctx.createGain();
    fluteOsc.type = 'triangle';
    fluteOsc.frequency.setValueAtTime(pentatonic[baseIdx] * 0.5, now + 0.3);
    fluteFilter.type = 'lowpass';
    fluteFilter.frequency.setValueAtTime(680, now);

    fluteGain.gain.setValueAtTime(0.0001, now + 0.3);
    fluteGain.gain.linearRampToValueAtTime(vol * 0.42, now + 1.1);
    fluteGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

    fluteOsc.connect(fluteFilter);
    fluteFilter.connect(fluteGain);
    fluteGain.connect(this.masterGain);
    fluteOsc.start(now + 0.3);
    fluteOsc.stop(now + 2.55);
  }

  // 4. Chuông Xoay Tây Tạng & Suối Thiền
  playSingingBowlStep(vol) {
    const bowlFreqs = [174, 285, 396, 528];
    const f = bowlFreqs[this.melodyStep % bowlFreqs.length];
    this.melodyStep++;
    const now = this.ctx.currentTime;

    [1, 2.02, 2.98].forEach((mult, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * mult, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime((vol * 0.7) / (i + 1), now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 4.9);
    });
  }

  // 5. Không Gian Chùa Đêm & Chuông Gió Hiên Chùa
  playTempleNightStep(vol) {
    const chimeFreqs = [1046.5, 1174.6, 1318.5, 1567.9, 1760.0];
    const now = this.ctx.currentTime;
    this.melodyStep++;

    // 2 tiếng chuông gió thanh mảnh
    for (let i = 0; i < 2; i++) {
      const freq = chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)];
      this.pluckStringNote(freq, now + i * 0.6, vol * 0.45, 1.9);
    }

    // Chuông trầm xa xăm
    if (this.melodyStep % 2 === 0) {
      this.pluckStringNote(216, now + 0.2, vol * 0.75, 3.4);
    }
  }

  pluckStringNote(freq, startTime, amp, decaySec) {
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(amp, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decaySec);

    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.22;

    osc.connect(gain);
    osc2.connect(subGain);
    subGain.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc2.start(startTime);
    osc.stop(startTime + decaySec + 0.05);
    osc2.stop(startTime + decaySec + 0.05);
  }

  /**
   * Phát Giọng Nam Trầm Ấm Đọc Kinh / Xướng Tên qua Bộ Lọc Âm Học Chánh Điện
   */
  async playChantSpeech({ audioBase64, text, voiceConfig }) {
    if (voiceConfig) {
      this.updateConfig(voiceConfig);
    }

    if (!this.unlocked) {
      this.initContext();
    }

    this.isSpeaking = true;
    if (this.customAudioEl) {
      this.customAudioEl.volume = Math.max(0, (Number(this.config.bgMusicVolume) || 0.38) * 0.2);
    }

    this.playTempleBell(0.95);
    await new Promise(r => setTimeout(r, 750));

    if (audioBase64 && this.ctx) {
      try {
        const binary = atob(audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const audioBuffer = await this.ctx.decodeAudioData(bytes.buffer.slice(0));
        const source = this.ctx.createBufferSource();
        source.buffer = audioBuffer;

        const rate = Number(this.config.playbackRate) || 0.93;
        source.playbackRate.value = Math.max(0.75, Math.min(1.15, rate));

        const lowShelf = this.ctx.createBiquadFilter();
        lowShelf.type = 'lowshelf';
        lowShelf.frequency.value = 175;
        lowShelf.gain.value = Number(this.config.warmthDb) || 4.5;

        const highShelf = this.ctx.createBiquadFilter();
        highShelf.type = 'highshelf';
        highShelf.frequency.value = 4000;
        highShelf.gain.value = -3.0;

        const dryGain = this.ctx.createGain();
        const wetGain = this.ctx.createGain();
        const revLvl = Math.max(0, Math.min(0.65, Number(this.config.reverbLevel) ?? 0.28));
        dryGain.gain.value = 1.0;
        wetGain.gain.value = revLvl;

        source.connect(lowShelf);
        lowShelf.connect(highShelf);

        highShelf.connect(dryGain);
        dryGain.connect(this.masterGain);

        if (this.reverbNode) {
          highShelf.connect(this.reverbNode);
          this.reverbNode.connect(wetGain);
          wetGain.connect(this.masterGain);
        }

        await new Promise(resolve => {
          source.onended = resolve;
          source.start(0);
        });

        this.playTempleBell(0.65);
        this.isSpeaking = false;
        if (this.customAudioEl && this.config.bgMusicEnabled) {
          this.customAudioEl.volume = Math.max(0, Math.min(1, (Number(this.config.bgMusicVolume) || 0.38) * 0.85));
        }
        return;
      } catch (err) {
        console.warn('[AudioEngine] WebAudio decode fallback:', err);
      }
    }

    if ('speechSynthesis' in window && text) {
      await new Promise(resolve => {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'vi-VN';
        utter.pitch = 0.75;
        utter.rate = 0.82;
        utter.onend = resolve;
        utter.onerror = resolve;
        window.speechSynthesis.speak(utter);
      });
    }
    this.isSpeaking = false;
  }
}

window.templeAudio = new TempleAudioEngine();
