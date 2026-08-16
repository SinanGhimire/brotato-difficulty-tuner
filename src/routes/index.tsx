import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { loadSprites, PLAYER_CHARACTERS, type Sprites } from "@/game/assets";
import { initAudio, loadMuted, playSfx, setMuted, type SfxName } from "@/game/audio";
import {
  CHARACTERS,
  WEAPONS,
  SPECIES_STATS,
  createState,
  render,
  update,
  WORLD_H,
  WORLD_W,
  type Input,
} from "@/game/engine";
import type { CharacterKey, GameState, WeaponKey } from "@/game/types";
import { applyUpgrade, RARITY_COLOR, UPGRADE_MAP } from "@/game/upgrades";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Echo Vanguards" },
      {
        name: "description",
        content:
          "Survive endless zombie waves. Your gun auto-tracks up close — hold fire to aim yourself for +35% damage. Past runs return as Echoes to fight beside you.",
      },
      { property: "og:title", content: "Echo Vanguards" },
      {
        property: "og:description",
        content:
          "Survive endless zombie waves. Your gun auto-tracks up close — hold fire to aim yourself for +35% damage. Past runs return as Echoes to fight beside you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

interface Hud {
  hp: number;
  maxHp: number;
  score: number;
  wave: number;
  waveTimer: number;
  echoTimer: number;
  echoes: number;
  weapon: WeaponKey;
  over: boolean;
  level: number;
  xp: number;
  xpToNext: number;
  kills: number;
  enemies: number;
  time: number;
  offers: string[];
  paused: boolean;
}

const INITIAL_HUD: Hud = {
  hp: 100,
  maxHp: 100,
  score: 0,
  wave: 1,
  waveTimer: 28,
  echoTimer: 30,
  echoes: 0,
  weapon: "rifle",
  over: false,
  level: 1,
  xp: 0,
  xpToNext: 10,
  kills: 0,
  enemies: 0,
  time: 0,
  offers: [],
  paused: false,
};

function Stick({
  side,
  onChange,
  onEnd,
}: {
  side: "left" | "right";
  onChange: (dx: number, dy: number) => void;
  onEnd: () => void;
}) {
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const RADIUS = 56;

  return (
    <div
      className={`pointer-events-auto absolute bottom-4 ${side === "left" ? "left-4" : "right-4"} h-32 w-32 touch-none select-none rounded-full border border-border/70 bg-card/30 backdrop-blur`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        originRef.current = { x: e.clientX, y: e.clientY };
        setKnob({ x: 0, y: 0 });
      }}
      onPointerMove={(e) => {
        const o = originRef.current;
        if (!o) return;
        let dx = e.clientX - o.x;
        let dy = e.clientY - o.y;
        const d = Math.hypot(dx, dy);
        if (d > RADIUS) {
          dx = (dx / d) * RADIUS;
          dy = (dy / d) * RADIUS;
        }
        setKnob({ x: dx, y: dy });
        onChange(dx / RADIUS, dy / RADIUS);
      }}
      onPointerUp={() => {
        originRef.current = null;
        setKnob(null);
        onEnd();
      }}
      onPointerCancel={() => {
        originRef.current = null;
        setKnob(null);
        onEnd();
      }}
    >
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border border-primary/60 bg-primary/25"
        style={{
          transform: `translate(calc(-50% + ${knob?.x ?? 0}px), calc(-50% + ${knob?.y ?? 0}px))`,
        }}
      />
    </div>
  );
}

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createState());
  const spritesRef = useRef<Sprites | null>(null);
  const inputRef = useRef<Input>({
    keys: new Set<string>(),
    mouse: { x: WORLD_W / 2 + 120, y: WORLD_H / 2 },
    firing: false,
    moveX: 0,
    moveY: 0,
    aimX: 0,
    aimY: 0,
    autoAim: false,
  });
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<"menu" | "play">("menu");
  const [character, setCharacter] = useState<CharacterKey>("spike");
  const [best, setBest] = useState(0);
  const [muted, setMutedState] = useState(false);
  const [touch, setTouch] = useState(false);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [restartKey, setRestartKey] = useState(0);

  useEffect(() => {
    setMutedState(loadMuted());
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    const stored = Number(window.localStorage.getItem("void-arena:best") ?? 0);
    if (Number.isFinite(stored)) setBest(stored);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadSprites().then((s) => {
      if (!mounted) return;
      spritesRef.current = s;
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready || screen !== "play") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    stateRef.current = createState(character);
    const input = inputRef.current;
    input.firing = false;
    input.keys.clear();
    input.moveX = 0;
    input.moveY = 0;
    input.aimX = 0;
    input.aimY = 0;
    input.autoAim = touch;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(WORLD_W * dpr);
      canvas.height = Math.floor(WORLD_H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const toWorld = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      input.mouse.x = ((clientX - r.left) / r.width) * WORLD_W;
      input.mouse.y = ((clientY - r.top) / r.height) * WORLD_H;
    };

    const onMove = (e: PointerEvent) => toWorld(e.clientX, e.clientY);
    const onDown = (e: PointerEvent) => {
      toWorld(e.clientX, e.clientY);
      if (e.button === 0) input.firing = true;
    };
    const onUp = () => {
      input.firing = false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(k)) e.preventDefault();
      if (k === "escape" || k === "p") {
        const st = stateRef.current;
        if (!st.over && st.pendingUpgrades.length === 0) st.paused = !st.paused;
      }
      input.keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => input.keys.delete(e.key.toLowerCase());
    const onBlur = () => {
      input.keys.clear();
      input.firing = false;
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = stateRef.current;
      const sprites = spritesRef.current;
      const t0 = performance.now();
      update(s, input, dt);
      const t1 = performance.now();
      if (s.sfx.length) {
        for (const name of s.sfx) playSfx(name as SfxName);
        s.sfx.length = 0;
      }
      if (sprites) render(ctx, s, sprites, now / 1000);
      const t2 = performance.now();
      (window as unknown as Record<string, unknown>)["__perf"] = {
        u: t1 - t0,
        r: t2 - t1,
        e: s.enemies.length,
        b: s.bullets.length,
        p: s.particles.length,
      };

      hudAcc += dt;
      if (hudAcc > 0.1) {
        hudAcc = 0;
        setHud({
          hp: s.player.hp,
          maxHp: s.player.maxHp,
          score: s.score,
          wave: s.wave,
          waveTimer: Math.max(0, s.waveTimer),
          echoTimer: Math.max(0, s.echoTimer),
          echoes: s.echoes.length,
          weapon: s.player.weapon,
          over: s.over,
          level: s.level,
          xp: s.xp,
          xpToNext: s.xpToNext,
          kills: s.kills,
          enemies: s.enemies.filter((e) => !e.dying).length,
          time: s.time,
          offers: s.pendingUpgrades,
          paused: s.paused,
        });
        if (s.over) {
          setBest((b) => {
            const next = Math.max(b, s.score);
            window.localStorage.setItem("void-arena:best", String(next));
            return next;
          });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [ready, restartKey, screen, character, touch]);

  const hpPct = (hud.hp / hud.maxHp) * 100;
  const weapon = WEAPONS[hud.weapon];

  if (screen === "menu") {
    const sel = CHARACTERS[character];
    const selWeapon = WEAPONS[sel.weapon];
    return (
      <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-void px-4 py-10">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-scan h-1/3 w-full bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        </div>

        <div className="animate-float-up relative w-full max-w-lg rounded-3xl border border-border bg-card/50 p-6 shadow-soft backdrop-blur-xl sm:p-8">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-primary/80">
              Endless survival
            </p>
            <h1 className="mt-2 text-5xl font-black leading-none tracking-tight text-foreground text-glow sm:text-6xl">
              VOID <span className="bg-gradient-to-r from-primary to-accent-foreground/70 bg-clip-text text-transparent">ARENA</span>
            </h1>
            <div className="mt-4 flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
              <span className="rounded-full border border-border bg-background/40 px-3 py-1">
                Best <span className="text-amber">{best > 0 ? best : "—"}</span>
              </span>
              <button
                onClick={() => {
                  const next = !muted;
                  initAudio();
                  setMuted(next);
                  setMutedState(next);
                }}
                aria-label={muted ? "Unmute sound" : "Mute sound"}
                className="rounded-full border border-border bg-background/40 px-3 py-1 tracking-[0.25em] transition-colors hover:border-primary/60 hover:text-foreground"
              >
                {muted ? "🔇 Muted" : "🔊 Sound"}
              </button>
            </div>
          </div>

          <p className="mt-7 text-center text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">
            Choose operative
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
            {PLAYER_CHARACTERS.map((c) => {
              const stat = CHARACTERS[c.key];
              const active = character === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => {
                    playSfx("ui");
                    setCharacter(c.key);
                  }}
                  className={`group relative overflow-hidden rounded-2xl border p-2 text-center transition-all duration-200 ${
                    active
                      ? "border-primary bg-primary/10 shadow-glow"
                      : "border-border bg-background/30 hover:-translate-y-0.5 hover:border-primary/50"
                  }`}
                >
                  <div
                    role="img"
                    aria-label={`${stat.name} operative`}
                    className="mx-auto h-16 w-12 transition-transform duration-200 group-hover:scale-110"
                    style={{
                      backgroundImage: `url(${c.portrait})`,
                      backgroundSize: `${c.frames * 100}% 100%`,
                      backgroundPosition: "0% 50%",
                      backgroundRepeat: "no-repeat",
                      imageRendering: "pixelated",
                    }}
                  />
                  <p
                    className={`mt-1 text-[11px] font-black uppercase tracking-wider ${active ? "text-primary" : "text-foreground"}`}
                  >
                    {stat.name}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-background/40 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-lg font-black uppercase tracking-wide text-foreground">
                {sel.name}
              </p>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: selWeapon.color }}>
                {selWeapon.name}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{sel.blurb}</p>
            <div className="mt-3 space-y-2">
              {[
                { label: "Health", value: sel.hp / 150, text: String(sel.hp) },
                { label: "Speed", value: sel.speed / 340, text: String(sel.speed) },
                { label: "Damage", value: sel.damage / 2, text: `×${sel.damage}` },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-16 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {row.label}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-amber transition-[width] duration-300"
                      style={{ width: `${Math.min(100, row.value * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-[11px] font-bold tabular-nums text-foreground">
                    {row.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            disabled={!ready}
            onClick={() => {
              initAudio();
              playSfx("ui");
              setHud(INITIAL_HUD);
              setRestartKey((k) => k + 1);
              setScreen("play");
            }}
            className="animate-pulse-glow mt-6 w-full rounded-2xl bg-gradient-to-r from-primary to-accent py-4 text-lg font-black uppercase tracking-[0.3em] text-primary-foreground transition-transform duration-200 hover:scale-[1.02] disabled:animate-none disabled:opacity-50"
          >
            {ready ? "Play" : "Loading…"}
          </button>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
            Move to survive · the gun auto-tracks in close · hold fire to aim yourself for{" "}
            <span className="font-bold text-amber">+35% damage</span>
          </p>
        </div>
      </main>
    );
  }




  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-void p-2 sm:p-4">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />

      <h1 className="sr-only">Void Arena — 2D top-down arena shooter</h1>

      <div
        className="relative w-full max-w-[1280px]"
        style={{ aspectRatio: `${WORLD_W} / ${WORLD_H}` }}
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full rounded-xl border border-border shadow-2xl"
          style={{ cursor: "default", imageRendering: "pixelated", touchAction: "none" }}
          aria-label="Game arena"
        />

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="w-40 sm:w-64">
              <div className="h-3 w-full overflow-hidden rounded-full border border-border bg-card/70 backdrop-blur">
                <div
                  className="h-full rounded-full bg-destructive transition-[width] duration-150"
                  style={{ width: `${hpPct}%` }}
                />
              </div>
              <p className="mt-1 text-xs font-semibold tracking-wide text-muted-foreground">
                HP {Math.ceil(hud.hp)} / {hud.maxHp}
              </p>
              <p className="mt-1 text-xs font-bold" style={{ color: weapon.color }}>
                {weapon.name}
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-border bg-card/70 backdrop-blur">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-150"
                  style={{ width: `${Math.min(100, (hud.xp / hud.xpToNext) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] font-semibold tracking-wide text-muted-foreground">
                LVL {hud.level} · {Math.floor(hud.xp)}/{hud.xpToNext} XP
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Wave {hud.wave}
              </p>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {Math.ceil(hud.waveTimer)}
              </p>
              <p className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                {hud.enemies} ENEMIES
              </p>
              <p className="mt-1 text-xs font-semibold tabular-nums text-foreground/80">
                ECHO IN {String(Math.ceil(hud.echoTimer)).padStart(2, "0")}
                {hud.echoes > 0 && <span className="ml-2 text-muted-foreground">×{hud.echoes}</span>}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Score
              </p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{hud.score}</p>
              <div className="pointer-events-auto mt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    const next = !muted;
                    initAudio();
                    setMuted(next);
                    setMutedState(next);
                  }}
                  aria-label={muted ? "Unmute sound" : "Mute sound"}
                  className="rounded-md border border-border bg-card/70 px-2 py-1 text-xs font-semibold text-foreground backdrop-blur transition-colors hover:bg-accent"
                >
                  {muted ? "🔇" : "🔊"}
                </button>
                <button
                  onClick={() => {
                    const st = stateRef.current;
                    if (!st.over && st.pendingUpgrades.length === 0) st.paused = !st.paused;
                  }}
                  aria-label="Pause game"
                  className="rounded-md border border-border bg-card/70 px-2 py-1 text-xs font-semibold text-foreground backdrop-blur transition-colors hover:bg-accent"
                >
                  ⏸
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {touch
              ? "Left stick moves · Auto-fire covers close range · Right stick = focus fire, +35% damage"
              : "WASD move · Auto-fire covers close range · Hold left click = focus fire, +35% damage · Esc to pause"}
          </p>
        </div>

        {touch && !hud.over && hud.offers.length === 0 && (
          <>
            <Stick
              side="left"
              onChange={(dx, dy) => {
                const inp = inputRef.current;
                inp.moveX = dx;
                inp.moveY = dy;
              }}
              onEnd={() => {
                const inp = inputRef.current;
                inp.moveX = 0;
                inp.moveY = 0;
              }}
            />
            <Stick
              side="right"
              onChange={(dx, dy) => {
                const inp = inputRef.current;
                inp.aimX = dx;
                inp.aimY = dy;
              }}
              onEnd={() => {
                const inp = inputRef.current;
                inp.aimX = 0;
                inp.aimY = 0;
              }}
            />
          </>
        )}

        {hud.offers.length > 0 && !hud.over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-xl bg-background/90 p-4 backdrop-blur">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
                Level {hud.level}
              </p>
              <h2 className="text-3xl font-black text-foreground">Choose an upgrade</h2>
            </div>
            <div className="pointer-events-auto grid w-full max-w-3xl gap-3 sm:grid-cols-3">
              {hud.offers.map((id) => {
                const u = UPGRADE_MAP[id];
                if (!u) return null;
                const col = RARITY_COLOR[u.rarity];
                const stacks = stateRef.current.takenUpgrades[id] ?? 0;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      applyUpgrade(stateRef.current, id);
                      setHud((h) => ({ ...h, offers: [], paused: false }));
                    }}
                    className="rounded-xl border bg-card/80 p-4 text-left transition-transform hover:scale-[1.03]"
                    style={{ borderColor: col, boxShadow: `0 0 30px -14px ${col}` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl" style={{ color: col }}>
                        {u.icon}
                      </span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-[0.2em]"
                        style={{ color: col }}
                      >
                        {u.rarity}
                      </span>
                    </div>
                    <p className="mt-2 text-base font-bold text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.desc}</p>
                    {stacks > 0 && (
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        owned ×{stacks}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {hud.paused && hud.offers.length === 0 && !hud.over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/85 backdrop-blur">
            <h2 className="text-3xl font-black text-foreground">Paused</h2>
            <p className="text-sm text-muted-foreground">
              Wave {hud.wave} · Level {hud.level} · {hud.kills} kills
            </p>
            <p className="text-xs text-muted-foreground">Press Esc or P to resume</p>
          </div>
        )}

        {hud.over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-xl bg-background/85 backdrop-blur">
            <h2 className="text-4xl font-bold text-foreground">You died</h2>
            <p className="text-muted-foreground">
              Wave {hud.wave} · Score {hud.score} · Level {hud.level}
            </p>
            <p className="text-sm text-muted-foreground">
              {hud.kills} kills · {Math.floor(hud.time)}s survived
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRestartKey((k) => k + 1)}
                className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Play again
              </button>
              <button
                onClick={() => setScreen("menu")}
                className="rounded-md border border-border px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Main menu
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
