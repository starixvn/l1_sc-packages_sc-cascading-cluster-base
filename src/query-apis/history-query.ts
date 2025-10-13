import mongoose from "mongoose";
import { FreeSpinState, Round } from "../models/interfaces";

export default class HistoryQuery {
    declare roundsRepository: mongoose.Model<Round>;
    declare freeSpinStateRepository: mongoose.Model<FreeSpinState>;

    constructor(roundsRepository: mongoose.Model<Round>, freeSpinStateRepository: mongoose.Model<FreeSpinState>) {
        this.freeSpinStateRepository = freeSpinStateRepository;
        this.roundsRepository = roundsRepository;
    }

    async queryHistory(player: { UID: string }, page: number, pageSize: number) {
        if (page < 1 || !player) {
            return {};
        }

        const filter = { uid: player.UID, paid: true };
        const numberOfSkippedBets = (page - 1) * pageSize;
        const total = await this.roundsRepository.countDocuments(filter).exec();
        const roundProjection = {
            _id: false,
            __v: false,
            __archive: false,
            bet: false,
            betMultiplier: false,
            result: false,
            paid: false,
            uid: false,
            name: false,
            rate: false,
            exchangeRateId: false,
            siteId: false,
            playerId: false,
            operatorId: false,
            endTime: false,
            odds: false,
        };

        const rawBetLogs = await this.roundsRepository
            .find(filter, roundProjection, { sort: { id: -1 }, skip: numberOfSkippedBets, limit: pageSize })
            .lean()
            .exec();

        const freeSpinStates = (await this.freeSpinStateRepository.find({ uid: player.UID }).lean().exec()) ?? [];

        const betLogs = rawBetLogs.map((rawBetLog) => {
            const betLog: any = { ...rawBetLog };
            if (betLog.freeSpin) {
                betLog.totalMultipliers = freeSpinStates.find((t) => t.rounds.some((r) => r.roundId === rawBetLog.id));
            }

            return betLog;
        });

        return { history: { betLogs, page, pageSize, total } };
    }
}
