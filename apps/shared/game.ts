import { Chess } from "@devrals/chess";
import type { ChessNetworkState } from "./payload";
import { type Player } from "./player";

export type GameId = string;

export type GameState = "started" | "waiting-for-players";

export class Game {
  get room() {
    return this.id;
  }

  get isFull() {
    return !!this.players.black && !!this.players.white;
  }

  get isEmpty() {
    return !this.players.black && !this.players.white;
  }

  id: GameId;
  customName: string;
  state: GameState = "waiting-for-players";
  chessState: ChessNetworkState = {
    enPassantTarget: null,
    turn: "white",
    pieces: {
      white: Chess.setupPGNPiecesFor("white"),
      black: Chess.setupPGNPiecesFor("black"),
    },
    captures: {
      white: {
        rook: 0,
        king: 0,
        pawn: 0,
        queen: 0,
        bishop: 0,
        knight: 0,
      },
      black: {
        rook: 0,
        king: 0,
        pawn: 0,
        queen: 0,
        bishop: 0,
        knight: 0,
      },
    },
    moveFlags: {
      black: {
        castled: false,
        kingMoved: false,
        kingSideRookMoved: false,
        queenSideRookMoved: false,
      },
      white: {
        castled: false,
        kingMoved: false,
        kingSideRookMoved: false,
        queenSideRookMoved: false,
      },
    },
  };
  players: Record<"white" | "black", Player | null> = {
    white: null,
    black: null,
  };

  startTheGame() {
    this.state = "started";
  }

  constructor(customName: string, id: string) {
    this.customName = customName;
    this.id = id;
  }
}
