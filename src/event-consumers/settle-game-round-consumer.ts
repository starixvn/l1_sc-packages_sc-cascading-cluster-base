import { round as mathRound } from "mathjs";
import mongoose from "mongoose";
import { Core } from "sc-game-base";
import { EventPublishers, SlotGameDefinition } from "sc-slot-game-base";
import { BoardGenerator, FgResult, NgResult, Result } from "../cluster-board";
import Config from "../cluster-board/config";
import RoundCalculator, { TumbleRecord } from "../cluster-board/round-calculator";
import CascadingClusterGameData from "../game-data";
import { Player, Round } from "../models/interfaces";
import FreeSpinStateConsumer from "./free-spin-state-consumer";
import FreeSpinsConsumer from "./free-spins-consumer";

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

    async settlePlayerRound(player: any, roundId: number, buyFreeSpin: number, fromBuyFreeSpin: number) {
        const round = await this.queryRound(roundId);

        if (round) {
            await this.processSpinning(player, round, buyFreeSpin, fromBuyFreeSpin);

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
                await this.processFreeSpins(player, round, buyFreeSpin);
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

        if (round.rootFreeSpinRoundId) {
            await this.freeSpinsConsumer.updateReachMaxWin(player, round.rootFreeSpinRoundId);
        }
    }

    async processSpinning(player, round: Round, buyFreeSpin: number, fromBuyFreeSpin: number) {
        const { result, remainingMaxWin } = this.getAccumulateSpinData(player);
        const maxWinPerRound = this.getMaxWin(round, remainingMaxWin);
        const resultFromAdmin = this.gameData.settlementResultFromAdmin[player.profile.name];
        let newResult = null;
        if (resultFromAdmin) {
            newResult = this.calculateBetResultFromAdmin(round, maxWinPerRound, resultFromAdmin);
            delete this.gameData.settlementResultFromAdmin[player.profile.name];
        }

        if (round.freeSpin && newResult === null) {
            newResult = this.roundCalculator.processSpinning2(round, maxWinPerRound, result, (result) => {
                if (fromBuyFreeSpin === 2) {
                    return this.boardGenerator.generateSuperFreeSpinBoard(result, false);
                }
                return this.boardGenerator.generateFreeSpinBoard(result, false);
            });
        }

        if (round.freeSpin && newResult !== null) {
            await this.freeSpinStateConsumer.updateFreeSpinState(
                player,
                {
                    roundId: round.id,
                    currentStage: newResult.currentStage,
                    reelMultipliers: newResult.gridMultipliers,
                    stageQueue: newResult.featureQueue,
                    rageMeter: newResult.rageCounter,
                    remainingMaxWin: maxWinPerRound - round.betWin,
                },
                remainingMaxWin ? undefined : maxWinPerRound
            );
        }

        if (newResult !== null) {
            return newResult;
        }

        const buyFreeSpinMode = typeof buyFreeSpin === "number" ? buyFreeSpin : 0;

        return this.roundCalculator.processSpinning2(round, maxWinPerRound, new NgResult(), (result) => {
            if (buyFreeSpinMode !== 0) {
                return this.boardGenerator.generateScatterBoardsRandom(result, buyFreeSpinMode);
            }
            return this.boardGenerator.generateBaseGameBoard(result);
        });
    }

    getAccumulateSpinData(player: Player): { result: Result; remainingMaxWin?: number } {
        const freeSpinState = this.freeSpinStateConsumer.getCurrentState(player);
        const result = new FgResult();
        if (freeSpinState) {
            result.gridMultipliers = freeSpinState.reelMultipliers;
            result.currentStage = freeSpinState.currentStage;
            result.featureQueue = freeSpinState.stageQueue;
            result.rageCounter = freeSpinState.rageMeter;
        } else {
            result.gridMultipliers = this.boardGenerator.initializeGridMultiplier();
        }
        return { result, remainingMaxWin: freeSpinState?.remainingMaxWin };
    }

    getMaxWin(round: Round, remainingMaxWin?: number) {
        if (remainingMaxWin) {
            return remainingMaxWin;
        }

        const { maxWinPerRound } = this.gameData.gameConfigs;
        return mathRound(maxWinPerRound * round.betLevel * round.coinValue * round.betMultiplier, 2);
    }

    calculateBetResultFromAdmin(round: any, maxWinPerRound: number, resultFromAdmin: any) {
        let totalWin = 0;
        const baseBet = round.betLevel * round.coinValue;
        const { tumbles } = resultFromAdmin;
        const { odds, freeSpins, tileMultiplier } = this.gameData.gameConfigs.cascadingClusterConfig;
        const rageQueue = [];

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
            if (tumble.triggeredStage) {
                rageQueue.push(tumble.triggeredStage);
            }
        }
        const result = new NgResult();
        const lastTumble = tumbles[tumbles.length - 1];
        const freeSpinCount = this.countOccurrences(lastTumble.reels, Config.scatterSymbol);
        const freeSpinOdds = freeSpins.initialOdds.filter((x) => freeSpinCount >= x.count).map((x) => x.odds);
        const freeSpinsResult = { count: freeSpinCount, odds: Math.max(0, ...freeSpinOdds) };
        result.gridMultipliers =
            lastTumble?.reelMultipliers?.map((reel: number[]) => reel.map((multi) => multi / tileMultiplier.step)) ??
            this.boardGenerator.initializeGridMultiplier();
        result.rageCounter = lastTumble?.rageMeter ?? 0;
        result.featureQueue = rageQueue;
        result.currentStage = rageQueue.length > 0 ? rageQueue[rageQueue.length - 1] : 0;
        round.settlementResult = { tumbles, freeSpins: freeSpinsResult };
        round.betWin = Math.min(totalWin, maxWinPerRound);
        round.reachMaxWin = totalWin >= maxWinPerRound;
        round.actualBetWin = totalWin;
        return result;
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
    async processFreeSpins(player, round, buyFreeSpin: number) {
        const { id, settlementResult, rootFreeSpinRoundId } = round;
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
                    reachMaxWin: round.reachMaxWin,
                    rootFreeSpinRoundId: rootFreeSpinRoundId ?? id,
                    buyFreeSpin: round.buyFreeSpin,
                },
                this.definition.freeSpinLiveSeconds
            );
        }

        if (!round.freeSpin && settlementResult.freeSpins?.odds > 0) {
            const maxWin = this.getMaxWin(round);
            await this.freeSpinStateConsumer.updateFreeSpinState(
                player,
                {
                    roundId: id,
                    currentStage: 0,
                    reelMultipliers:
                        buyFreeSpin === 2
                            ? this.boardGenerator.initializeGridMultiplierForSuperFreeSpin()
                            : this.boardGenerator.initializeGridMultiplier(),
                    stageQueue: [],
                    rageMeter: 0,
                    remainingMaxWin: maxWin - round.betWin,
                },
                maxWin
            );
        }

        let totalAvailableFreeSpins = this.freeSpinsConsumer.getTotalAvailableFreeSpins(player);

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
                totalFreeSpins: this.freeSpinsConsumer.getTotalAvailableFreeSpins(player),
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
                actualBetWin: round.actualBetWin,
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
