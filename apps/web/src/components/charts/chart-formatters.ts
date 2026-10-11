// Breeze: the forecast is hourly, so axis/tooltip labels carry weekday + hour
// (e.g. "Sun 5 PM"). Dates passed to charts are location wall-clock values
// constructed in the browser's own zone, so formatting here never shifts hours.
export const shortDateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  hour: "numeric",
});

export const weekdayDateFmt = shortDateFmt;

export const hmsTimeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

// `Intl.NumberFormat.prototype.format` is a bound getter — safe to extract.
export const intFmt = new Intl.NumberFormat("en-US").format;
