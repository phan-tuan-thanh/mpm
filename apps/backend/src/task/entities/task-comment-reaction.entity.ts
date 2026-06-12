import { Entity, PrimaryColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TaskComment } from './task-comment.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('task_comment_reactions')
export class TaskCommentReaction {
  @PrimaryColumn({ name: 'comment_id', type: 'uuid' })
  commentId!: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'varchar', length: 50 })
  emoji!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  // Relationships
  @ManyToOne(() => TaskComment, (c) => c.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment!: TaskComment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
