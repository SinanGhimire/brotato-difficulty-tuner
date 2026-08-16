import type { CharacterKey } from "./types";

/* ---- player skins ---- */
import pIdle from "@/assets/sprites2/player-idle.png";
import pWalk from "@/assets/sprites2/player-walk.png";
import pDeath from "@/assets/sprites2/player-death.png";
import p2Idle from "@/assets/sprites2/p2-idle.png";
import p2Walk from "@/assets/sprites2/p2-walk.png";
import p2Death from "@/assets/sprites2/p2-death.png";
import p3Idle from "@/assets/sprites2/p3-idle.png";
import p3Walk from "@/assets/sprites2/p3-walk.png";
import p3Death from "@/assets/sprites2/p3-death.png";
import p4Idle from "@/assets/sprites2/p4-idle.png";
import p4Walk from "@/assets/sprites2/p4-walk.png";
import p4Death from "@/assets/sprites2/p4-death.png";

/* ---- enemies ---- */
import m1Idle from "@/assets/mobs2/m1-idle.png";
import m1Walk from "@/assets/mobs2/m1-walk.png";
import m1Death from "@/assets/mobs2/m1-death.png";
import m2Idle from "@/assets/mobs2/m2-idle.png";
import m2Walk from "@/assets/mobs2/m2-walk.png";
import m2Death from "@/assets/mobs2/m2-death.png";
import m3Idle from "@/assets/mobs2/m3-idle.png";
import m3Walk from "@/assets/mobs2/m3-walk.png";
import m3Death from "@/assets/mobs2/m3-death.png";
import m4Idle from "@/assets/mobs2/m4-idle.png";
import m4Walk from "@/assets/mobs2/m4-walk.png";
import m4Death from "@/assets/mobs2/m4-death.png";

import e1Idle from "@/assets/sprites2/e1-idle.png";
import e1Walk from "@/assets/sprites2/e1-walk.png";
import e1Death from "@/assets/sprites2/e1-death.png";
import e2Idle from "@/assets/sprites2/e2-idle.png";
import e2Walk from "@/assets/sprites2/e2-walk.png";
import e2Death from "@/assets/sprites2/e2-death.png";
import e3Fly from "@/assets/sprites2/e3-fly.png";
import poofDeath from "@/assets/sprites2/poof-death.png";
import e4Idle from "@/assets/sprites2/e4-idle.png";
import e4Walk from "@/assets/sprites2/e4-walk.png";
import e4Death from "@/assets/sprites2/e4-death.png";
import gruntIdle from "@/assets/sprites/grunt-idle.png";
import gruntWalk from "@/assets/sprites/grunt-walk.png";
import gruntDeath from "@/assets/sprites/grunt-death.png";
import spikerIdle from "@/assets/sprites/spiker-idle.png";
import spikerWalk from "@/assets/sprites/spiker-walk.png";
import spikerDeath from "@/assets/sprites/spiker-death.png";
import bruteIdle from "@/assets/sprites/brute-idle.png";
import bruteWalk from "@/assets/sprites/brute-walk.png";
import bruteDeath from "@/assets/sprites/brute-death.png";
import flyerIdle from "@/assets/sprites/flyer-idle.png";
import flyerWalk from "@/assets/sprites/flyer-walk.png";
import flyerDeath from "@/assets/sprites/flyer-death.png";

/* ---- props & fx ---- */
import gunPistolPng from "@/assets/sprites/gun-pistol.png";
import gunRiflePng from "@/assets/sprites/gun-rifle.png";
import gunShotgunPng from "@/assets/sprites/gun-shotgun.png";
import muzzlePng from "@/assets/sprites/muzzle.png";
import bulletPng from "@/assets/sprites/bullet.png";
import crosshairPng from "@/assets/sprites2/crosshair.png";
import rock1Png from "@/assets/sprites/rockt1.png";
import rock2Png from "@/assets/sprites/rockt2.png";
import rock3Png from "@/assets/sprites/rockt3.png";

export interface Strip {
  img: HTMLImageElement;
  frames: number;
}

export type AnimKey = "idle" | "walk" | "death";

export type ActorKey =
  | "skeleton"
  | "crusader"
  | "golem"
  | "minotaur"
  | "troll"
  | "grunt"
  | "spiker"
  | "flyer"
  | "brute";

