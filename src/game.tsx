import {
  Center,
  ColorSwatch,
  Divider,
  Flex,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Title,
  type MantineColor,
} from "@mantine/core";
import {
  Board as ChessBoard,
  ChessColor,
  getCellPiece,
  PieceType,
  type BitBoard,
  type Move,
  type Piece,
} from "./chess";
import { BLACK_PIECES, WHITE_PIECES } from "./assets/pieces";
import { GameState, useGameCtx } from "./game-context";
import { useState } from "react";
import { useSet } from "@mantine/hooks";

export const WhitePieceRenderer: Record<PieceType, React.ReactNode> = {
  [PieceType.King]: WHITE_PIECES.king,
  [PieceType.Queen]: WHITE_PIECES.queen,
  [PieceType.Rook]: WHITE_PIECES.rook,
  [PieceType.Bishop]: WHITE_PIECES.bishop,
  [PieceType.Knight]: WHITE_PIECES.knight,
  [PieceType.Pawn]: WHITE_PIECES.pawn,
} as const;

const SELECTION_COLOR = "blue";

export const BlackPieceRenderer: Record<PieceType, React.ReactNode> = {
  [PieceType.King]: BLACK_PIECES.king,
  [PieceType.Queen]: BLACK_PIECES.queen,
  [PieceType.Rook]: BLACK_PIECES.rook,
  [PieceType.Bishop]: BLACK_PIECES.bishop,
  [PieceType.Knight]: BLACK_PIECES.knight,
  [PieceType.Pawn]: BLACK_PIECES.pawn,
} as const;

const Cell = ({
  size,
  cellColor,
  piece,
  cellIndex,
  onCellClick,
  targetSelection,
  color,
}: {
  cellIndex: number;
  cellColor: ChessColor;
  piece?: Piece;
  size: number;
  targetSelection: boolean;
  color: MantineColor;
  onCellClick: () => void;
}) => {
  const pieceRenderer =
    piece && piece.color === ChessColor.Black
      ? BlackPieceRenderer
      : WhitePieceRenderer;

  const finalColor = cellColor === ChessColor.Black ? "dark.8" : `${color}.5`;

  return (
    <Center
      id={`cell-${cellIndex}`}
      bg={finalColor}
      w={size}
      bd="2px solid dark.3"
      h={size}
      onClick={onCellClick}
      style={{ cursor: "grab" }}
    >
      {piece && (
        <Image src={pieceRenderer[piece.type]} w="100%" draggable={false} />
      )}
      {targetSelection && (
        <Flex
          align="center"
          justify="center"
          w="100%"
          h="100%"
          bg={`${SELECTION_COLOR}.7`}
          opacity={0.5}
          style={{ zIndex: 99 }}
        />
      )}
    </Center>
  );
};

// bruh
const BOARD_COLORS: Readonly<boolean[][]> = [
  [true, false, true, false, true, false, true, false],
  [false, true, false, true, false, true, false, true],
  [true, false, true, false, true, false, true, false],
  [false, true, false, true, false, true, false, true],
  [true, false, true, false, true, false, true, false],
  [false, true, false, true, false, true, false, true],
  [true, false, true, false, true, false, true, false],
  [false, true, false, true, false, true, false, true],
];

export const Board = () => {
  const { board, settings, state, setGameState, setTurn } = useGameCtx();
  const [targetSelections, setTargetSelections] = useState<BitBoard>(0n);
  const [moveFrom, setMoveFrom] = useState(0);

  const handleMove = (cellIndex: number) => {
    switch (state) {
      case GameState.SelectingPiece:
        const piece = getCellPiece(board, cellIndex);
        if (!piece) return;
        setMoveFrom(cellIndex);
        setGameState(GameState.SelectingTarget);
        const selections = board.getLegalMovesFor(cellIndex);
        setTargetSelections(selections);
        break;

      case GameState.SelectingTarget:
        const to = cellIndex;
        board.move(moveFrom, to);

        setTurn((t) =>
          t === ChessColor.White ? ChessColor.Black : ChessColor.White,
        );
        setGameState(GameState.SelectingPiece);
        break;

      default:
        return;
    }
  };

  return (
    <Stack gap={0} h="100vh" align="center" justify="center">
      {BOARD_COLORS.map((row, i) => (
        <Group gap={0} key={`row-${i}`}>
          {row.map((cell, j) => {
            const real_i = BOARD_COLORS.length - 1 - i;
            const real_j = j;

            const cellIndex = real_i * 8 + real_j;

            const isSelectableTarget =
              state === GameState.SelectingTarget &&
              ((1n << BigInt(cellIndex)) & BigInt(targetSelections)) !== 0n;

            return (
              <Cell
                targetSelection={isSelectableTarget}
                color={settings.boardTheme}
                key={`cell-${cellIndex}`}
                size={settings.boardSize}
                cellIndex={cellIndex}
                piece={getCellPiece(board, cellIndex)}
                cellColor={cell ? ChessColor.White : ChessColor.Black}
                onCellClick={() => handleMove(cellIndex)}
              />
            );
          })}
        </Group>
      ))}
      {state === GameState.SelectingTarget && null}{" "}
      {/* TODO: Create a menu for choosing the target position*/}
    </Stack>
  );
};

const ACTIVE_THEMES: MantineColor[] = [
  "red",
  "orange",
  "yellow",
  "lime",
  "green",
  "teal",
  "blue",
  "indigo",
  "violet",
  "grape",
  "pink",
  "gray",
] as const;

const Settings = () => {
  const { settings, setSettings } = useGameCtx();

  const setBoardColor = (c: MantineColor) => {
    setSettings((s) => ({ ...s, boardTheme: c }));
  };

  const setBoardSize = (newSize: number) => {
    setSettings((s) => ({ ...s, boardSize: newSize }));
  };

  return (
    <Paper component={Stack} withBorder p="xl" w="100%">
      <Title order={3}>Settings</Title>
      <Divider />
      <Group>
        <Text span fw="bold" fz="lg">
          Theme:{" "}
        </Text>
        {ACTIVE_THEMES.map((c) => (
          <ColorSwatch
            onClick={() => setBoardColor(c)}
            color={c}
            key={c}
            style={{ cursor: "pointer" }}
          />
        ))}
      </Group>
      <Group>
        <Text span fw="bold" fz="lg">
          Board Size:{" "}
        </Text>
        <Slider
          w="100%"
          step={5}
          min={10}
          max={85}
          value={settings.boardSize}
          onChange={(e) => setBoardSize(e)}
        />
      </Group>
    </Paper>
  );
};

export default () => {
  return (
    <SimpleGrid
      cols={{
        md: 1,
        xl: 2,
      }}
      w="100%"
      p="md"
    >
      <Board />
      <Settings />
    </SimpleGrid>
  );
};
