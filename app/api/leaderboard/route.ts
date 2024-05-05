import { createPublicClient, formatUnits, http, parseAbiItem } from "viem";
import { arbitrum } from "viem/chains";
import { getEnsName } from "@/utils";
import mongoose from "mongoose";
import { Leaderboard } from "@/models/leaderboard";

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(process.env.ARBITRUM_RPC_URL),
});

const getAllLogs = async (
  FROM_BLOCK: bigint,
  TO_BLOCK: bigint,
  MAX_BLOCKS_RANGE: bigint
) => {
  console.log({ FROM_BLOCK, TO_BLOCK, MAX_BLOCKS_RANGE });
  let fromBlock = FROM_BLOCK;
  let toBlock = getToBlock(fromBlock, TO_BLOCK, MAX_BLOCKS_RANGE);

  let logsPromises: Promise<any>[] = [];

  while (toBlock <= TO_BLOCK) {
    logsPromises.push(getLogs(fromBlock, toBlock));

    if (toBlock === TO_BLOCK) break;

    fromBlock = toBlock + 1n;
    toBlock = getToBlock(fromBlock, TO_BLOCK, MAX_BLOCKS_RANGE);
  }

  const resolved = await Promise.all(logsPromises);

  let logs: any[] = [];
  resolved.map((res) => {
    logs = logs.concat(res);
  });

  return logs;
};

const contractAddress = "0x1b48bb09930676d99dda36c1ad27ff0a5a5f3911";
const poolId = 27;
const round = 33;
const recipientId = "0x38022b6ca31E345f19570D8c99454B9E42c45074";
// when the recipientId was created
const startBlockNumber = 201684537n;

const getLogs = async (fromBlock: bigint, toBlock: bigint) => {
  const logs = await publicClient.getLogs({
    address: contractAddress, // DonationVotingMerkleDistributionDirectTransferStrategy
    event: parseAbiItem(
      "event Allocated(address indexed recipientId, uint256 amount, address token, address sender, address origin)"
    ),
    args: {
      recipientId,
    },
    fromBlock,
    toBlock,
  });

  return logs;
};

const getToBlock = (
  fromBlock: bigint,
  TO_BLOCK: bigint,
  MAX_BLOCKS_RANGE: bigint
) => {
  let toBlock = fromBlock + MAX_BLOCKS_RANGE;
  if (toBlock > TO_BLOCK) {
    toBlock = TO_BLOCK;
  }

  return toBlock;
};

const getPrices = async () => {
  const url =
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,arbitrum&vs_currencies=usd";

  let ethPrice = 0;
  let arbPrice = 0;

  try {
    const response = await fetch(url);
    const data = await response.json();

    ethPrice = data.ethereum.usd;
    arbPrice = data.arbitrum.usd;
  } catch (error) {}

  return { ethPrice, arbPrice };
};

const USDCAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const ETHAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const ARBAddress = "0x912CE59144191C1204E64559FE8253a0e49E6548";

const tokenAddressToDecimals: {
  [token: string]: number;
} = {
  [USDCAddress]: 6,
  [ETHAddress]: 18,
  [ARBAddress]: 18,
};

export const GET = async (request: Request) => {
  await mongoose.connect(process.env.MONGODB_URL!);
  const cachedDonorsData = await Leaderboard.find();

  // get logs to the current block
  const currBlockNumber = await publicClient.getBlockNumber();

  const fromBlock =
    cachedDonorsData.length > 0 && cachedDonorsData[0]
      ? cachedDonorsData[0].lastBlockNumber
      : startBlockNumber;
  let logs: any[] = [];

  console.log({
    cachedBlockNumber:
      cachedDonorsData.length > 0 ? cachedDonorsData[0].lastBlockNumber : null,
    currBlockNumber,
    startBlockNumber,
  });

  // return cached data if the last update was less than 15 mins (60 blocks) ago
  if (currBlockNumber - BigInt(fromBlock) < 60n) {
    const response = new Response(
      JSON.stringify({
        totalUSDAmount: cachedDonorsData[0].totalUSDAmount,
        donorsCount: cachedDonorsData[0].donorsCount,
        topDonorsWithEns: cachedDonorsData[0].topDonorsWithEns,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    // early return
    return response;
  }

  logs = await getAllLogs(BigInt(fromBlock), currBlockNumber, 5000n);

  // get current token prices
  const { ethPrice, arbPrice } = await getPrices();
  const tokenAddressToPrice: {
    [token: string]: number;
  } = {
    [USDCAddress]: 1,
    [ETHAddress]: ethPrice,
    [ARBAddress]: arbPrice,
  };
  const newDonations = logs.map((log) => ({
    donor: log.args.origin,
    token: log.args.token,
    amount: formatUnits(
      log.args.amount,
      tokenAddressToDecimals[log.args.token]
    ),
    usdAmount:
      parseFloat(
        formatUnits(log.args.amount, tokenAddressToDecimals[log.args.token])
      ) * parseFloat(tokenAddressToPrice[log.args.token].toString()),
  }));

  // organize data by unique donors
  const donorsToTotalUSDAmount: {
    [donor: string]: number;
  } = {};

  // populate from cache
  if (cachedDonorsData.length) {
    cachedDonorsData[0].topDonorsWithEns.map((donor) => {
      donorsToTotalUSDAmount[donor.address] = donor.usdAmount;
    });
  }

  newDonations.map((donation) => {
    if (donorsToTotalUSDAmount[donation.donor]) {
      donorsToTotalUSDAmount[donation.donor] += donation.usdAmount;
    } else {
      donorsToTotalUSDAmount[donation.donor] = donation.usdAmount;
    }
  });
  const donorsCount = Object.keys(donorsToTotalUSDAmount).length;

  // sort data by top donors
  const topDonors = Object.entries(donorsToTotalUSDAmount)
    .sort((a, b) => b[1] - a[1])
    .map(([address, usdAmount]) => ({ address, usdAmount }));
  // resolve ENS names
  const topDonorsPromise = topDonors.map(async (donor) => ({
    address: donor.address,
    ens: (await getEnsName(donor.address)) ?? "",
    usdAmount: parseFloat(donor.usdAmount.toFixed(2)),
  }));
  const topDonorsWithEns = await Promise.all(topDonorsPromise);

  // total usd amount donated
  const totalUSDAmount = parseFloat(
    topDonorsWithEns.reduce((acc, donor) => acc + donor.usdAmount, 0).toFixed(2)
  );

  const resData = {
    totalUSDAmount,
    donorsCount,
    topDonorsWithEns,
  };
  // cache the new data
  if (cachedDonorsData.length) {
    cachedDonorsData[0].lastBlockNumber = parseInt(currBlockNumber.toString());
    cachedDonorsData[0].totalUSDAmount = resData.totalUSDAmount;
    cachedDonorsData[0].donorsCount = resData.donorsCount;
    cachedDonorsData[0].topDonorsWithEns = resData.topDonorsWithEns;

    await cachedDonorsData[0].save();
  } else {
    const newLeaderboard = new Leaderboard({
      lastBlockNumber: parseInt(currBlockNumber.toString()),
      totalUSDAmount: resData.totalUSDAmount,
      donorsCount: resData.donorsCount,
      topDonorsWithEns: resData.topDonorsWithEns,
    });

    await newLeaderboard.save();
  }

  const response = new Response(JSON.stringify(resData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response;
};
