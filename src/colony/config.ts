// Colony (v2) tunables. The planet, the seed, the early power loop.
export const COLONY = {
  world: {
    size: 192, // heightfield resolution AND region width in world units (1 cell = 1 unit)
    heightScale: 17, // world-units of relief from sea level to highest peak
    seaLevel: 0.34, // normalised elevation below which is ocean
    planetRadius: 1500, // the "ball" the flat region sits on (apex at y=0)
    coastSearch: 7, // how far a landing site may be from water and still count as coastal
    rivers: 6,
    noise: {
      elevFreq: 2.6,
      elevOctaves: 5,
      mountainFreq: 3.1,
      moistFreq: 1.7,
      moistOctaves: 4,
    },
  },
  time: {
    stepsPerSec: 15,
    simMinPerStep: 3,
    dayStartHour: 6,
    dayEndHour: 20,
  },
  power: {
    solarPeakW: 4.5, // peak solar output at noon
    baseLoadW: 1.1, // caravan idle draw
    batteryCapacityWh: 80,
    batteryStartWh: 44,
  },
  seed: {
    colonists: 2,
    name: 'Landing One',
  },
  render: {
    seed: 4242,
  },
} as const
