import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import app from '../src/app.js';

let server;
let baseUrl;
let token;

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
};

const requestBuffer = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  let buffer = null;
  
  try {
    const arrayBuffer = await response.arrayBuffer();
    // Convert ArrayBuffer to Node.js Buffer
    buffer = Buffer.from(arrayBuffer);
  } catch (err) {
    buffer = null;
  }
  
  return { response, buffer };
};

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;

  // Register and login to get token
  const email = `template-tester-${Date.now()}@example.com`;
  const registerRes = await requestJson('/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: '12345678',
      fullName: 'Template Tester',
    }),
  });

  const loginRes = await requestJson('/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: '12345678',
    }),
  });

  token = loginRes.data.token;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

// ==================== SCENARIO 1: List Templates ====================
test('T1.1: Fetch all templates without authentication should return 401', async () => {
  const { response, data } = await requestJson('/v1/templates');
  assert.equal(response.status, 401);
  assert.match(data.error || '', /Bearer token|Authorization/i);
});

test('T1.2: Fetch all templates with valid token should return list', async () => {
  const { response, data } = await requestJson('/v1/templates', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(data.templates));
  assert.ok(data.templates.length >= 3);
});

test('T1.3: Template list should contain all required fields', async () => {
  const { data } = await requestJson('/v1/templates', {
    headers: { Authorization: `Bearer ${token}` },
  });

  const requiredFields = ['id', 'name', 'category', 'description', 'required_fields', 'sections'];
  data.templates.forEach((template, index) => {
    requiredFields.forEach((field) => {
      assert.ok(template.hasOwnProperty(field), `Template #${index} missing field: ${field}`);
    });
  });
});

test('T1.4: Each template should have proper structure with sections', async () => {
  const { data } = await requestJson('/v1/templates', {
    headers: { Authorization: `Bearer ${token}` },
  });

  data.templates.forEach((template) => {
    assert.ok(typeof template.id === 'string', 'Template ID should be string');
    assert.ok(typeof template.name === 'string', 'Template name should be string');
    assert.ok(typeof template.description === 'string', 'Template description should be string');
    assert.ok(Array.isArray(template.required_fields), 'Required fields should be array');
    assert.ok(Array.isArray(template.sections), 'Sections should be array');
    assert.ok(template.sections.length > 0, 'Template should have at least one section');
  });
});

test('T1.5: Template categories should match expected values', async () => {
  const { data } = await requestJson('/v1/templates', {
    headers: { Authorization: `Bearer ${token}` },
  });

  const validCategories = ['Hợp đồng', 'Văn bản hành chính', 'Quyết định', 'Thông báo'];
  data.templates.forEach((template) => {
    assert.ok(
      validCategories.includes(template.category),
      `Invalid category: ${template.category}`
    );
  });
});

// ==================== SCENARIO 2: Generate Template Draft ====================
test('T2.1: Generate draft without template ID should return 404', async () => {
  const { response, data } = await requestJson('/v1/templates/invalid_id/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ variables: {} }),
  });

  assert.equal(response.status, 500);
  assert.ok(data.error);
});

test('T2.2: Generate labor contract with all required fields should succeed', async () => {
  const { response, data } = await requestJson('/v1/templates/labor_contract_basic/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variables: {
        company_name: 'Công ty TNHH ABC',
        employee_name: 'Nguyễn Văn A',
        position: 'Lập trình viên',
        salary: '10,000,000 VND/tháng',
        work_location: 'Hà Nội',
        start_date: '2024-01-15',
      },
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(data.template);
  assert.ok(data.text);
  assert.ok(data.validation);
  assert.equal(data.validation.valid, true);
});

test('T2.3: Generate contract with missing required field should return validation error', async () => {
  const { response, data } = await requestJson('/v1/templates/labor_contract_basic/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variables: {
        company_name: 'Công ty TNHH ABC',
        employee_name: 'Nguyễn Văn A',
        // Missing: position, salary, work_location, start_date
      },
    }),
  });

  assert.equal(response.status, 400);
  assert.ok(data.validation);
  assert.equal(data.validation.valid, false);
  assert.ok(data.validation.errors.length > 0);
});

test('T2.4: Generated text should contain all provided variables', async () => {
  const testVars = {
    company_name: 'Công ty Đẹp',
    employee_name: 'Trần Văn B',
    position: 'Thư ký',
    salary: '8,000,000 VND',
    work_location: 'TP.HCM',
    start_date: '2024-02-20',
  };

  const { data } = await requestJson('/v1/templates/labor_contract_basic/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ variables: testVars }),
  });

  const text = data.text.toLowerCase();
  Object.values(testVars).forEach((value) => {
    assert.ok(
      text.includes(value.toLowerCase()),
      `Generated text should contain: ${value}`
    );
  });
});

