import { TaskDraft } from '../../domain/task';
import { TaskEntity } from '../entities/task.entity';
import { TaskMapper } from './task.mapper';

describe('TaskMapper', () => {
  const entity = (): TaskEntity =>
    Object.assign(new TaskEntity(), {
      id: 'task-1',
      userId: 'user-1',
      title: '買い物',
      description: '牛乳',
      status: 'todo' as const,
      startDate: new Date('2026-01-10T00:00:00.000Z'),
      endDate: null,
      url: null,
      imageUrl: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

  it('正常系: Entity → ドメイン → Entity の往復で値が保たれる', () => {
    const domain = TaskMapper.toDomain(entity());
    const back = TaskMapper.toEntity(domain);

    expect(back).toEqual(entity());
  });

  it('正常系: draftToEntity は id を持たず imageUrl は null（DB 採番に委ねる）', () => {
    const draft = TaskDraft.create({
      userId: 'user-1',
      title: '新規',
      description: null,
      status: null,
      startDate: new Date('2026-01-10T00:00:00.000Z'),
      endDate: null,
      url: null,
    });

    const partial = TaskMapper.draftToEntity(draft);

    expect(partial.id).toBeUndefined();
    expect(partial.imageUrl).toBeNull();
    expect(partial.status).toBe('todo');
    expect(partial.userId).toBe('user-1');
  });
});
