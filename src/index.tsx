// # Theme
import "@mantine/core/styles.css";
import "./style.css";
import { MantineProvider } from "@mantine/core";

// # Root Element
import { createRoot } from "react-dom/client";

const container = document.getElementById("root")!;
const root = createRoot(container);

// # App
import { GameProvider } from "./game-context";

root.render(
  <>
    <MantineProvider forceColorScheme="dark">
      <GameProvider />
    </MantineProvider>
  </>,
);
