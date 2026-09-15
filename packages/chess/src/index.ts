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

interface MoveFlags {
  kingSideRookMoved: boolean;
  queenSideRookMoved: boolean;
  kingMoved: boolean;
  castled: boolean;
}

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

export const oppositeColor = (color: ChessColor): ChessColor =>
  color === "white" ? "black" : "white";

export class Chess {
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
      out.rook = (1n << 0n) | (1n << 7n);
      out.bishop = (1n << 2n) | (1n << 5n);
      out.knight = (1n << 1n) | (1n << 6n);
      out.pawn = RANK[2];
    } else {
      const last_row = 0x0100000000000000n;

      out.king = last_row << 4n;
      out.queen = last_row << 3n;
      out.rook = (last_row << 0n) | (last_row << 7n);
      out.bishop = (last_row << 2n) | (last_row << 5n);
      out.knight = (last_row << 1n) | (last_row << 6n);
      out.pawn = RANK[7];
    }

    return out;
  }

  enPassantTarget: Square | null = null;
  moveFlags: Record<ChessColor, MoveFlags> = {
    black: {
      kingMoved: false,
      kingSideRookMoved: false,
      queenSideRookMoved: false,
      castled: false,
    },
    white: {
      kingMoved: false,
      kingSideRookMoved: false,
      queenSideRookMoved: false,
      castled: false,
    },
  };

  bitboards: Record<ChessColor, PieceSet> = {
    black: Chess.setupPiecesFor("black"),
    white: Chess.setupPiecesFor("white"),
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

  getAttackedSquaresFor(color: ChessColor): BitBoard {
    let out: BitBoard = 0n;
    const allFiles: File[] = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const allRanks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8];

    for (const file of allFiles) {
      for (const rank of allRanks) {
        const square = `${file}${rank}` as Square;

        const piece = this.getPieceAt(square);
        if (!piece) continue;
        if (piece.color !== color) continue;
        out |= this.getAttacksFor(square);
      }
    }

    return out;
  }

  getAttacksFor(square: Square): BitBoard {
    const squareIndex = getSquareIndex(square);
    const piece = this.getPieceAt(square);
    if (!piece) return 0x0n;

    type AttackFunction = (squareIndex: number, color: ChessColor) => BitBoard;
    // Javascript is really is stupid
    const attacksMap: Record<PieceType, AttackFunction> = {
      pawn: (i, c) => this.getPawnAttacks(i, c),
      king: (i, c) => this.getKingAttacks(i, c),
      knight: (i, c) => this.getKnightAttacks(i, c),
      rook: (i, c) => this.getRookAttacks(i, c),
      bishop: (i, c) => this.getBishopAttacks(i, c),
      queen: (i, c) => this.getQueenAttacks(i, c),
    };

    return attacksMap[piece.type](squareIndex, piece.color);
  }

  getKingAttacks(squareIndex: number, color: ChessColor): BitBoard {
    const squarePosition = 1n << BigInt(squareIndex);

    let finalAttacks = 0n;

    const top = squarePosition << 8n,
      bottom = squarePosition >> 8n,
      left = squarePosition >> 1n,
      right = squarePosition << 1n,
      topLeft = squarePosition << (8n - 1n),
      topRight = squarePosition << (8n + 1n),
      bottomRight = squarePosition >> (8n - 1n),
      bottomLeft = squarePosition >> (8n + 1n);

    finalAttacks =
      top |
      bottom |
      left |
      right |
      topLeft |
      topRight |
      bottomLeft |
      bottomRight;

    const teamPieces = color === "white" ? this.whitePieces : this.blackPieces;
    finalAttacks &= ~teamPieces;

    if ((squarePosition & (FILE.A | FILE.B)) !== 0n)
      finalAttacks &= ~(FILE.G | FILE.H);
    if ((squarePosition & (FILE.G | FILE.H)) !== 0n)
      finalAttacks &= ~(FILE.A | FILE.B);

    return finalAttacks;
  }

  getQueenAttacks(squareIndex: number, color: ChessColor): BitBoard {
    return (
      this.getBishopAttacks(squareIndex, color) |
      this.getRookAttacks(squareIndex, color)
    );
  }

  getBishopAttacks(squareIndex: number, color: ChessColor): BitBoard {
    const opponentPieces = this.bitboards[oppositeColor(color)];
    const kingMask = opponentPieces.king;
    // "See through" king
    opponentPieces.king &= ~kingMask;
    const attacks = this.getLegalBishopMoves(squareIndex, color, true);
    opponentPieces.king |= kingMask;
    return attacks;
  }

  getRookAttacks(squareIndex: number, color: ChessColor): BitBoard {
    const opponentPieces = this.bitboards[oppositeColor(color)];
    const kingMask = opponentPieces.king;
    // "See through" king
    opponentPieces.king &= ~kingMask;
    const attacks = this.getLegalRookMoves(squareIndex, color, true);
    opponentPieces.king |= kingMask;
    return attacks;
  }

  getPawnAttacks(squareIndex: number, color: ChessColor): BitBoard {
    const squarePosition = 1n << BigInt(squareIndex);

    let attackRays =
      color === "white"
        ? (squarePosition << (8n + 1n)) + (squarePosition << (8n - 1n))
        : (squarePosition >> (8n + 1n)) + (squarePosition >> (8n - 1n));

    // Remove the moves that goes out of the board
    if ((squarePosition & FILE.H) !== 0n) attackRays &= ~FILE.A;
    if ((squarePosition & FILE.A) !== 0n) attackRays &= ~FILE.H;
    return attackRays;
  }

  getKnightAttacks(squareIndex: number, color: ChessColor) {
    return this.getLegalKnightMoves(squareIndex, color);
  }

  getLegalMovesFor(square: Square): BitBoard {
    const squareIndex = getSquareIndex(square);
    const piece = this.getPieceAt(square);
    if (!piece) return 0x0n;

    type LegalMoveFunction = (
      squareIndex: number,
      color: ChessColor,
    ) => BitBoard;
    // Javascript is kinda stupid
    const legalMoveMap: Record<PieceType, LegalMoveFunction> = {
      pawn: (i, c) => this.getLegalPawnMoves(i, c),
      king: (i, c) => this.getLegalKingMoves(i, c),
      queen: (i, c) => this.getLegalQueenMoves(i, c),
      rook: (i, c) => this.getLegalRookMoves(i, c),
      bishop: (i, c) => this.getLegalBishopMoves(i, c),
      knight: (i, c) => this.getLegalKnightMoves(i, c),
    };

    return legalMoveMap[piece.type](squareIndex, piece.color);
  }

  getLegalQueenMoves(squareIndex: number, color: ChessColor): BitBoard {
    return (
      this.getLegalRookMoves(squareIndex, color) |
      this.getLegalBishopMoves(squareIndex, color)
    );
  }

  getLegalBishopMoves(
    squareIndex: number,
    color: ChessColor,
    /** use it when bishop moves needs to include first team piece to the moves */
    includeTeamPiece: boolean = false,
  ): BitBoard {
    const squarePosition = 1n << BigInt(squareIndex);
    let finalPositions = 0n;

    // From white's perspective. In gameplay this directions switched for black
    let dirUpLeft = squarePosition,
      dirUpRight = squarePosition,
      dirDownLeft = squarePosition,
      dirDownRight = squarePosition;

    const teamPieces = color === "white" ? this.whitePieces : this.blackPieces;
    const opponentPieces =
      color === "white" ? this.blackPieces : this.whitePieces;

    while ((dirUpLeft & (RANK[8] | FILE.A)) === 0n) {
      const next = dirUpLeft << (8n - 1n);
      if (!includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      dirUpLeft |= next;
      if (includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      if ((next & opponentPieces) !== 0n) break;
    }
    while ((dirUpRight & (RANK[8] | FILE.H)) === 0n) {
      const next = dirUpRight << (8n + 1n);
      if (!includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      dirUpRight |= next;
      if (includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      if ((next & opponentPieces) !== 0n) break;
    }
    while ((dirDownLeft & (RANK[1] | FILE.A)) === 0n) {
      const next = dirDownLeft >> (8n + 1n);
      if (!includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      dirDownLeft |= next;
      if (includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      if ((next & opponentPieces) !== 0n) break;
    }
    while ((dirDownRight & (RANK[1] | FILE.H)) === 0n) {
      const next = dirDownRight >> (8n - 1n);
      if (!includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      dirDownRight |= next;
      if (includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      if ((next & opponentPieces) !== 0n) break;
    }

    finalPositions |= dirUpLeft | dirUpRight | dirDownLeft | dirDownRight;
    finalPositions &= ~squarePosition;

    // In case some there might be a move offboard
    finalPositions &= ALL_SQUARES;

    return finalPositions;
  }

  getLegalRookMoves(
    squareIndex: number,
    color: ChessColor,
    /** use it when rook moves needs to include first team piece to the moves */
    includeTeamPiece: boolean = false,
  ): BitBoard {
    const squarePosition = 1n << BigInt(squareIndex);
    let finalPositions = 0n;

    // From white's perspective. In gameplay this directions switched for black
    let dirUp = squarePosition,
      dirDown = squarePosition,
      dirLeft = squarePosition,
      dirRight = squarePosition;

    const teamPieces = color === "white" ? this.whitePieces : this.blackPieces;
    const opponentPieces =
      color === "white" ? this.blackPieces : this.whitePieces;

    while ((dirUp & RANK[8]) === 0n) {
      const next = dirUp << 8n;
      if (!includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      dirUp |= next;
      if (includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      if ((next & opponentPieces) !== 0n) break;
    }
    while ((dirDown & RANK[1]) === 0n) {
      const next = dirDown >> 8n;
      if (!includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      dirDown |= next;
      if (includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      if ((next & opponentPieces) !== 0n) break;
    }
    while ((dirRight & FILE.H) === 0n) {
      const next = dirRight << 1n;
      if (!includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      dirRight |= next;
      if (includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      if ((next & opponentPieces) !== 0n) break;
    }
    while ((dirLeft & FILE.A) === 0n) {
      const next = dirLeft >> 1n;
      if (!includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      dirLeft |= next;
      if (includeTeamPiece) {
        if ((next & teamPieces) !== 0n) break;
      }
      if ((next & opponentPieces) !== 0n) break;
    }

    finalPositions |= dirUp | dirDown | dirRight | dirLeft;
    finalPositions &= ~squarePosition;

    // In case some there might be a move offboard
    finalPositions &= ALL_SQUARES;

    return finalPositions;
  }

  getLegalKingMoves(squareIndex: number, color: ChessColor): BitBoard {
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

    const teamPieces = color === "white" ? this.whitePieces : this.blackPieces;
    finalPositions &= ~teamPieces;

    if ((squarePosition & (FILE.A | FILE.B)) !== 0n)
      finalPositions &= ~(FILE.G | FILE.H);
    if ((squarePosition & (FILE.G | FILE.H)) !== 0n)
      finalPositions &= ~(FILE.A | FILE.B);

    let castleMoves = 0n;
    const { castled, kingMoved, kingSideRookMoved, queenSideRookMoved } = {
      castled: this.moveFlags[color].castled,
      kingMoved: this.moveFlags[color].kingMoved,
      kingSideRookMoved: this.moveFlags[color].kingSideRookMoved,
      queenSideRookMoved: this.moveFlags[color].queenSideRookMoved,
    };

    // Enable queen-side-castle if queen side rook is not moved AND there are no pieces in between squares
    if (!queenSideRookMoved && !kingMoved && !castled) {
      const squaresInBetween =
        color === "white"
          ? (1n << BigInt(getSquareIndex("b1"))) |
            (1n << BigInt(getSquareIndex("c1"))) |
            (1n << BigInt(getSquareIndex("d1")))
          : (1n << BigInt(getSquareIndex("b8"))) |
            (1n << BigInt(getSquareIndex("c8"))) |
            (1n << BigInt(getSquareIndex("d8")));

      if ((this.occupied & squaresInBetween) === 0n) {
        const longCastleMove =
          color === "white"
            ? 1n << BigInt(getSquareIndex("c1"))
            : 1n << BigInt(getSquareIndex("c8"));
        castleMoves |= longCastleMove & ~teamPieces;
      }
    }
    // Enable king-side-castle if king side rook is not moved AND there are no pieces in between squares
    if (!kingSideRookMoved && !kingMoved && !castled) {
      const squaresInBetween =
        color === "white"
          ? (1n << BigInt(getSquareIndex("f1"))) |
            (1n << BigInt(getSquareIndex("g1")))
          : (1n << BigInt(getSquareIndex("f8"))) |
            (1n << BigInt(getSquareIndex("g8")));

      if ((this.occupied & squaresInBetween) === 0n) {
        const shortCastleMove =
          color === "white"
            ? 1n << BigInt(getSquareIndex("g1"))
            : 1n << BigInt(getSquareIndex("g8"));
        castleMoves |= shortCastleMove & ~teamPieces;
      }
    }

    if (!this.inCheck(color)) {
      finalPositions |= castleMoves;
    }

    const opponent = color === "white" ? "black" : "white";
    const attackedSquares = this.getAttackedSquaresFor(opponent);
    finalPositions &= ~attackedSquares;

    // In case some there might be a move offboard
    finalPositions &= ALL_SQUARES;

    return finalPositions;
  }

  getLegalKnightMoves(squareIndex: number, color: ChessColor): BitBoard {
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

    const teamPieces = color === "white" ? this.whitePieces : this.blackPieces;
    finalPositions &= ~teamPieces;

    if ((squarePosition & (FILE.A | FILE.B)) !== 0n)
      finalPositions &= ~(FILE.G | FILE.H);
    if ((squarePosition & (FILE.G | FILE.H)) !== 0n)
      finalPositions &= ~(FILE.A | FILE.B);

    // In case some there might be a move offboard
    finalPositions &= ALL_SQUARES;

    return finalPositions;
  }

  getLegalPawnMoves(squareIndex: number, color: ChessColor): BitBoard {
    const squarePosition = 1n << BigInt(squareIndex);

    let finalPositions = 0n;

    let moveRays =
      color === "white" ? squarePosition << 8n : squarePosition >> 8n;

    // If the ray doesnt conflict with the opponentPieces add to the final positions
    if ((moveRays & this.occupied) === 0n) finalPositions |= moveRays;

    const startPositions = color === "white" ? RANK[2] : RANK[7];

    // Is pawn in the start position. If so add an external square forward to move rays
    if ((squarePosition & startPositions) !== 0n) {
      const twoSquareMove =
        color === "white" ? squarePosition << 16n : squarePosition >> 16n;
      if (
        // Is the two-square-move square occupied by an another piece
        (twoSquareMove & this.occupied) === 0n &&
        // Don't allow two-square-move if the front square is occupied
        (moveRays & this.occupied) === 0n
      )
        finalPositions |= twoSquareMove;
    }

    let attackRays = this.getPawnAttacks(squareIndex, color);

    const opponentPieces =
      color === "white" ? this.blackPieces : this.whitePieces;

    finalPositions |= attackRays & opponentPieces;

    if (!this.enPassantTarget) return finalPositions;

    const fifthRank = color === "white" ? RANK[5] : RANK[4];

    const pieceLeftSquare =
      color === "white" ? squarePosition >> 1n : squarePosition << 1n;
    const pieceRightSquare =
      color === "white" ? squarePosition << 1n : squarePosition >> 1n;
    const pieceLeftUpSquare =
      color === "white" ? pieceLeftSquare << 8n : pieceLeftSquare >> 8n;
    const pieceRightUpSquare =
      color === "white" ? pieceRightSquare << 8n : pieceRightSquare >> 8n;

    const enPassantTarget = 1n << BigInt(getSquareIndex(this.enPassantTarget));

    // Is the pawn on fifth rank?
    if ((squarePosition & fifthRank) !== 0n) {
      // if there's a pawn on enPassantTarget square add the one rank upper square to the moves
      if ((pieceLeftSquare & enPassantTarget) !== 0n)
        finalPositions |= pieceLeftUpSquare;
      if ((pieceRightSquare & enPassantTarget) !== 0n)
        finalPositions |= pieceRightUpSquare;
    }

    // In case some there might be a move offboard
    finalPositions &= ALL_SQUARES;

    return finalPositions;
  }

  toggleTurn() {
    if (this.turn === "white") this.turn = "black";
    else this.turn = "white";
  }

  /** In order to work this method ensure `squareIndex`'s mask is occupied with a piece */
  capture(targetSquare: Square, capturedBy: Piece) {
    const targetBitboard = 1n << BigInt(getSquareIndex(targetSquare));
    const capturedPiece = this.getPieceAt(targetSquare);
    if (!capturedPiece) return;

    let bitboard = this.bitboards[capturedPiece.color][capturedPiece.type];
    // Clear the target bit on the target bitboard
    bitboard &= ~targetBitboard;
    this.bitboards[capturedPiece.color][capturedPiece.type] = bitboard;

    this.captures[capturedBy.color][capturedPiece.type] += 1;
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

    // Is it a two-square-pawn-move? If so enable en-passant moves for the opponent
    const fromRank = parseInt(fromSquare[1]) as Rank;
    const toRank = parseInt(toSquare[1]) as Rank;
    if (piece.type === "pawn" && Math.abs(fromRank - toRank) === 2) {
      this.enPassantTarget = toSquare;
    }
    // Othewise remove the en-passant moves
    else {
      this.enPassantTarget = null;
    }

    // Remove the piece from "from position" and set it to "to position"
    bitboard &= ~fromMask;
    bitboard |= toMask;

    // Is the moved piece a pawn and if it moves to an empty square always remove
    // an opponent pawn behind the target square. (thanks to mattbatwings for this idea)
    if (
      piece.type === "pawn" &&
      fromSquare[0] !== toSquare[0] && // diagonal move
      (toMask & opponentPieces) === 0n // landed on empty square
    ) {
      const oneBehind = piece.color === "white" ? -1 : 1;
      const oneBehindSquare =
        `${toSquare[0]}${parseInt(toSquare[1]) + oneBehind}` as Square;
      this.capture(oneBehindSquare, piece);
    }

    if (piece.type === "king") {
      this.moveFlags[piece.color].kingMoved = true;
    }

    const isCastleMove =
      piece.type === "king" &&
      Math.abs(fromSquare.charCodeAt(0) - toSquare.charCodeAt(0)) === 2;

    if (isCastleMove) {
      const rank = fromSquare[1];
      const isKingSide = toSquare.charCodeAt(0) > fromSquare.charCodeAt(0);

      const rookFromSquare = `${isKingSide ? "h" : "a"}${rank}` as Square;
      const rookToSquare = `${isKingSide ? "f" : "d"}${rank}` as Square;

      const rookFromMask = 1n << BigInt(getSquareIndex(rookFromSquare));
      const rookToMask = 1n << BigInt(getSquareIndex(rookToSquare));

      let rookBitboard = this.bitboards[piece.color].rook;
      rookBitboard = (rookBitboard & ~rookFromMask) | rookToMask;
      this.bitboards[piece.color].rook = rookBitboard;

      this.moveFlags[piece.color].kingSideRookMoved = true;
      this.moveFlags[piece.color].queenSideRookMoved = true;
      this.moveFlags[piece.color].castled = true;
    }

    const kingSideCorners = (1n << BigInt(7)) | (1n << BigInt(63));
    const queenSideCorners = (1n << BigInt(0)) | (1n << BigInt(56));
    if (piece.type === "rook") {
      if ((fromMask & kingSideCorners) !== 0n)
        this.moveFlags[piece.color].kingSideRookMoved = true;
      if ((fromMask & queenSideCorners) !== 0n)
        this.moveFlags[piece.color].queenSideRookMoved = true;
    }

    this.bitboards[piece.color][piece.type] = bitboard;

    this.toggleTurn();
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
    this.enPassantTarget = null;
    this.toggleTurn();
  }

  reset() {
    this.turn = "white";

    this.bitboards = {
      black: Chess.setupPiecesFor("black"),
      white: Chess.setupPiecesFor("white"),
    };

    this.enPassantTarget = null;
    this.moveFlags = {
      black: {
        castled: false,
        kingSideRookMoved: false,
        queenSideRookMoved: false,
        kingMoved: false,
      },
      white: {
        castled: false,
        kingSideRookMoved: false,
        queenSideRookMoved: false,
        kingMoved: false,
      },
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

  inCheck(color: ChessColor): boolean {
    const opponent = oppositeColor(color);
    const attackedSquares = this.getAttackedSquaresFor(opponent);

    return (attackedSquares & this.bitboards[color].king) !== 0n;
  }
}
