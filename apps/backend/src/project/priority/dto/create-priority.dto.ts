import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class CreatePriorityDto {
  @IsString() @IsNotEmpty() @MaxLength(50)
  name!: string;

  @IsString() @MaxLength(50) @Matches(/^[a-z0-9_-]+$/)
  value!: string;

  @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorLight!: string;

  @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorDark!: string;

  @IsString() @MaxLength(100)
  icon!: string;
}
