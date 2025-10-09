export interface FreeRoundState {
    time: Date;
    roundId: number;
    reelMultipliers: number[][];
    stageQueue: number[];
    currentStage: number;
    rageMeter: number;
}
