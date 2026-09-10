export type BitBoard = bigint;

export interface Piece {
  type: PieceType;
  color: ChessColor;
}

export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type Square = `${File}${Rank}`;

export type PieceWithPosition = Piece & { position: Square };

export function getSquareIndex(square: Square): number {
  const file = square.slice(0, 1) as File;
  const rank = parseInt(square.slice(1, 2)) as Rank;
  const fileMap: Record<File, number> = {
    a: 0,
    b: 1,
    c: 2,
    d: 3,
    e: 4,
    f: 5,
    g: 6,
    h: 7,
  };

  return (rank - 1) * 8 + fileMap[file];
}

export function getSquareFromIndex(squareIndex: number): Square {
  const fileIndex = Math.floor(squareIndex % 8);
  const rank = Math.floor(squareIndex / 8) + 1;

  const fileMap: Record<number, File> = {
    0: "a",
    1: "b",
    2: "c",
    3: "d",
    4: "e",
    5: "f",
    6: "g",
    7: "h",
  };

  return `${fileMap[fileIndex]}${rank}` as Square;
}

export type ChessColor = "black" | "white";

export type PieceType =
  | "pawn"
  | "knight"
  | "bishop"
  | "rook"
  | "queen"
  | "king";

export type PromotionPieceType = "queen" | "rook" | "bishop" | "knight";

type PieceSet = Record<PieceType, BitBoard>;

const ALL_SQUARES = 0xff_ff_ff_ff_ff_ff_ff_ffn;

export const RANK = {
  1: 0x00_00_00_00_00_00_00_ffn,
  2: 0x00_00_00_00_00_00_ff_00n,
  3: 0x00_00_00_00_00_ff_00_00n,
  4: 0x00_00_00_00_ff_00_00_00n,
  5: 0x00_00_00_ff_00_00_00_00n,
  6: 0x00_00_ff_00_00_00_00_00n,
  7: 0x00_ff_00_00_00_00_00_00n,
  8: 0xff_00_00_00_00_00_00_00n,
} as const;

export const FILE = {
  A: 0x01_01_01_01_01_01_01_01n,
  B: 0x02_02_02_02_02_02_02_02n,
  C: 0x04_04_04_04_04_04_04_04n,
  D: 0x08_08_08_08_08_08_08_08n,
  E: 0x10_10_10_10_10_10_10_10n,
  F: 0x20_20_20_20_20_20_20_20n,
  G: 0x40_40_40_40_40_40_40_40n,
  H: 0x80_80_80_80_80_80_80_80n,
} as const;

export class Board {
  static setupPiecesFor(pieceColor: ChessColor): PieceSet {
    const out: PieceSet = {
      king: 0n,
      queen: 0n,
      rook: 0n,
      bishop: 0n,
      knight: 0n,
      pawn: 0n,
    };

    if (pieceColor === "white") {
      out.king = 1n << 4n;
      out.queen = 1n << 3n;
      out.rook = (1n << 0n) + (1n << 7n);
      out.bishop = (1n << 2n) + (1n << 5n);
      out.knight = (1n << 1n) + (1n << 6n);
      out.pawn = RANK[2];
    } else {
      const last_row = 0x0100000000000000n;

      out.king = last_row << 4n;
      out.queen = last_row << 3n;
      out.rook = (last_row << 0n) + (last_row << 7n);
      out.bishop = (last_row << 2n) + (last_row << 5n);
      out.knight = (last_row << 1n) + (last_row << 6n);
      out.pawn = RANK[7];
    }

    return out;
  }

  bitboards: Record<ChessColor, PieceSet> = {
    black: Board.setupPiecesFor("black"),
    white: Board.setupPiecesFor("white"),
  };

  turn: ChessColor = "white";

  captures: Record<ChessColor, Record<PieceType, number>> = {
    black: {
      king: 0,
      queen: 0,
      rook: 0,
      bishop: 0,
      knight: 0,
      pawn: 0,
    },
    white: {
      king: 0,
      queen: 0,
      rook: 0,
      bishop: 0,
      knight: 0,
      pawn: 0,
    },
  };

  get blackPieces(): BitBoard {
    let out = 0n;
    for (const k in this.bitboards.black) {
      out |= this.bitboards.black[k as PieceType];
    }
    return out;
  }

  get whitePieces(): BitBoard {
    let out = 0n;
    for (const k in this.bitboards.white) {
      out |= this.bitboards.white[k as PieceType];
    }
    return out;
  }

  get occupied(): BitBoard {
    return this.whitePieces | this.blackPieces;
  }

