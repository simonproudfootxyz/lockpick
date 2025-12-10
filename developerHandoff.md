# Developer Handoff: Lockpick Game

This document explains the overall structure of the Lockpick card game, how the client and server work, and where to find the core logic that drives gameplay. Use it to get up to speed quickly before making changes.

---

## Client Application

### Routing and Entry Points

The React application lives under `src/` and is routed via `src/App.js`.

```20:27:src/App.js
        <Routes>
          <Route path="/" element={<GameSetup />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/join/:roomCode" element={<JoinViaLink />} />
          <Route path="/game/:gameId" element={<Game />} />
          <Route path="/multiplayer/:gameId" element={<MultiplayerGame />} />
```

- `/` renders `GameSetup` for single-player configuration or jumping to multiplayer.
- `/game/:gameId` launches the single-player React game.
- `/multiplayer/:gameId` hosts the multiplayer experience driven by Socket.IO.
- `/lobby` and `/join/:roomCode` power room creation, invites, and name capture.

### Single-Player Flow (`src/Game.js`)

`Game` is the primary component for solo play. On mount it tries to hydrate state from `localStorage` (`lockpick_game_${gameId}`); if none exists it calls `initializeGame`, which constructs a deck sized to the chosen player count and deals opening hands.

```80:109:src/Game.js
  const initializeGame = useCallback(
    (players) => {
      const deck = createDeck(players);
      const handSize = getHandSize(players);
      const totalCards = getTotalCardCount(players);
      const maxCard = getMaxCardValue(players);
      const descendingStart = getDescendingStartValue(players);
      const playerHands = [];
      for (let i = 0; i < players; i++) {
        playerHands.push(deck.splice(0, handSize));
      }
      const newGameState = {
        playerHands,
        currentPlayer: 0,
        discardPiles: [[], [], [], []],
        deck,
        gameWon: false,
        cardsPlayedThisTurn: 0,
        turnComplete: false,
        totalCards,
        maxCard,
        descendingStart,
      };
      setGameState(newGameState);
      saveGameState(newGameState);
    },
    [saveGameState]
  );
```

Key interactions mutate `gameState` and immediately resync to `localStorage` so reloads continue the same session. Examples:

- `handlePlayCard` validates a move via `canPlayCard`, updates piles/hands, and checks `isGameWon`.
- `endTurn` enforces the “play 2 cards (or 1 if deck empty)” rule, refills the hand, and advances the player index.
- `handleCantPlayCard` marks the game over and opens `GameOverModal`.

```166:215:src/Game.js
  const handlePlayCard = (pileIndex) => {
    if (!selectedCard) return;
    const pile = gameState.discardPiles[pileIndex];
    const pileType = pileIndex < 2 ? "ascending" : "descending";
    if (!canPlayCard(selectedCard, pile, pileType)) {
      alert(`Card ${selectedCard} cannot be played on this ${pileType} pile!`);
      return;
    }
    const newDiscardPiles = [...gameState.discardPiles];
    const newPlayerHands = [...gameState.playerHands];
    newDiscardPiles[pileIndex].push(selectedCard);
    const cardIndex =
      newPlayerHands[gameState.currentPlayer].indexOf(selectedCard);
    if (cardIndex > -1) {
      newPlayerHands[gameState.currentPlayer].splice(cardIndex, 1);
    }
    const newCardsPlayedThisTurn = gameState.cardsPlayedThisTurn + 1;
    const deckEmpty = gameState.deck.length === 0;
    const minCardsRequired = deckEmpty ? 1 : 2;
    const newGameState = {
      ...gameState,
      playerHands: newPlayerHands,
      discardPiles: newDiscardPiles,
      cardsPlayedThisTurn: newCardsPlayedThisTurn,
      turnComplete: newCardsPlayedThisTurn >= minCardsRequired,
      gameWon: isGameWon(
        newDiscardPiles,
        gameState.totalCards,
        gameState.playerHands.length
      ),
    };
    setGameState(newGameState);
    saveGameState(newGameState);
  };
```

### Shared Game Logic (`src/gameLogic.js`)

Utility functions encapsulate all rules so both the client and server stay in sync:

- `createDeck` sizes the deck relative to player count and shuffles with Fisher-Yates.
- `getHandSize`, `getMaxCardValue`, and `getDescendingStartValue` standardize configuration.
- `canPlayCard` enforces ascending/descending pile rules plus the ±10 reverse move.
- `isGameWon` and `getGameStatus` calculate progress and UI messaging.

```19:67:src/gameLogic.js
export const createDeck = (numPlayers = 1) => {
  const deck = [];
  const maxCard = getMaxCardValue(numPlayers);
  for (let i = 2; i <= maxCard; i++) {
    deck.push(i);
  }
  return shuffleDeck(deck);
};
export const canPlayCard = (card, pile, pileType) => {
  if (pile.length === 0) return true;
  const topCard = pile[pile.length - 1];
  if (pileType === "ascending") {
    return card > topCard || card === topCard - 10;
  }
  return card < topCard || card === topCard + 10;
};
```

