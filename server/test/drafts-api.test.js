import test from 'node:test';
import assert from 'node:assert';
import { randomUUID } from 'crypto';

const API_URL = 'http://localhost:8080';
let authToken = null;
let testUserId = null;
let testCompanyId = null;
let createdDraftId = null;

// Test credentials
const testEmail = `test_draft_${randomUUID().slice(0, 8)}@test.com`;
const testPassword = 'Test123!@#';

/**
 * STEP 1: Create test user
 */
test('D1.1: Create test user for draft tests', async () => {
  const response = await fetch(`${API_URL}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: 'Draft Test User',
    }),
  });

  assert.equal(response.status, 200, `Expected 200, got ${response.status}`);
  const data = await response.json();
  
  authToken = data.data.access_token;
  testUserId = data.data.user_id;
  testCompanyId = data.data.company_id;

  assert.ok(authToken, 'Should return access token');
  assert.ok(testUserId, 'Should return user ID');
  assert.ok(testCompanyId, 'Should return company ID');
});

/**
 * STEP 2: Create draft from template
 */
test('D2.1: Create new draft from template', async () => {
  const response = await fetch(`${API_URL}/v1/drafts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      templateId: 'labor_contract',
      variables: {
        company_name: 'Test Company',
        employee_name: 'Nguyễn Văn A',
        position: 'Kỹ sư Phần mềm',
        salary: '25000000',
        work_location: 'Hà Nội',
        start_date: '01/01/2024',
      },
      withResearch: true,
    }),
  });

  assert.equal(response.status, 201, `Expected 201, got ${response.status}`);
  const data = await response.json();

  assert.equal(data.success, true, 'Should return success: true');
  assert.ok(data.data.id, 'Should return draft ID');
  assert.ok(data.data.content, 'Should return draft content');

  createdDraftId = data.data.id;
});

/**
 * STEP 3: Fetch drafts list
 */
test('D3.1: Get drafts list', async () => {
  const response = await fetch(`${API_URL}/v1/drafts`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  assert.equal(response.status, 200, `Expected 200, got ${response.status}`);
  const data = await response.json();

  assert.equal(data.success, true, 'Should return success: true');
  assert.ok(Array.isArray(data.data), 'Should return array of drafts');
  assert.ok(data.data.length > 0, 'Should have at least one draft');
});

/**
 * STEP 4: Get draft by ID
 */
test('D4.1: Get draft detail by ID', async () => {
  const response = await fetch(`${API_URL}/v1/drafts/${createdDraftId}`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  assert.equal(response.status, 200, `Expected 200, got ${response.status}`);
  const data = await response.json();

  assert.equal(data.success, true, 'Should return success: true');
  assert.equal(data.data.id, createdDraftId, 'Should return correct draft ID');
  assert.ok(data.data.content, 'Should have draft content');
  assert.ok(data.data.title, 'Should have draft title');
  assert.ok(data.data.version, 'Should have version info');
});

/**
 * STEP 5: Update/Save draft
 */
test('D5.1: Save draft with new content', async () => {
  const newContent = '<h2>Hợp đồng Lao Động Sửa Đổi</h2><p>Nội dung đã được chỉnh sửa...</p>';

  const response = await fetch(`${API_URL}/v1/drafts/${createdDraftId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: newContent,
      changeSummary: 'Updated section 3',
    }),
  });

  assert.equal(response.status, 200, `Expected 200, got ${response.status}`);
  const data = await response.json();

  assert.equal(data.success, true, 'Should return success: true');
  assert.equal(data.data.version, 2, 'Should increment version to 2');
});

/**
 * STEP 6: Get draft versions
 */
test('D6.1: Get draft version history', async () => {
  const response = await fetch(`${API_URL}/v1/drafts/${createdDraftId}/versions`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  assert.equal(response.status, 200, `Expected 200, got ${response.status}`);
  const data = await response.json();

  assert.equal(data.success, true, 'Should return success: true');
  assert.ok(Array.isArray(data.data), 'Should return array of versions');
  assert.ok(data.data.length >= 2, 'Should have at least 2 versions');
});

/**
 * STEP 7: Validate draft
 */
test('D7.1: Validate draft content', async () => {
  const response = await fetch(`${API_URL}/v1/drafts/${createdDraftId}/validate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  assert.equal(response.status, 200, `Expected 200, got ${response.status}`);
  const data = await response.json();

  assert.equal(data.success, true, 'Should return success: true');
  assert.ok(data.data.valid !== undefined, 'Should return validation result');
});

/**
 * STEP 8: Update draft status
 */
test('D8.1: Update draft status to review', async () => {
  const response = await fetch(`${API_URL}/v1/drafts/${createdDraftId}/status`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'review' }),
  });

  assert.equal(response.status, 200, `Expected 200, got ${response.status}`);
  const data = await response.json();

  assert.equal(data.success, true, 'Should return success: true');
  assert.equal(data.data.status, 'review', 'Should update status to review');
});

/**
 * STEP 9: Export draft to DOCX
 */
test('D9.1: Export draft to DOCX', async () => {
  const response = await fetch(`${API_URL}/v1/drafts/${createdDraftId}/export?format=docx`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  assert.equal(response.status, 200, `Expected 200, got ${response.status}`);
  const buffer = await response.arrayBuffer();

  // DOCX files should have content
  assert.ok(buffer.byteLength > 100, 'DOCX file should have reasonable size');
});

/**
 * STEP 10: Export draft to PDF
 */
test('D10.1: Export draft to PDF', async () => {
  const response = await fetch(`${API_URL}/v1/drafts/${createdDraftId}/export?format=pdf`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  assert.equal(response.status, 200, `Expected 200, got ${response.status}`);
  const buffer = await response.arrayBuffer();

  // PDF files should have content
  assert.ok(buffer.byteLength > 100, 'PDF file should have reasonable size');
});

/**
 * STEP 11: Delete draft
 */
test('D11.1: Delete draft', async () => {
  const response = await fetch(`${API_URL}/v1/drafts/${createdDraftId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  assert.equal(response.status, 200, `Expected 200, got ${response.status}`);
  const data = await response.json();

  assert.equal(data.success, true, 'Should return success: true');
});

/**
 * STEP 12: Verify draft is deleted
 */
test('D12.1: Verify deleted draft returns 404', async () => {
  const response = await fetch(`${API_URL}/v1/drafts/${createdDraftId}`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  assert.equal(response.status, 404, 'Should return 404 for deleted draft');
});

/**
 * Error Handling Tests
 */

test('D13.1: Create draft without token should fail', async () => {
  const response = await fetch(`${API_URL}/v1/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      templateId: 'labor_contract',
      variables: {},
    }),
  });

  assert.equal(response.status, 401, 'Should return 401 without token');
});

test('D13.2: Create draft without templateId should fail', async () => {
  const response = await fetch(`${API_URL}/v1/drafts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ variables: {} }),
  });

  assert.equal(response.status, 400, 'Should return 400 without templateId');
});

test('D13.3: Get non-existent draft should fail', async () => {
  const response = await fetch(`${API_URL}/v1/drafts/nonexistent-id`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  assert.equal(response.status, 500, 'Should return error for non-existent draft');
});
