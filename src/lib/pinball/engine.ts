import Matter from "matter-js";
import {
  BALL_MASS,
  BALL_RADIUS,
  BUMPER_KICK,
  COMBO_WINDOW_MS,
  DRAIN_Y,
  FLIPPER,
  GRAVITY,
  LANE_DIVIDER_TOP,
  LANE_DIVIDER_X,
  LAUNCH_X,
  LAUNCH_Y,
  launchVelocityForStrength,
  MAX_BALL_SPEED,
  MULTIBALL_EXTRA_BALLS,
  NUDGE_IMPULSE_J,
  PLUNGER,
  plungerStrength,
  RANDOM_EVENT_CHANCE_PER_STEP,
  RANDOM_EVENT_MIN_INTERVAL_MS,
  STARTING_BALLS,
  SLING_KICK,
  TABLE_WIDTH,
  WALL_THICKNESS,
  levelForScore,
  type LevelConfig,
} from "./config";
import { awardScore, createScoringState, creditPoints, grantAchievementMultiplier, resetCombo, type ScoreAward, type ScoringState } from "./scoring";
import { MissionManager, type MissionDef, type MissionManagerState } from "./missions";
import { JackpotManager, type JackpotState } from "./jackpot";
import { TiltManager, type TiltState } from "./tilt";
import { RandomEventManager, type RandomEventId } from "./random-events";
import { defaultRng, type RandomSource } from "./rng";

const { Engine, World, Bodies, Body, Composite, Constraint, Events, Vector } = Matter;

export type GamePhase = "ready" | "countdown" | "playing" | "paused" | "ball-lost" | "level-complete" | "game-over" | "stuck";
export type NudgeDirection = "left" | "right" | "up";

export interface BallSnapshot {
  id: number;
  x: number;
  y: number;
  angle: number;
  radius: number;
  vx: number;
  vy: number;
}

export interface BodySnapshot {
  id: number;
  label: string;
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  radius?: number;
  flashUntil: number;
  vertices: { x: number; y: number }[];
  index?: number;
}

export interface PinballEvents {
  onScore?: (award: ScoreAward, totalScore: number) => void;
  onPhaseChange?: (phase: GamePhase) => void;
  onBallsChange?: (ballsRemaining: number, ballNumber: number) => void;
  onLaunch?: (strength: number) => void;
  onComboExpired?: () => void;
  onLevelChange?: (level: LevelConfig) => void;
  onTargetSequence?: (completed: number, total: number) => void;
  onBodyHit?: (bodyId: number, label: string) => void;
  onImpact?: (speed: number) => void;
  onMissionChange?: (mission: MissionDef, state: MissionManagerState) => void;
  onMissionComplete?: (mission: MissionDef, totalScore: number) => void;
  onJackpotChange?: (state: JackpotState) => void;
  onTiltChange?: (state: TiltState) => void;
  onRandomEvent?: (id: RandomEventId, phase: "start" | "end") => void;
}

const STAND_UP_TARGET_COUNT = 5;
export const FIXED_TIMESTEP_MS = 1000 / 120;
const MAX_SUBSTEPS_PER_FRAME = 12;
const LAUNCH_STEPS = 4;
const LAUNCH_WEIGHTS = [0.15, 0.35, 0.35, 0.15];
const BALL_CATEGORY = 0x0002;
const STUCK_AFTER_MS = 4500;
const STUCK_DISTANCE = 5;
const STUCK_MAX_SPEED = 0.75;
type Pose = { x: number; y: number; angle: number };
const DIFFICULTY_FACTOR: Record<LevelConfig["tier"], number> = {
  rookie: 0.9,
  "bumper-masters": 1,
  legend: 1.15,
};

const SPEED_RUSH_GRAVITY_MULTIPLIER = 1.25;
const TARGET_RUSH_DIFFICULTY_MULTIPLIER = 2;
const JACKPOT_BUMPER_INDEX = 2; // the lone lower-center bumper doubles as the jackpot collect target

export class PinballEngine {
  readonly engine: Matter.Engine;
  readonly scoring: ScoringState = createScoringState();
  readonly missions: MissionManager;
  readonly jackpot = new JackpotManager((state) => this.events.onJackpotChange?.(state));
  readonly tilt: TiltManager;
  readonly randomEvents: RandomEventManager;

