// Print the OneVoice deployment init code (creation bytecode + constructor args)
// to init-code.txt. No broadcast, no signing.
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const AGENT_ID = "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";

async function main() {
  const factory = await ethers.getContractFactory("OneVoice");
  const tx = await factory.getDeployTransaction(AGENT_ID);
  const data = tx.data;
  fs.writeFileSync(path.join(__dirname, "..", "init-code.txt"), data);
  console.log("init code bytes:", (data.length - 2) / 2);
  console.log("init code sha256:", ethers.keccak256(data));
  console.log("saved to init-code.txt");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