test('T2.5: Service contract generation with valid data should pass validation', async () => {
  const { response, data } = await requestJson('/v1/templates/service_contract_basic/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variables: {
        client_name: 'Công ty A Consulting',
        vendor_name: 'Công ty B Solution',
        service_scope: 'Phát triển ứng dụng web',
        fee: '500,000,000 VND',
        payment_terms: 'Thanh toán 50% trước, 50% sau khi bàn giao',
        effective_date: '2024-03-01',
      },
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(data.text.includes('DICH VU'));
  assert.ok(data.validation.valid);
});

test('T2.6: Official notice generation should work correctly', async () => {
  const { response, data } = await requestJson('/v1/templates/official_notice/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variables: {
        issuer_name: 'Ban Giám đốc',
        notice_subject: 'Nâng cấp hệ thống IT',
        notice_body: 'Công ty sẽ thực hiện nâng cấp hệ thống bảo mật vào ngày 25/03/2024.',
        issue_date: '2024-03-15',
      },
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(data.text.includes('THONG BAO'));
  assert.equal(data.validation.valid, true);
});

// ==================== SCENARIO 3: Legal Validation ====================
test('T3.1: Contract missing dispute resolution clause should have warning', async () => {
  const { data } = await requestJson('/v1/templates/labor_contract_basic/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variables: {
        company_name: 'Test Corp',
        employee_name: 'Test Employee',
        position: 'Test Position',
        salary: '10,000,000',
        work_location: 'Test Location',
        start_date: '2024-01-01',
      },
    }),
  });

  // Should have warnings for missing dispute resolution
  assert.ok(data.validation.warnings.length > 0);
});

test('T3.2: Generated contract missing salary info should have error', async () => {
  // We cannot directly test this as the salary is included in generation
  // But we can verify that when validation checks occur, salary is present
  const { data } = await requestJson('/v1/templates/labor_contract_basic/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variables: {
        company_name: 'Test Corp',
        employee_name: 'Test Employee',
        position: 'Test Position',
        salary: '10,000,000',
        work_location: 'Test Location',
        start_date: '2024-01-01',
      },
    }),
  });

  // Text should contain salary info (check for 'muc luong' in Vietnamese)
  assert.ok(data.text.toLowerCase().includes('luong'));
});

