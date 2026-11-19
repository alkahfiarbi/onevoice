// OneVoice frontend — plain JS + ethers v6 (UMD via CDN). No build step.
(function () {
  const CFG = window.ONEVOICE || {};
  const CONTRACT = CFG.address || "0x0000000000000000000000000000000000000000";
  const AGENT_ID = CFG.agentId || "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";
  const CHAIN_ID = 56; // BNB Chain mainnet
  const ZERO = "0x0000000000000000000000000000000000000000";

  const ONEVOICE_ABI = [
    "function pollCount() view returns (uint256)",
    "function getPoll(uint256) view returns (string question, string[] options, uint256[] votes, uint256 endsAt, address creator)",
    "function hasVoted(uint256,address) view returns (bool)",
    "function createPoll(string,string[],uint256) returns (uint256)",
    "function vote(uint256,uint256)",
  ];
  const AGENT_ID_ABI = ["function balanceOf(address) view returns (uint256)"];

  const $ = (id) => document.getElementById(id);
  const statusEl = $("status");
  const short = (a) => a.slice(0, 6) + "…" + a.slice(-4);
  const setStatus = (m) => { statusEl.textContent = m; };

  let provider = null, signer = null, account = null, isHolder = false;
  const nameCache = {};

  // Reverse-resolve an address to its .ai name via the SPACE ID Web3 Name SDK.
  // Best effort only: any failure falls back to the truncated address.
  async function resolveName(address) {
    if (nameCache[address] !== undefined) return nameCache[address];
    nameCache[address] = null;
    try {
      const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
      const rpc = await withTimeout(fetch("https://spaceapi.prd.space.id/rpc/1").then((r) => r.json()), 8000);
      const mod = await withTimeout(import("https://esm.sh/@web3-name-sdk/core@0.4.2"), 15000);
      const w3n = mod.createWeb3Name({ rpcUrl: rpc.url });
      const name = await withTimeout(
        w3n.getDomainName({ address, queryTLDs: ["ai"] }).catch(() =>
          w3n.getDomainName({ address, queryChainIdList: [56] })),
        15000
      );
      if (name) nameCache[address] = name;
    } catch (e) {
      // Fall through to truncated address display.
    }
    return nameCache[address];
  }

  async function displayName(address) {
    const name = await resolveName(address);
    return name || short(address);
  }

  function deployed() {
    return CONTRACT && CONTRACT.toLowerCase() !== ZERO;
  }

  async function loadPolls() {
    const box = $("polls");
    if (!deployed()) {
      box.innerHTML = '<p class="meta">No polls yet — the contract is not deployed.</p>';
      return;
    }
    try {
      const read = new ethers.Contract(CONTRACT, ONEVOICE_ABI, provider);
      const count = Number(await read.pollCount());
      if (count === 0) {
        box.innerHTML = '<p class="meta">No polls yet. Be the first to create one.</p>';
        return;
      }
      box.innerHTML = "";
      for (let id = count - 1; id >= 0; id--) {
        const p = await read.getPoll(id);
        const total = p.votes.reduce((a, v) => a + Number(v), 0);
        const ended = Date.now() / 1000 >= Number(p.endsAt);
        const voted = account ? await read.hasVoted(id, account) : false;
        const creator = await displayName(p.creator);
        const div = document.createElement("div");
        div.className = "card";
        let html = `<strong>#${id} — ${escapeHtml(p.question)}</strong><br>` +
          `<span class="meta">by ${escapeHtml(creator)} · ${total} vote${total === 1 ? "" : "s"} · ` +
          (ended ? "ended" : `ends ${new Date(Number(p.endsAt) * 1000).toLocaleString()}`) + `</span>`;
        p.options.forEach((opt, i) => {
          const v = Number(p.votes[i]);
          const pct = total ? Math.round((v / total) * 100) : 0;
          html += `<div class="opt"><span>${escapeHtml(opt)}</span><span>${v} (${pct}%)</span></div>` +
            `<div class="bar"><div style="width:${pct}%"></div></div>`;
        });
        if (!ended && account && isHolder && !voted) {
          html += `<p>${p.options.map((opt, i) =>
            `<button data-poll="${id}" data-opt="${i}">Vote: ${escapeHtml(opt)}</button> `).join("")}</p>`;
        } else if (voted) {
          html += `<p><span class="badge">You voted</span></p>`;
        } else if (!account) {
          html += `<p class="meta">Connect your wallet to vote.</p>`;
        } else if (!isHolder) {
          html += `<p class="meta">Voting needs an Agent ID.</p>`;
        }
        div.innerHTML = html;
        box.appendChild(div);
      }
      box.querySelectorAll("button[data-poll]").forEach((b) => {
        b.addEventListener("click", () => doVote(Number(b.dataset.poll), Number(b.dataset.opt), b));
      });
    } catch (e) {
      box.innerHTML = `<p class="meta">Could not load polls: ${escapeHtml(e.message || e)}</p>`;
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function ensureChain() {
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== CHAIN_ID) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x38" }],
      });
    }
  }

  async function connect() {
    try {
      if (!window.ethereum) { setStatus("No wallet found. Install Binance Wallet or MetaMask."); return; }
      provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      await ensureChain();
      signer = await provider.getSigner();
      account = await signer.getAddress();
      const agent = new ethers.Contract(AGENT_ID, AGENT_ID_ABI, provider);
      const bal = await agent.balanceOf(account);
      isHolder = bal > 0n;
      const name = await displayName(account);
      $("account").innerHTML =
        `Connected: <strong>${escapeHtml(name)}</strong> <span class="meta">${short(account)}</span><br>` +
        (isHolder
          ? '<span class="badge">Agent ID holder ✓</span>'
          : '<span class="badge no">No Agent ID — you can read polls, but not create or vote</span>');
      $("create-card").hidden = !isHolder;
      setStatus("");
      await loadPolls();
    } catch (e) {
      setStatus("Connect failed: " + (e.message || e));
    }
  }

  async function doVote(pollId, option, btn) {
    try {
      btn.disabled = true;
      setStatus("Confirm the vote in your wallet…");
      const contract = new ethers.Contract(CONTRACT, ONEVOICE_ABI, signer);
      const tx = await contract.vote(pollId, option);
      setStatus("Vote sent: " + tx.hash + " — waiting for confirmation…");
      await tx.wait();
      setStatus("Vote confirmed ✓");
      await loadPolls();
    } catch (e) {
      setStatus("Vote failed: " + (e.message || e));
      btn.disabled = false;
    }
  }

  async function createPoll() {
    try {
      const q = $("q").value.trim();
      const opts = [...document.querySelectorAll(".opt-in")].map((i) => i.value.trim()).filter(Boolean);
      const dur = Number($("dur").value);
      if (!q) { setStatus("Write a question first."); return; }
      if (opts.length < 2) { setStatus("Need at least 2 options."); return; }
      setStatus("Confirm in your wallet…");
      const contract = new ethers.Contract(CONTRACT, ONEVOICE_ABI, signer);
      const tx = await contract.createPoll(q, opts, dur);
      setStatus("Poll sent: " + tx.hash + " — waiting for confirmation…");
      await tx.wait();
      setStatus("Poll created ✓");
      $("q").value = "";
      document.querySelectorAll(".opt-in").forEach((i) => { i.value = ""; });
      await loadPolls();
    } catch (e) {
      setStatus("Create failed: " + (e.message || e));
    }
  }

  $("connect-btn").addEventListener("click", connect);
  $("create-btn").addEventListener("click", createPoll);
  $("add-opt").addEventListener("click", () => {
    const inputs = document.querySelectorAll(".opt-in");
    if (inputs.length >= 8) return;
    const input = document.createElement("input");
    input.className = "opt-in";
    input.maxLength = 80;
    input.placeholder = "Option " + (inputs.length + 1);
    $("opts").appendChild(input);
  });

  $("contract-addr").textContent = deployed() ? CONTRACT : "not deployed yet";
  if (!deployed()) $("deploy-note").hidden = false;
  if (window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);
    loadPolls();
  } else {
    $("polls").innerHTML = '<p class="meta">Install a wallet (Binance Wallet / MetaMask) to use OneVoice.</p>';
  }
})();
