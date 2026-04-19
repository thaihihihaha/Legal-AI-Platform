import fetch from 'node-fetch';

const API = 'http://localhost:8080';

// First create user
const registerRes = await fetch(`${API}/v1/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: `test${Date.now()}@test.com`,
    password: 'Test@123',
    fullName: 'Test User'
  })
});
const { userId, companyId } = await registerRes.json();
console.log('✓ User created:', userId);

// Login to get token
const loginRes = await fetch(`${API}/v1/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: `test${Date.now() - 1000}@test.com`,
    password: 'Test@123'
  })
});
const loginData = await loginRes.json();
const token = loginData.token;
console.log('✓ Token:', token?.substring(0, 20) + '...');

// Test creating draft
console.log('\nTesting POST /v1/drafts...');
const draftRes = await fetch(`${API}/v1/drafts`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    templateId: 'labor_contract_basic',
    variables: {
      company_name: 'Test Corp',
      employee_name: 'John Doe',
      position: 'Engineer',
      salary: '30000000',
      work_location: 'HCM',
      start_date: '2024-01-01'
    }
  })
});

console.log('Status:', draftRes.status);
console.log('Headers:', Object.fromEntries(draftRes.headers));
const text = await draftRes.text();
console.log('Response:', text.substring(0, 500));
