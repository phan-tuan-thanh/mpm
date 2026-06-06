import { Injectable, inject, signal } from '@angular/core';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { LabelService } from '../services/label.service';
import type { Label, CreateLabelDto, UpdateLabelDto } from '@mpm/shared-types';

@Injectable({ providedIn: 'root' })
export class LabelStore {
  private readonly labelService = inject(LabelService);

  readonly labels = signal<Array<Label & { taskCount: number }>>([]);
  readonly isLoading = signal(false);

  // --- Project-scoped label operations ---

  loadLabels(projectId: string): void {
    this.isLoading.set(true);
    this.labelService
      .getLabels(projectId)
      .pipe(
        catchError(() => of([])),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((data) => this.labels.set(data));
  }

  createLabel(projectId: string, dto: CreateLabelDto): Promise<Label | null> {
    return new Promise((resolve) => {
      this.labelService
        .createLabel(projectId, dto)
        .pipe(catchError(() => of(null)))
        .subscribe((label) => {
          if (label) {
            this.labels.update((prev) => [...prev, { ...label, taskCount: 0 }]);
          }
          resolve(label);
        });
    });
  }

  updateLabel(projectId: string, labelId: string, dto: UpdateLabelDto): Promise<Label | null> {
    return new Promise((resolve) => {
      this.labelService
        .updateLabel(projectId, labelId, dto)
        .pipe(catchError(() => of(null)))
        .subscribe((updated) => {
          if (updated) {
            this.labels.update((prev) => {
              const scopeName = updated.name.includes('::') ? updated.name.split('::')[0].trim().toLowerCase() : null;
              return prev.map((l) => {
                if (l.id === labelId) {
                  return { ...l, ...updated };
                }
                if (scopeName && l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scopeName) {
                  return { ...l, isExclusive: updated.isExclusive };
                }
                return l;
              });
            });
          }
          resolve(updated);
        });
    });
  }

  deleteLabel(projectId: string, labelId: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.labelService
        .deleteLabel(projectId, labelId)
        .pipe(catchError(() => of(false)))
        .subscribe((res) => {
          if (res !== false) {
            this.labels.update((prev) => prev.filter((l) => l.id !== labelId));
            resolve(true);
          } else {
            resolve(false);
          }
        });
    });
  }

  // --- Workspace-scoped label operations ---

  loadWorkspaceLabels(workspaceId: string): void {
    this.isLoading.set(true);
    this.labelService
      .getWorkspaceLabels(workspaceId)
      .pipe(
        catchError(() => of([])),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((data) => this.labels.set(data));
  }

  createWorkspaceLabel(workspaceId: string, dto: CreateLabelDto): Promise<Label | null> {
    return new Promise((resolve) => {
      this.labelService
        .createWorkspaceLabel(workspaceId, dto)
        .pipe(catchError(() => of(null)))
        .subscribe((label) => {
          if (label) {
            this.labels.update((prev) => [...prev, { ...label, taskCount: 0 }]);
          }
          resolve(label);
        });
    });
  }

  updateWorkspaceLabel(workspaceId: string, labelId: string, dto: UpdateLabelDto): Promise<Label | null> {
    return new Promise((resolve) => {
      this.labelService
        .updateWorkspaceLabel(workspaceId, labelId, dto)
        .pipe(catchError(() => of(null)))
        .subscribe((updated) => {
          if (updated) {
            this.labels.update((prev) => {
              const scopeName = updated.name.includes('::') ? updated.name.split('::')[0].trim().toLowerCase() : null;
              return prev.map((l) => {
                if (l.id === labelId) {
                  return { ...l, ...updated };
                }
                if (scopeName && l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scopeName) {
                  return { ...l, isExclusive: updated.isExclusive };
                }
                return l;
              });
            });
          }
          resolve(updated);
        });
    });
  }

  deleteWorkspaceLabel(workspaceId: string, labelId: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.labelService
        .deleteWorkspaceLabel(workspaceId, labelId)
        .pipe(catchError(() => of(null)))
        .subscribe((response) => {
          if (response) {
            this.labels.update((prev) => prev.filter((l) => l.id !== labelId));
            resolve(true);
          } else {
            resolve(false);
          }
        });
    });
  }
}
