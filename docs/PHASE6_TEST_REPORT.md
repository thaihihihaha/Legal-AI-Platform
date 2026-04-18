# Phase 6 Test Report

Last Updated: April 16, 2026

## Scope
- Automated route-level integration tests for Auth, Legal Ask validation, and Contracts flow.
- Manual smoke tests for end-to-end app workflow in browser.
- Runtime checks for backend health endpoint and database persistence visibility.

## Automated Test Command
```bash
cd server
npm test
```

## Test Cases Covered
1. Health endpoint returns `status=ok` with db/ai/pinecone checks.
2. Protected contracts endpoint rejects requests without bearer token.
3. Register flow provisions user and company.
4. Login returns JWT token.
5. Legal ask payload validation (`question` required) returns 400 when missing.
6. Contracts upload validation rejects unsupported file extension.
7. Contracts upload accepts supported file and returns contractId.
8. Contracts list includes newly uploaded contract.
9. Review endpoint validates payload (`contractText` required).
10. Review endpoint returns 404 for non-existing contract id.

## Manual Smoke Checklist (Executed)
1. Open login route and register a new account.
2. Redirect to dashboard after login succeeds.
3. Navigate to contracts route.
4. Upload markdown file and confirm list refresh with new item.
5. Run AI review and verify review result appears in modal and list card.
6. Validate chat panel still available and connected in workspace layout.

## Outcome
- Phase 6 verification passed for MVP scope.
- No blocking compile or lint errors in touched files.
- Build and runtime checks passed for current local environment.

## Notes
- Integration tests intentionally avoid asserting external AI content quality to reduce flakiness.
- AI response quality remains validated through manual smoke workflow in active environment.
