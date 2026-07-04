import {
  EMAIL,
  USER_ID,
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
import { EmailAlreadyRegisteredError } from '../../domain/auth.errors';
import { RegisterUseCase } from './register.usecase';

describe('RegisterUseCase', () => {
  let users: UserRepoMock;
  let hasher: PasswordHasherMock;
  let tokenIssuer: TokenIssuerMock;
  let refreshTokens: RefreshRepoMock;
  let usecase: RegisterUseCase;

  beforeEach(() => {
    users = createUserRepoMock();
    hasher = createPasswordHasherMock();
    tokenIssuer = createTokenIssuerMock();
    refreshTokens = createRefreshRepoMock();
    usecase = new RegisterUseCase(
      asUserRepo(users),
      asHasher(hasher),
      asTokenIssuer(tokenIssuer),
      asRefreshRepo(refreshTokens),
    );
  });

  it('正常系: 未登録メールはハッシュ化して作成し、トークンを発行する（passwordHash は契約に出さない）', async () => {
    users.findByEmail.mockResolvedValue(null);
    users.create.mockResolvedValue(buildUser());

    const tokens = await usecase.execute({
      email: EMAIL,
      password: 'password123',
      displayName: 'taro',
    });

    // 平文ではなくハッシュを保存する
    expect(hasher.hash).toHaveBeenCalledWith('password123');
    expect(users.create).toHaveBeenCalledWith({
      email: EMAIL,
      passwordHash: 'hashed-password',
      displayName: 'taro',
    });
    // リフレッシュは発行値＋有効期限で保存される
    expect(refreshTokens.save).toHaveBeenCalledWith(USER_ID, 'refresh-token', expect.any(Date));
    expect(tokens.accessToken).toBe('access-token');
    expect(tokens.refreshToken).toBe('refresh-token');
    expect(tokens.user.email).toBe(EMAIL);
    expect(tokens.user).not.toHaveProperty('passwordHash');
  });

  it('準正常系: 既登録メールは EmailAlreadyRegisteredError で、作成もトークン発行もしない', async () => {
    users.findByEmail.mockResolvedValue(buildUser());

    await expect(
      usecase.execute({ email: EMAIL, password: 'password123', displayName: 'taro' }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);

    expect(hasher.hash).not.toHaveBeenCalled();
    expect(users.create).not.toHaveBeenCalled();
    expect(refreshTokens.save).not.toHaveBeenCalled();
  });
});
