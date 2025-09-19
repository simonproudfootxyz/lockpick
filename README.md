# Lockpick Card Game

A multiplayer card game built with React and WebSockets.

## Features

- Real-time multiplayer gameplay
- Game state persistence
- Invite system with shareable codes
- Responsive design
- Cross-browser compatibility

## Development Setup

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

The application requires two servers to run:

1. **React Development Server** (port 3000)
2. **WebSocket Server** (port 3001)

#### Option 1: Run Both Servers Simultaneously (Recommended)

```bash
npm run dev
```

This will start both the React app and WebSocket server concurrently.

#### Option 2: Run Servers Separately

**Terminal 1 - WebSocket Server:**

```bash
npm run server
```

**Terminal 2 - React App:**

```bash
npm start
```

### Accessing the Game

- **React App**: http://localhost:3000
- **WebSocket Server**: http://localhost:3001

## How to Play

1. **Start a Game**: Click "Start Game" on the home screen
2. **Invite Players**: Click "Invite Players" and share the invite code
3. **Join a Game**: Click "Join Game" and enter an invite code
4. **Play**: Follow the game rules displayed in the Rules modal

## Game Rules

- Try to discard all 98 cards onto four discard piles
- Two piles go in ascending order (1 ↑)
- Two piles go in descending order (100 ↓)
- Special reverse rule: Play a card exactly 10 less on ascending piles
- Special reverse rule: Play a card exactly 10 more on descending piles
- Play all 98 cards to win!

## Multiplayer Features

- **Real-time synchronization**: All players see moves instantly
- **Invite system**: Share invite codes to let others join
- **Connection status**: Visual indicators for connection state
- **Offline fallback**: Game works even when WebSocket server is unavailable

## Troubleshooting

### WebSocket Connection Issues

If you see connection errors:

1. **Make sure the WebSocket server is running**:

   ```bash
   npm run server
   ```

2. **Check that port 3001 is available**

3. **Try refreshing the browser page**

4. **Check the browser console for detailed error messages**

### Game State Not Syncing

- Ensure all players are using the same invite code
- Check that the WebSocket server is running
- Verify network connectivity between players

## Production Deployment

For production deployment:

1. Build the React app:

   ```bash
   npm run build
   ```

2. Deploy the WebSocket server to a hosting service
3. Update the WebSocket server URL in `src/services/websocketService.js`

## Technology Stack

- **Frontend**: React, React Router, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO
- **Styling**: CSS3 with modern features
- **State Management**: React Hooks, localStorage
- **Real-time Communication**: WebSockets via Socket.IO
