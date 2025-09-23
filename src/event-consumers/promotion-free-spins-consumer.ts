import { EventConsumers } from "sc-slot-game-base";
import CascadingClusterGameData from "../game-data";

export default class PromotionFreeSpinsConsumer extends EventConsumers.PromotionFreeSpinsConsumer {
    declare gameData: CascadingClusterGameData;

    extendPromo(baseData, originalPromotion) {
        return {
            ...baseData,
            betLevel: this.getDefaultBetLevel(),
            coinValue: originalPromotion.coinValue,
        };
    }

    getDefaultBetLevel() {
        const { cascadingClusterConfig } = this.gameData.gameConfigs;

        return cascadingClusterConfig.betLevels[0];
    }
}
