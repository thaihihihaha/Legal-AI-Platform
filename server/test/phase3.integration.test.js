/**
 * PHASE 3 Integration Tests - Core Functionality
 * Tests for PHASE 3.1-3.7 features using Node's built-in test runner
 */

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import app from '../src/app.js';

let server;
let baseUrl;
let authToken;
let testDraftId;
let testCompanyId;

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

  // Create test user
  const registerRes = await requestJson('/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `phase3test${Date.now()}@example.com`,
      password: 'TestPassword123!',
      full_name: 'Phase 3 Test User',
    }),
  });

  authToken = registerRes.data.data?.token;
  testCompanyId = registerRes.data.data?.user?.company_id;

  // Create test draft
  const draftRes = await requestJson('/v1/drafts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      title: 'Test Contract',
      content: 'Test content',
      category: 'nda',
    }),
  });

  testDraftId = draftRes.data.data?.id;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe('PHASE 3: Core API Tests', () => {
  it('should respond to health check', async () => {
    const { response, data } = await requestJson('/v1/health');
    assert.equal(response.status, 200);
    assert.ok(data.status);
  });

  it('should create review session', async () => {
    const { response, data } = await requestJson('/v1/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        draftId: testDraftId,
        reviewType: 'standard',
      }),
    });
    assert.equal(response.status, 200);
    assert.ok(data.success);
  });

  it('should return 401 without auth', async () => {
    const { response } = await requestJson('/v1/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId: 'test' }),
    });
    assert.equal(response.status, 401);
  });
});
