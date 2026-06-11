# Bugfix Requirements Document

## Introduction

Trang "Cài đặt dự án" (Project Settings) ở frontend Angular sử dụng một layout tab cha (`general-tab.component`) chứa header chung "Cài đặt dự án" + mô tả + thanh tab điều hướng, và một `router-outlet` để render từng tab con (Cấu hình chung, Cấu hình Sprint, Trạng thái, Ước lượng, Mức ưu tiên, Labels, Thành viên, Tính năng, Danger Zone).

Hiện tại cách trình bày giữa các tab con không đồng nhất, gây ra hai vấn đề giao diện:

1. **Header/mô tả lặp lại:** Nhiều tab con tự render lại một khối tiêu đề + mô tả cấp trang riêng (ví dụ tab "Trạng thái" hiển thị "Trạng thái (States)" + "Cấu hình quy trình làm việc cho dự án (tối đa 20 trạng thái)"). Khối này lặp lại thông tin mà trang cha đã thể hiện qua header chung và thanh tab đang active, gây dư thừa thị giác.

2. **Padding/spacing không đồng nhất:** Mỗi tab con dùng một mức spacing gốc khác nhau (ví dụ `space-y-6`, `space-y-5`, `space-y-4`), khiến khoảng cách từ thanh tab xuống vùng nội dung bị lệch khi chuyển qua lại giữa các tab.

Đây là bug thuần giao diện (UI consistency), không thay đổi logic nghiệp vụ. Mục tiêu là thống nhất cách trình bày tất cả các tab: bỏ header/mô tả thừa cấp trang trong từng tab con và căn padding/spacing đồng nhất giữa thanh tab và vùng nội dung.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN người dùng mở một tab con có khối tiêu đề + mô tả cấp trang riêng (Trạng thái, Mức ưu tiên, Ước lượng, Tính năng, Labels, Thành viên, Danger Zone) THEN hệ thống hiển thị lại tiêu đề + mô tả lặp với ngữ cảnh mà trang cha và thanh tab active đã thể hiện

1.2 WHEN người dùng chuyển qua lại giữa các tab con có mức spacing gốc khác nhau (`space-y-6` ở Trạng thái/Mức ưu tiên/Labels, `space-y-5` ở Ước lượng, `space-y-4` ở Tính năng/Thành viên/Danger Zone) THEN hệ thống hiển thị khoảng cách từ thanh tab xuống vùng nội dung bị lệch giữa các tab

### Expected Behavior (Correct)

2.1 WHEN người dùng mở một tab con THEN hệ thống SHALL không hiển thị khối tiêu đề + mô tả cấp trang lặp lại; ngữ cảnh tab chỉ được thể hiện bởi header chung của trang cha và thanh tab đang active

2.2 WHEN người dùng chuyển qua lại giữa các tab con THEN hệ thống SHALL hiển thị khoảng cách (padding/spacing) từ thanh tab xuống vùng nội dung đồng nhất ở mọi tab

### Unchanged Behavior (Regression Prevention)

3.1 WHEN một tab con chứa các điều khiển hành động nằm cùng hàng với tiêu đề cũ (ô tìm kiếm và nút "Thêm thành viên" ở tab Thành viên, nút bulk-delete ở tab Labels, nút "Thêm mức" ở tab Mức ưu tiên) THEN hệ thống SHALL CONTINUE TO hiển thị và giữ nguyên chức năng của các điều khiển đó

3.2 WHEN một tab con hiển thị các tiêu đề cấp section/card bên trong nội dung (ví dụ "Nhận diện dự án", "Mô tả", "Thông tin dự án" ở tab Cấu hình chung, tên nhóm trạng thái ở tab Trạng thái, "Workspace Template", "Xem trước (Preview)") THEN hệ thống SHALL CONTINUE TO hiển thị các tiêu đề cấp section/card đó vì chúng là nội dung hợp lệ, không phải header trang lặp lại

3.3 WHEN người dùng thực hiện các thao tác nghiệp vụ trên từng tab (tạo/sửa/xóa/sắp xếp trạng thái, mức ưu tiên, labels, thành viên; cấu hình ước lượng; bật/tắt tính năng; lưu trữ/xóa dự án) THEN hệ thống SHALL CONTINUE TO hoạt động đúng như trước, không thay đổi logic nghiệp vụ

3.4 WHEN trang cha "Cài đặt dự án" được render THEN hệ thống SHALL CONTINUE TO hiển thị header chung "Cài đặt dự án" + mô tả + thanh tab điều hướng và chỉ báo tab đang active như hiện tại

3.5 WHEN người dùng mở tab "Cấu hình chung" (general-info-tab) vốn đã không có khối header trang lặp lại THEN hệ thống SHALL CONTINUE TO hiển thị nội dung tab đúng và đồng nhất spacing với các tab khác
