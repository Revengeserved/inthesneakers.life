const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const API_BASE = "https://api.etherscan.io/v2/api";

const DEFAULT_CHAINS = [
  { id: "1", name: "Ethereum" },
  { id: "8453", name: "Base" },
  { id: "42161", name: "Arbitrum One" },
  { id: "10", name: "Optimism" },
  { id: "137", name: "Polygon" },
  { id: "56", name: "BNB Smart Chain" },
  { id: "43114", name: "Avalanche C-Chain" },
  { id: "59144", name: "Linea" },
  { id: "534352", name: "Scroll" },
];

const ACTIONS = [
  ["normal", "txlist"],
  ["internal", "txlistinternal"],
  ["erc20", "tokentx"],
  ["erc721", "tokennfttx"],
  ["erc1155", "token1155tx"],
];

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function isValidAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || "").trim());
}

async function etherscan(params) {
  const url = new URL(API_BASE);
  Object.entries({ ...params, apikey: ETHERSCAN_API_KEY }).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "wallet-forensics-web/1.0" },
  });
  if (!response.ok) throw new Error(`Etherscan HTTP ${response.status}`);
  return response.json();
}

function noRecords(payload) {
  const result = String(payload?.result ?? "").toLowerCase();
  return payload?.status === "0" && (
    Array.isArray(payload?.result) && payload.result.length === 0 ||
    result.includes("no transactions found") ||
    result.includes("no records found") ||
    result.includes("no data found")
  );
}

async function fetchRows(chainId, address, action, maxPages = 4) {
  const rows = [];
  const pageSize = 1000;

  for (let page = 1; page <= maxPages; page += 1) {
    const payload = await etherscan({
      chainid: chainId,
      module: "account",
      action,
      address,
      startblock: 0,
      endblock: 999999999,
      page,
      offset: pageSize,
      sort: "asc",
    });

    if (noRecords(payload)) break;
    if (payload?.status !== "1" || !Array.isArray(payload?.result)) {
      throw new Error(`${action}: ${payload?.message || "API error"} ${String(payload?.result || "")}`.trim());
    }

    rows.push(...payload.result);
    if (payload.result.length < pageSize) break;
  }

  return rows;
}

function classify(row) {
  const text = `${row.functionName || ""} ${row.input || ""}`.toLowerCase();
  const categories = [];
  const tests = {
    swap: ["swap", "exactinput", "exactoutput", "unoswap", "transformerc20"],
    liquidity: ["addliquidity", "removeliquidity", "increaseliquidity", "decreaseliquidity", "collect"],
    staking: ["stake", "unstake", "getreward", "harvest", "claimreward"],
    bridge: ["bridge", "depositeth", "depositerc20", "withdraweth", "withdrawerc20", "sendmessage"],
    lending: ["supply", "borrow", "repay", "liquidationcall", "flashloan", "redeem"],
    approval: ["approve", "setapprovalforall", "permit", "increaseallowance", "decreaseallowance"],
  };
  for (const [category, words] of Object.entries(tests)) {
    if (words.some((word) => text.includes(word))) categories.push(category);
  }
  return categories;
}

function decodeApproval(row) {
  const input = String(row.input || "").toLowerCase();
  if (!input.startsWith("0x") || input.length < 10) return null;
  const selector = input.slice(2, 10);
  const words = [];
  for (let i = 10; i + 64 <= input.length; i += 64) words.push(input.slice(i, i + 64));

  try {
    if (selector === "095ea7b3" && words.length >= 2) {
      const amount = BigInt(`0x${words[1]}`);
      return {
        method: "approve(address,uint256)",
        spender: `0x${words[0].slice(-40)}`,
        unlimited: amount > (2n ** 255n),
        amount: amount.toString(),
      };
    }
    if (selector === "a22cb465" && words.length >= 2) {
      const approved = BigInt(`0x${words[1]}`) !== 0n;
      return {
        method: "setApprovalForAll(address,bool)",
        spender: `0x${words[0].slice(-40)}`,
        unlimited: approved,
        approved,
      };
    }
  } catch {
    return { method: "approval-like call", decodeError: true };
  }
  return null;
}

function normalize(rows, type, chain, wallet) {
  const walletLower = wallet.toLowerCase();
  return rows.map((row) => {
    const from = String(row.from || "").toLowerCase();
    const to = String(row.to || "").toLowerCase();
    const direction = from === walletLower ? (to === walletLower ? "self" : "out") : (to === walletLower ? "in" : "related");
    const timestamp = Number(row.timeStamp || 0);
    const approval = type === "normal" ? decodeApproval(row) : null;
    return {
      ...row,
      recordType: type,
      chainId: chain.id,
      chainName: chain.name,
      direction,
      timestampUtc: timestamp ? new Date(timestamp * 1000).toISOString() : null,
      categories: classify(row),
      approval,
    };
  });
}

