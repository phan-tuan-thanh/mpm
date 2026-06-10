import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ProjectStore } from '../../projects/state/project.store';
import { MessageService } from 'primeng/api';

export const projectFeatureGuard: CanActivateFn = async (route, state) => {
  const projectStore = inject(ProjectStore);
  const router = inject(Router);
  const messageService = inject(MessageService);

  // Traverse route parameters to find the project key
  let key = route.params['key'] || route.parent?.params?.['key'];
  if (!key) {
    let curr = route;
    while (curr && !key) {
      key = curr.params?.['key'];
      if (!key && curr.parent) {
        curr = curr.parent;
      } else {
        break;
      }
    }
  }

  if (!key) {
    return true;
  }

  const currentProj = projectStore.currentProject();
  if (!currentProj || currentProj.key !== key) {
    await new Promise<void>((resolve) => {
      projectStore.loadProject(
        key,
        () => resolve(),
        () => resolve()
      );
    });
  }

  const proj = projectStore.currentProject();
  if (!proj) {
    return router.createUrlTree(['/projects']);
  }

  const feature = route.data?.['feature'] as string;
  if (!feature) {
    return true;
  }

  const isEnabled = (proj.features as any)[feature] ?? false;
  if (isEnabled) {
    return true;
  }

  // Display toast detail message matching requirement
  const featureNames: Record<string, string> = {
    cycles: 'Cycles',
    modules: 'Modules',
    views: 'Views',
    pages: 'Pages',
    intake: 'Intake',
    timeTracking: 'Time Tracking',
  };
  const featureName = featureNames[feature] || 'Tính năng';

  messageService.add({
    severity: 'info',
    summary: 'Chưa bật tính năng',
    detail: `Tính năng ${featureName} chưa được bật cho project này.`,
  });

  return router.createUrlTree(['/projects', key, 'workitem']);
};
