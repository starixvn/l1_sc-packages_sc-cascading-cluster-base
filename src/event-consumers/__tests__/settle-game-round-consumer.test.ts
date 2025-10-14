import { stub, stubMongoose } from "jest-micro-auto-stub";
import mongoose from "mongoose";
import { UserBetResultPublisher } from "sc-game-base/src/core/event-publishers";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import RoundCalculator from "../../board/round-calculator";
import TumbleCalculator from "../../board/tumble-calculator";
import { BoardGenerator, FgResult } from "../../cluster-board";
import { definition, gameConfigs } from "../../mock-data-test/share-data";
import FreeSpinStateConsumer from "../free-spin-state-consumer";
import FreeSpinsConsumer from "../free-spins-consumer";
import SettleGameRoundConsumer from "../settle-game-round-consumer";

const currencyGroupSetting = {
    groupId: "g1",
    maxWinPerRound: 100,
};
const gameData = {
    gameConfigs: {
        ...gameConfigs,
        cascadingClusterConfig: {
            ...gameConfigs.cascadingClusterConfig,
            bigWinRatio: [5],
            odds: {
                0: [{ from: 3, to: 5, odds: 1.5 }],
                1: [{ from: 3, to: 5, odds: 2.0 }],
                2: [{ from: 3, to: 5, odds: 2.5 }],
                3: [{ from: 3, to: 5, odds: 3.0 }],
                4: [{ from: 3, to: 5, odds: 3.5 }],
                5: [{ from: 3, to: 5, odds: 4.0 }],
                6: [{ from: 3, to: 5, odds: 4.5 }],
                7: [{ from: 3, to: 5, odds: 5.0 }],
                8: [{ from: 3, to: 5, odds: 5.5 }],
                9: [{ from: 3, to: 5, odds: 6.0 }],
            },
        },
        maxWinPerRound: 100,
    },
    currencyGroupGames: [currencyGroupSetting],
    settlementResultFromAdmin: {},
};

const userBetResultPublisher = stub(UserBetResultPublisher);
const boardGenerator = stub(BoardGenerator);

const freeSpinsConsumer = stub(FreeSpinsConsumer);
const freeSpinStateConsumer = stub(FreeSpinStateConsumer);

const tumbleCalculator = new TumbleCalculator();
const endGame = jest.fn(() => ({ isOk: true }));

const player = {
    UID: "player01",
    profile: {
        name: "player01",
    },
    session: {
        currencyGroupId: "g1",
        sessionId: "session123",
        totalAmount: 10,
    },
    usePromotion: false,
    promotion: {
        promotionId: "promo123",
        endDate: new Date(),
    },
};
const roundsRepository = stubMongoose(mongoose.Model);
const roundCalculator = stub(RoundCalculator);

const gameManagementApiClientFactory = stub(GameManagementApiClientFactory);
const gameManagementApiClient = {
    users: {
        updateBalance: jest.fn(() => Promise.resolve({ isOk: true })),
    },
};
gameManagementApiClientFactory.instance.mockReturnValue(gameManagementApiClient);

function initConsumer() {
    return new SettleGameRoundConsumer({
        definition,
        gameData,
        roundResultPublisher: jest.fn(),
        userBetResultPublisher,
        freeSpinsConsumer,
        endGame,
        roundsRepository,
        betsRepository: jest.fn(),
        freeSpinStateConsumer,
        roundCalculator,
        gameManagementApiClientFactory,
        boardGenerator,
    });
}

function initRoundDocument({ id = 1, playerId, coinValue, betLevel, betMultiplier, freeSpin, freeSpinId = undefined }: any) {
    return {
        id,
        coinValue,
        betLevel,
        betMultiplier,
        totalAmount: coinValue * betLevel * betMultiplier,
        paid: false,
        rate: 1,
        exchangeRateId: 1,
        playerId,
        odds: gameConfigs.cascadingClusterConfig,
        betWin: 0,
        freeSpin,
        multiplier: 0,
        totalMultiplier: 0,
        reachMaxWin: false,
        endTime: null,
        sessionId: null,
        settlementResult: {
            tumbles: [] as any[],
            freeSpins: { odds: 0 },
        },
        actualBetwin: 0,
        freeSpinId,
        save: jest.fn(),
    };
}

