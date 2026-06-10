import { IsArray, ValidateNested, IsUUID, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class ReorderPriorityItem {
  @IsUUID()
  priorityId!: string;

  @IsInt()
  order!: number;
}

export class ReorderPrioritiesDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReorderPriorityItem)
  items!: ReorderPriorityItem[];
}
