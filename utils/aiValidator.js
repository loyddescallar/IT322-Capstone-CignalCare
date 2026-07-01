// src/utils/aiValidator.js

const bannedNames = ["test", "admin", "user", "asdf", "qwerty"];

export function detectFakeName(name) {

  if (!name) return null;

  const value = name.trim().toLowerCase();

  if (bannedNames.includes(value)) {
    return "This name appears to be a placeholder.";
  }

  if (/^(.)\1+$/.test(value)) {
    return "Name pattern looks suspicious.";
  }

  if (value.length < 3) {
    return "Account name looks too short.";
  }

  return null;
}

export function detectSuspiciousAccount(number) {

  if (!number) return null;

  const value = number.trim();

  if (/(\d)\1{4,}/.test(value)) {
    return "Account number has repeated digits.";
  }

  if (/123|234|345|456|567|678|789/.test(value)) {
    return "Sequential numbers are not allowed.";
  }

  if (/^(111|222|333|000)/.test(value)) {
    return "Account number pattern looks suspicious.";
  }

  return null;
}

export function detectFakePhone(phone) {

  if (!phone) return null;

  const value = phone.trim();

  if (!/^09\d{9}$/.test(value)) {
    return "Enter a valid PH cellphone number.";
  }

  if (/^09(0{9}|9{9})$/.test(value)) {
    return "Phone number pattern looks suspicious.";
  }

  return null;
}

export function detectWeakAddress(address) {

  if (!address) return null;

  const value = address.trim();

  if (value.length < 8) {
    return "Please enter a more complete address.";
  }

  return null;
}