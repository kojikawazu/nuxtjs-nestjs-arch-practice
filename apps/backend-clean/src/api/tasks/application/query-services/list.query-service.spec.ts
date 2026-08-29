import {
  USER,
  asTaskQuery,
  buildContractTask,
  createTaskQueryMock,
  type TaskQueryMock,
} from '../../../../../test/fakes/task-fakes';
import { ListTasksQueryService } from './list.query-service';

describe('ListTasksQueryService', () => {
  let query: TaskQueryMock;
  let listTasks: ListTasksQueryService;

  beforeEach(() => {
    query = createTaskQueryMock();
    listTasks = new ListTasksQueryService(asTaskQuery(query));
  });

  it('正常系: 自分の userId で Query を引き、Read Model 配列をそのまま返す', async () => {
    const rows = [buildContractTask({ id: 'task-1' }), buildContractTask({ id: 'task-2' })];
    query.listByUserId.mockResolvedValue(rows);

    const result = await listTasks.execute(USER);

    expect(query.listByUserId).toHaveBeenCalledWith(USER);
    expect(result).toEqual(rows);
  });

  it('準正常系: タスクが無ければ空配列を返す', async () => {
    query.listByUserId.mockResolvedValue([]);

    const result = await listTasks.execute(USER);

    expect(result).toEqual([]);
  });
});
