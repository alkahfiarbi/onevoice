// Measures real gas usage of each OneVoice interaction on a local network.
// Run: npx hardhat run scripts/measure-gas.js
const { ethers } = require("hardhat");

async function main() {
  const [holder, holder2] = await ethers.getSigners();
  const Mock = await ethers.getContractFactory("MockAgentID");
  const agentId = await Mock.deploy();
  await agentId.mint(holder.address);
  await agentId.mint(holder2.address);

  const OneVoice = await ethers.getContractFactory("OneVoice");
  const oneVoice = await OneVoice.deploy(await agentId.getAddress());
  const deployReceipt = await oneVoice.deploymentTransaction().wait();
  console.log("deploy gas:", deployReceipt.gasUsed.toString());

  const tx1 = await oneVoice
    .connect(holder)
    .createPoll("Best chain for agents?", ["BSC", "ETH", "Solana"], 86400);
  console.log("createPoll gas:", (await tx1.wait()).gasUsed.toString());

  const tx2 = await oneVoice.connect(holder).vote(0, 0);
  console.log("vote gas (1st voter):", (await tx2.wait()).gasUsed.toString());

  const tx3 = await oneVoice.connect(holder2).vote(0, 1);
  console.log("vote gas (2nd voter):", (await tx3.wait()).gasUsed.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
