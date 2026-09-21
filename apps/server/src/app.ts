import { createServer } from "http";
import { Server } from "socket.io";
import readline from "readline";
import { stdin, stdout } from "node:process";
import crypto from "node:crypto";

import {
  type ServerToClientEvents,
  type ClientToServerEvents,
  type PlayerId,
  type GameId,
  Player,
  Game,
  convertToNetworkState,
} from "~";

import { Chess, getSquareIndex } from "@devrals/chess";

class Config {
  static PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  static ORIGIN = process.env.ORIGIN || "http://localhost:5173";
}

const server = createServer();

type ServerSocket = Server<ClientToServerEvents, ServerToClientEvents>;
const io: ServerSocket = new Server<ClientToServerEvents, ServerToClientEvents>(
  server,
  {
    cors: {
      origin: [Config.ORIGIN],
    },
  },
);

const games = new Map<GameId, Game>();
const players = new Map<PlayerId, Player>();
const boards = new Map<GameId, Chess>();

function toArr<T>(map: Map<any, T>) {
  let out: T[] = [];
  for (const v of map.values()) out.push(v);
  return out;
}

function startANewGame(players: [Player, Player]): [Game, Chess] {
  const [p1, p2] = players;
  const gameName = `${p1.name} vs ${p2.name}`;
  const gameId = crypto.randomUUID();
  const game = new Game(gameName, gameId);

  const randomIndex = Math.floor(Math.random() * players.length) as 0 | 1;
  const white = players[randomIndex];
  const black = randomIndex === 1 ? players[0] : players[1];

  game.players = { white, black };
  game.startTheGame();

  const board = new Chess();

  boards.set(gameId, board);
  games.set(gameId, game);

  return [game, board];
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
    const player = players.get(socket.id);
    if (player) {
      if (player.joinedGame) {
        games.delete(player.joinedGame);
        boards.delete(player.joinedGame);
      }
      players.delete(player.id);
    }
    console.error(err);
  });

  socket.on("player:create", (playerName) => {
    const player = new Player(socket.id, playerName);
    players.set(socket.id, player);
    io.sockets.emit("player:created", player);
    io.sockets.emit("player:list_recieved", toArr(players));
  });

  socket.on("player:rename", (playerId, newName) => {
    const player = players.get(playerId);
    if (player) player.name = newName;
    io.sockets.emit("player:list_recieved", toArr(players));
  });

  socket.on("player:list", () => {
    socket.emit("player:list_recieved", toArr(players));
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
    io.sockets.emit("game:list_recieved", toArr(games));
  });

  socket.on("game:delete", (gameId) => {
    const gameFound = games.delete(gameId);
    boards.delete(gameId);
    for (const p of players.values()) {
      if (p.joinedGame === gameId) p.joinedGame = null;
    }
    if (gameFound) {
      io.sockets.emit("game:deleted", gameId);
      io.sockets.emit("game:list_recieved", toArr(games));
    }
  });

  socket.on("game:invite", (playerIdToInvite) => {
    const player = players.get(playerIdToInvite);
    if (!player) return;

    const socketPlayer = players.get(socket.id);
    if (!socketPlayer) return;

    if (socketPlayer.id === player.id) return;

    io.sockets.sockets
      .get(player.id)!
      .emit("game:invited", { from: socketPlayer });
  });

  socket.on("game:accept_invite", (players_invite) => {
    const playerWhoSendInvite = players.get(players_invite);
    if (!playerWhoSendInvite) return;

    const socketPlayer = players.get(socket.id);
    if (!socketPlayer) return;

    const [game, board] = startANewGame([socketPlayer, playerWhoSendInvite]);
    const gameId = game.id;

    socket.join(gameId);
    io.sockets.sockets.get(playerWhoSendInvite.id)!.join(gameId);

    socketPlayer.joinedGame = game.id;
    playerWhoSendInvite.joinedGame = game.id;

    socket.emit("game:invite_accepted", game);
    io.sockets.emit("game:list_recieved", toArr(games));

    const chessState = board.snapshot();
    const convertedState = convertToNetworkState(chessState);

    game.chessState = convertedState;
    game.state = "started";

    io.to(gameId).emit("game:started", game);
  });

  socket.on("game:state", (gameId) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit("game:state_recived", null);
      return;
    }

    const board = boards.get(gameId);
    if (!board) {
      socket.emit("game:state_recived", null);
      return;
    }

    const state = board.snapshot();
    const convertedState = convertToNetworkState(state);
    game.chessState = convertedState;
    socket.emit("game:state_recived", game);
  });

  socket.on("game:move", (move) => {
    const player = players.get(socket.id);
    if (!player) {
      socket.emit("game:move_failed", "This player doesn't exist");
      return;
    }
    if (!player.joinedGame) {
      socket.emit("game:move_failed", "Player is not in a game");
      return;
    }

    let gameFound: Game | null = null;
    for (const game of games.values()) {
      if (game.id === player.joinedGame) gameFound = game;
    }

    if (!gameFound) {
      socket.emit("game:move_failed", "Player is in a that doesn't exist");
      return;
    }

    const board = boards.get(gameFound.id);
    if (!board) {
      socket.emit(
        "game:move_failed",
        "Error: Player is in a valid game. But yet the board is not created. Please report this issue to the developers",
      );
      return;
    }
    const fromMoves = board.getLegalMovesFor(move.from);
    const toMask = 1n << BigInt(getSquareIndex(move.to));

    const isMoveLegal = (fromMoves & toMask) !== 0n;
    if (!isMoveLegal) {
      socket.emit(
        "game:move_failed",
        "This move is not legal for the current state of the board",
      );
      return;
    }

    board.move(move);
    const newState = convertToNetworkState(board.snapshot());
    gameFound.chessState = newState;
    io.to(gameFound.id).emit("game:moved", gameFound);
  });

  socket.on("game:list", () => {
    socket.emit("game:list_recieved", toArr(games));
  });

  socket.on("disconnect", (reason) => {
    console.log(`${socket.id} disconnected. Reason: ${reason}`);
    players.delete(socket.id);
    io.sockets.emit("player:list_recieved", toArr(players));
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
