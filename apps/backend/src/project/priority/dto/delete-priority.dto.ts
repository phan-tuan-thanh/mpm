import { IsString } from 'class-validator';

export class DeletePriorityDto {
  @IsString()
  migrateToValue!: string;
}
