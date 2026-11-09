import { maskEmail, isEmailString } from './emailMasking';

describe('Email Masking Utility', () => {
  test('masks standard email addresses according to specification', () => {
    // First 2 chars preserved, remaining chars replaced with *, domain untouched
    expect(maskEmail('hello@yahoo.com')).toBe('he***@yahoo.com');
    expect(maskEmail('user@outlook.com')).toBe('us**@outlook.com');
    expect(maskEmail('charan@gmail.com')).toBe('ch****@gmail.com');
    expect(maskEmail('student123@gmail.com')).toBe('st********@gmail.com');
  });

  test('handles short local parts safely without crashing', () => {
    expect(maskEmail('ab@domain.com')).toBe('a*@domain.com');
    expect(maskEmail('a@domain.com')).toBe('*@domain.com');
    expect(maskEmail('abc@domain.com')).toBe('ab*@domain.com');
  });

  test('handles invalid or non-email strings gracefully', () => {
    expect(maskEmail('')).toBe('');
    expect(maskEmail(null)).toBe('');
    expect(maskEmail(undefined)).toBe('');
    expect(maskEmail('notanemail')).toBe('notanemail');
  });

  test('isEmailString correctly validates email strings', () => {
    expect(isEmailString('charan@gmail.com')).toBe(true);
    expect(isEmailString('user@careflow.com')).toBe(true);
    expect(isEmailString('invalid-email')).toBe(false);
    expect(isEmailString('')).toBe(false);
    expect(isEmailString(null)).toBe(false);
  });
});

