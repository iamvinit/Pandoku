// Procedural Web Audio API Music Sequencer & Distinct Game Sound Effects

const PENTATONIC_SCALE = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.0,  // A5
  1046.5, // C6
  1174.66,// D6
  1318.51,// E6
  1567.98,// G6
];

// 1. MENU / HOME / SINGLE PLAYER HUB: Serene dreamy C-major music-box bamboo lullaby (470ms/step)
const START_MELODY: number[] = [
  523.25, 0, 0, 659.25, 0, 0, 783.99, 0,
  659.25, 0, 0, 587.33, 0, 0, 523.25, 0,
  440.0, 0, 0, 523.25, 0, 0, 659.25, 0,
  587.33, 0, 0, 523.25, 0, 0, 0, 0,
];

const START_BASS: number[] = [
  196.0, 0, 0, 0, 0, 0, 0, 0,
  220.0, 0, 0, 0, 0, 0, 0, 0,
  174.61, 0, 0, 0, 0, 0, 0, 0,
  196.0, 0, 0, 0, 261.63, 0, 0, 0,
];

// 2. ACTIVE SOLO GAMEPLAY: Upbeat, bouncy playful G-major xylophone/marimba groove (250ms/step)
const SOLO_MELODY: number[] = [
  392.0, 493.88, 587.33, 0, 783.99, 659.25, 587.33, 493.88,
  523.25, 0, 659.25, 783.99, 659.25, 0, 587.33, 0,
  783.99, 880.0, 987.77, 0, 880.0, 783.99, 659.25, 587.33,
  659.25, 587.33, 493.88, 587.33, 392.0, 0, 0, 0,
];

const SOLO_BASS: number[] = [
  196.0, 0, 246.94, 0, 293.66, 0, 246.94, 0,
  261.63, 0, 196.0, 0, 293.66, 0, 220.0, 0,
  196.0, 0, 246.94, 0, 261.63, 0, 293.66, 0,
  220.0, 0, 293.66, 0, 196.0, 0, 146.83, 0,
];

// 3. LEVEL / MATCH VICTORY: Joyful bright F-major celebratory parade loop (225ms/step)
const VICTORY_MELODY: number[] = [
  698.46, 0, 880.0, 1046.5, 0, 1174.66, 1046.5, 880.0,
  932.33, 0, 1046.5, 1174.66, 1396.91, 0, 1046.5, 0,
  1174.66, 1046.5, 932.33, 880.0, 1046.5, 0, 880.0, 698.46,
  783.99, 880.0, 1046.5, 0, 1396.91, 0, 0, 0,
];

const VICTORY_BASS: number[] = [
  174.61, 0, 261.63, 0, 174.61, 0, 261.63, 0,
  233.08, 0, 293.66, 0, 261.63, 0, 196.0, 0,
  233.08, 0, 261.63, 0, 174.61, 0, 220.0, 0,
  196.0, 0, 261.63, 0, 174.61, 0, 261.63, 0,
];

// 4. 1v1 DUEL / FINISH SPRINT: Fast-paced energetic arcade race rhythm (180ms/step)
const DUEL_MELODY: number[] = [
  523.25, 659.25, 783.99, 1046.5, 880.0, 783.99, 659.25, 783.99,
  587.33, 783.99, 880.0, 1174.66, 1046.5, 880.0, 783.99, 0,
  659.25, 783.99, 880.0, 1046.5, 1318.51, 1046.5, 880.0, 783.99,
  880.0, 783.99, 659.25, 587.33, 659.25, 783.99, 1046.5, 0,
];

const DUEL_BASS: number[] = [
  261.63, 0, 261.63, 0, 196.0, 0, 220.0, 0,
  293.66, 0, 293.66, 0, 196.0, 0, 246.94, 0,
  220.0, 0, 220.0, 0, 174.61, 0, 196.0, 0,
  246.94, 0, 196.0, 0, 261.63, 0, 196.0, 0,
];

