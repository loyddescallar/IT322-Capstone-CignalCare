const ExcelJS = require('exceljs');
const { validateSubscriberIdentifiers, normalizeText } = require('../utils/subscriberAccount');

const HEADER_ALIASES = {
  NAME: 'accountName',
  ACCOUNTNAME: 'accountName',
  CUSTOMERNAME: 'accountName',
  SUBSCRIBERNAME: 'accountName',
  ADDRESS: 'address',
  CCANUMBER: 'ccaNumber',
  CCA: 'ccaNumber',
  ACCTNUMBER: 'accountNumber',
  ACCOUNTNUMBER: 'accountNumber',
  ACCTNO: 'accountNumber',
  ACCOUNTNO: 'accountNumber',
  EMAIL: 'email',
  EMAILADDRESS: 'email',
  PHONE: 'phone',
  PHONENUMBER: 'phone',
  CONTACTNUMBER: 'phone',
};

function normalizeHeader(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function cellText(cell) {
  if (!cell) return '';
  if (typeof cell.text === 'string' && cell.text.trim()) return cell.text.trim();
  const value = cell.value;
  if (value == null) return '';
  if (typeof value === 'object') {
    if (value.text != null) return String(value.text).trim();
    if (value.result != null) return String(value.result).trim();
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('').trim();
  }
  return String(value).trim();
}

async function parseSubscriberWorkbook(buffer, location) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('The Excel file does not contain a worksheet.');

  let headerRowNumber = 0;
  let columnMap = {};

  for (let candidate = 1; candidate <= Math.min(sheet.rowCount, 10); candidate += 1) {
    const candidateMap = {};
    sheet.getRow(candidate).eachCell((cell, colNumber) => {
      const alias = HEADER_ALIASES[normalizeHeader(cellText(cell))];
      if (alias) candidateMap[alias] = colNumber;
    });

    const hasRequired = ['accountName', 'address', 'ccaNumber', 'accountNumber'].every((key) => candidateMap[key]);
    if (hasRequired) {
      headerRowNumber = candidate;
      columnMap = candidateMap;
      break;
    }
  }

  if (!headerRowNumber) {
    throw new Error('Excel columns must include NAME, ADDRESS, CCA NUMBER, and ACCT NUMBER within the first 10 rows.');
  }

  const rows = [];
  for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const accountName = normalizeText(cellText(row.getCell(columnMap.accountName)));
    const address = normalizeText(cellText(row.getCell(columnMap.address)));
    const ccaNumber = normalizeText(cellText(row.getCell(columnMap.ccaNumber))).replace(/\.0$/, '');
    const accountNumber = normalizeText(cellText(row.getCell(columnMap.accountNumber))).replace(/\.0$/, '');
    const email = columnMap.email ? normalizeText(cellText(row.getCell(columnMap.email))) : '';
    const phone = columnMap.phone ? normalizeText(cellText(row.getCell(columnMap.phone))) : '';

    if (!accountName && !address && !ccaNumber && !accountNumber && !email && !phone) continue;

    const { errors } = validateSubscriberIdentifiers(accountNumber, ccaNumber);
    if (!accountName) errors.push('NAME is required.');
    if (!address) errors.push('ADDRESS is required.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email format is invalid.');

    rows.push({
      rowNumber,
      accountName,
      address,
      ccaNumber,
      accountNumber,
      email,
      phone,
      location,
      errors,
    });
  }

  if (!rows.length) throw new Error('No subscriber rows were found in the Excel file.');
  return rows;
}

function annotateDuplicates(rows, existingRows = []) {
  const accountSeen = new Map();
  const ccaSeen = new Map();
  const existingAccounts = new Set(existingRows.map((row) => String(row.accountNumber || '').trim()));
  const existingCcas = new Set(existingRows.map((row) => String(row.ccaNumber || '').trim()));

  for (const row of rows) {
    if (existingAccounts.has(row.accountNumber)) row.errors.push('Account Number already exists in the system.');
    if (existingCcas.has(row.ccaNumber)) row.errors.push('CCA Number already exists in the system.');

    if (accountSeen.has(row.accountNumber)) {
      row.errors.push(`Duplicate Account Number in this file (also row ${accountSeen.get(row.accountNumber)}).`);
    } else accountSeen.set(row.accountNumber, row.rowNumber);

    if (ccaSeen.has(row.ccaNumber)) {
      row.errors.push(`Duplicate CCA Number in this file (also row ${ccaSeen.get(row.ccaNumber)}).`);
    } else ccaSeen.set(row.ccaNumber, row.rowNumber);
  }

  return rows;
}

module.exports = { parseSubscriberWorkbook, annotateDuplicates };
