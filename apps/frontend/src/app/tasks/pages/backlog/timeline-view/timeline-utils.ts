import {
  differenceInDays, startOfWeek, startOfMonth, startOfQuarter,
  addDays, addWeeks, addMonths, format, isSameDay
} from 'date-fns';

export type TimelineScale = 'week' | 'month' | 'quarter';

export interface TimelineColumn {
  date: Date;
  label: string;
  isToday: boolean;
  isWeekStart: boolean;
  isMonthStart: boolean;
}

export interface TimelineHeader {
  spans: { label: string; colCount: number }[];
  weekSpans: { label: string; colCount: number }[];
  columns: TimelineColumn[];
}

export const COL_WIDTH: Record<TimelineScale, number> = {
  week: 28,
  month: 60,
  quarter: 80,
};

const DAY_ABBR = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];

export function buildTimelineHeader(
  viewStart: Date,
  colCount: number,
  scale: TimelineScale,
  today: Date,
): TimelineHeader {
  const columns: TimelineColumn[] = [];

  for (let i = 0; i < colCount; i++) {
    let date: Date;
    if (scale === 'week') {
      date = addDays(viewStart, i);
    } else if (scale === 'month') {
      date = addWeeks(viewStart, i);
    } else {
      date = addMonths(viewStart, i);
    }

    let label = '';
    if (scale === 'week') {
      const dow = date.getDay();
      label = `${DAY_ABBR[dow]} ${date.getDate()}`;
    } else if (scale === 'month') {
      label = `W${getWeekNumber(date)}`;
    } else {
      label = format(date, 'MMM');
    }

    columns.push({
      date,
      label,
      isToday: isSameDay(date, today),
      isWeekStart: date.getDay() === 1,
      isMonthStart: date.getDate() === 1,
    });
  }

  // Build month/quarter spans (row 1)
  const spans: { label: string; colCount: number }[] = [];
  let curSpanLabel = '';
  let curCount = 0;
  for (const col of columns) {
    const spanLabel = scale === 'quarter'
      ? `Q${Math.ceil((col.date.getMonth() + 1) / 3)} ${col.date.getFullYear()}`
      : format(col.date, 'MMM yyyy');
    if (spanLabel !== curSpanLabel) {
      if (curCount > 0) spans.push({ label: curSpanLabel, colCount: curCount });
      curSpanLabel = spanLabel;
      curCount = 1;
    } else {
      curCount++;
    }
  }
  if (curCount > 0) spans.push({ label: curSpanLabel, colCount: curCount });

  // Build week spans (row 2, only for 'week' scale)
  const weekSpans: { label: string; colCount: number }[] = [];
  if (scale === 'week') {
    let curWeek = -1;
    let wCount = 0;
    for (const col of columns) {
      const wn = getWeekNumber(col.date);
      if (wn !== curWeek) {
        if (wCount > 0) weekSpans.push({ label: `Week ${curWeek}`, colCount: wCount });
        curWeek = wn;
        wCount = 1;
      } else {
        wCount++;
      }
    }
    if (wCount > 0) weekSpans.push({ label: `Week ${curWeek}`, colCount: wCount });
  }

  return { spans, weekSpans, columns };
}

export function getBarStyle(
  task: { startDate: string | null | undefined; dueDate: string | null | undefined },
  viewStart: Date,
  scale: TimelineScale,
): { left: string; width: string } | null {
  if (!task.startDate || !task.dueDate) return null;
  const start = new Date(task.startDate);
  const end = new Date(task.dueDate);
  const colW = COL_WIDTH[scale];

  let leftCols: number;
  let widthCols: number;

  if (scale === 'week') {
    leftCols = differenceInDays(start, viewStart);
    widthCols = Math.max(1, differenceInDays(end, start) + 1);
  } else if (scale === 'month') {
    leftCols = Math.floor(differenceInDays(start, viewStart) / 7);
    widthCols = Math.max(1, Math.ceil(differenceInDays(end, start) / 7));
  } else {
    const startMonths = (start.getFullYear() - viewStart.getFullYear()) * 12
      + start.getMonth() - viewStart.getMonth();
    const endMonths = (end.getFullYear() - viewStart.getFullYear()) * 12
      + end.getMonth() - viewStart.getMonth();
    leftCols = startMonths;
    widthCols = Math.max(1, endMonths - startMonths + 1);
  }

  return {
    left: `${leftCols * colW}px`,
    width: `${widthCols * colW}px`,
  };
}

export function getDefaultViewStart(scale: TimelineScale, today: Date): Date {
  if (scale === 'week') return startOfWeek(addDays(today, -14), { weekStartsOn: 1 });
  if (scale === 'month') return startOfMonth(addMonths(today, -1));
  return startOfQuarter(today);
}

export function getDefaultColCount(scale: TimelineScale): number {
  if (scale === 'week') return 84;   // 12 weeks
  if (scale === 'month') return 24;  // 6 months (24 weeks)
  return 8;                          // 2 quarters
}

export function getTodayOffset(viewStart: Date, scale: TimelineScale, today: Date): number {
  const colW = COL_WIDTH[scale];
  if (scale === 'week') return differenceInDays(today, viewStart) * colW;
  if (scale === 'month') return Math.floor(differenceInDays(today, viewStart) / 7) * colW;
  const months = (today.getFullYear() - viewStart.getFullYear()) * 12
    + today.getMonth() - viewStart.getMonth();
  return months * colW;
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
