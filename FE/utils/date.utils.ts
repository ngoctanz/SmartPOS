/**
 * Date utility functions using date-fns for accurate date calculations
 */
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  format,
  parseISO,
  isValid,
} from "date-fns";
import { vi } from "date-fns/locale";

/**
 * Period types supported by the system
 */
export const PERIOD_TYPES = {
  TODAY: "today",
  WEEK: "week",
  MONTH: "month",
  THREE_MONTHS: "3month",
  SIX_MONTHS: "6month",
  YEAR: "year",
  CUSTOM: "custom",
} as const;

export type PeriodType = (typeof PERIOD_TYPES)[keyof typeof PERIOD_TYPES];

/**
 * Period labels in Vietnamese
 */
export const PERIOD_LABELS: Record<string, string> = {
  today: "Hôm nay",
  week: "Tuần này",
  month: "Tháng này",
  "3month": "3 tháng",
  "6month": "6 tháng",
  year: "Năm nay",
  custom: "Tùy chỉnh",
};

/**
 * Get date range for predefined periods
 */
export const getDateRange = (period: string): { startDate: Date; endDate: Date } => {
  const now = new Date();

  switch (period) {
    case PERIOD_TYPES.TODAY:
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };

    case PERIOD_TYPES.WEEK:
      // Week starts on Monday (weekStartsOn: 1)
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }),
        endDate: endOfWeek(now, { weekStartsOn: 1 }),
      };

    case PERIOD_TYPES.MONTH:
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };

    case PERIOD_TYPES.THREE_MONTHS:
      return {
        startDate: startOfMonth(subMonths(now, 2)),
        endDate: endOfMonth(now),
      };

    case PERIOD_TYPES.SIX_MONTHS:
      return {
        startDate: startOfMonth(subMonths(now, 5)),
        endDate: endOfMonth(now),
      };

    case PERIOD_TYPES.YEAR:
      return {
        startDate: startOfYear(now),
        endDate: endOfYear(now),
      };

    default:
      // Default to current month
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };
  }
};

/**
 * Get date range from custom start/end date strings
 */
export const getCustomDateRange = (
  startDateStr: string,
  endDateStr: string
): { startDate: Date; endDate: Date } | null => {
  const startDate = parseISO(startDateStr);
  const endDate = parseISO(endDateStr);

  if (!isValid(startDate) || !isValid(endDate)) {
    return null;
  }

  return {
    startDate: startOfDay(startDate),
    endDate: endOfDay(endDate),
  };
};

/**
 * Format date for display
 */
export const formatDate = (date: Date | string, formatStr = "dd/MM/yyyy"): string => {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "";
  return format(d, formatStr, { locale: vi });
};

/**
 * Format date for API (ISO format)
 */
export const formatDateForApi = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

/**
 * Get period label with date range description
 */
export const getPeriodDescription = (period: string): string => {
  if (period === "custom") return "Tùy chỉnh";
  
  const range = getDateRange(period);
  const start = formatDate(range.startDate);
  const end = formatDate(range.endDate);
  
  return `${PERIOD_LABELS[period] || period} (${start} - ${end})`;
};
