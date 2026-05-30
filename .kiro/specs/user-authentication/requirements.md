# Requirements Document

## Introduction

Tài liệu này mô tả các yêu cầu cho tính năng **User Authentication & Authorization** của ứng dụng Agile PM. Đây là tính năng cốt lõi thuộc Phase 1 MVP, cung cấp khả năng xác thực người dùng qua Authentik (OAuth2/OIDC), quản lý phiên làm việc, phân quyền theo vai trò (RBAC), và bảo vệ API endpoints.

## Glossary

- **Authentik**: Hệ thống Identity Provider mã nguồn mở, cung cấp dịch vụ xác thực qua OAuth2/OIDC flow
- **Auth_Service**: Module backend (NestJS) chịu trách nhiệm xử lý authentication và authorization
- **Auth_Client**: Module frontend (Angular) chịu trách nhiệm giao diện đăng nhập, quản lý token phía client
- **Access_Token**: JWT token ngắn hạn dùng để xác thực mỗi API request
- **Refresh_Token**: Token dài hạn dùng để lấy Access_Token mới khi hết hạn
- **RBAC**: Role-Based Access Control — mô hình phân quyền dựa trên vai trò
- **System_Role**: Vai trò cấp hệ thống (Admin, User) áp dụng toàn bộ ứng dụng
- **Project_Role**: Vai trò cấp dự án (Scrum Master, Product Owner, Developer, QA, Stakeholder) áp dụng trong phạm vi một project
- **Session**: Phiên làm việc của người dùng, được quản lý qua token và Redis
- **Rate_Limiter**: Cơ chế giới hạn số lượng request trong một khoảng thời gian
- **Audit_Log**: Bản ghi lịch sử các sự kiện authentication và authorization
- **Guard**: NestJS Guard — middleware bảo vệ API endpoint, kiểm tra authentication và authorization
- **User_Profile**: Thông tin cá nhân của người dùng được lưu trong hệ thống

## Requirements

### Requirement 1: Đăng nhập qua Authentik (SSO)

**User Story:** Là một thành viên dự án, tôi muốn đăng nhập vào Agile PM thông qua Authentik (SSO), để tôi có thể truy cập hệ thống một cách an toàn mà không cần tạo tài khoản riêng.

#### Acceptance Criteria

1. WHEN người dùng truy cập trang đăng nhập, THE Auth_Client SHALL hiển thị nút "Đăng nhập với Authentik"
2. WHEN người dùng nhấn nút "Đăng nhập với Authentik", THE Auth_Client SHALL tạo state parameter ngẫu nhiên, lưu vào session storage, và chuyển hướng đến Authentik authorization endpoint kèm theo state parameter để chống CSRF
3. WHEN Authentik trả về authorization code hợp lệ kèm state parameter khớp với giá trị đã lưu, THE Auth_Service SHALL trao đổi code lấy ID token và access token từ Authentik token endpoint trong thời hạn tối đa 10 giây
4. WHEN Auth_Service nhận được ID token hợp lệ từ Authentik, THE Auth_Service SHALL tạo hoặc cập nhật User_Profile trong PostgreSQL bằng cách ánh xạ các claims: sub (làm external ID), email, name (làm display name), và preferred_username
5. WHEN xác thực thành công, THE Auth_Service SHALL phát hành một cặp Access_Token (JWT, thời hạn 15 phút) và Refresh_Token (thời hạn 7 ngày) cho người dùng
6. WHEN Auth_Client nhận được token thành công, THE Auth_Client SHALL lưu Access_Token trong memory và Refresh_Token trong httpOnly secure cookie, sau đó chuyển hướng người dùng đến trang chính
7. IF Authentik trả về lỗi hoặc authorization code không hợp lệ, THEN THE Auth_Service SHALL trả về HTTP 401 kèm error response chứa mã phân loại lỗi (invalid_code, provider_error) và Auth_Client SHALL hiển thị thông báo lỗi chỉ rõ nguyên nhân (code không hợp lệ hoặc lỗi từ nhà cung cấp)
8. IF ID token từ Authentik có signature không hợp lệ hoặc đã hết hạn, THEN THE Auth_Service SHALL từ chối xác thực và trả về HTTP 401
9. IF state parameter trong callback không khớp với giá trị đã lưu hoặc không tồn tại, THEN THE Auth_Service SHALL từ chối xử lý callback và Auth_Client SHALL chuyển hướng về trang đăng nhập với thông báo lỗi phiên không hợp lệ
10. IF Auth_Service không nhận được phản hồi từ Authentik trong vòng 10 giây, THEN THE Auth_Service SHALL trả về HTTP 502 và Auth_Client SHALL hiển thị thông báo lỗi cho biết hệ thống xác thực không phản hồi

