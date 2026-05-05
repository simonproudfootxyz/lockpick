# Lockpick — Developer Handoff

**Audience:** Senior engineer / technical director onboarding to the project.
**Goal:** Provide enough architectural context, behavioural detail, and code references to make a meaningful contribution within the first day.

Lockpick is a cooperative card game inspired by *The Game* (Steffen Benndorf). Players collaboratively empty a custom-sized deck onto four shared piles (two ascending, two descending) under increasingly tight constraints. The codebase ships **two fully separate runtime experiences** that share rules but not state:

- **Single-player** — a self-contained React app whose game state lives entirely in the browser (`localStorage`).
- **Multiplayer** — a thin React client driven by a Node + Socket.IO server which is the sole source of truth for game state, persisted to disk.

The two paths intentionally diverge at the controller layer (`src/Game.js` vs `src/components/MultiplayerGame.js`) but reuse the same presentational components (`Card`, `PlayerHand`, `DiscardPile`, modals). Rules are duplicated in `src/gameLogic.js` and `server/gameLogic.js` — keeping them in sync is the most important invariant when modifying gameplay.

---

## 1. Repository Layout

```
lockpick/
├── public/                    # CRA static assets
├── src/                       # React client (CRA, react-scripts 5)
│   ├── App.js                 # Top-level router
│   ├── Game.js                # Single-player controller (client-authoritative)
│   ├── GameSetup.js           # Landing page: SP launch + multiplayer entry
│   ├── gameLogic.js           # Client rules (deck, canPlayCard, isGameWon, …)
│   ├── Card.js / DiscardPile.js / PlayerHand.js  # Shared presentation
│   ├── RulesContent.js        # The rules copy reused by GameSetup + the rules modal
│   ├── context/
│   │   └── ModalContext.js    # ModalProvider + useModal() (single-slot)
│   ├── components/
│   │   ├── Lobby.js           # Multiplayer lobby (create/join)
│   │   ├── JoinViaLink.js     # /join/:roomCode invite landing
│   │   ├── NamePromptModal.js # Reusable name + role picker
│   │   ├── MultiplayerGame.js # Multiplayer controller (server-authoritative)
│   │   ├── PlayerList.js      # Sidebar roster + invite link
│   │   ├── ConnectionStatus.js
│   │   ├── Button.js / Toggle.js  # Design-system primitives
│   │   ├── Modal/             # Shared modal shell (overlay, header, sizes)
│   │   └── modals/            # Content-only bodies: Rules, GameOver, PileView, Confirm
│   ├── hooks/
│   │   ├── useSocket.js       # Socket.IO lifecycle + connection quality
│   │   └── useWindowSize.js
│   ├── utils/playerIdentity.js  # sessionStorage wrapper for {playerId,name}
│   └── __tests__/MultiplayerGame.test.js
├── server/                    # Node 18+ Socket.IO/Express server
│   ├── server.js              # HTTP + Socket.IO bootstrap and event handlers
│   ├── roomManager.js         # Rooms, players, spectators, reconnection
│   ├── persistence.js         # File-backed game snapshots
│   ├── gameLogic.js           # Server rules (the authoritative copy)
│   ├── saved-rooms/           # Disk: room metadata (roster, gameState)
│   ├── saved-games/           # Disk: per-room gameState snapshots
│   └── __tests__/             # gameLogic, roomManager, integration tests
├── build/                     # CRA production bundle (served by Express in prod)
├── package.json               # Client deps + workspace scripts (dev, build:all)
├── jest.{config,server.config,minimal.config}.js
├── README.md / MULTIPLAYER_SETUP.md / TESTING.md
└── developerHandoff.md        # ← this document
```

The repo is a single npm package (not a true monorepo); the `server/` directory has its own `package.json` and is installed via `npm run install:all`.

---

## 2. Runtime Topology

```
┌─────────────────────────┐                    ┌─────────────────────────────┐
│   Browser (React SPA)   │                    │  Node Server (Express+IO)   │
│                         │   HTTPS (static)   │                             │
│  /                      │ ◀───────────────── │  Express static (prod only) │
│  /game/:id (SP)         │                    │                             │
│  /lobby                 │                    │  /api/health                │
│  /join/:roomCode        │   WebSocket        │  /api/connection-status     │
│  /multiplayer/:roomCode │ ◀──────────────────│  Socket.IO (rooms, gameplay)│
│                         │   Socket.IO        │                             │
│  localStorage (SP save) │                    │  saved-rooms/*.json         │
│  sessionStorage (id+name)│                   │  saved-games/*.json         │
└─────────────────────────┘                    └─────────────────────────────┘
```

In development, `npm run dev` runs CRA on `:3000` and the API on `:3001` (with `concurrently`). In production the React bundle is served by the same Node process at `/`, and Socket.IO upgrades on the same port (Railway-friendly).

---

## 3. Client Routing

```20:27:src/App.js
        <Routes>
          <Route path="/" element={<GameSetup />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/join/:roomCode" element={<JoinViaLink />} />
          <Route path="/game/:gameId" element={<Game />} />
          <Route path="/multiplayer/:gameId" element={<MultiplayerGame />} />
```

