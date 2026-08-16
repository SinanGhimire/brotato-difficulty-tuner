import { breedName, rollBreed } from "./breeds";
import type { ActorKey, AnimKey, Sprites, Strip } from "./assets";
import { baseMods } from "./types";
import { rollUpgrades, xpForLevel } from "./upgrades";
import type {
  Bullet,
  Mods,
  CharacterKey,
  Decor,
  Echo,
  Enemy,
  GameState,
  Pickup,
  PickupKind,
  Species,
  FloorTheme,
  Weapon,
  WeaponKey,
} from "./types";

export const WORLD_W = 1280;
export const WORLD_H = 720;

const WAVE_LENGTH = 28; // seconds
const ECHO_INTERVAL = 30; // seconds
const MAX_ECHOES = 3;
const RECORD_STEP = 1 / 30;
const MUZZLE_DISTANCE = 46;

/* ---- aim assist balance knobs ---- */
/** how far the auto-targeting can reach (world px) */
const AUTO_RANGE = 360;
/** turret swing speed of the auto-aim, rad/s */
const AIM_TURN_SPEED = 4.4;
/** auto-fire is slower than firing yourself */
const AUTO_RATE_PENALTY = 1.45;
/** damage bonus for aiming and firing manually */
const FOCUS_DAMAGE_BONUS = 1.35;


export interface Input {
  keys: Set<string>;
  mouse: { x: number; y: number };
  firing: boolean;
  /** left stick / analog move vector (-1..1) */
  moveX?: number;
  moveY?: number;
  /** right stick aim vector (-1..1); firing while held */
  aimX?: number;
  aimY?: number;
  /** touch play: lock the nearest zombie and fire automatically */
  autoAim?: boolean;
}

/* ---------------------------------- weapons --------------------------------- */

export const WEAPONS: Record<WeaponKey, Weapon> = {
  pistol: {
    key: "pistol",
    name: "Sidearm",
    color: "#5ec8ff",
    sprite: "gunPistol",
    rate: 0.24,
    damage: 7,
    pellets: 1,
    spread: 0.015,
    speed: 900,
    bulletRadius: 6,
    pierce: 0,
    knock: 8,
    shake: 2,
  },
  rifle: {
    key: "rifle",
    name: "Pulse Rifle",
    color: "#7bf2a8",
    sprite: "gunRifle",
    rate: 0.11,
    damage: 3,
    pellets: 1,
    spread: 0.045,
    speed: 980,
    bulletRadius: 5,
    pierce: 1,
    knock: 5,
    shake: 2.5,
  },
  shotgun: {
    key: "shotgun",
    name: "Scrap Shotgun",
    color: "#ffa34d",
    sprite: "gunShotgun",
    rate: 0.62,
    damage: 2.6,
    pellets: 7,
    spread: 0.3,
    speed: 760,
    bulletRadius: 5,
    pierce: 0,
    knock: 16,
    shake: 8,
  },
  minigun: {
    key: "minigun",
    name: "Hex Minigun",
    color: "#ff6ad5",
    sprite: "gunRifle",
    rate: 0.055,
    damage: 1.7,
    pellets: 1,
    spread: 0.13,
    speed: 900,
    bulletRadius: 4,
    pierce: 0,
    knock: 3,
    shake: 2,
  },
};

/* -------------------------------- characters -------------------------------- */

export const CHARACTERS: Record<
  CharacterKey,
  { name: string; blurb: string; hp: number; speed: number; weapon: WeaponKey; damage: number }
> = {
  spike: {
    name: "Volt",
    blurb: "Balanced all-rounder with the Pulse Rifle.",
    hp: 100,
    speed: 268,
    weapon: "rifle",
    damage: 1,
  },
  punk: {
    name: "Rue",
    blurb: "Fragile speedster spraying the Hex Minigun.",
    hp: 80,
    speed: 312,
    weapon: "minigun",
    damage: 1,
  },
  crown: {
    name: "Regal",
    blurb: "Heavy tank hauling a Scrap Shotgun.",
    hp: 135,
    speed: 232,
    weapon: "shotgun",
    damage: 1.2,
  },
  bald: {
    name: "Nil",
    blurb: "Marksman — slow shots, heavy damage.",
    hp: 95,
    speed: 276,
    weapon: "pistol",
    damage: 1.6,
  },
};

/* --------------------------------- species ---------------------------------- */

interface SpeciesStat {
  sprite: ActorKey;
  radius: number;
  speed: [number, number];
  hp: number;
  score: number;
  height: number;
  color: string;
  tint?: string;
  damage: number;
  minWave: number;
  weight: number;
}

const STATS: Record<Species, SpeciesStat> = {
  skeleton: {
    sprite: "skeleton",
    radius: 17,
    speed: [92, 124],
    hp: 3,
    score: 10,
    height: 76,
    color: "#dfe4ee",
    damage: 8,
    minWave: 1,
    weight: 1.6,
  },
  crusader: {
    sprite: "crusader",
    radius: 19,
    speed: [78, 104],
    hp: 6,
    score: 25,
    height: 86,
    color: "#c9a24a",
    damage: 11,
    minWave: 1,
    weight: 1.5,
  },
  golem: {
    sprite: "golem",
    radius: 26,
    speed: [52, 70],
    hp: 14,
    score: 60,
    height: 112,
    color: "#7fd3e8",
    damage: 17,
    minWave: 2,
    weight: 1.3,
  },
  minotaur: {
    sprite: "minotaur",
    radius: 24,
    speed: [132, 168],
    hp: 10,
    score: 70,
    height: 104,
    color: "#e0764a",
    damage: 15,
    minWave: 2,
    weight: 1.3,
  },
  troll: {
    sprite: "troll",
    radius: 40,
    speed: [34, 48],
    hp: 46,
    score: 180,
    height: 168,
    color: "#a8c05a",
    damage: 26,
    minWave: 4,
    weight: 1.0,
  },
  shambler: {
    sprite: "grunt",
    radius: 17,
    speed: [64, 92],
    hp: 3,
    score: 10,
    height: 72,
    color: "#b45de0",
    damage: 8,
    minWave: 1,
    weight: 1.5,
  },
  spitter: {
    sprite: "spiker",
    radius: 19,
    speed: [86, 116],
    hp: 4,
    score: 20,
    height: 80,
    color: "#9ec95a",
    damage: 9,
    minWave: 1,
    weight: 1.5,
  },
  flyer: {
    sprite: "flyer",
    radius: 20,
    speed: [120, 150],
    hp: 3,
    score: 30,
    height: 70,
    color: "#6fd9ff",
    damage: 9,
    minWave: 2,
    weight: 1.4,
  },
  brute: {
    sprite: "brute",
    radius: 27,
    speed: [58, 78],
    hp: 16,
    score: 80,
    height: 108,
    color: "#ff7f6a",
    damage: 18,
    minWave: 3,
    weight: 1.2,
  },
};

export { STATS as SPECIES_STATS };

/* --------------------------------- helpers ---------------------------------- */

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const tintCache = new Map<string, HTMLCanvasElement>();

function tinted(img: HTMLImageElement, color: string, strength = 0.55): CanvasImageSource {
  if (!img.width) return img;
  const key = `${img.src}|${color}|${strength}`;
  const hit = tintCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  if (!g) return img;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "source-atop";
  g.globalAlpha = strength;
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  tintCache.set(key, c);
  return c;
}

/* ------------------------- procedural arena floor tile ---------------------- */

const floorTiles = new Map<FloorTheme, HTMLCanvasElement>();

interface FloorLook {
  base: [string, string, string];
  plate: string;
  hi: string;
  seam: string;
  grain: string;
  plates: boolean;
  sector: string;
}

