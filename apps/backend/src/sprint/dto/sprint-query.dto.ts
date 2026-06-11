import { IsOptional, IsIn, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SprintStatus } from '../types/sprint.types';

export class SprintQueryDto {
  @IsOptional()
  @IsIn(['planning', 'active', 'completed'])
  status?: SprintStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SprintPaginationResponseDto<T> {
  data!: T[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class BurndownDataPointDto {
  date!: string;
  idealStoryPoints!: number;
  idealTasksCount!: number;
  remainingStoryPoints!: number | null;
  remainingTasksCount!: number | null;
}
