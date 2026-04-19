# PHASE 3: API Endpoint Reference

## Authentication
All endpoints require Bearer token in Authorization header:
```
Authorization: Bearer <token>
```

## PHASE 3.1: Review System Endpoints

### Create Review Session
```
POST /v1/reviews
Content-Type: application/json

{
  "draftId": "string",
  "reviewType": "standard|detailed|compliance",
  "dueDate": "ISO8601 date (optional)",
  "notes": "string (optional)"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "draft_id": "uuid",
    "initiated_by": "uuid",
    "status": "pending|in_progress|approved|rejected",
    "review_type": "string",
    "created_at": "ISO8601"
  }
}
```

### Get Review Session
```
GET /v1/reviews/:draftId

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "draft_id": "uuid",
    "status": "string",
    "comments": [...],
    "risk_assessment": {...},
    ...
  }
}
```

### Add Review Comment
```
POST /v1/reviews/:draftId/comments
Content-Type: application/json

{
  "sessionId": "uuid",
  "content": "string",
  "clauseReference": "string (optional)",
  "commentType": "comment|suggestion|issue|question",
  "severity": "info|warning|critical"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "string",
    "commentType": "string",
    "severity": "string",
    "created_at": "ISO8601"
  }
}
```

### Perform Risk Assessment
```
POST /v1/drafts/:draftId/risk-assessment

Response: 200 OK
{
  "success": true,
  "data": {
    "draft_id": "uuid",
    "risk_score": 0-100,
    "risk_level": "low|medium|high|critical",
    "risk_items": [...],
    "recommendations": [...]
  }
}
```

### Approve Review
```
POST /v1/reviews/:draftId/approve
Content-Type: application/json

{
  "sessionId": "uuid",
  "notes": "string (optional)"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "approved",
    "approved_by": "uuid",
    "approved_at": "ISO8601"
  }
}
```

### Reject Review
```
POST /v1/reviews/:draftId/reject
Content-Type: application/json

{
  "sessionId": "uuid",
  "reasons": ["string"]
}

Response: 200 OK
{
  "success": true,
  "data": {
    "status": "rejected",
    "reasons": [...]
  }
}
```

### Get Review Statistics
```
GET /v1/reviews/stats/:companyId

Response: 200 OK
{
  "success": true,
  "data": {
    "total_reviews": 42,
    "approved": 35,
    "rejected": 3,
    "pending": 4,
    "avg_review_time": "2.5 days",
    "avg_risk_score": 65
  }
}
```

---

## PHASE 3.2: Collaboration Endpoints

### Share Draft
```
POST /v1/drafts/:draftId/share
Content-Type: application/json

{
  "userId": "uuid",
  "role": "owner|editor|reviewer|viewer",
  "expiresAt": "ISO8601 (optional)"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "role": "string",
    "granted_at": "ISO8601",
    "expires_at": "ISO8601 (optional)"
  }
}
```

### Revoke Access
```
POST /v1/drafts/:draftId/revoke-access
Content-Type: application/json

{
  "userId": "uuid"
}

Response: 200 OK
{
  "success": true,
  "data": [...]  // Updated access grants
}
```

### Get Collaborators
```
GET /v1/drafts/:draftId/collaborators

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "full_name": "string",
      "email": "string",
      "role": "string",
      "granted_at": "ISO8601"
    },
    ...
  ]
}
```

### Get Activity Log
```
GET /v1/drafts/:draftId/activity?limit=50

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "action": "created|updated|deleted|shared|commented",
      "action_type": "string",
      "details": {...},
      "created_at": "ISO8601"
    },
    ...
  ]
}
```

### Get Shared Drafts
```
GET /v1/shared-drafts

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "status": "string",
      "user_id": "uuid",
      "role": "editor|reviewer|viewer",
      "created_at": "ISO8601"
    },
    ...
  ]
}
```

---

## PHASE 3.3: Compliance & Audit Endpoints

### Get Audit Trail
```
GET /v1/drafts/:draftId/audit-trail?limit=100

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action": "created|updated|signed|reviewed",
      "entity_type": "draft|signature|hold",
      "performed_by": "uuid",
      "timestamp": "ISO8601",
      "changes": {...},
      "old_values": {...},
      "new_values": {...},
      "status": "success|error"
    },
    ...
  ]
}
```

