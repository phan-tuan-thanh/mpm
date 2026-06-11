import { IsString, IsOptional, Length, MaxLength, IsDateString, IsNumber, Min, Max } from 'class-validator';

export class UpdateSprintDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  goal?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  targetCapacity?: number;
}
