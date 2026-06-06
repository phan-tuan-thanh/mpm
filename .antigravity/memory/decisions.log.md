# Decisions Log — Antigravity

Lịch sử các quyết định quan trọng trong dự án.

---

<!-- Các entry được tự động thêm bởi post-task hook -->

## [20260606] Tối ưu hóa cấu trúc project module phần backend
- **Quyết định**: Phân tách `ProjectService` thành 4 sub-services (`ProjectCreateService`, `ProjectQueryService`, `ProjectUpdateService`, `ProjectDeleteService`) sử dụng Facade pattern. Tách `ProjectController` thành `ProjectController` (các endpoint ghi) và `ProjectQueryController` (các endpoint đọc).
- **Lý do**: Tuân thủ quy định về kích thước file của dự án (Service < 100 dòng, Controller < 80 dòng) mà không phá vỡ API contract và tính tương thích ngược cho các module đang sử dụng.
- **Kết quả**: Dự án build thành công, 100% test cases pass, tất cả các file sau khi tái cấu trúc đều có kích thước nhỏ hơn giới hạn.
