# Project Settings Tab UI Consistency Bugfix Design

## Overview

Trang "Cài đặt dự án" dùng layout cha (`GeneralTabComponent`) gồm header chung "Cài đặt dự án" + mô tả + thanh tab điều hướng, và một `router-outlet` để render từng tab con (Cấu hình chung, Cấu hình Sprint, Trạng thái, Ước lượng, Mức ưu tiên, Labels, Thành viên, Tính năng, Danger Zone).

Hiện tại nhiều tab con tự render lại một khối **tiêu đề + mô tả cấp trang** riêng (ví dụ "Trạng thái (States)" + "Cấu hình quy trình làm việc cho dự án...") — thông tin này đã được trang cha thể hiện qua header chung và thanh tab đang active, nên gây dư thừa thị giác. Đồng thời mỗi tab con dùng một mức **spacing gốc** khác nhau (`space-y-6` / `space-y-5` / `space-y-4`), khiến nhịp khoảng cách từ thanh tab xuống vùng nội dung và giữa các phần tử bị lệch khi chuyển tab.

Đây là bug thuần UI (consistency), không thay đổi logic nghiệp vụ. Chiến lược fix: lấy `general-info-tab` (vốn không có khối header trang lặp) làm chuẩn, **bỏ khối tiêu đề + mô tả cấp trang lặp** trong 7 tab con, và **thống nhất spacing gốc** về một token duy nhất cho mọi tab con — đồng thời **giữ nguyên** các nút hành động, tiêu đề cấp section/card và toàn bộ logic CRUD.

## Glossary

- **Bug_Condition (C)**: Điều kiện kích hoạt bug — một tab con render khối tiêu đề + mô tả **cấp trang** lặp lại, hoặc dùng spacing gốc khác token chuẩn.
- **Property (P)**: Hành vi đúng mong muốn — tab con không hiển thị header cấp trang lặp; ngữ cảnh tab chỉ do header chung của trang cha + thanh tab active thể hiện; spacing gốc đồng nhất ở mọi tab.
- **Preservation**: Hành vi phải giữ nguyên — nút hành động cùng hàng tiêu đề cũ, tiêu đề cấp section/card hợp lệ bên trong nội dung, logic CRUD nghiệp vụ, header chung + thanh tab của trang cha.
- **Page-level header (header cấp trang)**: Khối `<h2>` tiêu đề trùng tên tab + đoạn `<p>` mô tả tab, đặt ở đầu template tab con — lặp lại ngữ cảnh mà trang cha đã thể hiện.
- **Section/card header (tiêu đề cấp section)**: Tiêu đề bên trong nội dung tab (ví dụ "Nhận diện dự án", "Workspace Template", tên nhóm trạng thái, "Xem trước (Preview)") — là nội dung hợp lệ, KHÔNG phải header trang.
- **Root spacing (spacing gốc)**: Tiện ích Tailwind điều khiển khoảng cách dọc giữa các con trực tiếp của container ngoài cùng trong template tab con (`space-y-*`).
- **Standard tab (`general-info-tab`)**: Tab chuẩn — không có khối header cấp trang lặp, dùng nhịp spacing `5` (`space-y-5` / `gap-5`).
- **Affected tabs**: 7 tab con cần sửa — `states-tab`, `priorities-tab`, `estimates-tab`, `features-tab`, `labels-tab`, `members-tab`, `danger-zone-tab`.

## Bug Details

### Bug Condition

Bug xuất hiện khi một tab con (khác `general-info-tab`) được render và (a) chứa khối tiêu đề + mô tả **cấp trang** lặp lại thông tin của header cha/thanh tab, và/hoặc (b) container ngoài cùng dùng `root spacing` khác token chuẩn của `general-info-tab`. Khi đó nhịp khoảng cách từ thanh tab xuống nội dung và giữa các phần tử bị lệch giữa các tab, kèm thông tin tiêu đề bị lặp.

