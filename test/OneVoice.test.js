const { ethers } = require("hardhat");
const assert = require("assert");

async function expectRevert(promise, reason) {
  try {
    await promise;
    assert.fail("expected revert, but call succeeded");
  } catch (e) {
    assert.ok(
      e.message.includes(reason),
      `expected revert "${reason}" but got: ${e.message.slice(0, 300)}`
    );
  }
}

describe("OneVoice", function () {
  let agentId, oneVoice, holder, holder2, stranger;

  beforeEach(async function () {
    [holder, holder2, stranger] = await ethers.getSigners();
    const Mock = await ethers.getContractFactory("MockAgentID");
    agentId = await Mock.deploy();
    await agentId.waitForDeployment();
    await agentId.mint(holder.address);
    await agentId.mint(holder2.address);
    // stranger gets no Agent ID on purpose

    const OneVoice = await ethers.getContractFactory("OneVoice");
    oneVoice = await OneVoice.deploy(await agentId.getAddress());
    await oneVoice.waitForDeployment();
  });

  it("starts with zero polls", async function () {
    assert.strictEqual(await oneVoice.pollCount(), 0n);
  });

  it("holder can create a poll; stranger cannot", async function () {
    await expectRevert(
      oneVoice.connect(stranger).createPoll("Q?", ["A", "B"], 3600),
      "Agent ID required"
    );
    await oneVoice.connect(holder).createPoll("Best chain?", ["BSC", "ETH"], 3600);
    assert.strictEqual(await oneVoice.pollCount(), 1n);
    const p = await oneVoice.getPoll(0);
    assert.strictEqual(p.question, "Best chain?");
    assert.deepStrictEqual([...p.options], ["BSC", "ETH"]);
    assert.deepStrictEqual([...p.votes].map((v) => v.toString()), ["0", "0"]);
    assert.strictEqual(p.creator, holder.address);
  });

  it("rejects bad poll params", async function () {
    await expectRevert(oneVoice.connect(holder).createPoll("Q?", ["Only one"], 3600), "2-8 options");
    await expectRevert(oneVoice.connect(holder).createPoll("Q?", ["A", "B"], 60), "bad duration");
    await expectRevert(oneVoice.connect(holder).createPoll("", ["A", "B"], 3600), "bad question");
  });

  it("one vote per holder per poll; stranger cannot vote", async function () {
    await oneVoice.connect(holder).createPoll("Q?", ["Yes", "No"], 3600);
    await expectRevert(oneVoice.connect(stranger).vote(0, 0), "Agent ID required");
    await oneVoice.connect(holder).vote(0, 0);
    await oneVoice.connect(holder2).vote(0, 1);
    let p = await oneVoice.getPoll(0);
    assert.deepStrictEqual([...p.votes].map((v) => v.toString()), ["1", "1"]);
    await expectRevert(oneVoice.connect(holder).vote(0, 1), "already voted");
    await expectRevert(oneVoice.connect(holder).vote(0, 5), "bad option");
    await expectRevert(oneVoice.connect(holder).vote(99, 0), "no such poll");
  });

  it("rejects votes after the poll ends", async function () {
    await oneVoice.connect(holder).createPoll("Q?", ["A", "B"], 3600);
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    await expectRevert(oneVoice.connect(holder).vote(0, 0), "poll ended");
  });

  it("tracks hasVoted", async function () {
    await oneVoice.connect(holder).createPoll("Q?", ["A", "B"], 3600);
    assert.strictEqual(await oneVoice.hasVoted(0, holder.address), false);
    await oneVoice.connect(holder).vote(0, 1);
    assert.strictEqual(await oneVoice.hasVoted(0, holder.address), true);
  });
});
