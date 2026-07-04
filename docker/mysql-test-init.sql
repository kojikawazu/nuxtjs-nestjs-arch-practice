-- mysql-test コンテナの初回起動時に実行される（docker-entrypoint-initdb.d）。
-- 1 つのコンテナを「DB 名で二役」に使うため、IT / E2E それぞれ専用の DB を用意する。
-- （MYSQL_DATABASE=taskdb_test は entrypoint が既定で作成するため、ここでは it / e2e 用を作る）
CREATE DATABASE IF NOT EXISTS taskdb_it CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS taskdb_e2e CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- MYSQL_USER（taskuser）は既定で MYSQL_DATABASE のみアクセス可のため、追加 DB に権限を与える。
GRANT ALL PRIVILEGES ON taskdb_it.* TO 'taskuser'@'%';
GRANT ALL PRIVILEGES ON taskdb_e2e.* TO 'taskuser'@'%';
FLUSH PRIVILEGES;
