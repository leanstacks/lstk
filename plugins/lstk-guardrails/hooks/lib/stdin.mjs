// Read and parse the hook input JSON. Node built-ins only.

export class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InputError';
  }
}

/**
 * Parse hook input text. Empty or whitespace-only input yields `{}`.
 * Throws InputError for malformed JSON or for JSON that is not an object.
 */
export function parseInput(text) {
  if (typeof text !== 'string' || text.trim() === '') return {};
  let value;
  try {
    value = JSON.parse(text);
  } catch (err) {
    throw new InputError(`malformed hook input JSON: ${err.message}`);
  }
  if (value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new InputError('hook input must be a JSON object');
  }
  return value;
}

/** Read a stream to the end and parse it. Defaults to process.stdin. */
export async function readInput(stream = process.stdin) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return parseInput(Buffer.concat(chunks).toString('utf8'));
}
