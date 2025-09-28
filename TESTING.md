# Lockpick Multiplayer Game - Test Suite

This document describes the comprehensive test suite for the Lockpick multiplayer card game.

## Test Structure

The test suite is organized into several categories:

### Server-Side Tests (`server/__tests__/`)

1. **`roomManager.test.js`** - Tests room creation, player management, and room lifecycle
2. **`gameLogic.test.js`** - Tests core game logic, deck creation, and game rules
3. **`cardPlaying.test.js`** - Tests card playing rules and validation
4. **`integration.test.js`** - Tests full multiplayer game flows
5. **`requirements.test.js`** - Tests specific business requirements

### Client-Side Tests (`src/__tests__/`)

1. **`MultiplayerGame.test.js`** - Tests React component rendering and behavior

## Running Tests

### Run All Tests

```bash
npm run test:all
```

### Run Server Tests Only

```bash
npm run test:server
```

### Run Client Tests Only

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

## Test Requirements Coverage

The test suite covers all the specified requirements:

### ✅ 1. Room Creation with Host

- **Test**: `roomManager.test.js` - "should create a room with creator as host"
- **Verifies**: Room creator is automatically assigned as host

### ✅ 2. Minimum Players for Game Start

- **Test**: `requirements.test.js` - "game cannot start until room has minimum of 2 players"
- **Verifies**: Game requires at least 2 players to start

### ✅ 3. Unique Player Names

- **Test**: `requirements.test.js` - "game cannot have two players with the same name"
- **Verifies**: Duplicate player names are rejected

### ✅ 4. Maximum 5 Players

- **Test**: `requirements.test.js` - "game can have a maximum of 5 players"
- **Verifies**: Room can hold exactly 5 active players

### ✅ 5. Spectator Mode

- **Test**: `requirements.test.js` - "once room has 5 players, additional players become spectators"
- **Verifies**: 6th+ players become spectators automatically

### ✅ 6. Card Distribution

- **Test**: `requirements.test.js` - "players should receive appropriate number of cards when game starts"
- **Verifies**: Correct hand sizes based on player count

### ✅ 7. Card Playing Rules

- **Test**: `cardPlaying.test.js` - "players can play cards on piles following the rules"
- **Verifies**: Ascending/descending pile rules are enforced

### ✅ 8. Minimum Cards Before Turn End

- **Test**: `requirements.test.js` - "players must play minimum 2 cards before ending turn"
- **Verifies**: Turn completion requires 2+ cards played

### ✅ 9. Turn Order

- **Test**: `requirements.test.js` - "turn order should follow the order players joined the game"
- **Verifies**: Turn sequence matches join order

## Test Categories

### Unit Tests

- Individual function testing
- Isolated component testing
- Mock dependencies

### Integration Tests

- Full game flow testing
- Multi-player scenarios
- Server-client interaction

### Requirements Tests

- Business logic validation
- Edge case handling
- Error condition testing

## Test Data

Tests use realistic game scenarios:

- 2-5 player games
- Various card combinations
- Different game states
- Edge cases and error conditions

## Coverage Goals

- **Server Logic**: 90%+ coverage
- **Game Rules**: 100% coverage
- **Room Management**: 95%+ coverage
- **Error Handling**: 85%+ coverage

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

- Fast execution (< 30 seconds)
- No external dependencies
- Deterministic results
- Clear failure reporting

## Debugging Tests

To debug failing tests:

1. **Run specific test file**:

   ```bash
   npm run test:server -- --testNamePattern="Room Creation"
   ```

2. **Run with verbose output**:

   ```bash
   npm run test:server -- --verbose
   ```

3. **Run single test**:
   ```bash
   npm run test:server -- --testNamePattern="should create a room with creator as host"
   ```

## Test Maintenance

When adding new features:

1. **Add unit tests** for new functions
2. **Add integration tests** for new flows
3. **Update requirements tests** if business rules change
4. **Ensure coverage** remains above thresholds

## Mock Data

Tests use consistent mock data:

- Room codes: `TEST123`, `ABC123`, etc.
- Player names: `Player1`, `Player2`, etc.
- Socket IDs: `socket1`, `socket2`, etc.

This ensures predictable test results and easy debugging.

