import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const useSocket = (serverUrl = "http://localhost:3001") => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Create socket connection
    const newSocket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
    });

    socketRef.current = newSocket;

    // Connection event handlers
    newSocket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
      setError(null);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setError("Failed to connect to server");
      setIsConnected(false);
    });

    newSocket.on("error", (data) => {
      console.error("Server error:", data);
      setError(data.message || "Server error occurred");
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [serverUrl]);

  // Helper function to emit events with error handling
  const emit = (event, data, callback) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data, callback);
    } else {
      console.warn("Socket not connected, cannot emit event:", event);
    }
  };

  // Helper function to listen to events
  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  // Helper function to remove event listeners
  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    error,
    emit,
    on,
    off,
    connect: () => socketRef.current?.connect(),
    disconnect: () => socketRef.current?.disconnect(),
  };
};

export default useSocket;
