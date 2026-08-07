# Hướng dẫn sử dụng — Legal AI Platform

Tài liệu này dành cho người dùng cuối (phòng Pháp chế, Nhân sự, Vận hành, Quản lý). Nếu bạn cần thông tin kỹ thuật (API, kiến trúc hệ thống), xem thêm `TECHNICAL_DOCUMENTATION.md`.

## 1. Ứng dụng này giúp gì cho bạn

Legal AI Platform là nền tảng giúp doanh nghiệp số hóa và tự động hóa nghiệp vụ pháp lý hàng ngày:

- **Quản lý hợp đồng và tài liệu tập trung** — không còn tình trạng hợp đồng nằm rải rác trên email, ổ đĩa cá nhân hay máy tính của người đã nghỉ việc.
- **Rà soát rủi ro hợp đồng bằng AI** — phát hiện điều khoản bất lợi, thiếu sót trong vài phút thay vì đọc thủ công hàng chục trang.
- **Tra cứu pháp luật bằng AI có dẫn chiếu nguồn** — trả lời kèm trích dẫn điều luật cụ thể, không phải suy đoán chung chung.
- **Soạn thảo văn bản nhanh từ mẫu có sẵn** — giảm lỗi copy-paste, chuẩn hóa nội dung theo đúng form công ty.
- **Theo dõi quy trình phê duyệt minh bạch** — biết rõ ai duyệt, ai từ chối, và khi nào.

## 2. Đăng nhập và bảo mật tài khoản

### 2.1 Đăng nhập
1. Mở trang đăng nhập của hệ thống.
2. Nhập email và mật khẩu được cấp.
3. Bấm **Đăng nhập**.

Nếu tài khoản đã bật xác thực 2 lớp (2FA):
1. Mở ứng dụng xác thực trên điện thoại (Google Authenticator, Authy...).
2. Nhập mã OTP gồm 6 số hiển thị trên ứng dụng.
3. Xác nhận để vào hệ thống.

### 2.2 Khuyến nghị bảo mật
- Không chia sẻ mật khẩu hoặc mã OTP cho bất kỳ ai, kể cả đồng nghiệp.
- Đổi mật khẩu định kỳ, đặc biệt sau khi nghi ngờ bị lộ.
- Luôn đăng xuất khi sử dụng máy tính dùng chung/công cộng.
- Báo ngay cho quản trị viên nếu tài khoản có dấu hiệu bất thường (đăng nhập lạ, dữ liệu bị thay đổi không rõ nguyên nhân).

## 3. Tổng quan giao diện

| Khu vực | Chức năng |
|---|---|
| **Dashboard** | Xem nhanh số liệu tổng quan: số hợp đồng, tài liệu, mẫu văn bản, cảnh báo rủi ro |
| **Contracts (Hợp đồng)** | Upload, cập nhật, review rủi ro hợp đồng |
| **Documents (Tài liệu)** | Quản lý tài liệu nội bộ, quy chế, chính sách |
| **Templates (Mẫu văn bản)** | Tạo văn bản nhanh từ mẫu có sẵn |
| **Legal Search (Tra cứu pháp lý)** | Hỏi đáp/tra cứu pháp luật bằng AI |
| **Settings/Profile** | Quản lý API key (nếu được cấp quyền), thông tin cá nhân, đổi mật khẩu, 2FA |

## 4. Hướng dẫn theo từng tác vụ

### 4.1 Upload hợp đồng và rà soát rủi ro bằng AI

**Vì sao nên dùng:** thay vì đọc thủ công một hợp đồng dài hàng chục trang để tìm điều khoản bất lợi, AI sẽ đọc và tóm tắt rủi ro giúp bạn trong vài phút — bạn chỉ cần tập trung xác nhận lại các điểm được cảnh báo.

1. Vào mục **Contracts**.
2. Chọn **Upload hợp đồng**.
3. Chọn file hợp lệ (định dạng docx/pdf theo cấu hình hệ thống).
4. Sau khi upload xong, mở hợp đồng vừa tải lên.
5. Bấm **Review** để hệ thống phân tích rủi ro.
6. Đọc các cảnh báo, điểm rủi ro (risk score) và khuyến nghị điều chỉnh mà AI đưa ra.

**Mẹo:**
- Đặt tên file rõ ràng: loại hợp đồng + tên đối tác + ngày, ví dụ `HDDV_CongTyABC_20260807.pdf`.
- Kiểm tra và bổ sung metadata (đối tác, loại hợp đồng, ngày hiệu lực) để tìm kiếm nhanh hơn về sau.
- Kết quả review là công cụ hỗ trợ — vẫn cần chuyên viên pháp chế xác nhận trước khi ra quyết định cuối cùng.

### 4.2 Quản lý tài liệu nội bộ

**Vì sao nên dùng:** tập trung quy chế, chính sách, văn bản tham chiếu pháp luật vào một kho chung, dễ tìm lại khi cần, tránh mỗi phòng ban lưu một bản khác nhau gây nhầm lẫn.

1. Vào mục **Documents**.
2. Upload tài liệu nội bộ hoặc tài liệu pháp lý.
3. Gắn danh mục/tag (nếu được cấp quyền) để phân loại.
4. Dùng ô tìm kiếm để lọc tài liệu theo tên, loại, trạng thái.

### 4.3 Tạo văn bản từ mẫu (Template)

**Vì sao nên dùng:** loại bỏ thao tác copy nội dung từ file Word cũ — vốn dễ sót lỗi (quên sửa tên đối tác, sai điều khoản, sai ngày tháng) — giúp cả nhân sự không chuyên về pháp lý cũng tạo được văn bản đúng chuẩn công ty.

