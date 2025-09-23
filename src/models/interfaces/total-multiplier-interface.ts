import { RoundTotalMultiplier } from "./round-total-multiplier-interface";

export interface TotalMultiplier {
    uid: string;
    playerId: string;
    name: string;
    ended: boolean;
    time: Date;
    endTime: Date;
    rounds: RoundTotalMultiplier[];
    promotionId: string;
}
