/**
 * CategoryRegistry ドメインで扱う共通型。
 */

/** カテゴリ／親カテゴリ／トップカテゴリの ID 名前ペア */
export interface CategoryRef {
  id: string;
  name: string;
}
