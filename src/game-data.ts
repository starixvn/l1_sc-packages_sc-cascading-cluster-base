import { SlotGameData } from "sc-slot-game-base";

export type GameConfigs = {
    gameId: number;
    bot_maxbet: number;
    botenabled: boolean;
    cascadingClusterConfig: {
        bigWinRatio: number[];
        tileMultiplier: {
            step: number;
            max: number;
        };
        betLevels: number[];
        rageMeters: number[];
        betMultiplier: number;
        odds: {
            [key: number]: {
                from: number;
                to: number;
                odds: number;
            }[];
        };
        freeSpins: {
            initialOdds: {
                count: number;
                odds: number;
            }[];
        };
    };
    delayStartTime: number;
    disabled_message: string;
    disabledround: number;
    displayName: string;
    enableFreeBet: boolean;
    enabled: boolean;
    exchangeReload: boolean;
    hour_maxbot: number[];
    maxWinPerRound: number;
    maxbet: number;
    minbet: number;
    name: string;
    siteExclusions: string[];
    time: Date;
    type: number;
};

export type ExchangeRates = {
    exId: number;
    time: string;
    source: string;
    code: Record<string, number>;
};

export type RealPlayer = {
    UID: string;
    profile: { name: string; minBet: number; maxBet: number };
    session: any;
    socketClient: any;
    promotion: any;
};

export default class CascadingClusterGameData extends SlotGameData {
    declare gameConfigs: GameConfigs;
    declare exchangeRates: ExchangeRates;
    declare realPlayers: Record<string, RealPlayer>;
}