describe("SettleGameRoundConsumer", () => {
    let consumer: SettleGameRoundConsumer;

    beforeEach(() => {
        consumer = initConsumer();
        jest.clearAllMocks();
    });

    describe("settlePlayerRound", () => {
        it("should settle a normal round successfully", async () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: false });
            roundsRepository.findOne().exec.mockReturnValueOnce(round);
            freeSpinStateConsumer.getCurrentState.mockReturnValue({
                freeSpinState: null,
                freeSpinTotalWin: 0,
            });
            roundCalculator.processSpinning.mockReturnValue({
                currentStage: 1,
                gridMultipliers: [1, 1, 1],
                featureQueue: [],
                rageCounter: 0,
            });

            // Act
            const result = await consumer.settlePlayerRound(player, 1, false);

            // Assert
            expect(result).toEqual({ betWin: round.betWin, reachMaxWin: round.reachMaxWin });
            expect(round.paid).toBe(true);
            expect(round.endTime).toBeInstanceOf(Date);
            expect(round.sessionId).toBe(player.session?.sessionId);
            expect(round.save).toHaveBeenCalled();
            expect(userBetResultPublisher.publishToUser).toHaveBeenCalled();
        });

        it("should return zero betWin when round is not found", async () => {
            // Arrange
            roundsRepository.findOne().exec.mockReturnValueOnce(null);

            // Act
            const result = await consumer.settlePlayerRound(player, 999, false);

            // Assert
            expect(result).toEqual({ betWin: 0, reachMaxWin: false });
        });

        it("should handle reachMaxWin scenario", async () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: true });
            round.reachMaxWin = true;
            roundsRepository.findOne().exec.mockReturnValueOnce(round);
            freeSpinStateConsumer.getCurrentState.mockReturnValue({
                freeSpinState: null,
                freeSpinTotalWin: 0,
            });
            roundCalculator.processSpinning2.mockReturnValue({
                currentStage: 1,
                gridMultipliers: [1, 1, 1],
                featureQueue: [],
                rageCounter: 0,
            });

            // Act
            const result = await consumer.settlePlayerRound(player, 1, false);

            // Assert
            expect(result).toEqual({ betWin: round.betWin, reachMaxWin: true });
            expect(freeSpinStateConsumer.stopChain).toHaveBeenCalledWith(player);
        });

        it("should handle free spin round", async () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: true });
            roundsRepository.findOne().exec.mockReturnValueOnce(round);
            freeSpinStateConsumer.getCurrentState.mockReturnValue({
                freeSpinState: { reelMultipliers: [2, 2, 2], currentStage: 1, stageQueue: [], rageMeter: 0 },
                freeSpinTotalWin: 10,
            });
            const spinResult = {
                currentStage: 1,
                gridMultipliers: [2, 2, 2],
                featureQueue: [],
                rageCounter: 0,
            };
            roundCalculator.processSpinning2.mockReturnValue(spinResult);

            // Act
            const result = await consumer.settlePlayerRound(player, 1, false);

            // Assert
            expect(result).toEqual({ betWin: round.betWin, reachMaxWin: round.reachMaxWin });
            expect(freeSpinStateConsumer.updateFreeSpinState).toHaveBeenCalled();
        });
    });

    describe("handleReachMaxWin", () => {
        it("should stop free spin chain when free spin round reaches max win", async () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: true, freeSpinId: 123 });

            // Act
            await consumer.handleReachMaxWin(player, round as any);

            // Assert
            expect(freeSpinStateConsumer.stopChain).toHaveBeenCalledWith(player);
            expect(freeSpinsConsumer.updateReachMaxWin).toHaveBeenCalledWith(player, 123);
        });

        it("should only update free spin when not a free spin round", async () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: false, freeSpinId: 123 });

            // Act
            await consumer.handleReachMaxWin(player, round as any);

            // Assert
            expect(freeSpinStateConsumer.stopChain).not.toHaveBeenCalled();
            expect(freeSpinsConsumer.updateReachMaxWin).toHaveBeenCalledWith(player, 123);
        });
    });

    describe("processSpinning", () => {
        it("should process normal spin with base game board", async () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: false });
            freeSpinStateConsumer.getCurrentState.mockReturnValue({
                freeSpinState: null,
                freeSpinTotalWin: 0,
            });
            boardGenerator.initializeGridMultiplier.mockReturnValue([1, 1, 1]);
            const spinResult = {
                currentStage: 1,
                gridMultipliers: [1, 1, 1],
                featureQueue: [],
                rageCounter: 0,
            };
            roundCalculator.processSpinning2.mockReturnValue(spinResult);

            // Act
            const result = await consumer.processSpinning(player, round as any, false);

            // Assert
            expect(roundCalculator.processSpinning2).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it("should process free spin with free spin board", async () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: true });
            freeSpinStateConsumer.getCurrentState.mockReturnValue({
                freeSpinState: { reelMultipliers: [2, 2, 2], currentStage: 1, stageQueue: [], rageMeter: 0 },
                freeSpinTotalWin: 10,
            });
            const spinResult = {
                currentStage: 1,
                gridMultipliers: [2, 2, 2],
                featureQueue: [],
                rageCounter: 0,
            };
            roundCalculator.processSpinning2.mockReturnValue(spinResult);

            // Act
            const result = await consumer.processSpinning(player, round as any, false);

            // Assert
            expect(freeSpinStateConsumer.updateFreeSpinState).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it("should process buy free spin with scatter boards", async () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: false });
            freeSpinStateConsumer.getCurrentState.mockReturnValue({
                freeSpinState: null,
                freeSpinTotalWin: 0,
            });
            boardGenerator.initializeGridMultiplier.mockReturnValue([1, 1, 1]);
            const spinResult = {
                currentStage: 1,
                gridMultipliers: [1, 1, 1],
                featureQueue: [],
                rageCounter: 0,
            };
            roundCalculator.processSpinning2.mockReturnValue(spinResult);

            // Act
            const result = await consumer.processSpinning(player, round as any, true);

            // Assert
            expect(roundCalculator.processSpinning2).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it("should handle admin settlement result", async () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: false });
            const adminResult = {
                tumbles: [
                    {
                        symbols: [{ symbolType: 0, count: 3, multiplier: 1 }],
                        reels: [[1, 1, 1]],
                    },
                ],
            };
            gameData.settlementResultFromAdmin[player.profile.name] = adminResult;

            // Act
            const result = await consumer.processSpinning(player, round as any, false);

            // Assert
            expect(round.settlementResult).toBeDefined();
            expect(round.betWin).toBeDefined();
            expect(gameData.settlementResultFromAdmin[player.profile.name]).toBeUndefined();
            expect(result).toBeDefined();
        });
    });

    describe("getAccumulateSpinData", () => {
        it("should return free spin state data when available", () => {
            // Arrange
            const freeSpinState = {
                reelMultipliers: [2, 2, 2],
                currentStage: 1,
                stageQueue: [],
                rageMeter: 0,
            };
            freeSpinStateConsumer.getCurrentState.mockReturnValue({
                freeSpinState,
                freeSpinTotalWin: 10,
            });

            // Act
            const result = consumer.getAccumulateSpinData(player);

            // Assert
            expect(result.result).toBeInstanceOf(FgResult);
            expect(result.result.gridMultipliers).toEqual([2, 2, 2]);
            expect(result.result.currentStage).toBe(1);
            expect(result.freeSpinTotalWin).toBe(10);
        });

        it("should initialize grid multiplier when no free spin state", () => {
            // Arrange
            freeSpinStateConsumer.getCurrentState.mockReturnValue({
                freeSpinState: null,
                freeSpinTotalWin: 0,
            });
            boardGenerator.initializeGridMultiplier.mockReturnValue([1, 1, 1]);

            // Act
            const result = consumer.getAccumulateSpinData(player);

            // Assert
            expect(result.result).toBeInstanceOf(FgResult);
            expect(result.result.gridMultipliers).toEqual([1, 1, 1]);
            expect(result.freeSpinTotalWin).toBe(0);
        });
    });

    describe("getMaxWin", () => {
        it("should calculate max win for normal round", () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: false });
            gameData.gameConfigs.maxWinPerRound = 100;

            // Act
            const result = consumer.getMaxWin(round as any, 0);

            // Assert
            expect(result).toBe(1000); // 100 * 0.1 * 5 * 20 = 1000
        });

        it("should calculate max win for free spin round with accumulated win", () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: true });
            gameData.gameConfigs.maxWinPerRound = 100;

            // Act
            const result = consumer.getMaxWin(round as any, 50);

            // Assert
            expect(result).toBe(950); // 1000 - 50 = 950
        });
    });

    describe("calculateBetResultFromAdmin", () => {
        it("should calculate bet result from admin data", () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: false });
            const maxWinPerRound = 100;
            const resultFromAdmin = {
                tumbles: [
                    {
                        symbols: [
                            { symbolType: 0, count: 3, multiplier: 1 },
                            { symbolType: 1, count: 4, multiplier: 2 },
                        ],
                        reels: [
                            [1, 1, 1],
                            [2, 2, 2, 2],
                        ],
                    },
                ],
            };

            // Act
            consumer.calculateBetResultFromAdmin(round as any, maxWinPerRound, resultFromAdmin);

            // Assert
            expect(round.settlementResult).toBeDefined();
            expect(round.settlementResult.tumbles).toBeDefined();
            expect(round.settlementResult.freeSpins).toBeDefined();
            expect(round.betWin).toBeDefined();
            expect(round.reachMaxWin).toBeDefined();
            expect(round.actualBetwin).toBeDefined();
        });
    });

    describe("processFreeSpins", () => {
        it("should process free spins when odds > 0", async () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: false });
            round.settlementResult.freeSpins.odds = 10;
            const spinResult = {
                currentStage: 1,
                gridMultipliers: [2, 2, 2],
                featureQueue: [],
                rageCounter: 0,
            };

            // Act
            await consumer.processFreeSpins(player, round, spinResult);

            // Assert
            expect(freeSpinsConsumer.gainFreeSpin).toHaveBeenCalledWith(
                player,
                expect.objectContaining({
                    roundId: round.id,
                    totalAmount: round.totalAmount,
                    coinValue: round.coinValue,
                    betLevel: round.betLevel,
                    betMultiplier: round.betMultiplier,
                    numberOfFreeSpins: 10,
                }),
                definition.freeSpinLiveSeconds
            );
        });

        it("should update free spin state for round has free spin", async () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: false });
            round.settlementResult.freeSpins.odds = 5;
            const spinResult = {
                currentStage: 1,
                gridMultipliers: [2, 2, 2],
                featureQueue: [],
                rageCounter: 0,
            };

            // Act
            await consumer.processFreeSpins(player, round, spinResult);

            // Assert
            expect(freeSpinStateConsumer.updateFreeSpinState).toHaveBeenCalledWith(player, {
                roundId: round.id,
                currentStage: 1,
                reelMultipliers: [2, 2, 2],
                stageQueue: [],
                rageMeter: 0,
                totalWin: round.betWin,
            });
        });

        it("should stop chain when no available free spins", async () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: false });
            round.settlementResult.freeSpins.odds = 0;
            freeSpinsConsumer.getTotalAvailableFreeSpins.mockReturnValue(0);

            // Act
            await consumer.processFreeSpins(player, round, {});

            // Assert
            expect(freeSpinStateConsumer.stopChain).toHaveBeenCalledWith(player);
        });
    });

    describe("queryRound", () => {
        it("should query round by id and paid status", async () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: false });
            roundsRepository.findOne().exec.mockReturnValueOnce(round);

            // Act
            const result = await consumer.queryRound(1);

            // Assert
            expect(roundsRepository.findOne).toHaveBeenCalledWith({ id: 1, paid: false });
            expect(result).toBe(round);
        });
    });

    describe("calculateBetResult", () => {
        it("should calculate bet result correctly", () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: false });
            round.betWin = 50;
            round.totalAmount = 10;
            gameData.gameConfigs.cascadingClusterConfig.bigWinRatio = [5];

            // Act
            const result = consumer.calculateBetResult(round);

            // Assert
            expect(result).toEqual({
                totalBetAmount: 10,
                totalWin: 50,
                netWin: 40,
                totalLost: 0,
                bigWin: true, // 50 / 5 = 10 >= 10
            });
        });

        it("should calculate bet result with loss", () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: false });
            round.betWin = 5;
            round.totalAmount = 10;
            gameData.gameConfigs.cascadingClusterConfig.bigWinRatio = [5];

            // Act
            const result = consumer.calculateBetResult(round);

            // Assert
            expect(result).toEqual({
                totalBetAmount: 10,
                totalWin: 5,
                netWin: -5,
                totalLost: 5,
                bigWin: false, // 5 / 5 = 1 < 10
            });
        });
    });

    describe("collectRoundResult", () => {
        it("should collect round result correctly", () => {
            // Arrange
            const round = initRoundDocument({ playerId: 1, coinValue: 0.1, betLevel: 5, betMultiplier: 20, freeSpin: false });
            round.settlementResult.tumbles = [
                {
                    symbols: [],
                    win: 10,
                    reels: [],
                    reelMultipliers: [1, 1, 1],
                    rageMeter: 0,
                    triggeredStage: 1,
                    triggeredPositions: [],
                    newSymbols: [],
                },
            ];
            round.settlementResult.freeSpins.odds = 5;
            const betResult = {
                totalBetAmount: 10,
                totalWin: 50,
                netWin: 40,
                totalLost: 0,
                bigWin: true,
            };
            freeSpinsConsumer.getTotalAvaiableFreeSpins.mockReturnValue(15);

            // Act
            const result = consumer.collectRoundResult(player, round, betResult);

            // Assert
            expect(result).toEqual({
                finish: {
                    roundId: round.id,
                    win: round.betWin,
                    bigWin: true,
                    freeSpins: 5,
                    totalFreeSpins: 15,
                    tumbles: expect.any(Array),
                    isFreeSpin: round.freeSpin,
                    reachMaxWin: round.reachMaxWin,
                    actualBetwin: round.actualBetwin,
                },
            });
        });
    });

    describe("countOccurrences", () => {
        it("should count occurrences correctly", () => {
            // Arrange
            const arr = [
                [1, 2, 3],
                [2, 2, 2],
                [1, 2, 3],
            ];
            const target = 2;

            // Act
            const result = consumer.countOccurrences(arr, target);

            // Assert
            expect(result).toBe(5); // 2 appears 5 times in the array
        });

        it("should return 0 when target not found", () => {
            // Arrange
            const arr = [
                [1, 3, 3],
                [1, 1, 1],
                [3, 3, 3],
            ];
            const target = 2;

            // Act
            const result = consumer.countOccurrences(arr, target);

            // Assert
            expect(result).toBe(0);
        });
    });
});

afterEach(() => {
    jest.clearAllMocks();
});
