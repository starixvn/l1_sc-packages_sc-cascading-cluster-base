import BoardGenerator from "./board-generator";
import Config from "./config";
import Coordinate from "./coordinate";
import Grid from "./grid";
import Prize from "./prize";
import Result from "./result";
import Statistician from "./Statistician";

interface TumbleRecord {
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
    private readonly random = Math.random;
    private currScNumber: number;
    private readonly generator: BoardGenerator;
    private readonly gameData: any;

    constructor(gameData: any, generator: BoardGenerator) {
        this.stat = new Statistician();
        this.generator = generator;
        this.gameData = gameData;
    }

    public processSpinning(round: any, totalMultiplier: number, maxWinPerRound: number, preGeneratedResult: any) {}

    public process(baseBet: number): Result {
        const ngResult = this.generator.generateNormalGameBoard();
        ngResult.tumbles.push(
            this.recordTumble({
                ngResult,
                prizeList: [],
                baseBet,
                totalPayout: 0,
                newSymbols: [],
            })
        );
        let prizeList: Prize[] = [];
        this.calcPrize(ngResult, prizeList);

        while (prizeList.length > 0 && ngResult.winScore < this.maxPayout) {
            this.stat.ngCascadeFreq++;
            const totalPayout = this.calcPayout(prizeList);
            ngResult.winScore += totalPayout;
            ngResult.rageCounter += this.calcRageMeter(prizeList);
            this.updateFeatureTrigger(ngResult);
            this.markDetonated(ngResult, prizeList);
            const newSymbols = this.generator.detonateAndCascadeBoard(ngResult);

            ngResult.tumbles.push(
                this.recordTumble({
                    ngResult,
                    prizeList,
                    baseBet,
                    totalPayout,
                    newSymbols,
                })
            );

            this.renewGrid(ngResult.reels);
            prizeList.length = 0;
            this.calcPrize(ngResult, prizeList);

            while (prizeList.length === 0 && !ngResult.isQueueEmpty()) {
                // Process Rage Meter
                const { feature, triggeredPositions } = this.processRageMeter(ngResult);

                ngResult.tumbles.push(
                    this.recordTumble({
                        ngResult,
                        prizeList,
                        baseBet,
                        totalPayout: 0,
                        triggeredStage: feature,
                        triggeredPositions,
                    })
                );

                this.renewGrid(ngResult.reels);
                this.calcPrize(ngResult, prizeList);
            }
        }

        ngResult.freeSpins.count = this.countSC(ngResult.reels);
        this.currScNumber = Math.min(ngResult.freeSpins.count, 6);
        ngResult.freeSpins.odds = Config.fgRoundsArray[this.currScNumber];

        return ngResult;
    }

    private recordTumble(params: {
        ngResult: Result;
        prizeList: Prize[];
        baseBet: number;
        totalPayout: number;
        triggeredStage?: number;
        triggeredPositions?: Coordinate[];
        newSymbols?: number[][];
    }): TumbleRecord {
        const { ngResult, prizeList, baseBet, totalPayout, triggeredStage, triggeredPositions, newSymbols } = params;
        const { cascadingClusterConfig } = this.gameData.gameConfigs;

        return {
            reels: ngResult.reels.map((row) => row.map((grid) => grid.symbol)),
            reelMultipliers: ngResult.gridMultipliers.map((row) =>
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
            win: totalPayout * baseBet,
            rageMeter: ngResult.rageCounter,
            triggeredStage,
            triggeredPositions,
            newSymbols,
        };
    }

    private countSC(reels: Grid[][]): number {
        let result = 0;
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (reels[i][j].symbol === Config.SC) {
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
                if (result.reels[i][j].symbol >= 5 && result.reels[i][j].symbol <= 8) {
                    result.reels[i][j].isDetonated = true;
                    result.gridMultipliers[i][j]++;
                    detonatedPositions.push(new Coordinate(i, j));
                }
            }
        }
        this.generator.detonateAndCascadeBoard(result);
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
        this.shuffleArr(colIndex);
        const col1 = colIndex[0];
        const col2 = colIndex[1];

        for (let j = 0; j < this.gridSize; j++) {
            result.gridMultipliers[col1][j]++;
            if (result.reels[col1][j].symbol !== Config.SC) {
                result.reels[col1][j].isDetonated = true;
                detonatedPositions.push(new Coordinate(col1, j));
            }
            result.gridMultipliers[col2][j]++;
            if (result.reels[col2][j].symbol !== Config.SC) {
                result.reels[col2][j].isDetonated = true;
                detonatedPositions.push(new Coordinate(col2, j));
            }
        }
        this.generator.detonateAndCascadeBoard(result);
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
        const x = Math.floor(Math.random() * (this.gridSize - 2));
        const y = Math.floor(Math.random() * (this.gridSize - 2));
        for (let i = x; i < x + 3; i++) {
            for (let j = y; j < y + 3; j++) {
                result.gridMultipliers[i][j]++;
                if (result.reels[i][j].symbol !== Config.SC) {
                    result.reels[i][j].isDetonated = true;
                    detonatedPositions.push(new Coordinate(i, j));
                }
            }
        }
        this.generator.detonateAndCascadeBoard(result);
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
            let x = Math.floor(Math.random() * this.gridSize);
            let y = Math.floor(Math.random() * this.gridSize);
            while (result.reels[x][y].symbol === Config.SC) {
                x = Math.floor(Math.random() * this.gridSize);
                y = Math.floor(Math.random() * this.gridSize);
            }
            result.reels[x][y].isDetonated = true;
            result.gridMultipliers[x][y]++;
            detonatedPositions.push(new Coordinate(x, y));
        }
        this.generator.detonateAndCascadeBoard(result);
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
                if (!result.reels[i][j].used && symbol !== 0 && symbol !== Config.space && symbol !== Config.SC) {
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
        let result = 0.0;
        for (let i = 0; i < prizeList.length; i++) {
            if (prizeList[i].link >= 15) {
                prizeList[i].odds = Config.payout[prizeList[i].symbol][15];
                prizeList[i].winScore = Config.payout[prizeList[i].symbol][15] * prizeList[i].multiplier;
            } else {
                prizeList[i].odds = Config.payout[prizeList[i].symbol][prizeList[i].link];
                prizeList[i].winScore = Config.payout[prizeList[i].symbol][prizeList[i].link] * prizeList[i].multiplier;
            }
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

    private shuffleArr<T>(deck: T[]): void {
        // read array from the highest index to lowest
        for (let i = deck.length - 1; i >= 1; i--) {
            // generate a random number j such that 0 <= j <= i
            const j = Math.floor(Math.random() * (i + 1));

            // swap the current element with the randomly generated index
            const temp = deck[i];
            deck[i] = deck[j];
            deck[j] = temp;
        }
    }
}
