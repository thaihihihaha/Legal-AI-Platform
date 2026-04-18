# Legal QA Checklist

Last Updated: April 16, 2026

## Scope

Checklist kiem thu cac tinh nang Legal chinh:
- Upload hop dong
- Ra soat hop dong
- Tong quan rui ro
- Tao mau van ban + export DOCX/PDF
- API key management + integration endpoints

## Preconditions

- Backend chay o `http://localhost:8080`
- Frontend chay o `http://localhost:5173`
- Da tao tai khoan va dang nhap thanh cong
- Da co ket noi database

## Manual Test Cases

1. Upload hop dong
- Action: Upload file `.pdf`, `.docx`, `.txt` hoac `.md`.
- Expect: Tra ve `contractId`, co `textPreview`, hop dong xuat hien trong danh sach.
- Negative: Upload `.csv` phai tra ve 400.

2. Ra soat hop dong theo tung item
- Action: Bam `Review hop dong nay` tren tung hop dong.
- Expect: API `POST /v1/contracts/:id/review` thanh cong khi co `contractText`.
- Negative: Goi review voi body rong phai tra 400.

3. Tong quan rui ro
- Action: Mo trang Tong quan rui ro.
- Expect: API `GET /v1/contracts/risk-summary` tra ve `summary`, `by_type`, `trend`.

4. Tao mau van ban
- Action: Chon template, dien du truong bat buoc, bam Generate.
- Expect: Co ban nhap text va ket qua validation.
- Negative: Thieu field bat buoc phai tra 400 + danh sach loi.

5. Export van ban
- Action: Export DOCX va PDF sau khi generate.
- Expect: File duoc tai ve dung dinh dang.
- Negative: Export khi text rong phai tra 400.

6. API key management
- Action: Tao API key moi, xem list, thu hoi key.
- Expect: Tao key tra ve `plain_key` (chi hien thi 1 lan), list co `masked_key`, revoke thanh cong.

7. Integration endpoint auth
- Action: Goi `POST /v1/integration/legal/ask` khong co key.
- Expect: Tra 401.
- Action: Tao key chi co quyen `ask`, goi `POST /v1/integration/contracts/:id/review`.
- Expect: Tra 403 vi thieu quyen `review`.

## Automated Validation

- Frontend build: `cd client && npm run build`
- Frontend lint: `cd client && npm run lint`
- Backend tests: `cd server && npm test`

## Exit Criteria

- Tat ca test automation pass
- Khong con lint error
- Cac endpoint moi tra ve ma trang thai dung
- Luong user cho 3 tinh nang moi chay thong suot tren UI
