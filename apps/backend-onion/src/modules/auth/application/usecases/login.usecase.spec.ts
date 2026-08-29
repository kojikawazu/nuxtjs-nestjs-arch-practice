import {
  EMAIL,
  asHasher,
  asRefreshRepo,
  asTokenIssuer,
  asUserRepo,
  buildUser,
  createPasswordHasherMock,
  createRefreshRepoMock,
  createTokenIssuerMock,
  createUserRepoMock,
  type PasswordHasherMock,
  type RefreshRepoMock,
  type TokenIssuerMock,
  type UserRepoMock,
} from '../../../../../test/fakes/auth-fakes';
import { InvalidCredentialsError } from '../../domain/errors/auth.errors';
import { LoginUseCase } from './login.usecase';

describe('LoginUseCase', () => {
  let users: UserRepoMock;
  let hasher: PasswordHasherMock;
  let tokenIssuer: TokenIssuerMock;
  let refreshTokens: RefreshRepoMock;
  let usecase: LoginUseCase;

  beforeEach(() => {
    users = createUserRepoMock();
    hasher = createPasswordHasherMock();
    tokenIssuer = createTokenIssuerMock();
    refreshTokens = createRefreshRepoMock();
    usecase = new LoginUseCase(
      asUserRepo(users),
      asHasher(hasher),
      asTokenIssuer(tokenIssuer),
      asRefreshRepo(refreshTokens),
    );
  });

  it('正常系: 正しいパスワードなら保存ハッシュと照合してトークンを発行する', async () => {
    users.findByEmail.mockResolvedValue(buildUser());
    hasher.compare.mockResolvedValue(true);

    const tokens = await usecase.execute({ email: EMAIL, password: 'password123' });

    expect(hasher.compare).toHaveBeenCalledWith('password123', 'stored-hash');
    expect(tokens.accessToken).toBe('access-token');
    expect(refreshTokens.save).toHaveBeenCalledTimes(1);
  });

  it('異常系: パスワード不一致は InvalidCredentialsError でトークンを発行しない', async () => {
    users.findByEmail.mockResolvedValue(buildUser());
    hasher.compare.mockResolvedValue(false);

    await expect(
      usecase.execute({ email: EMAIL, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(refreshTokens.save).not.toHaveBeenCalled();
  });

  it('準正常系: 未登録メールも（存在を漏らさず）InvalidCredentialsError・照合に進まない', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(
      usecase.execute({ email: 'nobody@example.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(hasher.compare).not.toHaveBeenCalled();
  });
});
