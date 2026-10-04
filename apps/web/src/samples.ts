import native from "../../../fixtures/mainnet/native.json";
import erc20 from "../../../fixtures/mainnet/erc20.json";
import multiple from "../../../fixtures/mainnet/multiple.json";

export const samples = [
  {
    id: "erc20",
    title: "ERC-20 transfer",
    description: "Two event streams. One movement.",
    fixture: erc20,
    number: "01",
  },
  {
    id: "native",
    title: "Native transfer",
    description: "A movement ERC-20-only indexing misses.",
    fixture: native,
    number: "02",
  },
  {
    id: "multiple",
    title: "Multiple movements",
    description: "Four movements, with contract senders.",
    fixture: multiple,
    number: "03",
  },
] as const;
