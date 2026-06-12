import type { Task as ContractTask } from '@app/api-client';
import type { Task } from '../domain/task';

/**
 * ドメイン Task → API 契約形（@app/api-client の Task）への変換（presentation 層）。
 * 日時は ISO 文字列に、未設定（null）は契約上の省略（undefined）に正規化する。
 */
export function toContractTask(task: Task): ContractTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    status: task.status,
    startDate: task.startDate.toISOString(),
    endDate: task.endDate ? task.endDate.toISOString() : undefined,
    url: task.url ?? undefined,
    imageUrl: task.imageUrl ?? undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
