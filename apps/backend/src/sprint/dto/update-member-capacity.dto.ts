import { IsUUID, IsNumber, Min, Max } from 'class-validator';

export class UpdateMemberCapacityDto {
  @IsUUID()
  userId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999)
  capacity!: number;
}
