import mongoose from "mongoose";
import UserSessionSchema from "../schemas/user-session-schema";

export default mongoose.model("UserSessions", UserSessionSchema);
