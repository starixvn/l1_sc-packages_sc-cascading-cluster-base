import mongoose from "mongoose";
import { FreeSpinState } from "../interfaces";
import RoundTotalMultiplierSchema from "./round-total-multiplier-schema";

export default new mongoose.Schema<FreeSpinState>({
    uid: { type: String },
    playerId: { type: String },
    name: { type: String, required: true },
    ended: { type: Boolean, default: false },
    time: { type: Date },
    endTime: { type: Date },
    rounds: { type: [RoundTotalMultiplierSchema] },
    promotionId: { type: String },
});
