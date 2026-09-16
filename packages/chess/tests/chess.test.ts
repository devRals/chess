import { test, expect, describe } from "vitest";
import {
  ALL_SQUARES,
  ALL_SQUARES_PGN,
  bitboardToSquares,
  getSquareFromIndex,
  getSquareIndex,
  type Square,
  type BitBoard,
  RANK,
  FILE,
} from "../src/index";

test("squareIndex from type `Square`", () => {
  expect(getSquareIndex("a1")).toBe(0);
  expect(getSquareIndex("b1")).toBe(1);
  expect(getSquareIndex("d1")).toBe(3);
  expect(getSquareIndex("a2")).toBe(8);
  expect(getSquareIndex("a3")).toBe(16);
  expect(getSquareIndex("c6")).toBe(42);
  expect(getSquareIndex("h8")).toBe(63);
  expect(getSquareIndex("h1")).toBe(7);
  expect(getSquareIndex("e4")).toBe(28);
});

test("square from squareIndex", () => {
  expect(getSquareFromIndex(0)).toBe("a1");
  expect(getSquareFromIndex(1)).toBe("b1");
  expect(getSquareFromIndex(3)).toBe("d1");
  expect(getSquareFromIndex(8)).toBe("a2");
  expect(getSquareFromIndex(16)).toBe("a3");
  expect(getSquareFromIndex(42)).toBe("c6");
  expect(getSquareFromIndex(63)).toBe("h8");
  expect(getSquareFromIndex(7)).toBe("h1");
  expect(getSquareFromIndex(28)).toBe("e4");
});

// prettier-ignore
test("BitBoard to Square[]", () => {
  const allSquares = Object.fromEntries(
    ALL_SQUARES_PGN.map(s => [s, 1n << BigInt(getSquareIndex(s))])
  ) as Record<Square, BitBoard>

  const {h3, f2, a1, c8, d2} = allSquares

  expect(bitboardToSquares(0x0n)).toStrictEqual([]);
  expect(bitboardToSquares(ALL_SQUARES)).toStrictEqual(ALL_SQUARES_PGN);
  expect(bitboardToSquares(a1)).toStrictEqual(["a1"])
  // Should come out sorted
  expect(bitboardToSquares(h3 | f2 | a1)).toStrictEqual(["a1", "f2", "h3"])
  expect(bitboardToSquares(c8 | d2)).toStrictEqual(["c8", "d2"])
  expect(bitboardToSquares(RANK[2])).toStrictEqual(["a2", "b2", "c2", "d2", "e2", "f2", "g2", "h2"])
  expect(bitboardToSquares(FILE.F)).toStrictEqual(["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"])
});

describe("Chess class", () => {
  // Ugh... I'm lazy c:
});
