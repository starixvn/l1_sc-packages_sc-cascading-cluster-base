import mongoose from "mongoose";
import { Round } from "../interfaces";

export default new mongoose.Schema<Round>({
    id: { type: Number, required: true },
    name: { type: String, required: true },
    siteId: { type: String },
    siteName: { type: String },
    uid: { type: String },
    coinValue: { type: Number, default: 0 },
    betLevel: { type: Number, default: 0 },
    betMultiplier: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    freeSpin: { type: Boolean, default: false },
    reachMaxWin: { type: Boolean, default: false },

    settlementResult: { type: Object },

    odds: { type: Object },
    betWin: { type: Number, default: 0 },
    paid: { type: Boolean, default: false },
    time: { type: Date },
    endTime: { type: Date },

    currency: { type: String, require: true },
    currencyCode: { type: String, require: true },
    currencyGroupId: { type: String, require: true },
    rate: { type: Number, require: true },
    exchangeRateId: { type: Number, require: true },

    operatorId: { type: String, require: true },
    playerId: { type: String, require: true },
    sessionId: { type: String },
    promotionId: { type: String },
    appType: { type: Number },
    freeSpinId: { type: Number },
    rootFreeSpinRoundId: { type: Number, required: false },
    actualBetWin: { type: Number, required: false },
    buyFreeSpin: { type: Number, default: 0 },
});
