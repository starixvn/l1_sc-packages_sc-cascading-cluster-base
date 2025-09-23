import mongoose from "mongoose";
import { Round } from "../models/interfaces";
import { TotalMultiplier } from "../models/interfaces";

export default class HistoryQuery {
    declare roundsRepository: mongoose.Model<Round>;
    declare totalMultiplierRepository: mongoose.Model<TotalMultiplier>;

    constructor(roundsRepository: mongoose.Model<Round>, totalMultiplierRepository: mongoose.Model<TotalMultiplier>) {
        this.roundsRepository = roundsRepository;
        this.totalMultiplierRepository = totalMultiplierRepository;
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

        const totalMultipliers = (await this.totalMultiplierRepository.find({ uid: player.UID }).lean().exec()) ?? [];

        const betLogs = rawBetLogs.map((rawBetLog) => {
            const betLog = { ...rawBetLog };
            if (betLog.freeSpin) {
                (betLog as any).totalMultipliers = totalMultipliers.find((t) => t.rounds.some((r) => r.roundId === rawBetLog.id));
            }

            return betLog;
        });

        return { history: { betLogs, page, pageSize, total } };
    }
}
