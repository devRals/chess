import {
  bitboardToSquares,
  Chess,
  type ChessColor,
  type ChessState,
  type Move,
  type PieceSetPGN,
  type PieceWithPosition,
  type PromotionPieceType,
  type Square,
  squaresToBitboard,
} from "@devrals/chess";
import type { Game, GameId } from "./game";
import type { Player, PlayerId } from "./player";

interface GameState {
  chessState: ChessNetworkState;
}

/** socket.io doesn't support `bigint` type. So we can use the square arrays for positions instead */
export interface ChessNetworkState {
  pieces: Record<ChessColor, PieceSetPGN>;
  moveFlags: Chess["moveFlags"];
  captures: Chess["captures"];
  enPassantTarget: Square | null;
  turn: ChessColor;
}

export function convertToNetworkState(state: ChessState): ChessNetworkState {
  const { white, black } = state.bitboards;

  return {
    turn: state.turn,
    captures: state.captures,
    moveFlags: state.moveFlags,
    enPassantTarget: state.enPassantTarget,
    pieces: {
      white: {
        rook: bitboardToSquares(white.rook),
        queen: bitboardToSquares(white.queen),
        king: bitboardToSquares(white.king),
        pawn: bitboardToSquares(white.pawn),
        knight: bitboardToSquares(white.knight),
        bishop: bitboardToSquares(white.bishop),
      },
      black: {
        rook: bitboardToSquares(black.rook),
        queen: bitboardToSquares(black.queen),
        king: bitboardToSquares(black.king),
        pawn: bitboardToSquares(black.pawn),
        knight: bitboardToSquares(black.knight),
        bishop: bitboardToSquares(black.bishop),
      },
    },
  };
}

export function convertToRegularState(state: ChessNetworkState): ChessState {
  const { white, black } = state.pieces;

  return {
    turn: state.turn,
    captures: state.captures,
    moveFlags: state.moveFlags,
    enPassantTarget: state.enPassantTarget,
    bitboards: {
      white: {
        rook: squaresToBitboard(white.rook),
        queen: squaresToBitboard(white.queen),
        pawn: squaresToBitboard(white.pawn),
        king: squaresToBitboard(white.king),
        knight: squaresToBitboard(white.knight),
        bishop: squaresToBitboard(white.bishop),
      },
      black: {
        rook: squaresToBitboard(black.rook),
        queen: squaresToBitboard(black.queen),
        pawn: squaresToBitboard(black.pawn),
        king: squaresToBitboard(black.king),
        knight: squaresToBitboard(black.knight),
        bishop: squaresToBitboard(black.bishop),
      },
    },
  };
}

export interface ChatMessage {
  from: Player;
  message: string;
}

export interface ClientToServerEvents {
  "player:rename": (id: string, newName: string) => void;
  "player:create": (name: string) => void;
  "player:list": () => void;

  "chat:message": (message: string) => void;

  "game:create": (customName: string) => void;
  "game:delete": (id: GameId) => void;
  "game:move": (move: Move) => void;
  "game:promote": (
    to: PromotionPieceType,
    pieceToPromote: PieceWithPosition,
    targetPromotionSquare: Square,
  ) => void;
  "game:invite": (playerId: PlayerId) => void;
  "game:accept_invite": (playerId: PlayerId) => void;
  "game:state": (gameId: GameId) => void;
  "game:list": () => void;
}
export interface ServerToClientEvents {
  "player:created": (player: Player) => void;
  "player:list_recieved": (players: Player[]) => void;

  "chat:message_recieved": (msg: ChatMessage) => void;

  "game:created": (game: Game) => void;
  "game:started": (game: Game) => void;
  "game:moved": (game: Game) => void;
  "game:move_failed": (message: string) => void;
  "game:create_failed": (message: string) => void;
  "game:ended": (winner?: ChessColor) => void;
  "game:deleted": (gameId: GameId) => void;
  "game:list_recieved": (games: Game[]) => void;
  "game:invited": (data: { from: Player }) => void;
  "game:invite_accepted": (game: Game) => void;
  "game:state_recived": (data: GameState | null) => void;
}
