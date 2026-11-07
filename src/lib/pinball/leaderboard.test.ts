import assert from "node:assert/strict";
import test from "node:test";
import type { PinballScoreRow } from "./leaderboard";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://pinball.invalid";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";

test("the leaderboard ranks every unique player by personal best with stable ties", async () => {
  const { topPlayers, recentScores } = await import("./leaderboard");
  const make = (username: string, score: number, day: number): PinballScoreRow => ({
    username, score, playedAt: new Date(Date.UTC(2026, 0, day)).toISOString(),
  });
  const best = make("a", 1500, 3);
  const older = make("B", 1500, 2);
  const rows = [make("A", 20, 4), make(" a ", 800, 1), best, older,
    ...Array.from({ length: 9 }, (_, index) => make(String(index), 500 - index, 5))];
  assert.deepEqual(topPlayers(rows).map((row) => row.username), ["B", "A", "0", "1", "2", "3", "4", "5", "6", "7", "8"]);
  assert.deepEqual(topPlayers(rows)[1], { ...best, username: "A" });
  assert.deepEqual(recentScores([best, make("A", 500, 8), older]), [best, older]);
});

test("a run is saved immediately and retries with the same ID after a failed write", async (t) => {
  const storage = new Map<string, string>();
  const fakeWindow = Object.assign(new EventTarget(), {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
  Object.defineProperty(globalThis, "window", { value: fakeWindow, configurable: true });
  t.after(() => { Reflect.deleteProperty(globalThis, "window"); });

  const sent: { id: string; score: number; ballsUsed: number }[] = [];
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(input, "/api/pinball/scores");
    sent.push(JSON.parse(String(init?.body)));
    return new Response(null, { status: sent.length === 1 ? 503 : 201 });
  });

  const { recordScore, getLocalScores, syncScores, SCORE_STORAGE_KEY } = await import("./leaderboard");
  recordScore({ deviceId: "follower-1", username: "Player 1", score: 1280, levelReached: 1, ballsUsed: 2 });
  assert.equal(getLocalScores()[0].score, 1280);
  await syncScores();
  assert.equal(JSON.parse(storage.get(SCORE_STORAGE_KEY)!)[0].pending, true);
  await syncScores();
  assert.equal(JSON.parse(storage.get(SCORE_STORAGE_KEY)!)[0].pending, false);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].id, sent[1].id);
  assert.equal(sent[1].ballsUsed, 2);
  recordScore({ deviceId: "follower-1", username: "player 1", score: 200, levelReached: 1, ballsUsed: 3 });
  assert.equal(getLocalScores().length, 1);
  assert.equal(sent.length, 2);
});

test("the score endpoint rejects non-followers before any score write", async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return Response.json([]);
  });
  const { POST } = await import("../../app/api/pinball/scores/route");
  const response = await POST(new Request("http://localhost/api/pinball/scores", {
    method: "POST",
    body: JSON.stringify({ id: crypto.randomUUID(), deviceId: crypto.randomUUID(), username: "Guest",
      score: 990, levelReached: 1, ballsUsed: 1, playedAt: new Date().toISOString() }),
  }));
  assert.equal(response.status, 403);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /\/followers\?/);
});
