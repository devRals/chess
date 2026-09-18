import { type Player } from "./player";

export type GameId = string;

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
  players: Record<"white" | "black", Player | null> = {
    white: null,
    black: null,
  };

  constructor(customName: string, id: string) {
    this.customName = customName;
    this.id = id;
  }
}
