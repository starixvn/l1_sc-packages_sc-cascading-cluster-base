import { round as mathRound } from "mathjs";
import mongoose from "mongoose";
import { Core } from "sc-game-base";
import { EventPublishers, SlotGameDefinition } from "sc-slot-game-base";
import Config from "../cluster-board/config";
import RoundCalculator, { TumbleRecord } from "../cluster-board/round-calculator";
import CascadingClusterGameData from "../game-data";
import { Player, Round } from "../models/interfaces";
import FreeSpinStateConsumer from "./free-spin-state-consumer";
import FreeSpinsConsumer from "./free-spins-consumer";
import { BoardGenerator, FgResult, NgResult, Result } from "../cluster-board";

export default class SettleGameRoundConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
    declare gameData: CascadingClusterGameData;
    declare roundCalculator: RoundCalculator;
    declare freeSpinsConsumer: FreeSpinsConsumer;
    declare freeSpinStateConsumer: FreeSpinStateConsumer;
    declare definition: SlotGameDefinition;
    declare roundsRepository: mongoose.Model<Round>;
    declare jackpotsPublisher: EventPublishers.JackpotPublisher;
    declare boardGenerator: BoardGenerator;

    constructor({
        definition,
        gameData,
        roundResultPublisher,
        userBetResultPublisher,
        freeSpinsConsumer,
        endGame,
        roundsRepository,
        betsRepository,
        freeSpinStateConsumer,
        roundCalculator,
        gameManagementApiClientFactory,
        boardGenerator,
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
        this.freeSpinStateConsumer = freeSpinStateConsumer;
        this.roundCalculator = roundCalculator;
        this.boardGenerator = boardGenerator;
    }

    async settlePlayerRound(player: any, roundId: number, buyFreeSpin: boolean) {
        const round = await this.queryRound(roundId);

        if (round) {
            const spinResult = await this.processSpinning(player, round, buyFreeSpin);

            round.paid = true;
            round.endTime = new Date();
            round.sessionId = player.session?.sessionId;

            const betResult = this.calculateBetResult(round);

            await round.save();

            const metaData = this.createMetadata({ bet: round, settlementResult: round.settlementResult, result: round.result });
            await this.callEndGame(round, roundId, round.endTime, betResult, metaData);

            if (round.reachMaxWin) {
                await this.handleReachMaxWin(player, round);
            } else {
                await this.processFreeSpins(player, round, spinResult);
            }

            await this.userBetResultPublisher.publishToUser(round.uid, this.collectRoundResult(player, round, betResult));

            return { betWin: round.betWin, reachMaxWin: round.reachMaxWin };
        }

        return { betWin: 0, reachMaxWin: false };
    }

    async handleReachMaxWin(player, round: Round) {
        if (round.freeSpin) {
            await this.freeSpinStateConsumer.stopChain(player);
        }

        if (round.freeSpinId) {
            await this.freeSpinsConsumer.updateReachMaxWin(player, round.freeSpinId);
        }
    }

    async processSpinning(player, round: Round, buyFreeSpin: boolean) {
        // if freespin round, get accumulateWin from ingame (in DB will get from accumulateWin from freespincollection) to compare with maxWin config
        const { result, freeSpinTotalWin } = this.getAccumulateSpinData(player);
        const maxWinPerRound = this.getMaxWin(player, freeSpinTotalWin, round.freeSpin);
        const resultFromAdmin = this.gameData.settlementResultFromAdmin[player.profile.name];
        if (resultFromAdmin) {
            this.calculateBetResultFromAdmin(round, maxWinPerRound, resultFromAdmin);
            delete this.gameData.settlementResultFromAdmin[player.profile.name];
            return null;
        }

        if (round.freeSpin) {
            const spinResult = this.roundCalculator.processSpinning2(round, maxWinPerRound, result, (result) => {
                return this.boardGenerator.generateFreeSpinBoard(result, false);
            });
            await this.freeSpinStateConsumer.updateFreeSpinState(player, {
                roundId: round.id,
                currentStage: spinResult.currentStage,
                reelMultipliers: spinResult.gridMultipliers,
                stageQueue: spinResult.featureQueue,
                rageMeter: spinResult.rageCounter,
                totalWin: freeSpinTotalWin + round.betWin,
            });
            return spinResult;
        } else {
            return this.roundCalculator.processSpinning2(round, maxWinPerRound, new NgResult(), (result) => {
                if (buyFreeSpin) {
                    return this.boardGenerator.generateScatterBoardsRandom(result);
                }
                return this.boardGenerator.generateBaseGameBoard(result);
            });
        }
    }

    getAccumulateSpinData(player: Player): { result: Result; freeSpinTotalWin: number } {
        const { freeSpinState, freeSpinTotalWin } = this.freeSpinStateConsumer.getCurrentState(player);
        const result = new FgResult();
        if (freeSpinState) {
            result.gridMultipliers = freeSpinState.reelMultipliers;
            result.currentStage = freeSpinState.currentStage;
            result.featureQueue = freeSpinState.stageQueue;
            result.rageCounter = freeSpinState.rageMeter;
        } else {
            result.gridMultipliers = this.boardGenerator.initializeGridMultiplier();
        }
        return { result, freeSpinTotalWin };
    }

    getMaxWin(round: Round, freeSpinTotalWin: number, isFreeSpin: boolean) {
        const { maxWinPerRound } = this.gameData.gameConfigs;
        const maxWin = mathRound(maxWinPerRound * round.betLevel * round.coinValue * round.betMultiplier, 2);

        if (isFreeSpin) {
            return maxWin - freeSpinTotalWin;
        }

        return maxWin;
    }

    calculateBetResultFromAdmin(round: any, maxWinPerRound: number, resultFromAdmin: any) {
        let totalWin = 0;
        const baseBet = round.betLevel * round.coinValue;
        const { tumbles } = resultFromAdmin;
        const { odds, freeSpins } = this.gameData.gameConfigs.cascadingClusterConfig;

        for (const tumble of tumbles) {
            if (tumble.symbols) {
                const winEachTumble = tumble.symbols.reduce((sum, symbol) => {
                    const oddGameConfig = odds[symbol.symbolType].find((x) => symbol.count >= x.from && symbol.count <= x.to)?.odds ?? 0;
                    symbol.odds = oddGameConfig;
                    symbol.win = oddGameConfig * symbol.multiplier * baseBet;
                    return sum + oddGameConfig * symbol.multiplier;
                }, 0);
                tumble.win = winEachTumble * baseBet;
                totalWin += tumble.win;
            }
        }
        const lastTumble = tumbles[tumbles.length - 1];
        const freeSpinCount = this.countOccurrences(lastTumble.reels, Config.scatterSymbol);
        const freeSpinOdds = freeSpins.initialOdds.filter((x) => freeSpinCount >= x.count).map((x) => x.odds);
        const freeSpinsResult = { count: freeSpinCount, odds: Math.max(0, ...freeSpinOdds) };
        round.settlementResult = { tumbles, freeSpins: freeSpinsResult };
        round.betWin = Math.min(totalWin, maxWinPerRound);
        round.reachMaxWin = totalWin >= maxWinPerRound;
        round.actualBetwin = totalWin;
    }

    countOccurrences(arr, target) {
        let count = 0;
        for (const row of arr) {
            for (const cell of row) {
                if (cell === target) {
                    count++;
                }
            }
        }
        return count;
    }
    async processFreeSpins(player, round, spinResult) {
        const { id, settlementResult } = round;
        if (settlementResult.freeSpins?.odds > 0) {
            //should init accumulateWin and rageMeter
            await this.freeSpinsConsumer.gainFreeSpin(
                player,
                {
                    roundId: id,
                    totalAmount: round.totalAmount,
                    coinValue: round.coinValue,
                    betLevel: round.betLevel,
                    betMultiplier: round.betMultiplier,
                    numberOfFreeSpins: settlementResult.freeSpins.odds,
                    //accumulateWin and rageMeter
                },
                this.definition.freeSpinLiveSeconds
            );
        }

        if (round.freeSpin && settlementResult.freeSpins?.odds > 0) {
            await this.freeSpinStateConsumer.updateFreeSpinState(player, {
                roundId: round.id,
                currentStage: spinResult.currentStage,
                reelMultipliers: spinResult.gridMultipliers,
                stageQueue: spinResult.featureQueue,
                rageMeter: spinResult.rageCounter,
                totalWin: round.betWin,
            });
        }

        let totalAvailableFreeSpins = this.freeSpinsConsumer.getTotalAvaiableFreeSpins(player);

        if (round.promotionId) {
            totalAvailableFreeSpins += player.promotion?.remainingBonusItems ?? 0;
        }

        if (totalAvailableFreeSpins === 0 || round.reachMaxWin) {
            await this.freeSpinStateConsumer.stopChain(player);
        }
    }

    async queryRound(roundId) {
        return this.roundsRepository.findOne({ id: roundId, paid: false }).exec();
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
