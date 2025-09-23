export interface Round {
    id: number;
    name: string;
    siteId: string;
    siteName: string;
    uid: string;

    coinValue: number;
    betLevel: number;
    betMultiplier: number;
    multiplier: number;
    totalAmount: number;
    totalTumbleWin: number;
    totalMultiplier: number;
    freeSpin: boolean;
    reachMaxWin: boolean;

    result: string;
    settlementResult: any;

    odds: any;
    betwin: number;
    paid: boolean;
    time: Date;
    endTime: Date;

    currency: string;
    rate: number;
    exchangeRateId: number;

    operatorId: string;
    playerId: string;
    sessionId: string;
    promotionId: string;
    appType: number;
}
