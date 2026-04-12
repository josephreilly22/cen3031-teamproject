function normalizeLineBreaks(value) {
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n') : '';
}

export function normalizeTextInput(value, { multiline = false } = {}) {
  let nextValue = normalizeLineBreaks(value);

  if (multiline) {
    nextValue = nextValue.replace(/^\s+/, '');
    nextValue = nextValue.replace(/[^\S\n]{2,}/g, ' ');
    return nextValue;
  }

  nextValue = nextValue.replace(/^\s+/, '');
  nextValue = nextValue.replace(/\s{2,}/g, ' ');
  return nextValue;
}

export function getEffectiveCharacterCount(value, options = {}) {
  return normalizeTextInput(value, options).replace(/\s+$/, '').length;
}

export function applyCharacterLimit(value, maxLength, options = {}) {
  const normalizedValue = normalizeTextInput(value, options);
  return getEffectiveCharacterCount(normalizedValue, options) <= maxLength ? normalizedValue : null;
}

export function normalizeEmailInput(value) {
  return normalizeLineBreaks(value).replace(/\s+/g, '');
}
