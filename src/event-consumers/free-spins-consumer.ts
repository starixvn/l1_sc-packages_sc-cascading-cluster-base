import { EventConsumers } from "sc-slot-game-base";
import CascadingClusterGameData from "../game-data";
import { Round } from "../models/interfaces/round-interface";
import mongoose from "mongoose";
import { FreeSpin } from "../models/interfaces";
``;

export default class FreeSpinsConsumer extends EventConsumers.FreeSpinsConsumer {
    declare gameData: CascadingClusterGameData;
    declare roundsRepository: mongoose.Model<Round>;
    declare userSessionsRepository: mongoose.Model<any>;
    declare freeSpinsRepository: mongoose.Model<FreeSpin>;

    async reload() {
        const execTime = new Date();

        const freeSpins = await this.queryFreeSpins();
        const activeFreeSpins = freeSpins.filter((freeSpin) => freeSpin.expiryTime > execTime);

        const freeSpinsGroupedByNames = this.groupFreeSpinsByNames(activeFreeSpins);
        const freeSpinsGroupedByUIDs = this.groupFreeSpinsByUIDs(activeFreeSpins);

        await this.cleanUpGameNotifications(freeSpinsGroupedByUIDs);
        Object.entries(this.gameData.ingame as Record<string, any>).forEach(([name, ingameData]) => {
            const loadedFreeSpins = freeSpinsGroupedByNames[name] ?? [];

            delete ingameData.freeSpins;
            delete freeSpinsGroupedByNames[name];

            ingameData.freeSpins = loadedFreeSpins;
        });

        Object.entries(freeSpinsGroupedByNames).forEach(([name, loadedFreeSpins]) => {
            this.gameData.ingame[name] = this.gameData.ingame[name] ?? { betQueue: [] };
            this.gameData.ingame[name].freeSpins = loadedFreeSpins ?? [];
        });

        const expiredFreeSpins = freeSpins.filter((freeSpin) => freeSpin.expiryTime <= execTime);

        const freeSpinsNeedToSettle = expiredFreeSpins.filter((freeSpin) => !this.isPlayerInGame(freeSpin.name));
        const freeSpinsNeedToCache = expiredFreeSpins.filter((freeSpin) => this.isPlayerInGame(freeSpin.name));

        freeSpinsNeedToSettle.length > 0 && (await this.settleExpiredFreeSpins(freeSpinsNeedToSettle));
        freeSpinsNeedToCache.length > 0 && this.cacheExpiredFreeSpins(freeSpinsNeedToCache);
    }

    async settleExpiredFreeSpins(expiredFreeSpins) {
        const freeSpinsGroupedByNames = this.groupFreeSpinsByNames(expiredFreeSpins) as Record<string, FreeSpin[]>;

        await Promise.all(
            Object.entries(freeSpinsGroupedByNames).map(async ([name, loadedFreeSpins]) => {
                const round = await this.roundsRepository.findOne({ id: loadedFreeSpins[0].roundId }).lean().exec();
                const userSession = await this.userSessionsRepository
                    .findOne({ playerId: round.playerId }, "ip operatorToken")
                    .sort({ _id: -1 })
                    .lean()
                    .exec();
                const player = {
                    UID: round.uid,
                    profile: {
                        name: name,
                    },
                    session: {
                        currencyName: round.currency,
                        operatorId: round.operatorId,
                        siteId: round.siteId,
                        playerId: round.playerId,
                        multiplier: round.betMultiplier,
                        currencyCode: round.currencyCode,
                        currencyGroupId: round.currencyGroupId,
                        ip: userSession.ip,
                        operatorToken: userSession.operatorToken,
                    },
                };

                if (player.session.currencyGroupId && player.session.currencyCode) {
                    this.initPlayerFreeSpins(name, loadedFreeSpins);

                    const totalFreeSpins = loadedFreeSpins.reduce((sum, freeSpin) => sum + freeSpin.available, 0);

                    this.gameData.ingame[name].betQueue.push(
                        ...Array.from({ length: totalFreeSpins }).fill({ player, payload: { freeSpin: true, autoSettle: true } })
                    );
                }
            })
        );
    }

    cacheExpiredFreeSpins(expiredFreeSpins) {
        const freeSpinsGroupedByNames = this.groupFreeSpinsByNames(expiredFreeSpins);

        Object.entries(freeSpinsGroupedByNames).map(([name, loadedFreeSpins]) => {
            this.initPlayerFreeSpins(name, loadedFreeSpins);
        });
    }

    initPlayerFreeSpins(name, loadedFreeSpins) {
        this.gameData.ingame[name] = this.gameData.ingame[name] ?? { betQueue: [] };
        this.gameData.ingame[name].freeSpins = (this.gameData.ingame[name].freeSpins ?? []).concat(loadedFreeSpins);
    }

    isPlayerInGame(name) {
        return Object.values(this.gameData.realPlayers).some(
            (player) => player.profile.name === name && player.socketClient && player.socketClient.connected
        );
    }

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