### UI Components Worth Knowing

- `Card` (`src/Card.js`): stateless presentation component with CSS-driven highlights for selection/playability.
- `PlayerHand` (`src/PlayerHand.js`): adds drag-and-drop reordering and visually marks playable cards by checking all piles with `canPlayCard`.
- `DiscardPile` (`src/DiscardPile.js`): shows the last card played, exposes “View” (opens `PileViewModal`) and “Play” controls.
- `GameOverModal` and `RulesModal`: reused in both single- and multiplayer flows.

## Multiplayer Client

### Socket Lifecycle (`src/hooks/useSocket.js`)

Wraps Socket.IO, exposes `socket`, `isConnected`, `emit`, `on`, `off`, and tracks connection quality by measuring ping/pong latency. Reconnection attempts and transport fallbacks are already configured.

```16:64:src/hooks/useSocket.js
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
    socket.on("connect", () => {
      setIsConnected(true);
      setError(null);
      setConnectionQuality("good");
    });
    socket.on("disconnect", (reason) => {
      setIsConnected(false);
    });
```

### Lobby and Join Flow

`Lobby` (`src/components/Lobby.js`) and `JoinViaLink` (`src/components/JoinViaLink.js`) collect display names, call `validate-name` on the server to reserve them, and store a `playerId` in `sessionStorage` via `storePlayerIdentity`.

```125:198:src/components/Lobby.js
    socket.emit("validate-name", payload, (response) => {
      if (!response?.ok) {
        setNameError(response?.error || "Failed to validate name.");
        setIsSubmittingName(false);
        return;
      }
      if (response.isTaken) {
        setNameError(
          `${trimmedName} is already taken, please choose another name`
        );
        setIsSubmittingName(false);
        return;
      }
      const reservedPlayerId = response.playerId;
      setPlayerId(reservedPlayerId);
      storePlayerIdentity(reservedPlayerId, trimmedName);
      if (action === "create") {
        emit("create-room", {
          playerName: trimmedName,
          playerId: reservedPlayerId,
        });
      } else {
        emit("join-room", {
          roomCode: pendingRoomCode,
          playerName: trimmedName,
          playerId: reservedPlayerId,
        });
      }
```

### Multiplayer Gameplay (`src/components/MultiplayerGame.js`)

This component mirrors the single-player UI but treats the server as the source of truth. It listens to events like `game-started`, `card-played`, `turn-ended`, and `cant-play`, and will only allow local interactions when the current player index matches the local socket/player identity.

```202:242:src/components/MultiplayerGame.js
  const handleCardPlayed = useCallback(
    (data) => {
      setGameState(data.gameState);
      setGameStatus(data.status);
      setSelectedCard(null);
      setSelectedPile(null);
      updateGameOverState(data.gameState);
    },
    [updateGameOverState]
  );
  const handleEndTurn = () => {
    if (!gameState || isSpectator) return;
    emit("end-turn", {
      roomCode: gameId,
    });
  };
  const handleCantPlayCard = () => {
    if (!gameState || isSpectator || gameState.gameOver) return;
    emit("cant-play", {
      roomCode: gameId,
    });
  };
```

Note that hand sorting is server-driven (`sort-hand` event with `order` set to `"asc"` or `"desc"`) to keep all clients synchronized; `PlayerHand`’s `onHandReorder` is effectively disabled in multiplayer.

## Server Application

### Express + Socket.IO Bootstrap (`server/server.js`)

The Node server enables CORS, rate limiting, Helmet, and hosts Socket.IO. Every gameplay action has a dedicated handler that validates the caller, delegates to shared game logic, and broadcasts updated state.

```139:195:server/server.js
  socket.on("create-room", async (data = {}) => {
    try {
      const { playerName, playerId } = data;
      if (!isValidPlayerName(playerName)) {
        socket.emit("error", { message: "Player name is required" });
        return;
      }
      const room = await roomManager.createRoom(
        socket.id,
        sanitizeName(playerName),
        playerId
      );
      socket.emit("room-created", {
        roomCode: room.code,
        isHost: true,
        playerId: room.players.get(socket.id)?.playerId,
        players: Array.from(room.players.values()),
        spectators: Array.from(room.spectators.values()),
      });
      socket.join(room.code);
```

Handlers worth scanning:

- `join-room`: reconnection-aware, enforces reserved IDs and unique names.
- `start-game`: only host can launch and only with ≥2 players.
- `play-card`, `end-turn`, `cant-play`, `sort-hand` (ascending/descending): all call server `gameLogic` and persist results.

### Server Game Logic (`server/gameLogic.js`)

