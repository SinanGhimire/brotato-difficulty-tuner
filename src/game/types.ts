export interface Vec {
  x: number;
  y: number;
}

export type Species =
  | "skeleton"
  | "crusader"
  | "golem"
  | "minotaur"
  | "troll"
  | "shambler"
  | "spitter"
  | "flyer"
  | "brute";

export type WeaponKey = "pistol" | "rifle" | "shotgun" | "minigun";

export type CharacterKey = "spike" | "punk" | "crown" | "bald";

export interface Weapon {
  key: WeaponKey;
  name: string;
  color: string;
  sprite: "gunRifle" | "gunPistol" | "gunShotgun";
  rate: number;
  damage: number;
  pellets: number;
  spread: number;
  speed: number;
  bulletRadius: number;
  pierce: number;
  knock: number;
  shake: number;
}

export interface Mods {
  extraProjectiles: number;
  pierce: number;
  knockMult: number;
  projSpeedMult: number;
  crit: number;
  critMult: number;
  lifesteal: number;
  explosive: number;
  spreadMult: number;
}

export function baseMods(): Mods {
  return {
    extraProjectiles: 0,
    pierce: 0,
    knockMult: 1,
    projSpeedMult: 1,
    crit: 0.05,
    critMult: 2,
    lifesteal: 0,
    explosive: 0,
    spreadMult: 1,
  };
}

export interface Player extends Vec {
  radius: number;
  speed: number;
  baseSpeed: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  aim: number;
  invuln: number;
  bob: number;
  moving: boolean;
  animT: number;
  weapon: WeaponKey;
  damageMult: number;
  rateMult: number;
  character: CharacterKey;
  mods: Mods;
}

export interface Enemy extends Vec {
  radius: number;
  speed: number;
  hp: number;
  maxHp: number;
  species: Species;
  hurt: number;
  animT: number;
  scale: number;
  facing: 1 | -1;
  dying: boolean;
  deathT: number;
  attackCd: number;
  elite: boolean;
  xp: number;
  breed: string;
  name: string;
  tint: string;
  aura?: string | undefined;
  damage: number;
}

export interface Bullet extends Vec {
  /** previous frame position, used for swept collision */
  px: number;
  py: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  angle: number;
  damage: number;
  pierce: number;
  color: string;
  fromEcho: boolean;
  crit: boolean;
  knock: number;
  explosive: number;
  lifesteal: number;
  hits: Set<Enemy>;
}

export interface Particle extends Vec {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: string;
}

export interface Popup extends Vec {
  life: number;
  text: string;
}

export type DecorKind = "rock1" | "rock2" | "rock3" | "patch" | "crack" | "glyph";


export interface Decor extends Vec {
  scale: number;
  kind: DecorKind;
  hue?: string;
  rot: number;
}

export type PickupKind = "health" | "weapon" | "speed" | "rate" | "damage" | "xp";

export interface Pickup extends Vec {
  kind: PickupKind;
  weapon?: WeaponKey | undefined;
  life: number;
  bob: number;
  amount?: number;
  vx?: number;
  vy?: number;
}

export interface EchoFrame {
  x: number;
  y: number;
  aim: number;
  firing: boolean;
  moving: boolean;
}

export interface Echo {
  frames: EchoFrame[];
  t: number;
  x: number;
  y: number;
  aim: number;
  facing: 1 | -1;
  moving: boolean;
  animT: number;
  hp: number;
  maxHp: number;
  weapon: WeaponKey;
  damageMult: number;
  rateMult: number;
  cooldown: number;
  muzzle: number;
  character: CharacterKey;
  mods: Mods;
  fading: number;
  dead: boolean;
}

export type FloorTheme = "slab" | "tech" | "ash";

export interface GameState {
  player: Player;
  cam: Vec;
  lootTimer: number;
  enemies: Enemy[];
  bullets: Bullet[];
  particles: Particle[];
  popups: Popup[];
  decor: Decor[];
  pickups: Pickup[];
  echoes: Echo[];
  recording: EchoFrame[];
  recordAcc: number;
  echoTimer: number;
  score: number;
  wave: number;
  waveTimer: number;
  spawnTimer: number;
  fireCooldown: number;
  /** true while the player is aiming manually (focus fire) */
  focusAim: boolean;
  mouseX: number;
  mouseY: number;
  muzzle: number;
  /** directional camera recoil kick, decays fast */
  kick: number;
  kickAng: number;
  /** hitmarker pulse on the crosshair */
  hitFlash: number;
  shake: number;

  over: boolean;
  breather: number;
  xp: number;
  xpToNext: number;
  level: number;
  kills: number;
  time: number;
  sfx: string[];
  pendingUpgrades: string[];
  takenUpgrades: Record<string, number>;
  paused: boolean;
  /** randomized arena surface for this run */
  floor: FloorTheme;
  /** radius of the fixed arena border — grows each wave */
  arenaR: number;
}