1. Vào mục **Templates**.
2. Chọn loại mẫu văn bản phù hợp (hợp đồng lao động, hợp đồng dịch vụ, biên bản...).
3. Điền các trường thông tin bắt buộc (tên các bên, ngày tháng, giá trị hợp đồng...).
4. Bấm **Generate** để hệ thống tạo nội dung hoàn chỉnh.
5. Xem lại và chỉnh sửa nếu cần.
6. Export ra định dạng cần dùng (PDF hoặc DOCX).

**Khuyến nghị:**
- Kiểm tra kỹ tên công ty, thông tin các bên liên quan, ngày tháng trước khi phát hành chính thức.
- Đọc lại các điều khoản quan trọng — mẫu chỉ giúp chuẩn hóa cấu trúc, không thay thế việc rà soát nội dung.

### 4.4 Làm việc với bản nháp (Draft) và quy trình phê duyệt

**Vì sao nên dùng:** toàn bộ lịch sử chỉnh sửa, ai duyệt, ai từ chối và lý do đều được lưu lại trong hệ thống — thay vì trao đổi rời rạc qua email, khó truy vết khi có tranh chấp hoặc cần kiểm toán lại sau này.

1. Tạo bản nháp (Draft) mới hoặc mở bản nháp có sẵn.
2. Chỉnh sửa nội dung.
3. Bấm **Validate** để hệ thống kiểm tra tính hợp lệ.
4. Chuyển trạng thái sang **chờ duyệt (review)**.
5. Người có thẩm quyền phê duyệt hoặc từ chối, kèm nhận xét nếu cần.

### 4.5 Tra cứu pháp luật bằng AI

**Vì sao nên dùng:** khác với tra cứu Google trả về kết quả chung chung không rõ nguồn, AI ở đây tìm kiếm trực tiếp trong kho văn bản pháp luật đã nạp sẵn và trả lời kèm trích dẫn điều luật cụ thể — giúp bạn tra cứu nhanh mà vẫn có căn cứ để đối chiếu lại.

1. Vào mục **Legal Search**.
2. Nhập câu hỏi rõ ràng (nêu rõ bối cảnh, đối tượng, vấn đề cần hỏi).
3. Gửi câu hỏi.
4. Đọc câu trả lời và phần dẫn chiếu nguồn đi kèm.
5. Nếu cần, đặt câu hỏi tiếp theo để làm rõ hơn.

**Lưu ý:**
- Câu hỏi càng cụ thể, kết quả trả về càng chính xác.
- Luôn đối chiếu với quy định nội bộ và tham vấn chuyên viên pháp lý trước khi ra quyết định cuối cùng — AI hỗ trợ tra cứu, không thay thế vai trò tư vấn pháp lý chuyên môn.

## 5. Các vai trò người dùng

Tùy theo cách doanh nghiệp cấu hình, hệ thống thường có các vai trò sau:

- **Owner/Admin**: quản trị người dùng, phân quyền, cấu hình nâng cao cho toàn công ty.
- **Member**: thực hiện nghiệp vụ hàng ngày (upload, soạn thảo, tra cứu, review).
- **Viewer**: chỉ xem dữ liệu trong phạm vi được cấp quyền, không chỉnh sửa.

Nếu bạn không thấy nút hoặc chức năng nào đó, khả năng cao là tài khoản chưa được cấp quyền tương ứng — liên hệ Admin để được cấp thêm quyền.

## 6. Xử lý sự cố thường gặp

### 6.1 Không đăng nhập được
- Kiểm tra lại email/mật khẩu đã nhập đúng chưa.
- Kiểm tra mã OTP nếu tài khoản có bật 2FA.
- Thử đăng xuất và đăng nhập lại.
- Liên hệ Admin để reset mật khẩu nếu cần.

### 6.2 Upload thất bại
- Kiểm tra đúng định dạng file được hệ thống hỗ trợ (docx/pdf).
- Kiểm tra dung lượng file có vượt giới hạn cho phép không.
- Đổi tên file, tránh ký tự đặc biệt lạ.
- Thử tải lại sau ít phút nếu hệ thống đang bận.

### 6.3 Kết quả review/AI chưa phù hợp
- Viết câu hỏi hoặc yêu cầu rõ ràng, cụ thể hơn.
- Bổ sung thêm bối cảnh hợp đồng/tình huống liên quan.
- Đối chiếu với nguồn dẫn chiếu và ý kiến chuyên viên pháp lý trước khi kết luận.

## 7. Quy trình vận hành đề xuất cho doanh nghiệp

**Hàng ngày:**
1. Upload tài liệu/hợp đồng mới phát sinh.
2. Review các hợp đồng rủi ro cao trước.
3. Tạo/duyệt văn bản từ mẫu.
4. Cập nhật ghi chú và thông tin phê duyệt.

**Hàng tuần:**
1. Rà soát các hợp đồng đang chờ duyệt (pending review).
2. Kiểm tra tài khoản và quyền truy cập của nhân sự.
3. Tổng hợp các vướng mắc khi dùng AI để cải thiện cách đặt câu hỏi/nội dung tra cứu.

## 8. Kênh hỗ trợ nội bộ

Khi cần hỗ trợ kỹ thuật, vui lòng cung cấp cho bộ phận kỹ thuật:
- Ảnh chụp màn hình lỗi.
- Các bước thực hiện trước khi lỗi xảy ra.
- Thời gian xảy ra lỗi.
- Mã hợp đồng/tài liệu liên quan (nếu có).

Tài liệu này phục vụ thao tác của người dùng cuối. Thông tin kỹ thuật chi tiết hơn xem tại `TECHNICAL_DOCUMENTATION.md`.
