export type IconContext = 'priority' | 'sprint' | 'project' | 'state';

export interface IconItem { icon: string; label: string; name: string }
export interface IconGroup {
  label: string;
  /** Nhóm hiển thị trong những context nào; bỏ trống = mọi context */
  contexts?: IconContext[];
  icons: IconItem[];
}

/**
 * Kho icon dùng chung toàn app (PrimeIcons — bundled, license MIT).
 * Mọi icon picker (priority, sprint, project...) đều dùng danh sách này,
 * lọc theo context — KHÔNG tự khai báo danh sách icon riêng trong component.
 */
export const ICON_GROUPS: IconGroup[] = [
  {
    label: 'Flag / Priority',
    contexts: ['priority', 'sprint'],
    icons: [
      { icon: 'pi pi-flag',        label: 'Cờ',        name: 'flag cờ ưu tiên' },
      { icon: 'pi pi-flag-fill',   label: 'Cờ đậm',    name: 'flag fill cờ đậm' },
      { icon: 'pi pi-bookmark',    label: 'Đánh dấu',  name: 'bookmark đánh dấu' },
      { icon: 'pi pi-star',        label: 'Sao',        name: 'star sao' },
      { icon: 'pi pi-heart',       label: 'Tim',        name: 'heart tim yêu thích' },
      { icon: 'pi pi-thumbs-up',   label: 'Tốt',        name: 'thumbs-up đồng ý tốt' },
      { icon: 'pi pi-thumbs-down', label: 'Không tốt', name: 'thumbs-down không đồng ý' },
    ],
  },
  {
    label: 'Alert',
    contexts: ['priority'],
    icons: [
      { icon: 'pi pi-bolt',                  label: 'Tia sét',   name: 'bolt tia sét khẩn cấp' },
      { icon: 'pi pi-exclamation-triangle',  label: 'Nguy hiểm', name: 'exclamation triangle cảnh báo nguy hiểm' },
      { icon: 'pi pi-exclamation-circle',    label: 'Chú ý',     name: 'exclamation circle chú ý lưu ý' },
      { icon: 'pi pi-ban',                   label: 'Cấm',       name: 'ban cấm chặn' },
      { icon: 'pi pi-times-circle',          label: 'Lỗi',       name: 'times circle xóa lỗi' },
    ],
  },
  {
    label: 'Sprint / Agile',
    contexts: ['sprint'],
    icons: [
      { icon: 'pi pi-sync',      label: 'Lặp',       name: 'sync vòng lặp iteration sprint' },
      { icon: 'pi pi-refresh',   label: 'Làm mới',   name: 'refresh làm mới chu kỳ cycle' },
      { icon: 'pi pi-forward',   label: 'Tiến',      name: 'forward tiến tới' },
      { icon: 'pi pi-bolt',      label: 'Tia sét',   name: 'bolt tốc độ nhanh' },
      { icon: 'pi pi-compass',   label: 'La bàn',    name: 'compass la bàn định hướng' },
      { icon: 'pi pi-send',      label: 'Gửi',       name: 'send gửi phóng' },
      { icon: 'pi pi-bullseye',  label: 'Mục tiêu',  name: 'bullseye mục tiêu target' },
      { icon: 'pi pi-calendar',  label: 'Lịch',      name: 'calendar lịch thời gian' },
      { icon: 'pi pi-stopwatch', label: 'Bấm giờ',   name: 'stopwatch bấm giờ timebox' },
      { icon: 'pi pi-history',   label: 'Lịch sử',   name: 'history lịch sử chu kỳ' },
      { icon: 'pi pi-gauge',     label: 'Tốc độ',    name: 'gauge velocity tốc độ' },
      { icon: 'pi pi-trophy',    label: 'Cúp',       name: 'trophy cúp thành tích goal' },
    ],
  },
  {
    label: 'Project',
    contexts: ['project'],
    icons: [
      { icon: 'pi pi-folder',         label: 'Thư mục',   name: 'folder thư mục' },
      { icon: 'pi pi-folder-open',    label: 'Mở',        name: 'folder open thư mục mở' },
      { icon: 'pi pi-briefcase',      label: 'Cặp',       name: 'briefcase cặp công việc' },
      { icon: 'pi pi-building',       label: 'Tòa nhà',   name: 'building tòa nhà công ty' },
      { icon: 'pi pi-box',            label: 'Hộp',       name: 'box hộp module' },
      { icon: 'pi pi-globe',          label: 'Toàn cầu',  name: 'globe toàn cầu web' },
      { icon: 'pi pi-sitemap',        label: 'Sơ đồ',     name: 'sitemap sơ đồ cấu trúc' },
      { icon: 'pi pi-book',           label: 'Sách',      name: 'book sách tài liệu' },
      { icon: 'pi pi-database',       label: 'Dữ liệu',   name: 'database dữ liệu' },
      { icon: 'pi pi-server',         label: 'Server',    name: 'server máy chủ' },
      { icon: 'pi pi-shield',         label: 'Khiên',     name: 'shield khiên bảo mật' },
      { icon: 'pi pi-lightbulb',      label: 'Ý tưởng',   name: 'lightbulb ý tưởng sáng tạo' },
    ],
  },
  {
    label: 'Status',
    contexts: ['priority', 'sprint', 'project', 'state'],
    icons: [
      { icon: 'pi pi-check-circle',  label: 'Xong',      name: 'check circle hoàn thành xong' },
      { icon: 'pi pi-clock',         label: 'Đồng hồ',   name: 'clock đồng hồ thời gian' },
      { icon: 'pi pi-pause-circle',  label: 'Tạm dừng',  name: 'pause circle tạm dừng' },
      { icon: 'pi pi-play',          label: 'Phát',       name: 'play phát bắt đầu' },
      { icon: 'pi pi-stop-circle',   label: 'Dừng',       name: 'stop circle dừng' },
    ],
  },
  {
    label: 'Arrow',
    contexts: ['priority'],
    icons: [
      { icon: 'pi pi-arrow-up',          label: 'Lên',       name: 'arrow up mũi tên lên cao' },
      { icon: 'pi pi-arrow-down',        label: 'Xuống',     name: 'arrow down mũi tên xuống thấp' },
      { icon: 'pi pi-arrow-right',       label: 'Phải',      name: 'arrow right mũi tên phải' },
      { icon: 'pi pi-angle-double-up',   label: 'Rất cao',   name: 'angle double up khẩn cấp rất cao' },
      { icon: 'pi pi-angle-double-down', label: 'Rất thấp',  name: 'angle double down rất thấp' },
    ],
  },
  {
    label: 'General',
    icons: [
      { icon: 'pi pi-circle',      label: 'Tròn',      name: 'circle vòng tròn' },
      { icon: 'pi pi-minus',       label: 'Ngang',     name: 'minus gạch ngang trung bình' },
      { icon: 'pi pi-ellipsis-h',  label: 'Ba chấm',   name: 'ellipsis horizontal ba chấm' },
      { icon: 'pi pi-tag',         label: 'Nhãn',      name: 'tag nhãn' },
      { icon: 'pi pi-tags',        label: 'Nhiều nhãn', name: 'tags nhãn nhiều' },
      { icon: 'pi pi-info-circle', label: 'Thông tin', name: 'info circle thông tin' },
    ],
  },
];

