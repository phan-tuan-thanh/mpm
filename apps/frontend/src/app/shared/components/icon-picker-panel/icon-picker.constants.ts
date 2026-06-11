export interface IconItem { icon: string; label: string; name: string }
export interface IconGroup { label: string; icons: IconItem[] }

export const ICON_GROUPS: IconGroup[] = [
  {
    label: 'Flag / Priority',
    icons: [
      { icon: 'pi pi-flag',        label: 'Cờ',        name: 'flag cờ ưu tiên' },
      { icon: 'pi pi-bookmark',    label: 'Đánh dấu',  name: 'bookmark đánh dấu' },
      { icon: 'pi pi-star',        label: 'Sao',        name: 'star sao' },
      { icon: 'pi pi-heart',       label: 'Tim',        name: 'heart tim yêu thích' },
      { icon: 'pi pi-thumbs-up',   label: 'Tốt',        name: 'thumbs-up đồng ý tốt' },
      { icon: 'pi pi-thumbs-down', label: 'Không tốt', name: 'thumbs-down không đồng ý' },
    ],
  },
  {
    label: 'Alert',
    icons: [
      { icon: 'pi pi-bolt',                  label: 'Tia sét',   name: 'bolt tia sét khẩn cấp' },
      { icon: 'pi pi-exclamation-triangle',  label: 'Nguy hiểm', name: 'exclamation triangle cảnh báo nguy hiểm' },
      { icon: 'pi pi-exclamation-circle',    label: 'Chú ý',     name: 'exclamation circle chú ý lưu ý' },
      { icon: 'pi pi-ban',                   label: 'Cấm',       name: 'ban cấm chặn' },
      { icon: 'pi pi-times-circle',          label: 'Lỗi',       name: 'times circle xóa lỗi' },
    ],
  },
  {
    label: 'Status',
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
