import { createContext, use, useEffect, useRef, useState } from "react";
import Game from "./game";
import { Board, ChessColor } from "./chess";
import { type MantineColor } from "@mantine/core";

interface GameSettings {
  boardSize: number;
  boardTheme: MantineColor;
}

export enum GameState {
  SelectingPiece,
  SelectingTarget,
}

interface GameContext {
  turn: ChessColor;
  state: GameState;
  board: Board;
  settings: GameSettings;
  setSettings: (
    newSettings: GameSettings | ((old: GameSettings) => GameSettings),
  ) => void;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  setTurn: React.Dispatch<React.SetStateAction<ChessColor>>;
}

const GameCtx = createContext<GameContext | null>(null);

const DEFAULT_BOARD_THEME: MantineColor = "gray";

export const GameProvider = () => {
  const { current: board } = useRef<Board>(new Board());
  const [state, setGameState] = useState<GameState>(GameState.SelectingPiece);
  const [settings, _setSettings] = useState<GameSettings>({
    boardSize: 90,
    boardTheme: DEFAULT_BOARD_THEME,
  });
  const [turn, setTurn] = useState<ChessColor>(ChessColor.White);

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
        board,
        settings,
        setSettings,
        state,
        setGameState,
        turn,
        setTurn,
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
