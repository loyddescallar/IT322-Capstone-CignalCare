// Protect CSV opened in spreadsheet software from treating subscriber-entered text
// as executable spreadsheet formulas. The value is still quoted and CSV-escaped.
export function safeCsvCell(value) {
  const text = String(value ?? '');
  const protectedText = /^[\s\u0000-\u001f]*[=+@\-]/.test(text) && typeof value !== 'number'
    ? `'${text}` : text;
  return `"${protectedText.replace(/"/g, '""')}"`;
}

export function rowsToSafeCsv(rows) {
  return rows.map((row) => row.map(safeCsvCell).join(',')).join('\r\n');
}
