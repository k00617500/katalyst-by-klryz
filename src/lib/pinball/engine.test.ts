import assert from "node:assert/strict";
import test from "node:test";
import Matter from "matter-js";
import { restartDeadline } from "./restart";
import { BALL_RADIUS, COOLDOWN_MS, EARLY_RESTART_MS, LANE_DIVIDER_X, LAUNCH_Y, PLUNGER, plungerStrength, TABLE_WIDTH } from "./config";
import { FIXED_TIMESTEP_MS, PinballEngine, type PinballEvents } from "./engine";
import { createRng } from "./rng";

function table(events?: PinballEvents, rng = () => 0.99) {
  const engine = new PinballEngine(events, rng);
  engine.populate();
  engine.startGame();
  return engine;
}

function step(engine: PinballEngine, count: number) {
  for (let index = 0; index < count; index++) engine.advance(FIXED_TIMESTEP_MS);
}

function plunge(engine: PinballEngine, holdSteps = 0) {
  engine.chargePlunger();
  step(engine, holdSteps);
  engine.releasePlunger();
}

test("tap, minimum and full spring pulls all clear the shooter lane and drain inside the cabinet", () => {
  const holds = [0, 60, 140];
  const speeds: number[] = [];
  for (const hold of holds) {
    const engine = table();
    const start = engine.snapshot().balls[0];
    assert.equal(start.y, LAUNCH_Y);
    plunge(engine, hold);
    step(engine, 4);
    speeds.push(-engine.snapshot().balls[0].vy);
    let entered = false;
    for (let i = 0; i < 1500 && engine.getPhase() === "playing"; i++) {
      step(engine, 1);
      const ball = engine.snapshot().balls[0];
      if (!ball) continue;
      entered ||= ball.x < LANE_DIVIDER_X - BALL_RADIUS;
      assert.ok(ball.x >= BALL_RADIUS && ball.x <= TABLE_WIDTH - BALL_RADIUS && ball.y >= BALL_RADIUS);
    }
    assert.ok(entered, "the ball exits the shooter lane through the arch");
    assert.equal(engine.getPhase(), "ball-lost");
    engine.destroy();
  }
  assert.equal(plungerStrength(0), PLUNGER.minStrength);
  assert.equal(plungerStrength(PLUNGER.maxChargeMs), 1);
  assert.ok(speeds[0] < speeds[1] && speeds[1] < speeds[2]);
});

test("releasing during the power drop launches at the current meter strength", () => {
  const launches: number[] = [];
  const engine = table({ onLaunch: (strength) => launches.push(strength) });
  engine.chargePlunger();
  const releaseAt = PLUNGER.maxChargeMs + PLUNGER.fullHoldMs + PLUNGER.maxChargeMs / 2;
  step(engine, Math.round(releaseAt / FIXED_TIMESTEP_MS));
  const displayedStrength = engine.getPlungerStrength();
  assert.ok(displayedStrength > PLUNGER.minCycleStrength && displayedStrength < 1);
  engine.releasePlunger();
  assert.deepEqual(launches, [displayedStrength]);
  engine.destroy();
});

test("a powered flipper sends the same incoming ball back up the table", () => {
  const result = (held: boolean) => {
    const engine = table();
    plunge(engine);
    step(engine, 5);
    const ball = Matter.Composite.allBodies(engine.engine.world).find((body) => body.label === "ball")!;
    Matter.Body.setPosition(ball, { x: 177, y: 679 });
    Matter.Body.setVelocity(ball, { x: 0, y: 8 });
    engine.setFlipper("left", held);
    step(engine, 8);
    const speed = Matter.Body.getVelocity(ball).y;
    engine.destroy();
    return speed;
  };
  assert.ok(result(true) < result(false) - 10);
});

test("three plunges end the run and a paused table freezes the ball and score", () => {
  const launches: number[] = [];
  const remaining: number[] = [];
  const engine = table({ onLaunch: (strength) => launches.push(strength), onBallsChange: (balls) => remaining.push(balls) });
  for (let ball = 0; ball < 3; ball++) {
    plunge(engine);
    plunge(engine);
    step(engine, 9);
    const before = engine.snapshot();
    const score = engine.scoring.score;
    engine.togglePause();
    step(engine, 240);
    assert.deepEqual(engine.snapshot(), before);
    assert.equal(engine.scoring.score, score);
    engine.togglePause();
    for (let i = 0; i < 1500 && engine.getPhase() === "playing"; i++) step(engine, 1);
    if (ball < 2) step(engine, 110);
  }
  assert.deepEqual(launches, Array(3).fill(PLUNGER.minStrength));
  assert.deepEqual(remaining, [3, 2, 1, 0]);
  assert.equal(engine.getPhase(), "game-over");
  assert.ok(engine.scoring.score > 0);
  engine.startGame();
  assert.equal(engine.scoring.score, 0);
  assert.equal(engine.snapshot().balls.length, 1);
  assert.equal(remaining.at(-1), 3);
  engine.destroy();
});

test("a seed and the same inputs replay at different render rates", () => {
  const run = (ticksPerFrame: number) => {
    const engine = table(undefined, createRng(44));
    plunge(engine, 48);
    const samples = [];
    for (let interval = 0; interval < 10; interval++) {
      for (let frame = 0; frame < 48 / ticksPerFrame; frame++) {
        engine.advance(FIXED_TIMESTEP_MS * ticksPerFrame);
      }
      samples.push(engine.snapshot().balls.map(({ x, y, vx, vy }) => [x, y, vx, vy]));
    }
    const score = engine.scoring.score;
    engine.destroy();
    return { score, samples };
  };
  assert.deepEqual(run(1), run(4));
});

test("only a manual restart during the first minute sets a 30-second deadline", () => {
  const startedAt = 10_000;
  assert.equal(restartDeadline(startedAt, startedAt + 1_000), startedAt + 1_000 + COOLDOWN_MS);
  assert.equal(restartDeadline(startedAt, startedAt + EARLY_RESTART_MS - 1), startedAt + EARLY_RESTART_MS - 1 + COOLDOWN_MS);
  assert.equal(restartDeadline(startedAt, startedAt + EARLY_RESTART_MS), 0);
});

test("reset stops physics and leaves the table ready for three fresh balls", () => {
  const engine = table();
  plunge(engine);
  step(engine, 100);
  engine.resetGame(3);
  step(engine, 100);
  assert.equal(engine.getPhase(), "ready");
  assert.equal(engine.snapshot().balls.length, 0);
  assert.equal(engine.scoring.score, 0);
  engine.startGame();
  assert.equal(engine.isPlungerReady(), true);
  engine.destroy();
});

test("only a launched ball that stays trapped stops the table", () => {
  const engine = table();
  step(engine, 650);
  assert.equal(engine.getPhase(), "playing");
  assert.equal(engine.isPlungerReady(), true);

  plunge(engine);
  step(engine, 5);
  const ball = Matter.Composite.allBodies(engine.engine.world).find((body) => body.label === "ball")!;
  engine.engine.gravity.y = 0;
  Matter.Body.setPosition(ball, { x: 220, y: 430 });
  Matter.Body.setVelocity(ball, { x: 0, y: 0 });
  step(engine, 400);
  assert.equal(engine.getPhase(), "playing");
  step(engine, 170);
  assert.equal(engine.getPhase(), "stuck");
  assert.equal(engine.nudge("up"), true);
  assert.equal(engine.getPhase(), "playing");
  assert.ok(Matter.Body.getVelocity(ball).y < 0);
  engine.startGame();
  assert.equal(engine.isPlungerReady(), true);
  engine.destroy();
});
