import { round } from "mathjs";
import { Crons } from "sc-slot-game-base";
import CascadingClusterGameData from "../game-data";
import { helpers } from "sc-common";

export default class CascadingProcessBetQueue extends Crons.SlotProcessBetQueue {
    declare gameData: CascadingClusterGameData;
    async generateBetInfo(payload, freeSpinInfo) {
        // TODO: Review contribution rate
        const betInfo = { ...payload };
        const { cascadingClusterConfig } = this.gameData.gameConfigs;

        betInfo.betMultiplier = cascadingClusterConfig.betMultiplier;

        if (freeSpinInfo) {
            const { betLevel, coinValue, betMultiplier } = freeSpinInfo;

            betInfo.betLevel = betLevel;
            betInfo.coinValue = coinValue;
            betInfo.betMultiplier = betMultiplier;
        }

        let buyFreeSpinMultiplier = 1;
        if (payload.buyFreeSpin) {
            buyFreeSpinMultiplier = 50;
        }

        betInfo.totalAmount = round(betInfo.betLevel * betInfo.coinValue * betInfo.betMultiplier * buyFreeSpinMultiplier, 2);

        return betInfo;
    }

    isValidBuyFreeSpin(player) {
        // TODO: should check buyFreeSpin enabled
        return !this.freeSpinsConsumer.hasFreeSpin(player) && !this.isInPromotionPeriod(player);
    }

    isInPromotionPeriod(player) {
        return (
            this.hasValidPromotion(player) &&
            player.promotion.remainingBonusItems < player.promotion.initialBonusItem &&
            (player.promotion.remainingBonusItems > 0 || player.promotion.freeSpinAvailable > 0)
        );
    }

    async proceedBet(player, payload) {
        if (payload.buyFreeSpin && !this.isValidBuyFreeSpin(player)) {
            this.placeBetPublisher.publishGameFailedBet(player.UID, { endBet: -1, notice: { errorCode: helpers.noticeHelper.invalidBet } });
            return;
        }

        if (this.gameData.ingame[player.profile.name]?.finish) {
            this.placeBetPublisher.publishGameFailedBet(player.UID, { endBet: -1, notice: { errorCode: helpers.noticeHelper.cannotPlaceBet } });

            return;
        }

        const soonestExpiredFreeSpinSet = this.freeSpinsConsumer.getSoonestExpiredFreeSpinSet(player);

        payload.freeSpin = this.validateFreeSpinEligibility(soonestExpiredFreeSpinSet, player, payload.freeSpin);
        if (this.hasValidPromotion(player)) {
            player.promotion.freeSpinAvailable = this.freeSpinsConsumer.getTotalPromotionAvaiableFreeSpins(player);
        }

        if (payload.freeSpin && !this.hasValidFreeSpinSource(soonestExpiredFreeSpinSet, player)) {
            if (!payload.autoSettle) {
                this.handleInvalidFreeSpin(player);
            }
            return;
        }

        this.gameData.roundId = await this.idCountersConsumer.consume("round");
        const betInfo = await this.generateBetInfo(payload, soonestExpiredFreeSpinSet);

        await super.proceedBet(player, betInfo);
    }

    async upsertBetWithFreeSpinInfo(player, roundId, bet, rate, freeSpinId, applicableInterceptors) {
        const { cascadingClusterConfig } = this.gameData.gameConfigs;

        let newBet: any = {
            id: roundId,
            uid: player.UID,
            name: player.profile.name,
            freeBet: bet.freeBet,
            time: new Date(),
            freeSpin: bet.freeSpin,
            freeSpinId: freeSpinId,
            betLevel: bet.betLevel,
            coinValue: bet.coinValue,
            betMultiplier: bet.betMultiplier,
            totalAmount: bet.totalAmount,
            currencyCode: player.session.currencyCode,
            currencyGroupId: player.session.currencyGroupId,
            rate: rate,
            exchangeRateId: this.gameData.exchangeRates.exId,
            odds: {
                symbols: cascadingClusterConfig.odds,
                freeSpins: cascadingClusterConfig.freeSpins,
            },
        };

        if (applicableInterceptors) {
            newBet = this.executeInterceptorTransform("enhanceBetRecord", applicableInterceptors, {
                betRecord: newBet,
                bet,
            });
        }

        if (player.session) {
            newBet.siteId = player.session.siteId;
            newBet.currency = player.session.currencyName;

            newBet.operatorId = player.session.operatorId;
            newBet.playerId = player.session.playerId;
            newBet.appType = player.session.system;
            newBet.siteName = player.session.siteName;
        }

        await this.roundsRepository.create(newBet);
    }

    async handleSuccessBet(player, balance, roundId, bet, applicableInterceptors) {
        let freeSpinInfo = null;
        if (bet.freeSpin) {
            freeSpinInfo = await this.freeSpinsConsumer.useFreeSpin(player);
        }

        if (freeSpinInfo) {
            bet.coinValue = freeSpinInfo.coinValue;
            bet.betLevel = freeSpinInfo.betLevel;
            bet.betMultiplier = freeSpinInfo.betMultiplier;
        }

        const rate = this.calculateCurrencyRate(player.session);

        await this.upsertBetWithFreeSpinInfo(player, roundId, bet, rate, freeSpinInfo?.id, applicableInterceptors);
        this.notifyPlacingBetResult(player, balance, bet, rate);

        const { betWin, reachMaxWin } = await this.settleGameRoundConsumer.settlePlayerRound(player, roundId, bet.buyFreeSpin);

        if (applicableInterceptors) {
            bet.roundId = roundId;
            bet.betWin = betWin;
            player.reachMaxWin = reachMaxWin;

            await this.executeInterceptorEvent("afterSuccessEvent", applicableInterceptors, {
                player,
                bet: {
                    roundId,
                    betWin: betWin,
                    baseBetWin: betWin * rate,
                    amount: bet.totalAmount,
                    baseAmount: bet.totalAmount * rate,
                },
                balance,
            });
        }
    }
}
