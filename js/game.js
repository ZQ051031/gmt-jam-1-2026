// Star Shepherd - Core HTML5 Canvas Game Engine
(function (global) {
  'use strict';

  const STORAGE_HIGHSCORE = 'star_shepherd_highscore_v1';
  const STORAGE_BESTWAVE = 'star_shepherd_bestwave_v1';

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (min, max) => min + Math.random() * (max - min);
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

  class StarShepherdGame {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.sound = new global.SoundEngine();

      // DOM elements
      this.elHud = document.getElementById('hud');
      this.elScore = document.getElementById('hud-score');
      this.elCombo = document.getElementById('hud-combo');
      this.elComboWrap = document.getElementById('hud-combo-wrap');
      this.elWave = document.getElementById('hud-wave');
      this.elConstellation = document.getElementById('hud-constellation');
      this.elLives = document.getElementById('hud-lives');
      this.elPowerups = document.getElementById('hud-powerups');
      this.elMuteIcon = document.getElementById('mute-icon');
      this.elTitleMute = document.getElementById('btn-title-mute');
      this.elBossBar = document.getElementById('boss-bar');
      this.elBossName = document.getElementById('boss-name');
      this.elBossHpText = document.getElementById('boss-hp-text');
      this.elBossFill = document.getElementById('boss-bar-fill');
      this.elBanner = document.getElementById('wave-banner');
      this.elBannerKicker = document.getElementById('wave-banner-kicker');
      this.elBannerTitle = document.getElementById('wave-banner-title');
      this.elBannerSub = document.getElementById('wave-banner-sub');
      this.elMobileGust = document.getElementById('btn-mobile-gust');

      this.screenTitle = document.getElementById('screen-title');
      this.screenHowto = document.getElementById('screen-howto');
      this.screenPause = document.getElementById('screen-pause');
      this.screenGameover = document.getElementById('screen-gameover');

      this.elTitleHighscore = document.getElementById('title-highscore');
      this.elTitleBestwave = document.getElementById('title-bestwave');
      this.elGoScore = document.getElementById('go-score');
      this.elGoHighscore = document.getElementById('go-highscore');
      this.elGoWave = document.getElementById('go-wave');
      this.elGoConstellations = document.getElementById('go-constellations');
      this.elGoNewBest = document.getElementById('gameover-newbest');
      this.elGoQuote = document.getElementById('gameover-quote');

      // Viewport metrics
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.groundY = this.height - 64;
      this.isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

      // Game state
      this.state = 'TITLE'; // TITLE | PLAYING | PAUSED | GAMEOVER
      this.howtoReturnTo = 'TITLE';
      this.time = 0;
      this.score = 0;
      this.highScore = this._loadNumber(STORAGE_HIGHSCORE, 0);
      this.bestWave = this._loadNumber(STORAGE_BESTWAVE, 1);
      this.lives = 3;
      this.maxLives = 3;
      this.combo = 0;
      this.maxCombo = 0;
      this.wave = 1;
      this.constellationsCompleted = 0;
      this.newHighScore = false;

      // Sky color interpolation state
      const initialPhase = global.StarConstellations.SKY_PHASES[0];
      this.skyCurrent = {
        top: [...initialPhase.top],
        mid: [...initialPhase.mid],
        bottom: [...initialPhase.bottom],
        starAlpha: initialPhase.starAlpha
      };
      this.waveConfig = global.StarConstellations.getWaveConfig(1);

      // Background procedural props
      this.bgStars = [];
      this.cottages = [];
      this.shootingBg = [];

      // Gameplay entities
      this.player = {
        x: this.width * 0.5,
        y: this.height - 130,
        vx: 0,
        baseWidth: 112,
        width: 112,
        height: 44,
        squash: 0,
        squashVel: 0,
        invuln: 0,
        happyTimer: 0,
        blinkTimer: 2.5,
        gustCooldown: 0,
        gustMaxCooldown: 1.35,
        shield: false,
        wideTimer: 0,
        slowTimer: 0
      };

      this.constellationNodes = [];
      this.constellationEdges = [];
      this.celebrationTimer = 0;
      this.bannerTimer = 0;

      this.celestials = []; // falling/rising stars, wishes, moonbeams
      this.meteors = [];
      this.stormClouds = [];
      this.lightnings = [];
      this.powerups = [];
      this.particles = [];
      this.popups = [];
      this.gustWaves = [];
      this.starLances = [];
      this.boss = null;

      // Timers & camera effects
      this.spawnTimers = {
        star: 0.7,
        meteor: 5.5,
        storm: 7.0,
        lightning: 9.0,
        powerup: 11.0
      };
      this.shakeTime = 0;
      this.shakeMag = 0;
      this.flashAlpha = 0;
      this.flashColor = '#ffffff';

      // Input state
      this.keys = { left: false, right: false };
      this.pointerActive = false;
      this.pointerTargetX = this.width * 0.5;

      // Setup
      this._resize();
      this._initBackground();
      this._bindUI();
      this._bindInputs();
      this._syncMuteUI();
      this._syncTitleStats();
      document.body.classList.add('ui-open');

      this.lastFrame = performance.now();
      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
    }

    _loadNumber(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        const parsed = parseInt(raw, 10);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
      } catch (_) {
        return fallback;
      }
    }

    _saveNumber(key, value) {
      try {
        localStorage.setItem(key, String(Math.floor(value)));
      } catch (_) {}
    }

    _resize() {
      this.width = Math.max(320, window.innerWidth);
      this.height = Math.max(420, window.innerHeight);
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      this.groundY = this.height - Math.max(54, Math.min(82, this.height * 0.1));
      this.player.y = this.groundY - Math.max(56, Math.min(76, this.height * 0.095));
      this.player.baseWidth = clamp(this.width * 0.125, 92, 130);
      this.player.x = clamp(this.player.x, 60, this.width - 60);

      // Reposition constellation nodes on resize
      if (this.constellationNodes.length > 0 && this.waveConfig) {
        const nodesDef = this.waveConfig.constellation.nodes;
        for (let i = 0; i < this.constellationNodes.length && i < nodesDef.length; i++) {
          this.constellationNodes[i].x = nodesDef[i][0] * this.width;
          this.constellationNodes[i].y = nodesDef[i][1] * this.height;
        }
      }
      this._buildCottages();
    }

    _initBackground() {
      this.bgStars = [];
      for (let i = 0; i < 110; i++) {
        this.bgStars.push({
          rx: Math.random(),
          ry: Math.random() * 0.78,
          r: rand(0.7, 2.2),
          phase: rand(0, Math.PI * 2),
          speed: rand(1.1, 3.2)
        });
      }
      this._buildCottages();
    }

    _buildCottages() {
      this.cottages = [];
      const count = Math.max(5, Math.min(11, Math.floor(this.width / 115)));
      for (let i = 0; i < count; i++) {
        const cx = ((i + 0.5) / count) * this.width + rand(-18, 18);
        const w = rand(22, 34);
        const h = rand(16, 26);
        this.cottages.push({
          x: cx,
          w,
          h,
          roofH: rand(10, 16),
          lit: Math.random() > 0.25,
          flicker: rand(0, Math.PI * 2)
        });
      }
    }

    _bindUI() {
      const bindClick = (id, fn) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.sound.init();
          this.sound.playUiClick();
          fn();
        });
      };

      bindClick('btn-play', () => this.startGame());
      bindClick('btn-howto', () => this.openHowto('TITLE'));
      bindClick('btn-howto-play', () => this.startGame());
      bindClick('btn-howto-back', () => this.closeHowto());
      bindClick('btn-title-mute', () => this.toggleMute());
      bindClick('btn-mute', () => this.toggleMute());
      bindClick('btn-pause', () => this.togglePause());
      bindClick('btn-resume', () => this.resumeGame());
      bindClick('btn-pause-howto', () => this.openHowto('PAUSED'));
      bindClick('btn-pause-restart', () => this.startGame());
      bindClick('btn-pause-title', () => this.returnToTitle());
      bindClick('btn-restart', () => this.startGame());
      bindClick('btn-go-title', () => this.returnToTitle());

      if (this.elMobileGust) {
        this.elMobileGust.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.sound.init();
          if (this.state === 'PLAYING') {
            this.triggerGust();
          }
        });
      }
    }

    _bindInputs() {
      window.addEventListener('resize', () => this._resize());

      window.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          this.keys.left = true;
          this.pointerActive = false;
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          this.keys.right = true;
          this.pointerActive = false;
        } else if (e.code === 'Space') {
          if (this.state === 'PLAYING') {
            e.preventDefault();
            this.sound.init();
            this.triggerGust();
          }
        } else if (e.code === 'KeyP' || e.code === 'Escape') {
          if (this.state === 'PLAYING') {
            this.pauseGame();
          } else if (this.state === 'PAUSED') {
            if (!this.screenHowto.classList.contains('hidden')) {
              this.closeHowto();
            } else {
              this.resumeGame();
            }
          } else if (this.state === 'TITLE' && !this.screenHowto.classList.contains('hidden')) {
            this.closeHowto();
          }
        } else if (e.code === 'KeyM') {
          this.toggleMute();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          this.keys.left = false;
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          this.keys.right = false;
        }
      });

      this.canvas.addEventListener('pointermove', (e) => {
        if (this.state !== 'PLAYING') return;
        const rect = this.canvas.getBoundingClientRect();
        this.pointerTargetX = e.clientX - rect.left;
        this.pointerActive = true;
      });

      this.canvas.addEventListener('pointerdown', (e) => {
        if (this.state !== 'PLAYING') return;
        this.sound.init();
        const rect = this.canvas.getBoundingClientRect();
        this.pointerTargetX = e.clientX - rect.left;
        this.pointerActive = true;
        if (e.pointerType === 'mouse') {
          this.triggerGust();
        }
      });

      // Pause cleanly if tab loses visibility during play
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.state === 'PLAYING') {
          this.pauseGame();
        }
      });
    }

    _syncMuteUI() {
      const muted = this.sound.muted;
      if (this.elMuteIcon) {
        this.elMuteIcon.innerHTML = muted
          ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>'
          : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>';
      }
      if (this.elTitleMute) this.elTitleMute.textContent = muted ? 'Sound: Off' : 'Sound: On';
    }

    toggleMute() {
      this.sound.toggleMute();
      this._syncMuteUI();
    }

    _syncTitleStats() {
      this.elTitleHighscore.textContent = this.highScore.toLocaleString();
      this.elTitleBestwave.textContent = String(this.bestWave);
    }

    _hideAllScreens() {
      this.screenTitle.classList.add('hidden');
      this.screenHowto.classList.add('hidden');
      this.screenPause.classList.add('hidden');
      this.screenGameover.classList.add('hidden');
    }

    openHowto(returnTo) {
      this.howtoReturnTo = returnTo;
      this._hideAllScreens();
      this.screenHowto.classList.remove('hidden');
      document.body.classList.add('ui-open');
    }

    closeHowto() {
      this._hideAllScreens();
      if (this.howtoReturnTo === 'PAUSED') {
        this.screenPause.classList.remove('hidden');
      } else {
        this.screenTitle.classList.remove('hidden');
      }
    }

    startGame() {
      this.sound.init();
      this._hideAllScreens();
      document.body.classList.remove('ui-open');

      this.state = 'PLAYING';
      this.score = 0;
      this.lives = this.maxLives;
      this.combo = 0;
      this.maxCombo = 0;
      this.wave = 1;
      this.constellationsCompleted = 0;
      this.newHighScore = false;

      this.player.x = this.width * 0.5;
      this.player.vx = 0;
      this.player.invuln = 0;
      this.player.happyTimer = 0;
      this.player.gustCooldown = 0;
      this.player.shield = false;
      this.player.wideTimer = 0;
      this.player.slowTimer = 0;
      this.player.squash = 0;
      this.player.squashVel = 0;
      this.pointerActive = false;

      this.celestials = [];
      this.meteors = [];
      this.stormClouds = [];
      this.lightnings = [];
      this.powerups = [];
      this.particles = [];
      this.popups = [];
      this.gustWaves = [];
      this.starLances = [];
      this.boss = null;
      this.celebrationTimer = 0;

      this.elHud.classList.remove('hidden');
      if (this.isCoarsePointer) {
        this.elMobileGust.classList.remove('hidden');
      }

      this._setupWave(1);
      this._updateHUD();
    }

    pauseGame() {
      if (this.state !== 'PLAYING') return;
      this.state = 'PAUSED';
      this.keys.left = false;
      this.keys.right = false;
      this._hideAllScreens();
      this.screenPause.classList.remove('hidden');
      this.elMobileGust.classList.add('hidden');
      document.body.classList.add('ui-open');
    }

    resumeGame() {
      if (this.state !== 'PAUSED') return;
      this.state = 'PLAYING';
      this._hideAllScreens();
      if (this.isCoarsePointer) {
        this.elMobileGust.classList.remove('hidden');
      }
      document.body.classList.remove('ui-open');
    }

    togglePause() {
      if (this.state === 'PLAYING') this.pauseGame();
      else if (this.state === 'PAUSED') this.resumeGame();
    }

    returnToTitle() {
      this.state = 'TITLE';
      this.keys.left = false;
      this.keys.right = false;
      this._hideAllScreens();
      this.elHud.classList.add('hidden');
      this.elBossBar.classList.add('hidden');
      this.elBanner.classList.add('hidden');
      this.elMobileGust.classList.add('hidden');
      this.screenTitle.classList.remove('hidden');
      document.body.classList.add('ui-open');
      this._syncTitleStats();
    }

    _triggerGameOver() {
      this.state = 'GAMEOVER';
      this.sound.playGameOver();
      this.elMobileGust.classList.add('hidden');
      this.elBossBar.classList.add('hidden');
      this.elBanner.classList.add('hidden');

      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.newHighScore = true;
        this._saveNumber(STORAGE_HIGHSCORE, this.highScore);
      }
      if (this.wave > this.bestWave) {
        this.bestWave = this.wave;
        this._saveNumber(STORAGE_BESTWAVE, this.bestWave);
      }

      this.elGoScore.textContent = this.score.toLocaleString();
      this.elGoHighscore.textContent = this.highScore.toLocaleString();
      this.elGoWave.textContent = String(this.wave);
      this.elGoConstellations.textContent = String(this.constellationsCompleted);

      if (this.newHighScore && this.score > 0) {
        this.elGoNewBest.classList.remove('hidden');
      } else {
        this.elGoNewBest.classList.add('hidden');
      }

      const quotes = [
        'Every star you caught still glimmers above the hills.',
        'The village slept peacefully beneath your soft sky-guard.',
        'Even small clouds can lift the heavens back into place.',
        'The storm passed, leaving constellations singing in the dark.'
      ];
      this.elGoQuote.textContent = quotes[this.constellationsCompleted % quotes.length];

      this._hideAllScreens();
      this.screenGameover.classList.remove('hidden');
      document.body.classList.add('ui-open');
    }

    _setupWave(waveNum) {
      this.wave = waveNum;
      this.waveConfig = global.StarConstellations.getWaveConfig(waveNum);
      const cDef = this.waveConfig.constellation;

      this.constellationNodes = cDef.nodes.map(([nx, ny], idx) => ({
        index: idx,
        x: nx * this.width,
        y: ny * this.height,
        lit: false,
        pulse: rand(0, Math.PI * 2),
        litFlash: 0
      }));
      this.constellationEdges = cDef.edges;

      // Reset spawn pacing scaled to wave
      const speedScale = 1 + (waveNum - 1) * 0.08;
      this.spawnTimers.star = 0.25;
      this.spawnTimers.meteor = waveNum === 1 ? 7.0 : Math.max(2.6, 5.8 / speedScale);
      this.spawnTimers.storm = waveNum === 1 ? 999 : Math.max(4.5, 8.5 / speedScale);
      this.spawnTimers.lightning = waveNum < 3 ? 999 : Math.max(2.8, 6.2 / speedScale);
      this.spawnTimers.powerup = rand(8.5, 13.0);

      // Boss setup on every 5th wave
      if (this.waveConfig.isBoss) {
        this.boss = {
          name: 'TEMPEST SOVEREIGN',
          x: this.width * 0.5,
          y: this.height * 0.22,
          vx: 105 + waveNum * 6,
          hp: this.constellationNodes.length,
          maxHp: this.constellationNodes.length,
          attackTimer: 2.8,
          hitFlash: 0,
          phase: 0
        };
        this.elBossBar.classList.remove('hidden');
        this._updateBossBar();
      } else {
        this.boss = null;
        this.elBossBar.classList.add('hidden');
      }

      // Show wave banner
      this.elBannerKicker.textContent = this.waveConfig.isBoss
        ? `WAVE ${waveNum} · BOSS STORM · ${this.waveConfig.skyPhase.name.toUpperCase()}`
        : `WAVE ${waveNum} · ${this.waveConfig.skyPhase.name.toUpperCase()}`;
      this.elBannerTitle.textContent = cDef.name;
      this.elBannerSub.textContent = this.waveConfig.isBoss
        ? `Light all ${this.constellationNodes.length} storm seals to banish the Tempest Sovereign!`
        : `Shepherd ${this.constellationNodes.length} stars back into ${cDef.subtitle}`;
      this.elBanner.classList.remove('hidden');
      this.bannerTimer = 2.6;

      this._updateHUD();
    }

    _updateBossBar() {
      if (!this.boss) return;
      this.elBossName.textContent = this.boss.name;
      this.elBossHpText.textContent = `${this.boss.hp} / ${this.boss.maxHp}`;
      this.elBossFill.style.width = `${(this.boss.hp / this.boss.maxHp) * 100}%`;
    }

    _updateHUD() {
      this.elScore.textContent = this.score.toLocaleString();
      const mult = this._getMultiplier();
      this.elCombo.textContent = `x${mult}`;
      if (mult >= 3) {
        this.elComboWrap.classList.add('hot');
      } else {
        this.elComboWrap.classList.remove('hot');
      }

      this.elWave.textContent = `WAVE ${this.wave}`;
      this.elConstellation.textContent = this.waveConfig.constellation.name;

      // Render lives (crisp inline SVG cloud-hearts, no emoji font dependency)
      const lifeSvg = '<svg viewBox="0 0 24 18" width="18" height="14" fill="#eef4ff"><path d="M6.5 16h11a4.5 4.5 0 0 0 .8-8.9A5.5 5.5 0 0 0 7.6 6.2 4 4 0 0 0 6.5 16Z"/></svg>';
      let livesHtml = '';
      for (let i = 0; i < this.maxLives; i++) {
        const lostClass = i >= this.lives ? ' lost' : '';
        livesHtml += `<span class="life-heart${lostClass}" aria-hidden="true">${lifeSvg}</span>`;
      }
      this.elLives.innerHTML = livesHtml;

      // Active power-ups (clean SVG + text, no emoji tofu)
      let puHtml = '';
      if (this.player.wideTimer > 0) {
        puHtml += `<span class="powerup-chip wide">WIDE ${Math.ceil(this.player.wideTimer)}s</span>`;
      }
      if (this.player.slowTimer > 0) {
        puHtml += `<span class="powerup-chip slow">SLOW ${Math.ceil(this.player.slowTimer)}s</span>`;
      }
      if (this.player.shield) {
        puHtml += `<span class="powerup-chip shield">SHIELD</span>`;
      }
      this.elPowerups.innerHTML = puHtml;
    }

    _getMultiplier() {
      return clamp(1 + Math.floor(this.combo / 2), 1, 8);
    }

    triggerGust() {
      if (this.player.gustCooldown > 0) return;
      this.player.gustCooldown = this.player.gustMaxCooldown;
      this.player.squash = 0.28;
      this.player.happyTimer = 0.25;
      this.sound.playGust();

      const radius = this.player.width * 1.15;
      this.gustWaves.push({
        x: this.player.x,
        y: this.player.y - 12,
        r: 22,
        maxR: radius,
        alpha: 0.9
      });

      this._spawnParticles(this.player.x, this.player.y - 14, 14, '#fff4cc', 130, -180);

      // Boost nearby falling stars upward
      for (const c of this.celestials) {
        if (c.state === 'falling' && dist(c.x, c.y, this.player.x, this.player.y - 26) < radius) {
          this._bounceCelestial(c, true);
        }
      }

      // Shatter nearby heavy meteors
      for (let i = this.meteors.length - 1; i >= 0; i--) {
        const m = this.meteors[i];
        if (dist(m.x, m.y, this.player.x, this.player.y - 26) < radius + m.r) {
          this._shatterMeteor(i, 'GUST SMASH!');
        }
      }
    }

    _bounceCelestial(c, boosted = false) {
      c.state = 'rising';
      this.combo += 1;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      const mult = this._getMultiplier();
      const basePoints = c.kind === 'wish' ? 200 : c.kind === 'moonbeam' ? 150 : 100;
      const gained = basePoints * mult;
      this.score += gained;

      // Moonbeam extends active power-ups slightly
      if (c.kind === 'moonbeam') {
        if (this.player.wideTimer > 0) this.player.wideTimer = Math.min(14, this.player.wideTimer + 1.8);
        if (this.player.slowTimer > 0) this.player.slowTimer = Math.min(11, this.player.slowTimer + 1.4);
      }

      this.player.squash = -0.26;
      this.player.happyTimer = 0.35;

      // Aim toward nearest unlit constellation node with subtle cloud-edge English
      const target = this._pickConstellationTarget(c.x);
      const offsetRatio = clamp((c.x - this.player.x) / (this.player.width * 0.55), -1, 1);
      const riseSpeed = (boosted ? 620 : 520) + Math.min(140, this.wave * 14);

      if (target) {
        const dx = target.x - c.x;
        const dy = target.y - c.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        c.vx = (dx / len) * riseSpeed * 0.82 + offsetRatio * 120;
        c.vy = -Math.max(380, Math.abs((dy / len) * riseSpeed));
        c.targetNode = target;
      } else {
        c.vx = offsetRatio * 190;
        c.vy = -riseSpeed;
      }

      this.sound.playBounce(this.combo, c.kind);
      this._spawnParticles(c.x, c.y, 12, c.color, 140, -100);
      this._addPopup(c.x, c.y - 16, `+${gained}${mult > 1 ? ` x${mult}` : ''}`, c.color);
      this._updateHUD();
    }

    _pickConstellationTarget(fromX) {
      const unlit = this.constellationNodes.filter((n) => !n.lit);
      if (unlit.length === 0) return null;
      let best = unlit[0];
      let bestDist = Math.abs(best.x - fromX);
      for (let i = 1; i < unlit.length; i++) {
        const d = Math.abs(unlit[i].x - fromX);
        if (d < bestDist) {
          best = unlit[i];
          bestDist = d;
        }
      }
      return best;
    }

    _shatterMeteor(index, label = 'METEOR SMASH!') {
      const m = this.meteors[index];
      if (!m) return;
      this.meteors.splice(index, 1);

      const bonus = 250 * this._getMultiplier();
      this.score += bonus;
      this.sound.playMeteorSmash();
      this._shake(0.18, 6);
      this._spawnParticles(m.x, m.y, 24, '#ffb36b', 220, -40);
      this._spawnParticles(m.x, m.y, 14, '#fff2b2', 180, -80);
      this._addPopup(m.x, m.y - 12, `${label} +${bonus}`, '#ffd97d');
      this._updateHUD();
    }

    _damagePlayer(reason) {
      if (this.player.invuln > 0) return;

      if (this.player.shield) {
        this.player.shield = false;
        this.player.invuln = 0.85;
        this.sound.playShieldBreak();
        this._shake(0.2, 7);
        this._spawnParticles(this.player.x, this.player.y, 24, '#8bf7c2', 200, -40);
        this._addPopup(this.player.x, this.player.y - 34, 'SHIELD SAVED!', '#8bf7c2');
        this._updateHUD();
        return;
      }

      this.lives = Math.max(0, this.lives - 1);
      this.combo = 0;
      this.player.invuln = 1.45;
      this.player.squash = 0.34;
      this.sound.playHurt();
      this._shake(0.32, 11);
      this.flashAlpha = 0.32;
      this.flashColor = '#ff6b7a';
      this._spawnParticles(this.player.x, this.player.y, 20, '#ff8f9e', 190, -50);
      this._addPopup(this.player.x, this.player.y - 34, reason || 'OUCH!', '#ff8f9e');
      this._updateHUD();

      if (this.lives <= 0) {
        this._triggerGameOver();
      }
    }

    _damageVillage(x) {
      this.lives = Math.max(0, this.lives - 1);
      this.combo = 0;
      this.sound.playHurt();
      this._shake(0.38, 13);
      this.flashAlpha = 0.35;
      this.flashColor = '#ff8855';
      this._spawnParticles(x, this.groundY - 4, 28, '#ff9457', 230, -140);
      this._addPopup(x, this.groundY - 26, 'METEOR IMPACT! -1 LIFE', '#ff7b6b');
      this._updateHUD();

      if (this.lives <= 0) {
        this._triggerGameOver();
      }
    }

    _lightConstellationNode(node, sourceX, sourceY) {
      if (!node || node.lit) return;
      node.lit = true;
      node.litFlash = 1.0;

      const litCount = this.constellationNodes.filter((n) => n.lit).length;
      const total = this.constellationNodes.length;

      this.sound.playConstellationStar(litCount, total);
      this._spawnParticles(node.x, node.y, 20, '#ffe896', 170, 0);

      // On boss wave, lighting a seal strikes the Tempest Sovereign
      if (this.boss) {
        this.starLances.push({
          x1: node.x,
          y1: node.y,
          x2: this.boss.x,
          y2: this.boss.y,
          alpha: 1.0
        });
        this.boss.hp = Math.max(0, total - litCount);
        this.boss.hitFlash = 0.35;
        this.sound.playBossHit();
        this._shake(0.2, 7);
        this._spawnParticles(this.boss.x, this.boss.y, 22, '#ffd97d', 220, 0);
        this._updateBossBar();
      }

      if (litCount >= total) {
        this._completeConstellation();
      }
    }

    _completeConstellation() {
      this.constellationsCompleted += 1;
      const wasBoss = this.waveConfig.isBoss;
      const waveBonus = wasBoss ? 1500 + this.wave * 200 : 500 * this.wave;
      this.score += waveBonus;

      if (wasBoss && this.lives < this.maxLives) {
        this.lives += 1;
        this._addPopup(this.width * 0.5, this.height * 0.44, '+1 LIFE RESTORED!', '#8bf7c2');
      }

      this.sound.playConstellationComplete();
      this.flashAlpha = 0.38;
      this.flashColor = '#fff0b8';
      this.celebrationTimer = 1.65;

      // Turn active hazards into harmless celebratory stardust
      for (const m of this.meteors) {
        this._spawnParticles(m.x, m.y, 16, '#ffd97d', 160, -40);
      }
      this.meteors = [];
      this.stormClouds = [];
      this.lightnings = [];
      this.boss = null;
      this.elBossBar.classList.add('hidden');

      for (const n of this.constellationNodes) {
        this._spawnParticles(n.x, n.y, 14, '#fff6c2', 140, 0);
      }

      this._addPopup(
        this.width * 0.5,
        this.height * 0.36,
        wasBoss ? `TEMPEST BANISHED! +${waveBonus}` : `${this.waveConfig.constellation.name.toUpperCase()} COMPLETE! +${waveBonus}`,
        '#ffe484'
      );
      this._updateHUD();
    }

    _spawnCelestial() {
      const margin = 52;
      const x = rand(margin, this.width - margin);
      const roll = Math.random();
      let kind = 'star';
      let color = '#ffe074';
      let r = 13;
      let vy = rand(125, 175) + this.wave * 9;

      if (roll > 0.82) {
        kind = 'wish';
        color = '#8ce9ff';
        r = 12;
        vy = rand(165, 215) + this.wave * 10;
      } else if (roll > 0.68) {
        kind = 'moonbeam';
        color = '#dce8ff';
        r = 14;
        vy = rand(105, 145) + this.wave * 7;
      }

      this.celestials.push({
        kind,
        x,
        y: -24,
        vx: rand(-26, 26),
        vy,
        r,
        color,
        rot: rand(0, Math.PI * 2),
        rotSpeed: rand(-2.4, 2.4),
        swayPhase: rand(0, Math.PI * 2),
        state: 'falling',
        targetNode: null,
        trail: []
      });
    }

    _spawnMeteor(customX = null) {
      const margin = 58;
      const x = customX !== null ? clamp(customX, margin, this.width - margin) : rand(margin, this.width - margin);
      this.meteors.push({
        x,
        y: -36,
        vx: rand(-22, 22),
        vy: rand(105, 140) + Math.min(95, this.wave * 8),
        r: rand(18, 23),
        rot: rand(0, Math.PI * 2),
        rotSpeed: rand(-1.8, 1.8),
        seed: rand(0, 100)
      });
    }

    _spawnStormCloud() {
      if (this.stormClouds.length >= Math.min(3, 1 + Math.floor(this.wave / 3))) return;
      const fromLeft = Math.random() < 0.5;
      const y = rand(this.height * 0.42, this.height * 0.58);
      this.stormClouds.push({
        x: fromLeft ? -70 : this.width + 70,
        y,
        vx: (fromLeft ? 1 : -1) * (rand(65, 105) + this.wave * 4),
        w: rand(88, 118),
        h: 40,
        boltTimer: rand(2.1, 3.6),
        charge: 0
      });
    }

    _spawnLightning(targetX = null) {
      const x = targetX !== null ? clamp(targetX, 44, this.width - 44) : rand(64, this.width - 64);
      this.lightnings.push({
        x,
        warnTime: 0.95,
        strikeTime: 0.28,
        phase: 'warn', // warn | strike
        hitDone: false,
        segments: this._buildBoltSegments(x, 0, this.groundY)
      });
      this.sound.playLightningWarn();
    }

    _buildBoltSegments(x, yStart, yEnd) {
      const pts = [{ x, y: yStart }];
      const steps = 11;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        pts.push({
          x: x + rand(-24, 24),
          y: lerp(yStart, yEnd, t)
        });
      }
      pts.push({ x, y: yEnd });
      return pts;
    }

    _spawnPowerup() {
      const types = ['wide', 'slow', 'shield'];
      // Prefer shield if player doesn't have one
      const kind = !this.player.shield && Math.random() < 0.42
        ? 'shield'
        : types[Math.floor(Math.random() * types.length)];
      this.powerups.push({
        kind,
        x: rand(64, this.width - 64),
        y: -26,
        vy: 108,
        r: 16,
        phase: rand(0, Math.PI * 2)
      });
    }

    _spawnParticles(x, y, count, color, speed = 150, biasY = 0) {
      for (let i = 0; i < count; i++) {
        const angle = rand(0, Math.PI * 2);
        const mag = rand(speed * 0.25, speed);
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * mag,
          vy: Math.sin(angle) * mag + biasY * 0.4,
          r: rand(1.8, 4.4),
          life: rand(0.35, 0.78),
          maxLife: 0.78,
          color
        });
      }
    }

    _addPopup(x, y, text, color = '#ffe082') {
      this.popups.push({
        x: clamp(x, 70, this.width - 70),
        y,
        vy: -46,
        text,
        color,
        life: 1.05,
        maxLife: 1.05
      });
    }

    _shake(duration, mag) {
      this.shakeTime = Math.max(this.shakeTime, duration);
      this.shakeMag = Math.max(this.shakeMag, mag);
    }

    _loop(now) {
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrame) / 1000));
      this.lastFrame = now;

      this.time += dt;
      this._updateSkyColors(dt);

      if (this.state === 'PLAYING') {
        this._updatePlaying(dt);
      } else if (this.state === 'TITLE') {
        this._updateTitleAmbient(dt);
      }

      this._render();
      requestAnimationFrame(this._loop);
    }

    _updateSkyColors(dt) {
      const target = this.waveConfig.skyPhase;
      const rate = Math.min(1, dt * 1.4);
      for (let i = 0; i < 3; i++) {
        this.skyCurrent.top[i] = lerp(this.skyCurrent.top[i], target.top[i], rate);
        this.skyCurrent.mid[i] = lerp(this.skyCurrent.mid[i], target.mid[i], rate);
        this.skyCurrent.bottom[i] = lerp(this.skyCurrent.bottom[i], target.bottom[i], rate);
      }
      this.skyCurrent.starAlpha = lerp(this.skyCurrent.starAlpha, target.starAlpha, rate);
    }

    _updateTitleAmbient(dt) {
      // Gentle background shooting stars on title screen
      if (Math.random() < dt * 0.55) {
        this.shootingBg.push({
          x: rand(this.width * 0.1, this.width * 0.9),
          y: rand(20, this.height * 0.35),
          vx: rand(-260, -140),
          vy: rand(70, 140),
          life: 0.75
        });
      }
      for (let i = this.shootingBg.length - 1; i >= 0; i--) {
        const s = this.shootingBg[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= 0) this.shootingBg.splice(i, 1);
      }
    }

    _updatePlaying(dt) {
      const timeScale = this.player.slowTimer > 0 ? 0.55 : 1.0;
      const worldDt = dt * timeScale;

      // Timers & HUD banners
      if (this.bannerTimer > 0) {
        this.bannerTimer -= dt;
        if (this.bannerTimer <= 0) {
          this.elBanner.classList.add('hidden');
        }
      }

      if (this.shakeTime > 0) this.shakeTime = Math.max(0, this.shakeTime - dt);
      if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.4);

      // Constellation celebration before advancing wave
      if (this.celebrationTimer > 0) {
        this.celebrationTimer -= dt;
        if (this.celebrationTimer <= 0) {
          this._setupWave(this.wave + 1);
        }
      }

      // Player timers
      const prevWide = Math.ceil(this.player.wideTimer);
      const prevSlow = Math.ceil(this.player.slowTimer);
      if (this.player.wideTimer > 0) this.player.wideTimer = Math.max(0, this.player.wideTimer - dt);
      if (this.player.slowTimer > 0) this.player.slowTimer = Math.max(0, this.player.slowTimer - dt);
      if (Math.ceil(this.player.wideTimer) !== prevWide || Math.ceil(this.player.slowTimer) !== prevSlow) {
        this._updateHUD();
      }

      if (this.player.invuln > 0) this.player.invuln = Math.max(0, this.player.invuln - dt);
      if (this.player.happyTimer > 0) this.player.happyTimer = Math.max(0, this.player.happyTimer - dt);
      if (this.player.gustCooldown > 0) this.player.gustCooldown = Math.max(0, this.player.gustCooldown - dt);

      this.player.blinkTimer -= dt;
      if (this.player.blinkTimer < -0.12) {
        this.player.blinkTimer = rand(2.2, 4.8);
      }

      // Smooth cloud width
      const targetWidth = this.player.wideTimer > 0 ? this.player.baseWidth * 1.55 : this.player.baseWidth;
      this.player.width = lerp(this.player.width, targetWidth, Math.min(1, dt * 8));

      // Cloud spring squash
      this.player.squashVel += -this.player.squash * 120 * dt;
      this.player.squashVel *= Math.pow(0.08, dt);
      this.player.squash += this.player.squashVel * dt;

      // Player movement
      const moveSpeed = Math.max(520, this.width * 0.68);
      const halfW = this.player.width * 0.5;
      const prevX = this.player.x;

      if (this.keys.left && !this.keys.right) {
        this.player.x -= moveSpeed * dt;
      } else if (this.keys.right && !this.keys.left) {
        this.player.x += moveSpeed * dt;
      } else if (this.pointerActive) {
        const diff = this.pointerTargetX - this.player.x;
        this.player.x += diff * Math.min(1, dt * 18);
      }
      this.player.x = clamp(this.player.x, halfW + 10, this.width - halfW - 10);
      this.player.vx = (this.player.x - prevX) / dt;

      // Soft puff trail when moving quickly
      if (Math.abs(this.player.vx) > 220 && Math.random() < dt * 18) {
        this.particles.push({
          x: this.player.x - Math.sign(this.player.vx) * halfW * 0.7,
          y: this.player.y + rand(-6, 10),
          vx: -this.player.vx * 0.12,
          vy: rand(-18, 12),
          r: rand(3, 6),
          life: 0.35,
          maxLife: 0.35,
          color: 'rgba(255, 250, 240, 0.55)'
        });
      }

      // Spawners (paused during wave celebration)
      if (this.celebrationTimer <= 0) {
        const pace = 1 + (this.wave - 1) * 0.085;

        this.spawnTimers.star -= worldDt;
        if (this.spawnTimers.star <= 0) {
          this._spawnCelestial();
          this.spawnTimers.star = Math.max(0.75, rand(1.25, 1.85) / pace);
        }

        this.spawnTimers.meteor -= worldDt;
        if (this.spawnTimers.meteor <= 0) {
          this._spawnMeteor();
          this.spawnTimers.meteor = Math.max(2.6, rand(4.4, 6.8) / pace);
        }

        if (this.wave >= 2 && !this.boss) {
          this.spawnTimers.storm -= worldDt;
          if (this.spawnTimers.storm <= 0) {
            this._spawnStormCloud();
            this.spawnTimers.storm = Math.max(5.0, rand(7.5, 10.5) / pace);
          }
        }

        if (this.wave >= 3 && !this.boss) {
          this.spawnTimers.lightning -= worldDt;
          if (this.spawnTimers.lightning <= 0) {
            // Bias slightly toward player lane so it's exciting to dodge
            const lx = Math.random() < 0.55 ? this.player.x + rand(-70, 70) : null;
            this._spawnLightning(lx);
            this.spawnTimers.lightning = Math.max(2.9, rand(4.6, 6.6) / pace);
          }
        }

        this.spawnTimers.powerup -= dt;
        if (this.spawnTimers.powerup <= 0) {
          this._spawnPowerup();
          this.spawnTimers.powerup = rand(11.5, 16.5);
        }
      }

      // Update Boss (Tempest Sovereign)
      if (this.boss) {
        this.boss.phase += worldDt * 1.8;
        this.boss.x += this.boss.vx * worldDt;
        if (this.boss.x < 105) {
          this.boss.x = 105;
          this.boss.vx = Math.abs(this.boss.vx);
        } else if (this.boss.x > this.width - 105) {
          this.boss.x = this.width - 105;
          this.boss.vx = -Math.abs(this.boss.vx);
        }
        this.boss.y = this.height * 0.21 + Math.sin(this.boss.phase) * 18;
        if (this.boss.hitFlash > 0) this.boss.hitFlash = Math.max(0, this.boss.hitFlash - dt);

        this.boss.attackTimer -= worldDt;
        if (this.boss.attackTimer <= 0 && this.celebrationTimer <= 0) {
          const attackRoll = Math.random();
          if (attackRoll < 0.55) {
            this._spawnLightning(this.player.x + rand(-40, 40));
            if (this.boss.hp <= this.boss.maxHp * 0.5) {
              this._spawnLightning(rand(80, this.width - 80));
            }
          } else {
            this._spawnMeteor(this.boss.x + rand(-50, 50));
          }
          this.boss.attackTimer = Math.max(1.75, 3.0 - this.wave * 0.08);
        }
      }

      // Update Constellation node animations
      for (const n of this.constellationNodes) {
        n.pulse += dt * 2.6;
        if (n.litFlash > 0) n.litFlash = Math.max(0, n.litFlash - dt * 1.6);
      }

      // Update Celestials (stars, wishes, moonbeams)
      for (let i = this.celestials.length - 1; i >= 0; i--) {
        const c = this.celestials[i];
        const stepDt = c.state === 'rising' ? dt : worldDt;

        c.trail.push({ x: c.x, y: c.y });
        if (c.trail.length > 10) c.trail.shift();

        c.rot += c.rotSpeed * stepDt;
        if (c.state === 'falling') {
          c.swayPhase += stepDt * 2.4;
          c.x += (c.vx + Math.sin(c.swayPhase) * 28) * stepDt;
          c.y += c.vy * stepDt;

          if (c.x < c.r + 12) {
            c.x = c.r + 12;
            c.vx = Math.abs(c.vx);
          } else if (c.x > this.width - c.r - 12) {
            c.x = this.width - c.r - 12;
            c.vx = -Math.abs(c.vx);
          }

          // Check catch on Nimbus cloud
          const catchTop = this.player.y - this.player.height * 0.62;
          const catchBottom = this.player.y + this.player.height * 0.45;
          if (
            c.y + c.r >= catchTop &&
            c.y - c.r <= catchBottom &&
            Math.abs(c.x - this.player.x) <= this.player.width * 0.56 + c.r
          ) {
            this._bounceCelestial(c, false);
            continue;
          }

          // Missed star hits ground -> fades gently, resets combo
          if (c.y >= this.groundY - 4) {
            if (this.combo > 0) {
              this.combo = 0;
              this.sound.playMiss();
              this._updateHUD();
            }
            this._spawnParticles(c.x, this.groundY - 4, 6, 'rgba(255, 230, 160, 0.5)', 60, -40);
            this.celestials.splice(i, 1);
          }
        } else {
          // Rising star homing smoothly toward unlit constellation node
          if (c.targetNode && !c.targetNode.lit) {
            const dx = c.targetNode.x - c.x;
            const dy = c.targetNode.y - c.y;
            const d = Math.hypot(dx, dy);
            if (d < 28) {
              this._lightConstellationNode(c.targetNode, c.x, c.y);
              this.celestials.splice(i, 1);
              continue;
            }
            const steer = 6.2 * stepDt;
            const desiredVx = (dx / d) * 560;
            const desiredVy = (dy / d) * 560;
            c.vx = lerp(c.vx, desiredVx, steer);
            c.vy = lerp(c.vy, desiredVy, steer);
          } else {
            c.targetNode = this._pickConstellationTarget(c.x);
          }

          c.x += c.vx * stepDt;
          c.y += c.vy * stepDt;

          // Rising star shatters heavy meteors!
          for (let mIdx = this.meteors.length - 1; mIdx >= 0; mIdx--) {
            const m = this.meteors[mIdx];
            if (dist(c.x, c.y, m.x, m.y) < c.r + m.r + 10) {
              this._shatterMeteor(mIdx, 'STAR SMASH!');
            }
          }

          // Storm clouds can disrupt rising stars if they collide directly
          let blockedByStorm = false;
          for (const sc of this.stormClouds) {
            if (
              Math.abs(c.x - sc.x) < sc.w * 0.44 &&
              Math.abs(c.y - sc.y) < sc.h * 0.55
            ) {
              blockedByStorm = true;
              this._spawnParticles(c.x, c.y, 10, '#a696ff', 130, 0);
              this._addPopup(c.x, c.y, 'BLOCKED!', '#c5b8ff');
              break;
            }
          }
          if (blockedByStorm) {
            this.celestials.splice(i, 1);
            continue;
          }

          // Reached top of sky -> snaps into any remaining unlit node
          if (c.y < -20) {
            const fallback = this._pickConstellationTarget(c.x);
            if (fallback) {
              this._lightConstellationNode(fallback, c.x, 10);
            }
            this.celestials.splice(i, 1);
          }
        }
      }

      // Update Heavy Meteors
      for (let i = this.meteors.length - 1; i >= 0; i--) {
        const m = this.meteors[i];
        m.x += m.vx * worldDt;
        m.y += m.vy * worldDt;
        m.rot += m.rotSpeed * worldDt;

        if (Math.random() < worldDt * 22) {
          this.particles.push({
            x: m.x + rand(-8, 8),
            y: m.y - m.r * 0.5,
            vx: rand(-20, 20),
            vy: rand(-55, -20),
            r: rand(2, 4.5),
            life: 0.32,
            maxLife: 0.32,
            color: Math.random() < 0.5 ? '#ff7b47' : '#ffd26b'
          });
        }

        // Hit player cloud
        if (
          Math.abs(m.x - this.player.x) < this.player.width * 0.46 + m.r * 0.75 &&
          Math.abs(m.y - this.player.y) < this.player.height * 0.48 + m.r * 0.75
        ) {
          if (this.player.shield) {
            this.player.shield = false;
            this.player.invuln = 0.7;
            this.sound.playShieldBreak();
            this._shatterMeteor(i, 'SHIELD BASH!');
          } else {
            this.meteors.splice(i, 1);
            this._damagePlayer('METEOR HIT!');
          }
          continue;
        }

        // Hit village ground -> costs a life!
        if (m.y + m.r >= this.groundY) {
          const hitX = m.x;
          this.meteors.splice(i, 1);
          this._damageVillage(hitX);
        }
      }

      // Update Storm Clouds
      for (let i = this.stormClouds.length - 1; i >= 0; i--) {
        const sc = this.stormClouds[i];
        sc.x += sc.vx * worldDt;
        sc.boltTimer -= worldDt;

        if (sc.boltTimer <= 0.7 && sc.boltTimer > 0) {
          sc.charge = 1 - sc.boltTimer / 0.7;
        } else {
          sc.charge = 0;
        }

        if (sc.boltTimer <= 0 && sc.x > 60 && sc.x < this.width - 60) {
          this._spawnLightning(sc.x);
          sc.boltTimer = rand(3.2, 5.2);
        }

        // Remove once drifted off screen
        if ((sc.vx > 0 && sc.x > this.width + 110) || (sc.vx < 0 && sc.x < -110)) {
          this.stormClouds.splice(i, 1);
        }
      }

      // Update Lightning Bolts
      for (let i = this.lightnings.length - 1; i >= 0; i--) {
        const bolt = this.lightnings[i];
        if (bolt.phase === 'warn') {
          bolt.warnTime -= worldDt;
          if (bolt.warnTime <= 0) {
            bolt.phase = 'strike';
            bolt.segments = this._buildBoltSegments(bolt.x, 0, this.groundY);
            this.sound.playLightningStrike();
            this._shake(0.16, 6);
            this._spawnParticles(bolt.x, this.groundY - 4, 14, '#e6f4ff', 170, -110);
          }
        } else {
          bolt.strikeTime -= dt;
          if (!bolt.hitDone && Math.abs(bolt.x - this.player.x) < this.player.width * 0.44 + 14) {
            bolt.hitDone = true;
            this._damagePlayer('ZAPPED!');
          }
          if (bolt.strikeTime <= 0) {
            this.lightnings.splice(i, 1);
          }
        }
      }

      // Update Power-ups
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const p = this.powerups[i];
        p.phase += dt * 3.5;
        p.y += p.vy * worldDt;
        p.x += Math.sin(p.phase) * 24 * dt;

        if (
          Math.abs(p.x - this.player.x) < this.player.width * 0.55 + p.r &&
          Math.abs(p.y - this.player.y) < this.player.height * 0.55 + p.r
        ) {
          this._collectPowerup(p);
          this.powerups.splice(i, 1);
          continue;
        }

        if (p.y > this.groundY + 20) {
          this.powerups.splice(i, 1);
        }
      }

      // Update Gust rings
      for (let i = this.gustWaves.length - 1; i >= 0; i--) {
        const g = this.gustWaves[i];
        g.r = lerp(g.r, g.maxR, Math.min(1, dt * 11));
        g.alpha -= dt * 2.8;
        if (g.alpha <= 0) this.gustWaves.splice(i, 1);
      }

      // Update Boss Star Lances
      for (let i = this.starLances.length - 1; i >= 0; i--) {
        this.starLances[i].alpha -= dt * 2.2;
        if (this.starLances[i].alpha <= 0) this.starLances.splice(i, 1);
      }

      // Update Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 120 * dt;
        pt.life -= dt;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }

      // Update Floating Popups
      for (let i = this.popups.length - 1; i >= 0; i--) {
        const pop = this.popups[i];
        pop.y += pop.vy * dt;
        pop.life -= dt;
        if (pop.life <= 0) this.popups.splice(i, 1);
      }
    }

    _collectPowerup(p) {
      this.sound.playPowerup();
      this.player.happyTimer = 0.5;
      if (p.kind === 'wide') {
        this.player.wideTimer = 10.0;
        this._spawnParticles(p.x, p.y, 18, '#ffd97d', 170, -40);
        this._addPopup(p.x, p.y - 20, 'WIDE CLOUD!', '#ffd97d');
      } else if (p.kind === 'slow') {
        this.player.slowTimer = 7.5;
        this._spawnParticles(p.x, p.y, 18, '#8ce9ff', 170, -40);
        this._addPopup(p.x, p.y - 20, 'SLOW TIME!', '#8ce9ff');
      } else if (p.kind === 'shield') {
        this.player.shield = true;
        this._spawnParticles(p.x, p.y, 18, '#8bf7c2', 170, -40);
        this._addPopup(p.x, p.y - 20, 'STARLIGHT SHIELD!', '#8bf7c2');
      }
      this._updateHUD();
    }

    // ==================== RENDERING ====================
    _render() {
      const ctx = this.ctx;
      ctx.save();

      if (this.shakeTime > 0) {
        const ox = rand(-this.shakeMag, this.shakeMag);
        const oy = rand(-this.shakeMag, this.shakeMag);
        ctx.translate(ox, oy);
      }

      this._drawSky(ctx);
      this._drawAurora(ctx);
      this._drawCelestialBody(ctx);
      this._drawBackgroundStars(ctx);
      this._drawConstellation(ctx);
      this._drawMountainsAndVillage(ctx);

      if (this.state !== 'TITLE') {
        this._drawBoss(ctx);
        this._drawStormClouds(ctx);
        this._drawLightnings(ctx);
        this._drawPowerups(ctx);
        this._drawCelestials(ctx);
        this._drawMeteors(ctx);
        this._drawStarLances(ctx);
        this._drawGustWaves(ctx);
        this._drawPlayerCloud(ctx);
        this._drawParticles(ctx);
        this._drawPopups(ctx);
      } else {
        // Gentle preview cloud on title screen
        this._drawTitleShootingStars(ctx);
        this._drawPreviewCloud(ctx);
      }

      // Slow-time icy vignette
      if (this.state === 'PLAYING' && this.player.slowTimer > 0) {
        const vig = ctx.createRadialGradient(
          this.width * 0.5, this.height * 0.5, this.height * 0.25,
          this.width * 0.5, this.height * 0.5, Math.max(this.width, this.height) * 0.72
        );
        vig.addColorStop(0, 'rgba(120, 225, 255, 0)');
        vig.addColorStop(1, 'rgba(110, 215, 255, 0.22)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, this.width, this.height);
      }

      // Screen flash
      if (this.flashAlpha > 0) {
        ctx.globalAlpha = this.flashAlpha;
        ctx.fillStyle = this.flashColor;
        ctx.fillRect(0, 0, this.width, this.height);
      }

      ctx.restore();
    }

    _drawSky(ctx) {
      const rgb = (arr) => `rgb(${Math.round(arr[0])}, ${Math.round(arr[1])}, ${Math.round(arr[2])})`;
      const grad = ctx.createLinearGradient(0, 0, 0, this.height);
      grad.addColorStop(0, rgb(this.skyCurrent.top));
      grad.addColorStop(0.58, rgb(this.skyCurrent.mid));
      grad.addColorStop(1, rgb(this.skyCurrent.bottom));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    _drawAurora(ctx) {
      const aurora = this.waveConfig.skyPhase.aurora;
      if (!aurora) return;

      ctx.save();
      for (let b = 0; b < aurora.length; b++) {
        ctx.beginPath();
        const baseY = this.height * (0.16 + b * 0.09);
        ctx.moveTo(0, baseY);
        for (let x = 0; x <= this.width; x += 36) {
          const wave = Math.sin(x * 0.005 + this.time * (0.65 + b * 0.22) + b * 2.1) * 34
            + Math.cos(x * 0.011 - this.time * 0.4) * 16;
          ctx.lineTo(x, baseY + wave);
        }
        ctx.lineTo(this.width, baseY + 130);
        ctx.lineTo(0, baseY + 130);
        ctx.closePath();

        const g = ctx.createLinearGradient(0, baseY - 30, 0, baseY + 125);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.4, aurora[b]);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.restore();
    }

    _drawCelestialBody(ctx) {
      const cel = this.waveConfig.skyPhase.celestial;
      if (!cel) return;

      const cx = this.width * 0.84;
      const cy = this.height * 0.16;
      const r = Math.min(this.width, this.height) * 0.048;

      ctx.save();
      const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 3.4);
      glow.addColorStop(0, cel.glow);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 3.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = cel.color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      if (cel.type === 'crescent') {
        const rgb = this.skyCurrent.top;
        ctx.fillStyle = `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`;
        ctx.beginPath();
        ctx.arc(cx + r * 0.42, cy - r * 0.15, r * 0.88, 0, Math.PI * 2);
        ctx.fill();
      } else if (cel.type === 'eclipse') {
        ctx.fillStyle = '#12081e';
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    _drawBackgroundStars(ctx) {
      ctx.save();
      for (const s of this.bgStars) {
        const twinkle = 0.45 + 0.55 * Math.sin(this.time * s.speed + s.phase);
        ctx.globalAlpha = twinkle * this.skyCurrent.starAlpha;
        ctx.fillStyle = '#fff9e6';
        ctx.beginPath();
        ctx.arc(s.rx * this.width, s.ry * this.height, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    _drawTitleShootingStars(ctx) {
      ctx.save();
      for (const s of this.shootingBg) {
        ctx.globalAlpha = clamp(s.life * 1.3, 0, 1);
        ctx.strokeStyle = '#ffe9a8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 0.16, s.y - s.vy * 0.16);
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawConstellation(ctx) {
      if (this.constellationNodes.length === 0) return;

      ctx.save();
      // Edges
      for (const [a, b] of this.constellationEdges) {
        const n1 = this.constellationNodes[a];
        const n2 = this.constellationNodes[b];
        if (!n1 || !n2) continue;

        const bothLit = n1.lit && n2.lit;
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);

        if (bothLit) {
          ctx.setLineDash([]);
          ctx.strokeStyle = 'rgba(255, 226, 136, 0.85)';
          ctx.lineWidth = 2.4;
          ctx.shadowColor = '#ffd97d';
          ctx.shadowBlur = 10;
        } else {
          ctx.setLineDash([5, 6]);
          ctx.strokeStyle = 'rgba(210, 225, 255, 0.24)';
          ctx.lineWidth = 1.4;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Nodes
      for (const n of this.constellationNodes) {
        const pulse = Math.sin(n.pulse) * 0.18 + 1;
        if (n.lit) {
          const glowR = 22 + n.litFlash * 18;
          const g = ctx.createRadialGradient(n.x, n.y, 2, n.x, n.y, glowR);
          g.addColorStop(0, 'rgba(255, 245, 190, 0.95)');
          g.addColorStop(0.45, 'rgba(255, 210, 100, 0.38)');
          g.addColorStop(1, 'rgba(255, 210, 100, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
          ctx.fill();

          this._drawStarShape(ctx, n.x, n.y, 5, 9 * pulse, 4.2 * pulse, '#fff6c7');
        } else {
          // Unlit star socket
          ctx.strokeStyle = 'rgba(220, 234, 255, 0.5)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 8 * pulse, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(220, 234, 255, 0.22)';
          ctx.beginPath();
          ctx.arc(n.x, n.y, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    _drawMountainsAndVillage(ctx) {
      const phase = this.waveConfig.skyPhase;

      // Far mountains
      ctx.save();
      ctx.fillStyle = phase.mountainFar;
      ctx.beginPath();
      ctx.moveTo(0, this.height);
      ctx.lineTo(0, this.groundY - 12);
      const peaks = 6;
      for (let i = 0; i <= peaks; i++) {
        const px = (i / peaks) * this.width;
        const py = this.groundY - 24 - Math.sin(i * 1.7 + 0.6) * 28 - (i % 2) * 18;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(this.width, this.height);
      ctx.closePath();
      ctx.fill();

      // Near horizon hills
      ctx.fillStyle = phase.mountainNear;
      ctx.beginPath();
      ctx.moveTo(0, this.height);
      ctx.lineTo(0, this.groundY + 4);
      for (let x = 0; x <= this.width; x += 48) {
        const y = this.groundY + Math.sin(x * 0.008) * 7;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(this.width, this.height);
      ctx.closePath();
      ctx.fill();

      // Sleeping village cottages
      for (const c of this.cottages) {
        const baseY = this.groundY + 8;
        ctx.fillStyle = '#0c1022';
        ctx.fillRect(c.x - c.w * 0.5, baseY - c.h, c.w, c.h);

        // Roof
        ctx.beginPath();
        ctx.moveTo(c.x - c.w * 0.62, baseY - c.h);
        ctx.lineTo(c.x, baseY - c.h - c.roofH);
        ctx.lineTo(c.x + c.w * 0.62, baseY - c.h);
        ctx.closePath();
        ctx.fill();

        // Warm glowing window
        if (c.lit) {
          const glow = 0.78 + 0.22 * Math.sin(this.time * 2.2 + c.flicker);
          ctx.fillStyle = `rgba(255, 214, 120, ${glow})`;
          ctx.fillRect(c.x - 4, baseY - c.h + 6, 8, 7);
        }
      }
      ctx.restore();
    }

    _drawBoss(ctx) {
      if (!this.boss) return;
      const b = this.boss;
      ctx.save();
      ctx.translate(b.x, b.y);

      // Menacing storm aura
      const aura = ctx.createRadialGradient(0, 0, 22, 0, 0, 105);
      aura.addColorStop(0, 'rgba(255, 110, 175, 0.35)');
      aura.addColorStop(1, 'rgba(60, 15, 90, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 105, 0, Math.PI * 2);
      ctx.fill();

      // Dark royal storm body (outer rim pass, then unified fill so no internal rings)
      const fill = b.hitFlash > 0 ? '#fff2cc' : '#2a1a46';
      const rim = b.hitFlash > 0 ? '#ffffff' : '#ff8db8';

      const puffs = [
        [-48, 8, 28],
        [-22, -10, 34],
        [14, -14, 38],
        [48, 6, 30],
        [0, 14, 34]
      ];
      ctx.fillStyle = rim;
      for (const [px, py, pr] of puffs) {
        ctx.beginPath();
        ctx.arc(px, py, pr + 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = fill;
      for (const [px, py, pr] of puffs) {
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Golden storm crown
      ctx.fillStyle = '#ffd97d';
      ctx.beginPath();
      ctx.moveTo(-22, -40);
      ctx.lineTo(-14, -58);
      ctx.lineTo(0, -44);
      ctx.lineTo(14, -58);
      ctx.lineTo(22, -40);
      ctx.closePath();
      ctx.fill();

      // Glowing eyes
      ctx.fillStyle = '#ff9dc4';
      ctx.beginPath();
      ctx.ellipse(-18, 2, 7, 5, -0.2, 0, Math.PI * 2);
      ctx.ellipse(18, 2, 7, 5, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    _drawStormClouds(ctx) {
      for (const sc of this.stormClouds) {
        ctx.save();
        ctx.translate(sc.x, sc.y);

        const glow = sc.charge > 0 ? `rgba(255, 240, 140, ${0.35 + sc.charge * 0.5})` : 'rgba(130, 100, 195, 0.22)';
        ctx.shadowColor = glow;
        ctx.shadowBlur = sc.charge > 0 ? 18 : 8;

        ctx.fillStyle = sc.charge > 0.6 ? '#46376b' : '#2a2444';
        ctx.strokeStyle = sc.charge > 0 ? '#ffe98a' : '#6c6298';
        ctx.lineWidth = 1.8;

        const r = sc.h * 0.56;
        ctx.beginPath();
        ctx.arc(-sc.w * 0.26, 4, r * 0.85, 0, Math.PI * 2);
        ctx.arc(0, -6, r * 1.05, 0, Math.PI * 2);
        ctx.arc(sc.w * 0.26, 4, r * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Angry brows
        ctx.strokeStyle = '#ffd080';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-14, -2);
        ctx.lineTo(-5, 2);
        ctx.moveTo(14, -2);
        ctx.lineTo(5, 2);
        ctx.stroke();

        ctx.restore();
      }
    }

    _drawLightnings(ctx) {
      for (const bolt of this.lightnings) {
        ctx.save();
        if (bolt.phase === 'warn') {
          const flicker = 0.35 + 0.45 * Math.sin(this.time * 36);
          ctx.strokeStyle = `rgba(255, 238, 140, ${flicker})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(bolt.x, 0);
          ctx.lineTo(bolt.x, this.groundY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Vector warning bolt icon near top (no emoji font dependency)
          ctx.fillStyle = `rgba(255, 232, 120, ${0.7 + flicker * 0.3})`;
          ctx.beginPath();
          ctx.moveTo(bolt.x + 2, 62);
          ctx.lineTo(bolt.x - 6, 74);
          ctx.lineTo(bolt.x, 74);
          ctx.lineTo(bolt.x - 2, 85);
          ctx.lineTo(bolt.x + 7, 72);
          ctx.lineTo(bolt.x + 1, 72);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.strokeStyle = '#ffffff';
          ctx.shadowColor = '#9ee8ff';
          ctx.shadowBlur = 18;
          ctx.lineWidth = 5;
          ctx.beginPath();
          bolt.segments.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();

          ctx.strokeStyle = '#fff394';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    _drawCelestials(ctx) {
      for (const c of this.celestials) {
        ctx.save();

        // Luminous tail
        if (c.trail.length > 1) {
          for (let i = 1; i < c.trail.length; i++) {
            const alpha = (i / c.trail.length) * 0.45;
            ctx.strokeStyle = c.color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = (i / c.trail.length) * (c.r * 0.8);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(c.trail[i - 1].x, c.trail[i - 1].y);
            ctx.lineTo(c.trail[i].x, c.trail[i].y);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }

        // Glow halo
        const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, c.r * 2.2);
        g.addColorStop(0, c.color);
        g.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);

        if (c.kind === 'star') {
          this._drawStarShape(ctx, 0, 0, 5, c.r, c.r * 0.46, '#fff8d4');
        } else if (c.kind === 'wish') {
          // 4-point diamond wish lantern
          this._drawStarShape(ctx, 0, 0, 4, c.r * 1.15, c.r * 0.36, '#d8f9ff');
        } else {
          // Crescent moonbeam (clean path without erasing sky background)
          ctx.fillStyle = '#eef5ff';
          ctx.beginPath();
          ctx.arc(0, 0, c.r * 0.88, 0.35 * Math.PI, 1.65 * Math.PI, false);
          ctx.quadraticCurveTo(-c.r * 0.15, 0, Math.cos(0.35 * Math.PI) * c.r * 0.88, Math.sin(0.35 * Math.PI) * c.r * 0.88);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    }

    _drawMeteors(ctx) {
      for (const m of this.meteors) {
        ctx.save();
        ctx.translate(m.x, m.y);

        // Fiery danger glow
        const g = ctx.createRadialGradient(0, 0, m.r * 0.3, 0, 0, m.r * 2.1);
        g.addColorStop(0, 'rgba(255, 130, 60, 0.55)');
        g.addColorStop(1, 'rgba(255, 70, 30, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, m.r * 2.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(m.rot);
        ctx.fillStyle = '#3b242c';
        ctx.strokeStyle = '#ff8a4c';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        const sides = 7;
        for (let i = 0; i < sides; i++) {
          const ang = (i / sides) * Math.PI * 2;
          const rad = m.r * (0.82 + 0.24 * Math.sin(i * 2.4 + m.seed));
          const px = Math.cos(ang) * rad;
          const py = Math.sin(ang) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing ember core crack
        ctx.fillStyle = '#ffb35c';
        ctx.beginPath();
        ctx.arc(-3, 2, m.r * 0.22, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    _drawPowerups(ctx) {
      for (const p of this.powerups) {
        ctx.save();
        ctx.translate(p.x, p.y);
        const color = p.kind === 'wide' ? '#ffd97d' : p.kind === 'slow' ? '#8ce9ff' : '#8bf7c2';

        const g = ctx.createRadialGradient(0, 0, 4, 0, 0, p.r * 2.2);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(15, 22, 52, 0.88)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Crisp procedural vector icon inside each orb
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (p.kind === 'wide') {
          ctx.beginPath();
          ctx.moveTo(-7, 0);
          ctx.lineTo(7, 0);
          ctx.moveTo(-4, -3.5);
          ctx.lineTo(-7.5, 0);
          ctx.lineTo(-4, 3.5);
          ctx.moveTo(4, -3.5);
          ctx.lineTo(7.5, 0);
          ctx.lineTo(4, 3.5);
          ctx.stroke();
        } else if (p.kind === 'slow') {
          ctx.beginPath();
          ctx.moveTo(-5, -6);
          ctx.lineTo(5, -6);
          ctx.lineTo(0, 0);
          ctx.lineTo(5, 6);
          ctx.lineTo(-5, 6);
          ctx.lineTo(0, 0);
          ctx.closePath();
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -7);
          ctx.lineTo(6, -4);
          ctx.lineTo(5, 2.5);
          ctx.quadraticCurveTo(0, 7.5, 0, 7.5);
          ctx.quadraticCurveTo(0, 7.5, -5, 2.5);
          ctx.lineTo(-6, -4);
          ctx.closePath();
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    _drawStarLances(ctx) {
      for (const l of this.starLances) {
        ctx.save();
        ctx.globalAlpha = clamp(l.alpha, 0, 1);
        ctx.strokeStyle = '#fff0a8';
        ctx.shadowColor = '#ffd97d';
        ctx.shadowBlur = 16;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
        ctx.restore();
      }
    }

    _drawGustWaves(ctx) {
      for (const g of this.gustWaves) {
        ctx.save();
        ctx.globalAlpha = clamp(g.alpha, 0, 1);
        ctx.strokeStyle = '#fff1b5';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.r, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
        ctx.restore();
      }
    }

    _drawPreviewCloud(ctx) {
      const px = this.width * 0.5 + Math.sin(this.time * 0.9) * Math.min(130, this.width * 0.16);
      const py = this.groundY - 72 + Math.cos(this.time * 1.6) * 6;
      this._renderCloudBody(ctx, px, py, 114, 44, 0, false, false, true);
    }

    _drawPlayerCloud(ctx) {
      const p = this.player;
      if (p.invuln > 0 && Math.floor(this.time * 16) % 2 === 0) {
        return;
      }
      this._renderCloudBody(
        ctx,
        p.x,
        p.y,
        p.width,
        p.height,
        p.squash,
        p.shield,
        p.wideTimer > 0,
        p.happyTimer > 0
      );

      // Subtle Gust ready/cooldown arc under cloud
      if (p.gustCooldown > 0) {
        const pct = 1 - p.gustCooldown / p.gustMaxCooldown;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 224, 140, 0.55)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y + p.height * 0.65, 16, Math.PI * 0.2, Math.PI * (0.2 + 0.6 * pct));
        ctx.stroke();
        ctx.restore();
      }
    }

    _renderCloudBody(ctx, x, y, w, h, squash, hasShield, isWide, isHappy) {
      ctx.save();
      ctx.translate(x, y);
      const scaleX = 1 + squash * 0.35;
      const scaleY = 1 - squash * 0.35;
      ctx.scale(scaleX, scaleY);

      // Shield crystalline aura
      if (hasShield) {
        ctx.save();
        ctx.strokeStyle = 'rgba(139, 247, 194, 0.85)';
        ctx.fillStyle = 'rgba(139, 247, 194, 0.12)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.62, h * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Soft rim glow
      ctx.shadowColor = isWide ? 'rgba(255, 217, 125, 0.6)' : this.waveConfig.skyPhase.cloudRim;
      ctx.shadowBlur = isWide ? 18 : 12;

      const grad = ctx.createLinearGradient(0, -h * 0.65, 0, h * 0.55);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.65, '#f2f5ff');
      grad.addColorStop(1, '#cfd9f7');
      ctx.fillStyle = grad;

      const half = w * 0.5;
      ctx.beginPath();
      ctx.arc(-half * 0.62, 4, h * 0.42, 0, Math.PI * 2);
      ctx.arc(-half * 0.24, -8, h * 0.52, 0, Math.PI * 2);
      ctx.arc(half * 0.22, -7, h * 0.50, 0, Math.PI * 2);
      ctx.arc(half * 0.62, 4, h * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 8, half * 0.68, h * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Expressive face
      ctx.fillStyle = '#242b4d';
      ctx.strokeStyle = '#242b4d';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';

      const blinking = this.player.blinkTimer < 0;
      if (isHappy) {
        // Happy ^ ^ eyes
        ctx.beginPath();
        ctx.arc(-11, 2, 4.5, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(11, 2, 4.5, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else if (blinking) {
        ctx.beginPath();
        ctx.moveTo(-15, 2);
        ctx.lineTo(-7, 2);
        ctx.moveTo(7, 2);
        ctx.lineTo(15, 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(-11, 1, 3.2, 0, Math.PI * 2);
        ctx.arc(11, 1, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-10, -0.2, 1.1, 0, Math.PI * 2);
        ctx.arc(12, -0.2, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rosy cheeks
      ctx.fillStyle = 'rgba(255, 148, 184, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-18, 6, 4.5, 2.5, 0, 0, Math.PI * 2);
      ctx.ellipse(18, 6, 4.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tiny smile
      ctx.strokeStyle = '#242b4d';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 5, 3.8, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();

      ctx.restore();
    }

    _drawParticles(ctx) {
      ctx.save();
      for (const pt of this.particles) {
        ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    _drawPopups(ctx) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '800 15px "Trebuchet MS", system-ui, sans-serif';
      for (const pop of this.popups) {
        ctx.globalAlpha = clamp(pop.life / pop.maxLife, 0, 1);
        ctx.fillStyle = 'rgba(10, 14, 34, 0.65)';
        ctx.fillText(pop.text, pop.x + 1, pop.y + 1);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, pop.x, pop.y);
      }
      ctx.restore();
    }

    _drawStarShape(ctx, cx, cy, spikes, outerR, innerR, color) {
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, cy - outerR);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
        rot += step;
        ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
        rot += step;
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    global.starShepherd = new StarShepherdGame();
  });
})(window);
