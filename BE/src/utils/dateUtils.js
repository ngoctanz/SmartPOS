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
  parseISO,
  isValid,
} from "date-fns";

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
};

/**
 * Get date range for predefined periods
 * @param {string} period - Period type: 'today', 'week', 'month', '3month', '6month', 'year'
 * @returns {{ startDate: Date, endDate: Date }}
 */
export const getDateRange = (period) => {
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
 * @param {string} startDateStr - Start date in ISO format (YYYY-MM-DD)
 * @param {string} endDateStr - End date in ISO format (YYYY-MM-DD)
 * @returns {{ startDate: Date, endDate: Date } | null}
 */
export const getCustomDateRange = (startDateStr, endDateStr) => {
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
 * Build MongoDB date filter from period or custom dates
 * @param {Object} options
 * @param {string} [options.period] - Predefined period
 * @param {string} [options.startDate] - Custom start date (ISO format)
 * @param {string} [options.endDate] - Custom end date (ISO format)
 * @param {string} [options.field] - Field name to filter (default: 'createdAt')
 * @returns {Object | null} MongoDB query object or null if no filter
 */
export const buildDateFilter = ({ period, startDate, endDate, field = "createdAt" }) => {
  let dateRange = null;

  // Priority: custom dates > period
  if (startDate && endDate) {
    dateRange = getCustomDateRange(startDate, endDate);
  } else if (period) {
    dateRange = getDateRange(period);
  }

  if (!dateRange) {
    return null;
  }

  return {
    [field]: {
      $gte: dateRange.startDate,
      $lte: dateRange.endDate,
    },
  };
};
