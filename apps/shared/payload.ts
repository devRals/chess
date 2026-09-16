export interface ClientToServerEvents {
  "game:create": () => void;
}
export interface ServerToClientEvents {
  "event:created": (data: { gameId: string }) => void;
}