### Requirement 2: Đăng xuất và quản lý Session

**User Story:** Là một người dùng, tôi muốn đăng xuất khỏi hệ thống và quản lý phiên làm việc, để tôi có thể bảo vệ tài khoản khi không sử dụng.

#### Acceptance Criteria

1. WHEN người dùng nhấn nút đăng xuất, THE Auth_Service SHALL thu hồi Refresh_Token hiện tại, xóa session khỏi Redis, và thông báo Authentik end-session endpoint
2. WHEN đăng xuất thành công, THE Auth_Client SHALL xóa Access_Token khỏi memory, xóa Refresh_Token cookie, và chuyển hướng về trang đăng nhập
3. THE Auth_Service SHALL lưu trữ thông tin session (user ID, device info, IP address, thời gian tạo, thời gian hoạt động cuối) trong Redis với TTL bằng thời hạn Refresh_Token (7 ngày), và cập nhật trường "thời gian hoạt động cuối" mỗi khi Access_Token được sử dụng thành công để gọi API
4. WHEN người dùng yêu cầu xem danh sách session, THE Auth_Service SHALL trả về tối đa 50 session đang hoạt động của người dùng đó, mỗi session bao gồm: session ID, device info, IP address, thời gian tạo, thời gian hoạt động cuối, và cờ đánh dấu session hiện tại (is_current)
5. WHEN người dùng yêu cầu thu hồi một session cụ thể, THE Auth_Service SHALL xóa session đó khỏi Redis và thêm Refresh_Token tương ứng vào blacklist
6. IF Refresh_Token hết hạn hoặc nằm trong blacklist, THEN THE Auth_Service SHALL từ chối cấp Access_Token mới và trả về HTTP 401
7. IF Authentik end-session endpoint không phản hồi trong vòng 5 giây hoặc trả về lỗi, THEN THE Auth_Service SHALL vẫn hoàn tất đăng xuất phía local (thu hồi Refresh_Token và xóa session khỏi Redis), ghi Audit_Log cảnh báo, và trả về kết quả đăng xuất thành công cho người dùng

### Requirement 3: JWT Token Management

**User Story:** Là một developer, tôi muốn hệ thống quản lý JWT token một cách an toàn và tự động refresh, để trải nghiệm người dùng liền mạch mà không bị gián đoạn.

#### Acceptance Criteria

1. THE Auth_Service SHALL ký Access_Token bằng thuật toán RS256 với RSA key tối thiểu 2048-bit (private key để ký, public key để xác thực)
2. THE Auth_Service SHALL bao gồm trong Access_Token payload: user ID, email, System_Role, danh sách Project_Role (project ID và role), thời gian phát hành (iat), và thời gian hết hạn (exp)
3. WHEN Access_Token còn dưới 2 phút trước khi hết hạn, THE Auth_Client SHALL tự động gửi request refresh token để lấy Access_Token mới
4. WHEN nhận được Refresh_Token hợp lệ (chưa hết hạn, chưa bị thu hồi, signature hợp lệ), THE Auth_Service SHALL phát hành Access_Token mới và Refresh_Token mới (token rotation), đồng thời thu hồi Refresh_Token cũ trong vòng 1 giây
5. IF một Refresh_Token đã bị thu hồi được sử dụng lại, THEN THE Auth_Service SHALL thu hồi toàn bộ session của người dùng đó (phát hiện token theft) và ghi Audit_Log
6. THE Auth_Service SHALL duy trì danh sách Refresh_Token đã thu hồi trong Redis với TTL bằng thời hạn còn lại của token
7. THE Auth_Service SHALL đảm bảo rằng với mọi Access_Token hợp lệ, việc decode token rồi encode lại với cùng payload và key tạo ra token có cùng claims (round-trip property cho JWT payload)
8. IF request refresh token thất bại (Refresh_Token hết hạn, bị thu hồi, hoặc không hợp lệ), THEN THE Auth_Client SHALL xóa Access_Token khỏi memory, xóa Refresh_Token cookie, và chuyển hướng người dùng về trang đăng nhập trong vòng 2 giây
9. IF Auth_Client gửi nhiều request refresh token đồng thời (do nhiều API call cùng phát hiện token sắp hết hạn), THEN THE Auth_Client SHALL chỉ gửi một request refresh duy nhất và các request còn lại SHALL chờ kết quả từ request đầu tiên

