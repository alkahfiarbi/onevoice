# OneVoice — one Agent ID, one vote

On-chain polls where one Binance Agent ID (`.ai`) equals exactly one vote.
Built for the **Binance Agent ID Hackathon** (Binance Wallet × BNB Chain,
60,000 USDC prize pool, submissions until **9 Dec 2026 15:00 WIB**).

## The idea

An Agent ID is non-transferable and one per person. That makes it a natural
sybil-resistant identity: **one person can only ever cast one vote per poll**,
no matter how many wallets they control. OneVoice turns that into the
simplest useful dApp for Agent ID holders — governance-grade polls with no
owner, no admin, no fees, no custody, and no token.

- **Create a poll** — any Agent ID holder, 2–8 options, 1 hour–30 days.
- **Vote** — any Agent ID holder, exactly once per poll.
- **Read results** — anyone, free, on-chain.

Why this concept: the two most obvious Agent ID apps are already taken by
other hackathon entrants (AgentWall: message wall + check-ins + tips;
AgentAttest: register + vouch). Polls are a genuinely different use case —
decision-making — and every vote is an on-chain interaction by an Agent ID
address, which is exactly what the Pioneer Award ranks on (interacting
Agent ID addresses + transaction count).

## How Agent ID is used

1. **Access control** — `createPoll()` and `vote()` both require
   `AgentID.balanceOf(msg.sender) > 0`, checked against the official Agent ID
   contract on BNB Chain: `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`
   (SPACE ID, ERC-721, non-transferable).
2. **Identity** — poll creators and voters are shown by their `.ai` name
   (reverse-resolved via the SPACE ID Web3 Name SDK, with a truncated-address
   fallback). Agent ID is never used to "look up other people's wallets by
   name" — names are only shown for addresses already visible in a poll.

## Contract

- `contracts/OneVoice.sol` — the whole dApp. No owner, no admin, no
  upgradeability, no fees, no custody. The deployer has no special powers
  after deployment.
- **Deployed address: _not deployed yet_** (see "Deploy" below).
- Owner permissions: **none exist**. There is nothing to document beyond
  that — the contract cannot mint, pause, freeze, tax, or withdraw anything.
- Source verification: verify on BscScan after deploy (flattened source is
  `contracts/OneVoice.sol`; Solidity 0.8.20, optimizer on, 200 runs).

## Gas (measured, not estimated from docs)

Live gas price at measurement (19 Nov 2026 ~20:45 WIB): **0.05 gwei**.

| Action | Gas | Cost @ 0.05 gwei |
|---|---|---|
| Deploy | 913,294 (mainnet estimate; 904,945 measured locally) | **0.0000457 BNB** |
| createPoll | 244,258 | 0.0000122 BNB |
| vote | 82,304 | 0.0000041 BNB (~$0.003) |

- User wallet balance: **0.000434 BNB** → deploy costs ~10.5% of the balance.
- **Fits in the balance: YES**, as long as gas price stays ≤ ~0.47 gwei
  (break-even). BSC gas is typically 0.05–0.1 gwei. The deploy script
  re-checks affordability live before broadcasting and aborts if it does not fit.
- Bytecode: 4,174 bytes creation / 3,932 bytes deployed (limit 24,576).

## Tests

- `npx hardhat test` — **6/6 pass** (`test/OneVoice.test.js`): holder can
  create/vote, stranger cannot, double-vote rejected, bad params rejected,
  expired polls rejected, `hasVoted` tracked. Uses a `MockAgentID` stand-in.
- `FORK=1 npx hardhat test test/fork.test.js` — fork test against the REAL
  Agent ID contract, impersonating the user's wallet. **Currently blocked by
  public-RPC limits**: every free BSC RPC tried returns `missing trie node`
  for `eth_getCode` at fork blocks (pruned state), and Ankr's public endpoint
  now needs an API key. The same gate is verified directly instead:
  `balanceOf(user wallet)` on the real contract returns **1** (checked via
  raw `eth_call`), which is exactly the call OneVoice makes. Re-run the fork
  test with an archive/full-state RPC if one becomes available.
- `npx hardhat run scripts/measure-gas.js` — the gas table above.

## Frontend

`frontend/` — static HTML + plain JS, no build step. Ethers v6 via CDN.
Connect wallet → switch to BSC (chain 56) → check Agent ID → create/vote.
Hosted free on GitHub Pages from this repo.

- Website: **https://alkahfiarbi.github.io/onevoice/** (live once GitHub Pages is enabled on the repo)
- The page never asks for a seed phrase, private key, API secret, or pairing
  code. Every transaction is confirmed by the user in their own wallet.

## Deploy (steps remaining — parent runs these)

1. Restore the `baw` sign-in (user confirms the pairing code in the Binance
   App). The deployer is the user's Binance Agentic Wallet
   `0xfBcE2E2D17F7C89CaA567B50Cd5f98570F7fFd5D`.
