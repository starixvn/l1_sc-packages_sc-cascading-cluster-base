import Grid from "./grid";

export enum ResultCategory {
    Ng = "Ng",
    Fg = "Fg",
}

class Result {
    // Fg Keep the info until the Fg end
    public category: ResultCategory;
    public rageCounter: number;
    public gridMultipliers: number[][];
    public featureTriggered: boolean[];

    public featureQueue: number[];

    // Fg Update Every Round
    public reelSetIndex: number;
    public stopIndex: number[];
    public reels: Grid[][];
    public winScore: number;
    public tumbles: any[]; // Can be further typed based on usage
    public freeSpins: { count: number; odds: number };
    public reachedMaxWin: boolean;

    constructor(category: ResultCategory) {
        this.category = category;
        this.rageCounter = 0;
        this.gridMultipliers = [];
        this.featureTriggered = [false, false, false, false];

        this.featureQueue = [];

        this.reelSetIndex = 0;
        this.stopIndex = new Array(6).fill(0);
        this.reels = [];
        this.winScore = 0;
        this.tumbles = [];
        this.freeSpins = { count: 0, odds: 0 };
    }

    // Queue operations
    public offerToQueue(value: number): void {
        this.featureQueue.push(value);
    }

    public pollFromQueue(): number | undefined {
        return this.featureQueue.shift();
    }

    public isQueueEmpty(): boolean {
        return this.featureQueue.length === 0;
    }
}

export default Result;