**Formal Specification:**
```
FUNCTION isBugCondition(tab)
  INPUT: tab of type ChildTabRender   // trạng thái render của một tab con
  OUTPUT: boolean

  // general-info-tab là chuẩn, luôn coi là đã đúng
  IF tab.name == 'general-info-tab' THEN
    RETURN false
  END IF

  hasDuplicatePageHeader :=
        tab.rendersPageLevelTitle == true
    AND tab.pageLevelTitleDuplicatesParentContext == true

  hasInconsistentRootSpacing :=
        tab.rootSpacingToken != STANDARD_ROOT_SPACING   // STANDARD = 'space-y-5'

  RETURN hasDuplicatePageHeader OR hasInconsistentRootSpacing
END FUNCTION
```

### Examples

- **states-tab**: render `<h2>Trạng thái (States)</h2>` + `<p>Cấu hình quy trình làm việc cho dự án (tối đa 20 trạng thái).</p>` ở đầu template, root `space-y-6` → kỳ vọng: bỏ khối header trang, root về `space-y-5`.
- **estimates-tab**: render `<h2>Ước lượng (Estimates)</h2>` + mô tả, root `space-y-5` → kỳ vọng: bỏ khối header trang; root đã đúng token `5`.
- **features-tab**: render `<h2>Tính năng (Feature Flags)</h2>` + mô tả, root `space-y-4` → kỳ vọng: bỏ khối header trang, root về `space-y-5`.
- **members-tab**: hàng header chứa `<h2>Thành viên dự án</h2>` + mô tả **cùng hàng** với ô search và nút "Thêm thành viên" → kỳ vọng: bỏ phần tiêu đề + mô tả, **giữ nguyên** ô search + nút "Thêm thành viên"; root `space-y-4` → `space-y-5`.
- **labels-tab**: hàng header chứa `<h2>Labels</h2>` + mô tả cùng hàng với cụm nút bulk-delete → kỳ vọng: bỏ tiêu đề + mô tả, **giữ nguyên** cụm bulk-delete; root `space-y-6` → `space-y-5`.
- **priorities-tab**: hàng header chứa `<h2>Mức ưu tiên</h2>` + mô tả cùng hàng nút "Thêm mức" → kỳ vọng: bỏ tiêu đề + mô tả, **giữ nguyên** nút "Thêm mức"; root `space-y-6` → `space-y-5`.
- **danger-zone-tab**: render `<h2>Danger Zone</h2>` + mô tả, root `space-y-4` → kỳ vọng: bỏ khối header trang, root về `space-y-5`.
- **general-info-tab (edge / chuẩn)**: không có header trang lặp, nhịp spacing `5` → `isBugCondition` trả về `false`, không bị tác động.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Các nút hành động nằm cùng hàng với tiêu đề cũ phải tiếp tục hiển thị và giữ nguyên chức năng: ô tìm kiếm + nút "Thêm thành viên" (members-tab), cụm nút bulk-delete + "bỏ chọn" (labels-tab), nút "Thêm mức" (priorities-tab), nút "Áp dụng lại template" cấp section (states-tab).
- Các tiêu đề cấp section/card hợp lệ bên trong nội dung phải giữ nguyên: "Nhận diện dự án", "Mô tả", "Thông tin dự án" (general-info), tên nhóm trạng thái + "Workspace Template" (states), "Xem trước (Preview)" (estimates), v.v.
- Toàn bộ logic CRUD nghiệp vụ giữ nguyên: tạo/sửa/xóa/sắp xếp trạng thái, mức ưu tiên, labels, thành viên; cấu hình ước lượng; bật/tắt tính năng; lưu trữ/xóa dự án; mọi confirm dialog, toast, drag-drop, phân trang, lọc.
- Header chung "Cài đặt dự án" + mô tả + thanh tab điều hướng và chỉ báo tab active của trang cha (`GeneralTabComponent`) giữ nguyên.
- `general-info-tab` giữ nguyên nội dung và đồng nhất spacing với các tab khác.

