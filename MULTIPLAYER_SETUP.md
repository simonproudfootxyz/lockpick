# Lockpick Multiplayer Setup Guide

This guide will help you set up and run the Lockpick multiplayer card game.

## Quick Start

### 1. Install All Dependencies

```bash
npm run install:all
```

### 2. Start Development (Both Client and Server)

```bash
npm run dev
```

This will start:

- React client on http://localhost:3000
- WebSocket server on http://localhost:3001

### 3. Open the Game

Navigate to http://localhost:3000 in your browser.

## Manual Setup

### Client Setup

```bash
# Install client dependencies
npm install

# Start React development server
npm start
```

### Server Setup

```bash
# Navigate to server directory
cd server

# Install server dependencies
npm install

# Start server in development mode
npm run dev

# Or start in production mode
npm start
```

## How to Play Multiplayer

### 1. Create a Room

1. Go to the main menu
2. Click "Join Multiplayer Lobby"
3. Enter your name
4. Click "Create Room"
5. Share the 6-character room code with friends

### 2. Join a Room

1. Go to the main menu
2. Click "Join Multiplayer Lobby"
3. Enter your name
4. Enter the room code shared by the host
5. Click "Join Room"

### 3. Start the Game

- Only the room host can start the game
- Need at least 2 players to start
- Up to 5 players can join
- Additional players become spectators

## Features

### Real-time Multiplayer

- Live card plays visible to all players
- Turn-based gameplay with real-time updates
- Connection status indicators

### Room Management

- 6-character room codes (e.g., "ABC123")
- Private rooms with invite codes
- Automatic cleanup of inactive rooms
- Player and spectator support

### Game Persistence

- Games saved automatically on important events
- Survives server restarts
- 24-hour cleanup of old games

## Development

### File Structure

```
lockpick/
├── server/                 # WebSocket server
│   ├── server.js          # Main server file
│   ├── roomManager.js     # Room management logic
│   ├── persistence.js     # Game state persistence
│   ├── gameLogic.js       # Server-side game logic
│   └── package.json       # Server dependencies
├── src/
│   ├── components/
│   │   ├── Lobby.js       # Multiplayer lobby
│   │   ├── MultiplayerGame.js  # Multiplayer game component
│   │   ├── PlayerList.js  # Player list component
│   │   └── ConnectionStatus.js  # Connection indicator
│   ├── hooks/
│   │   └── useSocket.js   # WebSocket hook
│   └── ...
└── package.json           # Client dependencies
```

### Key Components

**Lobby.js** - Room creation and joining interface
**MultiplayerGame.js** - Main multiplayer game component
**PlayerList.js** - Shows connected players and spectators
**ConnectionStatus.js** - WebSocket connection indicator
**useSocket.js** - Custom hook for WebSocket communication

### Server Architecture

**server.js** - Main server with Socket.IO event handling
**roomManager.js** - Manages rooms, players, and spectators
**persistence.js** - File-based game state persistence
**gameLogic.js** - Server-side game logic and validation

## Testing Multiplayer

### Local Testing

1. Open multiple browser tabs/windows
2. Navigate to http://localhost:3000
3. Create a room in one tab
4. Join the room in other tabs
5. Test the multiplayer functionality

### Network Testing

1. Start the server: `npm run server:dev`
2. Find your local IP address
3. Update the WebSocket URL in `useSocket.js` if needed
4. Test from different devices on the same network

## Deployment

### Prerequisites

- Node.js 18+
- Railway (or Render) account with GitHub integration
- Domain (optional)

### Environment Variables

- `PORT` (Railway assigns automatically)
- `CLIENT_ORIGIN` (comma-separated allowed origins)
- `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`
- `SOCKET_PING_TIMEOUT_MS` / `SOCKET_PING_INTERVAL_MS`

### Railway Deployment Steps

1. Connect GitHub repo to Railway and create staging + production environments.
2. Configure service commands:
   - Install: `npm install`
   - Build: `npm run build:client`
   - Start: `npm run start:server`
3. Set environment variables in each environment.
4. Configure health check to `/api/health`.
5. Attach Railway domain or custom domain; verify HTTPS.
6. Update `CLIENT_ORIGIN` with deployed URL(s); redeploy if changed.
7. Optional: enable auto-deploy on merge to `main`.

### Security Checklist

- TLS enforced (middleware redirects HTTP→HTTPS in production).
- Helmet adds security headers; CORS limited to `CLIENT_ORIGIN`.
- Names & codes sanitized server-side; rate limiting enabled.
- Socket.IO ping intervals configurable via env.
- Secrets stored in Railway environment settings, not source control.
- Run `npm audit` (root + `server/`) before deployment.

### Monitoring & Maintenance

- Review Railway logs; configure alerts for crashes/high latency.
- Add uptime monitor (e.g., UptimeRobot) calling `/api/health`.
- Monthly: dependency audit, secret rotation, CORS/origin review.
- Document rollback (Railway rollback or git revert).

## Troubleshooting

### Common Issues

**"Failed to connect to server"**

- Make sure the server is running on port 3001
- Check firewall settings
- Verify no other process is using port 3001

**"Room not found"**

- Room codes are case-sensitive
- Rooms expire after 24 hours of inactivity
- Check if the room was created successfully

**"Not connected to server"**

- Check your internet connection
- Verify server is running
- Try refreshing the page

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your server environment.

## API Reference

### WebSocket Events

**Client → Server:**

- `create-room` - Create new room
- `join-room` - Join existing room
- `start-game` - Start the game
- `play-card` - Play a card
- `end-turn` - End current turn
- `cant-play` - Handle can't play scenario

**Server → Client:**

- `room-created` - Room creation success
- `room-joined` - Join success
- `game-started` - Game started
- `card-played` - Card played by player
- `turn-ended` - Turn ended
- `error` - Error occurred

## Support

For issues or questions:

1. Check the console for error messages
2. Verify server logs for server-side issues
3. Ensure all dependencies are installed
4. Check network connectivity