Mirrors the client helpers but acts as the authority for multiplayer. It supports deterministic deals (`DEV_MODE=deterministic-deal`) for debugging and returns `{ success, gameState }` responses that callers can inspect.

```178:223:server/gameLogic.js
const playCard = (gameState, card, pileIndex) => {
  const pile = gameState.discardPiles[pileIndex];
  const pileType = pileIndex < 2 ? "ascending" : "descending";
  if (!canPlayCard(card, pile, pileType)) {
    return { success: false, error: `Card ${card} cannot be played on this ${pileType} pile` };
  }
  const newGameState = { ...gameState };
  const newDiscardPiles = [...newGameState.discardPiles];
  const newPlayerHands = [...newGameState.playerHands];
  newDiscardPiles[pileIndex].push(card);
  const cardIndex = newPlayerHands[newGameState.currentPlayer].indexOf(card);
  if (cardIndex > -1) {
    newPlayerHands[newGameState.currentPlayer].splice(cardIndex, 1);
  }
  newGameState.discardPiles = newDiscardPiles;
  newGameState.playerHands = newPlayerHands;
  newGameState.cardsPlayedThisTurn += 1;
  const deckEmpty = newGameState.deck.length === 0;
  newGameState.turnComplete =
    newGameState.cardsPlayedThisTurn >= (deckEmpty ? 1 : 2);
  newGameState.gameWon = isGameWon(
    newDiscardPiles,
    newGameState.totalCards,
    newGameState.playerHands.length
  );
  return { success: true, gameState: newGameState };
};
```

### Room and Player Management (`server/roomManager.js`)

`RoomManager` persists rooms to disk, enforces a 10-player limit, reserves names via pending reservations, and handles reconnection logic by matching `playerId`.

```266:493:server/roomManager.js
  async joinRoom(roomCode, socketId, playerName, playerId = null) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: "Room not found" };
    }
    let effectivePlayerId = playerId;
    if (!effectivePlayerId || typeof effectivePlayerId !== "string") {
      if (this.isTestEnvironment) {
        effectivePlayerId = this.generatePlayerId();
      } else {
        return { success: false, error: "Player identifier required" };
      }
    }
    const existingPlayer = Array.from(room.players.values()).find(
      (participant) => participant.playerId === normalizedPlayerId
    );
    if (existingPlayer) {
      // reconnection path updates socket id and connection state...
    }
    // When the game is already in progress or the room is full, callers are demoted to spectators.
    room.players.set(socketId, {
      socketId: socketId,
      playerId: normalizedPlayerId,
      name: playerName,
      isHost: false,
      isConnected: true,
      playerIndex: playerIndex,
    });
    this.playerRooms.set(socketId, roomCode);
    await this.saveRoom(roomCode, room);
    return { success: true, isSpectator: false, room };
  }
```

### Persistence (`server/persistence.js`)

`GamePersistence` writes `saved-games/game-<room>.json` snapshots and clears files older than 24 hours. Every successful server mutation triggers `saveGame`, so reconnecting players receive the latest state.

```22:47:server/persistence.js
  async saveGame(roomCode, gameState) {
    try {
      const gameData = {
        roomCode,
        gameState,
        savedAt: Date.now(),
        version: "1.0.0",
      };
      const filePath = this.getGameFilePath(roomCode);
      await fs.writeFile(filePath, JSON.stringify(gameData, null, 2));
      console.log(`Game saved for room ${roomCode}`);
    } catch (error) {
      console.error(`Error saving game for room ${roomCode}:`, error);
    }
  }
```

## Gameplay Rules Recap

- Deck size scales with player count (`max card = 99 + 10 per player above 5`).
- Two ascending piles start at 1; two descending piles start at 100 (or `maxCard + 1`).
- Players must play at least two cards per turn while the deck has cards; requirement drops to one once the deck is empty.
- Reverse move: play exactly 10 less on ascending piles or 10 more on descending piles.
- Single-player keeps state purely client-side; multiplayer changes must go through Socket.IO handlers.

## Tests and Tooling

- Client tests: `src/__tests__/MultiplayerGame.test.js`.
- Server tests: `server/__tests__/*.test.js`.
- `TESTING.md` summarizes how to run `npm test` in each workspace.
- Set `DEV_MODE=deterministic-deal` (non-production) to reproduce deterministic decks when debugging.

## Suggested Next Steps for New Developers

- Run `npm install` at the repo root and inside `server/` if not already done.
- Execute `npm test` (client) and `npm test` in `server/` before submitting changes.
- When modifying multiplayer behaviour, update both `src/components/MultiplayerGame.js` and the corresponding Socket.IO handler in `server/server.js`.
- Inspect `server/saved-*` JSON files if you need to diagnose persistence or reconnection issues.

Welcome aboard—this overview should give you the context you need to start contributing confidently.