### Requirement 4: Role-Based Access Control (RBAC) cấp hệ thống

**User Story:** Là một Admin, tôi muốn phân quyền theo vai trò cấp hệ thống, để kiểm soát ai có thể truy cập các chức năng quản trị.

#### Acceptance Criteria

1. THE Auth_Service SHALL hỗ trợ hai System_Role: Admin (có quyền truy cập tất cả endpoint quản trị bao gồm: quản lý user, thay đổi System_Role, xem Audit_Log, cấu hình hệ thống) và User (có quyền truy cập các endpoint sử dụng thông thường: xem/cập nhật profile cá nhân, truy cập project được phân quyền, không được truy cập endpoint quản trị)
2. WHEN một người dùng mới được tạo từ Authentik, THE Auth_Service SHALL gán System_Role mặc định là User
3. WHEN Admin thay đổi System_Role của một người dùng, THE Auth_Service SHALL cập nhật role trong database, thu hồi tất cả Access_Token hiện tại của người dùng đó, và ghi Audit_Log bao gồm: user ID của Admin thực hiện, user ID của người bị thay đổi, role cũ, role mới, và timestamp
4. IF Admin cố gắng hạ System_Role của chính mình và đây là Admin duy nhất còn lại trong hệ thống, THEN THE Auth_Service SHALL từ chối thao tác và trả về thông báo lỗi chỉ ra hệ thống phải có ít nhất một Admin
5. IF người dùng không có System_Role Admin gửi request đến endpoint quản trị, THEN THE Auth_Service SHALL trả về HTTP 403 và ghi Audit_Log

### Requirement 5: Project-Level Roles (RBAC cấp dự án)

**User Story:** Là một Scrum Master, tôi muốn phân quyền theo vai trò trong từng project, để mỗi thành viên chỉ có quyền phù hợp với trách nhiệm của họ trong dự án.

#### Acceptance Criteria

1. THE Auth_Service SHALL hỗ trợ các Project_Role: Scrum_Master, Product_Owner, Developer, QA, Stakeholder — mỗi người dùng chỉ được gán tối đa một Project_Role trong cùng một project
2. WHEN người dùng có quyền (Admin hoặc Scrum_Master trong project) thêm một thành viên vào project, THE Auth_Service SHALL gán Project_Role được chỉ định cho thành viên đó trong phạm vi project cụ thể
3. THE Auth_Service SHALL cho phép một người dùng có nhiều Project_Role khác nhau trong các project khác nhau
4. WHEN Guard kiểm tra quyền truy cập tài nguyên thuộc project, THE Auth_Service SHALL tra cứu permission matrix để xác minh Project_Role của người dùng trong project đó có permission tương ứng với action và loại tài nguyên được yêu cầu
5. THE Auth_Service SHALL định nghĩa permission matrix ánh xạ mỗi Project_Role với danh sách action được phép (create, read, update, delete) trên từng loại tài nguyên (task, sprint, document, member), trong đó Stakeholder chỉ có quyền read trên tất cả tài nguyên, Developer và QA có quyền create/read/update trên task và document, Product_Owner có toàn quyền trên task/sprint/document và quyền read trên member, và Scrum_Master có toàn quyền trên tất cả tài nguyên trong project
6. IF người dùng không có Project_Role trong project hoặc Project_Role không có permission cần thiết, THEN THE Auth_Service SHALL trả về HTTP 403 và ghi Audit_Log với thông tin user ID, project ID, action bị từ chối, và tài nguyên đích
7. WHEN Project_Role của một thành viên bị thay đổi hoặc thành viên bị xóa khỏi project, THE Auth_Service SHALL thu hồi Access_Token hiện tại của thành viên đó để buộc lấy token mới với claims cập nhật

### Requirement 6: User Profile Management

**User Story:** Là một người dùng, tôi muốn xem và cập nhật thông tin cá nhân, để hồ sơ của tôi trong hệ thống luôn chính xác.

#### Acceptance Criteria

