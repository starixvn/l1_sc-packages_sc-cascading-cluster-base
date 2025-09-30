import mongoose from "mongoose";
import CascadingClusterGameData from "../game-data";
import FreeSpinsConsumer from "./free-spins-consumer";

export default class TotalMultiplierConsumer {
    declare gameData: CascadingClusterGameData;
    declare freeSpinStateRepository: mongoose.Model<any>;
    declare freeSpinsConsumer: FreeSpinsConsumer;

    constructor(gameData, freeSpinStateRepository, freeSpinsConsumer) {
        this.gameData = gameData;
        this.freeSpinStateRepository = freeSpinStateRepository;
        this.freeSpinsConsumer = freeSpinsConsumer;
    }

    async updateFreeSpinState(player, { roundId, reelMultipliers, stageQueue, reachedStages, rageMeter }) {
        const newRoundRecord = {
            time: new Date(),
            roundId,
            reelMultipliers,
            stageQueue,
            reachedStages,
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
                    rounds: [newRoundRecord],
                    ...(player.usePromotion && { promotionId: player.promotion.promotionId }),
                },
            },
            { upsert: true, setDefaultsOnInsert: true }
        );

        this.gameData.ingame[player.profile.name].freeSpinState = newRoundRecord;
    }

    getCurrentMultiplier(player) {
        return this.gameData.ingame[player.profile.name].freeSpinState;
    }

    async stopChain(player) {
        await this.freeSpinStateRepository.updateOne({ uid: player.UID, ended: false }, { ended: true, endTime: new Date() });

        this.gameData.ingame[player.profile.name].freeSpinState = null;
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
                } else {
                    this.gameData.ingame[state.name] && (this.gameData.ingame[state.name].freeSpinState = null);
                    await this.freeSpinStateRepository.updateOne({ uid: state.uid, ended: false }, { ended: true, endTime: new Date() });
                }
            });
        }
    }
}
