/**
 * tasks の presentation 層から参照する認証ガードの窓口。
 *
 * 実体は auth モジュールが所有する {@link JwtAuthGuard} をそのまま再エクスポートする
 * （複製せず単一実装を共有）。tasks 側のガード参照導線をこのファイルに集約し、
 * Controller は隣の `./guards/jwt-auth.guard` だけを見ればよい状態にする。
 */
export { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
