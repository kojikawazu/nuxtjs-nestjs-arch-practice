import type { RegisterRequest } from '@app/api-client';

/** 登録ユースケースの入力（application 層が所有する Command 型）。 */
export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

/**
 * 契約ボディ（`RegisterRequest`）から {@link RegisterInput} を組み立てる。
 * 入力に契約型を取るため application は presentation の DTO に依存しない。
 */
export function toRegisterInput(body: RegisterRequest): RegisterInput {
  return {
    email: body.email,
    password: body.password,
    displayName: body.displayName,
  };
}
