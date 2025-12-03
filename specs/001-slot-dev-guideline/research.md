# Research: Slot Feature Development Guideline

**Branch**: `001-slot-dev-guideline` | **Date**: 2025-12-03

## Overview

This document consolidates research findings from analyzing the `sc-cascading-cluster-base` codebase to inform the developer guideline documentation.

---

## 1. Slot Features Architecture

### Decision: Document Feature System as Four-Stage Rage Meter

**Rationale**: The codebase implements a rage meter system with 4 progressive stages that trigger special effects. This is the primary feature system.

**Findings**:

| Stage | Threshold | Effect |
|-------|-----------|--------|
| 1 | 12 links | Detonates 6 random valid positions |
| 2 | 25 links | Detonates 3x3 grid area (excluding scatters) |
| 3 | 40 links | Detonates 2 random columns entirely |
| 4 | 60 links | Replaces symbols 4-7 with symbols 0-3 |

**Key Files**:
- `src/cluster-board/config.ts` - Feature thresholds (`featureRageMeterRequire`)
- `src/cluster-board/round-calculator.ts` - Stage processors (`processStage1` through `processStage4`)

**Symbol Types**:
| Symbol ID | Type |
|-----------|------|
| 0-3 | High-value symbols |
| 4-7 | Low-value symbols |
| 8 | Scatter (triggers free spins) |
| 9 | Space/Empty |

### Decision: Document Multiplier System

**Rationale**: The tile multiplier system is integral to win calculation and varies by game mode.

**Findings**:
- Normal game: Grid multipliers initialize to -1 (inactive)
- Super free spin: Grid multipliers initialize to 1 (active from start)
- Each cascade increments multiplier at winning positions
- Applied multiplier = `gridMultiplier * tileMultiplier.step` (default step: 2)
- Maximum cap: `tileMultiplier.max` (configurable, typically 64)

**Key Files**:
- `src/cluster-board/board-generator.ts` - `initializeGridMultiplier()`, `initializeGridMultiplierForSuperFreeSpin()`
- `src/game-data.ts` - `tileMultiplier.step` and `tileMultiplier.max` configuration

---

## 2. Board Generation Architecture

### Decision: Document Three-Tier Reel System

**Rationale**: The game uses separate reel configurations for different game modes with weighted selection.

**Findings**:

| Mode | Reel File | Reel Sets | Selection Weights |
|------|-----------|-----------|-------------------|
| Normal Game | `ng-reels.ts` | 3 sets | [16077, 1500, 150] |
| Free Spin | `fg-reels.ts` | 3 sets | [330, 18, 5] |
| Super Free Spin | `fg-reels.ts` | 3 sets | [325, 100, 50] (superWeight) |
| Buy Feature | `buy-fg-reels.ts` | 1 set | Fixed index 1 |

**Reel Strip Format**:
```typescript
// 3D array: [reelSetIndex][reelColumn][symbolPosition]
reels: number[][][] = [
  [ // Reel set 0
    [0, 3, 3, 2, 7, 5, 8, 6, ...], // Column 0 symbols
    [2, 2, 2, 5, 5, 0, 3, 3, ...], // Column 1 symbols
    // ... 6 columns total
  ],
  // More reel sets...
]
```

**Grid Dimensions**: 6 columns × 6 rows (36 total positions)

**Key Methods**:
- `generateNormalGameBoard()` - Normal game with NG reels
- `generateFreeSpinBoard()` - Free spin with FG reels (standard weight)
- `generateSuperFreeSpinBoard()` - Free spin with FG reels (super weight)
- `generateScatterBoardsRandom()` - Buy feature mode
- `detonateAndCascadeBoard()` - Handles symbol removal and cascade

### Decision: Document Cascade Mechanics

**Rationale**: The tumble/cascade system is central to gameplay.

**Findings**:
1. Winning symbols are marked as "detonated"
2. Detonated symbols are removed from columns
3. Symbols above cascade down to fill gaps
4. New symbols are drawn from reel strip (cycling via `stopIndex`)
5. Process repeats until no more wins

**Alternative Considered**: Column-based replacement (rejected - game uses reel cycling)

---

## 3. RTP Simulation

### Decision: Document Simulation Script Architecture

**Rationale**: The `npm run simulation` command exists but simulation file not found in expected location.

**Findings**:
- Package.json defines: `"simulation": "tsx src/simulation/original-odds.ts"`
- Simulation file may be gitignored or external
- RTP calculation based on:
  - Odds tables per symbol (from `cascadingClusterConfig.odds`)
  - Link count ranges determine payout multiplier
  - Grid multipliers amplify wins

**Odds Table Structure**:
```typescript
odds: {
  [symbolId: number]: {
    from: number,   // Minimum link count
    to: number,     // Maximum link count
    odds: number    // Payout multiplier
  }[]
}
```

**Win Calculation Formula**:
```
winScore = odds[symbol][linkRange].odds × gridMultiplier × baseBet
baseBet = coinValue × betLevel
```

**Key Metrics for RTP**:
- Hit rate: Percentage of spins with wins
- Average win: Mean payout per winning spin
- Variance: Payout distribution spread
- Free spin trigger rate: Scatter frequency

### Decision: Document Max Win Protection

**Rationale**: Max win cap is a regulatory requirement.

**Findings**:
- `maxWinPerRound` configured per game
- Calculated as: `maxWinPerRound × betLevel × coinValue × betMultiplier`
- Cascade loop exits when `winScore >= maxWinPerRound`
- `reachMaxWin` flag set on round
- Free spin chain stops when max win reached