| Route | Component | Purpose |
|---|---|---|
| `/` | `GameSetup` | Landing page; launches SP with a generated `gameId` (`?players=1`), or routes to `/lobby` |
| `/game/:gameId` | `Game` | Single-player; `gameId` is just an opaque key for `localStorage` |
| `/lobby` | `Lobby` | Create or join a multiplayer room |
| `/join/:roomCode` | `JoinViaLink` | Deep-link landing for shared invite URLs |
| `/multiplayer/:gameId` | `MultiplayerGame` | Multiplayer game; `gameId` is the 6-char room code |
| `*` | redirect `/` | Fallback |

`GameSetup` currently hard-codes `DEFAULT_PLAYER_COUNT = 1`; the multi-seat single-player flow is reachable only via direct URL (`/game/:id?players=N`). This is intentional — physical-table SP for >1 player is a power-user feature.

---

## 4. Shared Game Rules (the spec)

Both `src/gameLogic.js` and `server/gameLogic.js` implement the same model. Treat the **server copy as authoritative**; if a multiplayer rule change is made, port it to the client copy too (and to client-side UI affordances such as `PlayerHand`'s "playable" hint).

### 4.1 Deck sizing (scales with player count)

```19:27:src/gameLogic.js
export const createDeck = (numPlayers = 1) => {
  const deck = [];
  const maxCard = getMaxCardValue(numPlayers);
  for (let i = 2; i <= maxCard; i++) {
    deck.push(i);
  }
  return shuffleDeck(deck);
};
```

| Helper | Formula | Notes |
|---|---|---|
| `getMaxCardValue(n)` | `99 + max(0, n - 5) * 10` | 99 for 1–5 players; +10 per extra player up to 10 |
| `getTotalCardCount(n)` | `maxCard - 1` | Cards 2..max — i.e. 98 cards in a small game |
| `getDescendingStartValue(n)` | `maxCard >= 100 ? maxCard + 1 : 100` | The "anchor" shown above empty descending piles |
| `getHandSize(n)` | 1→8, 2→7, 3–5→6, 6+→5 | Tuned for round duration |
| `shuffleDeck` | Fisher-Yates | Pure, returns a new array |

The deck always omits `1` (it is the implicit floor of every ascending pile) and omits the descending anchor (100 / max+1). The board has four piles fixed in `discardPiles[0..3]`: indices 0–1 are ascending, 2–3 are descending.

### 4.2 Legal moves

```48:84:src/gameLogic.js
export const canPlayCard = (card, pile, pileType, options = {}) => {
  const { allowMultiplesOfTenReverse = false } = options;
  if (pile.length === 0) return true;
  const topCard = pile[pile.length - 1];
  if (pileType === "ascending") {
    if (card > topCard) return true;
    if (allowMultiplesOfTenReverse && card < topCard) {
      return (topCard - card) % 10 === 0;
    }
    return card === topCard - 10;
  } else {
    if (card < topCard) return true;
    if (allowMultiplesOfTenReverse && card > topCard) {
      return (card - topCard) % 10 === 0;
    }
    return card === topCard + 10;
  }
};
```

The default, ship-facing rule on both client and server is: **strictly monotone OR the ±10 backtrack**. The `allowMultiplesOfTenReverse` flag is **only present on the client** and is exposed only through the Konami code easter egg in single-player (see §6.4). The server's `canPlayCard` deliberately has no such option — a multiplayer client cannot enable it.

### 4.3 Turn structure

- While `deck.length > 0`: a turn requires ≥ 2 cards.
- Once `deck.length === 0`: a turn requires ≥ 1 card.
- After meeting the minimum, the player ends the turn, draws back up to `getHandSize`, and play passes to `(currentPlayer + 1) % playerHands.length`.
- **Win condition:** `discardPiles.flat().length === totalCards` (all cards 2..max played).
- **Loss condition:** the active player presses *I Can't Play A Card*. There is no automatic detection; the player asserts it.

### 4.4 The `gameState` object (canonical shape)

This is the single shape passed between client and server (and persisted to disk). Every field below is read by at least one UI component:

```js
{
  playerHands: number[][],     // playerHands[playerIndex] = current hand
  currentPlayer: number,       // index into playerHands
  discardPiles: number[][],    // length 4: [asc1, asc2, desc1, desc2]
  deck: number[],              // remaining draw pile (mutated by splice on draw)
  gameWon: boolean,
  gameOver: boolean,           // server-only: set when someone presses "Cant play"
  cardsPlayedThisTurn: number,
  turnComplete: boolean,       // ≥ minRequired played
  totalCards: number,          // computed once at init for the win check
  maxCard: number,
  descendingStart: number,
  // multiplayer-only:
  gameStarted: boolean,        // present after initializeGame on the server
  createdAt: number,           // epoch ms
  endedByPlayer: number,       // playerIndex who pressed cant-play
}
```

The single-player code only writes a subset of these (`gameStarted`, `gameOver`, `endedByPlayer` are absent). When inspecting saved games on disk, expect the full server shape.

---

## 5. Single-Player Architecture (`src/Game.js`)

The single-player flow is a classic React-state machine with localStorage hydration. There is no server involvement at all; the user can play offline.

### 5.1 Lifecycle

1. The route `/game/:gameId?players=N` mounts `Game`.
2. `gameId` is used purely as a localStorage namespace. `numPlayers` is parsed from the query string (default `1`).
3. On mount the component attempts `loadGameState()` → reads `lockpick_game_${gameId}` and validates it has the same `gameId` and `numPlayers`. If valid, the saved `gameState` is restored.
4. Otherwise `initializeGame(numPlayers)` builds a fresh deck, deals hands, and seeds an empty board.

```159:190:src/Game.js
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
    [saveGameState],
  );
```

### 5.2 Persistence

Every state mutation goes through `setGameState(...) → saveGameState(...)`. Saved JSON includes `{ gameState, timestamp, gameId, numPlayers }`. There is currently no migration story; if you change the `gameState` shape, bump the validation in `loadGameState` to drop incompatible saves.

### 5.3 Action handlers (the only places that mutate state)

| Handler | Trigger | Behaviour |
|---|---|---|
| `handleCardSelect(card, playerIndex)` | Card click in `PlayerHand` | Toggles selection; only the active player can select |
| `handlePileAssignment(pileIndex)` | Pile click (non-DnD path) | Records the chosen target pile |
| `handlePlayCard(pileIndex, cardValue?)` | "Play" button OR drop on a pile | Validates with `canPlayCard`, alerts on illegal moves, otherwise mutates `discardPiles` and the active hand, increments `cardsPlayedThisTurn`, and recomputes `turnComplete` and `gameWon` |
| `handleCardDrop(card, pileIndex)` | DnD onto a `DiscardPile` | Thin wrapper around `handlePlayCard` |
| `handleHandReorder(newHand)` | DnD within `PlayerHand` | Replaces the active player's hand wholesale |
| `sortHandAscending` / `sortHandDescending` | Sort buttons | Sort the active hand and remember the order in `lastSortOrder` |
| `handleAutoSortToggle` | Auto-Sort toggle | Sets `autoSortEnabled` (purely a client concern) |
| `endTurn` | "End Turn & Draw Cards" | Enforces the 2/1-card minimum, draws up to hand size from `deck`, applies auto-sort if enabled, advances `currentPlayer`, clears selection |
| `handleCantPlayClick` → `confirmCantPlayCard` | "I Can't Play" button | Opens a `ConfirmModalContent` via `useModal()`; on confirm, opens a `GameOverModalContent` with the cant-play message |
| `startNewGame` | Game-over modal action | `clearGameState()`, resets all local state, calls `closeModal()`, navigates back to `/` |

Win detection is reactive: a `useEffect` watches `gameState.gameWon` and calls `openModal({...})` with a "Congratulations" payload when it flips true. A `winModalShownRef` guards against re-opening on subsequent renders, and a `startNewGameRef` is used so the modal's action callback can call the latest `startNewGame` without re-firing the effect. See §7 for the modal system itself.

### 5.4 UI structure

The render is a single layout with three regions:
- **Discard piles** at the top, grouped into ascending vs descending columns (responsive collapse < 768px).
- **Player section** in the middle: `PlayerHand` for each seat (only the current seat is interactive), plus the sort controls.
- **Action bar** with `I Can't Play A Card` and `End Turn & Draw Cards`. The "Play" button lives on each `DiscardPile` (you can either select a card and click Play on a pile, or drag the card directly onto a pile).

### 5.5 The Konami code (single-player only)

A genuine product easter egg, scoped to `numPlayers === 1`. Pressing **↑ ↑ ↓ ↓ ← → ← → B A** while focused in the SP game flips `isKonamiMode` to `true`, which:

- Shows a temporary "Cheat Code Activated" toast.
- Passes `allowMultiplesOfTenReverse: true` into both `canPlayCard` (in `handlePlayCard`) and `PlayerHand`'s `isCardPlayable` hint check, so any multiple-of-10 difference becomes legal in the "wrong" direction.
- Resets to `false` whenever `numPlayers !== 1` or the user starts a new game.

This flag does **not** propagate to `server/gameLogic.canPlayCard`; multiplayer cannot opt in. If you ever want to ship a "relaxed" multiplayer mode, this is the seam to extend.

---

## 6. Multiplayer Architecture

The multiplayer experience is **server-authoritative**. The client never mutates `gameState` locally except for one optimistic case (drag-reorder, see §6.6). All gameplay flows are: client emits an event → server validates → server mutates and persists → server broadcasts → all clients render the new state.

### 6.1 Identity model

Two pieces of identity matter, and they are intentionally separated:

- **`socketId`** — ephemeral; changes on every reconnect. Used only as the *current* mailbox address.
- **`playerId`** — a server-issued UUID v4, persisted on the client in `sessionStorage` (`lockpick:player:<playerId>` → `{ name, updatedAt }`). It is the stable identity used for reconnection, name reservation, and roster mapping.

```5:18:src/utils/playerIdentity.js
export const storePlayerIdentity = (playerId, playerName) => {
  if (typeof window === "undefined") return;
  if (!playerId) return;
  try {
    const payload = { name: playerName || "", updatedAt: Date.now() };
    window.sessionStorage.setItem(getKey(playerId), JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to persist player identity", error);
  }
};
```

`playerId` is acquired in two ways:

1. **Lobby flow:** `validate-name` → server returns a freshly-generated UUID for the `create` action, or a pending reservation for `join`.
2. **Invite link flow (`/join/:roomCode`):** `JoinViaLink` calls `room-preview` to gauge whether the room is full (and whether the user must be a spectator), then `validate-name` to mint or reserve a `playerId` — same callback contract as the lobby.

Both flows ultimately navigate to `/multiplayer/:roomCode?playerId=<uuid>`, with the player name carried in `location.state` for instant rendering. `MultiplayerGame` re-reads from `sessionStorage` if the state object is missing (e.g. the user pasted the URL directly).

### 6.2 Lobby flow (`Lobby.js` + `NamePromptModal.js`)

Creating a room:

1. User clicks "Create Room" → `openNamePrompt('create')` → modal opens.
2. On submit, `socket.emit('validate-name', { action: 'create', playerName })` returns `{ ok, playerId }`.
3. Client persists identity, then `socket.emit('create-room', { playerName, playerId })`.
4. Server responds with `room-created` → client navigates to `/multiplayer/<code>?playerId=…` with `joinAsPlayer: true` in route state.

Joining a room from the lobby:

1. User enters a 6-char code and submits → `openNamePrompt('join', code)`.
2. Before the modal displays the role toggle, the client fires `room-preview` (`{ ok, playerCount, spectatorCount, maxPlayers, gameInProgress, canJoinAsPlayer }`) so the modal can show "this room already has the maximum number of players" if applicable.
3. On submit, `validate-name` is called with the room code. The server checks for duplicate names, mints a `playerId`, and **creates a 60-second reservation** keyed by `(roomCode, playerId)` so a malicious peer cannot race-claim that name.
4. The client emits `join-room` with the reserved `playerId`. The server consumes the reservation in `joinRoom` (`consumePendingPlayer`) before adding the player to the roster.

```60:78:server/roomManager.js
    let reservations = this.pendingPlayers.get(roomCode);
    if (!reservations) {
      reservations = new Map();
      this.pendingPlayers.set(roomCode, reservations);
    }
    const normalizedName = playerName.trim().toLowerCase();
    for (const [playerId, reservation] of reservations.entries()) {
      if (reservation.normalizedName === normalizedName) {
        reservations.delete(playerId);
      }
    }
    const playerId = this.generatePlayerId();
    const expiresAt = Date.now() + ttlMs;
    reservations.set(playerId, { playerName, normalizedName, expiresAt });
```

Reservations expire if not consumed; in `test` environments the consumption check is bypassed.

### 6.3 Server bootstrap (`server/server.js`)

The server is an Express app wrapping a Socket.IO server. Key middleware stack, in order:

- **HTTPS upgrade redirect** in production (`x-forwarded-proto`)
- **Helmet** (CSP disabled — see comment in code; relax-or-tighten if you re-enable it)
- **compression**
- **CORS** with origins read from `CLIENT_ORIGIN` (comma-separated env var) plus localhost dev fallbacks
- **JSON body parser** (64 KB limit)
- **express-rate-limit** (default 120 req / 60s, configurable via `RATE_LIMIT_*`)

Two REST endpoints exist for ops:
- `GET /api/health` → `{ status: "OK", timestamp }`
- `GET /api/connection-status?room=XYZ` → either room-level connection details or a global summary

In production the server also serves the CRA build (`build/`) and falls back to `index.html` for client-side routing.

### 6.4 Socket.IO event surface

All gameplay events live on a single Socket.IO namespace (default). The server enforces three invariants per gameplay event:

1. The socket maps to a known player in a known room (`room.players.get(socket.id)`).
2. `room.gameState` exists.
3. `room.gameState.currentPlayer === player.playerIndex` (turn ownership).

Violating any of these yields a per-socket `error` emit, never a state mutation.

#### Client → Server

| Event | Payload | Validation | Effect |
|---|---|---|---|
| `create-room` | `{ playerName, playerId? }` | name regex/length, optional UUID | Creates a new room with this socket as host (`playerIndex: 0`) |
| `join-room` | `{ roomCode, playerName, playerId, joinAsPlayer? }` | name + 6-char alnum + UUID; reservation must match | Reconnects (matching `playerId`) or adds player/spectator; if game in progress or room full, demotes to spectator |
| `room-preview` | `{ roomCode }` | code valid + room exists | ACK callback returns occupancy + `canJoinAsPlayer` |
| `validate-name` | `{ action: "create" \| "join", roomCode?, playerName, playerId? }` | name + (room when joining) | ACK with `playerId` (reserves on join) and `roomStatus` snapshot |
| `start-game` | `{ roomCode }` | caller is host; `players.size >= 2` | `initializeGame(players.size)` → broadcast `game-started` |
| `play-card` | `{ roomCode, card, pileIndex }` | turn ownership | `playCard()` → broadcast `card-played` |
| `end-turn` | `{ roomCode, autoSort?, sortOrder? }` | turn ownership; minimum cards met | `endTurn({ autoSortEnabled, sortOrder })` → broadcast `turn-ended` |
| `cant-play` | `{ roomCode }` | turn ownership | `handleCantPlay()` sets `gameOver` and `endedByPlayer` → broadcast `cant-play` |
| `sort-hand` | `{ roomCode, order: "asc" \| "desc" }` | turn ownership | `sortCurrentPlayerHand()` → broadcast `hand-sorted` |
| `reorder-hand` | `{ roomCode, hand: number[] }` | turn ownership; `hand` is a permutation of the current hand | `reorderCurrentPlayerHand()` → broadcast `hand-reordered` |
| `ping` | — | — | Server replies `pong` (used by `useSocket` for connection-quality heuristics) |

#### Server → Client (broadcasts unless noted)

| Event | Payload | Notes |
|---|---|---|
| `room-created` | `{ roomCode, isHost, playerId, players, spectators }` | Emitted only to the creator |
| `room-joined` | `{ roomCode, isHost, isSpectator, playerId, players, spectators, gameState }` | Emitted only to the joiner |
| `player-joined` | `{ player, isSpectator, players, spectators }` | Broadcast to room (excluding joiner) |
| `player-left` | `{ wasPlayer, wasSpectator, players, spectators }` | Broadcast on disconnect |
| `game-started` | `{ gameState, status }` | Whole room |
| `card-played` | `{ gameState, status, playerName, card, pileIndex }` | Whole room |
| `turn-ended` | `{ gameState, status, playerName }` | Whole room |
| `cant-play` | `{ gameState, status, playerName }` | Whole room — also sets `gameOver: true` |
| `hand-sorted` / `hand-reordered` | `{ gameState, status, playerName }` | Whole room (so spectators stay in sync) |
| `error` | `{ message }` | Targeted to the offending socket |

### 6.5 Room lifecycle (`server/roomManager.js`)

Rooms are an in-memory `Map<roomCode, Room>`, mirrored to disk in `server/saved-rooms/room-<CODE>.json` after every meaningful mutation. On boot, `loadAllRooms()` reads every file back into memory and marks every participant `isConnected: false` until they reconnect.

The room shape:

```js
{
  code: "ABC123",
  host: socketId,                // first host's original socket id (informational)
  players: Map<socketId, Player>,
  spectators: Map<socketId, Spectator>,
  gameState: GameState | null,
  maxPlayers: 10,
  createdAt, lastActivity,
}
```

Each `Player` carries `{ socketId, playerId, name, isHost, isConnected, playerIndex, avatar, lastSeen? }`. `playerIndex` is assigned on first join (= current `players.size`) and is the link to `gameState.currentPlayer` and `playerHands[i]`. **Indices are not reassigned when a player permanently leaves.** This is fine in practice because the leave path also tears down the room when no players remain, but if you ever ship "kick player mid-game" you must consider re-indexing.

#### Avatar assignment (server-authoritative)

Each player and spectator is stamped with an `avatar` string when they first join a room. The pool is defined at the top of `server/roomManager.js`:

```js
const AVATAR_POOL = ["Seth", "TheSmoke", "Kimbap", "Precious"];
```

`pickAvatarForRoom(room)` picks an unused avatar when one is available (so a 4-player room shows four distinct characters) and falls back to a random pick from the full pool when the room exceeds the pool size. The same helper is used at all three creation sites — `createRoom`, the new-player branch of `joinRoom`, and `addSpectator` — so reconnecting players keep the avatar already on their roster entry instead of being reassigned.

`ensurePlayerAvatars(room)` is called from `loadRoom` alongside `ensurePlayerIds`, so rooms saved before this field existed are upgraded transparently on the next server boot.

The avatar flows to clients as a normal field on the player object — `sanitizeParticipant` spreads the participant, so `room-joined`, `player-joined`, and the disconnect rebroadcasts carry it without extra plumbing. On the client, `src/components/PlayerList.js` maps the name to the SVG asset via a small `AVATAR_BY_NAME` lookup, falling back to `Seth` for unknown values (defensive against version skew between client and server). There is no client-side persistence — the server is the single source of truth, which is what makes the same player render identically across all browsers and what guarantees a fresh avatar on each new room (even when the same person uses the same name).

#### Reconnection

`handlePlayerReconnection(socketId, playerId, playerName)` runs *before* the standard `joinRoom` path. It searches every room for a participant whose `playerId` matches and is currently disconnected; if found, it swaps the socketId, marks them connected, and persists. If no match by `playerId`, it falls back to a `playerName` match. This is what makes refreshes seamless even after the server restarts.

Reconnections are also handled inline in `joinRoom`: if the supplied `playerId` already exists in the roster, the player's socket id is updated rather than appended.

#### Disconnect grace period

```601:644:server/server.js
  socket.on("disconnect", async (reason) => {
    console.log(`Player ${socket.id} disconnected: ${reason}`);
    await roomManager.markPlayerDisconnected(socket.id);
    if (
      reason !== "io server disconnect" &&
      reason !== "io client disconnect"
    ) {
      setTimeout(async () => {
        const result = await roomManager.leaveRoom(socket.id);
        // … notify remaining players, delete room if empty …
      }, 10000); // 10 second delay for reconnection
    } else {
      // Immediate removal for intentional disconnects
```

Network-induced disconnects get a 10-second grace window; explicit client/server disconnects evict immediately. Empty rooms are deleted with an additional 5-second debounce in `leaveRoom`. `cleanupInactiveRooms` runs hourly and reaps anything older than 24 h of inactivity.

#### Spectator demotion

Three situations turn a joiner into a spectator:

1. They asked to be one (`joinAsPlayer: false` from `NamePromptModal`).
2. The game is already in progress (`room.gameState != null`).
3. The room is at `maxPlayers` (10).

Spectators see the full board and roster but `MultiplayerGame` short-circuits all interactive handlers when `isSpectator` is true.

### 6.6 Multiplayer client (`src/components/MultiplayerGame.js`)

A few patterns are worth flagging:

- **Single source of truth.** Every gameplay-affecting socket event (`card-played`, `turn-ended`, `cant-play`, `hand-sorted`, `hand-reordered`, `game-started`, `room-joined`) overwrites local `gameState` wholesale via `setGameState(data.gameState)`. There is no diffing.
- **Optimistic reorder, only.** `handleHandReorder` is the one place where the client mutates `gameState` before the server replies. This avoids a visible "jump" while dragging cards within the hand. The server's `reorder-hand` ACK (`hand-reordered`) is then accepted as canonical.
- **Auto-sort on end-turn is server-driven.** When the player toggles Auto-Sort on, the client tracks `autoSortEnabled` and `lastSortOrder` locally. On `end-turn` it sends `{ autoSort, sortOrder }` so the server can sort the *replenished* hand consistently for everyone (including spectators). The "Sort Asc / Desc" buttons emit a separate `sort-hand` event that runs immediately and is also broadcast.
- **Local seat resolution.** `localPlayerIndex` is derived from `players.find(p => p.socketId === socketId)`. All "is it my turn" gating uses `localPlayerIndex === gameState.currentPlayer`. Spectators get `-1`.
- **Connection lifecycle.** A second `useEffect` listens to raw `socket.on('connect' / 'disconnect')` and resets `hasJoinedRoom`/`joinAttemptsRef` so that on reconnect the client re-emits `join-room`. The server's reconnection logic recognises the `playerId` and slots the user back in.
- **Drag and drop into piles.** `PlayerHand` writes `application/lockpick-card` JSON onto the drag payload; `DiscardPile` reads it and calls `onCardDrop(card, pileIndex)`, which delegates to `handlePlayCard`.

### 6.7 `useSocket` hook

`useSocket` initializes a single `socket.io-client` instance with reconnection enabled (5 attempts, 1–5 s delay, 20 s timeout). Beyond the basic API (`emit`, `on`, `off`), it tracks **connection quality** by measuring the gap between the client's outgoing `ping` and the server's `pong` every 5 seconds and bucketing it as `good | fair | poor`. The hook is consumed by `Lobby`, `JoinViaLink`, and `MultiplayerGame`.

### 6.8 Persistence

Two distinct persistence layers, intentionally separated:

- `server/persistence.js` (`GamePersistence`) — writes per-room `gameState` snapshots to `server/saved-games/game-<CODE>.json` after every successful mutation. `cleanupOldGames` deletes anything mtime-older than 24 h.
- `server/roomManager.js` — writes the **whole room object** (roster + last-known `gameState`) to `server/saved-rooms/room-<CODE>.json` so the room itself can be restored after a server restart; `gameState` is duplicated here. Players coming back find both their identity and the in-progress game.

If you change the game-state shape, both files must be backward-compatible (or you must delete the saved files; there is no migration system).

---

## 7. Modal System

All in-app modals (rules, game-over, pile inspection, confirm dialogs) flow through a single React Context. The goals were: open and close modals from anywhere without prop-drilling, share one set of base styles, and structurally guarantee that only one modal is open at a time.

### 7.1 Building blocks

- [src/components/Modal/Modal.js](src/components/Modal/Modal.js) — the **shell**. Owns the overlay, the centered container, the header (title + close button), the size variants (`sm` / `md` / `lg` / `xl`), the Esc-key handler, the click-outside behavior, and the body-scroll lock. It does not know about content.
- [src/components/Modal/Modal.css](src/components/Modal/Modal.css) — the single source of truth for `.modal-overlay`, `.modal`, `.modal--{size}`, `.modal__header`, `.modal__title`, `.modal__close`, `.modal__body`, and the `modalSlideIn` keyframes. Uses the existing `--modal-background` CSS variable so it inherits the rest of the design system.
- [src/context/ModalContext.js](src/context/ModalContext.js) — exports `ModalProvider` and `useModal()`. Holds a **single-slot** state (not a stack); calling `openModal(config)` while another modal is open replaces it. This is what enforces the "only one at a time" invariant — there is no opt-in.
- [src/components/modals/](src/components/modals/) — content-only components, one per modal type: `RulesModalContent`, `GameOverModalContent`, `PileViewModalContent`, `ConfirmModalContent`. Each renders just the body; the surrounding chrome is contributed by the shell.

The provider is mounted once, in [src/App.js](src/App.js), inside `<Router>` so that modals survive navigations between routes:

```js
<Router>
  <ModalProvider>
    <Routes>...</Routes>
  </ModalProvider>
</Router>
```

### 7.2 Opening a modal

From any descendant of `ModalProvider`:

```js
const { openModal, closeModal, isOpen } = useModal();

openModal({
  title: "Lockpick Game Rules",   // optional; renders the header if present
  size: "md",                      // sm | md | lg | xl (default md)
  closeOnBackdrop: true,           // default true; set false for blocking modals
  hideClose: false,                // default false; hides the X button if true
  content: <RulesModalContent />,  // either JSX...
});
```

The `content` prop accepts **either JSX or a render function** of the form `({ close }) => <ConfirmModalContent ... onConfirm={() => { close(); doThing(); }} />`. The render-function form is the recommended pattern for confirm-style modals because the buttons inside the content can call `close()` without re-importing `useModal()`. Game-over modals use it too so `close()` runs after the action completes.

### 7.3 Behavior guarantees

- **Single-slot.** Calling `openModal` while another modal is open replaces it. There is no concept of stacking. If you ever want a "modal opens another modal" flow, the second `openModal` call cleanly swaps the first.
- **Escape and backdrop close.** Both invoke `closeModal()`. Opt out per modal with `closeOnBackdrop: false` (and/or `hideClose: true` if you also want to hide the X). The win/game-over modals use `closeOnBackdrop: false` so a stray click can't dismiss the only path to "Start New Game".
- **Body scroll lock.** While a modal is open, `document.body.style.overflow` is set to `hidden` and restored on close. This is handled by the shell, not the consumer.
- **`onClose` callback.** `openModal({ onClose })` fires when `closeModal()` runs (including via Esc or backdrop). Useful for cleanup that should happen regardless of how the modal was dismissed.

### 7.4 Adding a new modal

1. Create `src/components/modals/MyThingModalContent.js` (and a matching `.css` if it has unique styles). The component renders only the body — no overlay, no header, no close button.
2. From the component that should trigger it, call `openModal({ title, size, content: <MyThingModalContent ... /> })`. That's it.

Do **not** add new top-level overlay/container CSS; the shell handles all of that. If you find yourself reaching for `position: fixed` and a `z-index: 1000`, you're at the wrong layer.

### 7.5 Effect-driven modals (the `Ref` pattern)

When a modal is opened from a `useEffect` (e.g. the win-state check in `Game.js` and the game-over branch in `MultiplayerGame.js`), two things matter:

- Use a `…ShownRef` (e.g. `winModalShownRef`, `gameOverModalShownRef`) so you only open the modal once per transition. Reset the ref when the underlying condition becomes false.
- If the modal's action callback needs to call a function that itself depends on a lot of state (e.g. `startNewGame`), reference it via a `…Ref` that is reassigned on every render (`startNewGameRef.current = startNewGame`). This avoids putting `startNewGame` in the effect's dependency array — which would otherwise cause the modal to re-open every time `startNewGame`'s identity changes.

This is the same pattern used in both single-player and multiplayer controllers; copy it when adding new effect-driven modals.

### 7.6 Known outlier: `NamePromptModal`

`src/components/NamePromptModal.js` predates the modal context refactor and still ships its own overlay/container. It is used during the lobby/join flows and was left untouched because it has tightly coupled async validation (`validate-name` round-trip + role toggle + `room-preview` data) that warranted its own pass. It is the only modal in the app that is not yet migrated — folding it into the shared system is a clean follow-up: convert its body into a content-only component, then trigger it via `openModal({ content: ({ close }) => <NamePromptContent ... /> })`.

---

## 8. Security, Validation, and Sanitization

All untrusted data is validated server-side via `validator`:

```830:853:server/server.js
function isValidPlayerName(name) {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= 32 &&
    validator.isWhitelisted(
      trimmed,
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '-_"
    )
  );
}

function isValidRoomCode(code) {
  if (typeof code !== "string") return false;
  const trimmed = code.trim();
  return trimmed.length === 6 && validator.isAlphanumeric(trimmed);
}

function isValidPlayerId(id) {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  return validator.isUUID(trimmed);
}
```

Names are also `validator.escape`-d before being stored, and `sanitizeParticipant` re-escapes on every broadcast as a defense in depth. Room codes are normalized to uppercase. The CSP in Helmet is currently disabled (see comment); re-enable when you have an asset audit ready.

---

## 9. Local Development & Tooling

```bash
# One-time
npm run install:all          # installs root + server deps

# Dev
npm run dev                  # CRA :3000 + nodemon :3001 via concurrently

# Build / production
npm run build:client         # CRA build into ./build
npm run start:server         # NODE_ENV=production node server/server.js (serves /build too)
```

### Useful environment variables

| Var | Default | Notes |
|---|---|---|
| `PORT` | 3001 | Server port |
| `NODE_ENV` | development | `production` enables HTTPS redirect, static serving, disables `DEV_MODE` flags |
| `CLIENT_ORIGIN` | (empty) | Comma-separated allowed origins for CORS + Socket.IO |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | 60000 / 120 | Express rate limiter tuning |
| `SOCKET_PING_TIMEOUT_MS` / `SOCKET_PING_INTERVAL_MS` | 30000 / 10000 | Socket.IO heartbeat |
| `DEV_MODE` | (unset) | Set to `deterministic-deal` (non-prod) to deal the deck in descending order; useful for reproducing edge cases |
| `REACT_APP_SOCKET_URL` | `window.location.origin` | Override the Socket.IO endpoint at build time |

### Tests

- **Client:** `npm test` (CRA Jest, `src/__tests__/`).
- **Server:** `npm run test:server` (uses `jest.server.config.js`, `server/__tests__/`).
- **All:** `npm run test:all`.
- **Coverage:** `npm run test:coverage`.

The server suite covers `gameLogic`, `roomManager`, the wire protocol (integration), and the higher-level requirements. It is the de-facto specification for tricky multiplayer cases (reconnection, spectator promotion). Consult before changing socket handlers.

### Deterministic deal

`isDeterministicDealEnabled()` returns true only in non-production environments when `DEV_MODE=deterministic-deal`. The deck is then sorted descending instead of shuffled, which makes the early game effectively impossible (highest cards on top). Use this when reproducing a "stuck game" defect or driving tests through a known sequence.

### Konami code

A single-player-only easter egg; see §5.5. Triggering it during gameplay can be a useful smoke test that the `allowMultiplesOfTenReverse` plumbing in `PlayerHand` still flags playable hints correctly.

---

## 10. Things to be aware of when contributing

- **Two copies of `gameLogic`.** They must stay in sync. The server copy is authoritative; the client copy is what powers single-player and the "playable card" hints in `PlayerHand`. The Konami `allowMultiplesOfTenReverse` flag exists *only* on the client; do not let it leak into multiplayer code paths.
- **`gameState` shape drift.** Adding a field requires touching both `gameLogic`s, the server save files (or accepting that old saves will be loaded with the field undefined), and the client controllers. The single-player `gameState` deliberately omits server-only fields (`gameStarted`, `gameOver`, `endedByPlayer`).
- **`playerIndex` is stable for the room's lifetime.** Don't try to compact indices when a player leaves — `playerHands` is keyed by index.
- **Server is not idempotent on duplicate emits.** The handlers assume the client only emits once per intent. The client takes care of this (`hasJoinedRoom`, `joinAttemptsRef`, debounced UI buttons). Keep that contract if you add new actions.
- **`leaveRoom` has a debounce.** Empty rooms aren't deleted instantly; reconnecting host within ~5 s will re-claim the room. Tests rely on this timing.
- **Room codes are 6 alphanumeric chars** (`generateRoomCode`). Collisions are not detected explicitly — they're statistically negligible at expected scale, but if you ever expect 100k+ concurrent rooms, add a collision check.
- **Names are not unique across rooms**, only within a room. Don't rely on `name` as a global identifier — use `playerId`.
- **Avatar pool is duplicated.** `AVATAR_POOL` in `server/roomManager.js` (the strings the server can assign) and `AVATAR_BY_NAME` in `src/components/PlayerList.js` (the strings the client knows how to render) must stay in sync. When you add a new avatar you need to (a) drop the SVG in `src/assets/avatars/`, (b) add it to both lists, and (c) ship the server before the client — old clients will gracefully fall back to `Seth` for unknown names but never the reverse.
- **The single-player route is the only place `localStorage` is used.** Multiplayer relies on `sessionStorage` for identity (so closing a tab clears the cached name binding for that `playerId`).
- **All modals go through `ModalContext`.** Don't add bespoke overlay JSX or new `position: fixed; z-index: 1000` rules; build a content-only component in `src/components/modals/` and call `openModal({ content: <YourThing /> })`. The provider enforces a single-slot invariant — opening a second modal closes the first. See §7.
- **Drag-and-drop** uses a custom MIME type (`application/lockpick-card`) carrying JSON; if you add new card-source surfaces, set both that payload and a `text/plain` fallback (see `PlayerHand.handleDragStart`).
- **Helmet CSP is disabled** in `server.js`. If you turn it on, audit Socket.IO and CRA's inline-style usage.
- **`process.env.DEV_MODE` is sticky for the server's lifetime.** Restart the server after changing it.

---

## 11. Suggested first contributions

If you want to get hands-on quickly:

1. Run `npm run install:all && npm run dev`, open two browser windows, exercise the lobby → invite → reconnect flow end-to-end.
2. Step through `server/__tests__/integration.test.js` with a debugger; that file is the clearest narrative of how a multiplayer game actually plays.
3. Make a small change that touches both `gameLogic`s (e.g. add a derived field to `getGameStatus`) and observe how it propagates through `Game.js` and `MultiplayerGame.js`. This will inoculate you against the "two copies" trap.

Welcome aboard. The architecture is small enough that you'll have the whole map in your head within a day; the persistence and reconnection corners are the only places where surprises live.
