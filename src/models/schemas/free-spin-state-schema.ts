import mongoose from "mongoose";
import { FreeSpinState } from "../interfaces";
import FreeRoundStateSchema from "./free-round-state-schema";

export default new mongoose.Schema<FreeSpinState>({
    uid: { type: String },
    playerId: { type: String },
    name: { type: String, required: true },
    ended: { type: Boolean, default: false },
    time: { type: Date },
    endTime: { type: Date },
    maxWin: { type: Number, default: 0 },
    rounds: { type: [FreeRoundStateSchema] },
    promotionId: { type: String },
});
