export type BitBoard = bigint;

export type Piece = {
  type: PieceType;
  color: ChessColor;
};

export enum ChessColor {
  Black = 0,
  White = 1,
}

export enum PieceType {
  Pawn,
  Knight,
  Bishop,
  Rook,
  Queen,
  King,
}

type PieceSet = {
  [PieceType.King]: BitBoard;
  [PieceType.Queen]: BitBoard;
  [PieceType.Rook]: BitBoard;
  [PieceType.Bishop]: BitBoard;
  [PieceType.Knight]: BitBoard;
  [PieceType.Pawn]: BitBoard;
};

export class Board {
  static setupPiecesFor(pieceColor: "black" | "white"): PieceSet {
    const out: PieceSet = {
      [PieceType.King]: 0n,
      [PieceType.Queen]: 0n,
      [PieceType.Rook]: 0n,
      [PieceType.Bishop]: 0n,
      [PieceType.Knight]: 0n,
      [PieceType.Pawn]: 0n,
    };

    if (pieceColor === "white") {
      out[PieceType.King] = 1n << 4n;
      out[PieceType.Queen] = 1n << 3n;
      out[PieceType.Rook] = 1n + (1n << 7n);
      out[PieceType.Bishop] = (1n << 2n) + (1n << 5n);
      out[PieceType.Knight] = (1n << 1n) + (1n << 6n);
      out[PieceType.Pawn] = 0x000000000000ff00n;
    } else {
      const last_row = 0x0100000000000000n;

      out[PieceType.King] = last_row << 4n;
      out[PieceType.Queen] = last_row << 3n;
      out[PieceType.Rook] = last_row + (last_row << 7n);
      out[PieceType.Bishop] = (last_row << 2n) + (last_row << 5n);
      out[PieceType.Knight] = (last_row << 1n) + (last_row << 6n);
      out[PieceType.Pawn] = 0x00ff000000000000n;
    }

    return out;
  }

  bitboards: {
    [ChessColor.Black]: PieceSet;
    [ChessColor.White]: PieceSet;
  } = {
    [ChessColor.Black]: Board.setupPiecesFor("black"),
    [ChessColor.White]: Board.setupPiecesFor("white"),
  };

  reset() {
    this.bitboards = {
      [ChessColor.Black]: Board.setupPiecesFor("black"),
      [ChessColor.White]: Board.setupPiecesFor("white"),
    };
  }

  getLegalMovesFor(cellIndex: number): BitBoard {
    const piece = getCellPiece(this, cellIndex);
    if (!piece) return 0x0n;

    switch (piece.type) {
      case PieceType.Pawn:
        const cellPosition = 1n << BigInt(cellIndex);

        return piece.color === ChessColor.White
          ? cellPosition << 8n
          : cellPosition >> 8n;
      default:
        return 0n;
    }
  }

  move(from: number, to: number) {
    const piece = getCellPiece(this, from);
    if (!piece)
      throw new Error(
        `cannot move ${from} indexed square becuase it does not have a moveable piece`,
      );

    let bitboard = this.bitboards[piece.color][piece.type];
    const fromMask = 1n << BigInt(from);
    const toMask = 1n << BigInt(to);

    bitboard &= ~fromMask;
    bitboard |= toMask;

    this.bitboards[piece.color][piece.type] = bitboard;
  }
}

export function getCellPiece(
  board: Board,
  cellIndex: number,
): Piece | undefined {
  const mask = 1n << BigInt(cellIndex);

  if ((board.bitboards[ChessColor.White][PieceType.King] & mask) !== 0n)
    return { type: PieceType.King, color: ChessColor.White };
  if ((board.bitboards[ChessColor.White][PieceType.Queen] & mask) !== 0n)
    return { type: PieceType.Queen, color: ChessColor.White };
  if ((board.bitboards[ChessColor.White][PieceType.Rook] & mask) !== 0n)
    return { type: PieceType.Rook, color: ChessColor.White };
  if ((board.bitboards[ChessColor.White][PieceType.Bishop] & mask) !== 0n)
    return { type: PieceType.Bishop, color: ChessColor.White };
  if ((board.bitboards[ChessColor.White][PieceType.Knight] & mask) !== 0n)
    return { type: PieceType.Knight, color: ChessColor.White };
  if ((board.bitboards[ChessColor.White][PieceType.Pawn] & mask) !== 0n)
    return { type: PieceType.Pawn, color: ChessColor.White };

  if ((board.bitboards[ChessColor.Black][PieceType.King] & mask) !== 0n)
    return { type: PieceType.King, color: ChessColor.Black };
  if ((board.bitboards[ChessColor.Black][PieceType.Queen] & mask) !== 0n)
    return { type: PieceType.Queen, color: ChessColor.Black };
  if ((board.bitboards[ChessColor.Black][PieceType.Rook] & mask) !== 0n)
    return { type: PieceType.Rook, color: ChessColor.Black };
  if ((board.bitboards[ChessColor.Black][PieceType.Bishop] & mask) !== 0n)
    return { type: PieceType.Bishop, color: ChessColor.Black };
  if ((board.bitboards[ChessColor.Black][PieceType.Knight] & mask) !== 0n)
    return { type: PieceType.Knight, color: ChessColor.Black };
  if ((board.bitboards[ChessColor.Black][PieceType.Pawn] & mask) !== 0n)
    return { type: PieceType.Pawn, color: ChessColor.Black };

  return undefined;
}
