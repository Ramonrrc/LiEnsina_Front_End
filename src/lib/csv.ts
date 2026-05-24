const csvFormulaPrefixPattern = /^[=+\-@\t\r]/

export function sanitizeCsvCell(value: unknown) {
  const text = String(value ?? '').replace(/\u0000/g, '')
  const safeText = csvFormulaPrefixPattern.test(text) ? `'${text}` : text
  return `"${safeText.replace(/"/g, '""')}"`
}

export function buildCsv(rows: unknown[][], delimiter = ';') {
  return rows.map((row) => row.map(sanitizeCsvCell).join(delimiter)).join('\r\n')
}
