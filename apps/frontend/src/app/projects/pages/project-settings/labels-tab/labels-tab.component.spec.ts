import { TestBed } from '@angular/core/testing';
import { LabelsTabComponent } from './labels-tab.component';
import { LabelStore } from '../../../../tasks/state/label.store';
import { ConfirmationService, MessageService } from 'primeng/api';
import { LayoutService } from '../../../../layout/services/layout.service';
import { ProjectStore } from '../../../state/project.store';
import { signal } from '@angular/core';
import type { Label } from '@mpm/shared-types';

describe('LabelsTabComponent — cloneLabel', () => {
  let component: LabelsTabComponent;
  let mockLabelStore: any;
  let mockConfirmationService: any;
  let mockMessageService: any;
  let mockLayoutService: any;
  let mockProjectStore: any;

  beforeEach(() => {
    mockLabelStore = {
      labels: signal([]),
      loadLabels: jest.fn(),
      createLabel: jest.fn(),
    };

    mockConfirmationService = {
      confirm: jest.fn(),
    };

    mockMessageService = {
      add: jest.fn(),
    };

    mockLayoutService = {
      isDarkMode: signal(false),
    };

    mockProjectStore = {
      currentProject: signal({ id: 'proj-123', key: 'TM' }),
    };

    TestBed.configureTestingModule({
      providers: [
        LabelsTabComponent,
        { provide: LabelStore, useValue: mockLabelStore },
        { provide: ConfirmationService, useValue: mockConfirmationService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: LayoutService, useValue: mockLayoutService },
        { provide: ProjectStore, useValue: mockProjectStore },
      ],
    });

    component = TestBed.runInInjectionContext(() => new LabelsTabComponent());
  });

  it('should prefill the creation form with correct parameters for a normal label', () => {
    const label: Label = {
      id: 'label-1',
      name: 'Bug',
      colorLight: '#EF4444',
      colorDark: '#F87171',
      icon: 'pi pi-exclamation-triangle',
      isExclusive: true,
      description: 'Critical bugs',
      scope: 'project',
      projectId: 'proj-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Spy on scrollIntoView
    const scrollSpy = jest.fn();
    const mockElement = { scrollIntoView: scrollSpy };
    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement as any);

    component['cloneLabel'](label);

    expect(component['isScopedLabel']()).toBe(false);
    expect(component['newName']()).toBe('Bug (Copy)');
    expect(component['scopePrefix']()).toBe('');
    expect(component['scopeValue']()).toBe('');
    expect(component['newColorLight']()).toBe('#EF4444');
    expect(component['newColorDark']()).toBe('#F87171');
    expect(component['isExclusive']()).toBe(true);
    expect(component['newDescription']()).toBe('Critical bugs');
    expect(component.commonLabelsIcon()).toBe('pi pi-tag');
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'info',
        summary: 'Sao chép nhãn',
      })
    );
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('should prefill the creation form with correct parameters for a scoped label', () => {
    const label: Label = {
      id: 'label-2',
      name: 'priority::high',
      colorLight: '#EF4444',
      colorDark: '#F87171',
      icon: 'pi pi-exclamation-triangle',
      isExclusive: false,
      description: 'High priority scope',
      scope: 'project',
      projectId: 'proj-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scrollSpy = jest.fn();
    const mockElement = { scrollIntoView: scrollSpy };
    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement as any);

    component['cloneLabel'](label);

    expect(component['isScopedLabel']()).toBe(true);
    expect(component['newName']()).toBe('');
    expect(component['scopePrefix']()).toBe('priority');
    expect(component['scopeValue']()).toBe('high (Copy)');
    expect(component['newColorLight']()).toBe('#EF4444');
    expect(component['newColorDark']()).toBe('#F87171');
    expect(component['isExclusive']()).toBe(false);
    expect(component['newDescription']()).toBe('High priority scope');
    expect(component.commonLabelsIcon()).toBe('pi pi-tag');
  });

  it('should update all existing labels when updateCommonIcon is called', async () => {
    mockLabelStore.labels.set([
      { id: '1', name: 'L1', colorLight: '#111', colorDark: '#222', icon: 'pi pi-tag', scope: 'project' },
      { id: '2', name: 'L2', colorLight: '#333', colorDark: '#444', icon: 'pi pi-tag', scope: 'project' },
    ]);
    mockLabelStore.updateLabel = jest.fn().mockResolvedValue(true);

    await component['updateCommonIcon']('pi pi-bookmark');

    expect(component['selectedCommonIcon']()).toBe('pi pi-bookmark');
    expect(component.commonLabelsIcon()).toBe('pi pi-bookmark');
    expect(mockLabelStore.updateLabel).toHaveBeenCalledTimes(2);
    expect(mockLabelStore.updateLabel).toHaveBeenCalledWith('proj-123', '1', expect.objectContaining({ icon: 'pi pi-bookmark' }));
    expect(mockLabelStore.updateLabel).toHaveBeenCalledWith('proj-123', '2', expect.objectContaining({ icon: 'pi pi-bookmark' }));
  });
});
