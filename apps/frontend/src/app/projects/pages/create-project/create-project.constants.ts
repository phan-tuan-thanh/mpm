/**
 * Constants và pure functions cho Create Project form
 */

/**
 * Danh sách emoji thông dụng cho project icon
 */
export const COMMON_EMOJIS: string[] = [
  '🚀', '💻', '🎨', '📝', '📊', '🔍', '⚙️', '📅', '👥', '🔔',
  '📎', '🔒', '🌍', '💡', '🔥', '✨', '⚡️', '🛠️', '📦', '🎯',
];

/**
 * Danh sách timezone options — lazy computed từ Intl.supportedValuesOf
 * Được tính một lần khi module load, không tính lại mỗi lần component khởi tạo
 */
export const TIMEZONE_OPTIONS: { label: string; value: string }[] =
  Intl.supportedValuesOf('timeZone').map((tz) => ({
    label: tz,
    value: tz,
  }));

/**
 * Tính suggested project key từ tên dự án
 *
 * Logic:
 * 1. Lấy chữ cái đầu tiên của mỗi từ
 * 2. Convert thành uppercase
 * 3. Giữ lại chỉ ký tự A-Z
 * 4. Cắt tối đa 5 ký tự
 *
 * @param name - Tên dự án
 * @returns Suggested key (2-5 chữ cái in hoa), hoặc chuỗi rỗng nếu không có từ hợp lệ
 *
 * @example
 * suggestProjectKey('Project Management System') // 'PMS'
 * suggestProjectKey('Hệ thống quản lý') // 'HTQ'
 */
export function suggestProjectKey(name: string): string {
  const words = name.trim().split(/\s+/);
  return words
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 5);
}
