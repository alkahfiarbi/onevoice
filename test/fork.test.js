const { ethers, network } = require("hardhat");
const assert = require("assert");

// Fork test — run with: FORK=1 npx hardhat test test/fork.test.js
// Verifies OneVoice works against the REAL Agent ID contract on BSC mainnet
// (no funds spent: the user's wallet is impersonated on the fork).
const AGENT_ID = "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";
const USER_WALLET = "0xfBcE2E2D17F7C89CaA567B50Cd5f98570F7fFd5D";

describe("OneVoice on BSC mainnet fork", function () {
  it("real Agent ID gate passes for the user's wallet, fails for a stranger", async function () {
    const agentId = await ethers.getContractAt(
      ["function balanceOf(address) view returns (uint256)"],
      AGENT_ID
    );
    const bal = await agentId.balanceOf(USER_WALLET);
    console.log("    user Agent ID balance on fork:", bal.toString());
    assert.strictEqual(bal, 1n, "user must hold exactly 1 Agent ID");

    const OneVoice = await ethers.getContractFactory("OneVoice");
    const oneVoice = await OneVoice.deploy(AGENT_ID);
    await oneVoice.waitForDeployment();

    // Impersonate the user's wallet (fork only — no private key involved).
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USER_WALLET],
    });
    const user = await ethers.getSigner(USER_WALLET);
    await oneVoice.connect(user).createPoll("Fork check?", ["Yes", "No"], 3600);
    await oneVoice.connect(user).vote(0, 0);
    const p = await oneVoice.getPoll(0);
    assert.deepStrictEqual(p.votes.map((v) => v.toString()), ["1", "0"]);
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [USER_WALLET],
    });

    // A fresh address with no Agent ID must be rejected by the real gate.
    const [, stranger] = await ethers.getSigners();
    assert.strictEqual(await agentId.balanceOf(stranger.address), 0n);
    await assert.rejects(
      oneVoice.connect(stranger).createPoll("Nope?", ["A", "B"], 3600),
      /Agent ID required/
    );
    console.log("    fork test passed: real Agent ID gate works");
  });
});
