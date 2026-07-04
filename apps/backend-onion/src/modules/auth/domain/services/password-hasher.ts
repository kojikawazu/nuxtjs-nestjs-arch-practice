/** DI トークン。 */
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

/**
 * パスワードハッシュ化の契約（オニオンでは「ドメインが要求する能力」として domain/services に置く）。
 *
 * application 層は bcrypt を直接知らず、この interface 経由で扱う。
 * 実装は infrastructure（BcryptPasswordHasher）が提供する。
 */
export interface PasswordHasher {
  /** 平文パスワードをハッシュ化する。 */
  hash(plain: string): Promise<string>;
  /** 平文とハッシュが一致するか（定数時間比較はライブラリに委ねる）。 */
  compare(plain: string, hash: string): Promise<boolean>;
}
