const API = 'http://localhost:8080';
const email = `export_test_${Date.now()}@test.com`;

// Register
const registerRes = await fetch(`${API}/v1/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    password: 'Test@123',
    fullName: 'Export Test User'
  })
});
const regData = await registerRes.json();
console.log('✓ User registered');

// Login
const loginRes = await fetch(`${API}/v1/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: 'Test@123' })
});
const loginData = await loginRes.json();
const token = loginData.token;
console.log('✓ Logged in');

// Create draft
const draftRes = await fetch(`${API}/v1/drafts`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    templateId: 'labor_contract_basic',
    variables: {
      company_name: 'Test Export Corp',
      employee_name: 'Export Test',
      position: 'Engineer',
      salary: '30000000',
      work_location: 'HCM',
      start_date: '2024-01-01'
    }
  })
});
const draftData = await draftRes.json();
const draftId = draftData.data.id;
console.log('✓ Draft created:', draftId);

// Try export DOCX
console.log('\n=== Testing DOCX Export ===');
const exportRes = await fetch(`${API}/v1/drafts/${draftId}/export?format=docx`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

console.log('Status:', exportRes.status);
const text = await exportRes.text();
console.log('Response:', text.substring(0, 500));
