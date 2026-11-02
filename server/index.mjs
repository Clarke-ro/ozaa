import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

const secret = process.env.PAYSTACK_SECRET_KEY;
if (!secret || !secret.startsWith('sk_test_')) {
  console.error('Set PAYSTACK_SECRET_KEY to a Paystack test key (sk_test_...). Refusing to start.');
  process.exit(1);
}

const payments = new Map();

function signatureOk(raw, header) {
  if (!header) return false;
  const digest = createHmac('sha512', secret).update(raw).digest('hex');
  const left = Buffer.from(digest);
  const right = Buffer.from(header);
  return left.length === right.length && timingSafeEqual(left, right);
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(body ? JSON.stringify(body) : '');
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  const body = raw ? JSON.parse(raw) : {};

  if (req.method === 'POST' && url.pathname === '/v1/webhooks/paystack') {
    if (!signatureOk(raw, req.headers['x-paystack-signature'])) return send(res, 401, { title: 'Bad signature', status: 401, code: 'bad_signature' });
    const data = body.data ?? {};
    const payment = payments.get(data.reference);
    if (body.event === 'charge.success' && payment && data.amount === payment.amountPesewas && data.currency === 'GHS') {
      payment.status = 'succeeded';
    }
    return send(res, 200, { received: true });
  }

  const match = url.pathname.match(/^\/v1\/payments\/([^/]+)(\/verify)?$/);
  if (req.method === 'GET' && match) return send(res, payments.get(match[1]) ? 200 : 404, payments.get(match[1]));
  if (req.method === 'POST' && match?.[2]) return send(res, payments.get(match[1]) ? 200 : 404, payments.get(match[1]));

  if (req.method === 'POST' && url.pathname === '/v1/payments') {
    const reference = `pay_${payments.size + 1}`;
    const payment = {
      id: reference,
      reference,
      orderId: body.orderId ?? 'ord_unknown',
      method: body.method ?? 'momo',
      amountPesewas: body.amountPesewas,
      currency: 'GHS',
      status: body.method === 'card' ? 'open_url' : 'pay_offline',
      displayText: 'Check your phone and enter your PIN to approve.',
      testMode: true,
      createdAt: new Date().toISOString(),
    };
    payments.set(reference, payment);
    return send(res, 201, payment);
  }

  send(res, 404, { title: 'Not found', status: 404, code: 'not_found' });
});

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => {
  console.log(`Ozaa payments sandbox on ${port}. Test keys only.`);
});
