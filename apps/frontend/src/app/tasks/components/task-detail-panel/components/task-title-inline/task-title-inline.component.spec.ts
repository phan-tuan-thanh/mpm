import { TaskTitleInlineComponent } from './task-title-inline.component';
import { SimpleChange } from '@angular/core';

/**
 * Unit tests for TaskTitleInlineComponent
 *
 * Tests the component's logic directly without TestBed since this component
 * has no complex dependencies — it's a standalone component with simple I/O.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
describe('TaskTitleInlineComponent', () => {
  let component: TaskTitleInlineComponent;

  beforeEach(() => {
    component = new TaskTitleInlineComponent();
    component.title = 'Original Title';
    component.viewMode = 'full-page';
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('default values', () => {
    it('should default title to empty string', () => {
      const fresh = new TaskTitleInlineComponent();
      expect(fresh.title).toBe('');
    });

    it('should default viewMode to full-page', () => {
      const fresh = new TaskTitleInlineComponent();
      expect(fresh.viewMode).toBe('full-page');
    });

    it('should start in display mode (not editing)', () => {
      expect(component.isEditing()).toBe(false);
    });
  });

  describe('enterEditMode (Requirement 2.2)', () => {
    it('should switch to editing mode on enter', () => {
      component.enterEditMode();
      expect(component.isEditing()).toBe(true);
    });

    it('should set editValue to current title', () => {
      component.enterEditMode();
      expect(component.editValue).toBe('Original Title');
    });

    it('should preserve the title value for comparison', () => {
      component.enterEditMode();
      // editValue is set to title for editing
      expect(component.editValue).toBe(component.title);
    });
  });

  describe('onBlur — save on blur (Requirement 2.3)', () => {
    it('should emit titleSaved when trimmed value differs from original and is non-empty', () => {
      const spy = jest.spyOn(component.titleSaved, 'emit');
      component.enterEditMode();
      component.editValue = 'New Title';
      component.onBlur();

      expect(spy).toHaveBeenCalledWith('New Title');
    });

    it('should emit trimmed value', () => {
      const spy = jest.spyOn(component.titleSaved, 'emit');
      component.enterEditMode();
      component.editValue = '  New Title  ';
      component.onBlur();

      expect(spy).toHaveBeenCalledWith('New Title');
    });

    it('should not emit when trimmed value equals original', () => {
      const spy = jest.spyOn(component.titleSaved, 'emit');
      component.enterEditMode();
      component.editValue = 'Original Title';
      component.onBlur();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit when trimmed value equals original with extra spaces', () => {
      const spy = jest.spyOn(component.titleSaved, 'emit');
      component.enterEditMode();
      component.editValue = '  Original Title  ';
      component.onBlur();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should exit edit mode after blur', () => {
      component.enterEditMode();
      component.editValue = 'New Title';
      component.onBlur();

      expect(component.isEditing()).toBe(false);
    });
  });

  describe('onBlur — revert on empty (Requirement 2.4)', () => {
    it('should revert to original title when trimmed value is empty', () => {
      component.enterEditMode();
      component.editValue = '';
      component.onBlur();

      expect(component.editValue).toBe('Original Title');
    });

    it('should revert to original title when value is whitespace-only', () => {
      component.enterEditMode();
      component.editValue = '   ';
      component.onBlur();

      expect(component.editValue).toBe('Original Title');
    });

    it('should not emit titleSaved when value is empty', () => {
      const spy = jest.spyOn(component.titleSaved, 'emit');
      component.enterEditMode();
      component.editValue = '';
      component.onBlur();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit titleSaved when value is whitespace-only', () => {
      const spy = jest.spyOn(component.titleSaved, 'emit');
      component.enterEditMode();
      component.editValue = '    ';
      component.onBlur();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should exit edit mode after revert', () => {
      component.enterEditMode();
      component.editValue = '';
      component.onBlur();

      expect(component.isEditing()).toBe(false);
    });
  });

  describe('onEscape — discard changes (Requirement 2.5)', () => {
    it('should revert editValue to original title', () => {
      component.enterEditMode();
      component.editValue = 'Modified Title';

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      Object.defineProperty(event, 'stopPropagation', { value: jest.fn() });
      component.onEscape(event);

      expect(component.editValue).toBe('Original Title');
    });

    it('should exit edit mode', () => {
      component.enterEditMode();
      component.editValue = 'Modified Title';

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      Object.defineProperty(event, 'stopPropagation', { value: jest.fn() });
      component.onEscape(event);

      expect(component.isEditing()).toBe(false);
    });

    it('should not emit titleSaved', () => {
      const spy = jest.spyOn(component.titleSaved, 'emit');
      component.enterEditMode();
      component.editValue = 'Modified Title';

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      Object.defineProperty(event, 'stopPropagation', { value: jest.fn() });
      component.onEscape(event);

      expect(spy).not.toHaveBeenCalled();
    });

    it('should preventDefault and stopPropagation', () => {
      component.enterEditMode();
      const preventDefaultSpy = jest.fn();
      const stopPropagationSpy = jest.fn();
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy });
      Object.defineProperty(event, 'stopPropagation', { value: stopPropagationSpy });

      component.onEscape(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('onEnter — save on Enter (Requirement 2.3)', () => {
    it('should preventDefault', () => {
      const preventDefaultSpy = jest.fn();
      const blurSpy = jest.fn();
      const event = {
        preventDefault: preventDefaultSpy,
        target: { blur: blurSpy },
      } as unknown as Event;

      component.enterEditMode();
      component.editValue = 'New Title';
      component.onEnter(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should call blur on the target element', () => {
      const blurSpy = jest.fn();
      const event = {
        preventDefault: jest.fn(),
        target: { blur: blurSpy },
      } as unknown as Event;

      component.enterEditMode();
      component.onEnter(event);

      expect(blurSpy).toHaveBeenCalled();
    });
  });

  describe('ngOnChanges — external title update (Requirement 2.6)', () => {
    it('should update editValue when title changes while not editing', () => {
      component.title = 'New Title From Parent';
      component.ngOnChanges({
        title: new SimpleChange('Original Title', 'New Title From Parent', false),
      });

      expect(component.editValue).toBe('New Title From Parent');
    });

    it('should NOT update editValue when title changes while editing', () => {
      component.enterEditMode();
      component.editValue = 'User Typing...';
      component.title = 'Server Update';
      component.ngOnChanges({
        title: new SimpleChange('Original Title', 'Server Update', false),
      });

      // Should not override what user is typing
      expect(component.editValue).toBe('User Typing...');
    });
  });

  describe('viewMode input (Requirement 2.1)', () => {
    it('should accept full-page viewMode', () => {
      component.viewMode = 'full-page';
      expect(component.viewMode).toBe('full-page');
    });

    it('should accept drawer viewMode', () => {
      component.viewMode = 'drawer';
      expect(component.viewMode).toBe('drawer');
    });

    it('should accept popup viewMode', () => {
      component.viewMode = 'popup';
      expect(component.viewMode).toBe('popup');
    });
  });

  describe('emoji support (Requirement 2.1)', () => {
    it('should handle title with emoji characters', () => {
      component.title = '🚀 Launch Feature';
      component.enterEditMode();
      expect(component.editValue).toBe('🚀 Launch Feature');
    });

    it('should save title with emoji correctly', () => {
      const spy = jest.spyOn(component.titleSaved, 'emit');
      component.enterEditMode();
      component.editValue = '✨ New Feature';
      component.onBlur();

      expect(spy).toHaveBeenCalledWith('✨ New Feature');
    });

    it('should handle complex emoji sequences', () => {
      const spy = jest.spyOn(component.titleSaved, 'emit');
      component.title = 'Old Title';
      component.enterEditMode();
      component.editValue = '👨‍💻 Developer Task 🎯';
      component.onBlur();

      expect(spy).toHaveBeenCalledWith('👨‍💻 Developer Task 🎯');
    });
  });

  describe('titleSaved output', () => {
    it('should have titleSaved EventEmitter defined', () => {
      expect(component.titleSaved).toBeDefined();
      expect(component.titleSaved.emit).toBeDefined();
    });

    it('should emit exactly once per valid save', () => {
      const spy = jest.spyOn(component.titleSaved, 'emit');
      component.enterEditMode();
      component.editValue = 'Title A';
      component.onBlur();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