1. WHEN người dùng yêu cầu xem profile, THE Auth_Service SHALL trả về thông tin: display name, email, avatar URL, System_Role, danh sách project và Project_Role tương ứng
2. WHEN người dùng cập nhật display name hoặc avatar URL, THE Auth_Service SHALL xác nhận display name có độ dài từ 1 đến 100 ký tự và avatar URL là URL hợp lệ với scheme http hoặc https và độ dài tối đa 2048 ký tự, lưu thay đổi vào PostgreSQL, và trả về profile đã cập nhật
3. WHEN người dùng đăng nhập thành công qua Authentik, THE Auth_Service SHALL đồng bộ email từ Authentik vào User_Profile trong PostgreSQL (Authentik là source of truth cho trường email; display name và avatar do người dùng tự quản lý trong hệ thống)
4. IF người dùng cập nhật profile với dữ liệu không hợp lệ (display name rỗng hoặc vượt quá 100 ký tự, avatar URL không đúng scheme http/https hoặc vượt quá 2048 ký tự), THEN THE Auth_Service SHALL trả về HTTP 400 với mô tả lỗi cụ thể cho từng trường không hợp lệ
5. IF người dùng cập nhật profile nhưng không có thay đổi nào so với dữ liệu hiện tại, THEN THE Auth_Service SHALL trả về profile hiện tại mà không thực hiện ghi vào database

### Requirement 7: Mời thành viên vào Project

**User Story:** Là một Scrum Master hoặc Admin, tôi muốn mời thành viên mới vào project, để họ có thể tham gia cộng tác.

#### Acceptance Criteria

1. WHEN người dùng có quyền (Admin hoặc Scrum_Master trong project) gửi lời mời với email hợp lệ và Project_Role dự kiến, THE Auth_Service SHALL tạo invitation record với thông tin: email người được mời, Project_Role dự kiến, project ID, người mời, và thời hạn hết hạn (7 ngày kể từ thời điểm tạo)
2. WHEN invitation được tạo, THE Auth_Service SHALL gửi email thông báo đến người được mời chứa link tham gia với token duy nhất không thể đoán được (tối thiểu 32 ký tự ngẫu nhiên)
3. WHEN người được mời nhấn link và đã đăng nhập, THE Auth_Service SHALL gán Project_Role cho người đó trong project tương ứng, đánh dấu invitation là "accepted", và trả về HTTP 200
4. IF người được mời chưa có tài khoản trong hệ thống, THEN THE Auth_Service SHALL chuyển hướng đến trang đăng nhập Authentik trước, sau đó tự động xử lý invitation sau khi đăng nhập thành công
5. IF invitation đã hết hạn, THEN THE Auth_Service SHALL trả về HTTP 410 với thông báo lỗi chỉ rõ invitation đã hết hạn
6. IF invitation đã được sử dụng, THEN THE Auth_Service SHALL trả về HTTP 409 với thông báo lỗi chỉ rõ invitation đã được chấp nhận trước đó
7. IF email được mời đã là thành viên của project hoặc đã có invitation ở trạng thái pending cho cùng project, THEN THE Auth_Service SHALL từ chối tạo invitation mới và trả về HTTP 409 với thông báo lỗi chỉ rõ lý do trùng lặp
8. WHEN người dùng có quyền yêu cầu xem danh sách invitation của project, THE Auth_Service SHALL trả về tất cả invitation (pending, accepted, expired) của project đó, hỗ trợ phân trang với tối đa 50 records mỗi trang
9. WHEN người dùng có quyền (Admin hoặc Scrum_Master trong project) yêu cầu thu hồi một invitation đang ở trạng thái pending, THE Auth_Service SHALL đánh dấu invitation là "cancelled" và link mời trở nên không hợp lệ

### Requirement 8: Guard và Middleware bảo vệ API

**User Story:** Là một developer, tôi muốn có hệ thống Guard/Middleware bảo vệ tất cả API endpoint, để đảm bảo chỉ người dùng đã xác thực và có quyền mới truy cập được tài nguyên.

#### Acceptance Criteria

