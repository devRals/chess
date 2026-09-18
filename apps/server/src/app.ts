import { createServer } from "http";
import { Server } from "socket.io";
import readline from "readline";
import { stdin, stdout } from "node:process";

import {
  type ServerToClientEvents,
  type ClientToServerEvents,
  type PlayerId,
  type GameId,
  Player,
  Game,
} from "~";

import { Chess, ChessColor } from "@devrals/chess";

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

const games = new Map<GameId, Game>();
const players = new Map<PlayerId, Player>();
const boards = new Map<GameId, Chess>();

function toArr<T>(map: Map<any, T>) {
  let out: T[] = [];
  for (const v of map.values()) out.push(v);
  return out;
}

io.use((_, next) => {
  let listModified = false;
  for (const game of games.values()) {
    if (game.isEmpty) {
      games.delete(game.id);
      listModified = true;
    }
  }
  if (listModified) {
    io.sockets.emit("game:list_recieved", toArr(games));
  }
  next();
});

io.on("connection", (socket) => {
  console.log("new connection: ", socket.id);

  socket.on("error", (err) => {
    console.error(err);
  });

  socket.on("player:create", (playerName) => {
    const player = new Player(socket.id, playerName);
    players.set(socket.id, player);
    socket.emit("player:created", player);
  });

  socket.on("player:rename", (playerId, newName) => {
    const player = players.get(playerId);
    if (player) player.name = newName;
  });

  socket.on("game:create", (customeName) => {
    const gameCreatedBy = players.get(socket.id);
    if (!gameCreatedBy) {
      socket.emit("game:create_failed", "This player doesn't exist");
      return;
    }

    const gameId = crypto.randomUUID();
    const game = new Game(customeName, gameId);

    game.players.white = gameCreatedBy;

    games.set(gameId, game);
    boards.set(gameId, new Chess());

    socket.join(gameId);

    io.sockets.emit("game:created", game);
  });

  socket.on("game:delete", (gameId) => {
    const gameFound = games.delete(gameId);
    boards.delete(gameId);
    if (gameFound) io.sockets.emit("game:deleted", gameId);
  });

  socket.on("game:join", (gameId) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit("game:join_failed", {
        gameId,
        message: "Game doesn't exist",
      });
      return;
    }

    const player = players.get(socket.id);
    if (!player) {
      socket.emit("game:join_failed", {
        gameId,
        message: "Player doesn't exist",
      });
      return;
    }
    for (const x in game.players) {
      if (!game.players[x as ChessColor]) {
        game.players[x as ChessColor] = player;
        console.log(`${player.name} joined the game ${game.id} as ${x}`);
        socket.join(game.room);
        io.sockets.emit("game:joined", game);
        return;
      }
    }

    socket.emit("game:join_failed", { gameId, message: "This game is full" });
  });

  socket.on("game:invite", (playerToInvite) => {
    const player = players.get(playerToInvite.id);
    if (!player) return;
    io.sockets.sockets
      .get(player.id)!
      .emit("game:invited", { from: players.get(socket.id)! });
  });

  socket.on("game:state", (gameId) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit("game:state_recived", null);
      return;
    }

    const board = boards.get(game.id);
    if (!board) {
      socket.to(game.id).emit("game:state_recived", null);
      return;
    } else socket.to(game.id).emit("game:state_recived", board.snapshot());
  });

  socket.on("game:list", () => {
    socket.emit("game:list_recieved", toArr(games));
  });

  socket.on("disconnect", (reason) => {
    console.log(`${socket.id} disconnected. Reason: ${reason}`);
    players.delete(socket.id);
  });
});

server.listen(Config.PORT, () => {
  console.log(`listening in port ${Config.PORT}`);

  const rl = readline.createInterface({ input: stdin, output: stdout });
  rl.addListener("line", (input) => {
    switch (input.toLowerCase()) {
      case "games": {
        console.log(games);
        break;
      }
      case "boards": {
        console.log(boards);
        break;
      }
      case "players": {
        console.log(players);
        break;
      }
      default: {
      }
    }
  });
});
