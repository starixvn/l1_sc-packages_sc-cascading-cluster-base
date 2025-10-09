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
            this.gameData.ingame[memberName].freeSpins.push(newlyCachedFreeSpin);
            this.updatePlayerPromotionFreeSpins(player, newlyCreatedFreeSpin);
        }
    }

    queryFreeSpins() {
        const filter = {
            available: { $gt: 0 },
            reachMaxWin: false,
        };
        const projection = {
            _id: false,
            playerId: false,
            __v: false,
            __archive: false,
        };

        return this.freeSpinsRepository
            .find(filter, projection, { sort: { expiryTime: 1 } })
            .lean()
            .exec();
    }

    async updateReachMaxWin(player, freeSpinId: number) {
        await this.freeSpinsRepository.updateOne({ uid: player.UID, id: freeSpinId }, { reachMaxWin: true });
        this.gameData.ingame[player.profile.name].reachMaxWin = true;
    }

    getSoonestExpiredFreeSpinSet(player) {
        const freeSpinsOfPlayer = this.gameData.ingame[player.profile.name]?.freeSpins ?? [];

        return freeSpinsOfPlayer.find((freeSpin) => freeSpin.available > 0 && !freeSpin.reachMaxWin);
    }
}
