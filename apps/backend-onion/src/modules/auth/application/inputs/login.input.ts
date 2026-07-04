import type { LoginRequest } from '@app/api-client';

/** ログインユースケースの入力（application 層が所有する Command 型）。 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * 契約ボディ（`LoginRequest`）から {@link LoginInput} を組み立てる。
 * 入力に契約型を取るため application は presentation の DTO に依存しない。
 */
export function toLoginInput(body: LoginRequest): LoginInput {
  return {
    email: body.email,
    password: body.password,
  };
}
