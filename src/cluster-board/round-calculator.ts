import Chance from "chance";
import CascadingClusterGameData from "../game-data";
import { Round } from "../models/interfaces";
import BoardGenerator from "./board-generator";
import Config from "./config";
import Coordinate from "./coordinate";
import Grid from "./grid";
import Prize from "./prize";
import Result from "./result";
import Statistician from "./Statistician";

export interface TumbleRecord {
    reels: number[][];
    reelMultipliers: number[][];
    symbols: {
        symbol: number;
        position: { x: number; y: number }[];
        count: number;
        multiplier: number;
        odds: number;
        win: number;
    }[];
    win: number;
    rageMeter: number;
    triggeredStage?: number;
    triggeredPositions?: Coordinate[];
    newSymbols?: number[][];
}

export default class RoundCalculator {
    private readonly gridSize: number = 6;
    public static readonly minLinkRequirement: number = 5;

    private readonly maxPayout: number = 10000;
    private stat: Statistician;
    private currScNumber: number;
    private readonly boardGenerator: BoardGenerator;
    private readonly gameData: CascadingClusterGameData;
    private readonly chance: Chance.Chance;

    constructor({ gameData, boardGenerator }: { gameData: CascadingClusterGameData; boardGenerator: BoardGenerator }) {
        this.stat = new Statistician();
        this.boardGenerator = boardGenerator;
        this.gameData = gameData;
        this.chance = new Chance();
    }

    public processSpinning(round: Round, maxWinPerRound: number): Result {
        const baseBet = round.coinValue * round.betLevel;
        const result = this.boardGenerator.generateNormalGameBoard();
        result.tumbles.push(
            this.recordTumble({
                result,
                prizeList: [],
                baseBet,
                win: 0,
                newSymbols: [],
            })
        );
        let prizeList: Prize[] = [];
        this.calcPrize(result, prizeList);

        while (prizeList.length > 0 && result.winScore < maxWinPerRound) {
            const win = this.calcPayout(prizeList) * baseBet;
            result.winScore += win;
            result.rageCounter += this.calcRageMeter(prizeList);
            this.updateFeatureTrigger(result);
            this.markDetonated(result, prizeList);
            const newSymbols = this.boardGenerator.detonateAndCascadeBoard(result);

            result.tumbles.push(
                this.recordTumble({
                    result: result,
                    prizeList,
                    baseBet,
                    win,
                    newSymbols,
                })
            );

            this.renewGrid(result.reels);
            prizeList.length = 0;
            this.calcPrize(result, prizeList);

            while (prizeList.length === 0 && !result.isQueueEmpty()) {
                // Process Rage Meter
                const { feature, triggeredPositions } = this.processRageMeter(result);

                result.tumbles.push(
                    this.recordTumble({
                        result: result,
                        prizeList,
                        baseBet,
                        win: 0,
                        triggeredStage: feature,
                        triggeredPositions,
                    })
                );

                this.renewGrid(result.reels);
                this.calcPrize(result, prizeList);
            }
        }
        this.updateFreeSpins(result);
        this.updateRound(round, result, maxWinPerRound);

        return result;
    }

