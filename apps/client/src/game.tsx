import {
  ActionIcon,
  Affix,
  Anchor,
  Box,
  Center,
  CloseIcon,
  ColorSwatch,
  Divider,
  Drawer,
  Group,
  Image,
  InputLabel,
  Paper,
  Slider,
  Stack,
  Switch,
  Text,
  Title,
  type MantineColor,
} from "@mantine/core";
import { GearIcon } from "@phosphor-icons/react";
import {
  type ChessColor,
  type PieceType,
  type BitBoard,
  type Piece,
  type Square as SquareType,
  getSquareIndex,
  getSquareFromIndex,
  RANK,
  type PieceWithPosition,
  type PromotionPieceType,
  type Square as ChessSquare,
} from "@devrals/chess";
import { BLACK_PIECES, WHITE_PIECES } from "./assets/pieces";
import { GameState, useGameCtx } from "./game-context";
import { useState } from "react";
import { useClickOutside, useDisclosure } from "@mantine/hooks";
import { HeartIcon } from "@phosphor-icons/react/dist/ssr";

const WhitePieceRenderer: Record<PieceType, React.ReactNode> = {
  king: WHITE_PIECES.king,
  queen: WHITE_PIECES.queen,
  rook: WHITE_PIECES.rook,
  bishop: WHITE_PIECES.bishop,
  knight: WHITE_PIECES.knight,
  pawn: WHITE_PIECES.pawn,
} as const;

const SELECTION_COLOR = "blue";

const BlackPieceRenderer: Record<PieceType, React.ReactNode> = {
  king: BLACK_PIECES.king,
  queen: BLACK_PIECES.queen,
  rook: BLACK_PIECES.rook,
  bishop: BLACK_PIECES.bishop,
  knight: BLACK_PIECES.knight,
  pawn: BLACK_PIECES.pawn,
} as const;

const PROMOTION_PIECES: Record<
  ChessColor,
  Record<PromotionPieceType, string>
> = {
  black: {
    queen: BLACK_PIECES.queen,
    rook: BLACK_PIECES.rook,
    bishop: BLACK_PIECES.bishop,
    knight: BLACK_PIECES.knight,
  },
  white: {
    queen: WHITE_PIECES.queen,
    rook: WHITE_PIECES.rook,
    bishop: WHITE_PIECES.bishop,
    knight: WHITE_PIECES.knight,
  },
} as const;

