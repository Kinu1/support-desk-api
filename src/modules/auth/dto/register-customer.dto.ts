import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterCustomerDto {
  @ApiProperty({ example: 'Maria Cliente' })
  @IsString()
  @Length(2, 80)
  name!: string;

  @ApiProperty({ example: 'maria.cliente@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'password must include uppercase, lowercase and number',
  })
  password!: string;
}
