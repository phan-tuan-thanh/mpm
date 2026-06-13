import { Component, Input, Output, EventEmitter, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { PopoverModule, Popover } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { TaskStore } from '../../../../state/task.store';
import { AuthStore } from '../../../../../auth/state/auth.store';
import { AttachmentService } from '../../../../services/attachment.service';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';
import { RichTextViewerComponent } from '../../../../../shared/components/rich-text-viewer/rich-text-viewer.component';
import { renderDocToHtml } from '../../../../../shared/components/rich-text-viewer/rte-render';
import { RteFeatures } from '../../../../../shared/components/rich-text-editor/rte-features';
import { type MentionItem } from '../../../../../shared/components/rich-text-editor/rte-mention';
import type { TaskComment, TaskCommentReaction } from '@mpm/shared-types';
import { map } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-task-comments',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    PopoverModule,
    TooltipModule,
    RelativeTimePipe,
    RichTextEditorComponent,
    RichTextViewerComponent,
  ],
  templateUrl: './task-comments.component.html',
  styleUrl: './task-comments.component.css',
})
export class TaskCommentsComponent {
  // Injections
  protected readonly taskStore = inject(TaskStore);
  private readonly authStore = inject(AuthStore);
  private readonly attachmentService = inject(AttachmentService);

  // Inputs
  @Input({ required: true }) projectId = '';
  @Input({ required: true }) taskId = '';
  @Input() disabled = false;

  // Members lists from project store for autocomplete mentions
  protected readonly members = computed(() => this.taskStore.labels()); // Wait, members are in projectStore. In task-detail-panel, it is memberOptions. Let's pass members list as input or fetch from TaskStore if available. Actually, TaskStore doesn't store project members directly, but TaskDetailPanelComponent has memberOptions().
  // Let's pass members list as an input to task-comments! That is extremely safe and clean.
  @Input() membersList: any[] = [];

  // Local state
  protected readonly currentUserId = computed(() => this.authStore.currentUser()?.id ?? '');
  protected readonly allowedEmojis = ['👍', '❤️', '🎉', '👀', '✅', '😄'];
  protected readonly commentFeatures: RteFeatures = {
    bold: true,
    italic: true,
    underline: true,
    strike: true,
    bulletList: true,
    orderedList: true,
    link: true,
    image: true,
    mention: true,
    codeBlock: true,
    blockquote: true,
    characterCount: false,
  };

  // State signals
  protected readonly newCommentDoc = signal<any>(null);
  protected readonly activeReplyCommentId = signal<string | null>(null);
  protected readonly replyCommentDoc = signal<any>(null);
  protected readonly editingCommentId = signal<string | null>(null);
  protected readonly editCommentDoc = signal<any>(null);

  // Reaction popover target
  private activeReactionComment: TaskComment | null = null;
  @ViewChild('reactionPopover') reactionPopover?: Popover;

  // Actions popover target
  protected activeActionComment: TaskComment | null = null;
  @ViewChild('actionPopover') actionPopover?: Popover;

