import { EventConsumers } from "sc-slot-game-base";
import CascadingClusterGameData from "../game-data";

export default class InGameConsumer extends EventConsumers.InGameConsumer {
    declare gameData: CascadingClusterGameData;

    private readonly promotionApiClient: any;

    constructor({
        definition,
        gameData,
        roundQuery,
        publisher,
        freeSpinsConsumer,
        getBalance,
        jackpotsRepository,
        jackpotValidator,
        gameManagementApiClientFactory,
        userTrackingClient,
        gamePromotionApiClient,
    }) {
        super({
            definition,
            gameData,
            roundQuery,
            publisher,
            getBalance,
            gameManagementApiClientFactory,
            freeSpinsConsumer,
            jackpotsRepository,
            jackpotValidator,
            userTrackingClient,
        } as any);

        this.promotionApiClient = gamePromotionApiClient.instance();
    }

    async buildPayload(realPlayer: any): Promise<any> {
        const settings = this.gameData.currencyGroupGames.find((x) => x.groupId.toString() === realPlayer.session.currencyGroupId);
        const coinValues = settings?.coinValues;
        const maxWinPerRound = settings?.maxWinPerRound;
        const defaultCoinValue = settings?.defaultCoinValue;

        const { betLevels, betMultiplier, odds, freeSpins: freeSpinsConfig, bigWinRatio, rageMeters } = this.gameData.gameConfigs.cascadingClusterConfig;
        const gameConfigs = {
            coinValues,
            maxWinPerRound,
            betLevels,
            betMultiplier,
            odds: { symbols: odds, freeSpins: freeSpinsConfig },
            defaultCoinValue,
            bigWinRatio,
            rageMeters,
        };

        //todo: get is features enabled from database
        const features = this.getFeatures(true);
        const freeSpins = this.getAvailableFreeSpins(realPlayer);

        const user = await this.getUserInfo(realPlayer);
        const { exchangeRates } = this.gameData;
        const { session } = realPlayer;
        const rate = exchangeRates.code[session.currencyCode] * session.multiplier;

        const payload = {
            features,
            gameConfigs,
            freeSpins,
            totalMultiplier: this.gameData.ingame[realPlayer.profile.name]?.totalMultiplier ?? 0,
            user: {
                ...user,
                rate,
                multiplier: session.multiplier,
            },
            promotion: undefined,
            promotionTOProgress: undefined,
        };

        if (realPlayer.promotion && !realPlayer.promotionTOProgress) {
            payload.promotion = realPlayer.promotion;
        }

        if (realPlayer.promotionTOProgress) {
            await this.updatePromotionTOProgress(realPlayer);

            payload.promotionTOProgress = {
                totalTO: realPlayer.promotionTOProgress.totalTurnover,
                minTO: realPlayer.promotionTOProgress.minRequiredTurnover,
                remainTO: realPlayer.promotionTOProgress.remainingTO,
                progress: realPlayer.promotionTOProgress.progressPercentage,
                canClaim: realPlayer.promotionTOProgress.canClaim,
                win: realPlayer.promotionTOProgress.totalWinAmount,
                expire: realPlayer.promotionTOProgress.claimExpirationDate,
                promotionId: realPlayer.promotion.promotionId,
            };
        }

        return payload;
    }

    async updatePromotionTOProgress(realPlayer) {
        const { session, promotion } = realPlayer;
        const promotionTOProgress = await this.promotionApiClient.getTOProgress({
            promotionId: promotion.promotionId,
            playerId: session.playerId,
            operatorId: session.operatorId,
            siteName: session.siteName,
        });

        realPlayer.promotionTOProgress = {
            totalTurnover: promotionTOProgress.totalTurnover,
            minRequiredTurnover: promotionTOProgress.minRequiredTurnover,
            remainingTO: promotionTOProgress.remainingTO,
            progressPercentage: promotionTOProgress.progressPercentage,
            canClaim: promotionTOProgress.canClaim,
            totalWinAmount: promotionTOProgress.totalWinAmount,
            claimExpirationDate: promotionTOProgress.claimExpirationDate,
        };
    }

    getAvailableFreeSpins(realPlayer: any): any {
        const totalOfFreeSpins = this.freeSpinsConsumer.getTotalAvaiableFreeSpins(realPlayer);
        const soonestExpiredFreeSpin = this.freeSpinsConsumer.getSoonestExpiredFreeSpinSet(realPlayer);
        // TODO: get buyFreeSpins
        const buyFreeSpins = false;
        // TODO: get multiplier
        const multiplier = [];
        // TODO: get rageMeterPoint
        const rageMeterPoint = 0;

        return {
            total: totalOfFreeSpins,
            betLevel: soonestExpiredFreeSpin?.betLevel,
            coinValue: soonestExpiredFreeSpin?.coinValue,
            betMultiplier: soonestExpiredFreeSpin?.betMultiplier,
            promotionId: soonestExpiredFreeSpin?.promotionId,
            buyFreeSpins,
            multiplier,
            rageMeterPoint
        };
    }

    getFeatures(isEnabled: boolean): any {
        return {
            buyFreeSpins: {
                enabled: isEnabled,
                multiplier: 50
            },
            buySuperFreeSpins: {
                enabled: isEnabled,
                multiplier: 500
            }
        }
    }
}