### Record Digital Signature
```
POST /v1/drafts/:draftId/sign
Content-Type: application/json

{
  "signatureData": "base64_string",
  "signatureMethod": "timestamp|asymmetric|biometric"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "signed_by": "uuid",
    "signature_method": "string",
    "timestamp": "ISO8601",
    "is_valid": true,
    "certificate_info": {...}
  }
}
```

### Apply Legal Hold
```
POST /v1/drafts/:draftId/legal-hold
Content-Type: application/json

{
  "reason": "string",
  "caseNumber": "string (optional)",
  "expiryDate": "ISO8601 (optional)",
  "description": "string (optional)"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "hold_status": "active|lifted",
    "reason": "string",
    "created_by": "uuid",
    "created_at": "ISO8601"
  }
}
```

### Get Legal Holds
```
GET /v1/drafts/:draftId/legal-holds

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "reason": "string",
      "hold_status": "active|lifted",
      "case_number": "string",
      "created_at": "ISO8601",
      "lifted_at": "ISO8601 (optional)"
    },
    ...
  ]
}
```

### Check Compliance
```
POST /v1/drafts/:draftId/compliance-check
Content-Type: application/json

{
  "standardName": "GDPR|HIPAA|SOX|LocalLaw|Custom",
  "jurisdiction": "string (optional)"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "standard_name": "string",
    "jurisdiction": "string",
    "compliance_status": "compliant|non_compliant|partial",
    "compliance_score": 0-100,
    "findings": [...],
    "remediation_items": [...],
    "last_checked_at": "ISO8601",
    "next_review_date": "ISO8601"
  }
}
```

### Get Compliance Checks
```
GET /v1/drafts/:draftId/compliance

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "standard_name": "string",
      "compliance_status": "string",
      "compliance_score": 0-100,
      "findings": [...],
      "last_checked_at": "ISO8601"
    },
    ...
  ]
}
```

### Get Compliance Report
```
GET /v1/compliance-report/:companyId

Response: 200 OK
{
  "success": true,
  "data": {
    "company_id": "uuid",
    "generated_at": "ISO8601",
    "total_documents": 42,
    "avg_compliance_score": 78.5,
    "compliant_documents": 35,
    "non_compliant_documents": 3,
    "documents_with_holds": 2,
    "documents_signed": 28,
    "standards_checked": ["GDPR", "SOX", "LocalLaw"]
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required field: draftId"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Thiếu Bearer token hợp lệ."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "User does not have permission to access this draft"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Draft not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "An unexpected error occurred"
}
```

---

## Rate Limiting & Quotas

- **Review Operations**: Unlimited per user
- **Compliance Checks**: 10 per hour per company
- **Audit Trail**: Limited to last 1000 entries per draft
- **Webhooks**: Limited to 100 delivery attempts per webhook

---

## Data Types Reference

### ReviewStatus
- `pending` - Awaiting review
- `in_progress` - Currently being reviewed
- `approved` - Review approved
- `rejected` - Review rejected

### DraftAccessRole
- `owner` - Full access and control
- `editor` - Can view and edit
- `reviewer` - Can view and comment
- `viewer` - Read-only access

### ComplianceStatus
- `compliant` - Meets all requirements
- `non_compliant` - Fails compliance
- `partial` - Partially compliant

### NotificationType
- `draft_commented` - New comment on draft
- `draft_shared` - Draft shared with user
- `review_assigned` - Review assigned to user
- `compliance_alert` - Compliance issue found
- `reminder` - Scheduled reminder

---

## Integration Examples

### JavaScript/Node.js
```javascript
const response = await fetch('/v1/reviews', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    draftId: 'draft-id-123',
    reviewType: 'standard',
    notes: 'Please review for compliance'
  })
});

const data = await response.json();
console.log(data.data.id); // Review session ID
```

### cURL
```bash
curl -X POST http://localhost:3000/v1/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "draftId": "draft-id-123",
    "reviewType": "standard",
    "notes": "Please review"
  }'
```

### Python
```python
import requests

headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {token}'
}

data = {
    'draftId': 'draft-id-123',
    'reviewType': 'standard',
    'notes': 'Please review'
}

response = requests.post(
    'http://localhost:3000/v1/reviews',
    headers=headers,
    json=data
)

print(response.json())
```

---

**Last Updated**: PHASE 3 Completion
**Total Endpoints**: 25+
**Status**: Production Ready
