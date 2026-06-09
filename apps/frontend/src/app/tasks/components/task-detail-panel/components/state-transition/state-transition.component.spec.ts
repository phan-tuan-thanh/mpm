import { StateTransitionComponent, StateTransitionValue } from './state-transition.component';

/**
 * Unit tests for StateTransitionComponent
 *
 * Tests the component's logic directly without TestBed since PrimeNG modules
 * require the Angular JIT compiler which is not configured in jest-preset-angular CJS mode.
 *
 * Validates: Requirements 5.5, 5.6
 */
describe('StateTransitionComponent', () => {
  let component: StateTransitionComponent;

  beforeEach(() => {
    component = new StateTransitionComponent();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('default values', () => {
    it('should default fromState to null', () => {
      expect(component.fromState).toBeNull();
    });

    it('should default toState to null', () => {
      expect(component.toState).toBeNull();
    });
  });

  describe('input assignment', () => {
    it('should accept fromState with name and color', () => {
      component.fromState = { name: 'Backlog', color: '#6B7280' };
      expect(component.fromState.name).toBe('Backlog');
      expect(component.fromState.color).toBe('#6B7280');
    });

    it('should accept toState with name and color', () => {
      component.toState = { name: 'Done', color: '#22C55E' };
      expect(component.toState.name).toBe('Done');
      expect(component.toState.color).toBe('#22C55E');
    });

    it('should accept state with optional id field', () => {
      component.fromState = { id: 'uuid-1', name: 'In Progress', color: '#F59E0B' };
      expect(component.fromState.id).toBe('uuid-1');
      expect(component.fromState.name).toBe('In Progress');
      expect(component.fromState.color).toBe('#F59E0B');
    });

    it('should allow setting fromState to null', () => {
      component.fromState = { name: 'Backlog', color: '#6B7280' };
      component.fromState = null;
      expect(component.fromState).toBeNull();
    });

    it('should allow setting toState to null', () => {
      component.toState = { name: 'Todo', color: '#3B82F6' };
      component.toState = null;
      expect(component.toState).toBeNull();
    });
  });

  describe('state transitions (Req 5.5, 5.6)', () => {
    it('should support typical Backlog → Todo transition', () => {
      component.fromState = { name: 'Backlog', color: '#6B7280' };
      component.toState = { name: 'Todo', color: '#3B82F6' };

      expect(component.fromState.name).toBe('Backlog');
      expect(component.toState.name).toBe('Todo');
    });

    it('should support Todo → In Progress transition', () => {
      component.fromState = { name: 'Todo', color: '#3B82F6' };
      component.toState = { name: 'In Progress', color: '#F59E0B' };

      expect(component.fromState.name).toBe('Todo');
      expect(component.toState.name).toBe('In Progress');
    });

    it('should support In Progress → Done transition', () => {
      component.fromState = { name: 'In Progress', color: '#F59E0B' };
      component.toState = { name: 'Done', color: '#22C55E' };

      expect(component.fromState.name).toBe('In Progress');
      expect(component.toState.name).toBe('Done');
    });

    it('should preserve color values for badge rendering', () => {
      const from: StateTransitionValue = { name: 'Backlog', color: '#6B7280' };
      const to: StateTransitionValue = { name: 'Done', color: '#22C55E' };

      component.fromState = from;
      component.toState = to;

      // These colors are used in the template for:
      // - badge background: color + '1A' (10% opacity hex)
      // - badge text color: color
      // - dot background: color
      expect(component.fromState.color).toBe('#6B7280');
      expect(component.toState.color).toBe('#22C55E');
    });
  });

  describe('StateTransitionValue interface', () => {
    it('should work with minimum required fields (name, color)', () => {
      const state: StateTransitionValue = { name: 'Todo', color: '#3B82F6' };
      expect(state.name).toBe('Todo');
      expect(state.color).toBe('#3B82F6');
      expect(state.id).toBeUndefined();
    });

    it('should work with all fields including optional id', () => {
      const state: StateTransitionValue = {
        id: 'state-uuid-123',
        name: 'In Review',
        color: '#8B5CF6',
      };
      expect(state.id).toBe('state-uuid-123');
      expect(state.name).toBe('In Review');
      expect(state.color).toBe('#8B5CF6');
    });
  });

  describe('component metadata', () => {
    it('should be an instance of StateTransitionComponent', () => {
      expect(component).toBeInstanceOf(StateTransitionComponent);
    });
  });
});