**Scope:**
Mọi yếu tố KHÔNG phải "khối tiêu đề + mô tả cấp trang lặp" và KHÔNG phải "root spacing token" đều phải hoàn toàn không bị ảnh hưởng bởi fix này, bao gồm:
- Các nút hành động và điều khiển tương tác (search, add, bulk-delete, toggle, drag handle).
- Tiêu đề cấp section/card và mô tả cấp section.
- Logic component (signals, services, store), template binding nghiệp vụ và spacing nội bộ trong từng section/card.

**Note:** Hành vi đúng mong muốn được định nghĩa chính thức trong mục Correctness Properties (Property 1). Mục này tập trung vào những gì KHÔNG được thay đổi.

## Hypothesized Root Cause

Bug này thuần về cấu trúc template, không liên quan logic. Các nguyên nhân gốc khả dĩ:

1. **Lặp khối header cấp trang trong từng tab con**: Mỗi tab con được viết độc lập và tự thêm `<h2>` + `<p>` mô tả ở đầu template để "tự giải thích", trùng với header chung + thanh tab active của trang cha. Không có quy ước chung rằng ngữ cảnh tab chỉ do trang cha thể hiện.

2. **Không có token spacing gốc thống nhất**: Mỗi tab con tự chọn `space-y-*` theo cảm tính (`space-y-6` ở states/priorities/labels, `space-y-5` ở estimates, `space-y-4` ở features/members/danger-zone), dẫn đến nhịp dọc khác nhau giữa các tab.

3. **Header + nút hành động bị gộp trong cùng một flex-row**: Ở members/labels/priorities, tiêu đề trang và nút hành động nằm chung một container header. Việc bỏ nhầm cả cụm có thể vô tình xóa nút hành động → cần tách cẩn thận, chỉ bỏ phần tiêu đề + mô tả.

4. **Thiếu chuẩn UI tham chiếu rõ ràng**: `general-info-tab` đã đúng nhưng không được nêu là khuôn mẫu nên các tab khác không noi theo.

## Correctness Properties

Property 1: Bug Condition - Loại bỏ header cấp trang lặp & đồng nhất spacing

_For any_ tab con thỏa điều kiện bug (`isBugCondition` trả về `true` — thuộc nhóm affected tabs có header cấp trang lặp và/hoặc root spacing lệch chuẩn), sau khi fix component đó SHALL không còn render khối tiêu đề + mô tả **cấp trang** lặp lại (ngữ cảnh tab chỉ do header chung của trang cha + thanh tab active thể hiện) VÀ container ngoài cùng SHALL dùng đúng token `root spacing` chuẩn (`space-y-5`) giống `general-info-tab`, để khoảng cách từ thanh tab xuống nội dung và nhịp giữa các phần tử đồng nhất ở mọi tab.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Giữ nguyên nút hành động, tiêu đề section, logic nghiệp vụ và layout cha

_For any_ phần tử KHÔNG thỏa điều kiện bug (`isBugCondition` trả về `false` — bao gồm `general-info-tab`, các nút hành động cùng hàng tiêu đề cũ, tiêu đề cấp section/card, logic CRUD, và header chung + thanh tab của trang cha), sau khi fix hệ thống SHALL cho ra kết quả render và hành vi giống hệt trước khi fix, giữ nguyên hiển thị lẫn chức năng của các yếu tố này.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Giả định phân tích root cause đúng. Chuẩn tham chiếu là `general-info-tab` với `STANDARD_ROOT_SPACING = space-y-5`.

**Files** (thư mục `apps/frontend/src/app/projects/pages/project-settings/`):
- `states-tab/states-tab.component.html`
- `priorities-tab/priorities-tab.component.html`
- `estimates-tab/estimates-tab.component.ts` (template inline)
- `features-tab/features-tab.component.ts` (template inline)
- `labels-tab/labels-tab.component.ts` (template inline)
- `members-tab/members-tab.component.ts` (template inline)
- `danger-zone-tab/danger-zone-tab.component.ts` (template inline)

