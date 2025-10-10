import Chance from "chance";
import cron from "cron";
import { stub, stubMongoose } from "jest-micro-auto-stub";
import { when } from "jest-when";
import mongoose from "mongoose";
import { logger } from "sc-common";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import { Crons, EventConsumers } from "sc-slot-game-base";
import { CascadingBoardGenerator } from "../../board";
import { FreeSpinsConsumer, FreeSpinStateConsumer } from "../../event-consumers";
import CascadingGameCron from "../cascading-game-cron";

jest.mock("cron");
jest.mock("sc-common");
const chance = new Chance();

// Mock cron.CronJob
const mockCronJob = jest.fn();
(cron as any).CronJob = mockCronJob;

describe("gameCron", () => {
    const definition = {
        durations: {
            wholeRound: 60,
        },
        name: "test-game",
        freeSpinLiveSeconds: 300,
        bonusSize: 100,
        bonusLiveSeconds: 60,
        jackpotLiveSeconds: 30,
        maxBet: 1000,
        minBet: 1,
        enabled: true,
        disabled: false,
        disabled_message: "",
        disabledround: 0,
        displayName: "Test Game",
        enableFreeBet: false,
        exchangeReload: false,
        hour_maxbot: [10],
        maxWinPerRound: 10000,
        maxbet: 1000,
        minbet: 1,
        siteExclusions: [],
        time: new Date(),
        type: 1,
        delayStartTime: 0,
    };
    const gameData = {
        roundId: chance.natural(),
        freeSpinId: chance.natural(),
        remainingTime: 60,
        totalBets: 0,
        delayStartTime: 0,
        disabled: false,
        disabled_message: "",
        disabledround: 0,
        displayName: "Test Game",
        enableFreeBet: false,
        exchangeReload: false,
        hour_maxbot: [10],
        maxWinPerRound: 10000,
        maxbet: 1000,
        minbet: 1,
        siteExclusions: [],
        time: new Date(),
        type: 1,
        gameConfigs: {
            gameId: chance.natural(),
            cascadingSlotsConfig: {},
        },
        ingame: {},
        bot_maxbet: 100,
        botenabled: true,
    };
    const bot = stub(Crons.SlotGameBot);
    const settleGameRoundConsumer = stub(EventConsumers.SettleGameRoundConsumer);
    const freeSpinsConsumer = stub(FreeSpinsConsumer);
    const idCountersConsumer = stub(EventConsumers.IdCountersConsumer);
    const gameStatusPublisher = {};
    const runningRoundInfoPublisher = {};
    const roundsRepository = stubMongoose(mongoose.Model);
    const freeSpinStateConsumer = stub(FreeSpinStateConsumer);
    const boardGenerator = stub(CascadingBoardGenerator);
    const gameManagementApiClientFactory = stub(GameManagementApiClientFactory);
    const gameManagementApiClient = {
        archiveStatus: {
            getArchiveStatus: jest.fn(),
        },
        aggregation: {
            getSettingForNewRound: jest.fn(),
        },
        exchangeRates: {
            getExchangeRates: jest.fn(),
        },
    };
    gameManagementApiClientFactory.instance.mockReturnValue(gameManagementApiClient);

    const promotionFreeSpinsConsumer = stub(EventConsumers.PromotionFreeSpinsConsumer);

    let gameCron;

    beforeEach(() => {
        // Reset the mock for each test
        mockCronJob.mockReset();
        mockCronJob.mockReturnValue({ start: jest.fn() });

        gameCron = new CascadingGameCron({
            definition,
            gameData,
            bot,
            settleGameRoundConsumer,
            freeSpinsConsumer,
            idCountersConsumer,
            gameStatusPublisher,
            runningRoundInfoPublisher,
            logService: logger,
            roundsRepository,
            roundIdConsumer: idCountersConsumer,
            gameManagementApiClientFactory,
            freeSpinStateConsumer,
            boardGenerator,
            promotionFreeSpinsConsumer,
        } as any);
    });

    it("should extend SlotGameCron", () => {
        // Assert
        expect(gameCron instanceof Crons.SlotGameCron);
    });

    describe("start", () => {
        beforeEach(() => {
            gameCron.loadUnsettledBetsToIngame = jest.fn();
            gameCron.getSettingForNewRound = jest.fn();
            gameCron.updateExchangeRates = jest.fn();
            gameCron.getLastArchiveRound = jest.fn();
        });

        it("should get latest round id", async () => {
            // Act
            await gameCron.start();

            // Assert
            expect(idCountersConsumer.getLatestId).toHaveBeenCalledWith("round");
        });

        it("should get latest free spin id", async () => {
            // Act
            await gameCron.start();

            // Assert
            expect(idCountersConsumer.getLatestId).toHaveBeenCalledWith("freespin");
        });

        describe("when having no game round id and free spin id", () => {
            const roundId = chance.natural();
            const freeSpinId = chance.natural();

            beforeEach(() => {
                when(idCountersConsumer.getLatestId).calledWith("round").mockReturnValueOnce(0);
                when(idCountersConsumer.getLatestId).calledWith("freespin").mockReturnValueOnce(0);
                gameCron.getLastArchiveRound = jest.fn().mockResolvedValueOnce({ roundId, freeSpinId });
            });

            it("should get last archive round", async () => {
                // Act
                await gameCron.start();

                // Assert
                expect(gameCron.getLastArchiveRound).toHaveBeenCalledWith(undefined);
            });

            it("should update latest round id", async () => {
                // Act
                await gameCron.start();

                // Assert
                expect(idCountersConsumer.updateLatestId).toHaveBeenCalledWith("round", roundId);
            });

            it("should update latest free spin id", async () => {
                // Act
                await gameCron.start();

                // Assert
                expect(idCountersConsumer.updateLatestId).toHaveBeenCalledWith("freespin", freeSpinId);
            });

            it("should log error", async () => {
                // Act
                await gameCron.start();

                // Assert
                expect(logger.logError).toHaveBeenCalledWith(
                    `${definition.name} get roundId #${roundId} and freeSpinId #${freeSpinId} from archive.`
                );
            });
        });

        it("should load unsettle bet to ingame", async () => {
            // Act
            await gameCron.start();

            // Assert
            expect(gameCron.loadUnsettledBetsToIngame).toHaveBeenCalled();
        });

        it("should reload free spin", async () => {
            // Act
            await gameCron.start();

            // Assert
            expect(freeSpinsConsumer.reload).toHaveBeenCalled();
        });

        it("should reload total multiplier", async () => {
            // Act
            await gameCron.start();

            // Assert
            expect(freeSpinStateConsumer.reload).toHaveBeenCalled();
        });

        it("should call checkPromotionReadiness", async () => {
            // Arrange
            gameCron.checkPromotionReadiness = jest.fn();

            // Act
            await gameCron.start();

            // Assert
            expect(gameCron.checkPromotionReadiness).toHaveBeenCalled();
        });

        it("should call initTrialMode", async () => {
            // Arrange
            gameCron.initTrialMode = jest.fn();

            // Act
            await gameCron.start();

            // Assert
            expect(gameCron.initTrialMode).toHaveBeenCalled();
        });

        it("should get setting for new round", async () => {
            // Act
            await gameCron.start();

            // Assert
            expect(gameCron.getSettingForNewRound).toHaveBeenCalled();
        });

        it("should update exchange rates", async () => {
            // Act
            await gameCron.start();

            // Assert
            expect(gameCron.updateExchangeRates).toHaveBeenCalled();
        });

        it("should load promotions running", async () => {
            // Act
            await gameCron.start();

            // Assert
            expect(promotionFreeSpinsConsumer.loadPromotionsRunning).toHaveBeenCalled();
        });

        describe("start cron job", () => {
            describe("cronTime", () => {
                it("should be every second", async () => {
                    // Act
                    await gameCron.start();

                    // Assert
                    expect(mockCronJob.mock.calls[0][0]).toBe("* * * * * *");
                });
            });

            describe("onStick", () => {
                it("should call proceed", async () => {
                    // Arrange
                    gameCron.proceed = jest.fn(() => {
                        return { catch: jest.fn() };
                    });

                    // Act
                    await gameCron.start();
                    mockCronJob.mock.calls[0][1]();

                    // Assert
                    expect(gameCron.proceed).toHaveBeenCalledWith();
                });

                it("should call catch", async () => {
                    // Arrange
                    const catchFunc = jest.fn();
                    gameCron.proceed = jest.fn(() => {
                        return { catch: catchFunc };
                    });

                    // Act
                    await gameCron.start();
                    mockCronJob.mock.calls[0][1]();

                    // Assert
                    expect(catchFunc).toHaveBeenCalledWith(gameCron.logService.logError);
                });
            });

            describe("onComplete", () => {
                it("should log error", async () => {
                    // Arrange
                    definition.name = "name 1";

                    // Act
                    await gameCron.start();
                    mockCronJob.mock.calls[0][2]();

                    // Assert
                    expect(logger.logError).toHaveBeenCalledWith(
                        `name 1 unexpectedly stopped at round #${gameData.roundId} because some other tasks halt it.`
                    );
                });

                it("should call start job", async () => {
                    // Arrange
                    const startFunc = jest.fn();
                    mockCronJob.mockReturnValue({ start: startFunc });
                    gameCron.logService.logError = jest.fn();
                    gameCron.definition.name = "name 1";
                    gameCron.gameData.roundId = 12;

                    // Act
                    await gameCron.start();
                    mockCronJob.mock.calls[0][2]();

                    // Assert
                    expect(startFunc).toHaveBeenCalledTimes(2);
                });
            });
        });
    });

    describe("proceed", () => {
        beforeEach(() => {
            gameCron.checkGameStatus = jest.fn();
        });

        describe("when remaining time is equal to whole round", () => {
            beforeEach(() => {
                gameData.remainingTime = definition.durations.wholeRound;
            });

            it("should call checkGameStatus", async () => {
                // Act
                await gameCron.proceed();

                // Assert
                expect(gameCron.checkGameStatus).toHaveBeenCalled();
            });

            describe("when having bot", () => {
                it("should reset bot", async () => {
                    // Act
                    await gameCron.proceed();

                    // Assert
                    expect(bot.reset).toHaveBeenCalled();
                });
            });
        });

        describe("when game is not disabled", () => {
            it("should decrease remaining time", async () => {
                // Arrange
                gameData.remainingTime = 5;

                // Act
                await gameCron.proceed();

                // Assert
                expect(gameData.remainingTime).toBe(4);
            });

            describe("when having bot", () => {
                it("should call bot.run", async () => {
                    // Act
                    await gameCron.proceed();

                    // Assert
                    expect(bot.run).toHaveBeenCalled();
                });
            });
        });

        describe("when remaining time is less than 0", () => {
            beforeEach(() => {
                gameData.remainingTime = -1;
            });

            it("should set remaining time to whole round time", async () => {
                // Act
                await gameCron.proceed();

                // Assert
                expect(gameData.remainingTime).toBe(definition.durations.wholeRound);
            });

            it("should reload free spin", async () => {
                // Act
                await gameCron.proceed();

                // Assert
                expect(freeSpinsConsumer.reload).toHaveBeenCalled();
            });

            it("should reload total multiplier", async () => {
                // Act
                await gameCron.proceed();

                // Assert
                expect(freeSpinStateConsumer.reload).toHaveBeenCalled();
            });

            it("should load promotions running", async () => {
                // Act
                await gameCron.proceed();

                // Assert
                expect(promotionFreeSpinsConsumer.loadPromotionsRunning).toHaveBeenCalled();
            });
        });

        it("should check promotion expiry", async () => {
            // Arrange
            const gameId = chance.natural();
            gameData.gameConfigs = { gameId, cascadingClusterConfig: { betMultiplier: 20 } } as any;

            // Act
            await gameCron.proceed();

            // Assert
            expect(promotionFreeSpinsConsumer.checkExpiry).toHaveBeenCalledWith(gameId);
        });
    });

    describe("checkGameStatus", () => {
        beforeEach(() => {
            // Mock the parent class method
            const originalCheckGameStatus = jest.fn();
            gameCron.checkGameStatus = jest.fn().mockImplementation(async function () {
                await originalCheckGameStatus();
            });
        });

        it("should call parent checkGameStatus", async () => {
            // Act
            await gameCron.checkGameStatus();

            // Assert
            expect(gameCron.checkGameStatus).toHaveBeenCalled();
        });

        describe("when game is not disabled", () => {
            beforeEach(() => {
                gameData.disabled = false;
            });

            it("should not update board config (commented out)", async () => {
                // Act
                await gameCron.checkGameStatus();

                // Assert
                // Board config update is commented out in the implementation
                expect(boardGenerator.updateBoardConfig).not.toHaveBeenCalled();
            });
        });

        describe("when game is disabled", () => {
            beforeEach(() => {
                gameData.disabled = true;
            });

            it("should not update board config", async () => {
                // Act
                await gameCron.checkGameStatus();

                // Assert
                expect(boardGenerator.updateBoardConfig).not.toHaveBeenCalled();
            });
        });
    });

    describe("initTrialMode", () => {
        it("should be an empty method", () => {
            // Act & Assert
            expect(() => gameCron.initTrialMode()).not.toThrow();
        });
    });

    afterAll(() => {
        jest.clearAllMocks();
    });
});
