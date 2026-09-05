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

  captures = {
    [ChessColor.Black]: {
      [PieceType.King]: 0,
      [PieceType.Queen]: 0,
      [PieceType.Rook]: 0,
      [PieceType.Bishop]: 0,
      [PieceType.Knight]: 0,
      [PieceType.Pawn]: 0,
    },
    [ChessColor.White]: {
      [PieceType.King]: 0,
      [PieceType.Queen]: 0,
      [PieceType.Rook]: 0,
      [PieceType.Bishop]: 0,
      [PieceType.Knight]: 0,
      [PieceType.Pawn]: 0,
    },
  };

  public get blackPieces(): BitBoard {
    const pieceSet = this.bitboards[ChessColor.Black];
    return (
      pieceSet[PieceType.King] |
      pieceSet[PieceType.Queen] |
      pieceSet[PieceType.Rook] |
      pieceSet[PieceType.Bishop] |
      pieceSet[PieceType.Knight] |
      pieceSet[PieceType.Pawn]
    );
  }

  public get whitePieces(): BitBoard {
    const pieceSet = this.bitboards[ChessColor.White];
    return (
      pieceSet[PieceType.King] |
      pieceSet[PieceType.Queen] |
      pieceSet[PieceType.Rook] |
      pieceSet[PieceType.Bishop] |
      pieceSet[PieceType.Knight] |
      pieceSet[PieceType.Pawn]
    );
  }

  public get occupied(): BitBoard {
    return this.whitePieces | this.blackPieces;
  }

  reset() {
    this.bitboards = {
      [ChessColor.Black]: Board.setupPiecesFor("black"),
      [ChessColor.White]: Board.setupPiecesFor("white"),
    };

    this.captures = {
      [ChessColor.Black]: {
        [PieceType.King]: 0,
        [PieceType.Queen]: 0,
        [PieceType.Rook]: 0,
        [PieceType.Bishop]: 0,
        [PieceType.Knight]: 0,
        [PieceType.Pawn]: 0,
      },
      [ChessColor.White]: {
        [PieceType.King]: 0,
        [PieceType.Queen]: 0,
        [PieceType.Rook]: 0,
        [PieceType.Bishop]: 0,
        [PieceType.Knight]: 0,
        [PieceType.Pawn]: 0,
      },
    };
  }

  getLegalMovesFor(cellIndex: number): BitBoard {
    const piece = getCellPiece(this, cellIndex);
    if (!piece) return 0x0n;

    switch (piece.type) {
      case PieceType.Pawn:
        return this.getLegalPawnMoves(cellIndex, piece);
      default:
        // All squares. For debugging only
        return 0xffffffffffffffffn;
    }
  }

  private getLegalPawnMoves(cellIndex: number, piece: Piece): BitBoard {
    const cellPosition = 1n << BigInt(cellIndex);

    let finalPositions = 0n;

    let moveRays =
      piece.color === ChessColor.White
        ? cellPosition << 8n
        : cellPosition >> 8n;

    // If the ray doesnt conflict with the opponentPieces add to the final positions
    if ((moveRays & this.occupied) === 0n) finalPositions |= moveRays;

    const startPositions =
      piece.color === ChessColor.White
        ? 0x000000000000ff00n
        : 0x00ff000000000000n;

    // Is pawn in the start position. If so add an external square forward to move rays
    if ((cellPosition & startPositions) !== 0n) {
      const twoSquareMove =
        piece.color === ChessColor.White
          ? cellPosition << 16n
          : cellPosition >> 16n;
      if ((twoSquareMove & this.occupied) === 0n)
        finalPositions |= twoSquareMove;
    }

    let attackRays =
      piece.color === ChessColor.White
        ? (cellPosition << (8n + 1n)) + (cellPosition << (8n - 1n))
        : (cellPosition >> (8n + 1n)) + (cellPosition >> (8n - 1n));
    const opponentPieces =
      piece.color === ChessColor.White ? this.blackPieces : this.whitePieces;

    finalPositions |= attackRays & opponentPieces;

    return finalPositions;
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

    const opponentPieces =
      piece.color === ChessColor.White ? this.blackPieces : this.whitePieces;

    // Is it a capture
    if ((toMask & opponentPieces) !== 0n) this.capture(to, piece);

    // Remove the piece from "from position" and set it to "to position"
    bitboard &= ~fromMask;
    bitboard |= toMask;

    this.bitboards[piece.color][piece.type] = bitboard;
  }

  /** In order to work this method ensure `cellIndex`'s mask is occupied with a piece */
  private capture(targetCellIndex: number, captuedBy: Piece) {
    const targetBitboard = 1n << BigInt(targetCellIndex);
    const capturedPiece = getCellPiece(this, targetCellIndex);
    if (!capturedPiece) return;

    let bitboard = this.bitboards[capturedPiece.color][capturedPiece.type];
    // Clear the target bit on the target bitboard
    bitboard &= ~targetBitboard;
    this.bitboards[capturedPiece.color][capturedPiece.type] = bitboard;

    this.captures[captuedBy.color][capturedPiece.type] += 1;
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
