# Quick Start: Slot Feature Development

**Branch**: `001-slot-dev-guideline` | **Date**: 2025-12-03

## Overview

This guide helps developers quickly get started with slot feature development in the `sc-cascading-cluster-base` codebase.

---

## Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB instance (for testing)
- Familiarity with TypeScript

## Setup

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

---

## Project Structure

```
src/
├── cluster-board/          # Core game logic
│   ├── board-generator.ts  # Board creation
│   ├── round-calculator.ts # Win calculation
│   ├── config.ts           # Constants
│   ├── ng-reels.ts         # Normal game reels
│   ├── fg-reels.ts         # Free spin reels
│   └── *.ts                # Entity classes
├── event-consumers/        # Settlement logic
├── models/                 # Database schemas
└── game-data.ts            # Configuration
```

---

## Common Development Tasks

### 1. Add a New Symbol Type

1. **Update symbol ID in reel strips**:
   - Edit `src/cluster-board/ng-reels.ts` and `fg-reels.ts`
   - Add new symbol ID to reel arrays

2. **Add odds configuration** (in game config):
   ```typescript
   odds: {
     10: [ // New symbol ID
       { from: 5, to: 8, odds: 0.5 },
       { from: 9, to: 12, odds: 1.0 },
       // ...
     ]
   }
   ```

3. **Update Config.ts if needed**:
   ```typescript
   public static readonly newSymbol: number = 10;
   ```

4. **Add special behavior** (if applicable) in `round-calculator.ts`

### 2. Add a New Rage Meter Stage

1. **Add threshold** in `src/cluster-board/config.ts`:
   ```typescript
   public static readonly featureRageMeterRequire: Record<number, number> = {
     1: 12,
     2: 25,
     3: 40,
     4: 60,
     5: 80, // New stage
   };
   ```

2. **Add processor** in `src/cluster-board/round-calculator.ts`:
   ```typescript
   // In constructor stageProcessors map:
   [5, (result) => this.processStage5(result)],

   // Add method:
   private processStage5(result: Result): { triggeredPositions: Coordinate[]; newSymbols: number[][] } {
     // Implement stage effect
     const detonatedPositions: Coordinate[] = [];
     // ... your logic
     const newSymbols = this.boardGenerator.detonateAndCascadeBoard(result);
     return { triggeredPositions: detonatedPositions, newSymbols };
   }
   ```

3. **Update trigger logic** in `updateFeatureTrigger()` method:
   ```typescript
   // Change stage cap from 4 to 5
   while (result.rageCounter >= Config.featureRageMeterRequire[result.currentStage + 1] && result.currentStage < 5) {
   ```

### 3. Modify Reel Strips

1. **Open reel file** (`ng-reels.ts`, `fg-reels.ts`, or `buy-fg-reels.ts`)

2. **Understand structure**:
   ```typescript
   reels: number[][][] = [
     [ // Reel set 0 (most common)
       [0, 3, 3, 2, ...], // Column 0
       [2, 2, 2, 5, ...], // Column 1
       // ... 6 columns total
     ],
     [ /* Reel set 1 */ ],
     [ /* Reel set 2 */ ],
   ]
   ```

3. **Adjust weights** to change reel set frequency:
   ```typescript
   public static readonly weight: number[] = [16077, 1500, 150];
   // Higher = more frequent selection
   ```

### 4. Adjust Win Multipliers

1. **Edit configuration** in game config (`cascadingClusterConfig`):
   ```typescript
   tileMultiplier: {
     step: 2,  // Each cascade doubles multiplier
     max: 64   // Maximum multiplier cap
   }
   ```

2. **Change initial values** in `board-generator.ts`:
   - Normal: `initializeGridMultiplier()` returns -1 (inactive)
   - Super: `initializeGridMultiplierForSuperFreeSpin()` returns 1

### 5. Add Settlement Logic

1. **Identify the consumer** to modify in `src/event-consumers/`

2. **Follow existing patterns**:
   ```typescript
   // Example: Add to settle-game-round-consumer.ts
   async myNewSettlementLogic(player, round: Round) {
     // Your logic
     await round.save();
     await this.publishResults(player, round);
   }
   ```

3. **Register in container** (`cascading-slot-container-registry.ts`) if new consumer

---

## Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- settle-game-round-consumer.test.ts
```

### Test Pattern Example
```typescript
import { stub } from 'jest-micro-auto-stub';
import BoardGenerator from '../cluster-board/board-generator';

describe('MyFeature', () => {
  const boardGenerator = stub(BoardGenerator);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', () => {
    // Arrange
    boardGenerator.generateNormalGameBoard.mockReturnValue(mockResult);

    // Act
    const result = myFunction();

    // Assert
    expect(result).toBeDefined();
    expect(boardGenerator.generateNormalGameBoard).toHaveBeenCalled();
  });
});
```

---

## RTP Simulation

### Run Simulation
```bash
npm run simulation
```

### Key Metrics to Monitor
- **RTP**: Should be within certified range (e.g., 94-96%)
- **Hit Rate**: Percentage of winning spins
- **Average Win**: Mean payout per win
- **Free Spin Frequency**: Scatter trigger rate
- **Max Win Events**: Frequency of hitting max win

### Tuning RTP
1. **Decrease RTP**: Lower odds values, reduce scatter frequency
2. **Increase RTP**: Higher odds values, increase scatter frequency
3. **Adjust volatility**: Change odds distribution (more big wins vs more small wins)

---

## Key Constants Reference

| Constant | Location | Value | Description |
|----------|----------|-------|-------------|
| `scatterSymbol` | config.ts | 8 | Scatter symbol ID |
| `space` | config.ts | 9 | Empty space ID |
| `minLinkRequirement` | config.ts | 5 | Minimum cluster size |
| `featureRageMeterRequire` | config.ts | {1:12,2:25,3:40,4:60} | Stage thresholds |
| `gridSize` | Various | 6 | Board dimensions |

---

## Debugging Tips

1. **Log tumble records**: Each tumble contains complete state
2. **Check rage meter**: `result.rageCounter` and `result.currentStage`
3. **Verify grid state**: `result.reels` for current board
4. **Trace multipliers**: `result.gridMultipliers` for win amplification

---

## Next Steps

- Read full documentation in `docs/DEVELOPER_GUIDE.md`
- Review test files for implementation examples
- Check `research.md` for detailed architecture analysis
