# MediQ — Prototype

Prototype giao diện thuần frontend của MediQ, chạy bằng dữ liệu giả lưu trong `localStorage`, bao phủ 33 màn hình trong [Screen-Inventory](https://github.com/Team12-SE214-R11/MediQ-Docs/System-Analysis-And-Design/06-UX-UI-Design/03-Wireframes/Screen-Inventory.md). Không có backend.

- Stack: React 19, TypeScript, Vite 8, Tailwind CSS v4 (token khai báo bằng `@theme` trong `src/styles/index.css`), React Router 7, Zustand.
- Token màu, kiểu chữ, bo góc, đổ bóng lấy từ `04-Design-System/Design-Tokens.md`; bảng màu mặc định của Tailwind đã bị xoá để không lọt giá trị ngoài token.
- **Đồng bộ với MediQ-Docs:** lần cập nhật gần nhất 28/11/2026, theo `MediQ-Docs` tại commit `18af521` (SRS, Use Case, OpenAPI 82 operations, DDL). Đây là bản tham chiếu giao diện và hành vi cho nhóm làm `MediQ-Frontend`; xem mục "Dùng prototype làm tham chiếu cho MediQ-Frontend".

## Chạy

```bash
pnpm install
pnpm dev
```

Mở `http://localhost:5173`. Các lệnh khác: `pnpm build`, `pnpm lint`.

## Tài khoản demo

Mật khẩu chung: `MediQ@1234`.

| Email | Vai trò | Ghi chú |
| :--- | :--- | :--- |
| `lan.nguyen@example.com` | Normal User | |
| `bs.tranminhtuan@example.com` | Verified Doctor | Có Passkey |
| `admin_01@example.com` | Admin | Bắt buộc 2FA (BR-02): đăng nhập mật khẩu luôn sang bước TOTP; mã bất kỳ gồm 6 chữ số, trừ `000000`. Không đăng nhập bằng Passkey |

Nút **Demo** ở góc dưới trái đổi nhanh vai trò (kể cả tài khoản bị tạm khoá, tài khoản bị từ chối xác minh) và có nút "Reset dữ liệu demo".

## Quy tắc nghiệp vụ đã chạy trong mock

Logic nằm trong `src/mock/store.ts`, tên nhóm hàm bám theo nhóm API của SRS:

- Chính sách mật khẩu NFR-04.2: 8–64 ký tự, có chữ thường, chữ hoa, chữ số và ký tự đặc biệt thuộc tập 19 ký tự `! @ # $ % ^ & * , . / < > ? - _ = + ~`; vi phạm trả 422 `PASSWORD_POLICY_VIOLATION` (một mã duy nhất).
- Guest không xem công khai: mọi nội dung chuyển về `/login?redirect=…`.
- Chỉ Verified Doctor tạo Article (BR-06); chỉ chính chủ sửa và xoá (BR-07); Admin chỉ đọc và chỉ có nút "Xoá nội dung" (BR-03).
- Huy hiệu bác sĩ tính lúc hiển thị, mất ngay khi bị thu hồi (BR-05).
- Xoá nội dung kéo theo mọi bình luận con và ảnh (cascade).
- Mỗi lần sửa tạo một Revision mới; lịch sử xem snapshot; Article có thêm Diff View so sánh hai phiên bản theo dòng, không khôi phục (REQ-SOC-013). Sửa Article không có trường lý do.
- Vote ba trạng thái, chỉ trên Article và Comment (BR-18); Question không có vote.
- Thông báo là hệ quả của hành động, không gửi cho chính người thao tác.
- Vòng đời hồ sơ xác minh và báo cáo; mọi thao tác Admin ghi Audit Log.
- Tài khoản bị xoá hiển thị "Deleted MediQ user".
- Admin (BR-02): luôn phải qua TOTP khi đăng nhập, không tắt được 2FA, không đăng ký, đổi tên, xoá hay đăng nhập bằng Passkey. `loginWithPasskey` với email Admin trả 403 `ROLE_NOT_ALLOWED` (API-AUTH-11); `disable2FA` và các hàm Passkey của Admin trả 403 `ROLE_NOT_ALLOWED`.
- Hồ sơ xác minh `PENDING` bị hệ thống chuyển `CANCELLED` (kèm dòng lịch sử `CANCELLED`) khi bác sĩ bị thu hồi.
- Gửi báo cáo tạo thông báo `REPORT_CREATED` cho người báo cáo (REQ-ADM-001).
- Mã lỗi, loại thông báo và tên hành động Audit Log dùng đúng giá trị của SRS mục 3.1.4.4 và OpenAPI (ví dụ `TOTP_INVALID`, `EMAIL_ALREADY_EXISTS`, `REPORT_ALREADY_EXISTS`, `NOT_OWNER`, `COMMENT_ON_QUESTION`, `COMMENT_REPLY`, `REPORT_REVIEW_STARTED`, `ACCOUNT_SUSPENDED`, `TAG_CREATED`).

## Dùng prototype làm tham chiếu cho MediQ-Frontend

Hàm trong `src/mock/store.ts` (đối tượng `api`) ánh xạ gần 1-1 với operation của OpenAPI (`MediQ-Docs/Architecture-And-Database-Design/04-API-Specification/openapi.yaml`). Khi nối backend thật, thay thân hàm bằng lời gọi client sinh từ OpenAPI; giữ nguyên chữ ký hàm, mã lỗi và thông điệp lỗi để màn hình không phải sửa.

| Hàm mock | API-ID |
| :--- | :--- |
| `register`, `verifyEmail`, `login`, `verify2FA`, `logout`, `resetPassword`, `changePassword` | API-AUTH-01, 02, 04, 10, 05, 08, 17 |
| `loginWithPasskey`, `addPasskey`, `renamePasskey`, `removePasskey` | API-AUTH-11/12, 13, 15, 16 (Optional; Admin bị từ chối) |
| `enable2FA`, `disable2FA` | API-AUTH-09 (`ENABLE`, `DISABLE`; Admin không được `DISABLE`) |
| `updateProfile`, `deleteAccount` | API-USR-02, API-USR-06 |
| `submitVerification` | API-DV-01 (NEW), 02 (RESUBMISSION), 03 (UPDATE) |
| `approveVerification`, `rejectVerification`, `revokeVerification`, `reopenVerification`, `setDoctorProfileVisible` | API-DV-08, 09, 10, 12, 13 |
| `createPost`, `updatePost`, `deletePost` | API-SOC-01/06, 02/07, 03/08 |
| `createComment`, `updateComment`, `deleteComment` | API-SOC-12/13, 14, 15 |
| `vote`, `toggleBookmark` | API-SOC-18/19, 20 |
| `markRead`, `markAllRead` | API-NTF-03, 04 |
| `report`, `takeReport`, `closeReport`, `removeContent` | API-ADM-01, 04, 05/06, 09 |
| `suspend`, `unsuspend`, `createTag`, `deleteTag` | API-ADM-12, 13, 14, 15 |

Các màn danh sách và chi tiết đọc dữ liệu qua `useDb()` và các hàm chọn trong `store.ts` (tương ứng API-SOC-04/05/09/10/11/16/21/22/23/25, API-NTF-01/02, API-ADM-02/03/10/11/16/17, API-USR-01/03, API-DV-04..07/11).

**Khác biệt có chủ đích giữa prototype và hợp đồng thật, nhóm Frontend cần xử lý khi nối API:**

- `id` là chuỗi giả (`q-1`, `RP-114`); API dùng UUID. Route chi tiết dùng `:id`, không có slug.
- `targetType` của báo cáo viết thường (`question`, `article`, `comment`, `account`); API dùng `UPPER_SNAKE_CASE`.
- Thời gian là ISO 8601 UTC; hiển thị theo GMT+7.
- Phân trang: prototype cắt mảng ở client. API dùng cursor (feed, bình luận, thông báo, bookmark) và offset `page` từ 1, `size` tối đa 20 (Admin, tìm kiếm) với khung `{items, page, size, totalItems, totalPages}` hoặc `{items, size, nextCursor, hasMore}`.
- Đăng nhập Passkey trong mock chỉ cần email; API thật dùng challenge WebAuthn (API-AUTH-12 rồi API-AUTH-11, payload chuẩn W3C).
- Bước 2FA trong mock dùng `pending2FA` trong store; API thật trả `challengeToken` 5 phút (API-AUTH-04) rồi gọi API-AUTH-10.
- Access Token giữ trong bộ nhớ JS, Refresh Token là cookie `HttpOnly`; client tự gọi `POST /auth/refresh` một lần khi gặp `TOKEN_EXPIRED` rồi gửi lại request.
- Thông báo chưa đọc: polling `GET /notifications/unread-count` 30–60 giây (TanStack Query `refetchInterval`), không dùng WebSocket.
- Ảnh: prototype lưu data URL trong `localStorage`; API thật upload multipart `POST /images` (≤ 10 MB, JPEG/PNG/WEBP/GIF tĩnh, tối đa 20 ảnh `PENDING`), trả `imageId` và ba URL `original/display/thumbnail`.
- Giới hạn độ dài và số lượng nằm ở `src/lib/utils.ts` (`LIMITS`), khớp NFR-06.13; Frontend nên hiển thị bộ đếm ký tự theo NFR-08.4.

## Kịch bản demo

1. **Người bệnh:** đăng nhập `lan.nguyen` → Đặt câu hỏi kèm ảnh → chuyển sang bác sĩ trả lời → quay lại xem chuông thông báo, vote và lưu.
2. **Bác sĩ:** đăng nhập `bs.tranminhtuan` → Viết bài → Xem trước → Xuất bản → Sửa bài → xem Lịch sử chỉnh sửa.
3. **Xác minh bác sĩ:** `nguyen.binh` nộp hồ sơ → Admin duyệt → huy hiệu xuất hiện → Admin thu hồi → huy hiệu biến mất.
4. **Kiểm duyệt:** Admin mở `/admin/reports` → tiếp nhận → gỡ cascade → tạm khoá tài khoản → xem Audit Log.

## Cấu trúc

```text
src/
  main.tsx        router theo bảng URL của Sitemap
  layouts.tsx     AuthLayout, AppLayout (header 64px / thanh trên + BottomNav mobile), AdminLayout, trang 401/403/404/Suspended, DemoBar
  components/     ui.tsx (Button, Modal, Drawer, Toast...), domain.tsx (QuestionCard, CommentTree, DoctorBadge...)
  mock/           seed.ts, store.ts
  pages/          auth, feed, posts, profile, dv, notifications, admin
```

## Hạn chế đã biết

- Chưa có kiểm thử tự động; mới chạy thủ công kịch bản 1 (xem Feed, chi tiết, thông báo) và gỡ cascade của Admin, cùng bố cục mobile 375px.
- Tab "Dành cho bạn", "Có BS trả lời", ghim câu trả lời bác sĩ và lý do cập nhật Article chưa dựng vì chưa thuộc baseline SRS. Diff View của Article đã có (REQ-SOC-013).
- Màn Cài đặt và Bảo mật: Normal User và Verified Doctor dùng `/settings/security` (đổi mật khẩu, 2FA, Passkey, xoá tài khoản); Admin dùng `/admin/security` trong cổng quản trị, chỉ có mục 2FA ở chế độ bắt buộc (không nút tắt, không Passkey, không đổi mật khẩu hay xoá tài khoản) theo WF-USR-05.
- Ảnh tải lên được thu nhỏ rồi lưu trong `localStorage`, nên dung lượng bị giới hạn.
- 11 cảnh báo `oxlint` còn lại (không có lỗi).
