# Lockpick Multiplayer Server

This is the WebSocket server for the Lockpick multiplayer card game.

## Features

- **Real-time multiplayer** with WebSocket connections
- **Room-based gameplay** with 6-character room codes
- **Player management** with names and connection status
- **Game state persistence** with file-based storage
- **Spectator support** for full rooms
- **Automatic cleanup** of inactive rooms and old games

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Start the Server

**Development:**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

The server will start on port 3001 by default.

### 3. Environment Variables

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)

## API Endpoints

- `GET /api/health` - Server health check
- `GET /api/rooms` - List of active rooms

## WebSocket Events

### Client to Server:

- `create-room` - Create a new game room
- `join-room` - Join an existing room
- `start-game` - Start the game (host only)
- `play-card` - Play a card on a pile
- `end-turn` - End current player's turn
- `cant-play` - Handle "can't play" scenario
- `get-room-list` - Get list of available rooms

### Server to Client:

- `room-created` - Room creation successful
- `room-joined` - Successfully joined room
- `player-joined` - Another player joined
- `player-left` - A player left the room
- `game-started` - Game has started
- `card-played` - A card was played
- `turn-ended` - Turn ended
- `cant-play` - Can't play scenario
- `room-list` - List of available rooms
- `error` - Error occurred

## Game State Persistence

Games are automatically saved to JSON files in the `saved-games/` directory:

- Saved on card plays
- Saved on turn changes
- Saved on "can't play" scenarios
- Cleaned up after 24 hours of inactivity

## Room Management

- **Room codes**: 6-character alphanumeric codes
- **Max players**: 5 players per room
- **Spectators**: Players who join after room is full
- **Auto-cleanup**: Rooms deleted after 24 hours of inactivity

## Development

The server uses:

- **Express** for HTTP server
- **Socket.IO** for WebSocket connections
- **CORS** for cross-origin requests
- **UUID** for unique identifiers

## Deployment

For production deployment, see the main README.md for deployment options including Railway, Render, Heroku, and DigitalOcean.
