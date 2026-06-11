import { IsOptional, IsUUID, IsBoolean, ValidateIf } from 'class-validator';

export class CompleteSprintDto {
  @IsOptional()
  @IsUUID()
  targetSprintId?: string;

  @IsOptional()
  @IsBoolean()
  moveToBacklog?: boolean;
}
