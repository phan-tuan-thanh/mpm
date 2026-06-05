import { Injectable, inject, signal } from '@angular/core';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ModuleService, CreateModuleDto, UpdateModuleDto, ModuleQueryParams } from '../services/module.service';
import type { ProjectModule } from '@mpm/shared-types';

@Injectable({ providedIn: 'root' })
export class ModuleStore {
  private readonly moduleService = inject(ModuleService);

  readonly modules = signal<ProjectModule[]>([]);
  readonly isLoading = signal(false);

  // --- Project-scoped module operations ---

  loadModules(projectId: string, query?: ModuleQueryParams): void {
    this.isLoading.set(true);
    this.moduleService
      .getModules(projectId, query)
      .pipe(
        catchError(() => of([])),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((data) => this.modules.set(data));
  }

  createModule(projectId: string, dto: CreateModuleDto): Promise<ProjectModule | null> {
    return new Promise((resolve) => {
      this.moduleService
        .createModule(projectId, dto)
        .pipe(catchError(() => of(null)))
        .subscribe((module) => {
          if (module) {
            this.modules.update((prev) => [...prev, module]);
          }
          resolve(module);
        });
    });
  }

  updateModule(projectId: string, moduleId: string, dto: UpdateModuleDto): void {
    this.moduleService
      .updateModule(projectId, moduleId, dto)
      .pipe(catchError(() => of(null)))
      .subscribe((updated) => {
        if (updated) {
          this.modules.update((prev) =>
            prev.map((m) => (m.id === moduleId ? { ...m, ...updated } : m)),
          );
        }
      });
  }

  deleteModule(projectId: string, moduleId: string): void {
    this.moduleService
      .deleteModule(projectId, moduleId)
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.modules.update((prev) => prev.filter((m) => m.id !== moduleId));
      });
  }

  // --- Task assignment operations ---

  addTasksToModule(projectId: string, moduleId: string, taskIds: string[]): Promise<{ added: number; alreadyExists: number } | null> {
    return new Promise((resolve) => {
      this.moduleService
        .addTasksToModule(projectId, moduleId, taskIds)
        .pipe(catchError(() => of(null)))
        .subscribe((result) => resolve(result));
    });
  }

  removeTaskFromModule(projectId: string, moduleId: string, taskId: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.moduleService
        .removeTaskFromModule(projectId, moduleId, taskId)
        .pipe(catchError(() => of(null)))
        .subscribe((result) => {
          resolve(result !== null);
        });
    });
  }

  // --- Workspace-scoped module operations ---

  loadWorkspaceModules(workspaceId: string): void {
    this.isLoading.set(true);
    this.moduleService
      .getWorkspaceModules(workspaceId)
      .pipe(
        catchError(() => of([])),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((data) => this.modules.set(data));
  }

  createWorkspaceModule(workspaceId: string, dto: CreateModuleDto): Promise<ProjectModule | null> {
    return new Promise((resolve) => {
      this.moduleService
        .createWorkspaceModule(workspaceId, dto)
        .pipe(catchError(() => of(null)))
        .subscribe((module) => {
          if (module) {
            this.modules.update((prev) => [...prev, module]);
          }
          resolve(module);
        });
    });
  }

  updateWorkspaceModule(workspaceId: string, moduleId: string, dto: UpdateModuleDto): void {
    this.moduleService
      .updateWorkspaceModule(workspaceId, moduleId, dto)
      .pipe(catchError(() => of(null)))
      .subscribe((updated) => {
        if (updated) {
          this.modules.update((prev) =>
            prev.map((m) => (m.id === moduleId ? { ...m, ...updated } : m)),
          );
        }
      });
  }

  deleteWorkspaceModule(workspaceId: string, moduleId: string): void {
    this.moduleService
      .deleteWorkspaceModule(workspaceId, moduleId)
      .pipe(catchError(() => of(null)))
      .subscribe((response) => {
        if (response !== undefined) {
          this.modules.update((prev) => prev.filter((m) => m.id !== moduleId));
        }
      });
  }
}