  // The plunger-controlled ball sitting in the lane, plus any extra balls a multiball event
  // spawned directly onto the field. Both share the Matter body label "ball" for collision
  // purposes; only laneBall interacts with the plunger.
  private laneBall: Matter.Body | null = null;
  private extraBalls = new Set<Matter.Body>();
  // True once the resting lane ball has been given launch velocity — distinguishes "sitting in
  // the lane, ready" from "already in play" so the plunger can't be charged again mid-flight.
  private ballLaunched = false;
  private laneCleared = false;
  // Assigned by populate(), called right after construction — see its comment for why body
  // creation isn't done in the constructor.
  private leftFlipper!: Matter.Body;
  private rightFlipper!: Matter.Body;
  private flipperParts: (Matter.Body | Matter.Constraint)[] = [];
  private flashes = new Map<number, number>();
  private targetHits = new Set<number>();
  private targetSequenceCount = 0;
  private targetRushUntil = 0;
  private speedRushActive = false;
  private time = 0;
  private nextBallAt = 0;
  private nextMissionAt = 0;
  private launchStep = LAUNCH_STEPS;
  private launchSpeed = 0;
  private launchedAt = -Infinity;
  private previousPoses = new Map<number, Pose>();
  private stallOrigins = new Map<number, Matter.Vector>();
  private stallStartedAt = 0;
  private kicks: { ball: Matter.Body; normal: Matter.Vector; speed: number }[] = [];

  private ballsRemaining = STARTING_BALLS;
  private ballNumber = 1;
  private phase: GamePhase = "ready";
  private level: LevelConfig = levelForScore(0);
  private plungerCharging = false;
  private plungerChargeStart = 0;
  private running = false;
  private rafId: number | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private events: PinballEvents;
  private leftHeld = false;
  private rightHeld = false;
  private rng: RandomSource;

  constructor(events: PinballEvents = {}, rng: RandomSource = defaultRng) {
    this.events = events;
    this.rng = rng;
    this.engine = Engine.create();
    this.engine.gravity.y = GRAVITY;

    this.missions = new MissionManager(
      3,
      (mission, state) => this.events.onMissionChange?.(mission, state),
      (mission) => this.completeMission(mission),
    );
    this.tilt = new TiltManager((state) => this.handleTiltChange(state));
    this.randomEvents = new RandomEventManager(
      this.rng,
      RANDOM_EVENT_MIN_INTERVAL_MS,
      RANDOM_EVENT_CHANCE_PER_STEP,
      (id) => this.applyRandomEvent(id),
      (id) => this.revertRandomEvent(id),
    );

    Events.on(this.engine, "collisionStart", (event) => this.handleCollisions(event));
    Events.on(this.engine, "beforeUpdate", () => this.clampFlippers());
  }

  /** Builds and adds every table body to the world. Kept separate from the constructor (and
   * re-callable) because React 18 Strict Mode mounts, cleans up, then re-mounts effects in dev —
   * our cleanup effect calls destroy(), which clears the Matter world, so setup must be able to
   * run again on the simulated remount for the table to actually appear. */
  populate() {
    const world = this.engine.world;
    World.add(world, this.buildWalls());
    World.add(world, this.buildBumpers());
    World.add(world, this.buildSlingshots());
    World.add(world, this.buildTargets());
    World.add(world, this.buildRamps());

    World.add(world, this.buildPlunger());

    this.resetFlippers();
  }

  private resetFlippers() {
    const world = this.engine.world;
    World.remove(world, this.flipperParts);
    const { body: leftFlipper, constraint: leftConstraint } = this.buildFlipper("left");
    const { body: rightFlipper, constraint: rightConstraint } = this.buildFlipper("right");
    this.leftFlipper = leftFlipper;
    this.rightFlipper = rightFlipper;
    this.flipperParts = [leftFlipper, leftConstraint, rightFlipper, rightConstraint];
    World.add(world, this.flipperParts);
  }

