import mongoose from "mongoose";
import CascadingClusterGameData from "../game-data";
import { FreeRoundState, FreeSpinState } from "../models/interfaces";
import FreeSpinsConsumer from "./free-spins-consumer";

export default class FreeSpinStateConsumer {
    declare gameData: CascadingClusterGameData;
    declare freeSpinStateRepository: mongoose.Model<FreeSpinState>;
    declare freeSpinsConsumer: FreeSpinsConsumer;

    constructor(gameData, freeSpinStateRepository, freeSpinsConsumer) {
        this.gameData = gameData;
        this.freeSpinStateRepository = freeSpinStateRepository;
        this.freeSpinsConsumer = freeSpinsConsumer;
    }

    async updateFreeSpinState(player, { roundId, reelMultipliers, stageQueue, currentStage, rageMeter, totalWin }) {
        const newRoundRecord: FreeRoundState = {
            time: new Date(),
            roundId,
            reelMultipliers,
            stageQueue,
            currentStage,
            rageMeter,
        };

        await this.freeSpinStateRepository.updateOne(
            { uid: player.UID, ended: false },
            {
                $push: {
                    rounds: newRoundRecord,
                },
                $setOnInsert: {
                    uid: player.UID,
                    playerId: player.session?.playerId,
                    name: player.profile.name,
                    ended: false,
                    time: new Date(),
                    totalWin,
                    ...(player.usePromotion && { promotionId: player.promotion.promotionId }),
                },
            },
            { upsert: true, setDefaultsOnInsert: true }
        );

        this.gameData.ingame[player.profile.name].freeSpinState = newRoundRecord;
        const { freeSpinTotalWin } = this.gameData.ingame[player.profile.name];
        this.gameData.ingame[player.profile.name].freeSpinTotalWin = freeSpinTotalWin ?? 0 + totalWin;
    }

    async initFreeSpinState(player, totalWin) {
        await this.freeSpinStateRepository.updateOne({ uid: player.UID, ended: false }, { totalWin }, { upsert: true, setDefaultsOnInsert: true });
        this.gameData.ingame[player.profile.name].freeSpinTotalWin = totalWin;
    }

    getCurrentState(player): { freeSpinState: FreeRoundState; freeSpinTotalWin: number } {
        return {
            freeSpinState: this.gameData.ingame[player.profile.name].freeSpinState,
            freeSpinTotalWin: this.gameData.ingame[player.profile.name].freeSpinTotalWin,
        };
    }

    async stopChain(player) {
        await this.freeSpinStateRepository.updateOne({ uid: player.UID, ended: false }, { ended: true, endTime: new Date() });

        this.resetFreeSpinState(player.profile.name);
    }

    async reload() {
        const freeSpinStates = await this.freeSpinStateRepository.find({ ended: false }).lean().exec();

        if (freeSpinStates.length > 0) {
            freeSpinStates.forEach(async (state) => {
                const latestState = state.rounds?.[state.rounds?.length - 1];
                const isHavingFreeSpins =
                    this.freeSpinsConsumer.hasFreeSpin({ profile: { name: state.name } }) ||
                    (state.promotionId && this.gameData.ingame[state.name]?.promotion?.remainingBonusItems > 0);

                if (isHavingFreeSpins) {
                    this.gameData.ingame[state.name] = this.gameData.ingame[state.name] ?? { betQueue: [] };
                    this.gameData.ingame[state.name].freeSpinState = latestState;
                    this.gameData.ingame[state.name].freeSpinTotalWin = state.totalWin;
                } else {
                    if (this.gameData.ingame[state.name]) {
                        this.resetFreeSpinState(state.name);
                    }
                    await this.freeSpinStateRepository.updateOne({ uid: state.uid, ended: false }, { ended: true, endTime: new Date() });
                }
            });
        }
    }

    resetFreeSpinState(player) {
        this.gameData.ingame[player.profile.name].freeSpinState = null;
        this.gameData.ingame[player.profile.name].freeSpinTotalWin = 0;
    }
}
