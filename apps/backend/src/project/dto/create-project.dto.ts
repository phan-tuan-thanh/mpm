import { IsString, Length, Matches, IsOptional, MaxLength } from 'class-validator';

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
}