  private buildWalls(): Matter.Body[] {
    const t = WALL_THICKNESS;
    const opts = { isStatic: true, label: "wall", restitution: 0.3, friction: 0.05 };
    const rail = (points: number[][], thickness: number, label = "wall") => points.slice(1).map(([x, y], index) => {
      const [fromX, fromY] = points[index];
      return Bodies.rectangle((x + fromX) / 2, (y + fromY) / 2,
        Math.hypot(x - fromX, y - fromY) + thickness, thickness, {
          ...opts, label, angle: Math.atan2(y - fromY, x - fromX),
        });
    });
    return [
      ...rail([[11, 806], [11, 145], [16, 100], [34, 64], [64, 38], [105, 23],
        [160, 15], [310, 15], [365, 23], [408, 42], [438, 70], [459, 104], [471, 147], [471, 806]], t),
      ...rail([[LANE_DIVIDER_X, LANE_DIVIDER_TOP], [LANE_DIVIDER_X, 810]], 11, "lane-rail"),
      ...rail([[58, 640], [136, 696]], 11, "guide"),
      ...rail([[373, 640], [296, 696]], 11, "guide"),
      ...rail([[18, 759], [112, 788]], 14, "apron-rail"),
      ...rail([[415, 759], [327, 788]], 14, "apron-rail"),
      ...[80, 354].map((x) => Bodies.circle(x, 458, 8, { ...opts, label: "post" })),
      ...[[96, 374], [337, 374], [175, 465], [257, 465]].map(([x, y]) =>
        Bodies.circle(x, y, 9, { ...opts, label: "deflector", restitution: 0.55, friction: 0.01 })),
    ];
  }

  /** Two scoring ramp-shot sensors (distinct from the plain lane rollovers) in the upper
   * corners, each tracked by index for Mission 02 — Ramp Runner. */
  private buildRamps(): Matter.Body[] {
    return [
      Bodies.rectangle(51, 163, 22, 52, { isStatic: true, isSensor: true, label: "ramp", angle: 0.17, plugin: { rampIndex: 0 } }),
      Bodies.rectangle(393, 163, 22, 52, { isStatic: true, isSensor: true, label: "ramp", angle: -0.17, plugin: { rampIndex: 1 } }),
    ];
  }

  private buildBumpers(): Matter.Body[] {
    const positions: Array<[number, number]> = [
      [137, 232],
      [301, 232],
      [219, 316],
    ];
    return positions.map(([x, y], index) =>
      Bodies.circle(x, y, 26, {
        isStatic: true,
        label: "bumper",
        restitution: 0.65,
        friction: 0,
        id: Matter.Common.nextId(),
        plugin: { bumperIndex: index },
      }),
    );
  }

  private buildSlingshots(): Matter.Body[] {
    const opts = { isStatic: true, label: "slingshot", restitution: 0.65, friction: 0.05 };
    const left = [{ x: 54, y: 517 }, { x: 145, y: 619 }, { x: 54, y: 606 }];
    const right = left.map(({ x, y }) => ({ x: 432 - x, y })).reverse();
    return [
      Bodies.fromVertices(84.33, 580.67, [left], opts),
      Bodies.fromVertices(347.67, 580.67, [right], opts),
    ];
  }

  private buildTargets(): Matter.Body[] {
    const targets: Matter.Body[] = [];
    const spacing = 53;
    for (let i = 0; i < STAND_UP_TARGET_COUNT; i++) {
      targets.push(
        Bodies.rectangle(112 + i * spacing, 125 - Math.sin(i * Math.PI / 4) * 20, 35, 13, {
          isStatic: true,
          label: "target",
          restitution: 0.6,
          friction: 0.1,
          plugin: { targetIndex: i },
        }),
      );
    }
    // Lane rollovers either side, near the top.
    targets.push(
      Bodies.rectangle(102, 74, 38, 17, { isStatic: true, isSensor: true, label: "rollover", plugin: { targetIndex: 0 } }),
      Bodies.rectangle(337, 74, 38, 17, { isStatic: true, isSensor: true, label: "rollover", plugin: { targetIndex: 1 } }),
    );
    return targets;
  }

  private buildPlunger(): Matter.Body {
    return Bodies.rectangle(LAUNCH_X, LAUNCH_Y + 17, 23, 14, {
      isStatic: true,
      label: "plunger",
      restitution: 0.1,
      friction: 0,
    });
  }

  private buildFlipper(side: "left" | "right") {
    const y = 704;
    const pivotX = side === "left" ? 132 : 300;
    const sign = side === "left" ? 1 : -1;
    const angle = sign * FLIPPER.restAngleDeg * Math.PI / 180;
    const lever = Vector.rotate({ x: sign * (FLIPPER.width / 2 - 9), y: 0 }, angle);
    const body = Bodies.rectangle(pivotX + lever.x, y + lever.y, FLIPPER.width, FLIPPER.height, {
      label: `flipper-${side}`,
      collisionFilter: { mask: BALL_CATEGORY },
      density: 0.02,
      friction: 0.1,
      restitution: 0.4,
      angle,
      chamfer: { radius: 8 },
    });
    const constraint = Constraint.create({
      pointA: { x: pivotX, y },
      bodyB: body,
      pointB: Vector.neg(lever),
      stiffness: 1,
      length: 0,
    });
    return { body, constraint };
  }