export type SingleKey =
  | "gun"
  | "gunPistol"
  | "gunShotgun"
  | "muzzle"
  | "bullet"
  | "crosshair"
  | "rock1"
  | "rock2"
  | "rock3";

export interface Sprites {
  strips: Record<ActorKey, Record<AnimKey, Strip>>;
  playerSkins: Record<CharacterKey, Record<AnimKey, Strip>>;
  singles: Record<SingleKey, HTMLImageElement>;
}

const IDLE_FRAMES = 6;
const WALK_FRAMES = 8;
const DEATH_FRAMES = 10;

/** [idle, walk, death] source urls per actor. Images are only created client-side. */
const ACTOR_SRC: Record<ActorKey, [string, string, string]> = {
  skeleton: [m1Idle, m1Walk, m1Death],
  crusader: [m2Idle, m2Walk, m2Death],
  golem: [m4Idle, m4Walk, m4Death],
  minotaur: [m4Idle, m4Walk, m4Death],
  troll: [m2Idle, m2Walk, m2Death],
  grunt: [m1Idle, m1Walk, m1Death],
  spiker: [m2Idle, m2Walk, m2Death],
  flyer: [m3Idle, m3Walk, m3Death],
  brute: [m4Idle, m4Walk, m4Death],
};

const PLAYER_SRC: Record<CharacterKey, [string, string, string]> = {
  spike: [pIdle, pWalk, pDeath],
  punk: [p2Idle, p2Walk, p2Death],
  crown: [p4Idle, p4Walk, p4Death],
  bald: [p3Idle, p3Walk, p3Death],
};

const SINGLE_SRC: Record<SingleKey, string> = {
  gun: gunRiflePng,
  gunPistol: gunPistolPng,
  gunShotgun: gunShotgunPng,
  muzzle: muzzlePng,
  bullet: bulletPng,
  crosshair: crosshairPng,
  rock1: rock1Png,
  rock2: rock2Png,
  rock3: rock3Png,
};

// e3/poof stay available for future winged variants
void e3Fly;
void poofDeath;

export const PLAYER_CHARACTERS: { key: CharacterKey; portrait: string; frames: number }[] = [
  { key: "spike", portrait: pIdle, frames: IDLE_FRAMES },
  { key: "punk", portrait: p2Idle, frames: IDLE_FRAMES },
  { key: "crown", portrait: p4Idle, frames: IDLE_FRAMES },
  { key: "bald", portrait: p3Idle, frames: IDLE_FRAMES },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });
}

async function loadAnims(src: [string, string, string]): Promise<Record<AnimKey, Strip>> {
  const [idle, walk, death] = await Promise.all(src.map(loadImage));
  return {
    idle: { img: idle!, frames: IDLE_FRAMES },
    walk: { img: walk!, frames: WALK_FRAMES },
    death: { img: death!, frames: DEATH_FRAMES },
  };
}

let cache: Sprites | null = null;
let inflight: Promise<Sprites> | null = null;

export function loadSprites(): Promise<Sprites> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = (async () => {
    const actorKeys = Object.keys(ACTOR_SRC) as ActorKey[];
    const playerKeys = Object.keys(PLAYER_SRC) as CharacterKey[];
    const singleKeys = Object.keys(SINGLE_SRC) as SingleKey[];

    const [actorAnims, playerAnims, singleImgs] = await Promise.all([
      Promise.all(actorKeys.map((k) => loadAnims(ACTOR_SRC[k]))),
      Promise.all(playerKeys.map((k) => loadAnims(PLAYER_SRC[k]))),
      Promise.all(singleKeys.map((k) => loadImage(SINGLE_SRC[k]))),
    ]);

    const strips = Object.fromEntries(
      actorKeys.map((k, i) => [k, actorAnims[i]!]),
    ) as Record<ActorKey, Record<AnimKey, Strip>>;
    const playerSkins = Object.fromEntries(
      playerKeys.map((k, i) => [k, playerAnims[i]!]),
    ) as Record<CharacterKey, Record<AnimKey, Strip>>;
    const singles = Object.fromEntries(
      singleKeys.map((k, i) => [k, singleImgs[i]!]),
    ) as Record<SingleKey, HTMLImageElement>;

    cache = { strips, playerSkins, singles };
    return cache;
  })();
  return inflight;
}

