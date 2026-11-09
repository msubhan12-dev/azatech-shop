import { IsString, MinLength } from 'class-validator';

export class CancelOrderDto {
  @IsString()
  @MinLength(5)
  cancel_reason!: string;
}