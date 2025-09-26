import { FreeRoundState } from "./round-total-multiplier-interface";

export interface FreeSpinState {
    uid: string;
    playerId: string;
    name: string;
    ended: boolean;
    time: Date;
    endTime: Date;
    rounds: FreeRoundState[];
    promotionId: string;
}
