# Data Model: Slot Feature Development Guideline

**Branch**: `001-slot-dev-guideline` | **Date**: 2025-12-03

## Overview

This document defines the key entities in the cascading cluster slot game system. Understanding these entities is essential for implementing new slot features.

---

## Core Game Entities

### Grid

Represents a single position on the game board.

**Source**: `src/cluster-board/grid.ts`

| Field | Type | Description |
|-------|------|-------------|
| `symbol` | `number` | Symbol ID (0-9) |
| `isDetonated` | `boolean` | Whether this position won and will be removed |
| `used` | `boolean` | Whether this position has been evaluated in current link search |

**State Transitions**:
```
Initial → used=true (during link search)
        → isDetonated=true (if part of win)
        → removed (during cascade)
        → new symbol (after cascade)
```

---

### Coordinate

Tracks x,y position on the board.

**Source**: `src/cluster-board/coordinate.ts`

| Field | Type | Description |
|-------|------|-------------|
| `x` | `number` | Column index (0-5) |
| `y` | `number` | Row index (0-5) |

---

### Prize

Represents a winning symbol combination.

**Source**: `src/cluster-board/prize.ts`

| Field | Type | Description |
|-------|------|-------------|
| `symbol` | `number` | The winning symbol ID |
| `position` | `Coordinate[]` | All positions in this winning cluster |
| `link` | `number` | Count of linked symbols (minimum 5) |
| `multiplier` | `number` | Applied multiplier from grid |
| `odds` | `number` | Payout multiplier from odds table |
| `winScore` | `number` | Calculated win = odds × multiplier |

**Validation Rules**:
- `link` must be >= 5 (`Config.minLinkRequirement`)
- `symbol` must not be 8 (scatter) or 9 (space)

---

### Result (Base)

Container for game round state.

**Source**: `src/cluster-board/result.ts`

| Field | Type | Description |
|-------|------|-------------|
| `category` | `ResultCategory` | `Ng` (normal) or `Fg` (free spin) |
| `reels` | `Grid[][]` | 6×6 game board |
| `stopIndex` | `number[]` | Position in each reel strip |
| `reelSetIndex` | `number` | Selected reel set (0, 1, or 2) |
| `gridMultipliers` | `number[][]` | 6×6 tile multiplier values |
| `winScore` | `number` | Accumulated win for this round |
| `rageCounter` | `number` | Current rage meter value |
| `currentStage` | `number` | Highest triggered feature stage (0-4) |
| `featureQueue` | `number[]` | Pending feature stages to process |
| `featureTriggered` | `Record<number, number>` | Count of each stage triggered |
| `tumbles` | `TumbleRecord[]` | History of all tumbles in this round |
| `freeSpins` | `{count, odds}` | Free spin trigger info |

**Subclasses**:
- `NgResult` - Normal game result (category = `Ng`)
- `FgResult` - Free spin result (category = `Fg`)

---

### TumbleRecord

Captures state of each tumble (win + cascade cycle).

**Source**: `src/cluster-board/round-calculator.ts`

| Field | Type | Description |
|-------|------|-------------|
| `reels` | `number[][]` | Board state as symbol IDs |
| `reelMultipliers` | `number[][]` | Multiplier values (after step calculation) |
| `symbols` | `Array` | Winning combinations with details |
| `win` | `number` | Total win for this tumble |
| `rageMeter` | `number` | Rage meter value after this tumble |
| `triggeredStage` | `number?` | Feature stage triggered (if any) |
| `triggeredPositions` | `Coordinate[]?` | Positions affected by feature |
| `newSymbols` | `number[][]?` | Symbols that cascaded in |

---

## Persistence Entities

### Round

Represents a complete game round.

**Source**: `src/models/interfaces/round.ts`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Unique round identifier |
| `uid` | `string` | User identifier |
| `name` | `string` | Player name |
| `coinValue` | `number` | Denomination multiplier |
| `betLevel` | `number` | Bet level multiplier |
| `betMultiplier` | `number` | Additional bet multiplier |
| `totalAmount` | `number` | Total bet amount |
| `betWin` | `number` | Final payout (capped at max win) |
| `actualBetWin` | `number?` | Uncapped win amount |
| `freeSpin` | `boolean` | Whether this is a free spin round |
| `reachMaxWin` | `boolean` | Whether max win cap was reached |
| `settlementResult` | `object` | Contains tumbles and freeSpins data |
| `paid` | `boolean` | Settlement status |
| `buyFreeSpin` | `number` | Buy mode (0=none, 1=standard, 2=super) |
| `rootFreeSpinRoundId` | `number?` | Original trigger round for free spin chain |
| `promotionId` | `string?` | Associated promotion |

---

### FreeSpin

Tracks available free spins for a player.