  private clampFlippers() {
    // Tilted: flippers go — and stay — limp at rest, regardless of what's held.
    const disabled = this.tilt.state === "tilted";
    for (const side of ["left", "right"] as const) {
      const body = side === "left" ? this.leftFlipper : this.rightFlipper;
      const held = !disabled && (side === "left" ? this.leftHeld : this.rightHeld);
      const sign = side === "left" ? 1 : -1;
      const restAngle = (sign * FLIPPER.restAngleDeg * Math.PI) / 180;
      const activeAngle = (sign * FLIPPER.activeAngleDeg * Math.PI) / 180;
      const target = held ? activeAngle : restAngle;
      const diff = target - body.angle;
      const speed = FLIPPER.angularSpeed * (held ? 1 : 0.72);
      Body.setAngularVelocity(body, Math.max(-speed, Math.min(speed, diff * 2)));
    }
  }

  private isBall(body: Matter.Body): boolean {
    return body.label === "ball";
  }

  private handleCollisions(event: Matter.IEventCollision<Matter.Engine>) {
    if (this.phase !== "playing") return;
    const now = this.time;
    const difficultyFactor = DIFFICULTY_FACTOR[this.level.tier];
    const tilted = this.tilt.state === "tilted";

    for (const pair of event.pairs) {
      const [a, b] = [pair.bodyA, pair.bodyB];
      const ballBody = this.isBall(a) ? a : this.isBall(b) ? b : null;
      const other = ballBody === a ? b : ballBody === b ? a : null;
      if (!ballBody || !other) continue;
      if (other.label === "wall" || other.label === "guide" || other.label === "lane-rail" || other.label.startsWith("flipper")) {
        const speed = Math.abs(Vector.dot(Body.getVelocity(ballBody), pair.collision.normal));
        if (speed >= 3) this.events.onImpact?.(speed);
      }

      // Tilted: the ball keeps moving under physics, but nothing it touches scores.
      if (tilted) continue;

      if (other.label === "bumper") {
        const consecutive = this.getFlashUntil(other.id) > now;
        this.queueKick(ballBody, other, BUMPER_KICK * this.level.liveliness);
        const award = awardScore(this.scoring, consecutive ? "bumperConsecutive" : "bumper", other.id, now, difficultyFactor);
        this.flash(other.id, now);
        if (award) {
          this.events.onScore?.(award, this.scoring.score);
          this.missions.recordCombo(award.comboHits);
        }
        const bumperIndex = (other.plugin as { bumperIndex?: number } | undefined)?.bumperIndex;
        if (typeof bumperIndex === "number") {
          this.missions.recordBumperHit(bumperIndex);
          if (bumperIndex === JACKPOT_BUMPER_INDEX && this.jackpot.collect(now)) {
            const jackpotAward = awardScore(this.scoring, this.scoring.comboHits >= 8 ? "superJackpot" : "jackpot", -3, now, difficultyFactor);
            if (jackpotAward) this.events.onScore?.(jackpotAward, this.scoring.score);
          }
        }
      } else if (other.label === "slingshot") {
        this.queueKick(ballBody, other, SLING_KICK * this.level.liveliness);
        const award = awardScore(this.scoring, "slingshot", other.id, now, difficultyFactor);
        this.flash(other.id, now);
        if (award) {
          this.events.onScore?.(award, this.scoring.score);
          this.missions.recordCombo(award.comboHits);
        }
      } else if (other.label === "target") {
        const targetRush = now < this.targetRushUntil;
        const award = awardScore(this.scoring, "standUpTarget", other.id, now, difficultyFactor * (targetRush ? TARGET_RUSH_DIFFICULTY_MULTIPLIER : 1));
        this.flash(other.id, now);
        if (award) {
          this.events.onScore?.(award, this.scoring.score);
          this.missions.recordCombo(award.comboHits);
          const index = (other.plugin as { targetIndex?: number } | undefined)?.targetIndex;
          if (typeof index === "number" && !this.targetHits.has(index)) {
            this.targetHits.add(index);
            this.events.onTargetSequence?.(this.targetHits.size, STAND_UP_TARGET_COUNT);
            if (this.targetHits.size === STAND_UP_TARGET_COUNT) {
              const bonus = awardScore(this.scoring, "targetSequence", -1, now, difficultyFactor);
              if (bonus) this.events.onScore?.(bonus, this.scoring.score);
              grantAchievementMultiplier(this.scoring, 2, 15000, now);
              this.targetHits.clear();
              this.targetSequenceCount += 1;
              this.missions.recordTargetSequenceComplete();
              if (this.targetSequenceCount >= 2 && this.jackpot.light(now)) {
                this.targetSequenceCount = 0;
              }
            }
          }
        }
      } else if (other.label === "rollover") {
        const skillShot = ballBody === this.laneBall && !this.laneCleared && other.plugin.targetIndex === 1;
        const award = awardScore(this.scoring, skillShot ? "skillShot" : "laneRollover", other.id, now, difficultyFactor);
        this.flash(other.id, now);
        if (award) this.events.onScore?.(award, this.scoring.score);
      } else if (other.label === "ramp") {
        const award = awardScore(this.scoring, "rampShot", other.id, now, difficultyFactor);
        this.flash(other.id, now);
        if (award) {
          this.events.onScore?.(award, this.scoring.score);
          this.missions.recordCombo(award.comboHits);
        }
        if (award) this.missions.recordRampShot();
      }

      if (other.label.startsWith("flipper") || other.label === "bumper" || other.label === "slingshot" || other.label === "target" || other.label === "ramp") {
        this.events.onBodyHit?.(other.id, other.label);
      }

      const newLevel = levelForScore(this.scoring.score);
      if (newLevel.level !== this.level.level) {
        this.level = newLevel;
        this.events.onLevelChange?.(newLevel);
      }
    }

    // Refresh the mission HUD's progress label after any event that might have advanced it
    // (a full state-change event already fires separately from MissionManager on start/complete).
    if (this.missions.state === "active") this.events.onMissionChange?.(this.missions.current(), this.missions.state);
  }

