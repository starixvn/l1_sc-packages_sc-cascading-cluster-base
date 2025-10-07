import { EventConsumers } from "sc-slot-game-base";
import CascadingClusterGameData from "../game-data";

export default class FreeSpinsConsumer extends EventConsumers.FreeSpinsConsumer {
    declare gameData: CascadingClusterGameData;

    async gainFreeSpin(player, { roundId, totalAmount, betLevel, coinValue, numberOfFreeSpins }: any, timeToLive) {
        const createdTime = new Date();
        const expiryTime = new Date(createdTime.getTime()).setSeconds(createdTime.getSeconds() + timeToLive);
        const memberName = player.profile.name;

        await this.idCountersConsumer.consume("freespin");
        this.gameData.freeSpinId++;

        const newlyCachedFreeSpin = {
            id: this.gameData.freeSpinId,
            roundId,
            bet: totalAmount,
            total: numberOfFreeSpins,
            available: numberOfFreeSpins,
            time: createdTime,
            betLevel,
            coinValue,
            betMultiplier: this.gameData.gameConfigs.cascadingClusterConfig.betMultiplier,
            //accumulateWin and rageMeter
            expiryTime: player.usePromotion ? player.promotion.endDate : expiryTime,
            ...(player.usePromotion && { promotionId: player.promotion.promotionId }),
        };

        const gainedFreeSpin = {
            uid: player.UID,
            name: memberName,
            playerId: player.session?.playerId,
            ...newlyCachedFreeSpin,
        };

        const newlyCreatedFreeSpin = await this.freeSpinsRepository.create(gainedFreeSpin);

        if (newlyCreatedFreeSpin) {
            newlyCachedFreeSpin.id = newlyCreatedFreeSpin.id;
            this.gameData.ingame[memberName].freeSpins = this.gameData.ingame[memberName].freeSpins ?? [];
            //this.gameData.ingame[memberName].freeSpinsRageMeter = 0;
            //this.gameData.ingame[memberName].freeSpinsAccumulateWin = win from base game;
            this.gameData.ingame[memberName].freeSpins.push(newlyCachedFreeSpin);
            this.updatePlayerPromotionFreeSpins(player, newlyCreatedFreeSpin);
        }
    }
}
