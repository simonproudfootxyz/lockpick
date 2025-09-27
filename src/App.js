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
import GameSetup from "./GameSetup";
import "./App.css";

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<GameSetup />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/game/:gameId" element={<Game />} />
          <Route path="/multiplayer/:gameId" element={<MultiplayerGame />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
