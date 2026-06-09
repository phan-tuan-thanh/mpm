import { Pipe, PipeTransform } from '@angular/core';

/**
 * RelativeTimePipe — Hiển thị thời gian tương đối (Vietnamese locale)
 *
 * Thresholds:
 *   < 60s  → "vài giây trước"
 *   < 60m  → "X phút trước"
 *   < 24h  → "X giờ trước"
 *   < 30d  → "X ngày trước"
 *   ≥ 30d  → dd/MM/yyyy (absolute)
 */
@Pipe({
  name: 'relativeTime',
  standalone: true,
  pure: true,
})
export class RelativeTimePipe implements PipeTransform {
  transform(value: Date | string | null | undefined): string {
    if (value == null) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // Xử lý trường hợp thời gian trong tương lai
    if (diffMs < 0) {
      return formatAbsoluteDate(date);
    }

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return 'vài giây trước';
    }
    if (diffMin < 60) {
      return `${diffMin} phút trước`;
    }
    if (diffHour < 24) {
      return `${diffHour} giờ trước`;
    }
    if (diffDay < 30) {
      return `${diffDay} ngày trước`;
    }

    return formatAbsoluteDate(date);
  }
}

/**
 * Format date as dd/MM/yyyy
 */
function formatAbsoluteDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
