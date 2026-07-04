import {
  USER_ID,
  asRefreshRepo,
  createRefreshRepoMock,
  type RefreshRepoMock,
} from '../../../../../test/fakes/auth-fakes';
import { LogoutUseCase } from './logout.usecase';

describe('LogoutUseCase', () => {
  let refreshTokens: RefreshRepoMock;
  let usecase: LogoutUseCase;

  beforeEach(() => {
    refreshTokens = createRefreshRepoMock();
    usecase = new LogoutUseCase(asRefreshRepo(refreshTokens));
  });

  it('正常系: ユーザーのリフレッシュトークンをすべて失効させる', async () => {
    await usecase.execute(USER_ID);

    expect(refreshTokens.deleteAllForUser).toHaveBeenCalledWith(USER_ID);
  });
});
