import { TaskAccessDeniedError, TaskNotFoundError } from '../../domain/task.errors';
import {
  OTHER,
  USER,
  asTaskQuery,
  buildContractTask,
  createTaskQueryMock,
  type TaskQueryMock,
} from '../../../../../test/fakes/task-fakes';
import { GetTaskQuery } from './get-task.query';

describe('GetTaskQuery', () => {
  let query: TaskQueryMock;
  let getTask: GetTaskQuery;

  beforeEach(() => {
    query = createTaskQueryMock();
    getTask = new GetTaskQuery(asTaskQuery(query));
  });

  it('正常系: 所有者なら契約 Task を返す', async () => {
    const task = buildContractTask({ id: 'task-1' });
    query.findByIdWithOwner.mockResolvedValue({ task, ownerId: USER });

    const result = await getTask.execute(USER, 'task-1');

    expect(query.findByIdWithOwner).toHaveBeenCalledWith('task-1');
    expect(result).toEqual(task);
  });

  it('異常系: 存在しないタスクは TaskNotFoundError', async () => {
    query.findByIdWithOwner.mockResolvedValue(null);

    await expect(getTask.execute(USER, 'missing')).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it('準正常系: 他人のタスクは TaskAccessDeniedError（存在はするが非所有）', async () => {
    query.findByIdWithOwner.mockResolvedValue({
      task: buildContractTask({ id: 'task-1' }),
      ownerId: OTHER,
    });

    await expect(getTask.execute(USER, 'task-1')).rejects.toBeInstanceOf(TaskAccessDeniedError);
  });
});