    public processSpinning2(round: Round, maxWinPerRound: number, result: Result, resetMultiplier: boolean = true): Result {
        const baseBet = round.coinValue * round.betLevel;
        const newResult =
            result.category === "Fg"
                ? this.boardGenerator.generateFreeSpinBoard(result, resetMultiplier)
                : this.boardGenerator.generateBaseGameBoard(result);
        newResult.tumbles.push(
            this.recordTumble({
                result: newResult,
                prizeList: [],
                baseBet,
                win: 0,
                newSymbols: [],
            })
        );
        let prizeList: Prize[] = [];
        this.calcPrize(newResult, prizeList);

        while (prizeList.length > 0 && newResult.winScore < maxWinPerRound) {
            const win = this.calcPayout(prizeList) * baseBet;
            newResult.winScore += win;
            newResult.rageCounter += this.calcRageMeter(prizeList);
            this.updateFeatureTrigger(newResult);
            this.markDetonated(newResult, prizeList);
            const newSymbols = this.boardGenerator.detonateAndCascadeBoard(newResult);

            newResult.tumbles.push(
                this.recordTumble({
                    result: newResult,
                    prizeList,
                    baseBet,
                    win,
                    newSymbols,
                })
            );

            this.renewGrid(newResult.reels);
            prizeList.length = 0;
            this.calcPrize(newResult, prizeList);

            while (prizeList.length === 0 && !newResult.isQueueEmpty()) {
                // Process Rage Meter
                const { feature, triggeredPositions } = this.processRageMeter(newResult);

                newResult.tumbles.push(
                    this.recordTumble({
                        result: newResult,
                        prizeList,
                        baseBet,
                        win: 0,
                        triggeredStage: feature,
                        triggeredPositions,
                    })
                );

                this.renewGrid(newResult.reels);
                this.calcPrize(newResult, prizeList);
            }
        }

        this.updateFreeSpins(newResult);
        this.updateRound(round, newResult, maxWinPerRound);

        return newResult;
    }

    updateFreeSpins(result: Result): void {
        const { cascadingClusterConfig } = this.gameData.gameConfigs;

        result.freeSpins.count = this.countSC(result.reels);
        const freeSpinOdds = cascadingClusterConfig.freeSpins.initialOdds.filter((x) => result.freeSpins.count >= x.count).map((x) => x.odds);
        result.freeSpins.odds = Math.max(0, ...freeSpinOdds);
    }

    updateRound(round, result: Result, maxWinPerRound: number) {
        round.settlementResult = { tumbles: result.tumbles, freeSpins: result.freeSpins };
        round.reachMaxWin = result.winScore >= maxWinPerRound;
        round.betWin = Math.min(result.winScore, maxWinPerRound);
        round.actualBetwin = result.winScore;
    }

    private recordTumble(params: {
        result: Result;
        prizeList: Prize[];
        baseBet: number;
        win: number;
        triggeredStage?: number;
        triggeredPositions?: Coordinate[];
        newSymbols?: number[][];
    }): TumbleRecord {
        const { result, prizeList, baseBet, win, triggeredStage, triggeredPositions, newSymbols } = params;
        const { cascadingClusterConfig } = this.gameData.gameConfigs;

        return {
            reels: result.reels.map((row) => row.map((grid) => grid.symbol)),
            reelMultipliers: result.gridMultipliers.map((row) =>
                row.map((multi) =>
                    multi > 0 ? Math.max(multi * cascadingClusterConfig.tileMultiplier.step, cascadingClusterConfig.tileMultiplier.max) : multi
                )
            ),
            symbols: prizeList.map((prize) => ({
                symbol: prize.symbol,
                position: prize.position.map((position) => ({
                    x: position.x,
                    y: position.y,
                })),
                count: prize.link,
                multiplier: prize.multiplier,
                odds: prize.odds,
                win: prize.winScore * baseBet,
            })),
            win,
            rageMeter: result.rageCounter,
            triggeredStage,
            triggeredPositions,
            newSymbols,
        };
    }