---

## 4. Settlement Architecture

### Decision: Document Event-Driven Consumer Pattern

**Rationale**: Settlement follows a consumer chain pattern.

**Consumer Responsibilities**:

| Consumer | Responsibility |
|----------|---------------|
| `PlaceBetConsumer` | Validates bet, creates round, queues for settlement |
| `SettleGameRoundConsumer` | Main settlement logic, calculates wins |
| `FreeSpinsConsumer` | Manages free spin lifecycle (gain, use, expire) |
| `FreeSpinStateConsumer` | Tracks rage meter/multiplier state across spins |
| `InGameConsumer` | Builds game payload for client |
| `UserSignInConsumer` | Initializes player session |

**Settlement Flow**:
```
1. PlaceBetConsumer.placeBet()
   ↓
2. SettleGameRoundConsumer.settlePlayerRound()
   ├── queryRound() - Retrieve unpaid round
   ├── processSpinning() - Execute game logic
   │   ├── generateBoard() - Create initial board
   │   ├── Loop: calcPrize() → calcPayout() → cascade
   │   ├── updateFeatureTrigger() - Check rage meter
   │   └── updateFreeSpins() - Check scatter count
   ├── calculateBetResult() - Compute final win
   ├── round.save() - Persist to database
   └── publishToUser() - Send results to client
   ↓
3. FreeSpinsConsumer.gainFreeSpin() (if triggered)
   ↓
4. FreeSpinStateConsumer.updateFreeSpinState()
```

### Decision: Document Tumble Record Structure

**Rationale**: Understanding tumble records is essential for debugging and feature development.

**TumbleRecord Interface**:
```typescript
interface TumbleRecord {
  reels: number[][];              // Current board state (6×6)
  reelMultipliers: number[][];    // Tile multipliers (6×6)
  symbols: {                      // Winning combinations
    symbol: number;               // Symbol ID
    position: {x,y}[];            // Matched positions
    count: number;                // Link count
    multiplier: number;           // Applied multiplier
    odds: number;                 // Payout multiplier
    win: number;                  // Calculated win
  }[];
  win: number;                    // Tumble total win
  rageMeter: number;              // Current rage counter
  triggeredStage?: number;        // Feature stage activated
  triggeredPositions?: {x,y}[];   // Feature effect positions
  newSymbols?: number[][];        // Cascaded symbols
}
```

---

## 5. Testing Patterns

### Decision: Document Jest + Stub Pattern

**Rationale**: Consistent test patterns ensure maintainable code.

**Findings**:
- Framework: Jest 30.x with SWC transformer
- Mocking: `jest-micro-auto-stub` for dependency mocking
- Conditional returns: `jest-when` for mock behavior
- Random data: Chance.js (used in production and tests)

**Test File Location**: `src/**/__tests__/*.test.ts`

**Example Pattern**:
```typescript
import { stub } from 'jest-micro-auto-stub';
import BoardGenerator from '../board-generator';
import RoundCalculator from '../round-calculator';

describe('SettleGameRoundConsumer', () => {
  const boardGenerator = stub(BoardGenerator);
  const roundCalculator = stub(RoundCalculator);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should settle round with wins', () => {
    // Arrange
    boardGenerator.generateNormalGameBoard.mockReturnValue(mockResult);

    // Act
    const result = consumer.settlePlayerRound(...);

    // Assert
    expect(boardGenerator.generateNormalGameBoard).toHaveBeenCalled();
  });
});
```

---

## 6. Dependency Injection

### Decision: Document Awilix Container Pattern

**Rationale**: Understanding DI is crucial for adding new components.

**Key File**: `src/cascading-slot-container-registry.ts`

**Registration Pattern**:
```typescript
// Singleton instances
container.register({
  boardGenerator: asClass(BoardGenerator).singleton(),
  roundCalculator: asClass(RoundCalculator).singleton(),
  settleGameRoundConsumer: asClass(SettleGameRoundConsumer).singleton(),
});

// Proxy for circular dependencies
container.register({
  freeSpinsConsumer: asFunction(() => container.resolve('freeSpinsConsumer')).proxy()
});
```

---

## 7. Key Files Reference

| Area | File | Purpose |
|------|------|---------|
| **Board** | `board-generator.ts` | Board creation, cascade logic |
| **Board** | `round-calculator.ts` | Win calculation, feature processing |
| **Board** | `config.ts` | Game constants, thresholds |
| **Reels** | `ng-reels.ts` | Normal game reel strips |
| **Reels** | `fg-reels.ts` | Free spin reel strips |
| **Reels** | `buy-fg-reels.ts` | Buy feature reel strips |
| **Models** | `result.ts` | Base result container |
| **Models** | `prize.ts` | Win combination entity |
| **Models** | `grid.ts` | Board position entity |
| **Settlement** | `settle-game-round-consumer.ts` | Main settlement orchestration |
| **Settlement** | `free-spins-consumer.ts` | Free spin lifecycle |
| **Settlement** | `free-spin-state-consumer.ts` | Cross-spin state |
| **Config** | `game-data.ts` | Runtime configuration |
| **DI** | `cascading-slot-container-registry.ts` | Dependency injection |

---

## Unresolved Items

None - all technical context has been researched and documented.

---

## Next Steps

1. Create `data-model.md` documenting entity relationships
2. Create `quickstart.md` for rapid developer onboarding
3. Proceed to `/speckit.tasks` for task generation
