import Chance from "chance";
import FgReels from "./fg-reels";
import Grid from "./grid";
import NgReels from "./ng-reels";
import NgResult from "./ng-result";
import Result, { ResultCategory } from "./result";
import FgResult from "./fg-result";
import Config from "./config";
export default class BoardGenerator {
    private readonly gridSize: number = 6;
    private readonly chance: Chance.Chance;
    private readonly notWinSymbolSets: number[];

    constructor() {
        this.chance = new Chance();
        this.notWinSymbolSets = [0, 1, 2, 3, 4, 5, 6, 7].map((symbol) => Array.from({ length: 4 }, () => symbol)).flat();
    }

    public generateNormalGameBoard(): Result {
        const ngResult = new NgResult();
        ngResult.reelSetIndex = this.chance.weighted(NgReels.reelsIndex, NgReels.weight);
        this.genGrid(NgReels.reels[ngResult.reelSetIndex], ngResult);
        ngResult.gridMultipliers = this.initializeGridMultiplier();

        return ngResult;
    }

    public generateFreeSpinBoard(fgResult: Result, resetMultiplier: boolean = true): Result {
        fgResult.reelSetIndex = this.chance.weighted(FgReels.reelsIndex, FgReels.weight);
        this.genGrid(FgReels.reels[fgResult.reelSetIndex], fgResult);
        fgResult.gridMultipliers = resetMultiplier ? this.initializeGridMultiplier() : fgResult.gridMultipliers;

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
        // 1. Detonate
        for (let i = 0; i < this.gridSize; i++) {
            result.reels[i] = result.reels[i].filter((grid) => !grid.isDetonated);
        }

        // 2. Cascade
        for (let i = 0; i < this.gridSize; i++) {
            while (result.reels[i].length < this.gridSize) {
                result.stopIndex[i]--;
                let symbol: number;
                if (result.category === ResultCategory.Ng) {
                    if (result.stopIndex[i] < 0) {
                        result.stopIndex[i] = NgReels.reels[result.reelSetIndex][i].length - 1;
                    }
                    symbol = NgReels.reels[result.reelSetIndex][i][result.stopIndex[i]];
                    result.reels[i].unshift(new Grid(symbol));
                    newSymbols[i].push(symbol);
                } else if (result.category === ResultCategory.Fg) {
                    if (result.stopIndex[i] < 0) {
                        result.stopIndex[i] = FgReels.reels[result.reelSetIndex][i].length - 1;
                    }
                    symbol = FgReels.reels[result.reelSetIndex][i][result.stopIndex[i]];
                    result.reels[i].unshift(new Grid(symbol));
                    newSymbols[i].push(symbol);
                }
            }
        }
        return newSymbols;
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
        const sample = [
            ...Array.from({ length: numberOfScatter }, () => Config.scatterSymbol),
            ...this.chance.pickset(this.notWinSymbolSets, this.gridSize * this.gridSize - numberOfScatter),
        ];
        for (let i = 0; i < this.gridSize; i++) {
            result.reels.push([]);
            for (let j = 0; j < this.gridSize; j++) {
                const index = this.chance.integer({ min: 0, max: sample.length - 1 });
                result.reels[i].push(new Grid(sample[index]));
                sample.splice(index, 1);
            }
        }

        return result;
    }
}
