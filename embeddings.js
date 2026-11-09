// embeddings.js
// Turns text into the same kind of vector already stored in plot_embedding_hf:
// sentence-transformers/all-MiniLM-L6-v2 (384 dimensions), through the Hugging
// Face Inference API. Needs HF_TOKEN in .env (and in Render's Environment
// settings once deployed). No npm package needed — uses Node's built-in fetch.
//
// HF_TOKEN is read when a function runs (not when this file loads), so it works
// no matter when dotenv.config() gets called.

const EMBEDDING_URL =
  "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction";

export const EMBEDDING_DIMENSIONS = 384;

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 20000;
const RETRY_DELAY_MS = 2000;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function embeddingsEnabled() {
  return Boolean(process.env.HF_TOKEN);
}

// One call to the API. Throws an Error with .status set for HTTP failures.
async function requestEmbedding(text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const resp = await fetch(EMBEDDING_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      // truncate: sentence-transformers cuts input at 256 word pieces; without
      // this the API can reject long plots instead.
      body: JSON.stringify({ inputs: text, normalize: true, truncate: true }),
      signal: controller.signal
    });

    if (!resp.ok) {
      const detail = (await resp.text().catch(() => "")).slice(0, 200);
      const err = new Error(`Hugging Face returned ${resp.status}: ${detail}`);
      err.status = resp.status;
      throw err;
    }

    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

// The API can answer with a flat vector, a one-row list of vectors, or (for
// some backends) one vector per token. Reduce any of those to one vector.
function toSentenceVector(output) {
  let v = output;

  // Unwrap batch-of-token-lists ([[[...]]]) down to a list of vectors
  while (Array.isArray(v) && Array.isArray(v[0]) && Array.isArray(v[0][0])) v = v[0];

  if (!Array.isArray(v) || v.length === 0) {
    throw new Error("Unexpected response shape from Hugging Face");
  }
  if (typeof v[0] === "number") return v; // flat: already one sentence vector
  if (v.length === 1) return v[0];        // [[...]]: one vector for the one input

  // One vector per token — average them
  const sum = new Array(v[0].length).fill(0);
  for (const row of v) {
    for (let i = 0; i < sum.length; i++) sum[i] += row[i];
  }
  return sum.map(x => x / v.length);
}

// The local model (sentence-transformers' encode()) returns unit-length
// vectors, so make sure these are too — a no-op if the API already did.
function toUnitVector(vec) {
  const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
  return norm > 0 ? vec.map(x => x / norm) : vec;
}

// Returns a 384-number array for `text`. Retries timeouts, rate limits and 5xx
// errors; throws if the token is missing, the call keeps failing, or the
// result isn't the expected size.
export async function embedText(text) {
  if (!embeddingsEnabled()) throw new Error("HF_TOKEN is not set");
  if (typeof text !== "string" || !text.trim()) throw new Error("No text to embed");

  let output;
  for (let attempt = 1; ; attempt++) {
    try {
      output = await requestEmbedding(text);
      break;
    } catch (err) {
      const retryable = err.name === "AbortError" || !err.status || err.status === 429 || err.status >= 500;
      if (!retryable || attempt >= MAX_ATTEMPTS) throw err;
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  const vector = toSentenceVector(output);
  if (vector.length !== EMBEDDING_DIMENSIONS || !vector.every(Number.isFinite)) {
    throw new Error(`Expected ${EMBEDDING_DIMENSIONS} numbers but got ${vector.length}`);
  }

  return toUnitVector(vector);
}