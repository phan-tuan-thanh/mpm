import { IsString, Length, IsOptional, MaxLength, IsEnum, IsUUID } from 'class-validator';
import { ProjectNetwork } from '@mpm/shared-types';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  emoji?: string | null;

  @IsOptional()
  @IsEnum(ProjectNetwork)
  network?: ProjectNetwork;

  @IsOptional()
  @IsUUID()
  leadId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}
