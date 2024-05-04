import mongoose, { Model } from "mongoose";
import { ILeaderboard } from "@/types";

const LeaderboardSchema = new mongoose.Schema({
  lastBlockNumber: Number,
  totalUSDAmount: Number,
  donorsCount: Number,
  topDonorsWithEns: [
    {
      address: String,
      ens: String,
      usdAmount: Number,
    },
  ],
});

let Leaderboard: Model<ILeaderboard>;

try {
  Leaderboard = mongoose.model<ILeaderboard>("Leaderboard");
} catch {
  Leaderboard = mongoose.model<ILeaderboard>("Leaderboard", LeaderboardSchema);
}

export { Leaderboard };
