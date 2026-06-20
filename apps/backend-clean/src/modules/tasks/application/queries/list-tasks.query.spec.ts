import {
  USER,
  asTaskQuery,
  buildContractTask,
  createTaskQueryMock,
  type TaskQueryMock,
} from '../../../../../test/fakes/task-fakes';
import { ListTasksQuery } from './list-tasks.query';

describe('ListTasksQuery', () => {
  let query: TaskQueryMock;
  let listTasks: ListTasksQuery;

  beforeEach(() => {
    query = createTaskQueryMock();
    listTasks = new ListTasksQuery(asTaskQuery(query));
  });

  it('正常系: 自分の userId で Query を引き、契約 Task 配列をそのまま返す', async () => {
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
