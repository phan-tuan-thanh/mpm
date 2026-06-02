import { IsString, Length, Matches, IsOptional, MaxLength, IsEnum, IsUUID } from 'class-validator';
import { ProjectNetwork } from '@mpm/shared-types';

export class CreateProjectDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsString()
  @Matches(/^[A-Z]{2,5}$/, {
    message: 'Project Key must be 2-5 uppercase letters.',
  })
  key!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

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
