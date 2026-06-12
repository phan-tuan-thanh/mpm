import { TestBed } from '@angular/core/testing';
import { SidebarComponent } from './sidebar.component';
import { ProjectStore } from '../../../projects/state/project.store';
import { LayoutService } from '../../services/layout.service';
import { AuthStore } from '../../../auth/state/auth.store';
import { Router, NavigationEnd } from '@angular/router';
import { SprintService } from '../../../projects/sprints/services/sprint.service';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';

describe('SidebarComponent — isSettingsSubItemActive', () => {
  let component: SidebarComponent;
  let mockProjectStore: any;
  let mockLayoutService: any;
  let mockAuthStore: any;
  let mockRouter: any;
  let mockSprintService: any;
  let routerEventsSubject: Subject<any>;

  beforeEach(() => {
    routerEventsSubject = new Subject<any>();

    mockProjectStore = {
      projects: signal([]),
      currentProject: signal({ id: '1', name: 'Task Manager', key: 'TM', features: {} }),
      loadProjects: jest.fn(),
    };

    mockLayoutService = {
      menuMode: signal('static'),
      isCollapsed: signal(false),
      toggleSidebar: jest.fn(),
    };

    mockAuthStore = {
      isAdmin: signal(false),
    };

    mockRouter = {
      url: '/projects/TM/settings/info',
      events: routerEventsSubject.asObservable(),
      navigate: jest.fn(),
    };

    mockSprintService = {
      projectSettings: signal(null),
      loadProjectSettings: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        SidebarComponent,
        { provide: ProjectStore, useValue: mockProjectStore },
        { provide: LayoutService, useValue: mockLayoutService },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: Router, useValue: mockRouter },
        { provide: SprintService, useValue: mockSprintService },
      ],
    });

    component = TestBed.runInInjectionContext(() => new SidebarComponent());
  });

  it('should identify Cấu hình chung sub-item as active when URL is /projects/TM/settings/info', () => {
    const sub = { label: 'Cấu hình chung', icon: 'pi-sliders-h', route: [] as string[], exact: true, danger: false };

    mockRouter.url = '/projects/TM/settings/info';
    routerEventsSubject.next(new NavigationEnd(1, '/projects/TM/settings/info', '/projects/TM/settings/info'));

    expect(component.isSettingsSubItemActive(sub)).toBe(true);
  });

  it('should identify Cấu hình chung sub-item as active when URL is nested settings tabs (e.g. states, sprints)', () => {
    const sub = { label: 'Cấu hình chung', icon: 'pi-sliders-h', route: [] as string[], exact: true, danger: false };

    mockRouter.url = '/projects/TM/settings/states';
    routerEventsSubject.next(new NavigationEnd(1, '/projects/TM/settings/states', '/projects/TM/settings/states'));
    expect(component.isSettingsSubItemActive(sub)).toBe(true);

    mockRouter.url = '/projects/TM/settings/sprints';
    routerEventsSubject.next(new NavigationEnd(1, '/projects/TM/settings/sprints', '/projects/TM/settings/sprints'));
    expect(component.isSettingsSubItemActive(sub)).toBe(true);
  });

  it('should identify Cấu hình chung sub-item as inactive when URL is members, features, or danger', () => {
    const sub = { label: 'Cấu hình chung', icon: 'pi-sliders-h', route: [] as string[], exact: true, danger: false };

    mockRouter.url = '/projects/TM/settings/members';
    routerEventsSubject.next(new NavigationEnd(1, '/projects/TM/settings/members', '/projects/TM/settings/members'));
    expect(component.isSettingsSubItemActive(sub)).toBe(false);

    mockRouter.url = '/projects/TM/settings/features';
    routerEventsSubject.next(new NavigationEnd(1, '/projects/TM/settings/features', '/projects/TM/settings/features'));
    expect(component.isSettingsSubItemActive(sub)).toBe(false);

    mockRouter.url = '/projects/TM/settings/danger';
    routerEventsSubject.next(new NavigationEnd(1, '/projects/TM/settings/danger', '/projects/TM/settings/danger'));
    expect(component.isSettingsSubItemActive(sub)).toBe(false);
  });

  it('should identify Thành viên sub-item as active when URL matches /settings/members', () => {
    const sub = { label: 'Thành viên', icon: 'pi-users', route: ['members'], exact: false, danger: false };

    mockRouter.url = '/projects/TM/settings/members';
    routerEventsSubject.next(new NavigationEnd(1, '/projects/TM/settings/members', '/projects/TM/settings/members'));
    expect(component.isSettingsSubItemActive(sub)).toBe(true);

    mockRouter.url = '/projects/TM/settings/members/invite';
    routerEventsSubject.next(new NavigationEnd(1, '/projects/TM/settings/members/invite', '/projects/TM/settings/members/invite'));
    expect(component.isSettingsSubItemActive(sub)).toBe(true);
  });
});
