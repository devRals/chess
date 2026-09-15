# Chess

A lightweight, dependency-free TypeScript chess board/state library built around [**64-bit bitboards**](https://chessprogramming.org/Bitboards).

The goal is to make chess state and move generation easy to embed in other projects, without forcing you to bring along a UI, chess notation parser, or game framework.

> **Status:** Work in progress. The current implementation provides board state, piece lookup, attack generation, legal move generation for individual pieces, captures, castling state, en passant state, promotion, check detection, and board reset.

## Features

- Type-safe chess coordinates such as `"e4"` and `"a1"`
- `bigint` bitboards for compact board representation
- Piece and color TypeScript types
- Piece lookup by square
- Attack generation for every piece type
- Legal move generation for pawns, knights, bishops, rooks, queens, and kings
- Castling support
- En passant support
- Pawn promotion
- Capture tracking
- Check detection
- Board reset
- No runtime dependencies

## Installation

If published to npm:

```bash
npm install @devrals/chess
```

Then import the library:

```ts
import { Chess } from "@devrals/chess";
```

If you're using the source directly:

```ts
import { Chess, type Square } from "./chess";
```

## Quick start

Create a board and inspect pieces:

```ts
import { Chess } from "@devrals/chess";

const chess = new Chess();

console.log(chess.turn);
// "white"

console.log(chess.getPieceAt("e1"));
// { type: "king", color: "white" }

console.log(chess.getPieceAt("e4"));
// undefined
```

Make a move:

```ts
chess.move("e2", "e4");

console.log(chess.turn);
// "black"

console.log(chess.getPieceAt("e4"));
// { type: "pawn", color: "white" }
```

Check whether a square has legal moves:

```ts
const moves = chess.getLegalMovesFor("g1");

console.log(moves);
```

Move results are returned as a **bitboard**, not as an array of squares. Use `getSquareFromIndex()` to convert individual set bits back into chess coordinates.

## Coordinates

Squares use standard chess coordinates:

```ts
type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";

type Square = `${File}${Rank}`;
```

Examples:

```ts
const square: Square = "e4";
```

Convert a square to its bitboard index:

```ts
import { getSquareIndex } from "<package-name>";

getSquareIndex("a1"); // 0
getSquareIndex("h1"); // 7
getSquareIndex("a8"); // 56
getSquareIndex("h8"); // 63
```

Convert an index back to a square:

```ts
import { getSquareFromIndex } from "<package-name>";

getSquareFromIndex(0); // "a1"
getSquareFromIndex(63); // "h8"
```

The board is indexed from `a1 = 0` through `h8 = 63`.

## Pieces

Pieces are represented by:

```ts
export type ChessColor = "black" | "white";

export type PieceType =
  | "pawn"
  | "knight"
  | "bishop"
  | "rook"
  | "queen"
  | "king";

export interface Piece {
  type: PieceType;
  color: ChessColor;
}
```

For APIs that need a piece and its square:

```ts
export type PieceWithPosition = Piece & {
  position: Square;
};
```

## Bitboards

The library represents board positions using JavaScript `bigint` values:

```ts
export type BitBoard = bigint;
```

Each of the 64 bits represents one square on the board.

For example:

```ts
const a1 = 1n << BigInt(getSquareIndex("a1"));
```

The `Chess` instance keeps a separate bitboard for each piece type and color.

You can access the underlying board representation through:

```ts
chess.bitboards;
```

For example:

```ts
chess.bitboards.white.pawn;
chess.bitboards.black.knight;
chess.bitboards.white.king;
```

There are also convenient aggregate bitboards:

```ts
chess.whitePieces;
chess.blackPieces;
chess.occupied;
```

All of these values are `bigint`s.

## Move generation

### Legal moves

Get the legal destinations for a piece:

```ts
const moves = chess.getLegalMovesFor("e2");
```

The result is a `BitBoard`.

The method automatically determines which piece occupies the square and dispatches to the appropriate move generator.

Piece-specific methods are also available:

```ts
chess.getLegalPawnMoves(squareIndex, color);
chess.getLegalKnightMoves(squareIndex, color);
chess.getLegalBishopMoves(squareIndex, color);
chess.getLegalRookMoves(squareIndex, color);
chess.getLegalQueenMoves(squareIndex, color);
chess.getLegalKingMoves(squareIndex, color);
```

### Attacks

You can also ask which squares a piece attacks:

```ts
const attacks = chess.getAttacksFor("e4");
```

Or get all squares attacked by a color:

```ts
const whiteAttacks = chess.getAttackedSquaresFor("white");
```

Piece-specific attack methods are available as well:

```ts
chess.getPawnAttacks(squareIndex, color);
chess.getKnightAttacks(squareIndex, color);
chess.getBishopAttacks(squareIndex, color);
chess.getRookAttacks(squareIndex, color);
chess.getQueenAttacks(squareIndex, color);
chess.getKingAttacks(squareIndex, color);
```

For a production engine, you may eventually want a more optimized bit-scanning helper, but this is a simple and readable starting point.

## Making moves

Use:

```ts
chess.move("e2", "e4");
```

`move()` updates the board and toggles the turn.

It also handles:

- normal moves
- captures
- two-square pawn moves
- en passant state
- en passant captures
- castling rook movement
- king movement state
- rook movement state

If the source square does not contain a piece, `move()` throws an `Error`.

```ts
chess.move("e4", "e5");
```

The current implementation does not itself enforce that the requested move is one of the generated legal moves. If you're building a public-facing game API, validate the destination against `getLegalMovesFor()` before calling `move()`.

For example:

```ts
const from = "e2";
const to = "e4";

const legalMoves = chess.getLegalMovesFor(from);
const destination = 1n << BigInt(getSquareIndex(to));

if ((legalMoves & destination) !== 0n) {
  chess.move(from, to);
}
```

## Captures

Captures are handled automatically by `move()` when the destination contains an opponent piece.

Captured pieces are counted in:

```ts
chess.captures;
```

For example:

```ts
console.log(chess.captures.white.pawn);
console.log(chess.captures.black.knight);
```

The capture table is organized by the color of the player who made the capture and the type of piece captured.

You can also call:

```ts
chess.capture("e5", piece);
```

directly, although normal game code will generally want to use `move()` instead.

## En passant

After a pawn moves two squares, the destination square becomes the en passant target:

```ts
chess.move("e2", "e4");

console.log(chess.enPassantTarget);
// "e4"
```

The following move can then include the appropriate en passant capture when legal.

After another kind of move, the en passant target is cleared.

## Castling

King move generation includes castling destinations when the relevant castling state allows it and the squares between the king and rook are empty.

King-side castling:

```ts
chess.move("e1", "g1");
```

Queen-side castling:

```ts
chess.move("e1", "c1");
```

When castling, the corresponding rook is moved automatically:

```text
White king-side:

e1 -> g1
h1 -> f1
```

The class tracks:

```ts
chess.moveFlags;
```

for king movement, rook movement, and whether a side has castled.

## Promotion

Promotion is handled separately with:

```ts
chess.promote(to, pieceToPromote, targetSquare);
```

Available promotion pieces are:

```ts
type PromotionPieceType = "queen" | "rook" | "bishop" | "knight";
```

Example:

```ts
const pawn = chess.getPieceAt("e7");

if (pawn) {
  chess.promote(
    "queen",
    {
      ...pawn,
      position: "e7",
    },
    "e8",
  );
}
```

`promote()` removes the pawn, places the selected piece on the target square, handles a capture on the target square, clears the en passant target, and toggles the turn.

## Check detection

Check whether a color's king is currently attacked:

```ts
if (chess.inCheck("white")) {
  console.log("White is in check");
}
```

The method is:

```ts
chess.inCheck(color);
```

and returns a boolean.

## Resetting the board

Reset the game to the initial position:

```ts
chess.reset();
```

This restores:

- the starting piece placement
- white's turn
- castling/rook/king movement state
- en passant state
- capture counters

## Board constants

The library exposes rank and file bitboards:

```ts
import { RANK, FILE } from "<package-name>";
```

For example:

```ts
RANK[1];
RANK[8];

FILE.A;
FILE.H;
```

These are useful when writing your own bitboard operations.

## Utility

Get the opposite color:

```ts
import { oppositeColor } from "<package-name>";

oppositeColor("white"); // "black"
oppositeColor("black"); // "white"
```

## API overview

### Types

| Export               | Description                                |
| -------------------- | ------------------------------------------ |
| `BitBoard`           | `bigint` representation of a board         |
| `Piece`              | Piece type + color                         |
| `PieceWithPosition`  | Piece with its board position              |
| `ChessColor`         | `"white"` or `"black"`                     |
| `PieceType`          | Pawn, knight, bishop, rook, queen, or king |
| `PromotionPieceType` | Queen, rook, bishop, or knight             |
| `Rank`               | Chess ranks `1` through `8`                |
| `File`               | Chess files `a` through `h`                |
| `Square`             | Type-safe square such as `"e4"`            |

### Functions

| Function                    | Description                          |
| --------------------------- | ------------------------------------ |
| `getSquareIndex(square)`    | Converts a square to a `0..63` index |
| `getSquareFromIndex(index)` | Converts a `0..63` index to a square |
| `oppositeColor(color)`      | Returns the opposite chess color     |

### `Chess`

| Member                         | Description                                      |
| ------------------------------ | ------------------------------------------------ |
| `turn`                         | Current side to move                             |
| `bitboards`                    | Piece bitboards by color and type                |
| `whitePieces`                  | All white pieces as a bitboard                   |
| `blackPieces`                  | All black pieces as a bitboard                   |
| `occupied`                     | All occupied squares                             |
| `captures`                     | Capture counters                                 |
| `enPassantTarget`              | Current en passant target square                 |
| `moveFlags`                    | King/rook/castling state                         |
| `getPieceAt(square)`           | Gets the piece on a square                       |
| `getLegalMovesFor(square)`     | Gets legal moves as a bitboard                   |
| `getAttacksFor(square)`        | Gets attacks as a bitboard                       |
| `getAttackedSquaresFor(color)` | Gets all attacked squares for a color            |
| `move(from, to)`               | Moves a piece and updates state                  |
| `capture(square, piece)`       | Removes a captured piece and records the capture |
| `clear(square)`                | Removes a piece from a square                    |
| `promote(type, piece, target)` | Promotes a pawn                                  |
| `inCheck(color)`               | Checks whether a king is attacked                |
| `reset()`                      | Restores the starting position                   |

## Architecture

The core representation is intentionally small:

```text
Chess
├── white piece bitboards
│   ├── king
│   ├── queen
│   ├── rook
│   ├── bishop
│   ├── knight
│   └── pawn
│
├── black piece bitboards
│   ├── king
│   ├── queen
│   ├── rook
│   ├── bishop
│   ├── knight
│   └── pawn
│
├── turn
├── enPassantTarget
├── moveFlags
└── captures
```

This keeps the chess engine independent from presentation. A UI can consume the generated bitboards while a server, bot, or game simulation can use the same state representation.

## What this library does not provide

The current `Chess` class is focused on board state and move/attack logic. It does not currently provide:

- a chess UI
- FEN parsing or serialization
- PGN parsing or serialization
- SAN move notation
- move history / undo
- game clocks
- checkmate/stalemate/draw result detection
- AI/search
- network multiplayer
- persistent game storage

These can be layered on top of the core class without coupling the board representation to a particular application.

## Development

A typical library layout could look like:

```text
src/
  chess.ts
  index.ts

tests/
  chess.test.ts

package.json
tsconfig.json
README.md
```

Re-export the public API from `index.ts`:

```ts
export * from "./chess";
```

Then consumers only need:

```ts
import { Chess } from "your-package";
```

## Testing

For a reusable chess library, tests are especially valuable around the rules that are easy to get subtly wrong.

Recommended test groups:

```text
square/index conversion
initial board setup
piece lookup
pawn movement
pawn captures
double pawn moves
en passant
knight movement
bishop movement
rook movement
queen movement
king movement
castling
promotion
captures
check detection
reset
```

## License

Add your license here before publishing the package.

For example:

```text
MIT
```

or another license appropriate for your project.
