import { IsArray, ValidateNested, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class ReorderPriorityItem {
  @IsString()
  priorityId!: string;

  @IsNumber()
  order!: number;
}

export class ReorderPrioritiesDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReorderPriorityItem)
  items!: ReorderPriorityItem[];
}
