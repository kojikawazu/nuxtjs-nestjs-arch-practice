import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** アクセストークン必須を表すガード。コントローラに @UseGuards(JwtAuthGuard) で付与する。 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
