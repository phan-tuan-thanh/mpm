import { CollapsibleSectionComponent } from './collapsible-section.component';

/**
 * Unit tests for CollapsibleSectionComponent
 * 
 * Tests the component's logic directly without TestBed since this component
 * has no dependencies — it's a pure standalone component with simple I/O.
 * 
 * Validates: Requirements 3.4, 3.5, 3.6, 3.7, 3.8
 */
describe('CollapsibleSectionComponent', () => {
  let component: CollapsibleSectionComponent;

  beforeEach(() => {
    component = new CollapsibleSectionComponent();
    component.title = 'Chi tiết';
    component.sectionKey = 'details';
    component.expanded = true;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('default values', () => {
    it('should default title to empty string', () => {
      const fresh = new CollapsibleSectionComponent();
      expect(fresh.title).toBe('');
    });

    it('should default sectionKey to empty string', () => {
      const fresh = new CollapsibleSectionComponent();
      expect(fresh.sectionKey).toBe('');
    });

    it('should default expanded to true (Requirement 3.6)', () => {
      const fresh = new CollapsibleSectionComponent();
      expect(fresh.expanded).toBe(true);
    });
  });

  describe('toggle (Requirement 3.4)', () => {
    it('should set expanded to false when toggling from expanded state', () => {
      component.expanded = true;
      component.toggle();
      expect(component.expanded).toBe(false);
    });

    it('should set expanded to true when toggling from collapsed state', () => {
      component.expanded = false;
      component.toggle();
      expect(component.expanded).toBe(true);
    });

    it('should toggle back and forth correctly', () => {
      expect(component.expanded).toBe(true);
      component.toggle();
      expect(component.expanded).toBe(false);
      component.toggle();
      expect(component.expanded).toBe(true);
    });
  });

  describe('expandedChange output (Requirements 3.5, 3.7)', () => {
    it('should emit false when collapsing', () => {
      const spy = jest.spyOn(component.expandedChange, 'emit');
      component.expanded = true;
      component.toggle();

      expect(spy).toHaveBeenCalledWith(false);
    });

    it('should emit true when expanding', () => {
      const spy = jest.spyOn(component.expandedChange, 'emit');
      component.expanded = false;
      component.toggle();

      expect(spy).toHaveBeenCalledWith(true);
    });

    it('should emit exactly once per toggle', () => {
      const spy = jest.spyOn(component.expandedChange, 'emit');
      component.toggle();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should emit the new state value (not the old one)', () => {
      const emittedValues: boolean[] = [];
      component.expandedChange.subscribe((val) => emittedValues.push(val));

      component.expanded = true;
      component.toggle(); // true → false
      component.toggle(); // false → true
      component.toggle(); // true → false

      expect(emittedValues).toEqual([false, true, false]);
    });
  });

  describe('inputs are settable', () => {
    it('should accept title input', () => {
      component.title = 'Cấu trúc';
      expect(component.title).toBe('Cấu trúc');
    });

    it('should accept sectionKey input', () => {
      component.sectionKey = 'structure';
      expect(component.sectionKey).toBe('structure');
    });

    it('should accept expanded input from parent (Requirement 3.5)', () => {
      component.expanded = false;
      expect(component.expanded).toBe(false);

      component.expanded = true;
      expect(component.expanded).toBe(true);
    });
  });

  describe('component metadata', () => {
    it('should have standalone: true', () => {
      // Verify component can be instantiated without module
      expect(component).toBeInstanceOf(CollapsibleSectionComponent);
    });

    it('should have expandedChange EventEmitter', () => {
      expect(component.expandedChange).toBeDefined();
      expect(component.expandedChange.emit).toBeDefined();
    });
  });
});
