export const ARC_CHAIN_ID = 5042;
export const PARSER_VERSION = "0.1.0";
export const SYSTEM_EMITTER = "0xfffffffffffffffffffffffffffffffffffffffe";
export const USDC_ERC20 = "0x3600000000000000000000000000000000000000";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
export const ARC_RPC_URL = "https://rpc.mainnet.arc.io";
export const ARC_EXPLORER_URL = "https://explorer.arc.io";
export const TRANSFER_ABI = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { type: "address", name: "from", indexed: true },
      { type: "address", name: "to", indexed: true },
      { type: "uint256", name: "value", indexed: false },
    ],
  },
] as const;
