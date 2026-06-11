import { IsString, MaxLength, Matches } from 'class-validator';

export class DeletePriorityDto {
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9_-]+$/)
  migrateToValue!: string;
}
