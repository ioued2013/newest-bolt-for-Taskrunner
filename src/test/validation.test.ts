import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateRequired,
  validatePositiveNumber,
  formatCurrency,
  formatDate,
  truncateText,
  generateSlug,
} from '../utils/validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('validates correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('rejects invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('validates strong passwords', () => {
      const result = validatePassword('StrongPass123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validatePhone', () => {
    it('validates phone numbers', () => {
      expect(validatePhone('+1234567890')).toBe(true);
      expect(validatePhone('1234567890')).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
      expect(validatePhone('abc')).toBe(false);
      expect(validatePhone('123')).toBe(false);
    });
  });

  describe('formatCurrency', () => {
    it('formats currency correctly', () => {
      expect(formatCurrency(123.45)).toContain('123.45');
      expect(formatCurrency(1000)).toContain('1,000');
    });
  });

  describe('truncateText', () => {
    it('truncates long text', () => {
      expect(truncateText('This is a long text', 10)).toBe('This is...');
    });

    it('keeps short text unchanged', () => {
      expect(truncateText('Short', 10)).toBe('Short');
    });
  });

  describe('generateSlug', () => {
    it('generates URL-friendly slugs', () => {
      expect(generateSlug('Hello World!')).toBe('hello-world');
      expect(generateSlug('Service & Delivery')).toBe('service-delivery');
    });
  });
});