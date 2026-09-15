import { test, expect } from "vitest";
import { getSquareFromIndex, getSquareIndex } from "./chess";

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