const FLOOR_LOOKS: Record<FloorTheme, FloorLook> = {
  tech: {
    base: ["#141a26", "#101622", "#0c111b"],
    plate: "150,190,240",
    hi: "rgba(200,230,255,0.06)",
    seam: "rgba(90,170,230,0.10)",
    grain: "190,220,255",
    plates: true,
    sector: "rgba(120,210,255,0.14)",
  },
  slab: {
    // cut stone slabs — cool grey granite, no mud
    base: ["#232833", "#1c212b", "#161a23"],
    plate: "196,208,226",
    hi: "rgba(226,236,255,0.07)",
    seam: "rgba(150,175,210,0.13)",
    grain: "214,226,246",
    plates: true,
    sector: "rgba(160,196,236,0.12)",
  },
  ash: {
    base: ["#1b1a22", "#15141c", "#100f16"],
    plate: "170,160,190",
    hi: "rgba(220,215,235,0.05)",
    seam: "rgba(150,120,190,0.10)",
    grain: "220,214,236",
    plates: false,
    sector: "rgba(186,150,240,0.10)",
  },
};

export function floorSectorColor(theme: FloorTheme) {
  return FLOOR_LOOKS[theme]!.sector;
}

/** Seamless 256px arena surface: plated deck, packed dirt or ash flats. */
function arenaTile(theme: FloorTheme = "slab"): HTMLCanvasElement {
  const cached = floorTiles.get(theme);
  if (cached) return cached;
  const look = FLOOR_LOOKS[theme]!;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;

  // base gradient so tiles don't read as flat
  const base = g.createLinearGradient(0, 0, S, S);
  base.addColorStop(0, look.base[0]!);
  base.addColorStop(0.5, look.base[1]!);
  base.addColorStop(1, look.base[2]!);
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);

  const P = 64;
  if (look.plates) {
    // 64px plates with bevel: dark bottom-right, lighter top-left
    for (let y = 0; y < S; y += P) {
      for (let x = 0; x < S; x += P) {
        const shade = 0.02 + Math.random() * 0.05;
        g.fillStyle = `rgba(${look.plate},${shade.toFixed(3)})`;
        g.fillRect(x + 1, y + 1, P - 2, P - 2);
        g.fillStyle = look.hi;
        g.fillRect(x + 1, y + 1, P - 2, 1);
        g.fillRect(x + 1, y + 1, 1, P - 2);
        g.fillStyle = "rgba(0,0,0,0.35)";
        g.fillRect(x + 1, y + P - 2, P - 2, 1);
        g.fillRect(x + P - 2, y + 1, 1, P - 2);
        // rivets
        g.fillStyle = `rgba(${look.plate},0.09)`;
        const rivets: [number, number][] = [
          [x + 6, y + 6],
          [x + P - 6, y + 6],
          [x + 6, y + P - 6],
          [x + P - 6, y + P - 6],
        ];
        for (const [rx, ry] of rivets) {
          g.beginPath();
          g.arc(rx, ry, 1.6, 0, Math.PI * 2);
          g.fill();
        }
      }
    }

    // seam glow
    g.strokeStyle = look.seam;
    g.lineWidth = 1;
    for (let i = 0; i <= S; i += P) {
      g.beginPath();
      g.moveTo(i + 0.5, 0);
      g.lineTo(i + 0.5, S);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i + 0.5);
      g.lineTo(S, i + 0.5);
      g.stroke();
    }
  } else {
    // soft mottled patches so soil / ash read organic instead of tiled
    for (let i = 0; i < 46; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const r = 14 + Math.random() * 42;
      const a = 0.03 + Math.random() * 0.05;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${look.plate},${a.toFixed(3)})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      // draw 4 wrapped copies so patches tile seamlessly
      for (const [ox, oy] of [
        [0, 0],
        [S, 0],
        [0, S],
        [-S, 0],
        [0, -S],
      ] as [number, number][]) {
        g.save();
        g.translate(ox, oy);
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
    }
    // pebbles
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const r = 0.7 + Math.random() * 1.6;
      g.fillStyle = `rgba(${look.grain},${(0.04 + Math.random() * 0.07).toFixed(3)})`;
      g.beginPath();
      g.ellipse(x, y, r * 1.4, r, Math.random() * 3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(0,0,0,0.22)";
      g.beginPath();
      g.ellipse(x, y + r * 0.8, r * 1.2, r * 0.6, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  // grain / gravel speckle
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const a = Math.random() * 0.05;
    g.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${a * 3})` : `rgba(${look.grain},${a})`;
    g.fillRect(x, y, 1, 1);
  }

  floorTiles.set(theme, c);
  return c;
}




/* ------------------------------- state factory ------------------------------ */

export function createState(character: CharacterKey = "spike"): GameState {
  const c = CHARACTERS[character];
  const decor: Decor[] = [];
  // scuffed arena floor: worn patches, cracks and etched glyphs
  for (let i = 0; i < 18; i++) {
    decor.push({
      x: rand(-WORLD_W / 2, WORLD_W / 2),
      y: rand(-WORLD_H / 2, WORLD_H / 2),
      scale: rand(0.7, 1.4),
      kind: "patch",
      rot: rand(0, Math.PI * 2),
    });
  }
  for (let i = 0; i < 16; i++) {
    decor.push({
      x: rand(-WORLD_W / 2, WORLD_W / 2),
      y: rand(-WORLD_H / 2, WORLD_H / 2),
      scale: rand(0.6, 1.5),
      kind: "crack",
      rot: rand(0, Math.PI * 2),
    });
  }
  for (let i = 0; i < 6; i++) {
    decor.push({
      x: rand(-WORLD_W / 2, WORLD_W / 2),
      y: rand(-WORLD_H / 2, WORLD_H / 2),
      scale: rand(0.8, 1.6),
      kind: "glyph",
      rot: rand(0, Math.PI * 2),
    });
  }
  // a few stone blocks so the arena has silhouettes to read against
  for (let i = 0; i < 10; i++) {
    decor.push({
      x: rand(-WORLD_W / 2, WORLD_W / 2),
      y: rand(-WORLD_H / 2, WORLD_H / 2),
      scale: rand(0.4, 0.85),
      kind: pick(["rock1", "rock2", "rock3"] as const),
      rot: 0,
    });
  }


  const state: GameState = {
    cam: { x: -WORLD_W / 2, y: -WORLD_H / 2 },
    lootTimer: 6,
    player: {
      x: 0,
      y: 0,
      radius: 18,
      speed: c.speed,
      baseSpeed: c.speed,
      hp: c.hp,
      maxHp: c.hp,
      facing: 1,
      aim: 0,
      invuln: 0,
      bob: 0,
      moving: false,
      animT: 0,
      weapon: c.weapon,
      damageMult: c.damage,
      rateMult: 1,
      character,
      mods: baseMods(),
    },
    enemies: [],
    bullets: [],
    particles: [],
    popups: [],
    decor,
    pickups: [],
    echoes: [],
    recording: [],
    recordAcc: 0,
    echoTimer: ECHO_INTERVAL,
    score: 0,
    wave: 1,
    waveTimer: WAVE_LENGTH,
    spawnTimer: 0.2,
    fireCooldown: 0,
    focusAim: false,
    mouseX: 200,
    mouseY: 0,
    muzzle: 0,
    kick: 0,
    kickAng: 0,
    hitFlash: 0,
    shake: 0,

    over: false,
    breather: 0,
    xp: 0,
    xpToNext: xpForLevel(1),
    level: 1,
    kills: 0,
    time: 0,
    sfx: [],
    pendingUpgrades: [],
    takenUpgrades: {},
    paused: false,
    floor: pick(["slab", "tech"] as const),
    arenaR: arenaRadius(1, 1),
  };
  // seed the arena so it never feels empty on the first seconds
  for (let i = 0; i < 8; i++) spawnEnemy(state);
  return state;
}

function chooseSpecies(wave: number): Species {
  const pool = (Object.keys(STATS) as Species[]).filter((k) => STATS[k].minWave <= wave);
  const total = pool.reduce((sum, k) => sum + STATS[k].weight, 0);
  let roll = Math.random() * total;
  for (const k of pool) {
    roll -= STATS[k].weight;
    if (roll <= 0) return k;
  }
  return "skeleton";
}

function arenaRadius(wave: number, level: number) {
  // fixed circular border that grows every wave, and a little with level
  return Math.min(2600, 520 + (wave - 1) * 70 + (level - 1) * 14);
}
export { arenaRadius };

/** How many zombies should be alive at once — grows with wave AND level. */
function targetAlive(s: GameState) {
  return Math.min(80, 7 + (s.wave - 1) * 4 + Math.floor(s.level * 1.3));
}

function spawnEnemy(s: GameState, forceElite = false) {
  // spawn spread evenly along the arena border so they never clump on one spot
  const a = Math.random() * Math.PI * 2;
  const dist = s.arenaR * rand(0.86, 0.99);
  const x = Math.cos(a) * dist;
  const y = Math.sin(a) * dist;

  const species = chooseSpecies(s.wave);
  const st = STATS[species];
  const elite = forceElite || (s.wave >= 5 && Math.random() < 0.03);
  const breed = rollBreed(s.wave);
  // difficulty comes mostly from count/spread; HP grows gently so guns stay fun
  const hp = Math.round(st.hp * (1 + (s.wave - 1) * 0.13) * breed.hpMul * (elite ? 2.4 : 1));
  s.enemies.push({
    x,
    y,
    radius: st.radius * breed.scaleMul * (elite ? 1.22 : 1),
    speed: (rand(st.speed[0], st.speed[1]) * 0.82 + s.wave * 1.6) * breed.speedMul * (elite ? 1.1 : 1),
    hp,
    maxHp: hp,
    species,
    hurt: 0,
    animT: Math.random(),
    scale: rand(0.94, 1.08) * breed.scaleMul * (elite ? 1.25 : 1),
    facing: 1,
    dying: false,
    deathT: 0,
    attackCd: 0,
    elite,
    xp: Math.max(1, Math.round((st.score * breed.scoreMul) / 8)) * (elite ? 4 : 1),
    breed: breed.id,
    name: breedName(breed, species),
    tint: "",
    aura: breed.aura,
    damage: st.damage * breed.dmgMul * 0.55,
  });
}

/** Small welcome pulse when a wave starts (kept light — pressure is gradual). */
function waveBurst(s: GameState) {
  const n = Math.min(18, 4 + Math.round(s.wave * 1.5));
  for (let i = 0; i < n; i++) spawnEnemy(s);
  if (s.wave % 5 === 0) spawnEnemy(s, true);
}

function dropXp(s: GameState, x: number, y: number, amount: number) {
  const orbs = Math.min(6, 1 + Math.floor(amount / 4));
  const per = Math.max(1, Math.round(amount / orbs));
  for (let i = 0; i < orbs; i++) {
    const a = Math.random() * Math.PI * 2;
    s.pickups.push({
      x: x + Math.cos(a) * rand(2, 20),
      y: y + Math.sin(a) * rand(2, 14),
      kind: "xp",
      life: 26,
      bob: Math.random() * Math.PI * 2,
      amount: per,
      vx: Math.cos(a) * rand(40, 120),
      vy: Math.sin(a) * rand(30, 90),
    });
  }
}

function grantXp(s: GameState, amount: number) {
  s.xp += amount;
  while (s.xp >= s.xpToNext) {
    s.xp -= s.xpToNext;
    s.level += 1;
    s.xpToNext = xpForLevel(s.level);
    s.pendingUpgrades = rollUpgrades(s.takenUpgrades, 3);
    s.sfx.push("level");
    s.paused = true;
    s.popups.push({ x: s.player.x, y: s.player.y - 130, life: 1.4, text: `LEVEL ${s.level}` });
    burst(s, s.player.x, s.player.y - 20, 26, "#ffd166", 240);
  }
}

function burst(s: GameState, x: number, y: number, count: number, hue: string, power = 180) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(power * 0.25, power);
    const life = rand(0.2, 0.55);
    s.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life,
      maxLife: life,
      size: rand(2, 5),
      hue,
    });
  }
}

/** Small AoE from Volatile Rounds. */
function explode(s: GameState, x: number, y: number, radius: number, damage: number, skip: Enemy) {
  burst(s, x, y, 16, "#ffb347", 300);
  s.shake = Math.max(s.shake, 6);
  for (const o of s.enemies) {
    if (o === skip || o.dying) continue;
    if (Math.hypot(o.x - x, o.y - BODY_Y - y) < radius + o.radius) {
      o.hp -= damage;
      o.hurt = 0.1;
    }
  }
}

function dropPickup(s: GameState, x: number, y: number, species: Species) {
  const roll = Math.random();
  const bigKill = species === "troll" || species === "golem";
  if (!bigKill && roll > 0.16) return;
  if (bigKill && roll > 0.6) return;
  let kind: PickupKind;
  let weapon: WeaponKey | undefined;
  const r2 = Math.random();
  if (r2 < 0.2) kind = "health";
  else if (r2 < 0.34) {
    kind = "weapon";
    weapon = pick(["pistol", "rifle", "shotgun", "minigun"] as WeaponKey[]);
  } else if (r2 < 0.6) kind = "speed";
  else if (r2 < 0.8) kind = "rate";
  else kind = "damage";

  s.pickups.push({
    x,
    y,
    kind,
    weapon,
    life: 18,
    bob: Math.random() * Math.PI * 2,
  });
}

/** Random loot that just lies on the floor around the player. */
function scatterLoot(s: GameState) {
  const a = Math.random() * Math.PI * 2;
  const d = Math.sqrt(Math.random()) * (s.arenaR - 40);
  const x = Math.cos(a) * d;
  const y = Math.sin(a) * d;
  const r = Math.random();
  let kind: PickupKind;
  let weapon: WeaponKey | undefined;
  if (r < 0.18) kind = "health";
  else if (r < 0.34) {
    kind = "weapon";
    weapon = pick(["pistol", "rifle", "shotgun", "minigun"] as WeaponKey[]);
  } else if (r < 0.6) kind = "speed";
  else if (r < 0.8) kind = "rate";
  else kind = "damage";
  s.pickups.push({ x, y, kind, weapon, life: 30, bob: Math.random() * Math.PI * 2 });
}

/* --------------------------------- shooting --------------------------------- */

function fire(
  s: GameState,
  x: number,
  y: number,
  aim: number,
  weaponKey: WeaponKey,
  damageMult: number,
  fromEcho: boolean,
  mods: Mods,
  /** extra spread multiplier: >1 when firing on the move, <1 when focus aiming */
  accuracy = 1,
) {
  const w = WEAPONS[weaponKey];
  const pellets = w.pellets + mods.extraProjectiles;
  const spread =
    (w.spread * mods.spreadMult + (pellets > 1 ? 0.02 * mods.extraProjectiles : 0)) * accuracy;

  const speed = w.speed * mods.projSpeedMult;
  for (let i = 0; i < pellets; i++) {
    const a = aim + rand(-spread, spread);
    const crit = Math.random() < mods.crit;
    const mx = x + Math.cos(a) * MUZZLE_DISTANCE;
    const my = y + Math.sin(a) * MUZZLE_DISTANCE - 16;
    const b: Bullet = {
      x: mx,
      y: my,
      px: mx,
      py: my,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      radius: Math.max(7, w.bulletRadius * 1.5),
      life: 2.2,
      angle: a,
      damage: w.damage * damageMult * (crit ? mods.critMult : 1),
      // bullets phase through everything and damage every enemy they touch
      pierce: Infinity,

      color: crit ? "#ffe066" : w.color,
      fromEcho,
      crit,
      knock: w.knock * mods.knockMult,
      explosive: mods.explosive,
      lifesteal: mods.lifesteal,
      hits: new Set<Enemy>(),
    };
    s.bullets.push(b);
  }
  const mx = x + Math.cos(aim) * MUZZLE_DISTANCE;
  const my = y + Math.sin(aim) * MUZZLE_DISTANCE - 16;
  if (!fromEcho) {
    s.sfx.push("shoot");
    s.muzzle = 0.075;
    s.shake = Math.max(s.shake, w.shake);
    // punchy directional recoil: camera nudges back along the shot
    s.kick = Math.min(14, s.kick + (weaponKey === "shotgun" ? 11 : 4.5));
    s.kickAng = aim;
    // hot brass flying out of the ejection port
    const side = aim + Math.PI * 0.5;
    for (let i = 0; i < (weaponKey === "shotgun" ? 1 : 1); i++) {
      const sp = rand(110, 210);
      s.particles.push({
        x: mx - Math.cos(aim) * 12,
        y: my - Math.sin(aim) * 12,
        vx: Math.cos(side) * sp - Math.cos(aim) * 40,
        vy: Math.sin(side) * sp - Math.sin(aim) * 40 - 60,
        life: 0.5,
        maxLife: 0.5,
        size: rand(2, 3.4),
        hue: "#ffd27a",
      });
    }
  }
  // muzzle sparks cone
  for (let i = 0; i < (fromEcho ? 2 : 7); i++) {
    const a = aim + rand(-0.28, 0.28);
    const sp = rand(150, 420);
    const life = rand(0.06, 0.18);
    s.particles.push({
      x: mx,
      y: my,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life,
      maxLife: life,
      size: rand(1.6, 3.6),
      hue: i % 3 === 0 ? "#fff3c4" : w.color,
    });
  }

}

// swept circle-vs-circle so fast bullets never phase through zombies
export const BODY_Y = 16;

function sweptHit(b: Bullet, prevX: number, prevY: number, e: Enemy) {
  const ey = e.y - BODY_Y;
  const r = b.radius + e.radius * 1.15 + 4;
  const dx = b.x - prevX;
  const dy = b.y - prevY;
  const fx = prevX - e.x;
  const fy = prevY - ey;
  const a = dx * dx + dy * dy;
  const bq = 2 * (fx * dx + fy * dy);
  const cq = fx * fx + fy * fy - r * r;
  if (cq <= 0) return true;
  if (a <= 0.0001) return false;
  const disc = bq * bq - 4 * a * cq;
  if (disc < 0) return false;
  const sq = Math.sqrt(disc);
  const t1 = (-bq - sq) / (2 * a);
  const t2 = (-bq + sq) / (2 * a);
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

/* ---------------------------------- update ---------------------------------- */

/* --------------------------- spatial hash for speed ------------------------- */

const CELL = 110;
const grid = new Map<number, Enemy[]>();

function cellKey(cx: number, cy: number) {
  return (cx + 5000) * 20000 + (cy + 5000);
}

function buildGrid(enemies: Enemy[]) {
  grid.clear();
  for (const e of enemies) {
    if (e.dying) continue;
    const k = cellKey(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
    const bucket = grid.get(k);
    if (bucket) bucket.push(e);
    else grid.set(k, [e]);
  }
}

function killEnemy(s: GameState, e: Enemy) {
  const st = STATS[e.species];
  e.dying = true;
  e.deathT = 0;
  s.score += st.score * (e.elite ? 3 : 1);
  s.kills += 1;
  s.sfx.push("kill");
  burst(s, e.x, e.y - 12, e.radius > 30 ? 22 : 10, st.color, 260);
  dropXp(s, e.x, e.y - 10, e.xp);
  dropPickup(s, e.x, e.y, e.species);
  if (e.radius > 34) s.shake = Math.max(s.shake, 10);
}

/* ---------------------------------- update ---------------------------------- */

export function update(s: GameState, input: Input, dt: number) {
  const p = s.player;
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 26);
  if (s.muzzle > 0) s.muzzle -= dt;
  if (s.kick > 0) s.kick = Math.max(0, s.kick - dt * 90);
  if (s.hitFlash > 0) s.hitFlash = Math.max(0, s.hitFlash - dt * 5);

  // hard caps keep the frame budget stable no matter how wild the fight gets
  if (s.particles.length > 380) s.particles.splice(0, s.particles.length - 380);
  if (s.popups.length > 40) s.popups.splice(0, s.popups.length - 40);
  if (s.bullets.length > 200) s.bullets.splice(0, s.bullets.length - 200);

  for (let i = s.popups.length - 1; i >= 0; i--) {
    const u = s.popups[i]!;
    u.y -= dt * 34;
    u.life -= dt;
    if (u.life <= 0) s.popups.splice(i, 1);
  }
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const q = s.particles[i]!;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vx *= 0.92;
    q.vy *= 0.92;
    q.life -= dt;
    if (q.life <= 0) s.particles.splice(i, 1);
  }
  if (s.over || s.paused) return;
  s.time += dt;

  /* -------------------------------- movement ------------------------------- */
  let dx = input.moveX ?? 0;
  let dy = input.moveY ?? 0;
  if (input.keys.has("w") || input.keys.has("arrowup")) dy -= 1;
  if (input.keys.has("s") || input.keys.has("arrowdown")) dy += 1;
  if (input.keys.has("a") || input.keys.has("arrowleft")) dx -= 1;
  if (input.keys.has("d") || input.keys.has("arrowright")) dx += 1;
  const len = Math.hypot(dx, dy);
  p.moving = len > 0.08;
  if (len > 1) {
    dx /= len;
    dy /= len;
  }
  p.animT += dt * (p.moving ? 1 : 0.6);
  p.bob += dt * (p.moving ? 12 : 3);
  p.x += dx * p.speed * dt;
  p.y += dy * p.speed * dt;

  // fixed circular border — grows with every wave and with the player's level
  s.arenaR = arenaRadius(s.wave, s.level);
  const pr = s.arenaR - p.radius - 6;
  const pd = Math.hypot(p.x, p.y);
  if (pd > pr) {
    p.x = (p.x / pd) * pr;
    p.y = (p.y / pd) * pr;
  }
  if (p.invuln > 0) p.invuln -= dt;

  // camera follows the player and never shows the outside of the arena too much
  const k = 1 - Math.pow(0.0001, dt);
  s.cam.x += (p.x - WORLD_W / 2 - s.cam.x) * k;
  s.cam.y += (p.y - WORLD_H / 2 - s.cam.y) * k;

  buildGrid(s.enemies);

  /* ------------------- aiming — assisted, not automated -------------------- */
  // Auto-aim only reaches so far, turns like a turret and gets sloppy on the move.
  // Aiming yourself (mouse / right stick) is always sharper and hits harder,
  // so positioning and manual focus fire still decide the fight.
  const stickLen = Math.hypot(input.aimX ?? 0, input.aimY ?? 0);
  const manual = stickLen > 0.25 || input.firing === true;
  s.focusAim = manual;


  let best = Infinity;
  let tx = 0;
  let ty = 0;
  let hasTarget = false;
  for (const e of s.enemies) {
    if (e.dying) continue;
    const d = (e.x - p.x) ** 2 + (e.y - (p.y - BODY_Y)) ** 2;
    if (d < best && d < AUTO_RANGE * AUTO_RANGE) {
      best = d;
      tx = e.x;
      ty = e.y - BODY_Y;
      hasTarget = true;
    }
  }

  let onTarget = false;
  if (manual) {
    // player takes over: instant aim, tight spread, bonus damage
    if (stickLen > 0.25) {
      p.aim = Math.atan2(input.aimY!, input.aimX!);
      s.mouseX = p.x + Math.cos(p.aim) * 260;
      s.mouseY = p.y - BODY_Y + Math.sin(p.aim) * 260;
    } else {
      s.mouseX = input.mouse.x + s.cam.x;
      s.mouseY = input.mouse.y + s.cam.y;
      p.aim = Math.atan2(s.mouseY - (p.y - BODY_Y), s.mouseX - p.x);
    }
    onTarget = true;
  } else if (hasTarget) {
    const want = Math.atan2(ty - (p.y - BODY_Y), tx - p.x);
    let diff = want - p.aim;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const step = Math.min(Math.abs(diff), AIM_TURN_SPEED * dt) * Math.sign(diff);
    p.aim += step;
    // only shoots once the barrel has actually swung onto the target
    onTarget = Math.abs(diff) - Math.abs(step) < 0.10;
    s.mouseX = tx;
    s.mouseY = ty;
  } else {
    // nothing in reach: the gun drifts to where the player is heading
    const mvx = input.moveX ?? 0;
    const mvy = input.moveY ?? 0;
    if (p.moving && (mvx !== 0 || mvy !== 0)) p.aim = Math.atan2(mvy, mvx);

    s.mouseX = p.x + Math.cos(p.aim) * 260;
    s.mouseY = p.y - BODY_Y + Math.sin(p.aim) * 260;
  }
  p.facing = Math.cos(p.aim) >= 0 ? 1 : -1;

  /* -------------------------------- shooting ------------------------------- */
  s.fireCooldown -= dt;
  const wantsFire = (manual || hasTarget) && onTarget;
  if (wantsFire && s.fireCooldown <= 0) {
    // manual = tighter cone + damage bonus; auto on the move = sloppy cone
    const accuracy = manual ? (p.moving ? 0.85 : 0.6) : p.moving ? 1.8 : 1.15;
    const dmg = p.damageMult * (manual ? FOCUS_DAMAGE_BONUS : 1);
    s.fireCooldown = (WEAPONS[p.weapon].rate / p.rateMult) * (manual ? 1 : AUTO_RATE_PENALTY);
    fire(s, p.x, p.y, p.aim, p.weapon, dmg, false, p.mods, accuracy);
  }



  /* ------------------------------ echo recorder ----------------------------- */
  s.recordAcc += dt;
  while (s.recordAcc >= RECORD_STEP) {
    s.recordAcc -= RECORD_STEP;
    if (s.recording.length < 1200)
      s.recording.push({ x: p.x, y: p.y, aim: p.aim, firing: wantsFire, moving: p.moving });
  }
  s.echoTimer -= dt;
  if (s.echoTimer <= 0) {
    s.echoTimer = ECHO_INTERVAL;
    if (s.recording.length > 10) {
      const first = s.recording[0]!;
      const echo: Echo = {
        frames: s.recording,
        t: 0,
        x: first.x,
        y: first.y,
        aim: first.aim,
        facing: 1,
        moving: false,
        animT: 0,
        hp: p.maxHp * 0.5,
        maxHp: p.maxHp * 0.5,
        weapon: p.weapon,
        damageMult: p.damageMult,
        rateMult: p.rateMult,
        cooldown: 0,
        muzzle: 0,
        character: p.character,
        mods: { ...p.mods },
        fading: 0,
        dead: false,
      };
      s.echoes.push(echo);
      s.sfx.push("echo");
      if (s.echoes.length > MAX_ECHOES) s.echoes.shift();
      s.popups.push({ x: p.x, y: p.y - 150, life: 1.4, text: "ECHO CREATED" });
      burst(s, echo.x, echo.y - 20, 18, "#9fd8ff", 220);
    }
    s.recording = [];
  }

  /* -------------------------------- echoes --------------------------------- */
  for (let i = s.echoes.length - 1; i >= 0; i--) {
    const e = s.echoes[i]!;
    if (e.dead) {
      e.fading += dt;
      if (e.fading > 0.7) s.echoes.splice(i, 1);
      continue;
    }
    e.t += dt;
    const idx = Math.floor(e.t / RECORD_STEP) % e.frames.length;
    const f = e.frames[idx]!;
    e.x = f.x;
    e.y = f.y;
    e.aim = f.aim;
    e.moving = f.moving;
    e.facing = Math.cos(f.aim) >= 0 ? 1 : -1;
    e.animT += dt;
    e.cooldown -= dt;
    if (e.muzzle > 0) e.muzzle -= dt;
    if (f.firing && e.cooldown <= 0) {
      e.cooldown = WEAPONS[e.weapon].rate / e.rateMult;
      e.muzzle = 0.06;
      fire(s, e.x, e.y, e.aim, e.weapon, e.damageMult * 0.8, true, e.mods);
    }
  }

  /* --------------------------------- waves --------------------------------- */
  s.waveTimer -= dt;
  if (s.waveTimer <= 0) {
    s.wave += 1;
    s.waveTimer = WAVE_LENGTH;
    s.breather = 2.5;
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.12));
    s.popups.push({ x: p.x, y: p.y - 120, life: 1.8, text: `WAVE ${s.wave}` });
    s.popups.push({ x: p.x, y: p.y - 70, life: 1.6, text: "ARENA EXPANDS" });
    waveBurst(s);
  }

  const alive = s.enemies.reduce((n, e) => n + (e.dying ? 0 : 1), 0);
  const target = targetAlive(s);
  if (s.breather > 0) {
    s.breather -= dt;
  } else {
    s.spawnTimer -= dt;
    if (s.spawnTimer <= 0 && alive < target) {
      // gradual trickle: pressure ramps smoothly instead of dumping a mob on you
      s.spawnTimer = Math.max(0.28, 1.5 - s.wave * 0.06);
      const batch = 1 + Math.floor(s.wave / 6);
      for (let i = 0; i < batch && alive + i < target; i++) spawnEnemy(s);
    }
  }

  /* -------------------------------- bullets -------------------------------- */
  for (let i = s.bullets.length - 1; i >= 0; i--) {
    const b = s.bullets[i]!;
    b.px = b.x;
    b.py = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    // bullets pierce everything, they only die on timeout or at the border
    if (b.life <= 0 || Math.hypot(b.x, b.y) > s.arenaR + 90) {
      s.bullets.splice(i, 1);
      continue;
    }

    // swept collision against nearby cells only — this is what keeps it smooth
    const minX = Math.min(b.px, b.x) - 60;
    const maxX = Math.max(b.px, b.x) + 60;
    const minY = Math.min(b.py, b.y) - 60;
    const maxY = Math.max(b.py, b.y) + 60;
    for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++) {
      for (let cy = Math.floor(minY / CELL); cy <= Math.floor(maxY / CELL); cy++) {
        const bucket = grid.get(cellKey(cx, cy));
        if (!bucket) continue;
        for (const e of bucket) {
          if (e.dying || b.hits.has(e)) continue;
          if (!sweptHit(b, b.px, b.py, e)) continue;
          b.hits.add(e);
          e.hp -= b.damage;
          e.hurt = 0.12;
          const knock = b.knock / Math.max(1, e.radius / 16);
          e.x += Math.cos(b.angle) * knock;
          e.y += Math.sin(b.angle) * knock;
          const color = STATS[e.species].color;
          burst(s, b.x, b.y, b.crit ? 8 : 4, b.crit ? "#ffe066" : color, b.crit ? 240 : 170);
          if (!b.fromEcho) {
            s.hitFlash = 1;
            s.shake = Math.max(s.shake, b.crit ? 3 : 1.2);
          }
          if (b.explosive > 0) explode(s, b.x, b.y, 70 + b.explosive * 22, b.damage * 0.6, e);
          if (b.lifesteal > 0 && !b.fromEcho) {
            p.hp = Math.min(p.maxHp, p.hp + b.damage * b.lifesteal);
          }
          if (e.hp <= 0) killEnemy(s, e);
        }
      }
    }
  }

  /* -------------------------------- pickups -------------------------------- */
  s.lootTimer -= dt;
  if (s.lootTimer <= 0) {
    s.lootTimer = rand(6, 10);
    if (s.pickups.length < 24) scatterLoot(s);
  }

  for (let i = s.pickups.length - 1; i >= 0; i--) {
    const it = s.pickups[i]!;
    it.life -= dt;
    it.bob += dt * 3;
    if (it.life <= 0) {
      s.pickups.splice(i, 1);
      continue;
    }
    if (it.kind === "xp") {
      it.vx = (it.vx ?? 0) * 0.88;
      it.vy = (it.vy ?? 0) * 0.88;
      const dxo = p.x - it.x;
      const dyo = p.y - it.y;
      const dist = Math.hypot(dxo, dyo) || 1;
      if (dist < 240) {
        const pullPower = 620 * (1 - dist / 300);
        it.vx = (it.vx ?? 0) + (dxo / dist) * pullPower * dt * 6;
        it.vy = (it.vy ?? 0) + (dyo / dist) * pullPower * dt * 6;
      }
      it.x += (it.vx ?? 0) * dt;
      it.y += (it.vy ?? 0) * dt;
      if (dist < p.radius + 18) {
        s.pickups.splice(i, 1);
        grantXp(s, it.amount ?? 1);
      }
      continue;
    }
    if (Math.hypot(p.x - it.x, p.y - it.y) < p.radius + 22) {
      s.pickups.splice(i, 1);
      s.sfx.push("pickup");
      let text = "";
      if (it.kind === "health") {
        p.hp = Math.min(p.maxHp, p.hp + 28);
        text = "+28 HP";
      } else if (it.kind === "weapon" && it.weapon) {
        p.weapon = it.weapon;
        text = WEAPONS[it.weapon].name.toUpperCase();
      } else if (it.kind === "speed") {
        p.baseSpeed += 14;
        p.speed = p.baseSpeed;
        text = "+SPEED";
      } else if (it.kind === "rate") {
        p.rateMult = Math.min(3, p.rateMult + 0.12);
        text = "+FIRE RATE";
      } else {
        p.damageMult += 0.25;
        text = "+DAMAGE";
      }
      s.popups.push({ x: it.x, y: it.y - 30, life: 1, text });
      burst(s, it.x, it.y, 8, "#ffe9a8", 160);
    }
  }

  /* -------------------------------- enemies -------------------------------- */
  const er = s.arenaR - 10;
  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i]!;
    if (e.dying) {
      e.deathT += dt;
      if (e.deathT > 0.62) s.enemies.splice(i, 1);
      continue;
    }

    let tx = p.x;
    let ty = p.y;
    let best = Math.hypot(p.x - e.x, p.y - e.y);
    let targetEcho: Echo | null = null;
    for (const ec of s.echoes) {
      if (ec.dead) continue;
      const d = Math.hypot(ec.x - e.x, ec.y - e.y);
      if (d < best) {
        best = d;
        tx = ec.x;
        ty = ec.y;
        targetEcho = ec;
      }
    }

    const ang = Math.atan2(ty - e.y, tx - e.x);
    e.x += Math.cos(ang) * e.speed * dt;
    e.y += Math.sin(ang) * e.speed * dt;
    e.animT += dt;
    e.facing = tx < e.x ? -1 : 1;
    if (e.hurt > 0) e.hurt -= dt;
    if (e.attackCd > 0) e.attackCd -= dt;

    // separation against neighbours in the same grid cell only (cheap + spreads them)
    const bucket = grid.get(cellKey(Math.floor(e.x / CELL), Math.floor(e.y / CELL)));
    if (bucket) {
      for (const o of bucket) {
        if (o === e || o.dying) continue;
        const ox = e.x - o.x;
        const oy = e.y - o.y;
        const d = Math.hypot(ox, oy);
        const min = (e.radius + o.radius) * 1.15;
        if (d > 0.001 && d < min) {
          const push = (min - d) / 2;
          e.x += (ox / d) * push;
          e.y += (oy / d) * push;
          o.x -= (ox / d) * push;
          o.y -= (oy / d) * push;
        }
      }
    }

    // zombies stay inside the arena too
    const ed = Math.hypot(e.x, e.y);
    if (ed > er) {
      e.x = (e.x / ed) * er;
      e.y = (e.y / ed) * er;
    }

    // contact damage
    if (targetEcho) {
      if (
        e.attackCd <= 0 &&
        !targetEcho.dead &&
        Math.hypot(targetEcho.x - e.x, targetEcho.y - e.y) < e.radius + 20
      ) {
        e.attackCd = 0.6;
        targetEcho.hp -= e.damage;
        burst(s, targetEcho.x, targetEcho.y - 14, 6, "#9fd8ff", 180);
        if (targetEcho.hp <= 0 && !targetEcho.dead) {
          targetEcho.dead = true;
          burst(s, targetEcho.x, targetEcho.y - 18, 18, "#9fd8ff", 260);
        }
      }
    } else if (p.invuln <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
      p.hp -= e.damage;
      p.invuln = 0.8;
      s.sfx.push("hurt");
      s.shake = Math.max(s.shake, 10);
      burst(s, p.x, p.y - 14, 10, "#ff8f6a", 200);
      if (p.hp <= 0) {
        p.hp = 0;
        if (!s.over) s.sfx.push("death");
        s.over = true;
      }
    }
  }
}

/* ---------------------------------- render ---------------------------------- */

function drawFrame(
  ctx: CanvasRenderingContext2D,
  strip: Strip,
  frame: number,
  x: number,
  y: number,
  height: number,
  flip = false,
  tint?: string,
) {
  const img = strip.img;
  if (!img.width) return;
  const src = tint ? tinted(img, tint, 0.5) : img;
  const fw = img.width / strip.frames;
  const fh = img.height;
  const h = height;
  const w = h * (fw / fh);
  const i = Math.max(0, Math.min(strip.frames - 1, Math.floor(frame)));
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(src, i * fw, 0, fw, fh, -w / 2, -h, w, h);
  ctx.restore();
}

function drawImageCentered(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  w0: number,
  h0: number,
  x: number,
  y: number,
  height: number,
  rot = 0,
  alpha = 1,
) {
  if (!w0) return;
  const w = height * (w0 / h0);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -height / 2, w, height);
  ctx.restore();
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number) {
  ctx.save();
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = "#0d0b14";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function gunImage(sprites: Sprites, weapon: WeaponKey) {
  const w = WEAPONS[weapon];
  const img =
    w.sprite === "gunPistol"
      ? sprites.singles.gunPistol
      : w.sprite === "gunShotgun"
        ? sprites.singles.gunShotgun
        : sprites.singles.gun;
  return { img: tinted(img, w.color, 0.62), w: img.width, h: img.height };
}

function drawGun(
  ctx: CanvasRenderingContext2D,
  sprites: Sprites,
  weapon: WeaponKey,
  x: number,
  y: number,
  aim: number,
  facing: 1 | -1,
  recoil: number,
  muzzle: boolean,
) {
  const g = gunImage(sprites, weapon);
  if (!g.w) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(aim);
  if (facing === -1) ctx.scale(1, -1);
  const gunH = weapon === "pistol" ? 22 : 28;
  const gunW = gunH * (g.w / g.h);
  ctx.drawImage(g.img, -gunW * 0.3 - recoil, -gunH / 2, gunW, gunH);
  if (muzzle) {
    const m = sprites.singles.muzzle;
    drawImageCentered(ctx, m, m.width, m.height, gunW * 0.78 - recoil, 0, 34, Math.PI);
  }
  ctx.restore();
}

function drawPickup(ctx: CanvasRenderingContext2D, sprites: Sprites, it: Pickup, time: number) {
  if (it.kind === "xp") {
    const yy = it.y - 14 - Math.sin(it.bob * 2) * 3;
    ctx.save();

    ctx.fillStyle = "#7cf2c8";
    ctx.beginPath();
    ctx.moveTo(it.x, yy - 8);
    ctx.lineTo(it.x + 6, yy);
    ctx.lineTo(it.x, yy + 8);
    ctx.lineTo(it.x - 6, yy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }
  const y = it.y - 18 - Math.sin(it.bob) * 4;
  const blink = it.life < 4 && Math.floor(time * 8) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;
  drawShadow(ctx, it.x, it.y, 14);

  if (it.kind === "weapon" && it.weapon) {
    const g = gunImage(sprites, it.weapon);
    ctx.save();
    ctx.globalAlpha *= 0.9;
    ctx.fillStyle = "rgba(20,18,32,0.75)";
    ctx.strokeStyle = WEAPONS[it.weapon].color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(it.x - 26, y - 18, 52, 34, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (g.w) drawImageCentered(ctx, g.img, g.w, g.h, it.x, y, 20);
  } else {
    const colors: Record<string, string> = {
      health: "#ff5f7e",
      speed: "#6ff0ff",
      rate: "#ffd166",
      damage: "#ff9f4d",
    };
    const col = colors[it.kind] ?? "#fff";
    ctx.save();

    ctx.fillStyle = "rgba(18,16,28,0.85)";
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(it.x - 15, y - 15, 30, 30, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col;
    if (it.kind === "health") {
      ctx.fillRect(it.x - 8, y - 3, 16, 6);
      ctx.fillRect(it.x - 3, y - 8, 6, 16);
    } else {
      ctx.font = "800 15px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(it.kind === "speed" ? "»" : it.kind === "rate" ? "⚡" : "✦", it.x, y + 1);
    }
    ctx.restore();
  }
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, s: GameState, sprites: Sprites, time: number) {
  const p = s.player;
  const cam = s.cam;
  const wrap = (v: number, center: number, span: number) =>
    v + Math.round((center - v) / span) * span;

  ctx.save();
  if (s.shake > 0.2) {
    ctx.translate(rand(-s.shake, s.shake) * 0.5, rand(-s.shake, s.shake) * 0.5);
  }
  if (s.kick > 0.1) {
    // camera recoils opposite the shot direction
    ctx.translate(-Math.cos(s.kickAng) * s.kick * 0.45, -Math.sin(s.kickAng) * s.kick * 0.45);
  }


  // ground — procedural arena deck: dark plates, emissive seams, gravel grain
  const floor = arenaTile(s.floor);
  const tw = floor.width;
  const th = floor.height;
  const ox = -(((cam.x % tw) + tw) % tw);
  const oy = -(((cam.y % th) + th) % th);
  for (let x = ox; x < WORLD_W + tw; x += tw) {
    for (let y = oy; y < WORLD_H + th; y += th) {
      ctx.drawImage(floor, x, y, tw, th);
    }
  }

  // sector lines every 512px give the arena a sense of scale
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = floorSectorColor(s.floor);
  ctx.lineWidth = 2;
  const SEC = 512;
  const sx = -(((cam.x % SEC) + SEC) % SEC);
  const sy = -(((cam.y % SEC) + SEC) % SEC);
  for (let x = sx; x < WORLD_W + SEC; x += SEC) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_H);
    ctx.stroke();
  }
  for (let y = sy; y < WORLD_H + SEC; y += SEC) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_W, y);
    ctx.stroke();
  }
  ctx.restore();

  // soft vignette so the action stays readable
  const grad = ctx.createRadialGradient(
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_W * 0.3,
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_W * 0.78,
  );
  grad.addColorStop(0, "rgba(8,10,18,0)");
  grad.addColorStop(1, "rgba(8,10,18,0.55)");
  ctx.fillStyle = grad;
  ctx.fillRect(-40, -40, WORLD_W + 80, WORLD_H + 80);

  // everything below scrolls with the camera
  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  /* --------------------------- fixed arena border --------------------------- */
  // void outside the ring (even-odd fill), then a glowing containment wall
  ctx.save();
  ctx.beginPath();
  ctx.rect(cam.x - 200, cam.y - 200, WORLD_W + 400, WORLD_H + 400);
  ctx.arc(0, 0, s.arenaR, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(6,7,12,0.92)";
  ctx.fill("evenodd");
  ctx.restore();

  ctx.save();
  const pulse = 0.55 + Math.sin(time * 2) * 0.12;
  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 10;
  ctx.strokeStyle = `rgba(120,205,255,${(pulse * 0.35).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(0, 0, s.arenaR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = `rgba(190,240,255,${pulse.toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(0, 0, s.arenaR - 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // floor decals: worn plates, cracks and etched glyphs
  for (const d of s.decor) {
    if (d.kind === "rock1" || d.kind === "rock2" || d.kind === "rock3") continue;
    const dx = wrap(d.x, cam.x + WORLD_W / 2, WORLD_W);
    const dy = wrap(d.y, cam.y + WORLD_H / 2, WORLD_H);
    ctx.save();
    if (d.kind === "patch") {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = d.scale > 1 ? "#0d1420" : "#27334a";
      ctx.beginPath();
      ctx.ellipse(dx, dy, 96 * d.scale, 48 * d.scale, d.rot, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === "crack") {
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = "rgba(6,8,14,0.9)";
      ctx.lineWidth = 2.2 * d.scale;
      ctx.translate(dx, dy);
      ctx.rotate(d.rot);
      ctx.beginPath();
      ctx.moveTo(-60 * d.scale, 0);
      ctx.lineTo(-18 * d.scale, -9 * d.scale);
      ctx.lineTo(14 * d.scale, 6 * d.scale);
      ctx.lineTo(58 * d.scale, -4 * d.scale);
      ctx.stroke();
    } else {
      // glyph ring etched into the deck, faintly lit
      ctx.globalAlpha = 0.22 + Math.sin(time * 1.6 + d.x) * 0.05;
      ctx.strokeStyle = "rgba(120,210,255,0.85)";
      ctx.lineWidth = 3;
      ctx.translate(dx, dy);
      ctx.rotate(d.rot + time * 0.15);
      ctx.beginPath();
      ctx.arc(0, 0, 52 * d.scale, 0, Math.PI * 1.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 34 * d.scale, Math.PI, Math.PI * 2.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  // pickups sit on the ground under the actors
  for (const it of s.pickups) drawPickup(ctx, sprites, it, time);

  // stone blocks
  const props = s.decor.filter(
    (d) => d.kind === "rock1" || d.kind === "rock2" || d.kind === "rock3",
  );
  props.sort((a, b) => a.y - b.y);
  for (const d of props) {
    const img = sprites.singles[d.kind as "rock1" | "rock2" | "rock3"];
    const h = 80 * d.scale;
    const dx = wrap(d.x, cam.x + WORLD_W / 2, WORLD_W);
    const dy = wrap(d.y, cam.y + WORLD_H / 2, WORLD_H);
    drawShadow(ctx, dx, dy, h * 0.28);
    if (img && img.width) {
      const w = h * (img.width / img.height);
      ctx.drawImage(img, dx - w / 2, dy - h, w, h);
    }
  }


  const drawEnemy = (e: Enemy) => {
    const st = STATS[e.species];
    const h = st.height * e.scale;
    const strips = sprites.strips[st.sprite];
    if (e.dying) {
      const strip = strips.death;
      const f = (e.deathT / 0.62) * strip.frames;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - e.deathT / 0.62);
      drawFrame(ctx, strip, f, e.x, e.y, h, e.facing === -1);
      ctx.restore();
      return;
    }
    const strip = strips.walk;
    if (e.aura) {
      ctx.save();
      ctx.globalAlpha = 0.28 + Math.sin(time * 3 + e.animT * 5) * 0.08;
      ctx.fillStyle = e.aura;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, e.radius * 1.5, e.radius * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const hop = Math.abs(Math.sin(e.animT * 9)) * 3;
    drawShadow(ctx, e.x, e.y, e.radius * 0.95);
    ctx.save();
    if (e.hurt > 0) ctx.globalCompositeOperation = "lighter";
    drawFrame(
      ctx,
      strip,
      (e.animT * 12) % strip.frames,
      e.x,
      e.y - hop,
      h,
      e.facing === -1,
      undefined,
    );
    ctx.restore();

    if (e.elite) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.font = "bold 11px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillStyle = e.aura ?? "#ffd166";
      ctx.fillText(e.name.toUpperCase(), e.x, e.y - h - 20);
      ctx.restore();
    }

    // health bar for the big ones
    if ((e.species === "troll" || e.species === "golem" || e.elite) && e.hp < e.maxHp) {
      const w = e.radius * 2.2;
      ctx.save();
      ctx.fillStyle = "rgba(10,8,16,0.8)";
      ctx.fillRect(e.x - w / 2, e.y - h - 12, w, 6);
      ctx.fillStyle = e.aura ?? st.color;
      ctx.fillRect(e.x - w / 2, e.y - h - 12, (w * e.hp) / e.maxHp, 6);
      ctx.restore();
    }
  };

  const drawEcho = (e: Echo) => {
    const alpha = e.dead ? Math.max(0, 1 - e.fading / 0.7) * 0.6 : 0.55;
    const hop = e.moving ? Math.abs(Math.sin(e.animT * 12)) * 3 : 0;
    ctx.save();
    ctx.globalAlpha = alpha;
    drawShadow(ctx, e.x, e.y, 16);
    const strips = sprites.playerSkins[e.character];
    const strip = e.moving ? strips.walk : strips.idle;
    const glitch = e.dead ? rand(-4, 4) : 0;
    drawFrame(
      ctx,
      strip,
      (e.animT * (e.moving ? 12 : 6)) % strip.frames,
      e.x + glitch,
      e.y - hop,
      88,
      e.facing === -1,
      "#6fd0ff",
    );
    if (!e.dead) {
      drawGun(ctx, sprites, e.weapon, e.x, e.y - 30 - hop, e.aim, e.facing, 0, e.muzzle > 0);
      // echo hp bar
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "rgba(10,8,16,0.8)";
      ctx.fillRect(e.x - 22, e.y - 104, 44, 5);
      ctx.fillStyle = "#6fd0ff";
      ctx.fillRect(e.x - 22, e.y - 104, (44 * Math.max(0, e.hp)) / e.maxHp, 5);
    }
    ctx.restore();
  };

  const actors = [...s.enemies].sort((a, b) => a.y - b.y);
  for (const e of actors) if (e.y <= p.y) drawEnemy(e);
  for (const e of s.echoes) if (e.y <= p.y) drawEcho(e);

  // player
  const hop = Math.abs(Math.sin(p.bob)) * 3;
  drawShadow(ctx, p.x, p.y, p.radius);
  ctx.save();
  if (p.invuln > 0 && Math.floor(time * 20) % 2 === 0) ctx.globalAlpha = 0.45;
  const pAnim: AnimKey = s.over ? "death" : p.moving ? "walk" : "idle";
  const pStrip = sprites.playerSkins[p.character][pAnim];
  drawFrame(
    ctx,
    pStrip,
    (p.animT * (p.moving ? 12 : 6)) % pStrip.frames,
    p.x,
    p.y - hop,
    88,
    p.facing === -1,
  );

  if (!s.over) {
    const rate = WEAPONS[p.weapon].rate / p.rateMult;
    const recoil = Math.max(0, s.fireCooldown / rate - 0.55) * 10;
    drawGun(ctx, sprites, p.weapon, p.x, p.y - 30 - hop, p.aim, p.facing, recoil, s.muzzle > 0);
  }
  ctx.restore();

  for (const e of s.echoes) if (e.y > p.y) drawEcho(e);
  for (const e of actors) if (e.y > p.y) drawEnemy(e);

  // bullets — additive tracers with a hot core and fading tail
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const b of s.bullets) {
    const tail = Math.min(90, Math.hypot(b.vx, b.vy) * 0.075);
    const tx = b.x - Math.cos(b.angle) * tail;
    const ty = b.y - Math.sin(b.angle) * tail;
    ctx.save();
    ctx.globalAlpha = b.fromEcho ? 0.6 : 1;
    const trail = ctx.createLinearGradient(tx, ty, b.x, b.y);
    trail.addColorStop(0, "rgba(255,255,255,0)");
    trail.addColorStop(1, b.color);
    ctx.strokeStyle = trail;
    ctx.lineCap = "round";
    ctx.lineWidth = b.radius * 1.7;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha *= 0.9;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // muzzle light spilling onto the deck while firing
  if (s.muzzle > 0 && !s.over) {
    const mx = p.x + Math.cos(p.aim) * MUZZLE_DISTANCE;
    const my = p.y + Math.sin(p.aim) * MUZZLE_DISTANCE - 16;
    const light = ctx.createRadialGradient(mx, my, 0, mx, my, 190);
    const col = WEAPONS[p.weapon].color;
    light.addColorStop(0, "rgba(255,246,214,0.28)");
    light.addColorStop(0.35, `${col}22`);
    light.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(1, s.muzzle / 0.075);
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(mx, my, 190, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }


  // particles
  for (const q of s.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, q.life / q.maxLife);
    ctx.fillStyle = q.hue;
    ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    ctx.restore();
  }

  // floating text
  for (const u of s.popups) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, u.life * 2);
    ctx.textAlign = "center";
    const big = u.text.startsWith("WAVE") || u.text.startsWith("ECHO");
    ctx.font = `800 ${big ? 44 : 20}px ui-sans-serif, system-ui, sans-serif`;
    ctx.lineWidth = big ? 7 : 4;
    ctx.strokeStyle = "rgba(12,10,18,0.9)";
    ctx.strokeText(u.text, u.x, u.y);
    ctx.fillStyle = u.text.startsWith("ECHO") ? "#9fd8ff" : big ? "#ffd98a" : "#fff3cf";
    ctx.fillText(u.text, u.x, u.y);
    ctx.restore();
  }




  // reticle: dim while the gun auto-tracks, bright when you take manual aim
  if (!s.over) {
    const ch = sprites.singles.crosshair;
    const focus = s.focusAim;
    const chSize = (focus ? 42 : 30) + s.hitFlash * 8;
    if (focus || s.enemies.some((e) => !e.dying))
      drawImageCentered(
        ctx,
        ch,
        ch.width,
        ch.height,
        s.mouseX,
        s.mouseY,
        chSize,
        0,
        focus ? 0.95 : 0.4,
      );
  }


  if (s.hitFlash > 0.01) {
    // hitmarker: four ticks snapping outward on a confirmed hit
    ctx.save();
    ctx.globalAlpha = Math.min(1, s.hitFlash);
    ctx.strokeStyle = "#fff6d0";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    const r0 = 9 + (1 - s.hitFlash) * 8;
    const r1 = r0 + 8;
    for (const a of [0.25, 0.75, 1.25, 1.75]) {
      const ang = a * Math.PI;
      ctx.beginPath();
      ctx.moveTo(s.mouseX + Math.cos(ang) * r0, s.mouseY + Math.sin(ang) * r0);
      ctx.lineTo(s.mouseX + Math.cos(ang) * r1, s.mouseY + Math.sin(ang) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }


  ctx.restore(); // end camera transform

  // vignette
  const vig = ctx.createRadialGradient(
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_H * 0.35,
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_W * 0.72,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = vig;
  ctx.fillRect(-40, -40, WORLD_W + 80, WORLD_H + 80);

  // low-health pulse
  if (p.hp / p.maxHp < 0.34 && !s.over) {
    ctx.save();
    ctx.globalAlpha = 0.12 + Math.sin(time * 6) * 0.06;
    ctx.fillStyle = "#ff3b3b";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.restore();
  }

  ctx.restore();
}