  // Methods
  protected getAvatarColor(name: string): string {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  protected getInitial(name: string | null): string {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }

  protected getRelativeTime(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleString('vi-VN');
  }

  protected hasReacted(react: TaskCommentReaction): boolean {
    return react.userIds.includes(this.currentUserId());
  }

  protected getReactorNames(react: TaskCommentReaction): string {
    // Look up display names of users in userIds using the project members list
    return react.userIds
      .map((id) => {
        const member = this.membersList.find((m) => m.userId === id);
        return member ? member.displayName : 'Unknown';
      })
      .join(', ');
  }

  protected toggleReaction(comment: TaskComment, emoji: string): void {
    const reacted = comment.reactions?.find((r) => r.emoji === emoji)?.userIds.includes(this.currentUserId());
    if (reacted) {
      this.taskStore.removeReaction(this.projectId, this.taskId, comment.id, emoji, this.currentUserId());
    } else {
      this.taskStore.addReaction(this.projectId, this.taskId, comment.id, emoji, this.currentUserId());
    }
  }

  protected openReactionPopover(event: Event, comment: TaskComment): void {
    this.activeReactionComment = comment;
    this.reactionPopover?.toggle(event);
  }

  protected selectEmoji(emoji: string): void {
    if (!this.activeReactionComment) return;
    this.toggleReaction(this.activeReactionComment, emoji);
    this.activeReactionComment = null;
  }

  protected openActionPopover(event: Event, comment: TaskComment): void {
    this.activeActionComment = comment;
    this.actionPopover?.toggle(event);
  }

  protected canDeleteComment(comment: TaskComment): boolean {
    if (comment.authorId === this.currentUserId()) return true;
    const user = this.authStore.currentUser();
    if (!user) return false;
    if (user.systemRole === 'Admin') return true;
    const role = user.projectRoles?.find((r) => r.projectId === this.projectId)?.role;
    return role === 'Scrum_Master' || role === 'Product_Owner';
  }

  protected canEditComment(comment: TaskComment): boolean {
    return comment.authorId === this.currentUserId();
  }

  protected startEditComment(comment: TaskComment): void {
    this.actionPopover?.hide();
    this.editingCommentId.set(comment.id);
    // Parse description content as TipTap Doc JSON or HTML. Our rich-text-editor binding expects TipTap JSON or HTML.
    // If our content is HTML, TipTap accepts string HTML. Let's pass the content HTML.
    this.editCommentDoc.set(comment.content);
  }

  protected cancelEdit(): void {
    this.editingCommentId.set(null);
    this.editCommentDoc.set(null);
  }

  protected saveEdit(comment: TaskComment): void {
    const rawVal = this.editCommentDoc();
    if (!rawVal) return;

    // Convert TipTap doc JSON to HTML or use string if it's already string HTML
    const content = typeof rawVal === 'string' ? rawVal : (renderDocToHtml(rawVal) ?? '');
    this.taskStore.updateComment(this.projectId, this.taskId, comment.id, content).then(() => {
      this.cancelEdit();
    });
  }

  protected confirmDeleteComment(comment: TaskComment): void {
    this.actionPopover?.hide();
    if (confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) {
      this.taskStore.deleteComment(this.projectId, this.taskId, comment.id);
    }
  }

  protected showReplyForm(comment: TaskComment): void {
    this.activeReplyCommentId.set(comment.id);
    this.replyCommentDoc.set(null);
  }

  protected cancelReply(): void {
    this.activeReplyCommentId.set(null);
    this.replyCommentDoc.set(null);
  }

  protected submitReply(comment: TaskComment): void {
    const rawVal = this.replyCommentDoc();
    if (!rawVal) return;

    const content = typeof rawVal === 'string' ? rawVal : (renderDocToHtml(rawVal) ?? '');
    this.taskStore.createComment(this.projectId, this.taskId, content, comment.id).then(() => {
      this.cancelReply();
    });
  }

  protected submitRootComment(): void {
    const rawVal = this.newCommentDoc();
    if (!rawVal) return;

    const content = typeof rawVal === 'string' ? rawVal : (renderDocToHtml(rawVal) ?? '');
    this.taskStore.createComment(this.projectId, this.taskId, content, null).then(() => {
      this.newCommentDoc.set(null);
    });
  }

  // Mention search callback passed to RTE
  protected mentionSearch = async (query: string): Promise<MentionItem[]> => {
    const lower = query.toLowerCase();
    return this.membersList
      .filter((m) => m.displayName.toLowerCase().includes(lower) || m.email.toLowerCase().includes(lower))
      .map((m) => ({ id: m.userId, label: m.displayName }));
  };

  // Image upload callback passed to RTE
  protected uploadImage = (file: File) => {
    return this.attachmentService.upload(this.projectId, this.taskId, file, undefined, 'comment_image').pipe(
      map((att: any) => {
        // Return the file download URL as src
        return this.attachmentService.getDownloadUrl(this.projectId, this.taskId, att.id);
      })
    );
  };
}
