import type { Task as TaskContract } from '@app/api-client';
import type { Task } from '../../domain/entities/task';

/** ドメイン Task → API 契約形（@app/api-client の Task）。未設定（null）は省略（undefined）に。 */
export function toContractTask(task: Task): TaskContract {
  const s = task.toState();
  return {
    id: s.id,
    title: s.title,
    description: s.description ?? undefined,
    status: s.status,
    startDate: s.period.start.toISOString(),
    endDate: s.period.end?.toISOString() ?? undefined,
    url: s.url ?? undefined,
    imageUrl: s.imageUrl ?? undefined,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}
