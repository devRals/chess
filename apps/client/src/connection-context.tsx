import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "~";

type ConnectionState = "failed" | "disconnected" | "connected" | "connecting";
type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
interface ConnectionContext {
  socket: ClientSocket | null;
  connectionState: ConnectionState;
}

export const ConnectionContext = createContext<ConnectionContext | null>(null);

export const ConnectionProvider = ({ children }: PropsWithChildren) => {
  const socketRef = useRef<Socket | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(
        import.meta.env.VITE_SERVER_URL || "http://localhost:3000",
      );
    }

    const socket = socketRef.current;

    const handleConnect = () => {
      setConnectionState("connected");
    };
    const handleError = (_error: Error) => {
      setConnectionState("failed");
    };
    const handleDisconnect = () => {
      setConnectionState("disconnected");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("error", handleError);
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.disconnect();
    };
  }, []);

  return (
    <ConnectionContext value={{ socket: socketRef.current, connectionState }}>
      {children}
    </ConnectionContext>
  );
};

export function useConnection() {
  const cx = use(ConnectionContext);
  if (!cx) throw new Error("wrap the app with `ConnectionProvider`");
  return cx;
}
