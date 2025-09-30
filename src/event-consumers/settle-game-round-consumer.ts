import { round as mathRound } from "mathjs";
import mongoose from "mongoose";
import { Core } from "sc-game-base";
import { EventPublishers, SlotGameDefinition } from "sc-slot-game-base";
import RoundCalculator, { TumbleRecord } from "../cluster-board/round-calculator";
import CascadingClusterGameData from "../game-data";
import { Round } from "../models/interfaces";
import FreeSpinsConsumer from "./free-spins-consumer";
import TotalMultiplierConsumer from "./total-multiplier-consumer";

export default class SettleGameRoundConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
    declare gameData: CascadingClusterGameData;
    declare roundCalculator: RoundCalculator;
    declare freeSpinsConsumer: FreeSpinsConsumer;
    declare totalMultiplierConsumer: TotalMultiplierConsumer;
    declare definition: SlotGameDefinition;
    declare roundsRepository: mongoose.Model<Round>;
    declare jackpotsPublisher: EventPublishers.JackpotPublisher;

    constructor({
        definition,
        gameData,
        roundResultPublisher,
        userBetResultPublisher,
        freeSpinsConsumer,
        endGame,
        roundsRepository,
        betsRepository,
        totalMultiplierConsumer,
        roundCalculator,
        gameManagementApiClientFactory,
    }) {
        super({
            definition,
            gameData,
            roundResultPublisher,
            userBetResultPublisher,
            endGame,
            roundsRepository,
            betsRepository,
            gameManagementApiClientFactory,
        });

        this.freeSpinsConsumer = freeSpinsConsumer;
        this.totalMultiplierConsumer = totalMultiplierConsumer;
        this.roundCalculator = roundCalculator;
    }

    async settlePlayerRound(player: any, roundId: number) {
        const round = await this.queryRound(roundId);

        if (round) {
            await this.processSpinning(player, round);

            round.paid = true;
            round.endTime = new Date();
            round.sessionId = player.session?.sessionId;

            const betResult = this.calculateBetResult(round);

            await round.save();

            const metaData = this.createMetadata({ bet: round, settlementResult: round.settlementResult, result: round.result });
            await this.callEndGame(round, roundId, round.endTime, betResult, metaData);
            await this.processFreeSpins(player, round);
            await this.userBetResultPublisher.publishToUser(round.uid, this.collectRoundResult(player, round, betResult));

            return { betWin: round.betWin };
        }

        return { betWin: 0 };
    }

    async processSpinning(player, round: Round) {
        const currencyGroupSettings = this.gameData.currencyGroupGames.find((x) => x.groupId.toString() === player.session.currencyGroupId);
        const maxWinPerRound = mathRound(currencyGroupSettings.maxWinPerRound * round.totalAmount, 2);
        const resultFromAdmin = this.gameData.settlementResultFromAdmin[player.profile.name];
        if(resultFromAdmin) {
            this.calculateBetResultFromAdmin(round, maxWinPerRound, resultFromAdmin);
            delete this.gameData.settlementResultFromAdmin[player.profile.name];
            return;
        }

        this.roundCalculator.processSpinning(
            round,
            maxWinPerRound
        );

    }

    calculateBetResultFromAdmin(round: any, maxWinPerRound: number, resultFromAdmin: any) {
        let totalWin = 0;
        const baseBet = round.betLevel * round.coinValue;
        const { tumbles, freeSpins } = resultFromAdmin;
        
        for(const tumble of tumbles) {
            if(tumble.symbols) {
                const winEachTumble = tumble.symbols.reduce((sum, symbol) => {
                        return sum + (symbol.odds * symbol.multiplier);
                    }, 0);
                totalWin += winEachTumble * baseBet;
            }
        }
        round.settlementResult = {tumbles, freeSpins};
        round.betWin = Math.min(totalWin, maxWinPerRound);
        round.reachMaxWin = totalWin >= maxWinPerRound;
        round.actualBetwin = totalWin;
    }


    async processFreeSpins(player, round) {
        const { id, settlementResult } = round;
        if (settlementResult.freeSpins?.odds > 0) {
            await this.freeSpinsConsumer.gainFreeSpin(
                player,
                {
                    roundId: id,
                    totalAmount: round.totalAmount,
                    coinValue: round.coinValue,
                    betLevel: round.betLevel,
                    betMultiplier: round.betMultiplier,
                    numberOfFreeSpins: settlementResult.freeSpins.odds,
                },
                this.definition.freeSpinLiveSeconds
            );
        }

        let totalAvailableFreeSpins = this.freeSpinsConsumer.getTotalAvaiableFreeSpins(player);

        if (round.promotionId) {
            totalAvailableFreeSpins += player.promotion?.remainingBonusItems ?? 0;
        }

        if (totalAvailableFreeSpins === 0) {
            await this.totalMultiplierConsumer.stopChain(player);
        }
    }

    async queryRound(roundId) {
        return await this.roundsRepository.findOne({ id: roundId, paid: false }).exec();
    }

    calculateBetResult(round): any {
        const { bigWinRatio } = this.gameData.gameConfigs.cascadingClusterConfig;

        const betResult = {
            totalBetAmount: round.totalAmount,
            totalWin: round.betWin,
            netWin: round.betWin > 0 ? round.betWin - round.totalAmount : 0,
            totalLost: 0,
            bigWin: false,
        };

        betResult.totalLost = betResult.totalBetAmount > betResult.totalWin ? betResult.totalBetAmount - betResult.totalWin : 0;
        betResult.bigWin = betResult.totalWin / bigWinRatio[0] >= betResult.totalBetAmount;

        return betResult;
    }

    collectRoundResult(player, round, betResult): any {
        return {
            finish: {
                roundId: round.id,
                win: round.betWin,
                bigWin: betResult.bigWin,
                freeSpins: round.settlementResult.freeSpins.odds,
                totalFreeSpins: this.freeSpinsConsumer.getTotalAvaiableFreeSpins(player),
                tumbles: round.settlementResult.tumbles.map((tumble: TumbleRecord) => ({
                    symbols: tumble.symbols,
                    win: tumble.win,
                    reels: tumble.reels,
                    reelMultipliers: tumble.reelMultipliers,
                    rageMeter: tumble.rageMeter,
                    triggeredStage: tumble.triggeredStage,
                    triggeredPositions: tumble.triggeredPositions,
                    newSymbols: tumble.newSymbols,
                })),
                isFreeSpin: round.freeSpin,
                reachMaxWin: round.reachMaxWin,
                actualBetwin: round.actualBetwin,
            },
        };
    }

    formatEndGameInfo(bet, roundId, time, betResult) {
        const { gameInfo, settlementInfo } = super.formatEndGameInfo(bet, roundId, time, betResult);

        if (bet.freeSpin) {
            settlementInfo.redPlay = 0;
            settlementInfo.baseTotalAmount = 0;
        }

        return { gameInfo, settlementInfo };
    }
}
