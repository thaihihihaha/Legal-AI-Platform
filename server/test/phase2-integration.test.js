import test from 'node:test';
import assert from 'node:assert';
import { randomUUID } from 'crypto';

const API_URL = 'http://localhost:8080';
let authToken = null;
let testUserId = null;
let testCompanyId = null;

/**
 * PHASE 2 Integration Tests
 * Test AI-powered draft generation + research integration + validation
 */

test('P2.1: Auth setup - Create test user and get token', async () => {
  const testEmail = `phase2_${randomUUID().slice(0, 8)}@test.com`;
  
  // Step 1: Register
  const registerResponse = await fetch(`${API_URL}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Phase2Test!@#',
      fullName: 'PHASE 2 Test User',
    }),
  });

  assert.equal(registerResponse.status, 200);
  const registerData = await registerResponse.json();
  testUserId = registerData.userId;
  testCompanyId = registerData.companyId;

  // Step 2: Login to get token
  const loginResponse = await fetch(`${API_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Phase2Test!@#',
    }),
  });

  assert.equal(loginResponse.status, 200);
  const loginData = await loginResponse.json();
  authToken = loginData.token;

  assert.ok(authToken, 'Should have access token');
  assert.ok(testUserId, 'Should have user ID');
  assert.ok(testCompanyId, 'Should have company ID');
  
  console.log('✅ P2.1: Auth setup complete');
  console.log(`   - User: ${testUserId}`);
  console.log(`   - Company: ${testCompanyId}`);
});

/**
 * PHASE 2: AI Draft Generation
 */

test('P2.2: Create draft with AI generation + research integration', async () => {
  const response = await fetch(`${API_URL}/v1/drafts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      templateId: 'labor_contract_basic',
      variables: {
        company_name: 'Công ty ABC Corp',
        employee_name: 'Nguyễn Văn Anh',
        position: 'Kỹ sư Phần mềm Senior',
        salary: '30000000',
        work_location: 'Hà Nội',
        start_date: '01/05/2024',
      },
      withResearch: true,
    }),
  });

  assert.equal(response.status, 201, `Expected 201, got ${response.status}`);
  const data = await response.json();

  assert.ok(data.success, 'Should succeed');
  assert.ok(data.data.id, 'Should have draft ID');
  assert.ok(data.data.content, 'Should have content');
  assert.ok(data.data.content.length > 200, 'Content should be substantial');
  
  // Check for HTML elements (from convertTextToHtml)
  assert.ok(
    data.data.content.includes('<') && data.data.content.includes('>'),
    'Content should be HTML formatted'
  );

  // Check research data
  assert.ok(data.data.research_data, 'Should have research data');
  console.log('✅ P2.2: AI draft generation successful');
  console.log(`   - Draft ID: ${data.data.id}`);
  console.log(`   - Content length: ${data.data.content.length} chars`);
  console.log(`   - Research sources: ${data.data.research_data.sources?.length || 0}`);

  // Store for next tests
  global.testDraftId = data.data.id;
});

/**
 * PHASE 2: Validation with AI-generated content
 */

test('P2.3: Validate AI-generated draft content', async () => {
  const draftId = global.testDraftId;
  assert.ok(draftId, 'Should have draft ID from previous test');

  const response = await fetch(`${API_URL}/v1/drafts/${draftId}/validate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  assert.equal(response.status, 200);
  const data = await response.json();

  assert.ok(data.success, 'Should succeed');
  assert.ok(data.data.valid !== undefined, 'Should have validation result');
  
  // Log validation details
  console.log('✅ P2.3: Validation complete');
  if (data.data.errors && data.data.errors.length > 0) {
    console.log(`   - Errors: ${data.data.errors.join(', ')}`);
  }
  if (data.data.warnings && data.data.warnings.length > 0) {
    console.log(`   - Warnings: ${data.data.warnings.join(', ')}`);
  }
  if (data.data.suggestions && data.data.suggestions.length > 0) {
    console.log(`   - Suggestions: ${data.data.suggestions.join(', ')}`);
  }
});

/**
 * PHASE 2: Service Contract Generation
 */

test('P2.4: Generate service contract with AI', async () => {
  const response = await fetch(`${API_URL}/v1/drafts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      templateId: 'service_contract_basic',
      variables: {
        client_name: 'Công ty Khách hàng XYZ',
        vendor_name: 'Công ty Dịch vụ ABC',
        service_scope: 'Thiết kế website, phát triển ứng dụng mobile, bảo trì hệ thống',
        fee: '100000000',
        payment_terms: '50% trước, 50% sau hoàn thành',
        effective_date: '15/05/2024',
      },
      withResearch: true,
    }),
  });

  assert.equal(response.status, 201);
  const data = await response.json();

  assert.ok(data.success);
  assert.ok(data.data.content);
  assert.ok(data.data.content.includes('http') || data.data.content.includes('<'), 'Should have formatted content');
  
  console.log('✅ P2.4: Service contract generated successfully');
  console.log(`   - Draft ID: ${data.data.id}`);
  console.log(`   - Content length: ${data.data.content.length} chars`);

  global.serviceDraftId = data.data.id;
});

/**
 * PHASE 2: Official Notice Generation
 */

test('P2.5: Generate official notice with AI', async () => {
  const response = await fetch(`${API_URL}/v1/drafts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      templateId: 'official_notice',
      variables: {
        issuer_name: 'Phòng Nhân sự - Công ty ABC',
        notice_subject: 'Thông báo lịch nghỉ Tết Nguyên Đán 2024',
        notice_body: 'Công ty thông báo lịch nghỉ Tết Nguyên Đán 2024 từ ngày 08/02 đến ngày 17/02. Nhân viên vui lòng sắp xếp công việc trước kỳ nghỉ. Trở lại làm việc vào ngày 19/02/2024.',
        issue_date: '01/02/2024',
      },
      withResearch: false,
    }),
  });

  assert.equal(response.status, 201);
  const data = await response.json();

  assert.ok(data.success);
  assert.ok(data.data.content);
  
  console.log('✅ P2.5: Official notice generated successfully');
});

