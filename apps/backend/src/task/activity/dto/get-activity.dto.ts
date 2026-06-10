import { IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import type { ActivityFilterType } from '@mpm/shared-types';

export class GetActivityQueryDto {
  @IsOptional()
  @IsIn(['all', 'activity', 'comments', 'history'])
  type: ActivityFilterType = 'all';

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 30;
}
