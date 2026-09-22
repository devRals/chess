import {
  ActionIcon,
  Affix,
  Anchor,
  Box,
  Center,
  ColorSwatch,
  Divider,
  Drawer,
  Group,
  Image,
  Paper,
  Slider,
  Stack,
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
  type Move,
  type SquareIndex,
} from "@devrals/chess";
import { BLACK_PIECES, WHITE_PIECES } from "./assets/pieces";
import { GameState, useGameCtx } from "./game-context";
import { useEffect, useState } from "react";
import { useClickOutside, useDisclosure } from "@mantine/hooks";
import { HeartIcon } from "@phosphor-icons/react/dist/ssr";
import { useConnection } from "./connection-context";
import { showNotification } from "@mantine/notifications";
import { type ServerToClientEvents } from "~";

const WhitePieceRenderer: Record<PieceType, React.ReactNode> = {
  king: WHITE_PIECES.king,
  queen: WHITE_PIECES.queen,
  rook: WHITE_PIECES.rook,
  bishop: WHITE_PIECES.bishop,
  knight: WHITE_PIECES.knight,
  pawn: WHITE_PIECES.pawn,
} as const;

const SELECTION_COLOR: MantineColor = "teal";

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

const Square = ({
  size,
  squareColor,
  piece,
  squareIndex,
  targetSelection,
  color,
  visualize,
  ...rest
}: {
  squareIndex: number;
  squareColor: ChessColor;
  piece?: Piece;
  size: number;
  targetSelection: boolean;
  color: MantineColor;
  visualize?: PieceWithPosition | null;
} & React.ComponentProps<"div">) => {
  const finalColor = squareColor === "black" ? "dark.8" : `${color}.5`;

  const displayPiece = visualize ? visualize : piece;
  const pieceRenderer =
    displayPiece && displayPiece.color === "black"
      ? BlackPieceRenderer
      : WhitePieceRenderer;

  return (
    <Center
      id={`square-${squareIndex}`}
      bg={finalColor}
      w={size}
      bd="2px solid dark.3"
      h={size}
      pos="relative"
      {...rest}
    >
      {displayPiece && (
        <Image
          src={pieceRenderer[displayPiece.type]}
          w="100%"
          draggable={false}
          style={{ pointerEvents: "none" }}
          opacity={visualize ? 0.5 : 1}
        />
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
          style={{ pointerEvents: "none" }}
        />
      )}
    </Center>
  );
};

// bruh
const BOARD_COLORS = [
  [true, false, true, false, true, false, true, false],
  [false, true, false, true, false, true, false, true],
  [true, false, true, false, true, false, true, false],
  [false, true, false, true, false, true, false, true],
  [true, false, true, false, true, false, true, false],
  [false, true, false, true, false, true, false, true],
  [true, false, true, false, true, false, true, false],
  [false, true, false, true, false, true, false, true],
] as const;