function findings(timeline) {
  const result = [];

  for (const row of timeline) {
    if (row.approval) {
      result.push({
        severity: row.approval.unlimited ? "high" : "medium",
        type: "token_approval",
        summary: row.approval.unlimited ? "Unlimited token or NFT approval" : "Token approval call",
        chainName: row.chainName,
        chainId: row.chainId,
        timestampUtc: row.timestampUtc,
        txHash: row.hash,
        counterparty: row.approval.spender || row.to,
        confidence: "high",
      });
    }

    if (row.recordType === "normal" && row.direction === "out" && (String(row.isError) === "1" || String(row.txreceipt_status) === "0")) {
      result.push({
        severity: "low",
        type: "failed_transaction",
        summary: "Outgoing transaction failed",
        chainName: row.chainName,
        chainId: row.chainId,
        timestampUtc: row.timestampUtc,
        txHash: row.hash,
        counterparty: row.to,
        confidence: "high",
      });
    }
  }

  const outgoing = timeline.filter((row) => row.recordType === "erc20" && row.direction === "out");
  const grouped = new Map();
  for (const row of outgoing) {
    if (!grouped.has(row.chainId)) grouped.set(row.chainId, []);
    grouped.get(row.chainId).push(row);
  }

  for (const rows of grouped.values()) {
    rows.sort((a, b) => Number(a.timeStamp || 0) - Number(b.timeStamp || 0));
    for (let i = 0; i < rows.length; i += 1) {
      const start = Number(rows[i].timeStamp || 0);
      const windowRows = rows.slice(i).filter((row) => Number(row.timeStamp || 0) - start <= 1800);
      const tokens = new Set(windowRows.map((row) => String(row.contractAddress || "").toLowerCase()).filter(Boolean));
      if (windowRows.length >= 3 && tokens.size >= 3) {
        result.push({
          severity: "high",
          type: "rapid_multi_token_outflow",
          summary: `${windowRows.length} outgoing token transfers involving ${tokens.size} tokens within 30 minutes`,
          chainName: rows[i].chainName,
          chainId: rows[i].chainId,
          timestampUtc: rows[i].timestampUtc,
          txHash: rows[i].hash,
          counterparty: windowRows[0].to,
          confidence: "medium",
        });
        break;
      }
    }
  }

  return result.slice(0, 250);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Use POST." });
  if (!ETHERSCAN_API_KEY) return json(res, 503, { error: "Wallet scanning is not configured." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const address = String(body.address || "").trim();
    if (!isValidAddress(address)) return json(res, 400, { error: "Enter a valid EVM wallet address." });

    const requestedIds = Array.isArray(body.chainIds) && body.chainIds.length
      ? body.chainIds.map(String).slice(0, 3)
      : DEFAULT_CHAINS.slice(0, 3).map((chain) => chain.id);
    const chains = requestedIds
      .map((id) => DEFAULT_CHAINS.find((chain) => chain.id === id))
      .filter(Boolean);
    if (!chains.length) return json(res, 400, { error: "Choose at least one supported chain." });

    const timeline = [];
    const balances = [];
    const errors = [];

    for (const chain of chains) {
      try {
        const balancePayload = await etherscan({
          chainid: chain.id,
          module: "account",
          action: "balance",
          address,
          tag: "latest",
        });
        balances.push({
          chainId: chain.id,
          chainName: chain.name,
          balanceWei: balancePayload?.status === "1" ? String(balancePayload.result) : null,
        });
      } catch (error) {
        errors.push({ chainId: chain.id, chainName: chain.name, stage: "balance", error: error.message });
      }

      for (const [type, action] of ACTIONS) {
        try {
          const maxPages = Math.min(Math.max(Number(body.maxPages || 1), 1), 2);
          const rows = await fetchRows(chain.id, address, action, maxPages);
          timeline.push(...normalize(rows, type, chain, address));
        } catch (error) {
          errors.push({ chainId: chain.id, chainName: chain.name, stage: action, error: error.message });
        }
      }
    }

    timeline.sort((a, b) => Number(a.timeStamp || 0) - Number(b.timeStamp || 0));
    const scanFindings = findings(timeline);
    const counts = timeline.reduce((acc, row) => {
      acc[row.recordType] = (acc[row.recordType] || 0) + 1;
      return acc;
    }, {});

    return json(res, 200, {
      address,
      generatedAtUtc: new Date().toISOString(),
      chainsScanned: chains,
      balances,
      counts,
      totalRecords: timeline.length,
      findings: scanFindings,
      timeline,
      errors,
      limitations: [
        "This is heuristic triage, not proof of compromise or ownership.",
        "Each endpoint is capped to a limited number of pages so the scan can finish within a serverless request.",
        "Etherscan covers EVM chains only; Bitcoin and Solana require separate scanners.",
        "Exchange-internal transfers and off-chain records are not visible on public blockchains.",
      ],
    });
  } catch (error) {
    return json(res, 500, { error: error.message || "Scan failed." });
  }
};
