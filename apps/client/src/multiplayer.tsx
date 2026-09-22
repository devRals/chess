import {
  Text,
  Card,
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
  Dialog,
  Tabs,
  CheckIcon,
} from "@mantine/core";
import { useConnection } from "./connection-context";
import { useEffect, useState } from "react";
import type { Game, Player, ServerToClientEvents } from "~";
import { useDisclosure } from "@mantine/hooks";
import { PlusIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { showNotification } from "@mantine/notifications";
import type { DisconnectDescription, Socket } from "socket.io-client";

const PlayerComponent = ({ p }: { p: Player }) => {
  const { socket, connected } = useConnection();

  const handleInvitePlayer = () => {
    if (!connected) return;
    socket.emit("game:invite", p.id);
  };

  return (
    <Card>
      <Group>
        <Stack>
          <Title order={5}>{p.name || "???"}</Title>
        </Stack>
        <Button variant="light" onClick={handleInvitePlayer}>
          Invite
        </Button>
      </Group>
    </Card>
  );
};

const Players = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchString, setSearch] = useState("");
  const { socket, connected } = useConnection();

  useEffect(() => {
    if (!connected) return;
    socket.emit("player:list");

    const handleListRecieve: ServerToClientEvents["player:list_recieved"] = (
      players,
    ) => {
      setPlayers(players);
    };

    socket.on("player:list_recieved", handleListRecieve);

    return () => {
      socket.off("player:list_recieved", handleListRecieve);
    };
  }, [connected, socket]);

  const filteredPlayers = players.filter(
    (p) =>
      connected &&
      p.id !== socket.id &&
      p.name.toLowerCase().includes(searchString.toLowerCase()),
  );

  return (
    <Stack>
      <TextInput
        label="Search Players"
        value={searchString}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ScrollArea h="80vh">
        <Stack>
          {filteredPlayers.map((p) => (
            <PlayerComponent key={p.id} p={p} />
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
};

const GameComponent = ({ game }: { game: Game }) => {
  return (
    <Card flex={1} p="sm">
      <Group>
        <Stack>
          <Title order={5}>{game.customName}</Title>
          <Text span>
            <Text span fw="bold">
              Players:{" "}
            </Text>
            {game.players.white?.name || "???"} -{" "}
            {game.players.black?.name || "???"}
          </Text>
        </Stack>
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

  useEffect(() => {
    if (!connected) return;
    socket.emit("game:list");

    const handleRecivedGames: ServerToClientEvents["game:list_recieved"] = (
      games,
    ) => {
      setGames(games);
    };

    const handleCreated: ServerToClientEvents["game:created"] = () => {
      closeNewGameModal();
    };

    socket.on("game:list_recieved", handleRecivedGames);
    socket.on("game:created", handleCreated);

    return () => {
      socket.off("game:created", handleCreated);
      socket.off("game:list_recieved", handleRecivedGames);
    };
  }, [socket, connected, closeNewGameModal]);

  const handleNewGame = () => {
    if (!connected) return;
    // Automatically joins the game
    socket.emit("game:create", newGameData.name);
  };

  return (
    <Stack>
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
      <ScrollArea h="80vh" mah="90vh">
        <Stack>
          {games.map((g) => (
            <GameComponent key={g.id} game={g} />
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
};

const Chat = () => {
  return "Chat is not implemented yet :3";
};

export default () => {
  const { connected, socket, connect } = useConnection();
  const [playerName, setPlayerName] = useState("");
  const [tab, setTab] = useState("players");
  const [
    inviteDialogOpened,
    { open: openInviteDialog, close: closeInviteDialog },
  ] = useDisclosure(false);
  const [invitedBy, setInvitedBy] = useState<Player | null>(null);

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
        message: "Disconnected from server. Check the console",
        color: "red",
      });
    };

    const inviteHandle: ServerToClientEvents["game:invited"] = ({
      from: invitedBy,
    }) => {
      setInvitedBy(invitedBy);
      openInviteDialog();
    };

    const acceptInviteHandle: ServerToClientEvents["game:invite_accepted"] =
      () => {
        closeInviteDialog();
      };

    const connectErrorHandle = () => {
      showNotification({
        message: "Can't connect to the server. Check the console",
        color: "red",
      });
    };

    socket.on("game:invite_accepted", acceptInviteHandle);
    socket.on("game:invited", inviteHandle);
    socket.on("connect", connectHandle);
    socket.on("disconnect", disconnectHandle);
    socket.on("connect_error", connectErrorHandle);

    return () => {
      socket.off("connect", connectHandle);
      socket.off("game:invite_accepted", acceptInviteHandle);
      socket.off("game:invited", inviteHandle);
      socket.off("disconnect", disconnectHandle);
      socket.off("connect_error", connectErrorHandle);
    };
  }, [socket, connected, playerName, openInviteDialog, closeInviteDialog]);

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

  const handleAcceptInvite = (invitedBy: Player) => {
    if (!connected) return;
    socket.emit("game:accept_invite", invitedBy.id);
  };

  const handleDeclineInvite = () => {
    closeInviteDialog();
  };

  return (
    <>
      {invitedBy && (
        <Dialog
          opened={inviteDialogOpened}
          zIndex={99}
          onClose={closeInviteDialog}
        >
          <Group>
            <Text>{invitedBy.name} invites you to play together</Text>
            <ActionIcon
              onClick={handleDeclineInvite}
              variant="subtle"
              color="red"
            >
              <XIcon />
            </ActionIcon>
            <ActionIcon
              onClick={() => handleAcceptInvite(invitedBy!)}
              variant="light"
              color="green"
            >
              <CheckIcon size={16} />
            </ActionIcon>
          </Group>
        </Dialog>
      )}

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

      <Tabs w={450} onChange={(t) => setTab(t || "players")} value={tab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="players">Players</Tabs.Tab>
          <Tabs.Tab value="games">Games</Tabs.Tab>
          <Tabs.Tab value="chat">Chat</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="games">
          <Games />
        </Tabs.Panel>
        <Tabs.Panel value="players">
          <Players />
        </Tabs.Panel>
        <Tabs.Panel value="chat">
          <Chat />
        </Tabs.Panel>
      </Tabs>
    </>
  );
};
