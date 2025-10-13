export interface Round {
    id: number;
    name: string;
    siteId: string;
    siteName: string;
    uid: string;

    coinValue: number;
    betLevel: number;
    betMultiplier: number;
    totalAmount: number;
    freeSpin: boolean;
    reachMaxWin: boolean;
    freeSpinId?: number;
    rootFreeSpinRoundId?: number;
    buyFreeSpin: boolean;
    result: string;
    settlementResult: any;

    odds: any;
    betWin: number;
    paid: boolean;
    time: Date;
    endTime: Date;

    currency: string;
    currencyCode: string;
    currencyGroupId: string;
    rate: number;
    exchangeRateId: number;

    operatorId: string;
    playerId: string;
    sessionId: string;
    promotionId: string;
    appType: number;
}
