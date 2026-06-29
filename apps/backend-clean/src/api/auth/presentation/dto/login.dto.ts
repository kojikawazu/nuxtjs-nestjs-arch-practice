import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import type { LoginRequest } from '@app/api-client';

export class LoginDto implements LoginRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
