import { SubItemProgressComponent } from './sub-item-progress.component';

/**
 * Unit tests for SubItemProgressComponent
 *
 * Tests the component's logic directly without TestBed since this component
 * has no dependencies — it's a pure standalone component with simple I/O.
 *
 * Validates: Requirements 4.2
 */
describe('SubItemProgressComponent', () => {
  let component: SubItemProgressComponent;

  beforeEach(() => {
    component = new SubItemProgressComponent();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('default values', () => {
    it('should default done to 0', () => {
      expect(component.done).toBe(0);
    });

    it('should default total to 0', () => {
      expect(component.total).toBe(0);
    });
  });

  describe('SVG dimensions', () => {
    it('should have size 24', () => {
      expect(component.size).toBe(24);
    });

    it('should have strokeWidth 3', () => {
      expect(component.strokeWidth).toBe(3);
    });

    it('should calculate radius as (size - strokeWidth) / 2', () => {
      expect(component.radius).toBe((24 - 3) / 2);
    });

    it('should calculate center as size / 2', () => {
      expect(component.center).toBe(12);
    });
  });

  describe('percentage calculation', () => {
    it('should return 0 when total is 0 (edge case: no sub-items)', () => {
      component.done = 0;
      component.total = 0;
      expect(component.percentage).toBe(0);
    });

    it('should return 0 when done is 0 and total > 0', () => {
      component.done = 0;
      component.total = 5;
      expect(component.percentage).toBe(0);
    });

    it('should return 100 when done equals total', () => {
      component.done = 5;
      component.total = 5;
      expect(component.percentage).toBe(100);
    });

    it('should return 40 when done=2 and total=5', () => {
      component.done = 2;
      component.total = 5;
      expect(component.percentage).toBe(40);
    });

    it('should return 50 when done=1 and total=2', () => {
      component.done = 1;
      component.total = 2;
      expect(component.percentage).toBe(50);
    });

    it('should handle done > total gracefully (>100%)', () => {
      component.done = 6;
      component.total = 5;
      expect(component.percentage).toBe(120);
    });

    it('should return 0 for negative total', () => {
      component.done = 1;
      component.total = -1;
      expect(component.percentage).toBe(0);
    });
  });

  describe('strokeDashArrayValue calculation', () => {
    const radius = (24 - 3) / 2; // 10.5
    const circumference = 2 * Math.PI * radius;

    it('should return full remaining when percentage is 0', () => {
      component.done = 0;
      component.total = 5;
      expect(component.strokeDashArrayValue).toBe(`0 ${circumference}`);
    });

    it('should return full filled when percentage is 100', () => {
      component.done = 5;
      component.total = 5;
      expect(component.strokeDashArrayValue).toBe(`${circumference} 0`);
    });

    it('should return proportional values for 50%', () => {
      component.done = 1;
      component.total = 2;
      const half = circumference / 2;
      expect(component.strokeDashArrayValue).toBe(`${half} ${half}`);
    });

    it('should return correct proportional values for 40%', () => {
      component.done = 2;
      component.total = 5;
      const filled = 0.4 * circumference;
      const remaining = circumference - filled;
      expect(component.strokeDashArrayValue).toBe(`${filled} ${remaining}`);
    });
  });

  describe('component metadata', () => {
    it('should be a standalone component (instantiable without module)', () => {
      expect(component).toBeInstanceOf(SubItemProgressComponent);
    });

    it('should have done input', () => {
      component.done = 3;
      expect(component.done).toBe(3);
    });

    it('should have total input', () => {
      component.total = 7;
      expect(component.total).toBe(7);
    });

    it('should have percentage getter', () => {
      component.done = 3;
      component.total = 10;
      expect(component.percentage).toBeCloseTo(30);
    });

    it('should have strokeDashArrayValue getter', () => {
      component.done = 1;
      component.total = 4;
      expect(component.strokeDashArrayValue).toBeDefined();
      expect(typeof component.strokeDashArrayValue).toBe('string');
    });
  });
});