  getPieceAt(square: Square): Piece | undefined {
    const squareIndex = getSquareIndex(square);
    const squarePosition = 1n << BigInt(squareIndex);

    if ((this.bitboards.white.king & squarePosition) !== 0n)
      return { type: "king", color: "white" };
    if ((this.bitboards.white.queen & squarePosition) !== 0n)
      return { type: "queen", color: "white" };
    if ((this.bitboards.white.rook & squarePosition) !== 0n)
      return { type: "rook", color: "white" };
    if ((this.bitboards.white.bishop & squarePosition) !== 0n)
      return { type: "bishop", color: "white" };
    if ((this.bitboards.white.knight & squarePosition) !== 0n)
      return { type: "knight", color: "white" };
    if ((this.bitboards.white.pawn & squarePosition) !== 0n)
      return { type: "pawn", color: "white" };

    if ((this.bitboards.black.king & squarePosition) !== 0n)
      return { type: "king", color: "black" };
    if ((this.bitboards.black.queen & squarePosition) !== 0n)
      return { type: "queen", color: "black" };
    if ((this.bitboards.black.rook & squarePosition) !== 0n)
      return { type: "rook", color: "black" };
    if ((this.bitboards.black.bishop & squarePosition) !== 0n)
      return { type: "bishop", color: "black" };
    if ((this.bitboards.black.knight & squarePosition) !== 0n)
      return { type: "knight", color: "black" };
    if ((this.bitboards.black.pawn & squarePosition) !== 0n)
      return { type: "pawn", color: "black" };

    return undefined;
  }

  reset() {
    this.turn = "white";

    this.bitboards = {
      black: Board.setupPiecesFor("black"),
      white: Board.setupPiecesFor("white"),
    };

    this.captures = {
      black: {
        king: 0,
        queen: 0,
        rook: 0,
        bishop: 0,
        knight: 0,
        pawn: 0,
      },
      white: {
        king: 0,
        queen: 0,
        rook: 0,
        bishop: 0,
        knight: 0,
        pawn: 0,
      },
    };
  }

  getLegalMovesFor(square: Square): BitBoard {
    const squareIndex = getSquareIndex(square);
    const piece = this.getPieceAt(square);
    if (!piece) return 0x0n;

    switch (piece.type) {
      case "pawn":
        return this.getLegalPawnMoves(squareIndex, piece);
      case "king":
        return this.getLegalKingMoves(squareIndex, piece);
      case "knight":
        return this.getLegalKnightMoves(squareIndex, piece);
      default: {
        const piecePosition = 1n << BigInt(squareIndex);
        // All squares. For debugging only
        return ALL_SQUARES & ~piecePosition;
      }
    }
  }

  private getLegalKingMoves(squareIndex: number, piece: Piece): BitBoard {
    const squarePosition = 1n << BigInt(squareIndex);

    let finalPositions = 0n;

    const top = squarePosition << 8n,
      bottom = squarePosition >> 8n,
      left = squarePosition >> 1n,
      right = squarePosition << 1n,
      topLeft = squarePosition << (8n - 1n),
      topRight = squarePosition << (8n + 1n),
      bottomRight = squarePosition >> (8n - 1n),
      bottomLeft = squarePosition >> (8n + 1n);

    finalPositions =
      top |
      bottom |
      left |
      right |
      topLeft |
      topRight |
      bottomLeft |
      bottomRight;

    const selfPieces =
      piece.color === "white" ? this.whitePieces : this.blackPieces;
    finalPositions &= ~selfPieces;

    if ((squarePosition & (FILE.A | FILE.B)) !== 0n)
      finalPositions &= ~(FILE.G | FILE.H);

    if ((squarePosition & (FILE.G | FILE.H)) !== 0n)
      finalPositions &= ~(FILE.A | FILE.B);

    return finalPositions;
  }

  private getLegalKnightMoves(squareIndex: number, piece: Piece): BitBoard {
    const squarePosition = 1n << BigInt(squareIndex);
    let finalPositions = 0n;

    const right_2Up = squarePosition << (16n + 1n),
      left_2Up = squarePosition << (16n - 1n),
      up_2Right = squarePosition << (8n + 2n),
      up_2Left = squarePosition << (8n - 2n),
      right_2Down = squarePosition >> (16n - 1n),
      left_2Down = squarePosition >> (16n + 1n),
      down_2Left = squarePosition >> (8n + 2n),
      down_2Right = squarePosition >> (8n - 2n);

    finalPositions =
      right_2Up |
      left_2Up |
      up_2Left |
      up_2Right |
      right_2Down |
      left_2Down |
      down_2Left |
      down_2Right;

    const selfPieces =
      piece.color === "white" ? this.whitePieces : this.blackPieces;
    finalPositions &= ~selfPieces;

    if ((squarePosition & (FILE.A | FILE.B)) !== 0n)
      finalPositions &= ~(FILE.G | FILE.H);
    if ((squarePosition & (FILE.G | FILE.H)) !== 0n)
      finalPositions &= ~(FILE.A | FILE.B);

    return finalPositions;
  }

