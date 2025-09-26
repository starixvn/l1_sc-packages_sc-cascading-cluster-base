import mongoose from "mongoose";
import { FreeRoundState } from "../interfaces";

export default new mongoose.Schema<FreeRoundState>(
    {
        time: { type: Date },
        roundId: { type: Number },
        reelMultipliers: { type: [[Number]] },
        stageQueue: { type: [Number], default: [] },
        reachedStages: { type: [Boolean] },
        rageMeter: { type: Number, default: 0 },
    },
    { _id: false }
);
