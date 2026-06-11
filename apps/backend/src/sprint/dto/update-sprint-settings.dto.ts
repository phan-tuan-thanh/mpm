import { IsOptional, IsIn, IsInt, Min, Max, IsString, MaxLength } from 'class-validator';
import { CapacityMode, Terminology } from '../types/sprint.types';

export class UpdateSprintSettingsDto {
  @IsOptional()
  @IsIn(['sprint', 'cycle'])
  terminology?: Terminology;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxActiveSprints?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  defaultDurationWeeks?: number;

  @IsOptional()
  @IsIn(['total', 'member-based'])
  capacityMode?: CapacityMode;

  /** Tên class PrimeIcon (vd 'pi-sync') hoặc Emoji */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;
}
