-- 一個學號可以同時在多台裝置登入（11/6 課堂：22 人手機重新登入後，電腦那邊的登入立刻失效，Week 5 存檔被擋）。
-- 拿掉 student_sessions 上 (class_id, student_id) 的唯一限制，改成一般索引；token_hash 維持唯一。不刪任何資料。
do $$
declare c record;
begin
 for c in
  select con.conname from pg_constraint con
  join pg_class t on t.oid=con.conrelid
  where t.relname='student_sessions' and con.contype in ('u','p')
   and (select array_agg(a.attname::text order by a.attnum) from pg_attribute a where a.attrelid=t.oid and a.attnum = any(con.conkey)) @> array['student_id']
 loop
  execute format('alter table public.student_sessions drop constraint %I', c.conname);
 end loop;
end $$;
drop index if exists student_sessions_class_id_student_id_key;
create index if not exists student_sessions_class_student_idx on public.student_sessions(class_id, student_id);
create unique index if not exists student_sessions_token_hash_key on public.student_sessions(token_hash);

-- 確認：不再有含 student_id 的唯一限制（應該是 0），token_hash 有唯一索引（應該 ≥1）
select (select count(*) from pg_constraint con join pg_class t on t.oid=con.conrelid
  where t.relname='student_sessions' and con.contype in ('u','p')
  and (select array_agg(a.attname::text) from pg_attribute a where a.attrelid=t.oid and a.attnum=any(con.conkey)) @> array['student_id']) as student_unique_left,
 (select count(*) from pg_indexes where tablename='student_sessions' and indexdef ilike '%unique%token_hash%') as token_unique;
