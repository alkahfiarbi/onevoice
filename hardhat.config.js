require("@nomicfoundation/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {
      // Fork BSC mainnet only when FORK=1 (used by test/fork.test.js).
      forking: process.env.FORK
        ? {
            url: process.env.FORK_URL || "https://bsc-dataseed.binance.org",
            blockNumber: process.env.FORK_BLOCK ? parseInt(process.env.FORK_BLOCK, 10) : undefined,
          }
        : undefined,
    },
    bsc: {
      url: "https://bsc-dataseed.binance.org",
      chainId: 56,
    },
  },
};