1. THE Guard SHALL xác thực Access_Token trong Authorization header (Bearer scheme) cho mọi request đến protected endpoint
2. WHEN Access_Token hợp lệ, THE Guard SHALL gắn thông tin user (ID, email, System_Role, danh sách Project_Role) vào request context để các handler sử dụng
3. IF request không có Authorization header, THEN THE Guard SHALL trả về HTTP 401 với error response chỉ rõ nguyên nhân là thiếu token; IF token hết hạn, THEN THE Guard SHALL trả về HTTP 401 với error response chỉ rõ nguyên nhân là token expired; IF token có signature không hợp lệ hoặc format sai, THEN THE Guard SHALL trả về HTTP 401 với error response chỉ rõ nguyên nhân là token invalid
4. THE Guard SHALL hỗ trợ decorator-based authorization: `@Roles('Admin')` cho System_Role và `@ProjectRoles('Scrum_Master', 'Product_Owner')` cho Project_Role
5. WHEN endpoint yêu cầu Project_Role, THE Guard SHALL trích xuất project ID từ request route params (`:projectId`) hoặc request body field (`projectId`) và kiểm tra quyền của user trong project đó
6. IF endpoint yêu cầu Project_Role nhưng project ID không tồn tại trong request params hoặc body, THEN THE Guard SHALL trả về HTTP 400 với error response chỉ rõ thiếu project ID
7. THE Guard SHALL cho phép đánh dấu endpoint là public (không yêu cầu authentication) thông qua decorator `@Public()`; WHEN request đến endpoint có decorator `@Public()`, THE Guard SHALL bỏ qua xác thực Access_Token
8. IF người dùng có Access_Token hợp lệ nhưng không có System_Role hoặc Project_Role được yêu cầu bởi endpoint, THEN THE Guard SHALL trả về HTTP 403 với error response chỉ rõ nguyên nhân là không đủ quyền
9. THE Auth_Service SHALL xử lý tất cả authentication và authorization trong thời gian dưới 50ms cho mỗi request (không tính network latency đến database)

### Requirement 9: Rate Limiting cho Authentication

**User Story:** Là một Security Engineer, tôi muốn giới hạn số lần thử đăng nhập và gọi API authentication, để bảo vệ hệ thống khỏi brute-force attack.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL giới hạn tối đa 5 lần thử đăng nhập thất bại từ cùng một IP address trong vòng 15 phút, counter chỉ được reset khi TTL hết hạn (đăng nhập thành công không reset counter)
2. THE Rate_Limiter SHALL giới hạn tối đa 10 request refresh token từ cùng một user trong vòng 1 phút
3. WHEN số lần thử vượt quá giới hạn, THE Rate_Limiter SHALL trả về HTTP 429 với header Retry-After chứa số giây còn lại của window hiện tại, và response body chứa thông báo lỗi chỉ rõ loại giới hạn bị vi phạm (login hoặc refresh token)
4. THE Rate_Limiter SHALL sử dụng Redis để lưu trữ counter với TTL tương ứng thời gian giới hạn (15 phút cho login, 1 phút cho refresh token)
5. IF một IP hoặc user bị rate limit, THEN THE Auth_Service SHALL ghi Audit_Log với thông tin: loại rate limit (login/refresh), IP address, user ID (nếu có), timestamp, và số lần thử tại thời điểm vi phạm
6. IF Redis không khả dụng, THEN THE Rate_Limiter SHALL từ chối tất cả authentication request và trả về HTTP 503 với thông báo lỗi cho đến khi kết nối Redis được phục hồi

### Requirement 10: Audit Log cho Authentication Events

**User Story:** Là một Admin, tôi muốn xem lịch sử các sự kiện authentication, để tôi có thể giám sát bảo mật và điều tra sự cố.

#### Acceptance Criteria

1. THE Auth_Service SHALL ghi Audit_Log cho các sự kiện: đăng nhập thành công, đăng nhập thất bại, đăng xuất, refresh token, thay đổi role, thu hồi session, rate limit triggered, và token theft detected
2. THE Auth_Service SHALL lưu trong mỗi Audit_Log record: event type, user ID (nếu có), IP address, user agent, timestamp (UTC, ISO 8601), và metadata bổ sung (project ID, target user ID khi áp dụng)
3. THE Auth_Service SHALL lưu Audit_Log vào PostgreSQL với index trên các trường: user ID, event type, và timestamp
4. WHEN Admin yêu cầu xem Audit_Log, THE Auth_Service SHALL hỗ trợ filter theo user, event type, khoảng thời gian, và phân trang kết quả với page size mặc định 20 records và tối đa 100 records mỗi trang
5. THE Auth_Service SHALL giữ lại Audit_Log tối thiểu 90 ngày trước khi cho phép archival
6. IF việc ghi Audit_Log thất bại, THEN THE Auth_Service SHALL không chặn operation gốc đang được log, và SHALL ghi lỗi vào hệ thống logging riêng để phát hiện sự cố
7. IF người dùng không có System_Role Admin yêu cầu truy cập Audit_Log endpoint, THEN THE Auth_Service SHALL trả về HTTP 403
8. WHEN Admin yêu cầu xem Audit_Log với filter không khớp record nào, THE Auth_Service SHALL trả về danh sách rỗng với tổng số record bằng 0 và metadata phân trang

