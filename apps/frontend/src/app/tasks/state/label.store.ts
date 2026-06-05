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

  updateLabel(projectId: string, labelId: string, dto: UpdateLabelDto): void {
    this.labelService
      .updateLabel(projectId, labelId, dto)
      .pipe(catchError(() => of(null)))
      .subscribe((updated) => {
        if (updated) {
          this.labels.update((prev) =>
            prev.map((l) => (l.id === labelId ? { ...l, ...updated } : l)),
          );
        }
      });
  }

  deleteLabel(projectId: string, labelId: string): void {
    this.labelService
      .deleteLabel(projectId, labelId)
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.labels.update((prev) => prev.filter((l) => l.id !== labelId));
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

  updateWorkspaceLabel(workspaceId: string, labelId: string, dto: UpdateLabelDto): void {
    this.labelService
      .updateWorkspaceLabel(workspaceId, labelId, dto)
      .pipe(catchError(() => of(null)))
      .subscribe((updated) => {
        if (updated) {
          this.labels.update((prev) =>
            prev.map((l) => (l.id === labelId ? { ...l, ...updated } : l)),
          );
        }
      });
  }

  deleteWorkspaceLabel(workspaceId: string, labelId: string): void {
    this.labelService
      .deleteWorkspaceLabel(workspaceId, labelId)
      .pipe(catchError(() => of(null)))
      .subscribe((response) => {
        if (response) {
          this.labels.update((prev) => prev.filter((l) => l.id !== labelId));
        }
      });
  }
}
