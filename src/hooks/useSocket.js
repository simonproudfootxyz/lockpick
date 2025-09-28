import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const useSocket = (serverUrl = "http://localhost:3001") => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState("good");
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
      setError(null);
      setConnectionQuality("good");
    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected from server:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setError("Failed to connect to server");
      setIsConnected(false);
    });

    socket.on("error", (data) => {
      console.error("Server error:", data);
      setError(data.message || "Server error occurred");
    });

    socket.on("ping", () => {
      socket.emit("pong");
    });

    socket.on("pong", () => {
      setConnectionQuality("good");
    });

    return () => {
      socket.disconnect();
    };
  }, [serverUrl]);

  useEffect(() => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    let lastPong = Date.now();

    const handlePong = () => {
      lastPong = Date.now();
    };

    socketRef.current.on("pong", handlePong);

    const pingInterval = setInterval(() => {
      if (!socketRef.current) return;

      const now = Date.now();
      const latency = now - lastPong;

      if (latency > 5000) {
        setConnectionQuality("poor");
      } else if (latency > 2000) {
        setConnectionQuality("fair");
      } else {
        setConnectionQuality("good");
      }

      socketRef.current.emit("ping");
    }, 5000);

    return () => {
      clearInterval(pingInterval);
      if (socketRef.current) {
        socketRef.current.off("pong", handlePong);
      }
    };
  }, [isConnected]);

  const emit = (event, data, callback) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data, callback);
    } else {
      console.warn("Socket not connected, cannot emit event:", event);
    }
  };

  const on = (event, callback) => {
    socketRef.current?.on(event, callback);
  };

  const off = (event, callback) => {
    socketRef.current?.off(event, callback);
  };

  return {
    socket: socketRef.current,
    isConnected,
    error,
    emit,
    on,
    off,
    connectionQuality,
    reconnect: () => socketRef.current?.connect(),
    disconnect: () => socketRef.current?.disconnect(),
  };
};

export default useSocket;
