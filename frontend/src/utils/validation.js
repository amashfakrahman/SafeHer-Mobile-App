export function required(value, label) {
  return String(value || '').trim() ? '' : `${label} is required.`;
}

export function minLength(value, length, label) {
  return String(value || '').trim().length >= length ? '' : `${label} must be at least ${length} characters.`;
}

export function validateEmail(value) {
  if (!value) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim()) ? '' : 'Enter a valid email address.';
}

export function validatePhone(value) {
  if (!value) return '';
  return /^[+()\d\s.-]{6,}$/.test(String(value).trim()) ? '' : 'Enter a valid phone number.';
}

export function cleanText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}
