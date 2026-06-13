import { IsNotEmpty, IsString } from 'class-validator';
import type { RefreshRequest } from '@app/api-client';

export class RefreshDto implements RefreshRequest {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
