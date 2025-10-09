import { FreeRoundState } from "./free-round-state";

export interface FreeSpinState {
    uid: string;
    playerId: string;
    name: string;
    ended: boolean;
    time: Date;
    endTime: Date;
    totalWin: number;
    rounds: FreeRoundState[];
    promotionId: string;
}
