import CascadingClusterGameData from "../game-data";
import BoardGenerator from "../cluster-board/board-generator";
import FgResult from "../cluster-board/fg-result";
import NgResult from "../cluster-board/ng-result";
import Prize from "../cluster-board/prize";
import { ResultCategory } from "../cluster-board/result";
import RoundCalculator from "../cluster-board/round-calculator";
import Statistician from "../cluster-board/Statistician";

function simulate(totalRounds: number) {
    const stat = new Statistician();
    const generator = new BoardGenerator();
    const gameData = {
        gameConfigs: {
            baseBet: 1,
            cascadingClusterConfig: {
                tileMultiplier: {
                    step: 2,
                    max: 20,
                },

                odds: {
                    "0": [
                        {
                            from: 5,
                            to: 5,
                            odds: 1.0,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 1.2,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 1.5,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 2.0,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 2.5,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 5.0,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 8.0,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 15.0,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 30.0,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 60.0,
                        },
                        {
                            from: 15,
                            to: 37,
                            odds: 250.0,
                        },
                    ],
                    "1": [
                        {
                            from: 5,
                            to: 5,
                            odds: 0.8,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 1.0,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 1.2,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 1.5,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 2.0,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 4.0,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 6.0,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 12.0,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 25.0,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 50.0,
                        },
                        {
                            from: 15,
                            to: 37,
                            odds: 120.0,
                        },
                    ],
                    "2": [
                        {
                            from: 5,
                            to: 5,
                            odds: 0.6,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 0.8,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 1.0,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 1.2,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 1.5,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 3.0,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 5.0,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 10.0,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 20.0,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 40.0,
                        },
                        {
                            from: 15,
                            to: 37,
                            odds: 100.0,
                        },
                    ],
                    "3": [
                        {
                            from: 5,
                            to: 5,
                            odds: 0.5,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 0.6,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 0.8,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 1.0,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 1.2,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 2.5,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 4.0,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 8.0,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 15.0,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 30.0,
                        },
                        {
                            from: 15,
                            to: 37,
                            odds: 60.0,
                        },
                    ],
                    "4": [
                        {
                            from: 5,
                            to: 5,
                            odds: 0.4,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 0.5,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 0.6,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 0.8,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 1.0,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 2.0,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 3.0,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 5.0,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 10.0,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 20.0,
                        },
                        {
                            from: 15,
                            to: 37,
                            odds: 40.0,
                        },
                    ],
                    "5": [
                        {
                            from: 5,
                            to: 5,
                            odds: 0.3,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 0.4,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 0.5,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 0.6,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 0.8,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 1.5,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 2.5,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 4.0,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 8.0,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 15.0,
                        },
                        {
                            from: 15,
                            to: 37,
                            odds: 30.0,
                        },
                    ],
                    "6": [
                        {
                            from: 5,
                            to: 5,
                            odds: 0.25,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 0.3,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 0.4,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 0.5,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 0.6,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 1.2,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 2.0,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 3.0,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 6.0,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 12.0,
                        },
                        {
                            from: 15,
                            to: 37,
                            odds: 25.0,
                        },
                    ],
                    "7": [
                        {
                            from: 5,
                            to: 5,
                            odds: 0.2,
                        },
                        {
                            from: 6,
                            to: 6,
                            odds: 0.25,
                        },
                        {
                            from: 7,
                            to: 7,
                            odds: 0.3,
                        },
                        {
                            from: 8,
                            to: 8,
                            odds: 0.4,
                        },
                        {
                            from: 9,
                            to: 9,
                            odds: 0.5,
                        },
                        {
                            from: 10,
                            to: 10,
                            odds: 1.0,
                        },
                        {
                            from: 11,
                            to: 11,
                            odds: 1.5,
                        },
                        {
                            from: 12,
                            to: 12,
                            odds: 2.5,
                        },
                        {
                            from: 13,
                            to: 13,
                            odds: 5.0,
                        },
                        {
                            from: 14,
                            to: 14,
                            odds: 10.0,
                        },
                        {
                            from: 15,
                            to: 37,
                            odds: 20.0,
                        },
                    ],
                },
                freeSpins: {
                    initialOdds: [
                        {
                            count: 3,
                            odds: 10,
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
                rageMeters: [15, 30, 50, 80],
            },
        },
    };
    const roundCalculator = new RoundCalculator({ gameData: gameData as any, boardGenerator: generator });
    let winScore = 0;
    let ngWinScore = 0;
    let fgWinScore = 0;
    const fgTriggerFreq = [0, 0, 0, 0];
    const maxWin = 10_000;
    const timeStart = Date.now();
    for (let i = 0; i < totalRounds; i++) {
        const round = {
            coinValue: 1,
            betLevel: 1,
        } as any;
        const result = new NgResult();
        roundCalculator.processSpinning2(round as any, maxWin, result);
        ngWinScore += Math.min(result.winScore, maxWin);
        for (let i = 0; i < 4; i++) {
            if (result.featureTriggered[i]) {
                fgTriggerFreq[i]++;
            }
        }
        let freeSpins = result.freeSpins.odds;
        let winFg = 0;
        const fgResult = new FgResult();
        fgResult.gridMultipliers = generator.initializeGridMultiplier();
        while (freeSpins > 0) {
            roundCalculator.processSpinning2(round as any, maxWin, fgResult, false);
            if (fgResult.rageCounter >= 80) {
                fgResult.rageCounter = 0;
                fgResult.featureTriggered = [false, false, false, false];
            }
            if (fgResult.winScore > 0) {
                winFg += fgResult.winScore;
                fgResult.winScore = 0;
            }
            freeSpins += fgResult.freeSpins.odds;
            freeSpins--;
        }
        fgWinScore += winFg;
        winScore += Math.min(result.winScore, maxWin) + Math.min(winFg, maxWin);
    }
    const allBetAmount = totalRounds;
    const rtp = winScore / allBetAmount;
    const timeEnd = Date.now();
    console.log(`Time: ${timeEnd - timeStart}ms`);
    console.log(`RTP: ${rtp}`);
    console.log(`NG Win Score: ${ngWinScore / totalRounds}`);
    console.log(`FG Win Score: ${fgWinScore / totalRounds}`);
    console.log(`FG Trigger Frequency: ${fgTriggerFreq.map((freq) => freq / totalRounds)}`);
}

simulate(1_000_000);
