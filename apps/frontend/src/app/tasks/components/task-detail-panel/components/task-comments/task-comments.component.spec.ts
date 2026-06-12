import { Component, EventEmitter, Input, Output, forwardRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NG_VALUE_ACCESSOR, ControlValueAccessor, FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { TaskCommentsComponent } from './task-comments.component';
import { TaskStore } from '../../../../state/task.store';
import { AuthStore } from '../../../../../auth/state/auth.store';
import { AttachmentService } from '../../../../services/attachment.service';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';
import type { TaskComment } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-rich-text-editor',
  template: '<div data-testid="stub-rte"></div>',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StubRteComponent), multi: true }],
})
class StubRteComponent implements ControlValueAccessor {
  @Input() features: any;
  @Input() placeholder = '';
  @Input() autofocus = false;
  @Input() mentionSearch: any;
  @Input() uploadImage: any;
  value: unknown = null;
  onChange: (v: unknown) => void = () => {};
  writeValue(v: unknown): void { this.value = v; }
  registerOnChange(fn: (v: unknown) => void): void { this.onChange = fn; }
  registerOnTouched(): void {}
}

describe('TaskCommentsComponent', () => {
  let mockTaskStore: any;
  let mockAuthStore: any;
  let mockAttachmentService: any;

  beforeEach(() => {
    mockTaskStore = {
      comments: signal<TaskComment[]>([]),
      labels: signal<any[]>([]),
      createComment: jest.fn().mockResolvedValue({}),
      updateComment: jest.fn().mockResolvedValue({}),
      deleteComment: jest.fn().mockResolvedValue({}),
      addReaction: jest.fn().mockResolvedValue({}),
      removeReaction: jest.fn().mockResolvedValue({}),
    };

    mockAuthStore = {
      currentUser: signal<any>({
        id: 'u1',
        displayName: 'User One',
        systemRole: 'User',
        projectRoles: [{ projectId: 'p1', role: 'Developer' }],
      }),
    };

    mockAttachmentService = {
      upload: jest.fn().mockReturnValue(of({ id: 'att1' })),
      getDownloadUrl: jest.fn().mockReturnValue('/api/download/att1'),
    };
  });

  async function setup() {
    TestBed.configureTestingModule({
      imports: [TaskCommentsComponent, FormsModule],
      providers: [
        { provide: TaskStore, useValue: mockTaskStore },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: AttachmentService, useValue: mockAttachmentService },
      ],
    });
    TestBed.overrideComponent(TaskCommentsComponent, {
      remove: { imports: [RichTextEditorComponent] },
      add: { imports: [StubRteComponent] },
    });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(TaskCommentsComponent);
    fixture.componentInstance.projectId = 'p1';
    fixture.componentInstance.taskId = 't1';
    fixture.componentInstance.membersList = [
      { userId: 'u1', displayName: 'User One', email: 'u1@test.com' },
      { userId: 'u2', displayName: 'User Two', email: 'u2@test.com' },
    ];
    fixture.detectChanges();
    return fixture;
  }

  it('should compile and display empty state when comments array is empty', async () => {
    const fixture = await setup();
    expect(fixture.componentInstance).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Chưa có bình luận nào.');
  });

  it('should render parent comments and indented replies', async () => {
    const mockComments: TaskComment[] = [
      {
        id: 'c1',
        taskId: 't1',
        authorId: 'u2',
        authorName: 'User Two',
        authorAvatar: null,
        parentId: null,
        content: '<p>Hello parent</p>',
        mentions: [],
        editedAt: null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        replies: [
          {
            id: 'c2',
            taskId: 't1',
            authorId: 'u1',
            authorName: 'User One',
            authorAvatar: null,
            parentId: 'c1',
            content: '<p>Hello reply</p>',
            mentions: [],
            editedAt: null,
            deletedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            replies: [],
            reactions: [],
          },
        ],
        reactions: [],
      },
    ];
    mockTaskStore.comments.set(mockComments);
    const fixture = await setup();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('User Two');
    expect(compiled.textContent).toContain('Hello parent');
    expect(compiled.textContent).toContain('User One');
    expect(compiled.textContent).toContain('Hello reply');
  });

  describe('Permissions', () => {
    it('should allow editing only own comments', async () => {
      const fixture = await setup();
      const ownComment = { id: 'c1', authorId: 'u1' } as any;
      const otherComment = { id: 'c2', authorId: 'u2' } as any;

      expect(fixture.componentInstance['canEditComment'](ownComment)).toBe(true);
      expect(fixture.componentInstance['canEditComment'](otherComment)).toBe(false);
    });

    it('should allow deletion of own comment, or if privileged user (SM/PO/Admin)', async () => {
      const fixture = await setup();
      const ownComment = { id: 'c1', authorId: 'u1' } as any;
      const otherComment = { id: 'c2', authorId: 'u2' } as any;

      // Current user is developer on project p1. Can delete own comment, but not other's
      expect(fixture.componentInstance['canDeleteComment'](ownComment)).toBe(true);
      expect(fixture.componentInstance['canDeleteComment'](otherComment)).toBe(false);

      // Current user is Scrum Master. Can delete both.
      mockAuthStore.currentUser.set({
        id: 'u1',
        systemRole: 'User',
        projectRoles: [{ projectId: 'p1', role: 'Scrum_Master' }],
      });
      fixture.detectChanges();
      expect(fixture.componentInstance['canDeleteComment'](otherComment)).toBe(true);

      // Current user is Admin. Can delete both.
      mockAuthStore.currentUser.set({
        id: 'u1',
        systemRole: 'Admin',
        projectRoles: [],
      });
      fixture.detectChanges();
      expect(fixture.componentInstance['canDeleteComment'](otherComment)).toBe(true);
    });
  });

  describe('Reactions', () => {
    it('should evaluate hasReacted and getReactorNames correctly', async () => {
      const fixture = await setup();
      const reaction = {
        emoji: '👍',
        count: 2,
        userIds: ['u1', 'u2'],
      };

      expect(fixture.componentInstance['hasReacted'](reaction)).toBe(true);
      expect(fixture.componentInstance['getReactorNames'](reaction)).toBe('User One, User Two');
    });

    it('should call store methods when toggling reaction', async () => {
      const fixture = await setup();
      const comment = { id: 'c1', reactions: [] } as any;

      fixture.componentInstance['toggleReaction'](comment, '👍');
      expect(mockTaskStore.addReaction).toHaveBeenCalledWith('p1', 't1', 'c1', '👍', 'u1');

      const commented = {
        id: 'c1',
        reactions: [{ emoji: '👍', userIds: ['u1'] }],
      } as any;
      fixture.componentInstance['toggleReaction'](commented, '👍');
      expect(mockTaskStore.removeReaction).toHaveBeenCalledWith('p1', 't1', 'c1', '👍', 'u1');
    });
  });

  describe('CRUD Operations', () => {
    it('should submit root comment', async () => {
      const fixture = await setup();
      fixture.componentInstance['newCommentDoc'].set('<p>Root comment</p>');

      fixture.componentInstance['submitRootComment']();
      expect(mockTaskStore.createComment).toHaveBeenCalledWith('p1', 't1', '<p>Root comment</p>', null);
      await fixture.whenStable();
      expect(fixture.componentInstance['newCommentDoc']()).toBeNull();
    });

    it('should submit reply comment', async () => {
      const fixture = await setup();
      const parentComment = { id: 'c1' } as any;
      fixture.componentInstance['activeReplyCommentId'].set('c1');
      fixture.componentInstance['replyCommentDoc'].set('<p>Reply comment</p>');

      fixture.componentInstance['submitReply'](parentComment);
      expect(mockTaskStore.createComment).toHaveBeenCalledWith('p1', 't1', '<p>Reply comment</p>', 'c1');
      await fixture.whenStable();
      expect(fixture.componentInstance['activeReplyCommentId']()).toBeNull();
    });

    it('should update edited comment', async () => {
      const fixture = await setup();
      const comment = { id: 'c1' } as any;
      fixture.componentInstance['editingCommentId'].set('c1');
      fixture.componentInstance['editCommentDoc'].set('<p>Updated comment</p>');

      fixture.componentInstance['saveEdit'](comment);
      expect(mockTaskStore.updateComment).toHaveBeenCalledWith('p1', 't1', 'c1', '<p>Updated comment</p>');
      await fixture.whenStable();
      expect(fixture.componentInstance['editingCommentId']()).toBeNull();
    });
  });

  describe('Editor helpers', () => {
    it('should filter mentions correctly', async () => {
      const fixture = await setup();
      const results = await fixture.componentInstance['mentionSearch']('two');
      expect(results).toEqual([{ id: 'u2', label: 'User Two' }]);
    });

    it('should support image uploads via attachment service', (done) => {
      setup().then((fixture) => {
        const file = new File([''], 'test.png');
        fixture.componentInstance['uploadImage'](file).subscribe((url) => {
          expect(mockAttachmentService.upload).toHaveBeenCalledWith('p1', 't1', file, undefined, 'comment_image');
          expect(url).toBe('/api/download/att1');
          done();
        });
      });
    });
  });
});
