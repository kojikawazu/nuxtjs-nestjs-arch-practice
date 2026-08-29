export { createApiClient, type ApiClient } from './client';
export type { paths, components, operations } from './generated/schema';

import type { components } from './generated/schema';

/** ドメイン型のショートカット（生成スキーマから抽出） */
export type Task = components['schemas']['Task'];
export type User = components['schemas']['User'];
export type TaskStatus = Task['status'];
export type TaskCreate = components['schemas']['TaskCreate'];
export type TaskUpdate = components['schemas']['TaskUpdate'];
export type AuthTokens = components['schemas']['AuthTokens'];
export type RegisterRequest = components['schemas']['RegisterRequest'];
export type LoginRequest = components['schemas']['LoginRequest'];
export type RefreshRequest = components['schemas']['RefreshRequest'];
export type ApiError = components['schemas']['ApiError'];
export type ValidationError = components['schemas']['ValidationError'];
