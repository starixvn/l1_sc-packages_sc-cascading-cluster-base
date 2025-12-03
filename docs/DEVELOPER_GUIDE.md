# Cascading Cluster Slot - Developer Guide

**Version**: 1.0.1-beta.62+
**Last Updated**: 2025-12-03
**Package**: sc-cascading-cluster-base

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Slot Features](#slot-features)
4. [Board Generation](#board-generation)
5. [RTP Simulation](#rtp-simulation)
6. [Settlement](#settlement)
7. [Testing Patterns](#testing-patterns)
8. [Quick Reference](#quick-reference)
9. [Debugging Tips](#debugging-tips)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB instance (for testing)
- Familiarity with TypeScript

### Setup

```bash
# Clone and install
git clone <repository-url>
cd sc-cascading-cluster-base
npm install

# Run tests
npm test

# Build
npm run build
```

### Project Structure

```
src/
├── cluster-board/          # Core game logic
│   ├── board-generator.ts  # Board creation & cascade
│   ├── round-calculator.ts # Win calculation & features
│   ├── config.ts           # Game constants
│   ├── ng-reels.ts         # Normal game reels
│   ├── fg-reels.ts         # Free spin reels
│   ├── buy-fg-reels.ts     # Buy feature reels
│   ├── result.ts           # Base result container
│   ├── ng-result.ts        # Normal game result
│   ├── fg-result.ts        # Free spin result
│   ├── prize.ts            # Win combination
│   ├── grid.ts             # Board position
│   └── coordinate.ts       # X,Y tracking
├── event-consumers/        # Settlement processors
│   ├── settle-game-round-consumer.ts
│   ├── free-spins-consumer.ts
│   ├── free-spin-state-consumer.ts
│   ├── place-bet-consumer.ts
│   ├── in-game-consumer.ts
│   └── user-signin-consumer.ts
├── models/                 # Data models
│   ├── interfaces/         # TypeScript interfaces
│   └── schemas/            # Mongoose schemas
├── crons/                  # Background processes
├── routers/                # HTTP API routes
├── query-apis/             # Query handlers
├── game-data.ts            # Runtime configuration
├── game-definition.ts      # Game metadata
└── cascading-slot-container-registry.ts  # DI setup
```

---

## Architecture Overview

### Event-Driven Architecture

The game uses an event-driven consumer pattern with dependency injection via Awilix.

```
┌─────────────────┐     ┌────────────────────┐     ┌──────────────────┐
│  PlaceBetConsumer │────▶│ SettleGameRoundConsumer │────▶│ FreeSpinsConsumer │
└─────────────────┘     └────────────────────┘     └──────────────────┘
         │                        │                         │
         ▼                        ▼                         ▼
    Validates bet           Calculates wins           Manages free spins
    Creates round           Processes features        Tracks state
    Queues settlement       Records tumbles           Handles expiry
```

### Consumer Responsibilities

| Consumer | Responsibility |
|----------|---------------|
| `PlaceBetConsumer` | Validates bet parameters, creates round record, queues for settlement |
| `SettleGameRoundConsumer` | Main settlement logic - generates board, calculates wins, processes features |
| `FreeSpinsConsumer` | Manages free spin lifecycle (grant, consume, expire) |
| `FreeSpinStateConsumer` | Tracks rage meter and multiplier state across free spin rounds |
| `InGameConsumer` | Builds game payload for client display |
| `UserSignInConsumer` | Initializes player session and game state |

### Dependency Injection

The project uses Awilix for dependency injection. Components are registered in `cascading-slot-container-registry.ts`:

```typescript
// Singleton registration pattern
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

### Key Files Reference

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

## Slot Features

### Symbol Types

The game uses symbols 0-9 with specific behaviors:

| Symbol ID | Type | Behavior |
|-----------|------|----------|
| 0 | High-value | Forms clusters, can win |
| 1 | High-value | Forms clusters, can win |
| 2 | High-value | Forms clusters, can win |
| 3 | High-value | Forms clusters, can win |
| 4 | Low-value | Forms clusters, can win |
| 5 | Low-value | Forms clusters, can win |
| 6 | Low-value | Forms clusters, can win |
| 7 | Low-value | Forms clusters, can win |
| 8 | Scatter | Triggers free spins, does NOT cluster |
| 9 | Space/Empty | Does not cluster or pay |

**Key Constants** (in `config.ts`):
```typescript
public static readonly scatterSymbol: number = 8;
public static readonly space: number = 9;
public static readonly minLinkRequirement: number = 5;
```

### Rage Meter System

The rage meter is the primary feature system with 4 progressive stages:

| Stage | Threshold | Effect |
|-------|-----------|--------|
| 1 | 12 links | Detonates 6 random valid positions |
| 2 | 25 links | Detonates a 3x3 grid area (excluding scatters) |
| 3 | 40 links | Detonates 2 random columns entirely |
| 4 | 60 links | Replaces low symbols (4-7) with high symbols (0-3) |

**Configuration** (in `config.ts`):
```typescript
public static readonly featureRageMeterRequire: Record<number, number> = {
  1: 12,
  2: 25,
  3: 40,
  4: 60,
};
```

**Processing** (in `round-calculator.ts`):
- Rage counter increases by the total link count of each winning combination
- When threshold is reached, stage is added to queue
- Stages are processed after cascade completes
- In free spins, stage 4 resets the counter to allow cycling

### Multiplier Mechanics

Tile multipliers amplify wins at specific positions:

| Mode | Initial Value | Behavior |
|------|--------------|----------|
| Normal Game | -1 (inactive) | Activates on first win at position |
| Free Spin | -1 (inactive) | Preserves from previous spin |
| Super Free Spin | 1 (active) | Starts active for better wins |

**Multiplier Calculation**:
```typescript
appliedMultiplier = gridMultiplier[x][y] * tileMultiplier.step  // step = 2
// Capped at tileMultiplier.max (default: 64)
```

**Key Files**:
- `board-generator.ts` - `initializeGridMultiplier()`, `initializeGridMultiplierForSuperFreeSpin()`
- `game-data.ts` - `tileMultiplier.step` and `tileMultiplier.max` configuration

### Scatter and Free Spins

Scatter symbols (ID 8) trigger free spins based on count:

| Scatter Count | Free Spins Awarded |
|--------------|-------------------|
| 3 | Based on odds configuration |
| 4 | Based on odds configuration |
| 5 | Based on odds configuration |
| 6 | Based on odds configuration |

**Configuration** (in game config):
```typescript
freeSpins: {
  initialOdds: [
    { count: 3, odds: 10 },
    { count: 4, odds: 15 },
    { count: 5, odds: 20 },
    { count: 6, odds: 25 },
  ]
}
```

### Adding a New Symbol Type

1. **Choose Symbol ID**: Use an unused number (e.g., 10)

2. **Update Reel Strips**: Add symbol to reel arrays in `ng-reels.ts`, `fg-reels.ts`, `buy-fg-reels.ts`
   ```typescript
   // In ng-reels.ts, add to reel arrays
   [0, 3, 10, 2, 7, 5, ...]  // Insert new symbol ID
   ```

3. **Add Odds Configuration**: In game configuration
   ```typescript
   odds: {
     10: [  // New symbol
       { from: 5, to: 8, odds: 0.5 },
       { from: 9, to: 12, odds: 1.0 },
       { from: 13, to: 36, odds: 2.0 },
     ]
   }
   ```

4. **Update Config.ts** (if special behavior needed):
   ```typescript
   public static readonly newSymbol: number = 10;
   ```

5. **Add Special Behavior** (optional) in `round-calculator.ts`

### Adding a New Rage Meter Stage

1. **Add Threshold** in `config.ts`:
   ```typescript
   public static readonly featureRageMeterRequire: Record<number, number> = {
     1: 12,
     2: 25,
     3: 40,
     4: 60,
     5: 80,  // New stage
   };
   ```

2. **Add Stage Processor** in `round-calculator.ts`:
   ```typescript
   // In constructor stageProcessors map:
   private readonly stageProcessors = new Map([
     [1, (result) => this.processStage1(result)],
     [2, (result) => this.processStage2(result)],
     [3, (result) => this.processStage3(result)],
     [4, (result) => this.processStage4(result)],
     [5, (result) => this.processStage5(result)],  // New
   ]);

   // Add processor method:
   private processStage5(result: Result): {
     triggeredPositions: Coordinate[];
     newSymbols: number[][]
   } {
     const detonatedPositions: Coordinate[] = [];

     // Your stage effect logic here
     // Example: Detonate all low-value symbols
     for (let i = 0; i < this.gridSize; i++) {
       for (let j = 0; j < this.gridSize; j++) {
         if (result.reels[i][j].symbol >= 4 &&
             result.reels[i][j].symbol <= 7) {
           result.reels[i][j].isDetonated = true;
           result.gridMultipliers[i][j]++;
           detonatedPositions.push(new Coordinate(i, j));
         }
       }
     }

     const newSymbols = this.boardGenerator.detonateAndCascadeBoard(result);
     return { triggeredPositions: detonatedPositions, newSymbols };
   }
   ```

3. **Update Trigger Logic** in `updateFeatureTrigger()`:
   ```typescript
   private updateFeatureTrigger(result: Result): void {
     while (
       result.rageCounter >= Config.featureRageMeterRequire[result.currentStage + 1] &&
       result.currentStage < 5  // Changed from 4 to 5
     ) {
       result.currentStage++;
       result.offerToQueue(result.currentStage);
     }
   }
   ```

---

## Board Generation

### BoardGenerator Class Methods

| Method | Purpose |
|--------|---------|
| `generateNormalGameBoard()` | Creates base game board using NG reels |
| `generateFreeSpinBoard()` | Creates free spin board using FG reels (standard weight) |
| `generateSuperFreeSpinBoard()` | Creates free spin board using FG reels (super weight) |
| `generateScatterBoardsRandom()` | Creates buy feature board with guaranteed scatters |
| `detonateAndCascadeBoard()` | Removes winning symbols and cascades new ones |

### Three-Tier Reel System

| Mode | File | Reel Sets | Selection Weights |
|------|------|-----------|-------------------|
| Normal Game | `ng-reels.ts` | 3 sets | [16077, 1500, 150] |
| Free Spin | `fg-reels.ts` | 3 sets | [330, 18, 5] |
| Super Free Spin | `fg-reels.ts` | 3 sets | [325, 100, 50] (superWeight) |
| Buy Feature | `buy-fg-reels.ts` | 1 set | Fixed index 1 |

### Reel Strip Format

Reels are stored as a 3D array: `[reelSetIndex][columnIndex][symbolPosition]`

```typescript
// In ng-reels.ts
class NgReels {
  public static readonly reelsIndex: number[] = [0, 1, 2];
  public static readonly weight: number[] = [16077, 1500, 150];

  public static readonly reels: number[][][] = [
    [  // Reel set 0 (most common - weight 16077)
      [0, 3, 3, 2, 7, 5, 8, 6, ...],  // Column 0
      [2, 2, 2, 5, 5, 0, 3, 3, ...],  // Column 1
      [5, 7, 2, 4, 5, 5, 0, 2, ...],  // Column 2
      [0, 4, 2, 7, 3, 3, 0, 4, ...],  // Column 3
      [5, 5, 0, 4, 2, 2, 3, 6, ...],  // Column 4
      [6, 1, 1, 1, 0, 0, 4, 5, ...],  // Column 5
    ],
    [  // Reel set 1 (less common - weight 1500)
      // ... different symbol distribution
    ],
    [  // Reel set 2 (rare - weight 150)
      // ... highest variance distribution
    ],
  ];
}
```

### Weight Distribution

Reel set selection uses weighted random:
- Higher weight = more frequent selection
- Weight ratio determines probability

```typescript
// Selection probability:
// Set 0: 16077 / (16077 + 1500 + 150) = 90.7%
// Set 1: 1500 / 17727 = 8.5%
// Set 2: 150 / 17727 = 0.8%
```

### Cascade Mechanics

1. **Detect Wins**: Flood-fill algorithm finds clusters of 5+ matching symbols
2. **Mark Detonated**: Winning positions are marked `isDetonated = true`
3. **Remove Symbols**: Detonated symbols are removed from columns
4. **Cascade Down**: Symbols above fall to fill gaps
5. **Draw New Symbols**: New symbols drawn from reel strip using `stopIndex`
6. **Repeat**: Process continues until no more wins

```typescript
// In board-generator.ts
public detonateAndCascadeBoard(result: Result): number[][] {
  const newSymbols: number[][] = Array.from({ length: this.gridSize }, () => []);
  this.detonateSymbols(result);      // Remove detonated
  this.cascadeSymbols(result, newSymbols);  // Fill gaps
  return newSymbols;
}
```

### Adding New Reel Strips

1. **Create New Reel File** or add to existing:
   ```typescript
   // src/cluster-board/bonus-reels.ts
   class BonusReels {
     public static readonly reelsIndex: number[] = [0, 1];
     public static readonly weight: number[] = [100, 50];

     public static readonly reels: number[][][] = [
       [
         // Column 0-5 for set 0
       ],
       [
         // Column 0-5 for set 1
       ],
     ];
   }
   export default BonusReels;
   ```

2. **Add Generator Method** in `board-generator.ts`:
   ```typescript
   import BonusReels from "./bonus-reels";

   public generateBonusBoard(result: Result): Result {
     result.reelSetIndex = this.chance.weighted(
       BonusReels.reelsIndex,
       BonusReels.weight
     );
     this.genGrid(BonusReels.reels[result.reelSetIndex], result);
     result.gridMultipliers = this.initializeGridMultiplier();
     return result;
   }
   ```

3. **Use in Settlement** (if needed):
   ```typescript
   // In settle-game-round-consumer.ts
   const result = this.boardGenerator.generateBonusBoard(new NgResult());
   ```

### Modifying Symbol Distribution

To change how often symbols appear:

1. **Edit Reel Arrays**: Adjust symbol frequency in reel strips
   - More occurrences = higher frequency
   - Fewer occurrences = lower frequency

2. **Adjust Reel Weights**: Change selection probability
   ```typescript
   // Make reel set 1 more common
   public static readonly weight: number[] = [10000, 5000, 150];
   ```

3. **Run RTP Simulation**: Verify changes don't break compliance

---

## RTP Simulation

### Running Simulations

```bash
npm run simulation
```

This executes `tsx src/simulation/original-odds.ts` which runs millions of game rounds to calculate statistical metrics.

### Odds Table Structure

Each symbol has a payout table based on cluster size:

```typescript
// In game configuration
odds: {
  0: [  // Symbol 0 (high-value)
    { from: 5, to: 8, odds: 1.0 },    // 5-8 links = 1x
    { from: 9, to: 12, odds: 2.0 },   // 9-12 links = 2x
    { from: 13, to: 36, odds: 5.0 },  // 13+ links = 5x
  ],
  4: [  // Symbol 4 (low-value)
    { from: 5, to: 8, odds: 0.2 },
    { from: 9, to: 12, odds: 0.5 },
    { from: 13, to: 36, odds: 1.0 },
  ],
  // ... other symbols
}
```

### Win Calculation Formula

```
winScore = odds × multiplier × baseBet

Where:
- odds = value from odds table based on symbol and link count
- multiplier = sum of grid multipliers at winning positions (min 1)
- baseBet = coinValue × betLevel
```

### Key RTP Metrics

| Metric | Description | Target Range |
|--------|-------------|--------------|
| **RTP** | Return to Player percentage | 94-96% (typical) |
| **Hit Rate** | % of spins with wins | Varies by design |
| **Average Win** | Mean payout per winning spin | Varies |
| **Variance** | Payout distribution spread | Low/Medium/High |
| **Free Spin Trigger Rate** | Scatter frequency | Design dependent |

### Interpreting Simulation Output

```
Total Spins: 10,000,000
Total Bet: 10,000,000
Total Win: 9,550,000
RTP: 95.50%

Hit Rate: 32.5%
Average Win: 2.94x
Free Spin Triggers: 125,000 (1.25%)
Max Win Events: 50 (0.0005%)

Variance: Medium
Standard Deviation: 8.5x
```

### RTP Tuning Techniques

1. **Adjust Odds Values**: Increase/decrease payout multipliers
   ```typescript
   // Increase RTP: Raise odds values
   { from: 5, to: 8, odds: 1.2 },  // Was 1.0

   // Decrease RTP: Lower odds values
   { from: 5, to: 8, odds: 0.8 },  // Was 1.0
   ```

2. **Modify Scatter Frequency**: Change scatter distribution in reels
   - More scatters = more free spins = higher RTP

3. **Adjust Reel Weights**: Shift between variance levels
   ```typescript
   // Higher variance (lower RTP base, higher max win)
   weight: [5000, 3000, 2000]

   // Lower variance (higher RTP base, lower max win)
   weight: [18000, 1000, 50]
   ```

4. **Tune Feature Thresholds**: Easier/harder to trigger features
   ```typescript
   featureRageMeterRequire: {
     1: 10,  // Was 12 - easier to trigger
     2: 20,  // Was 25
     // ...
   }
   ```

### Max Win Protection

Regulatory requirement to cap maximum payout:

```typescript
// Calculation
maxWinPerRound = config.maxWinPerRound × betLevel × coinValue × betMultiplier

// Example: maxWinPerRound = 100, betLevel = 5, coinValue = 1
// Max Win = 100 × 5 × 1 = 500
```

**Implementation**:
- Cascade loop exits when `winScore >= maxWinPerRound`
- `reachMaxWin` flag is set on the round
- Free spin chain stops when max win is reached

### Statistical Variance

For reliable results, run sufficient iterations:

| Metric | Minimum Iterations |
|--------|-------------------|
| RTP (±0.5%) | 10,000,000 |
| Hit Rate | 1,000,000 |
| Feature Trigger Rate | 5,000,000 |
| Max Win Frequency | 100,000,000 |

---

## Settlement

### Settlement Flow

```
1. PlaceBetConsumer.placeBet()
   ├── Validate bet parameters
   ├── Create Round document
   └── Queue for settlement
         │
         ▼
2. SettleGameRoundConsumer.settlePlayerRound()
   ├── queryRound() - Retrieve unpaid round
   ├── processSpinning()
   │   ├── generateBoard() - Create initial board
   │   ├── recordTumble() - Record initial state
   │   └── LOOP until no wins or max win:
   │       ├── calcPrize() - Find winning clusters
   │       ├── calcPayout() - Calculate win amount
   │       ├── updateFeatureTrigger() - Check rage meter
   │       ├── markDetonated() - Mark winning positions
   │       ├── detonateAndCascadeBoard() - Remove & cascade
   │       ├── recordTumble() - Record new state
   │       └── processRageMeter() - Execute features
   ├── updateFreeSpins() - Check scatter triggers
   ├── updateRound() - Set final values
   ├── calculateBetResult() - Compute result
   ├── round.save() - Persist to database
   └── publishToUser() - Send to client
         │
         ▼
3. FreeSpinsConsumer.gainFreeSpin() (if triggered)
   ├── Create FreeSpin record
   ├── Set expiry time
   └── Store in database
         │
         ▼
4. FreeSpinStateConsumer.updateFreeSpinState()
   ├── Store current rage meter
   ├── Store grid multipliers
   └── Track remaining max win
```

### SettleGameRoundConsumer Methods

| Method | Responsibility |
|--------|---------------|
| `settlePlayerRound()` | Main orchestration - coordinates full settlement |
| `processSpinning()` | Executes game logic for normal game |
| `processSpinning2()` | Executes game logic with custom board generator |
| `getAccumulateSpinData()` | Retrieves state from previous free spin |
| `getMaxWin()` | Calculates max win cap for round |
| `calculateBetResult()` | Computes final win/loss result |
| `collectRoundResult()` | Builds client response payload |

### Tumble Cascade Loop

```typescript
// In round-calculator.ts processSpinning()
while (prizeList.length > 0 && result.winScore < maxWinPerRound) {
  // Calculate this tumble's win
  const win = this.calcPayout(prizeList) * baseBet;
  result.winScore += win;

  // Update rage meter
  result.rageCounter += this.calcRageMeter(prizeList);
  this.updateFeatureTrigger(result);

  // Cascade
  this.markDetonated(result, prizeList);
  const newSymbols = this.boardGenerator.detonateAndCascadeBoard(result);

  // Record state
  result.tumbles.push(this.recordTumble({ ... }));

  // Check for new wins
  this.renewGrid(result.reels);
  prizeList.length = 0;
  this.calcPrize(result, prizeList);

  // Process rage meter features
  while (prizeList.length === 0 && !result.isQueueEmpty()) {
    const { feature, triggeredPositions, newSymbols } = this.processRageMeter(result);
    result.tumbles.push(this.recordTumble({ ... }));
    this.renewGrid(result.reels);
    this.calcPrize(result, prizeList);
  }
}
```

### TumbleRecord Structure

Each tumble captures complete state:

```typescript
interface TumbleRecord {
  reels: number[][];              // Board state (6×6 symbol IDs)
  reelMultipliers: number[][];    // Multiplier grid (6×6)
  symbols: {                      // Winning combinations
    symbol: number;               // Symbol ID
    position: { x: number; y: number }[];  // Matched positions
    count: number;                // Link count
    multiplier: number;           // Applied multiplier
    odds: number;                 // Payout from odds table
    win: number;                  // Final win amount
  }[];
  win: number;                    // Total tumble win
  rageMeter: number;              // Current rage counter
  triggeredStage?: number;        // Feature stage (if activated)
  triggeredPositions?: Coordinate[];  // Feature effect positions
  newSymbols?: number[][];        // Cascaded symbols
}
```

### Win Calculation Details

```typescript
// In round-calculator.ts calcPayout()
private calcPayout(prizeList: Prize[]): number {
  const { odds } = this.gameData.gameConfigs.cascadingClusterConfig;
  let result = 0.0;

  for (const prize of prizeList) {
    // Find odds based on symbol and link count
    const symbolOdds = odds[prize.symbol].find(
      x => prize.link >= x.from && prize.link <= x.to
    );

    prize.odds = symbolOdds?.odds ?? 0;
    prize.winScore = prize.odds * prize.multiplier;
    result += prize.winScore;
  }

  return result;
}
```

### Free Spin State Management

State is preserved across free spin rounds:

```typescript
// In FreeSpinState document
{
  uid: string,
  playerId: string,
  name: string,
  ended: boolean,
  maxWin: number,
  rounds: [{
    roundId: number,
    reelMultipliers: number[][],  // Preserved multipliers
    stageQueue: number[],         // Pending features
    currentStage: number,         // Current feature stage
    rageMeter: number,            // Current rage counter
    remainingMaxWin: number       // Max win remaining
  }]
}
```

### Adding New Win Multiplier Mechanic

1. **Define Multiplier Logic** in `round-calculator.ts`:
   ```typescript
   private applyBonusMultiplier(prize: Prize): number {
     // Example: Double multiplier for high-value symbols
     if (prize.symbol <= 3) {
       return prize.multiplier * 2;
     }
     return prize.multiplier;
   }
   ```

2. **Integrate in calcPayout()**:
   ```typescript
   prize.multiplier = this.applyBonusMultiplier(prize);
   prize.winScore = prize.odds * prize.multiplier;
   ```

3. **Record in TumbleRecord** (if needed for client display)

### Modifying Free Spin Settlement

Free spins use `processSpinning2()` with custom board generator:

```typescript
// In settle-game-round-consumer.ts
if (round.freeSpin) {
  newResult = this.roundCalculator.processSpinning2(
    round,
    maxWinPerRound,
    result,
    (result) => {
      if (fromBuyFreeSpin === 2) {
        return this.boardGenerator.generateSuperFreeSpinBoard(result, false);
      }
      return this.boardGenerator.generateFreeSpinBoard(result, false);
    }
  );
}
```

To add new free spin behavior:
1. Create new board generator method
2. Add condition to select it
3. Update state management if needed

---

## Testing Patterns

### Framework Setup

- **Jest 30.x** with SWC transformer
- **jest-micro-auto-stub** for dependency mocking
- **jest-when** for conditional mock returns
- **Chance.js** for random test data

### Test File Location

```
src/**/__tests__/*.test.ts
```

### Example Test Pattern

```typescript
import { stub } from 'jest-micro-auto-stub';
import BoardGenerator from '../board-generator';
import RoundCalculator from '../round-calculator';
import CascadingClusterGameData from '../../game-data';

describe('SettleGameRoundConsumer', () => {
  // Create stubs
  const boardGenerator = stub(BoardGenerator);
  const roundCalculator = stub(RoundCalculator);
  const gameData = stub(CascadingClusterGameData);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should settle round with wins', async () => {
    // Arrange
    const mockResult = {
      winScore: 100,
      tumbles: [{ win: 100, symbols: [] }],
      freeSpins: { count: 0, odds: 0 }
    };

    boardGenerator.generateNormalGameBoard.mockReturnValue(mockResult);

    // Act
    const result = await consumer.settlePlayerRound(
      mockPlayer,
      123,
      0,
      0
    );

    // Assert
    expect(boardGenerator.generateNormalGameBoard).toHaveBeenCalled();
    expect(result.betWin).toBe(100);
  });

  it('should trigger free spins on scatter', async () => {
    // Arrange
    const mockResult = {
      winScore: 50,
      tumbles: [{ win: 50, symbols: [] }],
      freeSpins: { count: 3, odds: 10 }
    };

    boardGenerator.generateNormalGameBoard.mockReturnValue(mockResult);

    // Act
    const result = await consumer.settlePlayerRound(
      mockPlayer,
      124,
      0,
      0
    );

    // Assert
    expect(freeSpinsConsumer.gainFreeSpin).toHaveBeenCalled();
  });
});
```

### Test Template for New Feature

```typescript
import { stub } from 'jest-micro-auto-stub';

describe('MyNewFeature', () => {
  const dependency1 = stub(Dependency1);
  const dependency2 = stub(Dependency2);

  let feature: MyNewFeature;

  beforeEach(() => {
    jest.clearAllMocks();
    feature = new MyNewFeature({
      dependency1,
      dependency2
    });
  });

  describe('when condition A', () => {
    it('should do X', () => {
      // Arrange
      dependency1.method.mockReturnValue(expectedValue);

      // Act
      const result = feature.doSomething();

      // Assert
      expect(result).toBe(expectedResult);
      expect(dependency1.method).toHaveBeenCalledWith(expectedArgs);
    });
  });

  describe('when condition B', () => {
    it('should do Y', () => {
      // Arrange
      dependency1.method.mockReturnValue(differentValue);

      // Act
      const result = feature.doSomething();

      // Assert
      expect(result).toBe(differentResult);
    });
  });
});
```

---

## Quick Reference

### Configuration Constants

| Constant | Location | Default | Description |
|----------|----------|---------|-------------|
| `scatterSymbol` | config.ts | 8 | Scatter symbol ID |
| `space` | config.ts | 9 | Empty/space symbol ID |
| `minLinkRequirement` | config.ts | 5 | Minimum cluster size |
| `featureRageMeterRequire` | config.ts | {1:12,2:25,3:40,4:60} | Stage thresholds |
| `gridSize` | Various | 6 | Board dimensions |
| `tileMultiplier.step` | game config | 2 | Multiplier increment |
| `tileMultiplier.max` | game config | 64 | Maximum multiplier |
| `maxWinPerRound` | game config | Varies | Max win multiplier |

### Common Development Tasks

**Add new symbol:**
1. Add to reel arrays (`ng-reels.ts`, `fg-reels.ts`)
2. Add odds table entry (game config)
3. Run RTP simulation

**Add new feature stage:**
1. Add threshold (`config.ts`)
2. Add processor (`round-calculator.ts`)
3. Update trigger logic
4. Run RTP simulation

**Modify reel distribution:**
1. Edit symbol frequency in reel arrays
2. Adjust weights if needed
3. Run RTP simulation

**Add new board generation mode:**
1. Create reel file (if needed)
2. Add generator method (`board-generator.ts`)
3. Use in settlement consumer

**Modify settlement logic:**
1. Update consumer method
2. Update TumbleRecord (if needed)
3. Update client payload

---

## Debugging Tips

### Common Issues

**RTP deviation:**
- Check odds table values
- Verify reel distributions
- Ensure correct multiplier calculation

**Feature not triggering:**
- Check threshold configuration
- Verify rage counter increment
- Check stage processor registration

**Cascade not working:**
- Verify `isDetonated` flag setting
- Check `stopIndex` cycling
- Ensure grid renewal between checks

### Logging Points

Add logging at key points:
```typescript
// Win calculation
console.log(`Prize: symbol=${prize.symbol}, link=${prize.link}, odds=${prize.odds}`);

// Feature trigger
console.log(`Rage: counter=${result.rageCounter}, stage=${result.currentStage}`);

// Board state
console.log(`Board:`, result.reels.map(col => col.map(g => g.symbol)));
```

### Tumble Record Inspection

Each tumble captures complete state for debugging:
```typescript
result.tumbles.forEach((tumble, i) => {
  console.log(`Tumble ${i}:`);
  console.log(`  Win: ${tumble.win}`);
  console.log(`  Rage: ${tumble.rageMeter}`);
  console.log(`  Symbols:`, tumble.symbols);
  if (tumble.triggeredStage) {
    console.log(`  Feature: Stage ${tumble.triggeredStage}`);
  }
});
```

### Key Files for Debugging

| Issue | Files to Check |
|-------|---------------|
| Win calculation | `round-calculator.ts` → `calcPayout()` |
| Cluster detection | `round-calculator.ts` → `calcPrize()`, `walk()` |
| Feature triggers | `round-calculator.ts` → `updateFeatureTrigger()` |
| Board generation | `board-generator.ts` → `genGrid()` |
| Cascade logic | `board-generator.ts` → `detonateAndCascadeBoard()` |
| Free spin state | `free-spin-state-consumer.ts` |
| Settlement flow | `settle-game-round-consumer.ts` |

---

## Core Entities Reference

### Grid
Single board position.
- `symbol`: number (0-9)
- `isDetonated`: boolean
- `used`: boolean

### Coordinate
Position tracking.
- `x`: number (column 0-5)
- `y`: number (row 0-5)

### Prize
Winning combination.
- `symbol`: number
- `position`: Coordinate[]
- `link`: number (count)
- `multiplier`: number
- `odds`: number
- `winScore`: number

### Result
Game round state container.
- `category`: ResultCategory (Ng/Fg)
- `reels`: Grid[][]
- `gridMultipliers`: number[][]
- `winScore`: number
- `rageCounter`: number
- `currentStage`: number
- `tumbles`: TumbleRecord[]

### Round
Persisted game round.
- `id`: number
- `betWin`: number
- `actualBetWin`: number
- `reachMaxWin`: boolean
- `settlementResult`: object
- `freeSpin`: boolean

### FreeSpin
Free spin allocation.
- `total`: number
- `available`: number
- `betLevel`: number
- `buyFreeSpin`: number (0/1/2)

### FreeSpinState
Cross-spin state.
- `reelMultipliers`: number[][]
- `rageMeter`: number
- `currentStage`: number
- `remainingMaxWin`: number

---

*End of Developer Guide*
