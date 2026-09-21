import { createContext, use, useEffect, useRef, useState } from "react";
import Game from "./game";
import { Chess, type ChessColor } from "@devrals/chess";
import { Group, type MantineColor } from "@mantine/core";
import RoomsAndPlayers from "./multiplayer";
import { useConnection } from "./connection-context";
import { convertToRegularState, type ServerToClientEvents } from "~";

interface GameSettings {
  boardSize: number;
  boardTheme: MantineColor;
  boardAutoRotate: boolean;
}

export enum GameState {
  SelectingPiece,
  SelectingTarget,
  WaitingForOpponent,
}

interface GameContext {
  state: GameState;
  chess: Chess;
  settings: GameSettings;
  playingAs: ChessColor;
  isItMyTurn: boolean;
  setSettings: (newSettings: React.SetStateAction<GameSettings>) => void;
  setGameState: (act: React.SetStateAction<GameState>) => void;
}

const GameCtx = createContext<GameContext | null>(null);

const DEFAULT_BOARD_THEME: MantineColor = "gray";

export const GameProvider = () => {
  const { current: chess } = useRef<Chess>(new Chess());
  const [state, setGameState] = useState<GameState>(GameState.SelectingPiece);
  const [playingAs, setPlayingAs] = useState<ChessColor>("white");
  const [isItMyTurn, setIsItMyTurn] = useState(false);
  const [settings, _setSettings] = useState<GameSettings>({
    boardSize: 90,
    boardTheme: DEFAULT_BOARD_THEME,
    boardAutoRotate: false,
  });

  const { connected, socket } = useConnection();

  const setSettings = (
    newSettings: GameSettings | ((old: GameSettings) => GameSettings),
  ) => {
    const _newSettings =
      typeof newSettings === "function" ? newSettings(settings) : newSettings;
    localStorage.setItem("gameSettings", JSON.stringify(_newSettings));
    _setSettings(_newSettings);
  };

  useEffect(() => {
    const settingsRaw = localStorage.getItem("gameSettings");
    if (settingsRaw) {
      const oldSettings: GameSettings = JSON.parse(settingsRaw);
      _setSettings(oldSettings);
    }
  }, []);

  useEffect(() => {
    if (!connected) return;

    const stateRecievedHandle: ServerToClientEvents["game:state_recived"] = (
      game,
    ) => {
      if (game) {
        const convertedContext = convertToRegularState(game.chessState);
        chess.restore(convertedContext);
      }
    };

    const startGameHandle: ServerToClientEvents["game:started"] = (game) => {
      const amIWhite = game.players.white!.id === socket.id;
      setPlayingAs(amIWhite ? "white" : "black");
      setIsItMyTurn(amIWhite);

      const convertedContext = convertToRegularState(game.chessState);
      chess.restore(convertedContext);

      setGameState(
        amIWhite ? GameState.SelectingPiece : GameState.WaitingForOpponent,
      );
    };

    const moveSuccessHandle: ServerToClientEvents["game:moved"] = (
      newGameState,
    ) => {
      const convertedState = convertToRegularState(newGameState.chessState);
      chess.restore(convertedState);

      const isItMyTurn = newGameState.chessState.turn === playingAs;
      setIsItMyTurn(isItMyTurn);

      if (isItMyTurn) setGameState(GameState.SelectingPiece);
      else setGameState(GameState.WaitingForOpponent);
    };

    socket.on("game:moved", moveSuccessHandle);
    socket.on("game:state_recived", stateRecievedHandle);
    socket.on("game:started", startGameHandle);

    return () => {
      socket.off("game:state_recived", stateRecievedHandle);
      socket.off("game:started", startGameHandle);
      socket.off("game:moved", moveSuccessHandle);
    };
  }, [socket, connected, chess, playingAs]);

  return (
    <GameCtx
      value={{
        chess,
        settings,
        playingAs,
        isItMyTurn,
        setSettings,
        state,
        setGameState,
      }}
    >
      <Group>
        <Game />
        <RoomsAndPlayers />
      </Group>
    </GameCtx>
  );
};

export function useGameCtx() {
  const cx = use(GameCtx);
  if (!cx)
    throw new Error("Game context is not inialized. Use the `GameProvider`");
  return cx;
}