/**
 * PHASE 2: Draft Update + Version Control
 */

test('P2.6: Update draft and verify versioning', async () => {
  const draftId = global.testDraftId;
  
  const updatedContent = `
    <h2>Hợp Đồng Lao Động - Phiên Bản Sửa Đổi</h2>
    <p>Các bên liên quan đã thỏa thuận bổ sung các điều khoản sau:</p>
    <p><strong>Điều 1: Phụ cấp và thưởng thêm</strong></p>
    <p>Công ty cam kết cấp phụ cấp khu vực và thưởng hiệu suất theo quy định nội bộ.</p>
  `;

  const response = await fetch(`${API_URL}/v1/drafts/${draftId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: updatedContent,
      changeSummary: 'Added bonus and allowance clauses',
    }),
  });

  assert.equal(response.status, 200);
  const data = await response.json();

  assert.equal(data.data.version, 2, 'Version should increment to 2');
  console.log('✅ P2.6: Draft updated with version control');
  console.log(`   - New version: ${data.data.version}`);
});

/**
 * PHASE 2: Export to DOCX and verify
 */

test('P2.7: Export AI-generated draft to DOCX', async () => {
  const draftId = global.testDraftId;

  const response = await fetch(`${API_URL}/v1/drafts/${draftId}/export?format=docx`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  assert.equal(response.status, 200);
  const buffer = await response.arrayBuffer();

  assert.ok(buffer.byteLength > 500, 'DOCX should have reasonable size');
  console.log('✅ P2.7: DOCX export successful');
  console.log(`   - File size: ${buffer.byteLength} bytes`);
});

/**
 * PHASE 2: Export to PDF and verify
 */

test('P2.8: Export AI-generated draft to PDF', async () => {
  const draftId = global.testDraftId;

  const response = await fetch(`${API_URL}/v1/drafts/${draftId}/export?format=pdf`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  assert.equal(response.status, 200);
  const buffer = await response.arrayBuffer();

  assert.ok(buffer.byteLength > 500, 'PDF should have reasonable size');
  console.log('✅ P2.8: PDF export successful');
  console.log(`   - File size: ${buffer.byteLength} bytes`);
});

/**
 * PHASE 2: Get version history
 */

test('P2.9: Get draft version history', async () => {
  const draftId = global.testDraftId;

  const response = await fetch(`${API_URL}/v1/drafts/${draftId}/versions`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  assert.equal(response.status, 200);
  const data = await response.json();

  assert.ok(Array.isArray(data.data));
  assert.ok(data.data.length >= 2, 'Should have at least 2 versions');
  console.log('✅ P2.9: Version history retrieved');
  console.log(`   - Total versions: ${data.data.length}`);
  data.data.forEach(v => {
    console.log(`     - Version ${v.version}: ${v.summary}`);
  });
});

/**
 * PHASE 2: List all user drafts
 */

test('P2.10: List all user drafts with filters', async () => {
  const response = await fetch(`${API_URL}/v1/drafts`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  assert.equal(response.status, 200);
  const data = await response.json();

  assert.ok(Array.isArray(data.data));
  assert.ok(data.data.length >= 3, 'Should have created at least 3 drafts');
  console.log('✅ P2.10: Drafts list retrieved');
  console.log(`   - Total drafts: ${data.data.length}`);
  data.data.slice(0, 3).forEach(d => {
    console.log(`     - ${d.title} (v${d.version}) - ${d.status}`);
  });
});

/**
 * PHASE 2: Workflow - Draft → Review → Approve
 */

test('P2.11: Full workflow - change draft status', async () => {
  const draftId = global.testDraftId;

  // Change to review
  let response = await fetch(`${API_URL}/v1/drafts/${draftId}/status`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'review' }),
  });
  assert.equal(response.status, 200);
  let data = await response.json();
  assert.equal(data.data.status, 'review');

  // Change to approved
  response = await fetch(`${API_URL}/v1/drafts/${draftId}/status`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'approved' }),
  });
  assert.equal(response.status, 200);
  data = await response.json();
  assert.equal(data.data.status, 'approved');

  console.log('✅ P2.11: Full workflow completed');
  console.log(`   - Status changes: draft → review → approved`);
});

/**
 * PHASE 2: Error handling
 */

test('P2.12: Error handling - invalid template', async () => {
  const response = await fetch(`${API_URL}/v1/drafts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      templateId: 'nonexistent_template',
      variables: {},
    }),
  });

  assert.equal(response.status, 400);
  console.log('✅ P2.12: Error handling for invalid template works');
});

/**
 * PHASE 2: Error handling - missing required fields
 */

test('P2.13: Error handling - missing required fields', async () => {
  const response = await fetch(`${API_URL}/v1/drafts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      templateId: 'labor_contract_basic',
      variables: {
        company_name: 'Test Company',
        // Missing other required fields
      },
    }),
  });

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.ok(data.error);
  console.log('✅ P2.13: Validation for required fields works');
});

/**
 * PHASE 2: Cleanup - Delete draft
 */

test('P2.14: Delete draft', async () => {
  const draftId = global.serviceDraftId;

  const response = await fetch(`${API_URL}/v1/drafts/${draftId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  assert.equal(response.status, 200);
  console.log('✅ P2.14: Draft deleted successfully');
});

console.log('\n📋 PHASE 2 Test Suite Summary:');
console.log('✅ P2 Tests: AI Generation + Research Integration Complete!');