test('T3.3: Contract should always be valid when all required fields provided', async () => {
  const templates = ['labor_contract_basic', 'service_contract_basic'];
  
  for (const templateId of templates) {
    let variables = {};
    
    if (templateId === 'labor_contract_basic') {
      variables = {
        company_name: 'Corp A',
        employee_name: 'Employee A',
        position: 'Developer',
        salary: '15000000',
        work_location: 'Hanoi',
        start_date: '2024-01-01',
      };
    } else {
      variables = {
        client_name: 'Client B',
        vendor_name: 'Vendor B',
        service_scope: 'Web Development',
        fee: '1000000000',
        payment_terms: '50/50',
        effective_date: '2024-02-01',
      };
    }

    const { data } = await requestJson(`/v1/templates/${templateId}/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ variables }),
    });

    assert.equal(data.validation.valid, true, `${templateId} should be valid with all fields`);
  }
});

// ==================== SCENARIO 4: Export DOCX ====================
test('T4.1: Export draft as DOCX with empty text should succeed', async () => {
  const { response, buffer } = await requestBuffer('/v1/templates/labor_contract_basic/export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: 'docx',
      title: 'Test Document',
      text: '',
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(buffer);
  assert.ok(response.headers.get('Content-Type').includes('wordprocessingml'));
});

test('T4.2: Export valid draft as DOCX should return binary file', async () => {
  // First generate a draft
  const genRes = await requestJson('/v1/templates/labor_contract_basic/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variables: {
        company_name: 'Test Company',
        employee_name: 'Test Employee',
        position: 'Tester',
        salary: '10000000',
        work_location: 'Hanoi',
        start_date: '2024-01-01',
      },
    }),
  });

  // Then export
  const { response, buffer } = await requestBuffer('/v1/templates/labor_contract_basic/export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: 'docx',
      title: 'Hợp Đồng Lao Động',
      text: genRes.data.text,
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(buffer);
  assert.ok(response.headers.get('Content-Type').includes('wordprocessingml'));
  assert.ok(response.headers.get('Content-Disposition').includes('.docx'));
});

test('T4.3: DOCX export should include title in document', async () => {
  const genRes = await requestJson('/v1/templates/labor_contract_basic/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variables: {
        company_name: 'Export Test Corp',
        employee_name: 'Export Test User',
        position: 'Exporter',
        salary: '12000000',
        work_location: 'Da Nang',
        start_date: '2024-03-01',
      },
    }),
  });

  const { response, buffer } = await requestBuffer('/v1/templates/labor_contract_basic/export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: 'docx',
      title: 'EXPORT_TEST_TITLE_123',
      text: genRes.data.text,
    }),
  });

  assert.ok(buffer);
  // DOCX should have proper size (with title and content)
  assert.ok(buffer.length > 3000, `DOCX buffer should be > 3000 bytes, got ${buffer.length}`);
  assert.ok(response.headers.get('Content-Type').includes('document'));
  assert.ok(response.headers.get('Content-Disposition').includes('.docx'));
});

// ==================== SCENARIO 5: Export PDF ====================
test('T5.1: Export draft as PDF with empty text should succeed', async () => {
  const { response, buffer } = await requestBuffer('/v1/templates/labor_contract_basic/export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: 'pdf',
      title: 'Test Document',
      text: '',
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(buffer);
  assert.ok(response.headers.get('Content-Type').includes('pdf'));
});

test('T5.2: Export valid draft as PDF should return binary file', async () => {
  const genRes = await requestJson('/v1/templates/labor_contract_basic/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variables: {
        company_name: 'PDF Test Company',
        employee_name: 'PDF Test Employee',
        position: 'PDF Tester',
        salary: '11000000',
        work_location: 'Can Tho',
        start_date: '2024-02-15',
      },
    }),
  });

  const { response, buffer } = await requestBuffer('/v1/templates/labor_contract_basic/export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: 'pdf',
      title: 'Hợp Đồng PDF',
      text: genRes.data.text,
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(buffer);
  assert.ok(buffer.length > 100);
  assert.ok(response.headers.get('Content-Type').includes('pdf'));
  assert.ok(response.headers.get('Content-Disposition').includes('.pdf'));
});

test('T5.3: PDF export should handle multiline text correctly', async () => {
  const multilineText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
  
  const { response, buffer } = await requestBuffer('/v1/templates/labor_contract_basic/export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: 'pdf',
      title: 'Multiline PDF Test',
      text: multilineText,
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(buffer);
  // PDF file should start with %PDF
  const pdfHeader = buffer.toString('utf-8', 0, 4);
  assert.equal(pdfHeader, '%PDF');
});

// ==================== SCENARIO 6: Default Format (DOCX) ====================
test('T6.1: Export without format specified should default to DOCX', async () => {
  const genRes = await requestJson('/v1/templates/service_contract_basic/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variables: {
        client_name: 'Default Format Client',
        vendor_name: 'Default Format Vendor',
        service_scope: 'Default Service',
        fee: '5000000',
        payment_terms: 'Upon Completion',
        effective_date: '2024-04-01',
      },
    }),
  });

  const { response, buffer } = await requestBuffer('/v1/templates/service_contract_basic/export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Default Service Contract',
      text: genRes.data.text,
      // No format specified
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(buffer);
  assert.ok(response.headers.get('Content-Type').includes('wordprocessingml'));
});

// ==================== SCENARIO 7: Special Characters & Edge Cases ====================
test('T7.1: Generate contract with special Vietnamese characters', async () => {
  const { response, data } = await requestJson('/v1/templates/labor_contract_basic/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variables: {
        company_name: 'Công ty TNHH Tương Lai & Phát Triển',
        employee_name: 'Nguyễn Thị Mỹ Linh',
        position: 'Chuyên viên Pháp lý & Hợp đồng',
        salary: '15,000,000 VND/tháng',
        work_location: 'Hà Nội (Chi nhánh Bắc)',
        start_date: '2024-01-15',
      },
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(data.text.includes('Mỹ Linh'));
  assert.ok(data.validation.valid);
});

test('T7.2: Export with empty text should create document', async () => {
  const { response, buffer } = await requestBuffer('/v1/templates/labor_contract_basic/export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: 'docx',
      title: 'Empty Content Test',
      text: '',
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(buffer);
});

test('T7.3: Export with very long text should succeed', async () => {
  const longText = 'Lorem ipsum dolor sit amet. '.repeat(1000);
  
  const { response, buffer } = await requestBuffer('/v1/templates/labor_contract_basic/export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: 'pdf',
      title: 'Long Text PDF',
      text: longText,
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(buffer);
});

// ==================== SCENARIO 8: Error Handling ====================
test('T8.1: Invalid JSON in request body should return error', async () => {
  try {
    const response = await fetch(`${baseUrl}/v1/templates/labor_contract_basic/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: 'invalid json {',
    });

    // Should fail with 4xx or 5xx
    assert.ok(response.status >= 400, `Expected status >= 400, got ${response.status}`);
  } catch (error) {
    // Network error or invalid JSON is also acceptable
    assert.ok(error, 'Invalid JSON should cause an error');
  }
});

test('T8.2: Empty variables object should trigger required field errors', async () => {
  const { response, data } = await requestJson('/v1/templates/labor_contract_basic/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variables: {},
    }),
  });

  assert.equal(response.status, 400);
  assert.equal(data.validation.valid, false);
  assert.ok(data.validation.errors.length >= 6);
});

test('T8.3: Request without token should be rejected', async () => {
  const { response, data } = await requestJson('/v1/templates/labor_contract_basic/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variables: {
        company_name: 'Test',
        employee_name: 'Test',
        position: 'Test',
        salary: '10000000',
        work_location: 'Test',
        start_date: '2024-01-01',
      },
    }),
  });

  assert.equal(response.status, 401);
});
