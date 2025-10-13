import Chance from "chance";
import { UserInfo, UserSession } from "jest-auto-fixture/src/models";
import { stub, stubMongoose } from "jest-micro-auto-stub";
import mongoose from "mongoose";
import { logger } from "sc-common";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import { EventConsumers, SlotGameData } from "sc-slot-game-base";
import { FreeSpinsConsumer, SettleGameRoundConsumer } from "../../event-consumers";
import CascadingProcessBetQueue from "../cascading-process-bet-queue";

describe("cascadingProcessBetQueue", () => {
    jest.mock("sc-common");

    const chance = new Chance();
    const freeSpinsConsumer = stub(FreeSpinsConsumer);
    const settleGameRoundConsumer = stub(SettleGameRoundConsumer);
    const placeBet = jest.fn();
    const roundsRepository = stubMongoose(mongoose.Model);
    const idCountersConsumer = stub(EventConsumers.IdCountersConsumer);
    const placeBetPublisher = { publishGameFailedBet: jest.fn() };
    const gameData = stubGameData();
    const player = stubPlayer();
    const definition = { id: chance.natural() };
    const baseMetrics = {};

    const gameManagementApiClientFactory = stub(GameManagementApiClientFactory);
    const gameManagementApiClient = {};
    gameManagementApiClientFactory.instance.mockReturnValue(gameManagementApiClient);

    let consumer;

    beforeEach(() => {
        jest.clearAllMocks();

        consumer = new CascadingProcessBetQueue({
            definition,
            gameData,
            freeSpinsConsumer,
            settleGameRoundConsumer,
            placeBet,
            loggerService: logger,
            roundsRepository,
            idCountersConsumer,
            placeBetPublisher,
            baseMetrics,
            gameManagementApiClientFactory,
        } as any);
    });

    describe("generateBetInfo", () => {
        describe("when bet is free spin", () => {
            it("should update bet info follow freeSpin info", async () => {
                // Arrange
                const payload = { freeBet: true };
                const freeSpinInfo = { betLevel: chance.natural(), coinValue: chance.natural(), betMultiplier: chance.natural() };

                // Act
                const actualResult = await consumer.generateBetInfo(payload, freeSpinInfo);

                // Assert
                expect(actualResult).toStrictEqual({
                    freeBet: true,
                    ...freeSpinInfo,
                    totalAmount: freeSpinInfo.betLevel * freeSpinInfo.coinValue * freeSpinInfo.betMultiplier,
                });
            });
        });

        describe("when bet is NOT free spin", () => {
            const payload = { freeBet: false, betLevel: 1, coinValue: 0.1 };

            it("should return correct bet info", async () => {
                // Act
                const actualResult = await consumer.generateBetInfo(payload, undefined, player);

                // Assert
                expect(actualResult).toStrictEqual({
                    ...payload,
                    betMultiplier: (gameData.gameConfigs as any).cascadingClusterConfig.betMultiplier,
                    totalAmount: payload.betLevel * payload.coinValue * (gameData.gameConfigs as any).cascadingClusterConfig.betMultiplier,
                });
            });

            it("should apply buyFreeSpin multiplier when buyFreeSpin is true", async () => {
                // Arrange
                const payloadWithBuyFreeSpin = { ...payload, buyFreeSpin: true };

                // Act
                const actualResult = await consumer.generateBetInfo(payloadWithBuyFreeSpin, undefined, player);

                // Assert
                expect(actualResult).toStrictEqual({
                    ...payloadWithBuyFreeSpin,
                    betMultiplier: (gameData.gameConfigs as any).cascadingClusterConfig.betMultiplier,
                    totalAmount: payload.betLevel * payload.coinValue * (gameData.gameConfigs as any).cascadingClusterConfig.betMultiplier * 50,
                });
            });
        });
    });

    describe("upsertBetWithFreeSpinInfo", () => {
        it("should call roundsRepository.create", async () => {
            // Arrange
            const roundId = chance.natural();
            const rate = chance.natural();
            const mockDate = new Date();
            const bet = {
                roundId: chance.natural(),
                betLevel: chance.natural({ min: 1, max: 50 }),
                coinValue: chance.floating({ min: 0.1, max: 20, fixed: 1 }),
                freeSpin: chance.bool(),
                freeBet: chance.bool(),
                bet: chance.natural(),
                betMultiplier: chance.natural(),
                totalAmount: chance.natural(),
            };
            jest.spyOn(global, "Date").mockReturnValueOnce(mockDate);

            // Act
            await consumer.upsertBetWithFreeSpinInfo(player, roundId, bet, rate, null, []);

            // Assert
            expect(roundsRepository.create).toHaveBeenCalledWith({
                id: roundId,
                uid: player.UID,
                name: player.profile.name,
                freeBet: bet.freeBet,
                time: mockDate,
                freeSpin: bet.freeSpin,
                betLevel: bet.betLevel,
                coinValue: bet.coinValue,
                betMultiplier: bet.betMultiplier,
                totalAmount: bet.totalAmount,
                currencyCode: player.session.currencyCode,
                currencyGroupId: player.session.currencyGroupId,
                rate: rate,
                exchangeRateId: (gameData.exchangeRates as any).exId,
                odds: {
                    symbols: (gameData.gameConfigs as any).cascadingClusterConfig.odds,
                    freeSpins: (gameData.gameConfigs as any).cascadingClusterConfig.freeSpins,
                },
                siteId: player.session.siteId,
                currency: player.session.currencyName,
                operatorId: player.session.operatorId,
                playerId: player.session.playerId,
                appType: player.session.system,
                siteName: player.session.siteName,
            });
        });
    });

    describe("handleSuccessBet", () => {
        const balance = chance.natural();
        const roundId = chance.natural();
        const bet = {};
        const rate = chance.natural();

        beforeEach(() => {
            consumer.calculateCurrencyRate = jest.fn().mockReturnValueOnce(rate);
            consumer.upsertBet = jest.fn();
            consumer.notifyPlacingBetResult = jest.fn();
        });

        describe("when bet is using freeSpin", () => {
            const freeSpinBet = { freeSpin: true };

            it("should call freeSpinsConsumer.useFreeSpin", async () => {
                // Arrange
                settleGameRoundConsumer.settlePlayerRound.mockResolvedValueOnce({ betWin: 100, reachMaxWin: false });

                // Act
                await consumer.handleSuccessBet(player, balance, roundId, freeSpinBet);

                // Assert
                expect(freeSpinsConsumer.useFreeSpin).toHaveBeenCalledWith(player);
            });
        });

        it("should call calculateCurrencyRate", async () => {
            // Arrange
            settleGameRoundConsumer.settlePlayerRound.mockResolvedValueOnce({ betWin: 100, reachMaxWin: false });

            // Act
            await consumer.handleSuccessBet(player, balance, roundId, bet);

            // Assert
            expect(consumer.calculateCurrencyRate).toHaveBeenCalledWith(player.session);
        });

        it("should call upsertBetWithFreeSpinInfo", async () => {
            // Arrange
            settleGameRoundConsumer.settlePlayerRound.mockResolvedValueOnce({ betWin: 100, reachMaxWin: false });

            // Act
            await consumer.handleSuccessBet(player, balance, roundId, bet, []);

            // Assert
            expect(roundsRepository.create).toHaveBeenCalled();
        });

        it("should call notifyPlacingBetResult", async () => {
            // Arrange
            settleGameRoundConsumer.settlePlayerRound.mockResolvedValueOnce({ betWin: 100, reachMaxWin: false });

            // Act
            await consumer.handleSuccessBet(player, balance, roundId, bet, []);

            // Assert
            expect(consumer.notifyPlacingBetResult).toHaveBeenCalledWith(player, balance, bet, rate);
        });

        it("should call settleGameRoundConsumer.settlePlayerRound", async () => {
            // Arrange
            settleGameRoundConsumer.settlePlayerRound.mockResolvedValueOnce({ betWin: 100, reachMaxWin: false });

            // Act
            await consumer.handleSuccessBet(player, balance, roundId, bet, []);

            // Assert
            expect(settleGameRoundConsumer.settlePlayerRound).toHaveBeenCalledWith(player, roundId, (bet as any).buyFreeSpin);
        });
    });

    describe("isValidBuyFreeSpin", () => {
        it("should return false when player has free spin", () => {
            // Arrange
            freeSpinsConsumer.hasFreeSpin.mockReturnValueOnce(true);

            // Act
            const result = consumer.isValidBuyFreeSpin(player);

            // Assert
            expect(result).toBe(false);
            expect(freeSpinsConsumer.hasFreeSpin).toHaveBeenCalledWith(player);
        });

        it("should return false when player is in promotion period", () => {
            // Arrange
            freeSpinsConsumer.hasFreeSpin.mockReturnValueOnce(false);
            consumer.isInPromotionPeriod = jest.fn().mockReturnValueOnce(true);

            // Act
            const result = consumer.isValidBuyFreeSpin(player);

            // Assert
            expect(result).toBe(false);
            expect(consumer.isInPromotionPeriod).toHaveBeenCalledWith(player);
        });

        it("should return true when player has no free spin and not in promotion period", () => {
            // Arrange
            freeSpinsConsumer.hasFreeSpin.mockReturnValueOnce(false);
            consumer.isInPromotionPeriod = jest.fn().mockReturnValueOnce(false);

            // Act
            const result = consumer.isValidBuyFreeSpin(player);

            // Assert
            expect(result).toBe(true);
        });
    });

    describe("isInPromotionPeriod", () => {
        it("should return false when player has no valid promotion", () => {
            // Arrange
            consumer.hasValidPromotion = jest.fn().mockReturnValueOnce(false);

            // Act
            const result = consumer.isInPromotionPeriod(player);

            // Assert
            expect(result).toBe(false);
        });

        it("should return true when player has valid promotion and remaining bonus items", () => {
            // Arrange
            const playerWithPromotion = {
                ...player,
                promotion: {
                    remainingBonusItems: 5,
                    initialBonusItem: 10,
                    freeSpinAvailable: 0,
                },
            };
            consumer.hasValidPromotion = jest.fn().mockReturnValueOnce(true);

            // Act
            const result = consumer.isInPromotionPeriod(playerWithPromotion);

            // Assert
            expect(result).toBe(true);
        });

        it("should return true when player has valid promotion and free spins available", () => {
            // Arrange
            const playerWithPromotion = {
                ...player,
                promotion: {
                    remainingBonusItems: 0,
                    initialBonusItem: 10,
                    freeSpinAvailable: 5,
                },
            };
            consumer.hasValidPromotion = jest.fn().mockReturnValueOnce(true);

            // Act
            const result = consumer.isInPromotionPeriod(playerWithPromotion);

            // Assert
            expect(result).toBe(true);
        });
    });

    describe("proceedBet", () => {
        beforeEach(() => {
            consumer.validateFreeSpinEligibility = jest.fn().mockReturnValue(false);
            consumer.hasValidFreeSpinSource = jest.fn().mockReturnValue(true);
            consumer.hasValidPromotion = jest.fn().mockReturnValue(false);
            consumer.handleInvalidFreeSpin = jest.fn();
            consumer.generateBetInfo = jest.fn().mockResolvedValue({});
            consumer.super = { proceedBet: jest.fn() };
        });

        it("should publish failed bet when buyFreeSpin is invalid", async () => {
            // Arrange
            const payload = { buyFreeSpin: true };
            consumer.isValidBuyFreeSpin = jest.fn().mockReturnValueOnce(false);

            // Act
            await consumer.proceedBet(player, payload);

            // Assert
            expect(placeBetPublisher.publishGameFailedBet).toHaveBeenCalledWith(player.UID, {
                endBet: -1,
                notice: { errorCode: expect.any(String) },
            });
        });

        it("should publish failed bet when game is finished", async () => {
            // Arrange
            const payload = { buyFreeSpin: false };
            gameData.ingame[player.profile.name] = { finish: true };

            // Act
            await consumer.proceedBet(player, payload);

            // Assert
            expect(placeBetPublisher.publishGameFailedBet).toHaveBeenCalledWith(player.UID, {
                endBet: -1,
                notice: { errorCode: expect.any(String) },
            });
        });
    });

    function stubGameData() {
        const data = new SlotGameData({} as any);

        data.remainingTime = 20;
        data.gameConfigs = {
            enabled: true,
            minbet: 1,
            maxbet: 1000,
            cascadingSlotsConfig: {
                betMultiplier: 20,
                oddsByCounts: {},
                freeSpins: {},
            },
            cascadingClusterConfig: {
                betMultiplier: 20,
                odds: {},
                freeSpins: {},
            },
        } as any;
        data.exchangeRates = { exId: chance.string() } as any;
        data.freeSpinId = 1;
        data.ingame = {};

        return data;
    }

    function stubPlayer() {
        const userInfo = UserInfo();
        const userSession = UserSession();
        userSession.operatorId = userSession.partnerId;
        userSession.playerId = userSession.memberId;
        userSession.playerName = userSession.memberName;

        return {
            UID: userInfo.UID,
            profile: userInfo,
            session: userSession,
        };
    }
});
