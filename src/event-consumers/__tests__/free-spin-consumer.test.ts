import Chance from "chance";
import { stub, stubMongoose } from "jest-micro-auto-stub";
import mongoose from "mongoose";
import GameManagementApiClientFactory from "sc-game-base/src/core/game-management-api";
import { EventConsumers } from "sc-slot-game-base";
import CascadingClusterGameData from "../../game-data";
import { FreeSpinsConsumer } from "../index";

describe("freeSpinsConsumer", () => {
    const chance = new Chance();

    const gameData = stubGameData();

    /** @type {mongoose.Model}*/
    const freeSpinsRepository = stubMongoose(mongoose.Model);

    const idCountersConsumer = stub(EventConsumers.IdCountersConsumer);

    const player = {
        UID: chance.string(),
        session: { playerId: chance.string() },
        profile: { name: chance.name_suffix() },
    };

    const gameManagementApiClientFactory = stub(GameManagementApiClientFactory);
    const gameManagementApiClient = {
        gameNotifications: {
            clearGameNotification: jest.fn(() => Promise.resolve({})),
            updateGameNotification: jest.fn(() => Promise.resolve({})),
        },
    };
    gameManagementApiClientFactory.instance.mockReturnValue(gameManagementApiClient);

    let consumer;

    beforeEach(() => {
        jest.clearAllMocks();
        consumer = new FreeSpinsConsumer(chance.natural(), gameData, freeSpinsRepository, idCountersConsumer, gameManagementApiClientFactory);
    });

    describe("gainFreeSpin", () => {
        const freeSpinData = {
            roundId: chance.natural(),
            totalAmount: chance.natural(),
            betLevel: chance.pickone([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
            coinValue: chance.floating({ min: 1, max: 20, fixed: 1 }),
            numberOfFreeSpins: chance.pickone([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        };
        const timeToLive = chance.natural();

        it("should call idCountersConsumer.consume", async () => {
            // Act
            await consumer.gainFreeSpin(player, freeSpinData, timeToLive);

            // Assert
            expect(idCountersConsumer.consume).toHaveBeenCalledWith("freespin");
        });

        it("should call freeSpinsRepository.create", async () => {
            // Arrange
            const mockDate = new Date();
            jest.spyOn(global, "Date").mockReturnValue(mockDate);

            // Act
            await consumer.gainFreeSpin(player, freeSpinData, timeToLive);

            // Assert
            expect(freeSpinsRepository.create).toHaveBeenCalledWith({
                uid: player.UID,
                name: player.profile.name,
                playerId: player.session?.playerId,
                id: gameData.freeSpinId,
                roundId: freeSpinData.roundId,
                bet: freeSpinData.totalAmount,
                total: freeSpinData.numberOfFreeSpins,
                available: freeSpinData.numberOfFreeSpins,
                time: mockDate,
                expiryTime: new Date(mockDate.getTime()).setSeconds(mockDate.getSeconds() + timeToLive),
                betLevel: freeSpinData.betLevel,
                coinValue: freeSpinData.coinValue,
                betMultiplier: gameData.gameConfigs.cascadingClusterConfig.betMultiplier,
            });
        });

        it("should set player free spins to ingame data", async () => {
            // Arrange
            const mockDate = new Date();
            jest.spyOn(global, "Date").mockReturnValue(mockDate);
            gameData.ingame[player.profile.name] = {};
            freeSpinsRepository.create.mockResolvedValueOnce({ id: 2 });

            // Act
            await consumer.gainFreeSpin(player, freeSpinData, timeToLive);

            // Assert
            expect(gameData.ingame[player.profile.name].freeSpins).toStrictEqual([
                {
                    id: 2,
                    roundId: freeSpinData.roundId,
                    bet: freeSpinData.totalAmount,
                    total: freeSpinData.numberOfFreeSpins,
                    available: freeSpinData.numberOfFreeSpins,
                    time: mockDate,
                    expiryTime: new Date(mockDate.getTime()).setSeconds(mockDate.getSeconds() + timeToLive),
                    betLevel: freeSpinData.betLevel,
                    coinValue: freeSpinData.coinValue,
                    betMultiplier: gameData.gameConfigs.cascadingClusterConfig.betMultiplier,
                },
            ]);
        });
    });
});

function stubGameData() {
    const gameData = new CascadingClusterGameData(0);

    gameData.remainingTime = 20;
    gameData.gameConfigs = {
        enabled: true,
        minbet: 1,
        maxbet: 1000,
        cascadingClusterConfig: {
            betMultiplier: 20,
        },
    } as any;
    gameData.freeSpinId = 1;

    return gameData;
}
