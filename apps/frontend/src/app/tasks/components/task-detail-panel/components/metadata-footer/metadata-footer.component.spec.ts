import {
  truncateCreatorName,
  MAX_CREATOR_NAME_LENGTH,
  UNKNOWN_CREATOR_LABEL,
} from './metadata-footer.helpers';

/**
 * Unit tests for MetadataFooterComponent helpers and logic
 *
 * Tests the component's business logic without TestBed since Angular's DatePipe
 * requires JIT compilation which is not configured in jest-preset-angular CJS mode.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */
describe('MetadataFooterComponent — Helpers', () => {
  describe('constants', () => {
    it('should define MAX_CREATOR_NAME_LENGTH as 30', () => {
      expect(MAX_CREATOR_NAME_LENGTH).toBe(30);
    });

    it('should define UNKNOWN_CREATOR_LABEL in Vietnamese', () => {
      expect(UNKNOWN_CREATOR_LABEL).toBe('Người dùng không xác định');
    });
  });

  describe('truncateCreatorName (Req 9.1, 9.4)', () => {
    it('should return name unchanged if length < 30', () => {
      expect(truncateCreatorName('Nguyễn Văn A')).toBe('Nguyễn Văn A');
    });

    it('should return name unchanged if exactly 30 chars', () => {
      const name = 'A'.repeat(30);
      expect(truncateCreatorName(name)).toBe(name);
    });

    it('should truncate to 30 chars + ellipsis if 31 chars', () => {
      const name = 'A'.repeat(31);
      expect(truncateCreatorName(name)).toBe('A'.repeat(30) + '…');
    });

    it('should truncate to 30 chars + ellipsis if much longer than 30', () => {
      const name = 'B'.repeat(100);
      expect(truncateCreatorName(name)).toBe('B'.repeat(30) + '…');
    });

    it('should return unknown label for null (Req 9.4)', () => {
      expect(truncateCreatorName(null)).toBe(UNKNOWN_CREATOR_LABEL);
    });

    it('should return unknown label for undefined (Req 9.4)', () => {
      expect(truncateCreatorName(undefined)).toBe(UNKNOWN_CREATOR_LABEL);
    });

    it('should return unknown label for empty string (Req 9.4)', () => {
      expect(truncateCreatorName('')).toBe(UNKNOWN_CREATOR_LABEL);
    });

    it('should return unknown label for whitespace-only string (Req 9.4)', () => {
      expect(truncateCreatorName('   ')).toBe(UNKNOWN_CREATOR_LABEL);
      expect(truncateCreatorName('\t\n')).toBe(UNKNOWN_CREATOR_LABEL);
    });

    it('should handle unicode/Vietnamese names correctly', () => {
      // "Trần Thị Ngọc Huyền Phương Linh" is 32 chars → should truncate
      const name = 'Trần Thị Ngọc Huyền Phương Linh';
      expect(name.length).toBeGreaterThan(30);
      const result = truncateCreatorName(name);
      expect(result).toBe(name.substring(0, 30) + '…');
      expect(result.length).toBe(31); // 30 chars + 1 ellipsis char
    });

    it('should handle short Vietnamese names unchanged', () => {
      expect(truncateCreatorName('Lê Minh Tuấn')).toBe('Lê Minh Tuấn');
    });

    it('should use ellipsis character "…" (not three dots)', () => {
      const name = 'X'.repeat(35);
      const result = truncateCreatorName(name);
      expect(result).toContain('…');
      expect(result).not.toContain('...');
    });

    it('should not trim the name before checking length', () => {
      // A name with leading space but non-empty trim — keep as-is if ≤ 30
      const name = ' Short Name';
      expect(truncateCreatorName(name)).toBe(' Short Name');
    });

    it('should return unknown label for tab character only', () => {
      expect(truncateCreatorName('\t')).toBe(UNKNOWN_CREATOR_LABEL);
    });
  });
});