**Source**: `src/models/interfaces/free-spin.ts`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Unique free spin record ID |
| `uid` | `string` | User identifier |
| `name` | `string` | Player name |
| `roundId` | `number` | Round that triggered this free spin |
| `bet` | `number` | Fixed bet amount |
| `total` | `number` | Total free spins granted |
| `available` | `number` | Remaining free spins |
| `time` | `Date` | Creation timestamp |
| `expiryTime` | `Date` | Expiration timestamp |
| `betLevel` | `number` | Locked bet level |
| `coinValue` | `number` | Locked coin value |
| `betMultiplier` | `number` | Locked bet multiplier |
| `reachMaxWin` | `boolean` | Whether chain reached max win |
| `rootFreeSpinRoundId` | `number?` | Chain root round |
| `buyFreeSpin` | `number` | Buy mode (0, 1, or 2) |
| `promotionId` | `string?` | Associated promotion |

---

### FreeSpinState

Tracks state across free spin rounds.

**Source**: `src/models/interfaces/free-spin-state.ts`

| Field | Type | Description |
|-------|------|-------------|
| `uid` | `string` | User identifier |
| `playerId` | `string` | Player identifier |
| `name` | `string` | Player name |
| `ended` | `boolean` | Whether free spin chain ended |
| `time` | `Date` | State timestamp |
| `maxWin` | `number?` | Max win cap for chain |
| `promotionId` | `string?` | Associated promotion |
| `rounds` | `FreeRoundState[]` | History of free spin rounds |

---

### FreeRoundState

State snapshot for individual free spin round.

**Source**: `src/models/interfaces/free-round-state.ts`

| Field | Type | Description |
|-------|------|-------------|
| `time` | `Date` | Round timestamp |
| `roundId` | `number` | Associated round ID |
| `reelMultipliers` | `number[][]` | 6×6 multiplier grid |
| `stageQueue` | `number[]` | Pending feature stages |
| `currentStage` | `number` | Current feature stage |
| `rageMeter` | `number` | Current rage meter value |
| `remainingMaxWin` | `number` | Remaining max win allowance |

---

## Configuration Entities

### GameConfigs

Runtime game configuration.

**Source**: `src/game-data.ts`

| Field | Type | Description |
|-------|------|-------------|
| `gameId` | `number` | Game identifier |
| `name` | `string` | Game name |
| `enabled` | `boolean` | Whether game is active |
| `minbet` | `number` | Minimum bet |
| `maxbet` | `number` | Maximum bet |
| `maxWinPerRound` | `number` | Max win multiplier |
| `cascadingClusterConfig` | `object` | Game-specific configuration |

### CascadingClusterConfig

Game-specific settings.

| Field | Type | Description |
|-------|------|-------------|
| `betLevels` | `number[]` | Valid bet levels |
| `rageMeters` | `number[]` | Feature thresholds |
| `betMultiplier` | `number` | Base bet multiplier |
| `bigWinRatio` | `number[]` | Big win thresholds |
| `tileMultiplier.step` | `number` | Multiplier increment (default: 2) |
| `tileMultiplier.max` | `number` | Multiplier cap (default: 64) |
| `odds` | `object` | Payout tables per symbol |
| `freeSpins.initialOdds` | `array` | Scatter count → free spin count |

---

## Entity Relationships

```
GameConfigs
    └── CascadingClusterConfig (odds, thresholds)

Round
    ├── settlementResult
    │   ├── tumbles: TumbleRecord[]
    │   │   └── symbols: Prize[]
    │   └── freeSpins: {count, odds}
    ├── FreeSpin (if triggered)
    └── FreeSpinState (if free spin)
        └── rounds: FreeRoundState[]

Result
    ├── reels: Grid[][]
    │   └── Grid.symbol (from Reels config)
    ├── gridMultipliers: number[][]
    └── tumbles: TumbleRecord[]
```

---

## Constants

### Symbol IDs

| ID | Type | Behavior |
|----|------|----------|
| 0 | High-value | Forms clusters, can win |
| 1 | High-value | Forms clusters, can win |
| 2 | High-value | Forms clusters, can win |
| 3 | High-value | Forms clusters, can win |
| 4 | Low-value | Forms clusters, can win |
| 5 | Low-value | Forms clusters, can win |
| 6 | Low-value | Forms clusters, can win |
| 7 | Low-value | Forms clusters, can win |
| 8 | Scatter | Triggers free spins, does not cluster |
| 9 | Space/Empty | Does not cluster or pay |

### Feature Stages

| Stage | Threshold | Effect |
|-------|-----------|--------|
| 1 | 12 links | Detonate 6 random positions |
| 2 | 25 links | Detonate 3×3 area |
| 3 | 40 links | Detonate 2 columns |
| 4 | 60 links | Replace low symbols (4-7) with high (0-3) |
