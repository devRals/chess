import { type ChessState } from "@devrals/chess";
import type { Game, GameId } from "./game";
import type { Player } from "./player";

export interface ClientToServerEvents {
  "player:rename": (id: string, newName: string) => void;
  "player:create": (name: string) => void;

  "game:create": (customName: string) => void;
  "game:delete": (id: GameId) => void;
  "game:join": (roomId: GameId) => void;
  "game:invite": (player: Player) => void;
  "game:state": (gameId: string) => void;
  "game:list": () => void;
}
export interface ServerToClientEvents {
  "player:created": (player: Player) => void;

  "game:created": (game: Game) => void;
  "game:create_failed": (message: string) => void;
  "game:deleted": (gameId: GameId) => void;
  "game:list_recieved": (games: Game[]) => void;
  "game:invited": (data: { from: Player }) => void;
  "game:join_failed": (data: { gameId: GameId; message: string }) => void;
  "game:joined": (game: Game) => void;
  "game:state_recived": (data: ChessState | null) => void;
}
