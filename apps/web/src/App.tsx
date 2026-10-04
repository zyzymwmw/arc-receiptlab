import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  analyzeReceipt,
  formatAtomic,
  ARC_EXPLORER_URL,
  type ReceiptAnalysis,
} from "@receiptlab/core";
import { readArcReceipt } from "@receiptlab/core/rpc";
import { samples } from "./samples";

const SOURCE_URL =
  (import.meta.env.VITE_SOURCE_URL as string | undefined) ??
  "https://github.com/zyzymwmw/arc-receiptlab";
const statusLabels: Record<ReceiptAnalysis["status"], string> = {
  confirmed: "Successful receipt",
  reverted: "Reverted",
  pending: "Pending",
  "not-found": "Not found",
  "receipt-unavailable": "Receipt unavailable",
};

function Address({ value }: { value: string }) {
  return (
    <a
      className="address"
      href={`${ARC_EXPLORER_URL}/address/${value}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <code>{value}</code>
    </a>
  );
}

function openEvidence(logIndex: string) {
  const target = document.getElementById(`log-${logIndex}`);
  if (target instanceof HTMLDetailsElement) {
    target.open = true;
    target.querySelector("summary")?.focus({ preventScroll: true });
  }
}

function TeachingComparison({ result }: { result: ReceiptAnalysis }) {
  const signals = result.rawLogs.filter((log) => log.transfer);
  const naive = signals.reduce(
    (total, log) =>
      total +
      BigInt(log.transfer!.amountRaw) *
        (log.transfer!.decimals === 6 ? 10n ** 12n : 1n),
    0n,
  );
  const erc20Only = signals
    .filter((log) => log.stream === "erc20")
    .reduce(
      (total, log) => total + BigInt(log.transfer!.amountRaw) * 10n ** 12n,
      0n,
    );
  const paired = result.diagnostics.some(
    (diagnostic) => diagnostic.code === "DUAL_STREAM",
  );
  if (
    result.status !== "confirmed" ||
    result.coverage !== "complete" ||
    !result.movements.length
  )
    return null;
  return (
    <section className="comparison" aria-labelledby="comparison-title">
      <div className="section-title">
        <span className="eyebrow">TEACHING COMPARISON</span>
        <h2 id="comparison-title">
          {paired
            ? "Two streams do not mean two payments."
            : "No ERC-20 log does not mean no transfer."}
        </h2>
      </div>
      <div className="comparison-values">
        <div className="incorrect">
          <span>
            Incorrect:{" "}
            {paired ? "add both USDC streams" : "index ERC-20 events only"}
          </span>
          <strong>
            {formatAtomic(paired ? naive : erc20Only)} <small>USDC</small>
          </strong>
        </div>
        <div className="correct">
          <span>Count system movements once</span>
          <strong>
            {result.movementVolumeUsdc} <small>USDC</small>
          </strong>
        </div>
      </div>
      <p>
        Each system log identifies a movement. ERC-20 logs provide additional
        evidence. Equal amounts in different system events remain separate.
      </p>
      <p className="caption">
        The incorrect method is an educational example, not a finding about
        another product. Movement volume can include intermediary hops.
      </p>
    </section>
  );
}

function Results({
  result,
  input,
  onExport,
}: {
  result: ReceiptAnalysis;
  input: unknown;
  onExport: () => void;
}) {
  const sourceTitle =
    result.source.kind === "live"
      ? "Live mainnet response"
      : result.source.kind === "mainnet-recorded"
        ? "Recorded mainnet sample"
        : "Synthetic test data";
  const isFinal = result.status === "confirmed" || result.status === "reverted";
  const retrieved = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(result.source.retrievedAt));
  return (
    <div className="results" data-testid="receipt-results">
      <div className={`source-strip ${result.source.kind}`}>
        <div>
          <strong data-testid="source-label">{sourceTitle}</strong>
          <span>
            Retrieved {retrieved} UTC · Parser {result.parserVersion}
          </span>
        </div>
        <span className={`receipt-status ${result.status}`}>
          {result.source.kind === "synthetic"
            ? `Simulated: ${statusLabels[result.status]}`
            : statusLabels[result.status]}
        </span>
      </div>
      <section className="receipt-overview" aria-labelledby="receipt-title">
        <div className="overview-heading">
          <div>
            <span className="eyebrow">TRANSACTION RECEIPT</span>
            <h2 id="receipt-title">Follow the money. Keep the evidence.</h2>
          </div>
          <button className="button secondary" type="button" onClick={onExport}>
            Export JSON
          </button>
        </div>
        <a
          className="transaction-hash"
          href={`${ARC_EXPLORER_URL}/tx/${result.transactionHash}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {result.transactionHash}
          <span>View on Arc explorer</span>
        </a>
        {result.blockNumber && (
          <p className="receipt-meta">
            Arc mainnet · Chain {result.chainId} · Block{" "}
            {BigInt(result.blockNumber).toLocaleString("en")}
          </p>
        )}
        <div className="metrics">
          <div>
            <span>Observed movements</span>
            <strong data-testid="movement-count">
              {isFinal ? result.movements.length : "—"}
            </strong>
            <small>One entry per system event</small>
          </div>
          <div>
            <span>Movement volume</span>
            <strong data-testid="movement-volume">
              {result.movementVolumeUsdc ?? "—"} <small>USDC</small>
            </strong>
            <small>Explicit movements; may include hops</small>
          </div>
          <div>
            <span>Outer transaction gas</span>
            <strong data-testid="gas-amount">
              {result.fee?.amountUsdc ?? "—"} <small>USDC</small>
            </strong>
            <small>Separate from movement volume</small>
          </div>
        </div>
        {result.coverage === "partial" && (
          <p className="alert warning" role="alert">
            Incomplete interpretation: the diagnostics below identify missing or
            inconsistent evidence. The observed total is not a complete
            accounting result.
          </p>
        )}
        {!isFinal && (
          <p className="alert warning" role="status">
            {result.status === "pending"
              ? "The transaction is known, but no receipt is available yet. No payment result is inferred."
              : result.status === "not-found"
                ? "This endpoint returned neither a transaction nor a receipt. This does not prove the transaction never existed."
                : "A mined transaction was returned, but its receipt is unavailable. Try again; no movements or fees are inferred."}
          </p>
        )}
        {result.outerSender && (
          <div className="outer-sender">
            <span>Outer transaction sender</span>
            <Address value={result.outerSender} />
            <small>
              Movement senders below can differ. Application-level fee
              reimbursements are outside this receipt view.
            </small>
          </div>
        )}
      </section>
      <div className="analysis-grid">
        <section
          className="panel movements-panel"
          aria-labelledby="movements-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">NORMALIZED USDC</span>
              <h2 id="movements-title">Actual movements</h2>
            </div>
            <span className="pill">{result.movements.length} events</span>
          </div>
          {result.movements.length === 0 ? (
            <p className="empty-state">
              {result.status === "reverted"
                ? "No settled movements. The transaction reverted."
                : isFinal
                  ? "No valid USDC system movements were observed in this receipt."
                  : "No confirmed receipt to analyze."}
            </p>
          ) : (
            <ol className="movement-list">
              {result.movements.map((movement, index) => (
                <li key={movement.eventId}>
                  <div className="movement-header">
                    <span className="movement-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>
                      {movement.amountUsdc} <small>USDC</small>
                    </strong>
                    <span className="pill">{movement.kind}</span>
                  </div>
                  <dl className="movement-addresses">
                    <div>
                      <dt>
                        {movement.kind === "mint" ? "Mint source" : "From"}
                      </dt>
                      <dd>
                        <Address value={movement.from} />
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {movement.kind === "burn" ? "Burn destination" : "To"}
                      </dt>
                      <dd>
                        <Address value={movement.to} />
                      </dd>
                    </div>
                  </dl>
                  <div className="evidence-chips">
                    {movement.evidence.map((evidence) => (
                      <a
                        key={evidence.eventId}
                        href={`#log-${evidence.logIndex}`}
                        onClick={() => openEvidence(evidence.logIndex)}
                      >
                        {evidence.decimals === 18 ? "System" : "ERC-20"} · log #
                        {evidence.logIndex} · {evidence.decimals} decimals
                      </a>
                    ))}
                  </div>
                  <details className="atomic-detail">
                    <summary>Exact atomic amount & event identity</summary>
                    <code>{movement.amountAtomic18} (18 decimals)</code>
                    <code>{movement.eventId}</code>
                  </details>
                </li>
              ))}
            </ol>
          )}
        </section>
        <aside
          className="diagnostics panel"
          aria-labelledby="diagnostics-title"
        >
          <span className="eyebrow">INTERPRETATION</span>
          <h2 id="diagnostics-title">What to check</h2>
          {result.diagnostics.length ? (
            result.diagnostics.map((diagnostic, index) => (
              <div
                className={`diagnostic ${diagnostic.severity}`}
                key={`${diagnostic.code}-${index}`}
              >
                <span>{diagnostic.code.replaceAll("_", " ")}</span>
                <p>{diagnostic.message}</p>
                {diagnostic.logIndices.length > 0 && (
                  <small>
                    Logs{" "}
                    {diagnostic.logIndices
                      .map((index) => `#${index}`)
                      .join(", ")}
                  </small>
                )}
              </div>
            ))
          ) : (
            <p>No additional diagnostics for the available evidence.</p>
          )}
          <div className="scope-note">
            <strong>Scope of this result</strong>
            <p>
              Explicit USDC movements and outer gas only. Not a wallet balance,
              financial audit, or complete account-abstraction fee attribution.
            </p>
            <a
              href="https://docs.arc.io/arc/references/usdc-system-events"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the event rules
            </a>
          </div>
        </aside>
      </div>
      <TeachingComparison result={result} />
      {result.addressFlows.length > 0 && (
        <section className="panel" aria-labelledby="flows-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">TRANSACTION-LOCAL TOTALS</span>
              <h2 id="flows-title">Address flows</h2>
            </div>
          </div>
          <p className="section-description">
            Movements in this receipt only. These are not account balances. Gas
            is excluded.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Address</th>
                  <th scope="col">Incoming USDC</th>
                  <th scope="col">Outgoing USDC</th>
                  <th scope="col">Net USDC</th>
                </tr>
              </thead>
              <tbody>
                {result.addressFlows.map((flow) => (
                  <tr key={flow.address}>
                    <th scope="row">
                      <Address value={flow.address} />
                    </th>
                    <td>{flow.incomingUsdc}</td>
                    <td>{flow.outgoingUsdc}</td>
                    <td>{flow.netUsdc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="panel raw-logs" aria-labelledby="raw-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ORIGINAL EVENT EVIDENCE</span>
            <h2 id="raw-title">Raw logs</h2>
          </div>
          <span className="pill">{result.rawLogs.length} logs</span>
        </div>
        <p className="section-description">
          Emitter addresses determine the stream. Other contract events stay
          visible, but are excluded from USDC amounts.
        </p>
        {result.rawLogs.map((log) => (
          <details
            key={log.eventId}
            id={`log-${log.logIndex}`}
            className="raw-log"
          >
            <summary>
              <span>Log #{log.logIndex}</span>
              <span className={`stream ${log.stream}`}>
                {log.stream === "system"
                  ? "System · 18 decimals"
                  : log.stream === "erc20"
                    ? "ERC-20 · 6 decimals"
                    : "Other event · excluded"}
              </span>
              <strong>
                {log.transfer
                  ? `${log.transfer.amountUsdc} USDC`
                  : "Not counted as USDC"}
              </strong>
            </summary>
            <div className="raw-log-body">
              <dl>
                <div>
                  <dt>Emitter</dt>
                  <dd>
                    <Address value={log.emitter} />
                  </dd>
                </div>
                {log.transfer && (
                  <>
                    <div>
                      <dt>Raw amount</dt>
                      <dd>
                        <code>{log.transfer.amountRaw}</code>
                        <span> · {log.transfer.decimals} decimals</span>
                      </dd>
                    </div>
                    <div>
                      <dt>From</dt>
                      <dd>
                        <Address value={log.transfer.from} />
                      </dd>
                    </div>
                    <div>
                      <dt>To</dt>
                      <dd>
                        <Address value={log.transfer.to} />
                      </dd>
                    </div>
                  </>
                )}
              </dl>
              <pre>
                {JSON.stringify(
                  { data: log.data, topics: log.topics, eventId: log.eventId },
                  null,
                  2,
                )}
              </pre>
            </div>
          </details>
        ))}
        <details className="raw-envelope">
          <summary>Full source transaction and receipt</summary>
          <pre>{JSON.stringify(input, null, 2)}</pre>
        </details>
      </section>
      <section
        className="panel integration"
        aria-labelledby="integration-title"
      >
        <div>
          <span className="eyebrow">REUSE THE SAME PARSER</span>
          <h2 id="integration-title">Bring this check into your app.</h2>
          <p>
            Data retrieval and deterministic parsing are separate. Results use
            exact decimal strings and include event identities, sources and
            diagnostics.
          </p>
          {SOURCE_URL && (
            <a
              href={`${SOURCE_URL}/tree/main/examples/receipt-check`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open the integration example
            </a>
          )}
        </div>
        <pre>{`import { analyzeReceipt } from '@receiptlab/core';\nimport { readArcReceipt } from '@receiptlab/core/rpc';\n\nconst input = await readArcReceipt(\n  '${result.transactionHash}'\n);\nconst result = analyzeReceipt(input);\nconsole.log(result.movements);`}</pre>
      </section>
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState<string | null>(samples[0].id);
  const [query, setQuery] = useState<string>(
    samples[0].fixture.transactionHash,
  );
  const [input, setInput] = useState<unknown>(samples[0].fixture);
  const [result, setResult] = useState<ReceiptAnalysis | null>(() =>
    analyzeReceipt(samples[0].fixture),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const operation = useRef(0);
  const abort = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      abort.current?.abort();
    },
    [],
  );

  function chooseSample(sample: (typeof samples)[number]) {
    operation.current++;
    abort.current?.abort();
    setBusy(false);
    setError(null);
    setNotice("");
    setSelected(sample.id);
    setQuery(sample.fixture.transactionHash);
    setInput(sample.fixture);
    setResult(analyzeReceipt(sample.fixture));
  }
  async function inspect(event: FormEvent) {
    event.preventDefault();
    const id = ++operation.current;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setError(null);
    setNotice("");
    setSelected(null);
    setResult(null);
    setInput(null);
    setBusy(true);
    try {
      const envelope = await readArcReceipt(query.trim(), {
        signal: controller.signal,
      });
      const analysis = analyzeReceipt(envelope);
      if (id === operation.current) {
        setInput(envelope);
        setResult(analysis);
      }
    } catch (error) {
      if (id === operation.current && !controller.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "The mainnet lookup failed. No result was inferred.",
        );
    } finally {
      if (id === operation.current) setBusy(false);
    }
  }
  function exportJson() {
    if (!result) return;
    const blob = new Blob(
      [JSON.stringify({ analysis: result, input }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `arc-receiptlab-${result.transactionHash.slice(2, 14)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Exported the analysis and raw source evidence.");
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to receipt inspection
      </a>
      <header className="site-header">
        <div className="header-content">
          <a className="brand" href="/">
            <img src="/favicon.svg" alt="" width="32" height="32" />
            <span>
              Arc <strong>ReceiptLab</strong>
            </span>
          </a>
          <nav aria-label="Project">
            <span className="network">Arc mainnet · 5042</span>
            {SOURCE_URL && (
              <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
                Source code
              </a>
            )}
            <a
              href="https://docs.arc.io/arc/references/usdc-system-events"
              target="_blank"
              rel="noopener noreferrer"
            >
              Arc event rules
            </a>
          </nav>
        </div>
      </header>
      <main id="main">
        <div className="intro">
          <div>
            <span className="eyebrow">USDC RECEIPT DEBUGGER</span>
            <h1>Know what actually moved.</h1>
            <p>
              Inspect a transaction, compare its event streams, and keep USDC
              movements separate from gas.
            </p>
          </div>
          <span className="read-only">Read-only. No wallet needed.</span>
        </div>
        <section className="query-panel" aria-labelledby="query-label">
          <form
            onSubmit={(event) => {
              void inspect(event);
            }}
          >
            <label id="query-label" htmlFor="transaction-hash">
              Arc mainnet transaction hash
            </label>
            <div className="query-controls">
              <input
                id="transaction-hash"
                name="transactionHash"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="0x…"
                aria-describedby="query-help"
              />
              <button className="button primary" type="submit" disabled={busy}>
                {busy ? "Reading mainnet…" : "Read from mainnet"}
              </button>
            </div>
            <p id="query-help">
              Reads existing public data. No transactions are sent.
            </p>
          </form>
          <p className="sample-guide">Explore a recorded mainnet receipt</p>
          <div className="samples" aria-label="Recorded mainnet examples">
            {samples.map((sample) => (
              <button
                type="button"
                key={sample.id}
                className={`sample ${selected === sample.id ? "selected" : ""}`}
                aria-pressed={selected === sample.id}
                onClick={() => chooseSample(sample)}
              >
                <span className="sample-number">{sample.number}</span>
                <span>
                  <strong>{sample.title}</strong>
                  <span>{sample.description}</span>
                  <small>Recorded mainnet sample</small>
                </span>
              </button>
            ))}
          </div>
        </section>
        <div className="notice" role="status" aria-live="polite">
          {notice}
        </div>
        {busy && (
          <div className="loading panel" role="status">
            <span className="spinner" aria-hidden="true" />
            <div>
              <strong>Reading Arc mainnet</strong>
              <p>
                Checking the network, transaction and receipt. No result is
                inferred while the lookup is in progress.
              </p>
            </div>
          </div>
        )}
        {error && (
          <section className="alert error" role="alert">
            <strong>Lookup could not be completed</strong>
            <p>{error}</p>
            <p>
              Try again or select a recorded example above. Recorded examples
              are always labelled separately from live responses.
            </p>
          </section>
        )}
        {result && (
          <Results result={result} input={input} onExport={exportJson} />
        )}
      </main>
      <footer>
        <span>Arc ReceiptLab · An independent developer tool</span>
        <span>
          RPC data is source-labelled, not independently cryptographically
          verified.
        </span>
      </footer>
    </>
  );
}
