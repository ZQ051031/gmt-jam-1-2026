// Constellation patterns and day-to-night sky palettes for Star Shepherd
(function (global) {
  'use strict';

  const SKY_PHASES = [
    {
      name: 'Golden Dusk',
      top: [44, 38, 92],
      mid: [122, 68, 122],
      bottom: [232, 134, 108],
      starAlpha: 0.45,
      aurora: null,
      celestial: { type: 'settingSun', color: '#ffd28e', glow: 'rgba(255, 190, 120, 0.35)' },
      mountainFar: '#3d2857',
      mountainNear: '#23173b',
      cloudRim: '#ffe0ba'
    },
    {
      name: 'Rose Twilight',
      top: [23, 27, 74],
      mid: [72, 46, 106],
      bottom: [158, 76, 118],
      starAlpha: 0.7,
      aurora: null,
      celestial: { type: 'crescent', color: '#fff2cc', glow: 'rgba(255, 232, 180, 0.25)' },
      mountainFar: '#271e4c',
      mountainNear: '#161130',
      cloudRim: '#ffd0e2'
    },
    {
      name: 'Velvet Midnight',
      top: [8, 13, 38],
      mid: [18, 30, 74],
      bottom: [34, 52, 106],
      starAlpha: 0.95,
      aurora: null,
      celestial: { type: 'fullMoon', color: '#eef4ff', glow: 'rgba(180, 210, 255, 0.28)' },
      mountainFar: '#141d42',
      mountainNear: '#0b1026',
      cloudRim: '#cde2ff'
    },
    {
      name: 'Aurora Borealis',
      top: [7, 16, 40],
      mid: [13, 44, 72],
      bottom: [25, 76, 98],
      starAlpha: 1.0,
      aurora: ['rgba(94, 252, 198, 0.22)', 'rgba(116, 214, 255, 0.18)', 'rgba(182, 122, 255, 0.15)'],
      celestial: { type: 'crescent', color: '#d8fff4', glow: 'rgba(120, 255, 220, 0.26)' },
      mountainFar: '#0f273c',
      mountainNear: '#081726',
      cloudRim: '#b5fff0'
    },
    {
      name: 'Tempest Eclipse',
      top: [14, 9, 30],
      mid: [42, 18, 56],
      bottom: [76, 30, 62],
      starAlpha: 0.75,
      aurora: ['rgba(255, 110, 165, 0.15)', 'rgba(145, 92, 255, 0.16)'],
      celestial: { type: 'eclipse', color: '#ff8da8', glow: 'rgba(255, 115, 150, 0.4)' },
      mountainFar: '#261233',
      mountainNear: '#14091d',
      cloudRim: '#ffb8d2',
      isStorm: true
    },
    {
      name: 'First Dawn',
      top: [26, 36, 86],
      mid: [94, 72, 134],
      bottom: [244, 164, 128],
      starAlpha: 0.6,
      aurora: ['rgba(255, 210, 140, 0.14)', 'rgba(255, 156, 186, 0.14)'],
      celestial: { type: 'risingSun', color: '#ffe5a3', glow: 'rgba(255, 215, 130, 0.35)' },
      mountainFar: '#3a2d5c',
      mountainNear: '#211838',
      cloudRim: '#ffebbf'
    }
  ];

  // Coordinates are normalized within the upper constellation band:
  // x in [0.14 .. 0.86], y in [0.13 .. 0.36]
  const CONSTELLATIONS = [
    {
      id: 'corona',
      name: 'Corona Borealis',
      subtitle: 'The Northern Crown',
      nodes: [
        [0.24, 0.23],
        [0.34, 0.30],
        [0.46, 0.33],
        [0.60, 0.31],
        [0.74, 0.22]
      ],
      edges: [
        [0, 1], [1, 2], [2, 3], [3, 4]
      ]
    },
    {
      id: 'dipper',
      name: 'Ursa Minor',
      subtitle: 'The Little Dipper',
      nodes: [
        [0.20, 0.28],
        [0.32, 0.24],
        [0.44, 0.23],
        [0.56, 0.25],
        [0.60, 0.34],
        [0.75, 0.31],
        [0.72, 0.20]
      ],
      edges: [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]
      ]
    },
    {
      id: 'cygnus',
      name: 'Cygnus',
      subtitle: 'The Celestial Swan',
      nodes: [
        [0.50, 0.14],
        [0.50, 0.24],
        [0.50, 0.35],
        [0.31, 0.21],
        [0.69, 0.21],
        [0.21, 0.27],
        [0.79, 0.27]
      ],
      edges: [
        [0, 1], [1, 2], [3, 1], [1, 4], [5, 3], [4, 6]
      ]
    },
    {
      id: 'orion',
      name: 'Orion',
      subtitle: 'The Starlit Hunter',
      nodes: [
        [0.36, 0.14],
        [0.64, 0.15],
        [0.44, 0.24],
        [0.50, 0.24],
        [0.56, 0.24],
        [0.38, 0.35],
        [0.62, 0.34]
      ],
      edges: [
        [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 1], [5, 6]
      ]
    },
    {
      id: 'draco',
      name: 'Tempest Draco',
      subtitle: 'Storm Sovereign Seal',
      isBoss: true,
      nodes: [
        [0.20, 0.22],
        [0.30, 0.15],
        [0.42, 0.20],
        [0.50, 0.14],
        [0.58, 0.20],
        [0.70, 0.15],
        [0.80, 0.22],
        [0.50, 0.31]
      ],
      edges: [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 7], [4, 7]
      ]
    },
    {
      id: 'lyra',
      name: 'Lyra',
      subtitle: 'The Celestial Harp',
      nodes: [
        [0.42, 0.14],
        [0.54, 0.18],
        [0.46, 0.25],
        [0.39, 0.34],
        [0.55, 0.34],
        [0.64, 0.25]
      ],
      edges: [
        [0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [4, 5], [5, 1]
      ]
    },
    {
      id: 'phoenix',
      name: 'Phoenix',
      subtitle: 'The Dawn Weaver',
      nodes: [
        [0.50, 0.14],
        [0.38, 0.22],
        [0.62, 0.22],
        [0.22, 0.19],
        [0.78, 0.19],
        [0.50, 0.28],
        [0.42, 0.36],
        [0.58, 0.36]
      ],
      edges: [
        [0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 5], [5, 6], [5, 7]
      ]
    }
  ];

  function getWaveConfig(waveNumber) {
    const isBoss = waveNumber % 5 === 0;
    let constellation;
    let skyPhase;

    if (isBoss) {
      constellation = CONSTELLATIONS.find((c) => c.isBoss);
      skyPhase = SKY_PHASES[4]; // Tempest Eclipse
    } else {
      const nonBoss = CONSTELLATIONS.filter((c) => !c.isBoss);
      // Skip boss waves when indexing regular constellations
      const regularIndex = waveNumber - 1 - Math.floor((waveNumber - 1) / 5);
      constellation = nonBoss[regularIndex % nonBoss.length];

      // Day-to-night progression cycling cleanly across waves
      const nonStormPhases = [SKY_PHASES[0], SKY_PHASES[1], SKY_PHASES[2], SKY_PHASES[3], SKY_PHASES[5]];
      skyPhase = nonStormPhases[regularIndex % nonStormPhases.length];
    }

    return {
      wave: waveNumber,
      isBoss,
      constellation,
      skyPhase
    };
  }

  global.StarConstellations = {
    SKY_PHASES,
    CONSTELLATIONS,
    getWaveConfig
  };
})(window);
