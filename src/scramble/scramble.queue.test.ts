import type { Alg } from "cubing/alg";
import { beforeEach, expect, test, vi } from "vitest";
import type { EventId } from "../events";
import { createScrambleQueue } from "./scramble";

// Fake generator: tags each scramble with its event + a call counter, so a
// scramble can be traced to the event that requested it. (Event ids aren't
// valid cube notation, so a stand-in Alg is used — the queue only passes the
// value through, never inspects it.) Injecting the generator lets us test the
// pure queue logic without a real search or dynamic-import mocking.
const taggedAlg = (tag: string) => ({ toString: () => tag }) as unknown as Alg;

let counter = 0;
const generate = vi.fn((event: EventId) =>
  Promise.resolve(taggedAlg(`${event}-${counter++}`)),
);

beforeEach(() => {
  vi.clearAllMocks();
  counter = 0;
});

test("interleaved calls for different events never cross events", async () => {
  const q = createScrambleQueue(generate);
  const a333 = q.nextScramble("333");
  const a444 = q.nextScramble("444");
  const b333 = q.nextScramble("333");
  const b444 = q.nextScramble("444");
  expect((await a333).toString()).toMatch(/^333-/);
  expect((await a444).toString()).toMatch(/^444-/);
  expect((await b333).toString()).toMatch(/^333-/);
  expect((await b444).toString()).toMatch(/^444-/);
});

test("warmUp primes an event exactly once and only its own event", () => {
  const q = createScrambleQueue(generate);
  q.warmUp("333");
  q.warmUp("333");
  q.warmUp("333");
  expect(generate).toHaveBeenCalledTimes(1);
  expect(generate).toHaveBeenCalledWith("333");

  q.warmUp("444");
  expect(generate).toHaveBeenCalledTimes(2);
  expect(generate).toHaveBeenLastCalledWith("444");
});

test("the prefetched scramble after nextScramble(e) is for e and distinct", async () => {
  const q = createScrambleQueue(generate);
  const first = await q.nextScramble("444"); // empty queue → generate + re-queue
  const second = await q.nextScramble("444"); // consumes the re-queued 444
  expect(first.toString()).toMatch(/^444-/);
  expect(second.toString()).toMatch(/^444-/);
  expect(first.toString()).not.toBe(second.toString());
});

test("warmUp then nextScramble for the same event consumes the warmed scramble", async () => {
  const q = createScrambleQueue(generate);
  q.warmUp("222"); // generates 222-0
  const first = await q.nextScramble("222");
  expect(first.toString()).toBe("222-0"); // the warmed one, not a fresh generate
});
