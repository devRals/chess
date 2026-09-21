import type { GameId } from "./game";

export type PlayerId = string;

export class Player {
  id: PlayerId;
  name: string;

  joinedGame: GameId | null = null;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
}