  private getLegalPawnMoves(squareIndex: number, piece: Piece): BitBoard {
    const squarePosition = 1n << BigInt(squareIndex);

    let finalPositions = 0n;

    let moveRays =
      piece.color === "white" ? squarePosition << 8n : squarePosition >> 8n;

    // If the ray doesnt conflict with the opponentPieces add to the final positions
    if ((moveRays & this.occupied) === 0n) finalPositions |= moveRays;

    const startPositions = piece.color === "white" ? RANK[2] : RANK[7];

    // Is pawn in the start position. If so add an external square forward to move rays
    if ((squarePosition & startPositions) !== 0n) {
      const twoSquareMove =
        piece.color === "white" ? squarePosition << 16n : squarePosition >> 16n;
      if ((twoSquareMove & this.occupied) === 0n)
        finalPositions |= twoSquareMove;
    }

    let attackRays =
      piece.color === "white"
        ? (squarePosition << (8n + 1n)) + (squarePosition << (8n - 1n))
        : (squarePosition >> (8n + 1n)) + (squarePosition >> (8n - 1n));

    // Remove the moves that goes out of the board
    if ((squarePosition & FILE.H) !== 0n) attackRays &= ~FILE.A;
    if ((squarePosition & FILE.A) !== 0n) attackRays &= ~FILE.H;

    const opponentPieces =
      piece.color === "white" ? this.blackPieces : this.whitePieces;

    finalPositions |= attackRays & opponentPieces;

    return finalPositions;
  }

  private toggleTurn() {
    if (this.turn === "white") this.turn = "black";
    else this.turn = "white";
  }

  clear(square: Square) {
    const piece = this.getPieceAt(square);
    if (!piece) return;

    const squareBitboard = 1n << BigInt(getSquareIndex(square));

    this.bitboards[piece.color][piece.type] &= ~squareBitboard;
  }

  /**
   *
   * @throws an `Error` if the `fromSquare` is doesn't contain a piece
   */
  move(fromSquare: Square, toSquare: Square) {
    const piece = this.getPieceAt(fromSquare);
    if (!piece)
      throw new Error(
        `cannot move ${fromSquare} indexed square becuase it does not have a moveable piece`,
      );

    let bitboard = this.bitboards[piece.color][piece.type];
    const fromMask = 1n << BigInt(getSquareIndex(fromSquare));
    const toMask = 1n << BigInt(getSquareIndex(toSquare));

    const opponentPieces =
      piece.color === "white" ? this.blackPieces : this.whitePieces;

    // Is it a capture
    if ((toMask & opponentPieces) !== 0n) this.capture(toSquare, piece);

    // Remove the piece from "from position" and set it to "to position"
    bitboard &= ~fromMask;
    bitboard |= toMask;

    this.bitboards[piece.color][piece.type] = bitboard;

    this.toggleTurn();
  }

  /** In order to work this method ensure `squareIndex`'s mask is occupied with a piece */
  private capture(targetSquare: Square, captuedBy: Piece) {
    const targetBitboard = 1n << BigInt(getSquareIndex(targetSquare));
    const capturedPiece = this.getPieceAt(targetSquare);
    if (!capturedPiece) return;

    let bitboard = this.bitboards[capturedPiece.color][capturedPiece.type];
    // Clear the target bit on the target bitboard
    bitboard &= ~targetBitboard;
    this.bitboards[capturedPiece.color][capturedPiece.type] = bitboard;

    this.captures[captuedBy.color][capturedPiece.type] += 1;
  }

  promote(
    to: PromotionPieceType,
    pieceToPromote: PieceWithPosition,
    targetSquare: Square,
  ) {
    const pieceSet =
      pieceToPromote.color === "white"
        ? this.bitboards.white
        : this.bitboards.black;

    const squareBitboard = 1n << BigInt(getSquareIndex(targetSquare));

    const opponentPieces =
      pieceToPromote.color === "white" ? this.blackPieces : this.whitePieces;

    if ((squareBitboard & opponentPieces) !== 0n)
      this.capture(targetSquare, pieceToPromote);

    const piecePosition = 1n << BigInt(getSquareIndex(pieceToPromote.position));

    this.bitboards[pieceToPromote.color].pawn &= ~piecePosition;

    pieceSet[to] |= squareBitboard;
    this.toggleTurn();
  }
}
