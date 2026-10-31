import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import tseslint from 'typescript-eslint';

/**
 * 層ごとの「import してはいけない層」。依存は常に内向き（presentation → application → domain）で、
 * infrastructure は契約を実装する側として内向きにだけ依存する（依存性逆転）。
 *
 * 対象は clean / onion のみ。layered は presentation → application → infrastructure の素直な依存
 * （＝ Port による逆転をしない）こと自体が比較軸なので、意図的に対象外にする。
 *
 * infrastructure → application だけはアーキで扱いが分かれる。契約（Port）の所在が違うため:
 * - clean: 契約は application/ports/ にあるので、それを implements するために ports/ だけは import してよい。
 *   それ以外（usecases / validators / services など）は実装の詳細が中心のロジックへ入り込む経路なので塞ぐ。
 * - onion: 契約は domain が所有するので、infrastructure が application を見る理由が無い。全面的に塞ぐ。
 * 旧設定は「application 全体を許可」で、守られていたのはたまたまだった（どちらも違反 0 件の状態から締めた）。
 *
 * 要素は層名（その層の全体を禁止）か、{ target, except }（except 配下だけ許可）。
 */
const COMMON_FORBIDDEN = {
  domain: ['application', 'infrastructure', 'presentation'],
  application: ['infrastructure', 'presentation'],
  presentation: ['infrastructure'],
};
const FORBIDDEN_IMPORTS_BY_ARCH = {
  clean: {
    ...COMMON_FORBIDDEN,
    infrastructure: ['presentation', { target: 'application', except: 'ports' }],
  },
  onion: {
    ...COMMON_FORBIDDEN,
    infrastructure: ['presentation', 'application'],
  },
};

// 禁止パターン 1 件分を組み立てる。
// except があるときは group ではなく regex で書く。group は gitignore 形式で、`**/application/**` が
// application/ports ディレクトリごと除外するため、`!**/application/ports/**` で配下を戻せない
// （gitignore の「親ディレクトリが除外されたファイルは再び含められない」規則）。
// そこで正規表現の否定先読みで「target/ の直後が except/ 以外」だけを禁止する。
function toRestrictedPattern(layer, rule) {
  const { target, except } = typeof rule === 'string' ? { target: rule } : rule;
  const message = `依存方向違反: ${layer} から ${target} を import しない${
    except ? `（${target}/${except}/ の契約だけは implements のために許可）` : ''
  }（依存は内向きに保つ）。外部 I/O が必要なら Port（interface + DI トークン）を足し、実装は infrastructure に置いて *.module.ts で束ねる。`;
  if (except) {
    // 例: ../../application/usecases/x は一致、../../application/ports/x は一致しない、../../application 単体は一致
    return { regex: `(^|/)${target}(/(?!${except}(/|$))|$)`, message };
  }
  return { group: [`**/${target}/**`, `**/${target}`], message };
}

// 相対 import のパス文字列に層名が現れる（barrel を置かない方針のため）ことを利用して禁止方向を塞ぐ。
// `*.module.ts` は feature 直下＝層の外にあるため、どの files にも一致せず合成ルートとして自由に配線できる。
// 同じファイルに同じルールの設定が 2 つ当たると後勝ちで上書きされる（マージされない）ため、
// (アーキ, 層) の組ごとに 1 つの設定にまとめ、files が重ならないようにしている。
const layerBoundaryConfigs = Object.entries(FORBIDDEN_IMPORTS_BY_ARCH).flatMap(([arch, byLayer]) =>
  Object.entries(byLayer).map(([layer, forbidden]) => ({
    files: [`apps/backend-${arch}/src/**/${layer}/**/*.ts`],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: forbidden.map((rule) => toRestrictedPattern(layer, rule)) },
      ],
    },
  })),
);

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      '**/.nuxt/**',
      '**/coverage/**',
      '**/tsp-output/**',
      '**/generated/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/*.cjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // JSDoc 強制（house 慣習）: controller の全ハンドラと application の entry-point（execute）に JSDoc を必須化する。
  // 型はシグネチャが真実なので型ブレース系は off。@param 名の一致（check-param-names）も担保する（→ colon 併記は不可・dash スタイル）。
  {
    files: [
      'apps/backend-*/src/**/*.controller.ts',
      'apps/backend-*/src/**/application/**/*.usecase.ts',
      'apps/backend-*/src/**/application/**/*.query.ts',
      'apps/backend-*/src/**/application/**/*.query-service.ts',
      'apps/backend-*/src/**/application/**/*.validator.ts',
    ],
    plugins: { jsdoc },
    rules: {
      // constructor は対象外（薄い委譲層のハンドラ／execute にのみ JSDoc を要求）
      'jsdoc/require-jsdoc': [
        'error',
        { require: { MethodDefinition: true }, checkConstructors: false },
      ],
      // 全引数に @param を要求する（引数の説明漏れを防ぐ）
      'jsdoc/require-param': 'error',
      // @param は名前だけでなく説明文を必須にする
      'jsdoc/require-param-description': 'error',
      // @param 名を実引数名と突き合わせる（名前ズレ・順序違い・過不足を検出）。※ colon 併記は不可＝dash スタイル必須
      'jsdoc/check-param-names': 'error',
      // 戻り値がある関数には @returns を要求する
      'jsdoc/require-returns': 'error',
      // @returns に説明文を必須にする
      'jsdoc/require-returns-description': 'error',
      // TypeScript: 型は書かない（シグネチャが source of truth）。型ブレース系ルールは off にする
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-returns-type': 'off',
    },
  },
  // 層の依存方向を機械強制する（規約 → CI で落ちる状態にする）
  ...layerBoundaryConfigs,
);
