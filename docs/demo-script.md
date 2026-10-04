# Captioned demonstration

A 110.9-second English-captioned screen recording of the published application, with a 108-second demonstration timeline and a short opening transition. It uses real read-only mainnet queries and existing public transactions. Captions are recording annotations, not extra application controls. There is no voice track. Times below are relative to the first caption.

| Time      | On screen                           | Point                                                            |
| --------- | ----------------------------------- | ---------------------------------------------------------------- |
| 0–10 s    | Initial recorded ERC-20 example     | A developer needs movements and evidence without double counting |
| 10–22 s   | Live 1.5 USDC receipt; separate gas | Real published-origin query; no wallet or new transaction        |
| 22–34 s   | 3 vs 1.5 teaching comparison        | Two streams are one movement                                     |
| 34–44 s   | Expanded 18-decimal system log      | Raw emitter, integer amount, addresses and identity              |
| 44–54 s   | Expanded 6-decimal ERC-20 log       | Paired evidence with different raw units                         |
| 54–66 s   | Live native receipt                 | 100.42007099937 USDC without an ERC-20 USDC event                |
| 66–76 s   | Native indexing comparison          | ERC-20-only indexing misses this movement                        |
| 76–90 s   | Four live movements                 | Log identity and event senders matter                            |
| 90–100 s  | JSON export and package integration | Reuse, public tests and independent installation                 |
| 100–108 s | Scope note                          | Explicit movements and outer gas; clear limitations              |

Re-record with `npm run demo:record` after installing Chromium. `RECEIPTLAB_DEMO_URL` can select another published origin or local instance. The script performs reads only and verifies the first live amount before continuing. Browser navigation is recorded before the demonstration timeline begins, so a new raw capture can exceed 120 seconds; measure and remove the initial navigation pre-roll before publishing.

For this artifact, the raw 121.04-second capture was trimmed with a requested 13-second seek and WebM packet copy. The retained keyframe boundary removed 10.24 seconds, yielding 110.8 seconds. A VP8 re-encode at 12 fps reduced the file size for delivery; its duration is 110.916 seconds after frame rounding. No playback acceleration, amount substitution or simulated RPC response was used. Browser playback, seeking, live amounts, comparison, system/ERC-20 evidence, multiple movements, integration and final scope captions were visually checked. The final compressed live and raw-evidence frames were also reviewed for legibility. [Recording metadata](evidence/demo-recording.json) lists the source, dimensions and observed read-only RPC methods. A recording failure does not count as a completed artifact.

No organizer acceptance, grant selection, real customers or new project transactions are implied.