**Specific Changes:**

1. **Bỏ khối header cấp trang ở tab chỉ có tiêu đề (states, estimates, features, danger-zone)**: Xóa khối `<div><h2>...</h2><p>...</p></div>` (và `<div class="flex ...">` chỉ-bọc-header nếu nó không chứa gì khác) ở đầu template. KHÔNG đụng tới phần nội dung phía sau.

2. **Tách header khỏi nút hành động ở tab có nút cùng hàng (members, labels, priorities)**: Trong container flex header, **chỉ xóa** phần `<div>` chứa `<h2>` tiêu đề + `<p>` mô tả; **giữ nguyên** cụm nút hành động (search + "Thêm thành viên"; bulk-delete + "bỏ chọn"; "Thêm mức"). Cụm nút hành động được nâng lên làm phần tử con trực tiếp của root (hoặc giữ trong container đã bỏ căn `justify-between` cho phù hợp), đảm bảo vẫn hiển thị và hoạt động.

3. **Đồng nhất root spacing**: Đặt container ngoài cùng của mọi affected tab về `space-y-5`:
   - `space-y-6` → `space-y-5`: states, priorities, labels.
   - `space-y-4` → `space-y-5`: features, members, danger-zone.
   - estimates: đã là `space-y-5`, giữ nguyên token, chỉ bỏ header.

4. **Giữ nguyên toàn bộ phần còn lại**: Không thay đổi logic TypeScript (signals, computed, services, store), template binding nghiệp vụ, dialog, toast, drag-drop, phân trang, lọc, tiêu đề cấp section/card và spacing nội bộ trong section/card.

5. **Không đổi trang cha**: `GeneralTabComponent` và `ProjectSettingsComponent` giữ nguyên (header chung + thanh tab + outlet); `general-info-tab` giữ nguyên (đã là chuẩn).

## Testing Strategy

### Validation Approach

Chiến lược kiểm thử theo hai pha: trước tiên dựng các kiểm tra phơi bày bug trên code CHƯA fix (header cấp trang còn tồn tại, spacing lệch), sau đó xác minh fix làm đúng kỳ vọng và bảo toàn hành vi hiện hữu. Vì đây là bug UI cấu trúc template Angular, kiểm thử dựa trên render component (TestBed) và truy vấn DOM/class.

### Exploratory Bug Condition Checking

**Goal**: Phơi bày counterexample chứng minh bug TRƯỚC khi fix; xác nhận hoặc bác bỏ root cause. Nếu bác bỏ thì cần tái-giả-thuyết.

**Test Plan**: Render từng affected tab qua TestBed, truy vấn DOM để (a) phát hiện khối tiêu đề cấp trang lặp ở đầu template, và (b) đọc class `space-y-*` của container ngoài cùng. Chạy trên code CHƯA fix để quan sát thất bại.

**Test Cases**:
1. **states-tab page-header present**: assert KHÔNG còn `<h2>` chứa "Trạng thái (States)" ở đầu tab (sẽ fail trên code chưa fix).
2. **features-tab page-header present**: assert KHÔNG còn `<h2>` chứa "Tính năng (Feature Flags)" ở đầu tab (sẽ fail trên code chưa fix).
3. **root spacing inconsistency**: assert root spacing của states/priorities/labels/features/members/danger-zone == `space-y-5` (sẽ fail vì đang là `space-y-6`/`space-y-4`).
4. **edge — general-info-tab**: assert không có header cấp trang lặp và root spacing == chuẩn (đã đúng từ trước).

**Expected Counterexamples**:
- Tồn tại `<h2>` tiêu đề cấp trang ở đầu các affected tab.
- Token `space-y-*` của root khác `space-y-5`.
- Nguyên nhân khả dĩ: lặp header trong từng tab, thiếu token spacing chuẩn, header gộp chung flex-row với nút hành động.

### Fix Checking

**Goal**: Xác minh rằng với mọi tab thỏa điều kiện bug, component sau khi fix cho ra hành vi đúng kỳ vọng (không header trang lặp + spacing chuẩn).

