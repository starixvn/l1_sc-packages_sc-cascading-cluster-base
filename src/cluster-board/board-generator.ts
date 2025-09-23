import Chance from "chance";
import FgReels from "./fg-reels";
import Grid from "./grid";
import NgReels from "./ng-reels";
import NgResult from "./ng-result";
import Result, { ResultCategory } from "./result";
export default class BoardGenerator {
    private readonly gridSize: number = 6;
    private readonly chance: Chance.Chance;

    constructor() {
        this.chance = new Chance();
    }

    public generateNormalGameBoard(): Result {
        const ngResult = new NgResult();
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

    private initializeGridMultiplier(): number[][] {
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
        for (let i = 0; i < this.gridSize; i++) {
            result.stopIndex[i] = this.chance.integer({ min: 0, max: reelSet[i].length - 1 });
            result.reels.push([]);
            for (let j = 0; j < this.gridSize; j++) {
                const symbol = reelSet[i][(result.stopIndex[i] + j) % reelSet[i].length];
                result.reels[i].push(new Grid(symbol));
            }
        }
    }
}
