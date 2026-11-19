// Spreadsheet-safe CSV for the order exports (the RMPC export and the client
// dashboard). A cell is quoted where it needs to be, and a cell a buyer typed
// that starts like a formula gets a leading ' so Excel and Sheets show it as
// text instead of running it.

export function cell(value) {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csv(rows) {
  return `${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}

/** Cents as a plain amount for a spreadsheet: 1999 → "19.99". */
export const money = (cents) => (cents / 100).toFixed(2);