### Requirement 11: Session Invalidation khi thay đổi bảo mật

**User Story:** Là một người dùng, tôi muốn tất cả session bị thu hồi khi có thay đổi bảo mật quan trọng, để tài khoản của tôi được bảo vệ nếu bị xâm phạm.

#### Acceptance Criteria

1. WHEN Authentik thông báo password change event (qua webhook hoặc khi user đăng nhập lại), THE Auth_Service SHALL thu hồi tất cả Refresh_Token, thêm user ID vào danh sách forced-logout trong Redis (TTL bằng thời hạn Access_Token còn lại tối đa 15 phút), và xóa tất cả session của người dùng đó khỏi Redis trong vòng 5 giây kể từ khi nhận event
2. WHEN Admin thu hồi quyền truy cập của một người dùng (disable account), THE Auth_Service SHALL thu hồi tất cả Refresh_Token, thêm user ID vào danh sách forced-logout trong Redis, và xóa tất cả session của người dùng đó khỏi Redis trong vòng 5 giây kể từ khi Admin xác nhận hành động
3. WHEN token theft được phát hiện (Refresh_Token đã thu hồi bị sử dụng lại), THE Auth_Service SHALL thu hồi toàn bộ token family, thêm user ID vào danh sách forced-logout trong Redis, xóa tất cả session của người dùng, và ghi Audit_Log với event type "token_theft_detected"
4. WHEN Auth_Client nhận HTTP 401 response từ bất kỳ API request nào sau session invalidation, THE Auth_Client SHALL xóa Access_Token khỏi memory, xóa Refresh_Token cookie, và chuyển hướng người dùng về trang đăng nhập với thông báo cho biết phiên đã hết hạn do thay đổi bảo mật
5. WHILE user ID nằm trong danh sách forced-logout trên Redis, THE Guard SHALL từ chối mọi request với Access_Token của user đó và trả về HTTP 401, bất kể Access_Token chưa hết hạn
6. WHEN session invalidation hoàn tất do bất kỳ trigger nào (password change, disable account, token theft), THE Auth_Service SHALL ghi Audit_Log với event type tương ứng, user ID, trigger source, và số lượng session bị thu hồi

### Requirement 12: Secure Token Storage và Transport

**User Story:** Là một Security Engineer, tôi muốn token được lưu trữ và truyền tải an toàn, để giảm thiểu rủi ro bị đánh cắp token.

#### Acceptance Criteria

1. THE Auth_Client SHALL lưu Access_Token chỉ trong memory (JavaScript variable), không lưu vào localStorage hoặc sessionStorage
2. THE Auth_Client SHALL lưu Refresh_Token trong httpOnly cookie với các flag: Secure, SameSite=Strict, Path=/api/auth/refresh, Max-Age bằng thời hạn Refresh_Token (7 ngày tính bằng giây: 604800)
3. WHILE Auth_Service hoạt động trong môi trường production, THE Auth_Service SHALL từ chối mọi request không qua HTTPS và trả về HTTP 301 redirect đến HTTPS URL tương ứng
4. THE Auth_Service SHALL bao gồm các security header trong mọi response: X-Content-Type-Options với giá trị nosniff, X-Frame-Options với giá trị DENY, Strict-Transport-Security với giá trị max-age=31536000 và includeSubDomains
5. THE Auth_Service SHALL thiết lập CORS policy chỉ cho phép origin từ danh sách domain frontend được cấu hình trong biến môi trường
6. IF request đến từ origin không được phép, THEN THE Auth_Service SHALL từ chối request và trả về HTTP 403 kèm CORS error header, không bao gồm Access-Control-Allow-Origin trong response
