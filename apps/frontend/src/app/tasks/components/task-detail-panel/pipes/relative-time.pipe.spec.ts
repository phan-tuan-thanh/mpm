import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  let pipe: RelativeTimePipe;

  beforeEach(() => {
    pipe = new RelativeTimePipe();
  });

  describe('null/undefined handling', () => {
    it('should return empty string for null', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(pipe.transform(undefined)).toBe('');
    });

    it('should return empty string for invalid date string', () => {
      expect(pipe.transform('invalid-date')).toBe('');
    });
  });

  describe('threshold: < 60 seconds', () => {
    it('should return "vài giây trước" for 0 seconds ago', () => {
      const now = new Date();
      expect(pipe.transform(now)).toBe('vài giây trước');
    });

    it('should return "vài giây trước" for 30 seconds ago', () => {
      const date = new Date(Date.now() - 30 * 1000);
      expect(pipe.transform(date)).toBe('vài giây trước');
    });

    it('should return "vài giây trước" for 59 seconds ago', () => {
      const date = new Date(Date.now() - 59 * 1000);
      expect(pipe.transform(date)).toBe('vài giây trước');
    });
  });

  describe('threshold: < 60 minutes', () => {
    it('should return "1 phút trước" for 60 seconds ago', () => {
      const date = new Date(Date.now() - 60 * 1000);
      expect(pipe.transform(date)).toBe('1 phút trước');
    });

    it('should return "5 phút trước" for 5 minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      expect(pipe.transform(date)).toBe('5 phút trước');
    });

    it('should return "59 phút trước" for 59 minutes ago', () => {
      const date = new Date(Date.now() - 59 * 60 * 1000);
      expect(pipe.transform(date)).toBe('59 phút trước');
    });
  });

  describe('threshold: < 24 hours', () => {
    it('should return "1 giờ trước" for 60 minutes ago', () => {
      const date = new Date(Date.now() - 60 * 60 * 1000);
      expect(pipe.transform(date)).toBe('1 giờ trước');
    });

    it('should return "12 giờ trước" for 12 hours ago', () => {
      const date = new Date(Date.now() - 12 * 60 * 60 * 1000);
      expect(pipe.transform(date)).toBe('12 giờ trước');
    });

    it('should return "23 giờ trước" for 23 hours ago', () => {
      const date = new Date(Date.now() - 23 * 60 * 60 * 1000);
      expect(pipe.transform(date)).toBe('23 giờ trước');
    });
  });

  describe('threshold: < 30 days', () => {
    it('should return "1 ngày trước" for 24 hours ago', () => {
      const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(pipe.transform(date)).toBe('1 ngày trước');
    });

    it('should return "15 ngày trước" for 15 days ago', () => {
      const date = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      expect(pipe.transform(date)).toBe('15 ngày trước');
    });

    it('should return "29 ngày trước" for 29 days ago', () => {
      const date = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
      expect(pipe.transform(date)).toBe('29 ngày trước');
    });
  });

  describe('threshold: >= 30 days (absolute format)', () => {
    it('should return absolute date format for 30 days ago', () => {
      const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = pipe.transform(date);
      // Should match dd/MM/yyyy pattern
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('should return absolute date format for 365 days ago', () => {
      const date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const result = pipe.transform(date);
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('should format specific date correctly', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      const result = pipe.transform(date);
      expect(result).toBe('15/01/2024');
    });
  });

  describe('string input handling', () => {
    it('should handle ISO date string input', () => {
      const now = new Date();
      const isoString = now.toISOString();
      expect(pipe.transform(isoString)).toBe('vài giây trước');
    });

    it('should handle date string from 5 minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      expect(pipe.transform(date.toISOString())).toBe('5 phút trước');
    });
  });

  describe('future dates', () => {
    it('should return absolute format for future dates', () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const result = pipe.transform(futureDate);
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });
});