  private queueKick(ball: Matter.Body, part: Matter.Body, speed: number) {
    const normal = Vector.normalise(Vector.sub(ball.position, part.position));
    this.kicks.push({ ball, normal, speed });
  }

  private completeMission(mission: MissionDef) {
    creditPoints(this.scoring, mission.reward);
    this.events.onMissionComplete?.(mission, this.scoring.score);
    this.nextMissionAt = this.time + 1200;
  }

  private handleTiltChange(state: TiltState) {
    if (state === "tilted") {
      // Cancel active scoring bonuses — the house doesn't reward you for shaking the machine.
      resetCombo(this.scoring);
      this.scoring.achievementMultiplier = 1;
      this.scoring.multiplierExpiresAt = null;
    }
    this.events.onTiltChange?.(state);
  }

  private flash(id: number, now: number) {
    this.flashes.set(id, now + 260);
  }

  getFlashUntil(id: number): number {
    return this.flashes.get(id) ?? 0;
  }

  setFlipper(side: "left" | "right", held: boolean) {
    if (side === "left") this.leftHeld = held;
    else this.rightHeld = held;
  }

  /** A physics nudge impulse (Δv = J/m) applied to every ball on the table. */
  nudge(direction: NudgeDirection) {
    const wasStuck = this.phase === "stuck";
    if ((this.phase !== "playing" && !wasStuck) || !this.ballLaunched || this.tilt.state === "tilted") return false;
    const now = this.time;
    this.tilt.registerNudge(now);
    for (const ball of this.allBalls()) {
      const deltaV = NUDGE_IMPULSE_J / ball.mass;
      const vector = direction === "left" ? { x: -deltaV, y: 0 } : direction === "right" ? { x: deltaV, y: 0 } : { x: 0, y: -deltaV * 0.6 };
      Body.setVelocity(ball, Vector.add(Body.getVelocity(ball), vector));
    }
    if (wasStuck) {
      this.stallOrigins.clear();
      this.setPhase("playing");
      this.start();
    }
    return true;
  }

  chargePlunger() {
    if (this.plungerCharging || this.phase !== "playing" || !this.laneBall || this.ballLaunched) return;
    this.plungerCharging = true;
    this.plungerChargeStart = this.time;
  }

  releasePlunger() {
    if (!this.plungerCharging || this.phase !== "playing" || !this.laneBall || this.ballLaunched) return;
    const strength = plungerStrength(this.time - this.plungerChargeStart);
    this.cancelPlunger();
    this.ballLaunched = true;
    Body.setStatic(this.laneBall, false);
    this.launchSpeed = launchVelocityForStrength(strength);
    this.launchStep = 0;
    this.launchedAt = this.time;
    this.events.onLaunch?.(strength);
  }

  cancelPlunger() {
    this.plungerCharging = false;
  }

