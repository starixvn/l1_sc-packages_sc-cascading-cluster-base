import mongoose from "mongoose";
import { RoundTotalMultiplier } from "../interfaces";

export default new mongoose.Schema<RoundTotalMultiplier>(
    {
        time: { type: Date },
        roundId: { type: Number },
        prevTotalMultiplier: { type: Number, default: 0 },
        totalMultiplier: { type: Number, default: 0 },
        multiplier: { type: Number, default: 0 },
    },
    { _id: false }
);