export interface EmojiItem { emoji: string; label: string; name: string }
export interface EmojiGroup {
  label: string;
  icons: EmojiItem[];
}

export const EMOJI_GROUPS: EmojiGroup[] = [
  {
    label: 'Công việc & Công nghệ',
    icons: [
      { emoji: '🚀', label: 'Tên lửa', name: 'ten lua rocket start khoi nghiep' },
      { emoji: '💻', label: 'Máy tính', name: 'may tinh laptop computer code cong nghe' },
      { emoji: '🎨', label: 'Bảng màu', name: 'thiet ke art design mau ve' },
      { emoji: '📝', label: 'Ghi chép', name: 'ghi chep document note viet lach' },
      { emoji: '📊', label: 'Biểu đồ', name: 'bieu do chart data phan tich' },
      { emoji: '⚙️', label: 'Bánh răng', name: 'banh rang gear setting cau hinh' },
      { emoji: '🛠️', label: 'Công cụ', name: 'cong cu tools sua chua' },
      { emoji: '🎯', label: 'Mục tiêu', name: 'muc tieu target goal kpi' },
      { emoji: '💡', label: 'Ý tưởng', name: 'y tuong lightbulb sang tao' },
      { emoji: '💼', label: 'Cặp da', name: 'cap da briefcase cong viec ho so' },
      { emoji: '🖥️', label: 'Màn hình', name: 'man hinh screen monitor' },
      { emoji: '📈', label: 'Tăng trưởng', name: 'tang truong growth trend tang' },
      { emoji: '📉', label: 'Giảm sút', name: 'giam sut decrease trend giam' },
      { emoji: '📎', label: 'Kẹp giấy', name: 'kep giay clip' },
      { emoji: '✉️', label: 'Thư', name: 'thu email letter mail' },
      { emoji: '✏️', label: 'Bút chì', name: 'but chi pencil draft nhap' },
    ]
  },
  {
    label: 'Cảm xúc & Tương tác',
    icons: [
      { emoji: '😄', label: 'Cười tươi', name: 'cuoi tuoi smile happy vui ve' },
      { emoji: '😉', label: 'Nháy mắt', name: 'nhay mat wink' },
      { emoji: '😍', label: 'Thích thú', name: 'yeu thich love heart eyes thich thu' },
      { emoji: '🥳', label: 'Vui mừng', name: 'vui mung celebrate party tiec tùng' },
      { emoji: '😎', label: 'Ngầu', name: 'ngau cool glasses kinh' },
      { emoji: '🤔', label: 'Suy nghĩ', name: 'suy nghi think ngam nghi' },
      { emoji: '🔥', label: 'Nhiệt huyết', name: 'nhiet huyet fire hot chay' },
      { emoji: '✨', label: 'Lấp lánh', name: 'lap lanh sparkles xinh dep' },
      { emoji: '⭐', label: 'Ngôi sao', name: 'ngoi sao star uu tu' },
      { emoji: '👍', label: 'Đồng ý', name: 'dong y like thumbs up tot' },
      { emoji: '🎉', label: 'Chúc mừng', name: 'chuc mung party celebrate tiec' },
      { emoji: '👏', label: 'Vỗ tay', name: 'vo tay clap hoan ho' },
      { emoji: '❤️', label: 'Trái tim', name: 'trai tim heart yeu' },
      { emoji: '💪', label: 'Cố lên', name: 'co len strong power nang luc' },
      { emoji: '💯', label: 'Điểm 10', name: 'diem 10 tram diem perfect tot' },
    ]
  },
  {
    label: 'Đồ vật & Ký hiệu',
    icons: [
      { emoji: '🔑', label: 'Chìa khóa', name: 'chia khoa key mat khau' },
      { emoji: '🔒', label: 'Khóa', name: 'khoa lock bao mat' },
      { emoji: '🔔', label: 'Thông báo', name: 'thong bao bell notification' },
      { emoji: '📦', label: 'Hộp hàng', name: 'hop hang box package module' },
      { emoji: '📅', label: 'Lịch trình', name: 'lich trinh calendar schedule' },
      { emoji: '🏷️', label: 'Thẻ tag', name: 'the tag label phan loai' },
      { emoji: '📌', label: 'Ghim', name: 'ghim pin chu y' },
      { emoji: '📢', label: 'Loa phát', name: 'loa phat megaphone tuyen truyen' },
      { emoji: '🔋', label: 'Pin đầy', name: 'pin day battery nang luong' },
      { emoji: '🏁', label: 'Đích', name: 'dich flag finish hoan thanh' },
      { emoji: '⏰', label: 'Báo thức', name: 'bao thuc alarm clock thoi gian' },
      { emoji: '🛡️', label: 'Khiên bảo vệ', name: 'khien bao ve shield protect an toan' },
      { emoji: '🎁', label: 'Hộp quà', name: 'hop qua gift present phan thuong' },
      { emoji: '🏆', label: 'Cúp vàng', name: 'cup vang trophy gold cup' },
      { emoji: '🥇', label: 'Huy chương', name: 'huy chuong medal gold nhat' },
    ]
  },
  {
    label: 'Thiên nhiên & Khác',
    icons: [
      { emoji: '🌍', label: 'Trái đất', name: 'trai dat globe world toan cau' },
      { emoji: '🏠', label: 'Nhà', name: 'nha home house trang chu' },
      { emoji: '🏢', label: 'Công ty', name: 'cong ty building van phong' },
      { emoji: '🌲', label: 'Cây thông', name: 'cay thong tree thien nhien' },
      { emoji: '🍀', label: 'Cỏ 4 lá', name: 'co 4 la clover may man' },
      { emoji: '☀️', label: 'Mặt trời', name: 'mat troi sun anh sang' },
      { emoji: '⚡', label: 'Sấm sét', name: 'sam set lightning chop nhanh' },
      { emoji: '🌈', label: 'Cầu vồng', name: 'cau vong rainbow hy vong' },
      { emoji: '🧩', label: 'Mảnh ghép', name: 'manh ghep puzzle lap rap' },
      { emoji: '✈️', label: 'Máy bay', name: 'may bay plane travel du lich' },
    ]
  }
];