export type MusicMood = 'start' | 'solo' | 'victory' | 'duel' | 'panic';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxMuted = false;
  private musicEnabled = true;
  private musicMood: MusicMood = 'start';
  /** 0..1 urgency during 15s Finish Sprint when opponent already solved */
  private sprintUrgency = 0;
  private musicTimer: ReturnType<typeof setTimeout> | null = null;
  private stepIdx = 0;
  private unlocked = false;
  private isBackgrounded = false;
  /** Timestamp (performance.now) until which background music ducks for victory celebration */
  private musicDuckUntil = 0;

  constructor() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.isBackgrounded = document.hidden;

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseForBackground();
        } else {
          this.resumeFromBackground();
        }
      });

      window.addEventListener('pagehide', () => this.pauseForBackground());
      window.addEventListener('pageshow', () => {
        if (!document.hidden) this.resumeFromBackground();
      });
      document.addEventListener('freeze', () => this.pauseForBackground());
      document.addEventListener('resume', () => {
        if (!document.hidden) this.resumeFromBackground();
      });
    }
  }

  private pauseForBackground() {
    this.isBackgrounded = true;
    this.stopMusicLoop();
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  private resumeFromBackground() {
    this.isBackgrounded = false;
    if (this.ctx && this.ctx.state === 'suspended' && (this.musicEnabled || !this.sfxMuted)) {
      this.ctx.resume().catch(() => {});
    }
    if (this.musicEnabled && this.unlocked) {
      this.scheduleNextBeat();
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.isBackgrounded || (typeof document !== 'undefined' && document.hidden)) {
      return null;
    }
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAudio() {
    if (this.isBackgrounded || (typeof document !== 'undefined' && document.hidden)) {
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (!this.unlocked) {
      this.unlocked = true;
      if (this.musicEnabled) {
        this.scheduleNextBeat();
      }
    }
  }

  public setSfxMuted(muted: boolean) {
    this.sfxMuted = muted;
  }

  public isSfxMuted(): boolean {
    return this.sfxMuted;
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (enabled) {
      this.unlockAudio();
      this.scheduleNextBeat();
    } else {
      this.stopMusicLoop();
    }
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public setMusicMood(mood: MusicMood) {
    if (this.musicMood === mood) return;
    this.musicMood = mood;
    this.stepIdx = 0; // Start each new track cleanly from beat 1
    if (mood !== 'panic') {
      this.sprintUrgency = 0;
    }
    if (this.musicEnabled && this.unlocked) {
      this.stopMusicLoop();
      this.scheduleNextBeat();
    }
  }

  /** Smoothly ramp tempo & pitch frequency up for the slower player during Finish Sprint */
  public setSprintUrgency(urgency0to1: number) {
    this.sprintUrgency = Math.max(0, Math.min(1, urgency0to1));
  }

  private getCurrentStepMs(): number {
    if (this.musicMood === 'panic') {
      return Math.round(148 - this.sprintUrgency * 46);
    }
    if (this.musicMood === 'duel') return 180;
    if (this.musicMood === 'victory') return 225;
    if (this.musicMood === 'solo') return 250;
    return 470;
  }

  private getPitchMultiplier(): number {
    if (this.musicMood === 'panic') {
      const semitones = 2 + this.sprintUrgency * 2.5;
      return Math.pow(2, semitones / 12);
    }
    return 1;
  }

  private scheduleNextBeat() {
    if (
      this.musicTimer ||
      !this.musicEnabled ||
      this.isBackgrounded ||
      (typeof document !== 'undefined' && document.hidden)
    ) {
      return;
    }

    const tick = () => {
      this.musicTimer = null;
      if (
        !this.musicEnabled ||
        this.isBackgrounded ||
        (typeof document !== 'undefined' && document.hidden)
      ) {
        return;
      }

      const ducked = typeof performance !== 'undefined' && performance.now() < this.musicDuckUntil;
      if (this.ctx && this.ctx.state === 'running' && !ducked) {
        const melody =
          this.musicMood === 'start'
            ? START_MELODY
            : this.musicMood === 'solo'
              ? SOLO_MELODY
              : this.musicMood === 'victory'
                ? VICTORY_MELODY
                : DUEL_MELODY;
        const bassTrack =
          this.musicMood === 'start'
            ? START_BASS
            : this.musicMood === 'solo'
              ? SOLO_BASS
              : this.musicMood === 'victory'
                ? VICTORY_BASS
                : DUEL_BASS;
        const note = melody[this.stepIdx % melody.length];
        const bass = bassTrack[this.stepIdx % bassTrack.length];
        const pitchMult = this.getPitchMultiplier();

        if (note > 0) {
          const freq = note * pitchMult;
          if (this.musicMood === 'start') {
            // Soft, airy music-box harp for Home / Menu / Hub
            this.playRawTone(freq, 0.58, 'sine', 0.02, 0);
            this.playRawTone(freq * 2, 0.2, 'sine', 0.0055, 0.01);
          } else if (this.musicMood === 'solo') {
            // Bouncy playful bamboo xylophone / marimba groove for active puzzles
            this.playRawTone(freq, 0.19, 'triangle', 0.032, 0);
            this.playRawTone(freq * 2, 0.07, 'sine', 0.013, 0);
          } else if (this.musicMood === 'victory') {
            // Bright joyful parade chimes + cheerful warm brass shimmer on Win screen
            this.playRawTone(freq, 0.24, 'triangle', 0.032, 0);
            this.playRawTone(freq * 1.5, 0.12, 'sine', 0.014, 0.015);
            this.playRawTone(freq * 2, 0.09, 'sine', 0.01, 0);
          } else {
            // Fast-paced crisp arcade lead for 1v1 Duel & Panic sprint
            const dur = this.musicMood === 'panic' ? 0.1 : 0.14;
            this.playRawTone(
              freq,
              dur,
              'triangle',
              this.musicMood === 'panic' ? 0.036 : 0.028,
              0
            );
            this.playRawTone(freq * 2, 0.05, 'sine', 0.011, 0);
          }
        }

        if (bass > 0) {
          const bassDur =
            this.musicMood === 'start'
              ? 0.68
              : this.musicMood === 'solo'
                ? 0.22
                : this.musicMood === 'victory'
                  ? 0.24
                  : 0.17;
          const bassVol =
            this.musicMood === 'start'
              ? 0.017
              : this.musicMood === 'solo'
                ? 0.026
                : this.musicMood === 'victory'
                  ? 0.028
                  : 0.028;
          this.playRawTone(
            bass * pitchMult,
            bassDur,
            this.musicMood === 'start' ? 'sine' : 'triangle',
            bassVol,
            0
          );
        }

        // Distinct subtle rhythmic percussion so each scenario immediately feels unique
        if (this.musicMood === 'solo') {
          if (this.stepIdx % 4 === 2) {
            // Light wooden temple-block off-beat bounce
            this.playRawTone(820, 0.03, 'triangle', 0.012, 0, 620);
          } else if (this.stepIdx % 4 === 0) {
            // Soft warm kick thump
            this.playRawTone(135, 0.055, 'sine', 0.024, 0, 72);
          }
        } else if (this.musicMood === 'victory') {
          if (this.stepIdx % 4 === 0) {
            this.playRawTone(160, 0.06, 'sine', 0.028, 0, 82);
          } else if (this.stepIdx % 4 === 2) {
            this.playRawTone(1320, 0.035, 'sine', 0.012, 0, 1760);
          }
        } else if (this.musicMood === 'panic') {
          const tickFreq = this.stepIdx % 2 === 0 ? 1180 * pitchMult : 880 * pitchMult;
          this.playRawTone(tickFreq, 0.028, 'triangle', 0.024, 0);
        } else if (this.musicMood === 'duel') {
          if (this.stepIdx % 2 === 1) {
            this.playRawTone(980, 0.022, 'triangle', 0.014, 0);
          } else if (this.stepIdx % 4 === 0) {
            this.playRawTone(165, 0.055, 'sine', 0.032, 0, 75);
          }
        }

        this.stepIdx = (this.stepIdx + 1) % melody.length;
      }

      this.musicTimer = setTimeout(tick, this.getCurrentStepMs());
    };

    this.musicTimer = setTimeout(tick, this.getCurrentStepMs());
  }

  private stopMusicLoop() {
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private playRawTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.08,
    delay = 0,
    endFreq?: number
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.025);
  }

  private playSfxTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.09,
    delay = 0,
    endFreq?: number
  ) {
    if (this.sfxMuted) return;
    this.unlockAudio();
    this.playRawTone(freq, duration, type, volume, delay, endFreq);
  }

  /** Bright, playful brass trumpet voice (dual detuned sawtooth + brass filter bloom + vibrato) */
  private playTrumpetNote(
    freq: number,
    duration: number,
    delay = 0,
    volume = 0.095
  ) {
    if (this.sfxMuted) return;
    this.unlockAudio();
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;

    // Two slightly detuned brass sawtooth oscillators for rich horn ensemble warmth
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    // Quick lip-slur pitch scoop into the note for authentic trumpet attack
    osc1.frequency.setValueAtTime(freq * 0.96, now);
    osc1.frequency.exponentialRampToValueAtTime(freq, now + 0.024);
    osc2.frequency.setValueAtTime(freq * 0.965, now);
    osc2.frequency.exponentialRampToValueAtTime(freq * 1.005, now + 0.024);

    // Subtle brass vibrato on longer held notes
    let lfo: OscillatorNode | null = null;
    if (duration >= 0.22) {
      lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 5.6;
      lfoGain.gain.setValueAtTime(0.01, now);
      lfoGain.gain.linearRampToValueAtTime(freq * 0.012, now + 0.14);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);
      lfo.start(now);
      lfo.stop(now + duration + 0.05);
    }

    // Brass lowpass filter envelope (bright attack "blat" settling to warm golden tone)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2.6;
    filter.frequency.setValueAtTime(Math.min(5500, freq * 2.0), now);
    filter.frequency.exponentialRampToValueAtTime(Math.min(6800, freq * 5.8), now + 0.032);
    filter.frequency.exponentialRampToValueAtTime(Math.min(4200, freq * 3.1), now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.018);
    gain.gain.setValueAtTime(volume * 0.88, now + Math.max(0.03, duration * 0.78));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.04);
    osc2.stop(now + duration + 0.04);
  }

  /** Classic joyful celebratory brass trumpet fanfare (Ta-da-da-DAAA!) */
  private playTrumpetFanfare(grand = false) {
    // Classic bright victory trumpet phrase: G4 -> C5 -> E5 -> G5 (fanfare triplet) -> E5 -> G5!
    const lead = grand
      ? [
          { f: 523.25, d: 0.0, len: 0.11, v: 0.09 },
          { f: 523.25, d: 0.11, len: 0.11, v: 0.095 },
          { f: 523.25, d: 0.22, len: 0.11, v: 0.1 },
          { f: 659.25, d: 0.33, len: 0.2, v: 0.105 },
          { f: 783.99, d: 0.52, len: 0.16, v: 0.105 },
          { f: 1046.5, d: 0.68, len: 0.56, v: 0.115 },
        ]
      : [
          { f: 523.25, d: 0.0, len: 0.1, v: 0.088 },
          { f: 659.25, d: 0.1, len: 0.1, v: 0.092 },
          { f: 783.99, d: 0.2, len: 0.14, v: 0.098 },
          { f: 1046.5, d: 0.34, len: 0.46, v: 0.11 },
        ];

    lead.forEach((n) => {
      this.playTrumpetNote(n.f, n.len, n.d, n.v);
    });

    // Harmony brass chord on the big finale note
    const finalDelay = grand ? 0.68 : 0.34;
    const finalLen = grand ? 0.56 : 0.46;
    this.playTrumpetNote(659.25, finalLen, finalDelay, 0.055);
    this.playTrumpetNote(783.99, finalLen, finalDelay, 0.06);
  }

  /**
   * Realistic hand-clap synthesis using 3 rapid finger-to-palm micro-flams
   * routed through a high-pass + resonant palm-cavity bandpass filter.
   */
  private playSingleHandClap(delay = 0, volume = 0.16, toneFreq = 1550) {
    if (this.sfxMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const dur = 0.115;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.max(1, Math.floor(sampleRate * dur));
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // 3 tight micro-transients (0ms, 10ms, 21ms) emulate fingers + cupped palms colliding
    const flam1 = Math.floor(sampleRate * 0.010);
    const flam2 = Math.floor(sampleRate * 0.021);
    const flam3 = Math.floor(sampleRate * 0.031);

    for (let i = 0; i < bufferSize; i++) {
      const n = Math.random() * 2 - 1;
      let env = 0;
      if (i < flam1) {
        env = Math.exp(-(i / (sampleRate * 0.0055))) * 0.72;
      } else if (i < flam2) {
        env = Math.exp(-((i - flam1) / (sampleRate * 0.006))) * 0.88;
      } else if (i < flam3) {
        env = Math.exp(-((i - flam2) / (sampleRate * 0.0065))) * 0.95;
      } else {
        // Main cupped-palm slap + natural crisp air tail
        env = Math.exp(-((i - flam3) / (sampleRate * 0.026))) * 1.0;
      }
      data[i] = n * env;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    // Cut sub/muddy low frequencies so it never sounds like static thump
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 780;

    // Resonant palm-clap formant peak around 1.2kHz - 2.3kHz
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = toneFreq;
    bp.Q.value = 1.15;

    // Crisp upper slap presence
    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 2850;
    presence.Q.value = 1.2;
    presence.gain.value = 5.5;

    const gain = ctx.createGain();
    const now = ctx.currentTime + delay;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(hp);
    hp.connect(bp);
    bp.connect(presence);
    presence.connect(gain);
    gain.connect(ctx.destination);

    src.start(now);
    src.stop(now + dur + 0.015);
  }

  /** Realistic multi-person happy applause (layered staggered hand claps) */
  private playApplause(startDelay = 0.14, durationSec = 1.5, intensity = 1.0) {
    if (this.sfxMuted) return;
    this.unlockAudio();

    // 4 overlapping "clappers" at slightly different clapping speeds & hand tones
    const clappers = [
      { offset: 0.0, rate: 0.175, baseTone: 1380, vol: 0.16 },
      { offset: 0.055, rate: 0.192, baseTone: 1680, vol: 0.145 },
      { offset: 0.105, rate: 0.164, baseTone: 2020, vol: 0.135 },
      { offset: 0.145, rate: 0.21, baseTone: 1520, vol: 0.125 },
    ];

    clappers.forEach((c, cIdx) => {
      let t = c.offset;
      let hit = 0;
      while (t < durationSec) {
        const progress = t / durationSec;
        // Swell in quickly, stay bright, then gently taper off at the end
        const swell =
          progress < 0.15
            ? 0.65 + (progress / 0.15) * 0.35
            : progress > 0.72
              ? Math.max(0.25, 1 - (progress - 0.72) / 0.28)
              : 1.0;
        const jitter = ((hit * 37 + cIdx * 19) % 11 - 5) * 0.003;
        const toneJitter = ((hit * 53 + cIdx * 29) % 9 - 4) * 55;
        this.playSingleHandClap(
          startDelay + Math.max(0, t + jitter),
          c.vol * swell * intensity,
          c.baseTone + toneJitter
        );
        t += c.rate;
        hit += 1;
      }
    });
  }

  /** Distinct wooden bamboo plink when tapping a single Cross (X) */
  public tapX() {
    this.playSfxTone(587.33, 0.075, 'triangle', 0.09, 0, 480);
    this.playSfxTone(1174.66, 0.035, 'sine', 0.03, 0);
  }

  /** Ascending pentatonic xylophone sweep when swiping across cells to mark X */
  public swipeX(stepIndex: number) {
    const freq = PENTATONIC_SCALE[stepIndex % PENTATONIC_SCALE.length];
    this.playSfxTone(freq, 0.11, 'triangle', 0.085, 0);
    this.playSfxTone(freq * 2, 0.045, 'sine', 0.025, 0);
  }

  /** Soft descending pentatonic sweep when swiping starting from an X cell to erase X */
  public swipeEraseX(stepIndex: number) {
    const idx = Math.max(0, PENTATONIC_SCALE.length - 1 - (stepIndex % PENTATONIC_SCALE.length));
    const freq = PENTATONIC_SCALE[idx] * 0.75;
    this.playSfxTone(freq, 0.09, 'sine', 0.07, 0, freq * 0.88);
  }

  /** Joyful bright 2-note chime + warm pop when placing a Panda */
  public placePanda() {
    this.playSfxTone(392.0, 0.09, 'sine', 0.09, 0, 523.25);
    this.playSfxTone(783.99, 0.14, 'triangle', 0.09, 0.035);
    this.playSfxTone(1046.5, 0.18, 'sine', 0.08, 0.085);
  }

  /** Soft descending pluck when removing a Panda or X */
  public clearCell() {
    this.playSfxTone(523.25, 0.08, 'sine', 0.065, 0, 349.23);
  }

  /** Playful reverse double-note for Undo */
  public undoMove() {
    this.playSfxTone(493.88, 0.07, 'triangle', 0.075, 0);
    this.playSfxTone(392.0, 0.09, 'triangle', 0.07, 0.05);
  }

  /** Downward harp sweep for Clear Board */
  public clearBoard() {
    const notes = [783.99, 659.25, 587.33, 523.25, 392.0];
    notes.forEach((n, idx) => {
      this.playSfxTone(n, 0.11, 'sine', 0.055, idx * 0.032);
    });
  }

  public buttonTap() {
    this.playSfxTone(440, 0.045, 'sine', 0.05, 0, 560);
  }

  public conflict() {
    this.playSfxTone(230, 0.14, 'sawtooth', 0.06, 0, 145);
    this.playSfxTone(185, 0.16, 'triangle', 0.075, 0.06, 120);
  }

  public pandaGiggle() {
    const notes = [659.25, 783.99, 880.0, 783.99, 1046.5, 987.77];
    notes.forEach((n, i) => {
      this.playSfxTone(n, 0.085, 'sine', 0.08, i * 0.055, n * 1.08);
    });
  }

  public pandaPurr() {
    this.playSfxTone(329.63, 0.24, 'sine', 0.07, 0, 392.0);
    this.playSfxTone(493.88, 0.28, 'triangle', 0.055, 0.08, 587.33);
    this.playSfxTone(659.25, 0.26, 'sine', 0.05, 0.16);
  }

  public pandaBoop() {
    this.playSfxTone(520, 0.09, 'sine', 0.095, 0, 960);
    this.playSfxTone(760, 0.1, 'triangle', 0.07, 0.08, 420);
  }

  public pandaMunch() {
    [0, 0.14, 0.28].forEach((d, idx) => {
      this.playSfxTone(300 + idx * 45, 0.065, 'square', 0.04, d, 190);
      this.playSfxTone(520 + idx * 60, 0.055, 'triangle', 0.06, d + 0.02);
    });
    this.playSfxTone(880, 0.18, 'sine', 0.08, 0.44, 1046.5);
  }

  public pandaDance() {
    const riff = [523.25, 659.25, 783.99, 659.25, 1046.5];
    riff.forEach((n, i) => {
      this.playSfxTone(n, 0.14, 'triangle', 0.085, i * 0.085);
    });
  }

  public countdownTick(finalGo = false) {
    if (finalGo) {
      this.playSfxTone(783.99, 0.16, 'triangle', 0.1, 0);
      this.playSfxTone(1046.5, 0.22, 'sine', 0.09, 0.07);
    } else {
      this.playSfxTone(523.25, 0.09, 'triangle', 0.075);
    }
  }

  /** Synthesized cheerful "Yay!" formant cheer (two bright harmonized voices) */
  private playYayCheer(delay = 0.2) {
    if (this.sfxMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const voices = [
      { startF: 360, peakF: 590, endF: 525, vol: 0.06, offset: 0 },
      { startF: 455, peakF: 740, endF: 660, vol: 0.044, offset: 0.025 },
    ];

    voices.forEach((v) => {
      const now = ctx.currentTime + delay + v.offset;
      const dur = 0.44;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(v.startF, now);
      osc.frequency.exponentialRampToValueAtTime(v.peakF, now + 0.16);
      osc.frequency.exponentialRampToValueAtTime(v.endF, now + dur);

      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.Q.value = 3.2;
      f1.frequency.setValueAtTime(420, now);
      f1.frequency.exponentialRampToValueAtTime(760, now + 0.12);
      f1.frequency.exponentialRampToValueAtTime(520, now + dur);

      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.Q.value = 4.0;
      f2.frequency.setValueAtTime(2150, now);
      f2.frequency.exponentialRampToValueAtTime(1850, now + 0.14);
      f2.frequency.exponentialRampToValueAtTime(2400, now + dur);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(v.vol, now + 0.045);
      gain.gain.setValueAtTime(v.vol * 0.9, now + 0.24);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(f1);
      osc.connect(f2);
      f1.connect(gain);
      f2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + dur + 0.03);
    });
  }

  /** Bright brass trumpet fanfare + realistic hand-clap applause + cheerful "Yay!" on solve */
  public roundSolved() {
    if (typeof performance !== 'undefined') {
      this.musicDuckUntil = performance.now() + 1850;
    }
    this.playTrumpetFanfare(false);
    this.playApplause(0.16, 1.55, 1.0);
    this.playYayCheer(0.24);
  }

  /** Grand champion match victory trumpets + lively crowd applause + cheer */
  public matchVictory() {
    if (typeof performance !== 'undefined') {
      this.musicDuckUntil = performance.now() + 2100;
    }
    this.playTrumpetFanfare(true);
    this.playApplause(0.14, 1.85, 1.15);
    this.playYayCheer(0.22);
  }

  /** Rising mini brass trumpet toot + crisp hand clap + golden sparkle as each Star pops! */
  public starFill(index = 0) {
    const trumpetNotes = [659.25, 783.99, 1046.5];
    const base = trumpetNotes[index % trumpetNotes.length];
    // Mini celebratory trumpet toot
    this.playTrumpetNote(base, index === 2 ? 0.28 : 0.18, 0, 0.085);
    if (index === 2) {
      // Extra festive high harmony on the 3rd star!
      this.playTrumpetNote(1318.51, 0.28, 0.03, 0.06);
    }
    // Crisp celebratory hand clap right on the star pop
    this.playSingleHandClap(0.01, 0.17, 1520 + index * 220);
    this.playSingleHandClap(0.085, 0.11, 1840 + index * 180);
    // Golden star twinkle chime
    this.playSfxTone(base * 2, 0.16, 'sine', 0.045, 0.02);
  }

  /** Classic Mario-style rapid coin-collect ping (B5 -> E6) as XP rolls up from 1 -> target */
  public coinTick(stepIndex = 0) {
    // Subtle slight rise across the rapid coin stream for exhilarating momentum
    const lift = Math.min(1.12, 1 + stepIndex * 0.006);
    const b5 = 987.77 * lift;
    const e6 = 1318.51 * lift;
    this.playSfxTone(b5, 0.036, 'square', 0.036, 0);
    this.playSfxTone(e6, 0.085, 'triangle', 0.058, 0.032);
    this.playSfxTone(e6, 0.07, 'square', 0.026, 0.032);
  }

  /** Crisp celebratory final coin chime when XP reaches its final total */
  public coinFinish() {
    this.playSfxTone(987.77, 0.045, 'square', 0.042, 0);
    this.playSfxTone(1318.51, 0.14, 'triangle', 0.075, 0.042);
    this.playSfxTone(1975.53, 0.2, 'sine', 0.055, 0.065);
  }

  /** Sparkly ascending bamboo-treat chime for each Panda Food collected */
  public foodCollect(index = 0) {
    const base = [659.25, 783.99, 1046.5][index % 3];
    this.playSfxTone(base, 0.14, 'triangle', 0.095, 0, base * 1.15);
    this.playSfxTone(base * 1.5, 0.18, 'sine', 0.07, 0.055);
  }

  /** Joyful fanfare when unlocking a new accessory or panda animation */
  public unlockItem() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((n, idx) => {
      this.playSfxTone(n, 0.22, 'triangle', 0.09, idx * 0.06);
      this.playSfxTone(n * 2, 0.09, 'sine', 0.03, idx * 0.06 + 0.02);
    });
  }

  /** Crisp pop when equipping/unequipping an accessory */
  public equipItem() {
    this.playSfxTone(440, 0.07, 'sine', 0.075, 0, 659.25);
    this.playSfxTone(880, 0.1, 'triangle', 0.06, 0.045);
  }

  /** Playful distinct synthesized sound for each of the 10 unlockable panda tricks */
  public playTrickSound(trickId: string) {
    switch (trickId) {
      case 'wave':
        this.playSfxTone(587.33, 0.1, 'sine', 0.08, 0, 783.99);
        this.playSfxTone(783.99, 0.14, 'triangle', 0.08, 0.09, 1046.5);
        break;
      case 'belly_drum':
        [0.14, 0.34, 0.54, 0.74, 0.94, 1.14, 1.32].forEach((d, idx) => {
          const isFinale = idx === 6;
          const f = isFinale ? 164.81 : idx % 2 === 0 ? 185 : 233.08;
          this.playSfxTone(f, isFinale ? 0.2 : 0.11, 'sine', isFinale ? 0.14 : 0.11, d, f * 0.62);
          this.playSfxTone(f * 2.1, 0.04, 'triangle', 0.05, d, f * 1.4);
        });
        break;
      case 'backflip':
        this.playSfxTone(320, 0.28, 'sine', 0.09, 0, 960);
        this.playSfxTone(1046.5, 0.18, 'triangle', 0.08, 0.32, 783.99);
        break;
      case 'dizzy_spin':
        [440, 523.25, 659.25, 783.99, 880, 783.99, 659.25, 523.25].forEach((f, i) => {
          this.playSfxTone(f, 0.08, 'triangle', 0.07, i * 0.065);
        });
        break;
      case 'sleepy_nap':
        this.playSfxTone(392.0, 0.4, 'sine', 0.06, 0, 329.63);
        this.playSfxTone(293.66, 0.45, 'sine', 0.05, 0.35, 261.63);
        break;
      case 'kung_fu':
        this.playSfxTone(720, 0.08, 'sawtooth', 0.06, 0, 260);
        this.playSfxTone(860, 0.08, 'sawtooth', 0.06, 0.18, 300);
        this.playSfxTone(1046.5, 0.18, 'triangle', 0.09, 0.38, 523.25);
        break;
      case 'juggle':
        [523.25, 659.25, 783.99, 659.25, 880, 783.99].forEach((f, i) => {
          this.playSfxTone(f, 0.1, 'sine', 0.075, i * 0.13, f * 1.12);
        });
        break;
      case 'moonwalk':
        [293.66, 329.63, 392.0, 440.0, 392.0, 329.63].forEach((f, i) => {
          this.playSfxTone(f, 0.14, 'triangle', 0.075, i * 0.14);
        });
        break;
      case 'levitate':
        [392.0, 493.88, 587.33, 783.99].forEach((f, i) => {
          this.playSfxTone(f, 0.55, 'sine', 0.045, i * 0.09);
        });
        break;
      case 'super_star':
      default:
        [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => {
          this.playSfxTone(f, 0.25, 'triangle', 0.09, i * 0.075);
        });
        break;
    }
  }
}

export const soundFx = new SoundEngine();