  private allBalls(): Matter.Body[] {
    return this.laneBall ? [this.laneBall, ...this.extraBalls] : [...this.extraBalls];
  }

  /** Places a ball at rest in the plunger lane — called on Start and after every ball lost, so
   * the machine always shows a ball loaded and ready rather than an empty lane. */
  private spawnBall() {
    const ball = this.makeBall(LAUNCH_X, LAUNCH_Y);
    Body.setStatic(ball, true);
    this.laneBall = ball;
    this.ballLaunched = false;
    this.laneCleared = false;
    World.add(this.engine.world, ball);
  }

  private makeBall(x: number, y: number) {
    const ball = Bodies.circle(x, y, BALL_RADIUS, {
      label: "ball",
      collisionFilter: { category: BALL_CATEGORY },
      restitution: 0.55,
      friction: 0.02,
      frictionAir: 0.002,
    });
    Body.setMass(ball, BALL_MASS);
    return ball;
  }

  /** A multiball event drops extra balls straight onto the field (not through the plunger lane)
   * with a modest randomized trajectory, via this engine's own seeded RNG. */
  private spawnMultiballExtras(count: number) {
    for (let i = 0; i < count; i++) {
      const x = TABLE_WIDTH * 0.35 + this.rng() * TABLE_WIDTH * 0.3;
      const ball = this.makeBall(x, 174 - i * 30);
      this.extraBalls.add(ball);
      World.add(this.engine.world, ball);
      Body.setVelocity(ball, { x: (this.rng() - 0.5) * 6, y: 2 + this.rng() * 3 });
    }
  }

  resetGame(ballsRemaining: number) {
    this.stop();
    this.ballsRemaining = ballsRemaining;
    this.ballNumber = Math.min(STARTING_BALLS, STARTING_BALLS - ballsRemaining + 1);
    Object.assign(this.scoring, createScoringState());
    this.targetHits.clear();
    this.flashes.clear();
    this.previousPoses.clear();
    this.stallOrigins.clear();
    this.kicks.length = 0;
    this.time = 0;
    this.accumulator = 0;
    this.nextBallAt = 0;
    this.nextMissionAt = 0;
    this.launchStep = LAUNCH_STEPS;
    this.launchedAt = -Infinity;
    this.cancelPlunger();
    this.releaseFlippers();
    this.targetSequenceCount = 0;
    this.targetRushUntil = 0;
    this.level = levelForScore(0);
    this.missions.reset();
    this.jackpot.reset();
    this.tilt.reset();
    this.randomEvents.reset();
    if (this.speedRushActive) this.revertRandomEvent("speed-rush");
    for (const ball of this.allBalls()) World.remove(this.engine.world, ball);
    this.resetFlippers();
    this.laneBall = null;
    this.extraBalls.clear();
    this.events.onLevelChange?.(this.level);
    this.events.onBallsChange?.(this.ballsRemaining, this.ballNumber);
    this.setPhase("ready");
  }

  startGame(ballsRemaining = STARTING_BALLS) {
    if (ballsRemaining <= 0) return;
    this.resetGame(ballsRemaining);
    this.missions.start();
    this.spawnBall();
    this.setPhase("playing");
    this.start();
  }

  private setPhase(phase: GamePhase) {
    this.phase = phase;
    this.events.onPhaseChange?.(phase);
  }

  togglePause() {
    if (this.phase === "playing") {
      this.cancelPlunger();
      this.releaseFlippers();
      this.accumulator = 0;
      this.previousPoses.clear();
      this.setPhase("paused");
    }
    else if (this.phase === "paused") this.setPhase("playing");
  }

  releaseFlippers() {
    this.leftHeld = false;
    this.rightHeld = false;
  }

  /** Removes one drained ball from the world and from whichever collection it belonged to. A
   * "ball lost" (decrementing the player's ball count) only actually happens once every ball —
   * lane ball and any multiball extras — has drained; losing one of several balls during
   * multiball just continues play with the rest. */
  private handleBallDrain(ball: Matter.Body) {
    World.remove(this.engine.world, ball);
    if (this.laneBall === ball) this.laneBall = null;
    this.extraBalls.delete(ball);
    if (this.allBalls().length > 0) return;

    resetCombo(this.scoring);
    this.events.onComboExpired?.();
    this.ballsRemaining -= 1;

    if (this.ballsRemaining <= 0) {
      this.events.onBallsChange?.(0, this.ballNumber);
      this.setPhase("game-over");
      this.stop();
      return;
    }
    this.ballNumber += 1;
    this.events.onBallsChange?.(this.ballsRemaining, this.ballNumber);
    this.setPhase("ball-lost");
    this.tilt.reset();
    this.nextBallAt = this.time + 850;
  }

