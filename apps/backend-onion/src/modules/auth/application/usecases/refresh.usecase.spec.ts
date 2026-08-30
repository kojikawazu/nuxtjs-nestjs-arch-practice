import {
  USER_ID,
  asRefreshRepo,
  asTokenIssuer,
  asUserRepo,
  buildUser,
  createRefreshRepoMock,
  createTokenIssuerMock,
  createUserRepoMock,
  type RefreshRepoMock,
  type TokenIssuerMock,
  type UserRepoMock,
} from '../../../../../test/fakes/auth-fakes';
import { InvalidRefreshTokenError } from '../../domain/errors/auth.errors';
import { RefreshUseCase } from './refresh.usecase';

describe('RefreshUseCase（ローテーション）', () => {
  let users: UserRepoMock;
  let tokenIssuer: TokenIssuerMock;
  let refreshTokens: RefreshRepoMock;
  let usecase: RefreshUseCase;

  beforeEach(() => {
    users = createUserRepoMock();
    tokenIssuer = createTokenIssuerMock();
    refreshTokens = createRefreshRepoMock();
    usecase = new RefreshUseCase(
      asUserRepo(users),
      asTokenIssuer(tokenIssuer),
      asRefreshRepo(refreshTokens),
    );
  });

  it('正常系: 有効なトークンは回転（使用済み行を削除→新規発行）する', async () => {
    tokenIssuer.verifyRefreshToken.mockResolvedValue({ userId: USER_ID });
    refreshTokens.findMatch.mockResolvedValue({ id: 'rt-1', userId: USER_ID });
    users.findById.mockResolvedValue(buildUser());

    const tokens = await usecase.execute('valid-refresh');

    expect(refreshTokens.findMatch).toHaveBeenCalledWith(USER_ID, 'valid-refresh');
    expect(refreshTokens.consumeById).toHaveBeenCalledWith('rt-1');
    expect(refreshTokens.save).toHaveBeenCalledTimes(1);
    expect(tokens.accessToken).toBe('access-token');
  });

  it('異常系: 署名不正（検証 null）は InvalidRefreshTokenError で照合に進まない', async () => {
    tokenIssuer.verifyRefreshToken.mockResolvedValue(null);

    await expect(usecase.execute('garbage')).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    expect(refreshTokens.findMatch).not.toHaveBeenCalled();
  });

  it('準正常系: 署名は正しいが保存ハッシュに該当無しは InvalidRefreshTokenError でユーザー参照しない', async () => {
    tokenIssuer.verifyRefreshToken.mockResolvedValue({ userId: USER_ID });
    refreshTokens.findMatch.mockResolvedValue(null);

    await expect(usecase.execute('valid-but-revoked')).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('準正常系: ユーザーが消失していれば InvalidRefreshTokenError で回転しない', async () => {
    tokenIssuer.verifyRefreshToken.mockResolvedValue({ userId: USER_ID });
    refreshTokens.findMatch.mockResolvedValue({ id: 'rt-1', userId: USER_ID });
    users.findById.mockResolvedValue(null);

    await expect(usecase.execute('valid-refresh')).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    expect(refreshTokens.consumeById).not.toHaveBeenCalled();
  });

  it('準正常系: 並行リフレッシュで使用済み行を消せなかった側は回転せず 401 になる', async () => {
    tokenIssuer.verifyRefreshToken.mockResolvedValue({ userId: USER_ID });
    refreshTokens.findMatch.mockResolvedValue({ id: 'rt-1', userId: USER_ID });
    users.findById.mockResolvedValue(buildUser());
    // 同じ行を先に消した呼び出しが別にいる（＝この呼び出しは負け）
    refreshTokens.consumeById.mockResolvedValue(false);

    await expect(usecase.execute('valid-refresh')).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    // 負けた側が新しいトークンペアを発行してしまうと、1 本のトークンから 2 本に増える
    expect(refreshTokens.save).not.toHaveBeenCalled();
  });
});
