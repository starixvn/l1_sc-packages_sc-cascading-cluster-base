// Simple test script to verify calculateBetResultFromAdmin logic
export const sampleData = {
    tumbles: [
        {
            symbols: [],
            win: 0,
            reels: [
                [5, 2, 2, 2, 0, 4],
                [7, 2, 2, 4, 4, 3],
                [5, 5, 4, 4, 4, 7],
                [6, 4, 7, 2, 3, 0],
                [7, 7, 2, 2, 3, 7],
                [6, 5, 5, 3, 4, 4],
            ],
            reelMultipliers: [
                [-1, -1, -1, -1, -1, -1],
                [-1, -1, -1, -1, -1, -1],
                [-1, -1, -1, -1, -1, -1],
                [-1, -1, -1, -1, -1, -1],
                [-1, -1, -1, -1, -1, -1],
                [-1, -1, -1, -1, -1, -1],
            ],
            rageMeter: 0,
            newSymbols: [],
        },
        {
            symbols: [
                {
                    symbol: 2,
                    position: [
                        {
                            x: 0,
                            y: 1,
                        },
                        {
                            x: 0,
                            y: 2,
                        },
                        {
                            x: 0,
                            y: 3,
                        },
                        {
                            x: 1,
                            y: 2,
                        },
                        {
                            x: 1,
                            y: 1,
                        },
                    ],
                    count: 5,
                    multiplier: 1,
                    odds: 12,
                    win: 1.2000000000000002,
                },
                {
                    symbol: 4,
                    position: [
                        {
                            x: 1,
                            y: 3,
                        },
                        {
                            x: 1,
                            y: 4,
                        },
                        {
                            x: 2,
                            y: 4,
                        },
                        {
                            x: 2,
                            y: 3,
                        },
                        {
                            x: 2,
                            y: 2,
                        },
                    ],
                    count: 5,
                    multiplier: 1,
                    odds: 8,
                    win: 0.8,
                },
            ],
            win: 2,
            reels: [
                [1, 1, 1, 5, 0, 4],
                [6, 1, 1, 1, 7, 3],
                [7, 0, 6, 5, 5, 7],
                [6, 4, 7, 2, 3, 0],
                [7, 7, 2, 2, 3, 7],
                [6, 5, 5, 3, 4, 4],
            ],
            reelMultipliers: [
                [-1, 0, 0, 0, -1, -1],
                [-1, 0, 0, 0, 0, -1],
                [-1, -1, 0, 0, 0, -1],
                [-1, -1, -1, -1, -1, -1],
                [-1, -1, -1, -1, -1, -1],
                [-1, -1, -1, -1, -1, -1],
            ],
            rageMeter: 10,
            newSymbols: [[1, 1, 1], [1, 1, 1, 6], [6, 0, 7], [], [], []],
        },
        {
            symbols: [
                {
                    symbol: 1,
                    position: [
                        {
                            x: 0,
                            y: 0,
                        },
                        {
                            x: 0,
                            y: 1,
                        },
                        {
                            x: 0,
                            y: 2,
                        },
                        {
                            x: 1,
                            y: 2,
                        },
                        {
                            x: 1,
                            y: 3,
                        },
                        {
                            x: 1,
                            y: 1,
                        },
                    ],
                    count: 6,
                    multiplier: 1,
                    odds: 20,
                    win: 2,
                },
            ],
            win: 2,
            reels: [
                [0, 6, 6, 5, 0, 4],
                [5, 7, 7, 6, 7, 3],
                [7, 0, 6, 5, 5, 7],
                [6, 4, 7, 2, 3, 0],
                [7, 7, 2, 2, 3, 7],
                [6, 5, 5, 3, 4, 4],
            ],
            reelMultipliers: [
                [0, 20, 20, 0, -1, -1],
                [-1, 20, 20, 20, 0, -1],
                [-1, -1, 0, 0, 0, -1],
                [-1, -1, -1, -1, -1, -1],
                [-1, -1, -1, -1, -1, -1],
                [-1, -1, -1, -1, -1, -1],
            ],
            rageMeter: 16,
            newSymbols: [[6, 6, 0], [7, 7, 5], [], [], [], []],
        },
        {
            symbols: [],
            win: 0,
            reels: [
                [3, 0, 6, 6, 5, 4],
                [2, 7, 7, 6, 7, 3],
                [6, 7, 0, 5, 5, 7],
                [6, 6, 4, 7, 2, 0],
                [3, 7, 7, 2, 3, 7],
                [6, 5, 5, 3, 4, 4],
            ],
            reelMultipliers: [
                [0, 20, 20, 0, 0, -1],
                [0, 20, 20, 20, 0, -1],
                [-1, -1, 20, 0, 0, -1],
                [-1, -1, -1, -1, 0, -1],
                [-1, 0, 0, -1, -1, -1],
                [-1, -1, -1, -1, -1, -1],
            ],
            rageMeter: 16,
            triggeredStage: 0,
            triggeredPositions: [
                {
                    x: 0,
                    y: 4,
                },
                {
                    x: 1,
                    y: 0,
                },
                {
                    x: 2,
                    y: 2,
                },
                {
                    x: 4,
                    y: 2,
                },
                {
                    x: 4,
                    y: 1,
                },
                {
                    x: 3,
                    y: 4,
                },
            ],
        },
    ],
    freeSpins: { count: 0, odds: 0 },
    createdAt: {
        $date: "2025-09-30T06:55:27.604Z",
    },
    updatedAt: {
        $date: "2025-09-30T06:55:27.604Z",
    },
    __v: 0,
};

// Test function
function calculateBetResultFromAdmin(round, maxWinPerRound, resultFromAdmin) {
    let totalWin = 0;
    const baseBet = round.betLevel * round.coinValue;
    const { tumbles } = resultFromAdmin;

    for (const tumble of tumbles) {
        if (tumble.symbols) {
            const winEachTumble = tumble.symbols.reduce((sum, symbol) => {
                return sum + symbol.odds * symbol.multiplier;
            }, 0);
            totalWin += winEachTumble * baseBet;
        }
    }
    round.settlementResult = { tumbles: resultFromAdmin.tumbles, freeSpins: resultFromAdmin.freeSpins };
    round.betWin = Math.min(totalWin, maxWinPerRound);
    round.reachMaxWin = totalWin >= maxWinPerRound;
    round.actualBetwin = totalWin;
    return totalWin;
}

// Test with sample data
const round = {
    betLevel: 1,
    coinValue: 0.1,
    betWin: 0,
};

const result = calculateBetResultFromAdmin(round, 10000, sampleData);

console.log("=== Test Results ===");
console.log("Base bet:", round.betLevel * round.coinValue);
console.log("Calculated total win:", result);