  private eligibleRandomEvents(): RandomEventId[] {
    const eligible: RandomEventId[] = ["double-score", "speed-rush", "target-rush"];
    if (this.extraBalls.size === 0) eligible.push("multiball");
    return eligible;
  }

  private applyRandomEvent(id: RandomEventId) {
    const now = this.time;
    switch (id) {
      case "multiball":
        this.spawnMultiballExtras(MULTIBALL_EXTRA_BALLS);
        break;
      case "double-score":
        grantAchievementMultiplier(this.scoring, 2, 15000, now);
        break;
      case "speed-rush":
        this.speedRushActive = true;
        this.engine.gravity.y = GRAVITY * SPEED_RUSH_GRAVITY_MULTIPLIER;
        break;
      case "target-rush":
        this.targetRushUntil = now + 10000;
        break;
    }
    this.events.onRandomEvent?.(id, "start");
  }

  private revertRandomEvent(id: RandomEventId) {
    if (id === "speed-rush") {
      this.speedRushActive = false;
      this.engine.gravity.y = GRAVITY;
    }
    this.events.onRandomEvent?.(id, "end");
  }

  /** One fixed-size physics step: advance Matter by exactly FIXED_TIMESTEP_MS, then enforce the
   * speed cap and bounds/drain checks against that step's result. Running this in a fixed-size
   * loop (see tick) — rather than feeding the simulation a variable frame delta — keeps gameplay
   * identical regardless of the display's refresh rate or any dropped frames. */
  private step() {
    this.time += FIXED_TIMESTEP_MS;
    if (this.phase === "ball-lost") {
      if (this.time >= this.nextBallAt) {
        this.spawnBall();
        this.setPhase("playing");
      }
      return;
    }

    const now = this.time;
    if (this.nextMissionAt && now >= this.nextMissionAt) {
      this.nextMissionAt = 0;
      this.missions.advance();
    }
    this.jackpot.tick(now);
    this.randomEvents.tick(now);
    if (this.ballLaunched && this.laneCleared) this.randomEvents.maybeTrigger(now, this.eligibleRandomEvents());
    if (this.scoring.comboHits > 0 && now - this.scoring.lastHitAt > COMBO_WINDOW_MS) {
      resetCombo(this.scoring);
      this.events.onComboExpired?.();
    }

    const balls = this.allBalls();
    this.previousPoses.clear();
    for (const body of [this.leftFlipper, this.rightFlipper, ...balls]) {
      this.previousPoses.set(body.id, { ...body.position, angle: body.angle });
    }
    if (this.laneBall && this.launchStep < LAUNCH_STEPS) {
      const velocity = Body.getVelocity(this.laneBall);
      velocity.y -= this.launchSpeed * LAUNCH_WEIGHTS[this.launchStep++];
      Body.setVelocity(this.laneBall, velocity);
    }
    for (const ball of balls) this.limitSpeed(ball);
    Engine.update(this.engine, FIXED_TIMESTEP_MS);
    // Powered rubber rings add their kick after Matter has resolved the passive contact.
    for (const { ball, normal, speed } of this.kicks) {
      const velocity = Body.getVelocity(ball);
      const inward = Math.max(0, -Vector.dot(velocity, normal));
      Body.setVelocity(ball, Vector.add(velocity, Vector.mult(normal, speed + inward)));
    }
    this.kicks.length = 0;

    for (const ball of balls) {
      this.limitSpeed(ball);
      const { x, y } = ball.position;
      if (ball === this.laneBall && this.ballLaunched && x < LANE_DIVIDER_X - BALL_RADIUS && y > 100) {
        this.laneCleared = true;
      }
      const returnedToShooter = x > LANE_DIVIDER_X && y > LAUNCH_Y - 22 && ball.velocity.y > 0 &&
        (ball !== this.laneBall || (this.ballLaunched && this.launchStep === LAUNCH_STEPS));
      if (returnedToShooter || y > DRAIN_Y || x < -40 || x > TABLE_WIDTH + 40 || y < -40) {
        this.handleBallDrain(ball);
      }
      if (this.phase !== "playing") return; // a drain may have ended the game or the ball
    }
    this.checkForStall(this.allBalls());
  }

