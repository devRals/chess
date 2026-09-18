import {
  Text,
  Card,
  SimpleGrid,
  Stack,
  TextInput,
  Title,
  Group,
  Button,
  Modal,
  ActionIcon,
  Tooltip,
  Overlay,
  Center,
  Paper,
  ScrollArea,
} from "@mantine/core";
import { useConnection } from "./connection-context";
import { useEffect, useState } from "react";
import type { Game, ServerToClientEvents } from "~";
import { useDisclosure } from "@mantine/hooks";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
import { showNotification } from "@mantine/notifications";
import { useGameCtx } from "./game-context";
import type { DisconnectDescription, Socket } from "socket.io-client";

const GameComponent = ({ game }: { game: Game }) => {
  const { connected, socket } = useConnection();
  const {
    multiplayer: { joinedGame },
  } = useGameCtx();

  const handleJoinGame = () => {
    if (!connected) return;
    socket.emit("game:join", game.id);
  };

  return (
    <Card flex={1} p="sm">
      <Group>
        <Stack>
          <Title order={5}>{game.customName}</Title>
          <Text span>
            {game.players.white?.name || "???"} -{" "}
            {game.players.black?.name || "???"}
          </Text>
        </Stack>
        <Button
          variant="light"
          onClick={handleJoinGame}
          disabled={(joinedGame && joinedGame === game.id) || game.isFull}
        >
          Join
        </Button>
      </Group>
    </Card>
  );
};

const Games = () => {
  const [games, setGames] = useState<Game[]>([]);
  const { socket, connected } = useConnection();
  const [
    newGameModalOpened,
    { open: openNewGameModal, close: closeNewGameModal },
  ] = useDisclosure(false);
  const [newGameData, setNewGameData] = useState<{
    name: string;
    secret: string | null;
  }>({
    name: "",
    secret: null,
  });
  const { multiplayer } = useGameCtx();

  useEffect(() => {
    if (!connected) return;
    socket.emit("game:list");

    const handleRecivedGames: ServerToClientEvents["game:list_recieved"] = (
      games,
    ) => {
      setGames(games);
    };

    const handleJoinedGame: ServerToClientEvents["game:joined"] = (game) => {
      showNotification({
        message: "Entered new Game",
      });
      multiplayer.joinGame(game.id);
      socket.emit("game:list");
    };

    const handleCreated: ServerToClientEvents["game:created"] = () => {
      closeNewGameModal();
      socket.emit("game:list");
    };

    const handleDeleted: ServerToClientEvents["game:deleted"] = () => {
      socket.emit("game:list");
    };

    socket.on("game:joined", handleJoinedGame);
    socket.on("game:list_recieved", handleRecivedGames);
    socket.on("game:created", handleCreated);
    socket.on("game:deleted", handleDeleted);

    const handleJoinFailed: ServerToClientEvents["game:join_failed"] = ({
      message,
    }) => {
      showNotification({
        message,
        color: "red",
      });
    };

    socket.on("game:join_failed", handleJoinFailed);

    return () => {
      socket.off("game:created", handleCreated);
      socket.off("game:list_recieved", handleRecivedGames);
      socket.off("game:deleted", handleDeleted);
      socket.off("game:joined", handleJoinedGame);

      socket.off("game:join_failed", handleJoinFailed);
    };
  }, [socket, connected, closeNewGameModal, multiplayer]);

  const handleNewGame = () => {
    if (!connected) return;
    // Automatically joins the room
    socket.emit("game:create", newGameData.name);
  };

  return (
    <Stack>
      <Group>
        <TextInput
          label="Search Games"
          rightSection={
            <Tooltip label="Create new game">
              <ActionIcon onClick={openNewGameModal} variant="light" size="lg">
                <PlusIcon />
              </ActionIcon>
            </Tooltip>
          }
        />
      </Group>
      <Modal opened={newGameModalOpened} onClose={closeNewGameModal}>
        <Stack>
          <TextInput
            label="Custom Name"
            value={newGameData.name}
            onChange={(e) =>
              setNewGameData((p) => ({ ...p, name: e.target.value }))
            }
          />
          <Button fullWidth onClick={handleNewGame}>
            Create New Game
          </Button>
        </Stack>
      </Modal>
      <ScrollArea mih="80vh">
        <Stack>
          {games.map((g) => (
            <GameComponent key={g.id} game={g} />
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
};

export default () => {
  const { connected, socket, connect } = useConnection();
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    if (!connected) return;

    const connectHandle = () => {
      showNotification({
        message: "Connected the to server",
        color: "green",
      });
      socket.emit("player:create", playerName);
    };

    const disconnectHandle = (
      reason: Socket.DisconnectReason,
      desc: DisconnectDescription | undefined,
    ) => {
      console.error("Disconnect reason: ", reason, desc);
      showNotification({
        message: "Disconnected from server",
        color: "red",
      });
    };

    socket.on("connect", connectHandle);
    socket.on("disconnect", disconnectHandle);

    return () => {
      socket.off("connect", connectHandle);
      socket.off("disconnect", disconnectHandle);
    };
  }, [socket, connected, playerName]);

  const handleConnectServer = () => {
    if (playerName.length === 0) {
      showNotification({
        message: "Empty names are not accepted",
        color: "red",
      });
      return;
    }

    connect();
  };

  return (
    <SimpleGrid cols={{ md: 2, lg: 1 }}>
      {!connected && (
        <Overlay pos="fixed">
          <Center>
            <Paper component={Stack} withBorder p="sm" m="sm">
              <TextInput
                label="Name"
                value={playerName}
                onChange={(e) => setPlayerName(e.currentTarget.value)}
              />
              <Button onClick={handleConnectServer}>
                Connect to the server
              </Button>
            </Paper>
          </Center>
        </Overlay>
      )}

      <Games />
      <Stack></Stack>
    </SimpleGrid>
  );
};
