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

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type ClientSocketActions = {
  connect: () => void;
  disconnect: () => void;
};
type ConnectionContext = ClientSocketActions &
  (
    | {
        socket: null;
        connected: false;
      }
    | {
        socket: ClientSocket;
        connected: true;
      }
  );

export const ConnectionContext = createContext<ConnectionContext | null>(null);

export const ConnectionProvider = ({ children }: PropsWithChildren) => {
  const socketRef = useRef<ClientSocket>(null);
  const [connected, setConnected] = useState(false);

  const connect = () => {
    const socket = socketRef.current;
    if (!socket) {
      console.error("socket is undefined");
      return;
    }
    socket.connect();
    setConnected(true);
  };

  const disconnect = () => {
    if (!socketRef.current) return;
    const socket = socketRef.current;
    socket.disconnect();
    setConnected(false);
  };

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(
        import.meta.env.VITE_SERVER_URL || "http://localhost:3000",
        {
          autoConnect: false,
        },
      );
    }

    const handleDisconnect = () => {
      if (!socketRef.current) return;
      const socket = socketRef.current;
      socket.disconnect();
      setConnected(false);
    };

    const handleConnect = () => {
      const socket = socketRef.current;
      if (!socket) return;
      socket.connect();
      setConnected(true);
    };

    const socket = socketRef.current;

    socket.on("disconnect", handleDisconnect);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("disconnect", handleDisconnect);
      socket.off("connect", handleConnect);
      socket.disconnect();
    };
  }, []);

  return (
    <ConnectionContext
      value={
        {
          socket: socketRef.current,
          connected,
          connect,
          disconnect,
        } as ConnectionContext
      }
    >
      {children}
    </ConnectionContext>
  );
};

export function useConnection() {
  const cx = use(ConnectionContext);
  if (!cx) throw new Error("wrap the app with `ConnectionProvider`");
  return cx;
}