  private checkForStall(balls: Matter.Body[]) {
    if (!this.ballLaunched || !balls.length || this.launchStep < LAUNCH_STEPS) return;
    const heldNearFlipper = (this.leftHeld || this.rightHeld) && balls.some((ball) => ball.position.y > 635);
    const moving = heldNearFlipper || balls.length !== this.stallOrigins.size || balls.some((ball) => {
      const origin = this.stallOrigins.get(ball.id);
      return !origin || Body.getSpeed(ball) > STUCK_MAX_SPEED ||
        Math.hypot(ball.position.x - origin.x, ball.position.y - origin.y) > STUCK_DISTANCE;
    });
    if (moving) {
      this.stallOrigins = new Map(balls.map((ball) => [ball.id, { ...ball.position }]));
      this.stallStartedAt = this.time;
    } else if (this.time - this.stallStartedAt >= STUCK_AFTER_MS) {
      this.previousPoses.clear();
      this.setPhase("stuck");
      this.stop();
    }
  }

  private limitSpeed(ball: Matter.Body) {
    if (!ball.isStatic && Body.getSpeed(ball) > MAX_BALL_SPEED) Body.setSpeed(ball, MAX_BALL_SPEED);
  }

  advance(frameDelta: number) {
    if (this.phase !== "playing" && this.phase !== "ball-lost") return;
    this.accumulator = Math.min(this.accumulator + frameDelta, FIXED_TIMESTEP_MS * MAX_SUBSTEPS_PER_FRAME);
    while (this.accumulator + 1e-6 >= FIXED_TIMESTEP_MS) {
      this.accumulator = Math.max(0, this.accumulator - FIXED_TIMESTEP_MS);
      this.step();
      if (this.getPhase() === "game-over" || this.getPhase() === "stuck") break;
    }
  }

  private tick = (time: number) => {
    if (!this.running) return;
    if (!document.hidden && this.lastTime) this.advance(time - this.lastTime);
    this.lastTime = time;
    if (this.running) this.rafId = requestAnimationFrame(this.tick);
  };

  private start() {
    if (this.running || typeof requestAnimationFrame === "undefined") return;
    this.running = true;
    this.lastTime = 0;
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stop() {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  destroy() {
    this.stop();
    World.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }

  private pose(body: Matter.Body, interpolate: boolean): Pose {
    const { x, y } = body.position;
    const previous = interpolate && this.previousPoses.get(body.id);
    if (!previous) return { x, y, angle: body.angle };
    const alpha = this.accumulator / FIXED_TIMESTEP_MS;
    return {
      x: previous.x + (x - previous.x) * alpha,
      y: previous.y + (y - previous.y) * alpha,
      angle: previous.angle + (body.angle - previous.angle) * alpha,
    };
  }

  snapshot(interpolate = false): { balls: BallSnapshot[]; bodies: BodySnapshot[]; time: number } {
    const bodies = Composite.allBodies(this.engine.world)
      .filter((body) => body.label !== "ball")
      .map<BodySnapshot>((body) => {
        const bounds = body.bounds;
        return {
          id: body.id,
          label: body.label,
          ...this.pose(body, interpolate),
          width: bounds.max.x - bounds.min.x,
          height: bounds.max.y - bounds.min.y,
          radius: body.circleRadius,
          flashUntil: this.flashes.get(body.id) ?? 0,
          vertices: body.vertices,
          index: body.plugin.targetIndex ?? body.plugin.bumperIndex,
        };
      });
    return {
      balls: this.allBalls().map((ball) => ({
        id: ball.id, ...this.pose(ball, interpolate), radius: BALL_RADIUS, vx: ball.velocity.x, vy: ball.velocity.y,
      })),
      bodies,
      time: this.time,
    };
  }

  getPhase() {
    return this.phase;
  }

  getLevel() {
    return this.level;
  }

  /** Registered after construction (from a React effect, not during render) so the engine never
   * invokes a handler synchronously while a component is still rendering. */
  setEvents(events: PinballEvents) {
    this.events = events;
  }

  getPlungerStrength(): number {
    return this.plungerCharging ? plungerStrength(this.time - this.plungerChargeStart) : PLUNGER.minStrength;
  }

  getPlungerTravel(): number {
    if (!this.plungerCharging) return 0;
    return Math.min(1, (this.time - this.plungerChargeStart) / PLUNGER.maxChargeMs) * this.getPlungerStrength();
  }

  getLaunchPulse() {
    return Math.max(0, 1 - (this.time - this.launchedAt) / 180);
  }

  isPlungerReady() {
    return this.phase === "playing" && this.laneBall !== null && !this.ballLaunched;
  }
}
