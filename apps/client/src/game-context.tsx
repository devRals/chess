import { createContext, use, useEffect, useRef, useState } from "react";
import Game from "./game";
import { Chess } from "@devrals/chess";
import { Group, type MantineColor } from "@mantine/core";
import RoomsAndPlayers from "./multiplayer";
import type { GameId } from "~";

interface GameSettings {
  boardSize: number;
  boardTheme: MantineColor;
  boardRotated: boolean;
  boardAutoRotate: boolean;
}

export enum GameState {
  SelectingPiece,
  SelectingTarget,
  WaitingForOpponent,
}

interface MultiplayerState {
  joinedGame: GameId | null;

  joinGame: (game: React.SetStateAction<GameId | null>) => void;
}

interface GameContext {
  state: GameState;
  chess: Chess;
  settings: GameSettings;
  multiplayer: MultiplayerState;
  setSettings: (newSettings: React.SetStateAction<GameSettings>) => void;
  setGameState: (act: React.SetStateAction<GameState>) => void;
}

const GameCtx = createContext<GameContext | null>(null);

const DEFAULT_BOARD_THEME: MantineColor = "gray";

export const GameProvider = () => {
  const { current: chess } = useRef<Chess>(new Chess());
  const [state, setGameState] = useState<GameState>(GameState.SelectingPiece);
  const [settings, _setSettings] = useState<GameSettings>({
    boardSize: 90,
    boardTheme: DEFAULT_BOARD_THEME,
    boardRotated: false,
    boardAutoRotate: false,
  });
  const [joinedGame, setJoinedGame] = useState<GameId | null>(null);

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

  return (
    <GameCtx
      value={{
        chess,
        settings,
        setSettings,
        state,
        setGameState,
        multiplayer: {
          joinGame: (game) => setJoinedGame(game),
          joinedGame,
        },
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
