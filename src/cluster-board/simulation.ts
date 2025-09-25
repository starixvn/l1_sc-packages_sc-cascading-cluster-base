import CascadingClusterGameData from "../game-data";
import BoardGenerator from "./board-generator";
import FgResult from "./fg-result";
import NgResult from "./ng-result";
import Prize from "./prize";
import { ResultCategory } from "./result";
import RoundCalculator from "./round-calculator";
import Statistician from "./Statistician";

function simulate(totalRounds: number) {
    const stat = new Statistician();
    const generator = new BoardGenerator();
    const gameData = {
        gameConfigs: {
            baseBet: 1,
            cascadingClusterConfig: {
                bigWinRatio: [5, 10, 15],
                tileMultiplier: {
                    step: 2,
                    max: 20,
                },
                betLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                betMultiplier: 20,
                odds: {
                    "1": [
                        {
                            from: 5,
                            to: 5,
                            odds: 20,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 24,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 30,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 40,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 50,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 100,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 160,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 300,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 600,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 1200,
                        },
                        {
                            from: 15,
                            to: 15,
                            odds: 5000,
                        },
                    ],
                    "2": [
                        {
                            from: 5,
                            to: 5,
                            odds: 16,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 20,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 24,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 30,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 40,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 80,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 120,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 240,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 500,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 1000,
                        },
                        {
                            from: 15,
                            to: 15,
                            odds: 2400,
                        },
                    ],
                    "3": [
                        {
                            from: 5,
                            to: 5,
                            odds: 12,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 16,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 20,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 24,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 30,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 60,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 100,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 200,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 400,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 800,
                        },
                        {
                            from: 15,
                            to: 15,
                            odds: 2000,
                        },
                    ],
                    "4": [
                        {
                            from: 5,
                            to: 5,
                            odds: 10,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 12,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 16,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 20,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 24,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 50,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 80,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 160,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 300,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 600,
                        },
                        {
                            from: 15,
                            to: 15,
                            odds: 1200,
                        },
                    ],
                    "5": [
                        {
                            from: 5,
                            to: 5,
                            odds: 8,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 10,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 12,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 16,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 20,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 40,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 60,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 100,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 200,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 400,
                        },
                        {
                            from: 15,
                            to: 15,
                            odds: 800,
                        },
                    ],
                    "6": [
                        {
                            from: 5,
                            to: 5,
                            odds: 6,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 8,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 10,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 12,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 16,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 30,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 50,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 80,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 160,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 300,
                        },
                        {
                            from: 15,
                            to: 15,
                            odds: 600,
                        },
                    ],
                    "7": [
                        {
                            from: 5,
                            to: 5,
                            odds: 5,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 6,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 8,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 10,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 12,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 24,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 40,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 60,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 120,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 240,
                        },
                        {
                            from: 15,
                            to: 15,
                            odds: 500,
                        },
                    ],
                    "8": [
                        {
                            from: 5,
                            to: 5,
                            odds: 4,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 5,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 6,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 8,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 10,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 20,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 30,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 50,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 100,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 200,
                        },
                        {
                            from: 15,
                            to: 15,
                            odds: 400,
                        },
                    ],
                },
                freeSpins: {
                    initialOdds: [
                        {
                            count: 3,
                            odds: 5,
                        },
                        {
                            count: 4,
                            odds: 15,
                        },
                        {
                            count: 5,
                            odds: 20,
                        },
                        {
                            count: 6,
                            odds: 25,
                        },
                    ],
                },
                rageMeters: [15, 30, 60, 90],
            },
        },
    };
    const roundCalculator = new RoundCalculator(gameData as any);
    let winScore = 0;
    const maxWin = 200_000;
    for (let i = 0; i < totalRounds; i++) {
        const round = {
            coinValue: 1,
            betLevel: 1,
        } as any;
        const result = new NgResult();
        roundCalculator.processSpinning2(round as any, maxWin, result);
        const winBase = result.winScore;
        let freeSpins = result.freeSpins.count;
        let winFg = 0;
        const fgResult = new FgResult();
        while (freeSpins > 0) {
            roundCalculator.processSpinning2(round as any, maxWin, fgResult);
            freeSpins--;
            winFg += fgResult.winScore;
        }
        winScore += Math.max(winBase, maxWin) + Math.max(winFg, maxWin);
    }
    const allBetAmount = totalRounds * 200;
    const rtp = winScore / allBetAmount;
    console.log(`RTP: ${rtp}`);
}

simulate(5);
