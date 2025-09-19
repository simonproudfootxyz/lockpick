import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Game from "./Game";
import GameSetup from "./GameSetup";
import JoinGame from "./JoinGame";
import "./App.css";

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<GameSetup />} />
          <Route path="/join" element={<JoinGame />} />
          <Route path="/game/:gameId" element={<Game />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
