import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import { parse } from 'yaml';

/**
 * For tests: checks a response against api/openapi.yaml, the fixed contract. Every server test
 * goes through `expectContract`; coverage.test.ts fails when an operation has no such check.
 */
type Doc = { paths: Record<string, Record<string, Op>>; components: { responses: Record<string, Res> } };
type Op = { operationId?: string; responses?: Record<string, Res> };
type Res = { $ref?: string; content?: Record<string, { schema?: unknown }> };

const doc = parse(readFileSync(new URL('../../../api/openapi.yaml', import.meta.url), 'utf8')) as Doc;
const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => void;
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(doc as object, 'openapi');

const pointer = (...parts: string[]) => parts.map((p) => p.replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
const ops = new Map<string, { path: string; method: string; op: Op }>();
for (const [path, methods] of Object.entries(doc.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    if (op?.operationId) ops.set(op.operationId, { path, method, op });
  }
}

/** Fails (throws) unless `body` is what the contract says `operationId` answers with `status`. */
export function expectContract(operationId: string, status: number, body: unknown): void {
  const found = ops.get(operationId);
  if (!found) throw new Error(`No operation ${operationId} in the contract`);
  const responses = found.op.responses ?? {};
  const res = responses[String(status)];
  if (!res) throw new Error(`${operationId} doesn't answer ${status} in the contract`);
  let base = ['paths', found.path, found.method, 'responses', String(status)];
  let target: Res = res;
  if (res.$ref) {
    const name = res.$ref.split('/').pop() ?? '';
    base = ['components', 'responses', name];
    target = doc.components.responses[name] ?? {};
  }
  const type = Object.keys(target.content ?? {})[0];
  if (!type) {
    if (body !== null && body !== undefined && body !== '') throw new Error(`${operationId} ${status} has no body in the contract`);
    return;
  }
  const validate = ajv.compile({ $ref: `openapi#/${pointer(...base, 'content', type, 'schema')}` });
  if (!validate(body)) {
    throw new Error(`${operationId} ${status} breaks the contract:\n${ajv.errorsText(validate.errors, { separator: '\n' })}`);
  }
}

/** Every operationId in the contract. */
export function operationIds(): string[] {
  return [...ops.keys()];
}
