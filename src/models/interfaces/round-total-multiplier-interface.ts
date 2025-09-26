export interface FreeRoundState {
    time: Date;
    roundId: number;
    reelMultipliers: number[][];
    stageQueue: number[];
    reachedStages: boolean[];
    rageMeter: number;
}