**Pseudocode:**
```
FOR ALL tab WHERE isBugCondition(tab) DO
  result := renderFixedTab(tab)
  ASSERT NOT result.hasDuplicatePageHeader
  ASSERT result.rootSpacingToken == STANDARD_ROOT_SPACING   // 'space-y-5'
END FOR
```

### Preservation Checking

**Goal**: Xác minh rằng với mọi yếu tố KHÔNG thỏa điều kiện bug, component sau khi fix cho ra kết quả giống trước khi fix.

**Pseudocode:**
```
FOR ALL element WHERE NOT isBugCondition(element) DO
  ASSERT renderOriginal(element) == renderFixed(element)
END FOR
```

**Testing Approach**: Property-based testing phù hợp cho preservation vì:
- Tự sinh nhiều tổ hợp trạng thái (read-only / có quyền, danh sách rỗng / nhiều phần tử, có / không có selection) để kiểm tra sự hiện diện và chức năng của nút hành động + tiêu đề section qua nhiều kịch bản.
- Bắt được edge case mà unit test thủ công dễ bỏ sót.
- Cung cấp đảm bảo mạnh rằng hành vi không đổi cho mọi yếu tố ngoài phạm vi fix.

**Test Plan**: Quan sát hành vi trên code CHƯA fix cho các nút hành động, tiêu đề section và luồng CRUD, sau đó viết test (gồm property-based) chụp lại hành vi đó và kiểm tra nó tiếp tục đúng sau fix.

**Test Cases**:
1. **Members action controls preserved**: Quan sát ô search + nút "Thêm thành viên" hoạt động trên code chưa fix, viết test xác nhận chúng vẫn hiển thị + mở dialog/đổi filter sau fix.
2. **Labels bulk-delete preserved**: Quan sát cụm bulk-delete + "bỏ chọn" hiển thị khi có selection trên code chưa fix, viết test xác nhận vẫn đúng sau fix.
3. **Priorities add button preserved**: Quan sát nút "Thêm mức" mở form thêm trên code chưa fix, viết test xác nhận vẫn đúng sau fix.
4. **Section/card titles preserved**: Quan sát "Workspace Template", tên nhóm trạng thái, "Xem trước (Preview)" hiển thị trên code chưa fix, viết test xác nhận vẫn còn sau fix.
5. **general-info-tab unchanged**: Xác nhận tab chuẩn render giống hệt trước/sau fix.

### Unit Tests

- Render từng affected tab và assert vắng mặt header cấp trang lặp.
- Assert root spacing token == `space-y-5` cho mọi affected tab.
- Assert sự hiện diện của các nút hành động + tiêu đề section trong từng tab tương ứng.
- Test trạng thái read-only vs có quyền để chắc nút hành động ẩn/hiện đúng như trước.

### Property-Based Tests

- Sinh ngẫu nhiên tổ hợp (quyền, kích thước danh sách, trạng thái selection) và xác minh các nút hành động + tiêu đề section giữ nguyên hành vi qua mọi tổ hợp.
- Sinh ngẫu nhiên tập affected tab và xác minh bất biến "không header trang lặp + root spacing == chuẩn".
- Sinh ngẫu nhiên thao tác CRUD giả lập và xác minh handler component được gọi đúng như trước fix.

### Integration Tests

- Điều hướng đầy đủ qua từng tab con trong trang Cài đặt dự án và xác nhận khoảng cách từ thanh tab xuống nội dung đồng nhất, không còn header trang lặp.
- Chuyển qua lại giữa các tab và xác nhận thanh tab active + header chung của trang cha giữ nguyên, nhịp spacing nhất quán.
- Thực thi một luồng nghiệp vụ tiêu biểu mỗi tab (thêm thành viên, thêm/xóa label, thêm mức ưu tiên, đổi cấu hình ước lượng, bật/tắt tính năng, lưu trữ dự án) để xác nhận logic không đổi sau fix.
