// # Theme
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./style.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

// # Root Element
import { createRoot } from "react-dom/client";

const container = document.querySelector("#root")!;
const root = createRoot(container);

// # App
import { GameProvider } from "./game-context";
import { ConnectionProvider } from "./connection-context";

root.render(
  <>
    <MantineProvider forceColorScheme="dark">
      <ConnectionProvider>
        <Notifications position="bottom-left" />
        <GameProvider />
      </ConnectionProvider>
    </MantineProvider>
  </>,
);
