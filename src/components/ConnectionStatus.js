import React from "react";
import "./ConnectionStatus.css";

const ConnectionStatus = ({ isConnected, error, onReconnect }) => {
  return (
    <div
      className={`connection-status ${
        isConnected ? "connected" : "disconnected"
      }`}
    >
      <div className="status-indicator">
        <div
          className={`status-dot ${isConnected ? "connected" : "disconnected"}`}
        ></div>
      </div>
      <div className="status-text">
        {isConnected ? (
          <span>Connected to server</span>
        ) : (
          <span>Disconnected from server</span>
        )}
        {error && (
          <div className="error-message">
            <small>{error}</small>
            {onReconnect && (
              <button onClick={onReconnect} className="reconnect-btn">
                Reconnect
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
