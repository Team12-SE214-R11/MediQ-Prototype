# MediQ — Prototype

Prototype giao diện thuần frontend của MediQ, chạy bằng dữ liệu giả lưu trong `localStorage`, bao phủ 33 màn hình trong [Screen-Inventory](https://github.com/Team12-SE214-R11/MediQ-Docs/System-Analysis-And-Design/06-UX-UI-Design/03-Wireframes/Screen-Inventory.md). Không có backend.

- Stack: React 19, TypeScript, Vite 8, Tailwind CSS v4 (token khai báo bằng `@theme` trong `src/styles/index.css`), React Router 7, Zustand.
- Token màu, kiểu chữ, bo góc, đổ bóng lấy từ `04-Design-System/Design-Tokens.md`; bảng màu mặc định của Tailwind đã bị xoá để không lọt giá trị ngoài token.

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
| `admin_01@example.com` | Admin | Có 2FA; mã bất kỳ gồm 6 chữ số, trừ `000000` |

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
- Tab "Dành cho bạn", "Có BS trả lời", ghim câu trả lời bác sĩ, Diff View và lý do cập nhật Article chưa dựng vì chưa thuộc baseline SRS.
- Ảnh tải lên được thu nhỏ rồi lưu trong `localStorage`, nên dung lượng bị giới hạn.
- 11 cảnh báo `oxlint` còn lại (không có lỗi).
