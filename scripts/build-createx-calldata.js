// Build the CreateX deployCreate(bytes) calldata for the OneVoice init code,
// and compute the expected deployed address (CREATE from the CreateX factory
// at its current nonce). No broadcast, no signing.
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const CREATEX = "0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed";

async function main() {
  const initCode = fs.readFileSync(path.join(__dirname, "..", "init-code.txt"), "utf8").trim();
  const selector = ethers.id("deployCreate(bytes)").slice(0, 10);
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(["bytes"], [initCode]);
  const calldata = selector + encoded.slice(2);
  fs.writeFileSync(path.join(__dirname, "..", "createx-calldata.txt"), calldata);

  const provider = ethers.provider;
  const nonce = await provider.getTransactionCount(CREATEX);
  const expected = ethers.getCreateAddress({ from: CREATEX, nonce });

  console.log("selector:", selector);
  console.log("calldata bytes:", (calldata.length - 2) / 2);
  console.log("factory nonce:", nonce);
  console.log("expected deployed address:", expected);
  console.log("calldata saved to createx-calldata.txt");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