const ChessSquare = ({
  size,
  squareColor,
  piece,
  squareIndex,
  onCellClick,
  targetSelection,
  color,
}: {
  squareIndex: number;
  squareColor: ChessColor;
  piece?: Piece;
  size: number;
  targetSelection: boolean;
  color: MantineColor;
  onCellClick: () => void;
}) => {
  const pieceRenderer =
    piece && piece.color === "black" ? BlackPieceRenderer : WhitePieceRenderer;

  const finalColor = squareColor === "black" ? "dark.8" : `${color}.5`;

  return (
    <Center
      id={`square-${squareIndex}`}
      bg={finalColor}
      w={size}
      bd="2px solid dark.3"
      h={size}
      onClick={onCellClick}
      style={{ cursor: "grab" }}
      pos="relative"
    >
      {piece && (
        <Image src={pieceRenderer[piece.type]} w="100%" draggable={false} />
      )}
      {targetSelection && (
        <Box
          pos="absolute"
          top={0}
          left={0}
          w="100%"
          h="100%"
          bg={SELECTION_COLOR}
          opacity={0.5}
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
  const { chess, settings, state, setGameState } = useGameCtx();
  const [targetSelections, setTargetSelections] = useState<BitBoard>(0n);
  const [from, setFrom] = useState(0);
  const [selectedPiece, setSelectedPiece] = useState<PieceWithPosition | null>(
    null,
  );
  const [
    promotionPanelOpened,
    { open: openPromotionPanel, close: closePromotionPanel },
  ] = useDisclosure(false);
  const [targetPromotionSquare, setTargetPromotionSquare] =
    useState<SquareType>("a1");

  const clickOutSideRef = useClickOutside(() => {
    closePromotionPanel();
    setSelectedPiece(null);
    setGameState(GameState.SelectingPiece);
  });

  const handleMove = (square: SquareType) => {
    const squareIndex = getSquareIndex(square);

    const piece = chess.getPieceAt(square);

    switch (state) {
      case GameState.SelectingPiece: {
        if (!piece) return;
        if (piece.color !== chess.turn) return;

        setSelectedPiece({ ...piece, position: square });
        setFrom(squareIndex);
        setGameState(GameState.SelectingTarget);
        const selections = chess.getLegalMovesFor(square);
        setTargetSelections(selections);
        break;
      }

      case GameState.SelectingTarget: {
        const to = squareIndex;

        const targetSquareBitboard = 1n << BigInt(squareIndex);
        // Is a legal move
        if ((targetSquareBitboard & targetSelections) !== 0n) {
          // Check if its a promotion
          const promotionSquares = RANK[1] | RANK[8];
          if (
            selectedPiece &&
            selectedPiece.type === "pawn" &&
            (targetSquareBitboard & promotionSquares) !== 0n
          ) {
            setTargetPromotionSquare(getSquareFromIndex(to));
            openPromotionPanel();
            break;
          }

          // Board already handles the turns
          chess.move(getSquareFromIndex(from), getSquareFromIndex(to));
          setSelectedPiece(null);
          setGameState(GameState.SelectingPiece);
        } else {
          // Toggle to an another piece if pressed
          if (piece && piece.color === chess.turn) {
            // If its the same piece just toggle the state
            if (selectedPiece && square === selectedPiece.position) {
              setSelectedPiece(null);
              setGameState(GameState.SelectingPiece);
              setTargetSelections(0n);
              break;
            }
            setSelectedPiece({ ...piece, position: square });
            setFrom(squareIndex);
            const selections = chess.getLegalMovesFor(square);
            setTargetSelections(selections);
          } else {
            setSelectedPiece(null);
            setGameState(GameState.SelectingPiece);
            setTargetSelections(0n);
          }
        }
        break;
      }
    }
  };

  const handlePromotion = (promoteTo: PromotionPieceType) => {
    const pieceToPromote = selectedPiece;
    if (!pieceToPromote) throw new Error("Cannot promote an undefined piece");
    chess.promote(promoteTo, pieceToPromote, targetPromotionSquare);
    setSelectedPiece(null);
    setGameState(GameState.SelectingPiece);
    closePromotionPanel();
  };

  return (
    <Stack gap={0} h="100vh" align="center" justify="center" pos="relative">
      {selectedPiece && promotionPanelOpened && (
        <Paper
          p="lg"
          withBorder
          pos="absolute"
          bottom={0}
          right={0}
          bg="dark"
          style={{ zIndex: 1 }}
          ref={clickOutSideRef}
        >
          <Group>
            {Object.entries(PROMOTION_PIECES[selectedPiece.color]).map(
              ([pieceType, pieceImage]) => (
                <Box
                  style={{ cursor: "pointer" }}
                  w={80}
                  bd="1px solid var(--mantine-color-dark-filled)"
                  key={`promotion-${pieceType}`}
                  onClick={() =>
                    handlePromotion(pieceType as PromotionPieceType)
                  }
                >
                  <Image w="100%" src={pieceImage} />
                </Box>
              ),
            )}
            <Box
              style={{ cursor: "pointer" }}
              w={80}
              bd="1px solid var(--mantine-color-dark-filled)"
              key={`promotion-cancel`}
              onClick={() => {
                closePromotionPanel();
                setSelectedPiece(null);
                setGameState(GameState.SelectingPiece);
              }}
            >
              <CloseIcon width="100%" color="red" />
            </Box>
          </Group>
        </Paper>
      )}
      {BOARD_COLORS.map((rank, i) => (
        <Group key={`row-${i.toString()}`} id={`row-${i}`} gap={0}>
          {rank.map((isWhite, j) => {
            const real_i = BOARD_COLORS.length - 1 - i;
            const real_j = j;

            let squareIndex = real_i * 8 + real_j;

            // Square Index can be up to 63. Not 64
            squareIndex = settings.boardRotated
              ? 63 - squareIndex
              : squareIndex;

            const isSelectableTarget =
              state === GameState.SelectingTarget &&
              ((1n << BigInt(squareIndex)) & BigInt(targetSelections)) !== 0n;

            const square = getSquareFromIndex(squareIndex);

            return (
              <ChessSquare
                squareIndex={squareIndex}
                targetSelection={isSelectableTarget}
                color={settings.boardTheme}
                key={`square-${square}`}
                size={settings.boardSize}
                piece={chess.getPieceAt(square)}
                squareColor={isWhite ? "white" : "black"}
                onCellClick={() => handleMove(square)}
              />
            );
          })}
        </Group>
      ))}
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
  "pink",
  "gray",
] as const;

const Settings = () => {
  const [settingsDrawerOpened, { open, close }] = useDisclosure();
  const { settings, setSettings } = useGameCtx();

  const setBoardColor = (c: MantineColor) => {
    setSettings((s) => ({ ...s, boardTheme: c }));
  };

  const setBoardSize = (newSize: number) => {
    setSettings((s) => ({ ...s, boardSize: newSize }));
  };

  const rotateBoard = (boardRotated: boolean) => {
    setSettings((s) => ({ ...s, boardRotated }));
  };

  return (
    <>
      <Affix>
        <Paper p="sm">
          <ActionIcon onClick={open} variant="light" size="xl">
            <GearIcon size={30} />
          </ActionIcon>
        </Paper>
      </Affix>
      <Drawer opened={settingsDrawerOpened} onClose={close} position="right">
        <Stack>
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
          <Switch
            label={
              <InputLabel size="md" content="Rotate Board">
                Rotate Board
              </InputLabel>
            }
            checked={settings.boardRotated}
            onChange={(v) => rotateBoard(v.currentTarget.checked)}
          />
        </Stack>

        <Divider mt="md" />

        <Stack align="center">
          <Text ta="center" fz="lg" fw="bold">
            Made by{" "}
            <Anchor href="https://devRals.github.io/" target="_blank">
              devRals
            </Anchor>{" "}
            with lots of love.
          </Text>
          <HeartIcon weight="fill" color="red" size={30} />
        </Stack>
      </Drawer>
    </>
  );
};

export default () => {
  return (
    <>
      <Center h="100vh">
        <Board />
      </Center>
      <Settings />
    </>
  );
};
