import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class AssignTasksDto {
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  taskIds!: string[];
}

export class BulkRemoveTasksDto {
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  taskIds!: string[];
}
