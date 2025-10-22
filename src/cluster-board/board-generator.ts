import Chance from "chance";
import FgReels from "./fg-reels";
import Grid from "./grid";
import NgReels from "./ng-reels";
import NgResult from "./ng-result";
import Result, { ResultCategory } from "./result";
import Config from "./config";
export default class BoardGenerator {
    private readonly gridSize: number = 6;
    private readonly chance: Chance.Chance;
    private readonly notWinSymbolSets: number[];
    private readonly buyFreeSpinMode: Record<number, number[]>;

    constructor() {
        this.chance = new Chance();
        this.notWinSymbolSets = [0, 1, 2, 3, 4, 5, 6, 7].map((symbol) => Array.from({ length: 4 }, () => symbol)).flat();
        this.buyFreeSpinMode = {
            1: Config.scatterWeight,
            2: Config.scatterWeightForSupper,
        };
    }

    public generateNormalGameBoard(): Result {
        const ngResult = new NgResult();
        ngResult.reelSetIndex = this.chance.weighted(NgReels.reelsIndex, NgReels.weight);
        this.genGrid(NgReels.reels[ngResult.reelSetIndex], ngResult);
        ngResult.gridMultipliers = this.initializeGridMultiplier();

        return ngResult;
    }

    public generateFreeSpinBoard(fgResult: Result, resetMultiplier = true): Result {
        fgResult.reelSetIndex = this.chance.weighted(FgReels.reelsIndex, FgReels.weight);
        this.genGrid(FgReels.reels[fgResult.reelSetIndex], fgResult);
        fgResult.gridMultipliers = resetMultiplier ? this.initializeGridMultiplier() : fgResult.gridMultipliers;

        return fgResult;
    }

    public generateSuperFreeSpinBoard(fgResult: Result, resetMultiplier = true): Result {
        fgResult.reelSetIndex = this.chance.weighted(FgReels.reelsIndex, FgReels.superWeight);
        this.genGrid(FgReels.reels[fgResult.reelSetIndex], fgResult);
        fgResult.gridMultipliers = resetMultiplier ? this.initializeGridMultiplierForSuperFreeSpin() : fgResult.gridMultipliers;

        return fgResult;
    }

    public generateBaseGameBoard(ngResult: Result): Result {
        ngResult.reelSetIndex = this.chance.weighted(NgReels.reelsIndex, NgReels.weight);
        this.genGrid(NgReels.reels[ngResult.reelSetIndex], ngResult);
        ngResult.gridMultipliers = this.initializeGridMultiplier();

        return ngResult;
    }
    public detonateAndCascadeBoard(result: Result): number[][] {
        const newSymbols: number[][] = Array.from({ length: this.gridSize }, () => []);
        this.detonateSymbols(result);
        this.cascadeSymbols(result, newSymbols);
        return newSymbols;
    }

    private detonateSymbols(result: Result): void {
        for (let i = 0; i < this.gridSize; i++) {
            result.reels[i] = result.reels[i].filter((grid) => !grid.isDetonated);
        }
    }

    private cascadeSymbols(result: Result, newSymbols: number[][]): void {
        for (let i = 0; i < this.gridSize; i++) {
            while (result.reels[i].length < this.gridSize) {
                result.stopIndex[i]--;
                const symbol = this.getNextSymbol(result, i);
                result.reels[i].unshift(new Grid(symbol));
                newSymbols[i].push(symbol);
            }
        }
    }

    private getNextSymbol(result: Result, reelIndex: number): number {
        if (result.stopIndex[reelIndex] < 0) {
            const reelSet = result.category === ResultCategory.Ng ? NgReels.reels[result.reelSetIndex] : FgReels.reels[result.reelSetIndex];
            result.stopIndex[reelIndex] = reelSet[reelIndex].length - 1;
        }

        const reelSet = result.category === ResultCategory.Ng ? NgReels.reels[result.reelSetIndex] : FgReels.reels[result.reelSetIndex];
        return reelSet[reelIndex][result.stopIndex[reelIndex]];
    }

    public initializeGridMultiplier(): number[][] {
        return [
            [-1, -1, -1, -1, -1, -1],
            [-1, -1, -1, -1, -1, -1],
            [-1, -1, -1, -1, -1, -1],
            [-1, -1, -1, -1, -1, -1],
            [-1, -1, -1, -1, -1, -1],
            [-1, -1, -1, -1, -1, -1],
        ];
    }

    public initializeGridMultiplierForSuperFreeSpin(): number[][] {
        return [
            [1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1],
        ];
    }

    private genGrid(reelSet: number[][], result: Result): void {
        result.reels = [];
        for (let i = 0; i < this.gridSize; i++) {
            result.stopIndex[i] = this.chance.integer({ min: 0, max: reelSet[i].length - 1 });
            result.reels.push([]);
            for (let j = 0; j < this.gridSize; j++) {
                const symbol = reelSet[i][(result.stopIndex[i] + j) % reelSet[i].length];
                result.reels[i].push(new Grid(symbol));
            }
        }
    }

    generateScatterBoards(result: Result, numberOfScatter: number): Result {
        result.reels = [];
        let sample = [
            ...Array.from({ length: numberOfScatter }, () => Config.scatterSymbol),
            ...this.chance.pickset(this.notWinSymbolSets, this.gridSize * this.gridSize - numberOfScatter),
        ];
        sample = this.chance.shuffle(sample);
        for (let i = 0; i < this.gridSize; i++) {
            result.reels.push([]);
            for (let j = 0; j < this.gridSize; j++) {
                const index = sample.shift();
                result.reels[i].push(new Grid(index));
            }
        }

        return result;
    }

    generateScatterBoardsRandom(result: Result, buyFreeSpinMode: number): Result {
        const numberOfScatterRandom = this.chance.weighted(Config.scatterCounts, this.buyFreeSpinMode[buyFreeSpinMode]);
        result.gridMultipliers = this.initializeGridMultiplier();
        result.featureQueue = [];
        return this.generateScatterBoards(result, numberOfScatterRandom);
    }
}
