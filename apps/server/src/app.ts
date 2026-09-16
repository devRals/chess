import { createServer } from "http";
import { Server } from "socket.io";

import type { ServerToClientEvents, ClientToServerEvents } from "~";
import { Game } from "./game.js";

class Config {
  static PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  static ORIGIN = process.env.ORIGIN || "http://localhost:5173";
}

const server = createServer();

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: [Config.ORIGIN],
  },
});

const games = new Map<string, Game>();

io.on("connection", (socket) => {
  console.log("a user connected: ", socket.id);

  socket.on("game:create", () => {
    const gameId = crypto.randomUUID();
    const game = new Game();
    game.players.white = socket.data;

    games.set(gameId, game);

    socket.join(gameId);

    socket.emit("event:created", { gameId });
  });

  socket.on("disconnect", () => {
    console.log("a user disconnected: ", socket.id);
  });
});

server.listen(Config.PORT, () => {
  console.log(`listening in port ${Config.PORT}`);
});
