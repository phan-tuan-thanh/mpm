import { TestBed } from '@angular/core/testing';
import { TaskStore } from './task.store';
import { TaskService } from '../services/task.service';
import { LabelStore } from './label.store';
import { ProjectStore } from '../../projects/state/project.store';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import type { Task, Label } from '@mpm/shared-types';

describe('TaskStore — label exclusivity filtering', () => {
  let store: TaskStore;
  let mockTaskService: any;
  let mockLabelStore: any;
  let mockProjectStore: any;

  const labels: Label[] = [
    {
      id: 'l-1',
      name: 'scope::val1',
      isExclusive: true,
      colorLight: '#fff',
      colorDark: '#000',
      scope: 'project',
      projectId: 'p1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'l-2',
      name: 'scope::val2',
      isExclusive: true,
      colorLight: '#fff',
      colorDark: '#000',
      scope: 'project',
      projectId: 'p1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'l-normal',
      name: 'normal-label',
      isExclusive: false,
      colorLight: '#fff',
      colorDark: '#000',
      scope: 'project',
      projectId: 'p1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    mockTaskService = {
      updateTask: jest.fn().mockReturnValue(of({ id: 't-123', labels: [] })),
    };

    mockLabelStore = {
      labels: signal(labels),
    };

    mockProjectStore = {
      currentProjectStates: signal({}),
    };

    TestBed.configureTestingModule({
      providers: [
        TaskStore,
        { provide: TaskService, useValue: mockTaskService },
        { provide: LabelStore, useValue: mockLabelStore },
        { provide: ProjectStore, useValue: mockProjectStore },
      ],
    });

    store = TestBed.inject(TaskStore);
  });

  it('nên tự động loại bỏ các labels cùng exclusive scope khi cập nhật label mới', () => {
    // Giả sử task hiện tại đang có label 'scope::val1' và 'normal-label'
    const mockTask: Task = {
      id: 't-123',
      title: 'Test Task',
      stateId: 's1',
      labels: [
        { id: 'l-1', name: 'scope::val1' },
        { id: 'l-normal', name: 'normal-label' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    store.currentTask.set(mockTask);

    // Người dùng thêm label 'scope::val2' (l-2) vào danh sách labelIds
    const dto = {
      labelIds: ['l-1', 'l-normal', 'l-2'],
    };

    store.updateTask('p1', 't-123', dto);

    // 'l-1' có cùng scope 'scope::' với 'l-2' và là exclusive, nên 'l-1' phải bị filter khỏi dto.labelIds
    // Kết quả mong đợi trong dto.labelIds chỉ còn lại 'l-normal' và 'l-2'
    expect(dto.labelIds).toEqual(['l-normal', 'l-2']);
    expect(mockTaskService.updateTask).toHaveBeenCalledWith(
      'p1',
      't-123',
      expect.objectContaining({ labelIds: ['l-normal', 'l-2'] })
    );
  });
});
