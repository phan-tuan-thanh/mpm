import { IsString, MaxLength, Matches, IsOptional } from 'class-validator';

export class UpdatePriorityDto {
  @IsOptional() @IsString() @MaxLength(50)
  name?: string;

  @IsOptional() @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorLight?: string;

  @IsOptional() @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorDark?: string;

  @IsOptional() @IsString() @MaxLength(100)
  icon?: string;
}
