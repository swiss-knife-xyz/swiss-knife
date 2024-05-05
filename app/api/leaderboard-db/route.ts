// add this to prevent the build command from static generating this page
export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { Leaderboard } from "@/models/leaderboard";

export const GET = async (request: Request) => {
  await mongoose.connect(process.env.MONGODB_URL!);
  const cachedDonorsData = await Leaderboard.find();

  const resData = {
    totalUSDAmount: cachedDonorsData[0].totalUSDAmount,
    donorsCount: cachedDonorsData[0].donorsCount,
    topDonorsWithEns: cachedDonorsData[0].topDonorsWithEns,
  };

  const response = new Response(JSON.stringify(resData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Allows all domains, adjust as necessary
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", // Adjust based on the methods your server supports
      "Access-Control-Allow-Headers": "Content-Type, Authorization", // Optional, specify the headers allowed in requests
    },
  });
  return response;
};
