import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../api/auth/auth.types';

/**
 * JwtAuthGuard 通過後に request.user へ格納された認証ユーザーを取り出す。
 * コントローラで `@CurrentUser() user: AuthenticatedUser` と書ける。
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    return request.user;
  },
);
