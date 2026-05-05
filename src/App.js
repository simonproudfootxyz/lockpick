import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Game from "./Game";
import MultiplayerGame from "./components/MultiplayerGame";
import Lobby from "./components/Lobby";
import JoinViaLink from "./components/JoinViaLink";
import GameSetup from "./GameSetup";
import { ModalProvider } from "./context/ModalContext";
import "./App.css";

function App() {
  return (
    <div className="App">
      <Router>
        <ModalProvider>
          <Routes>
            <Route path="/" element={<GameSetup />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/join/:roomCode" element={<JoinViaLink />} />
            <Route path="/game/:gameId" element={<Game />} />
            <Route path="/multiplayer/:gameId" element={<MultiplayerGame />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ModalProvider>
      </Router>
    </div>
  );
}

export default App;
