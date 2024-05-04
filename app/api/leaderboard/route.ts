import {
  createPublicClient,
  formatUnits,
  http,
  parseAbiItem,
  stringify,
} from "viem";
import { arbitrum } from "viem/chains";
import { getEnsName } from "@/utils";

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(process.env.ARBITRUM_RPC_URL),
});

const getAllLogs = async (
  FROM_BLOCK: bigint,
  TO_BLOCK: bigint,
  MAX_BLOCKS_RANGE: bigint
) => {
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

const GET = async (request: Request) => {
  // get logs from when the recipientId was created to the current block
  const currBlockNumber = await publicClient.getBlockNumber();
  const logs = await getAllLogs(201684537n, currBlockNumber, 5000n);

  // get current token prices
  const { ethPrice, arbPrice } = await getPrices();
  const tokenAddressToPrice: {
    [token: string]: number;
  } = {
    [USDCAddress]: 1,
    [ETHAddress]: ethPrice,
    [ARBAddress]: arbPrice,
  };
  const donations = logs.map((log) => ({
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
  donations.map((donation) => {
    if (donorsToTotalUSDAmount[donation.donor]) {
      donorsToTotalUSDAmount[donation.donor] += donation.usdAmount;
    } else {
      donorsToTotalUSDAmount[donation.donor] = donation.usdAmount;
    }
  });
  const donorsCount = Object.keys(donorsToTotalUSDAmount).length;

  // total usd amount donated
  const totalUSDAmount = parseFloat(
    donations.reduce((acc, donation) => acc + donation.usdAmount, 0).toFixed(2)
  );

  // sort data by top donors
  const topDonors = Object.entries(donorsToTotalUSDAmount)
    .sort((a, b) => b[1] - a[1])
    .map(([address, usdAmount]) => ({ address, usdAmount }));
  // resolve ENS names
  const topDonorsPromise = topDonors.map(async (donor) => ({
    address: (await getEnsName(donor.address)) ?? donor.address,
    usdAmount: parseFloat(donor.usdAmount.toFixed(2)),
  }));
  const topDonorsWithEns = await Promise.all(topDonorsPromise);

  const response = new Response(
    stringify({
      totalUSDAmount,
      donorsCount,
      topDonorsWithEns,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  return response;
};

export { GET };