export const Board = ({
  onMove,
  rotated = false,
}: {
  rotated: boolean;
  onMove: (move: Move) => void;
}) => {
  const { chess, settings, state, setGameState } = useGameCtx();
  const [targetSelections, setTargetSelections] = useState<BitBoard>(0n);
  const [from, setFrom] = useState<SquareIndex>(0);
  const [selectedPiece, setSelectedPiece] = useState<PieceWithPosition | null>(
    null,
  );
  const [
    promotionPanelOpened,
    { open: openPromotionPanel, close: closePromotionPanel },
  ] = useDisclosure(false);
  const [targetPromotionSquare, setTargetPromotionSquare] =
    useState<SquareType>("a1");
  const [draggingPiece, setDraggingPiece] = useState<PieceWithPosition | null>(
    null,
  );
  const [dragTarget, setDragTarget] = useState<SquareIndex | null>(null);

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
        const isItALegalMove = (targetSquareBitboard & targetSelections) !== 0n;
        if (isItALegalMove) {
          // Check if its a promotion
          const promotionSquares = RANK[1] | RANK[8];
          const isItAPromotion =
            selectedPiece &&
            selectedPiece.type === "pawn" &&
            (targetSquareBitboard & promotionSquares) !== 0n;
          if (isItAPromotion) {
            setTargetPromotionSquare(getSquareFromIndex(to));
            openPromotionPanel();
            break;
          }

          const move: Move = { from, to };
          onMove(move);
          setSelectedPiece(null);
          setTargetSelections(0n);
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

  const handleDragDropMove = (e: React.DragEvent) => {
    e.preventDefault();

    if (!draggingPiece) return;

    const to = Number(e.currentTarget.id.replace("square-", "")) as SquareIndex;

    const move: Move = {
      from: draggingPiece.position,
      to,
    };

    onMove(move);
    setDraggingPiece(null);
  };

  const emptyDragImage =
    typeof Image !== "undefined" ? new window.Image() : null;
  if (emptyDragImage) {
    emptyDragImage.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7";
  }

  return (
    <Box>
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
          </Group>
        </Paper>
      )}
      {BOARD_COLORS.map((rank, i) => (
        <Group key={`row-${i.toString()}`} id={`row-${i}`} gap={0}>
          {rank.map((isWhite, j) => {
            const real_i = BOARD_COLORS.length - 1 - i;
            const real_j = j;

            let squareIndex = (real_i * 8 + real_j) as SquareIndex;

            // Square Index can be up to 63. Not 64
            squareIndex = rotated
              ? ((63 - squareIndex) as SquareIndex)
              : squareIndex;

            const isSelectableTarget =
              state === GameState.SelectingTarget &&
              ((1n << BigInt(squareIndex)) & BigInt(targetSelections)) !== 0n;

            const pieceAtThisSquare = chess.getPieceAt(squareIndex);

            return (
              <Square
                squareIndex={squareIndex}
                targetSelection={isSelectableTarget}
                color={settings.boardTheme}
                key={`square-${squareIndex}`}
                size={settings.boardSize}
                piece={chess.getPieceAt(squareIndex)}
                squareColor={isWhite ? "white" : "black"}
                onClick={() => handleMove(squareIndex)}
                onDrop={handleDragDropMove}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (pieceAtThisSquare || dragTarget !== squareIndex) {
                    setDragTarget(squareIndex);
                  }
                }}
                onDragStart={(e) => {
                  if (!pieceAtThisSquare) return;

                  if (emptyDragImage) {
                    e.dataTransfer.setDragImage(emptyDragImage, 0, 0);
                  }
                  e.dataTransfer.effectAllowed = "move";

                  setDraggingPiece({
                    position: squareIndex,
                    ...pieceAtThisSquare,
                  });
                }}
                draggable={!!pieceAtThisSquare}
                onDragLeave={() => {
                  if (dragTarget === squareIndex) {
                    setDragTarget(null);
                  }
                }}
                visualize={
                  draggingPiece && dragTarget === squareIndex
                    ? draggingPiece
                    : null
                }
                onDragEnd={() => {
                  setDraggingPiece(null);
                  setDragTarget(null);
                }}
              />
            );
          })}
        </Group>
      ))}
    </Box>
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
  const { connected, socket } = useConnection();
  const { isItMyTurn } = useGameCtx();
  const [boardRotated, setBoardRotated] = useState(false);
  const [bufferedMove, setBufferedMove] = useState<Move | null>(null);

  useEffect(() => {
    if (!connected) return;

    const newGameHandle: ServerToClientEvents["game:started"] = (game) => {
      // ummm
      const isUserisBlack = socket.id === game.players.black!.id;
      setBoardRotated(isUserisBlack);
      showNotification({
        message: `${game.players.white!.name} vs ${game.players.black!.name}`,
        title: "Game started",
      });
    };

    const moveFailedHandle: ServerToClientEvents["game:move_failed"] = (
      message,
    ) => {
      showNotification({
        message,
        color: "red",
      });
    };

    socket.on("game:started", newGameHandle);
    socket.on("game:move_failed", moveFailedHandle);

    return () => {
      socket.off("game:started", newGameHandle);
      socket.off("game:move_failed", moveFailedHandle);
    };
  }, [socket, connected]);

  useEffect(() => {
    if (connected && bufferedMove) {
      socket.emit("game:move", bufferedMove);
      setBufferedMove(null);
    }
  }, [connected, socket, bufferedMove]);

  const onMove: Parameters<typeof Board>[number]["onMove"] = (move) => {
    if (!isItMyTurn) return;
    if (!connected) {
      setBufferedMove(move);
      return;
    }

    socket.emit("game:move", move);
  };

  return (
    <>
      <Board onMove={onMove} rotated={boardRotated} />
      <Settings />
    </>
  );
};
