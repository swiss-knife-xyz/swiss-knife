import mongoose, { Model } from "mongoose";

export interface IFaucetRating {
  faucetId: string;
  provider: string;
  faucetName: string;
  url: string;
  chain: string;
  token: string;
  worked: boolean;
  cooldownHours?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const FaucetRatingSchema = new mongoose.Schema<IFaucetRating>(
  {
    faucetId: { type: String, required: true, index: true },
    provider: { type: String, required: true },
    faucetName: { type: String, required: true },
    url: { type: String, required: true },
    chain: { type: String, required: true },
    token: { type: String, required: true },
    worked: { type: Boolean, required: true, index: true },
    cooldownHours: Number,
  },
  { timestamps: true }
);

FaucetRatingSchema.index({ faucetId: 1, chain: 1, token: 1, createdAt: -1 });

const FaucetRating =
  (mongoose.models.FaucetRating as Model<IFaucetRating> | undefined) ??
  mongoose.model<IFaucetRating>("FaucetRating", FaucetRatingSchema);

export { FaucetRating };
