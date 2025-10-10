export interface FreeSpin {
    id: number;
    uid: string;
    name: string;
    roundId: number;
    bet: number;
    total: number;
    available: number;
    time: Date;
    expiryTime: Date;
    playerId: string;
    betLevel: number;
    coinValue: number;
    betMultiplier: number;
    promotionId: string;
    reachMaxWin: boolean;
}
