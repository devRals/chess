import { Chess, ChessColor } from "@devrals/chess";
import { Player } from "~";

export class Game {
  chess: Chess = new Chess();
  players: Record<ChessColor, Player | null> = {
    white: null,
    black: null,
  };
}
