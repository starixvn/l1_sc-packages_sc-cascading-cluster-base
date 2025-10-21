import { round } from "mathjs";
import { Crons } from "sc-slot-game-base";
import CascadingClusterGameData from "../game-data";
import SettleGameRoundConsumer from "../event-consumers/settle-game-round-consumer";
import { helpers } from "sc-common";

export default class CascadingProcessBetQueue extends Crons.SlotProcessBetQueue {
    declare gameData: CascadingClusterGameData;
    declare settleGameRoundConsumer: SettleGameRoundConsumer;

    async generateBetInfo(payload, freeSpinInfo) {
        const betInfo = { ...payload };
        const { cascadingClusterConfig } = this.gameData.gameConfigs;

        betInfo.betMultiplier = cascadingClusterConfig.betMultiplier;

        if (freeSpinInfo) {
            const { betLevel, coinValue, betMultiplier } = freeSpinInfo;

            betInfo.betLevel = betLevel;
            betInfo.coinValue = coinValue;
            betInfo.betMultiplier = betMultiplier;
        }
        const buyFreeSpinConfig = [100, 500];
        let buyFreeSpinMultiplier = 1;
        if (payload.buyFreeSpin !== 0 && typeof payload.buyFreeSpin === "number") {
            buyFreeSpinMultiplier = buyFreeSpinConfig[payload.buyFreeSpin - 1];
        }

        betInfo.totalAmount = round(betInfo.betLevel * betInfo.coinValue * betInfo.betMultiplier * buyFreeSpinMultiplier, 2);

        return betInfo;
    }

    isValidBuyFreeSpin(player) {
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
        if (payload.autoSettle) {
            payload.roundId = this.gameData.roundId;
        }

        await super.proceedBet(player, payload);
    }

    async upsertBetWithFreeSpinInfo(player, roundId, bet, rate, freeSpin, applicableInterceptors) {
        const { cascadingClusterConfig } = this.gameData.gameConfigs;

        const { id } = freeSpin ?? {};

        let newBet: any = {
            id: roundId,
            uid: player.UID,
            name: player.profile.name,
            freeBet: bet.freeBet,
            time: new Date(),
            freeSpin: bet.freeSpin,
            freeSpinId: id,
            rootFreeSpinRoundId: freeSpin?.rootFreeSpinRoundId,
            buyFreeSpin: bet.buyFreeSpin,
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

        await this.upsertBetWithFreeSpinInfo(player, roundId, bet, rate, freeSpinInfo, applicableInterceptors);
        this.notifyPlacingBetResult(player, balance, bet, rate);

        const { betWin, reachMaxWin } = await this.settleGameRoundConsumer.settlePlayerRound(
            player,
            roundId,
            bet.buyFreeSpin,
            freeSpinInfo?.buyFreeSpin ?? 0
        );

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
