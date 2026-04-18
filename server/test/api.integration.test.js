import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import app from '../src/app.js';

let server;
let baseUrl;
let token;
let uploadedContractId;

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
};

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('health endpoint should return checks', async () => {
  const { response, data } = await requestJson('/v1/health');
  assert.equal(response.status, 200);
  assert.equal(data.status, 'ok');
  assert.ok(data.checks?.db);
  assert.ok(data.checks?.ai);
  assert.ok(data.checks?.pinecone);
});

test('contracts endpoint should require bearer token', async () => {
  const { response, data } = await requestJson('/v1/contracts');
  assert.equal(response.status, 401);
  assert.match(data.error || '', /Bearer token/i);
});

test('auth register/login and protected endpoints validation flow', async () => {
  const email = `phase6.${Date.now()}@example.com`;

  const register = await requestJson('/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: '12345678',
      fullName: 'Phase 6 Tester',
    }),
  });

  assert.equal(register.response.status, 200);
  assert.ok(register.data.userId);
  assert.ok(register.data.companyId);

  const login = await requestJson('/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: '12345678',
    }),
  });

  assert.equal(login.response.status, 200);
  assert.ok(login.data.token);
  token = login.data.token;

  const legalMissingQuestion = await requestJson('/v1/legal/ask', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  assert.equal(legalMissingQuestion.response.status, 400);

  const badUploadForm = new FormData();
  badUploadForm.append('file', new Blob(['bad-content'], { type: 'text/csv' }), 'bad.csv');

  const badUpload = await requestJson('/v1/contracts/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: badUploadForm,
  });

  assert.equal(badUpload.response.status, 400);

  const okUploadForm = new FormData();
  okUploadForm.append('file', new Blob(['Hop dong test phase 6'], { type: 'text/markdown' }), 'phase6.md');

  const okUpload = await requestJson('/v1/contracts/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: okUploadForm,
  });

  assert.equal(okUpload.response.status, 200);
  assert.ok(okUpload.data.contractId);
  uploadedContractId = okUpload.data.contractId;

  const listContracts = await requestJson('/v1/contracts', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(listContracts.response.status, 200);
  assert.ok(Array.isArray(listContracts.data.contracts));
  assert.ok(listContracts.data.contracts.some((item) => item.id === uploadedContractId));

  const reviewMissingText = await requestJson(`/v1/contracts/${uploadedContractId}/review`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  assert.equal(reviewMissingText.response.status, 400);

  const reviewMissingContract = await requestJson('/v1/contracts/00000000-0000-0000-0000-000000000000/review', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ contractText: 'Noi dung test' }),
  });

  assert.equal(reviewMissingContract.response.status, 404);

  const riskSummary = await requestJson('/v1/contracts/risk-summary', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(riskSummary.response.status, 200);
  assert.ok(riskSummary.data.summary);
  assert.ok(Array.isArray(riskSummary.data.contracts));

  const templatesList = await requestJson('/v1/templates', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(templatesList.response.status, 200);
  assert.ok(Array.isArray(templatesList.data.templates));
  assert.ok(templatesList.data.templates.length > 0);

  const templateGenerateInvalid = await requestJson('/v1/templates/labor_contract_basic/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ variables: {} }),
  });

  assert.equal(templateGenerateInvalid.response.status, 400);
  assert.equal(templateGenerateInvalid.data.validation?.valid, false);

  const templateGenerateOk = await requestJson('/v1/templates/labor_contract_basic/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variables: {
        company_name: 'Cong ty A',
        employee_name: 'Nguyen Van B',
        position: 'Chuyen vien phap che',
        salary: '25000000 VND',
        work_location: 'TPHCM',
        start_date: '2026-04-16',
      },
    }),
  });

  assert.equal(templateGenerateOk.response.status, 200);
  assert.equal(typeof templateGenerateOk.data.text, 'string');
  assert.ok(templateGenerateOk.data.text.includes('HOP DONG LAO DONG'));

  const templateExportPdf = await fetch(`${baseUrl}/v1/templates/labor_contract_basic/export`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: 'pdf',
      title: 'Test Export PDF',
      text: templateGenerateOk.data.text,
    }),
  });

  assert.equal(templateExportPdf.status, 200);
  assert.match(templateExportPdf.headers.get('content-type') || '', /application\/pdf/i);

  const createApiKey = await requestJson('/v1/settings/api-keys', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'integration-test-key',
      permissions: ['ask'],
      rate_limit: 10,
    }),
  });

  assert.equal(createApiKey.response.status, 201);
  assert.equal(typeof createApiKey.data.api_key?.plain_key, 'string');
  const plainApiKey = createApiKey.data.api_key?.plain_key;
  const apiKeyId = createApiKey.data.api_key?.id;

  const listApiKeys = await requestJson('/v1/settings/api-keys', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(listApiKeys.response.status, 200);
  assert.ok(Array.isArray(listApiKeys.data.api_keys));
  assert.ok(listApiKeys.data.api_keys.some((item) => item.id === apiKeyId));

  const usageDashboard = await requestJson('/v1/settings/usage?days=7', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(usageDashboard.response.status, 200);
  assert.ok(usageDashboard.data.summary);

  const integrationNoKey = await requestJson('/v1/integration/legal/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question: 'Co bao nhieu ngay nghi phep?' }),
  });

  assert.equal(integrationNoKey.response.status, 401);

  const integrationReviewForbidden = await requestJson(`/v1/integration/contracts/${uploadedContractId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': plainApiKey,
    },
    body: JSON.stringify({ contractText: 'Noi dung test integration' }),
  });

  assert.equal(integrationReviewForbidden.response.status, 403);

  const revokeApiKeyResp = await requestJson(`/v1/settings/api-keys/${apiKeyId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(revokeApiKeyResp.response.status, 200);
});
