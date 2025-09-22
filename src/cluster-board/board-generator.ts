import FgReels from "./fg-reels";
import Grid from "./grid";
import NgReels from "./ng-reels";
import NgResult from "./ng-result";
import Result, { ResultCategory } from "./result";

export default class BoardGenerator {
    private readonly gridSize: number = 6;
    private readonly random = Math.random;

    constructor() {}

    public generateNormalGameBoard(): NgResult {
        const ngResult = new NgResult();
        ngResult.reelSetIndex = Math.floor(this.genSymbolByWeights(NgReels.reelsIndex, NgReels.weightSum, NgReels.weight));
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
            result.stopIndex[i] = Math.floor(Math.random() * reelSet[i].length);
            result.reels.push([]);
            for (let j = 0; j < this.gridSize; j++) {
                const symbol = reelSet[i][(result.stopIndex[i] + j) % reelSet[i].length];
                result.reels[i].push(new Grid(symbol));
            }
        }
    }

    private genSymbolByWeights(arr: number[], sumWeight: number, weights: number[]): number {
        const rand = Math.random();
        let accWeight = weights[0];
        for (let i = 0; i < weights.length; i++) {
            if (rand < accWeight / sumWeight) {
                return arr[i];
            }
            if (i + 1 < weights.length) {
                accWeight += weights[i + 1];
            }
        }
        return arr[arr.length - 1];
    }
}
