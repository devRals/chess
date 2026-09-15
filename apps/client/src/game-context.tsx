import { createContext, use, useEffect, useRef, useState } from "react";
import Game from "./game";
import { Chess } from "@devrals/chess";
import { type MantineColor } from "@mantine/core";

interface GameSettings {
  boardSize: number;
  boardTheme: MantineColor;
  boardRotated: boolean;
}

export enum GameState {
  SelectingPiece,
  SelectingTarget,
}

interface GameContext {
  state: GameState;
  chess: Chess;
  settings: GameSettings;
  setSettings: (
    newSettings: GameSettings | ((old: GameSettings) => GameSettings),
  ) => void;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
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
  });
  const setSettings = (
    newSettings: GameSettings | ((old: GameSettings) => GameSettings),
  ) => {
    _setSettings(newSettings);
    localStorage.setItem("gameSettings", JSON.stringify(settings));
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
      }}
    >
      <Game />
    </GameCtx>
  );
};

export function useGameCtx() {
  const cx = use(GameCtx);
  if (!cx)
    throw new Error("Game context is not inialized. Use the `GameProvider`");
  return cx;
}
