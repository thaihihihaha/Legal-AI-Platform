const API = 'http://localhost:8080';
const email = `debug${Date.now()}@test.com`;

// Register
console.log('1. Registering user...');
const registerRes = await fetch(`${API}/v1/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    password: 'Test@123',
    fullName: 'Debug User'
  })
});
const regData = await registerRes.json();
console.log('✓ Registered:', regData.userId);

// Login
console.log('\n2. Logging in...');
const loginRes = await fetch(`${API}/v1/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: 'Test@123' })
});
const loginData = await loginRes.json();
const token = loginData.token;
console.log('✓ Token:', token?.substring(0, 30) + '...');

// Test draft creation
console.log('\n3. Creating draft...');
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
const draftData = await draftRes.text();
console.log('Response:', draftData.substring(0, 800));