2. Dry run first (broadcasts nothing):
   `npx hardhat run scripts/deploy.js --network bsc`
   — prints live gas price, deploy gas, cost in BNB, and whether it fits the
   0.000434 BNB balance. Abort if it says NO.
3. Real deploy (only after the dry run says YES):
   `npx hardhat run scripts/deploy.js --network bsc --broadcast`
   — needs `DEPLOYER_PRIVATE_KEY` in the environment, or deploy via `baw`
   contract-call instead (preferred: no raw key leaves the wallet).
   The script saves the address to `deployments/bsc.json` and updates
   `frontend/config.js`.
4. Verify source on BscScan (contract `OneVoice`, Solidity 0.8.20,
   optimizer enabled, 200 runs, constructor arg = Agent ID address
   `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`).
5. Enable GitHub Pages on the repo (Settings → Pages → Deploy from branch
   `main`, folder `/frontend`... or root; see below) and confirm the site loads.
6. Submit to the hackathon (see "Submission" below).

## Submission

Materials (fill in the contract address after deploy):

- **Project name:** OneVoice
- **Website:** https://alkahfiarbi.github.io/onevoice/
- **Contract address:** `0xcECEF7C30894da42C0Ea96961083364684A066d3` (BNB Chain mainnet, deployed 2026-11-19 via CreateX factory; deploy tx `0x82af85bd6bdc89c1ff88457d9dfcb208a1b17a10cfd931dbc42d85a6340a516d`, block 134515930; [BscScan](https://bscscan.com/address/0xcECEF7C30894da42C0Ea96961083364684A066d3))
- **Agent ID usage:** Access control + sybil-resistant identity. Only Agent
  ID holders can create polls and vote (checked on-chain via
  `balanceOf` on the official Agent ID contract); one Agent ID = one vote
  per poll, because each person can hold only one non-transferable Agent ID.
  Voters/creators are displayed by their `.ai` name.
- **Reward receiving address:** the user's Binance wallet
  `0xfBcE2E2D17F7C89CaA567B50Cd5f98570F7fFd5D` (EVM, BNB Chain).

**Submission channel — NOT FOUND in the announcement.** The official
announcement and the Binance Square repost both say "submit your project
name, website, contract address(es), Agent ID usage description, and other
required materials during the Submission Period. No registration needed." —
but neither publishes a form URL, email, or portal link. The only survey
link published is for the X promotion campaign (`app.binance.com`), not for
project submissions. Before the 9 Dec deadline, check for the submission
link on @BinanceWallet / @BNBCHAIN on X and re-read the announcement page;
the parent should file the submission as soon as the channel is known.

## User's Agent ID

- Wallet `0xfBcE2E2D17F7C89CaA567B50Cd5f98570F7fFd5D` holds **1 Agent ID**
  (verified on-chain via `balanceOf` on the Agent ID contract).
- **The `.ai` name itself is NOT yet resolved.** Attempts made:
  - `tokenOfOwnerByIndex` reverts (the contract does not implement
    ERC721Enumerable).
  - SPACE ID Web3 Name SDK reverse lookup returns `null` for both the BSC
    chain primary name and the `.ai` TLD primary name — no primary name is
    set for this address.
  - `eth_getLogs` for the mint/transfer event is blocked by every free BSC
    RPC tried (publicnode rate-limited; bsc-dataseed / defibit / 1rpc all
    answer `limit exceeded`).
  - Reliable path: run `baw wallet agent-id` after the `baw` sign-in is
    restored — it reads the name from the Binance account directly.

## Red-lines compliance

- No web-based QR login, no pairing codes, no server-side sessions.
- No bypass of user transaction confirmation — every write is a normal
  wallet transaction the user confirms.
- No unauthorized transfers — the contract moves no funds at all (no
  payable functions).
- Contract open-source (this repo, MIT), no owner permissions to disclose
  (none exist).
- No "Binance"/"BNB" in the project name, token, or domain.
- No collection of seed phrases, private keys, API secrets, or pairing codes.
- No promised returns; no "passive income" language anywhere.
- No trading features, so no trading risk warning is required.
- Agent ID is not packaged as a wallet-lookup tool.

## Honest risks

- **The 30-address bar.** The Innovation Award requires the product to be
  live with at least **30 Agent ID addresses** interacting during the
  submission period; the Pioneer Award ranks on interacting Agent ID
  addresses. OneVoice is cheap to use (a vote costs ~$0.003), but reaching
  30 distinct Agent ID holders still needs real promotion — the X content
  campaign and the hackathon community are the channels. Without that, the
  project is eligible to submit but unlikely to place.
- **Submission channel unknown** (see above) — must be found before 9 Dec.
- **Deploy needs the `baw` sign-in** (user confirms a pairing code) and
  gas price ≤ ~0.47 gwei at deploy time.
