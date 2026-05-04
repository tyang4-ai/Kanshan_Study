// TODO plan #13: real cache layer (Supabase table or KV namespace)
/* eslint-disable @typescript-eslint/no-unused-vars */
export async function lookupCache<T>(_kind: string, _key: string): Promise<T | null> {
  return null;
}
export async function writeCache<T>(_kind: string, _key: string, _value: T): Promise<void> {
  // no-op until plan #13
}