    private countSC(reels: Grid[][]): number {
        let result = 0;
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (reels[i][j].symbol === Config.scatterSymbol) {
                    result++;
                }
            }
        }
        return result;
    }

    private updateFeatureTrigger(result: Result): void {
        for (let i = 0; i < Config.featureRageMeterRequire.length; i++) {
            if (result.rageCounter >= Config.featureRageMeterRequire[i] && !result.featureTriggered[i]) {
                result.offerToQueue(i);
                result.featureTriggered[i] = true;
            }
        }
    }

    private processRageMeter(result: Result): {
        feature?: number;
        triggeredPositions?: Coordinate[];
    } {
        if (!result.isQueueEmpty()) {
            const feature = result.pollFromQueue();
            let triggeredPositions: Coordinate[] | undefined;
            if (feature === 0) {
                triggeredPositions = this.processStage0(result);
            } else if (feature === 1) {
                triggeredPositions = this.processStage1(result);
            } else if (feature === 2) {
                triggeredPositions = this.processStage2(result);
            } else if (feature === 3) {
                triggeredPositions = this.processStage3(result);
            }

            return { feature, triggeredPositions };
        }
        return {};
    }

    private processStage3(result: Result): Coordinate[] {
        if (result.category === "Ng") {
            this.stat.ngRageMeterFreq[3]++;
        } else if (result.category === "Fg") {
            this.stat.fgRageMeterFreq[3]++;
        }
        // Remove small symbols
        const detonatedPositions: Coordinate[] = [];
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (result.reels[i][j].symbol >= 4 && result.reels[i][j].symbol <= 7) {
                    result.reels[i][j].isDetonated = true;
                    result.gridMultipliers[i][j]++;
                    detonatedPositions.push(new Coordinate(i, j));
                }
            }
        }
        this.boardGenerator.detonateAndCascadeBoard(result);
        return detonatedPositions;
    }

    private processStage2(result: Result): Coordinate[] {
        if (result.category === "Ng") {
            this.stat.ngRageMeterFreq[2]++;
        } else if (result.category === "Fg") {
            this.stat.fgRageMeterFreq[2]++;
        }

        // Rand select 2 col to remove
        const detonatedPositions: Coordinate[] = [];
        const colIndex = [0, 1, 2, 3, 4, 5];
        const [col1, col2] = this.chance.pickset(colIndex, 2);

        for (let j = 0; j < this.gridSize; j++) {
            result.gridMultipliers[col1][j]++;
            if (result.reels[col1][j].symbol !== Config.scatterSymbol) {
                result.reels[col1][j].isDetonated = true;
                detonatedPositions.push(new Coordinate(col1, j));
            }
            result.gridMultipliers[col2][j]++;
            if (result.reels[col2][j].symbol !== Config.scatterSymbol) {
                result.reels[col2][j].isDetonated = true;
                detonatedPositions.push(new Coordinate(col2, j));
            }
        }
        this.boardGenerator.detonateAndCascadeBoard(result);
        return detonatedPositions;
    }

    private processStage1(result: Result): Coordinate[] {
        if (result.category === "Ng") {
            this.stat.ngRageMeterFreq[1]++;
        } else if (result.category === "Fg") {
            this.stat.fgRageMeterFreq[1]++;
        }
        // remove 3 x 3 (excl. SC)
        const detonatedPositions: Coordinate[] = [];
        const x = this.chance.integer({ min: 0, max: this.gridSize - 3 });
        const y = this.chance.integer({ min: 0, max: this.gridSize - 3 });
        for (let i = x; i < x + 3; i++) {
            for (let j = y; j < y + 3; j++) {
                result.gridMultipliers[i][j]++;
                if (result.reels[i][j].symbol !== Config.scatterSymbol) {
                    result.reels[i][j].isDetonated = true;
                    detonatedPositions.push(new Coordinate(i, j));
                }
            }
        }
        this.boardGenerator.detonateAndCascadeBoard(result);
        return detonatedPositions;
    }

    private processStage0(result: Result): Coordinate[] {
        if (result.category === "Ng") {
            this.stat.ngRageMeterFreq[0]++;
        } else if (result.category === "Fg") {
            this.stat.fgRageMeterFreq[0]++;
        }
        // randomly remove 6 symbols (excl. SC)
        const detonatedPositions: Coordinate[] = [];
        for (let i = 0; i < 6; i++) {
            let x = this.chance.integer({ min: 0, max: this.gridSize - 1 });
            let y = this.chance.integer({ min: 0, max: this.gridSize - 1 });
            while (result.reels[x][y].symbol === Config.scatterSymbol) {
                x = this.chance.integer({ min: 0, max: this.gridSize - 1 });
                y = this.chance.integer({ min: 0, max: this.gridSize - 1 });
            }
            result.reels[x][y].isDetonated = true;
            result.gridMultipliers[x][y]++;
            detonatedPositions.push(new Coordinate(x, y));
        }
        this.boardGenerator.detonateAndCascadeBoard(result);
        return detonatedPositions;
    }

    private calcRageMeter(prizeList: Prize[]): number {
        let result = 0;
        for (let i = 0; i < prizeList.length; i++) {
            result += prizeList[i].link;
        }
        return result;
    }

    private renewGrid(reels: Grid[][]): void {
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                reels[i][j].used = false;
            }
        }
    }

    private markDetonated(result: Result, prizeList: Prize[]): void {
        for (let i = 0; i < prizeList.length; i++) {
            for (let j = 0; j < prizeList[i].position.length; j++) {
                const x = prizeList[i].position[j].x;
                const y = prizeList[i].position[j].y;
                result.reels[x][y].isDetonated = true;
            }
        }
    }

    private calcPrize(result: Result, prizeList: Prize[]): void {
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const symbol = result.reels[i][j].symbol;
                if (!result.reels[i][j].used && symbol !== 0 && symbol !== Config.space && symbol !== Config.scatterSymbol) {
                    const prize = new Prize();
                    prize.symbol = symbol;
                    prize.position.push(new Coordinate(i, j));
                    prize.link = this.walk(i, j, prize, result.reels);
                    if (prize.link >= Config.minLinkRequirement) {
                        prizeList.push(prize);
                    }
                }
            }
        }
        this.calcMulti(prizeList, result.gridMultipliers);
    }

    private calcMulti(prizeList: Prize[], gridMulti: number[][]): void {
        for (let i = 0; i < prizeList.length; i++) {
            prizeList[i].multiplier = this.calcPrizeMulti(prizeList[i].position, gridMulti);
        }
    }

    private calcPrizeMulti(position: Coordinate[], gridMulti: number[][]): number {
        const { cascadingClusterConfig } = this.gameData.gameConfigs;

        let result = 0;
        for (let i = 0; i < position.length; i++) {
            const x = position[i].x;
            const y = position[i].y;
            if (gridMulti[x][y] > 0) {
                if (gridMulti[x][y] * 2 >= cascadingClusterConfig.tileMultiplier.max) {
                    result += cascadingClusterConfig.tileMultiplier.max;
                } else {
                    result += gridMulti[x][y] * 2;
                }
            }
            // calc payout first, then update grid multi
            gridMulti[x][y]++;
        }
        if (result > 0) {
            return result;
        } else return 1;
    }

    private calcPayout(prizeList: Prize[]): number {
        const { cascadingClusterConfig } = this.gameData.gameConfigs;
        const { odds } = cascadingClusterConfig;
        let result = 0.0;
        for (let i = 0; i < prizeList.length; i++) {
            const symbolOdds = odds[prizeList[i].symbol].find((x) => prizeList[i].link >= x.from && prizeList[i].link <= x.to);

            prizeList[i].odds = symbolOdds?.odds ?? 0;
            prizeList[i].winScore = prizeList[i].odds * prizeList[i].multiplier;

            result += prizeList[i].winScore;
        }
        return result;
    }

    private walk(i: number, j: number, prize: Prize, grid: Grid[][]): number {
        grid[i][j].used = true;
        let result = 1;
        result += this.move(i - 1, j, prize, grid); // go top
        result += this.move(i, j + 1, prize, grid); // go right
        result += this.move(i, j - 1, prize, grid); // go left
        result += this.move(i + 1, j, prize, grid); // go down
        return result;
    }

    private move(i: number, j: number, prize: Prize, grid: Grid[][]): number {
        // check legit
        if (!this.checkPositionLegit(i, j)) {
            return 0;
        }

        // check used
        if (grid[i][j].used) {
            return 0;
        }

        // if same symbol or wild, keep walking.
        if (grid[i][j].symbol === prize.symbol) {
            prize.position.push(new Coordinate(i, j));
            return this.walk(i, j, prize, grid);
        } else return 0;
    }

    private checkPositionLegit(i: number, j: number): boolean {
        return i >= 0 && j >= 0 && i < this.gridSize && j < this.gridSize;
    }
}
