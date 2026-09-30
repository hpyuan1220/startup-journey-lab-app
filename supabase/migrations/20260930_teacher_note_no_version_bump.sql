-- 老師寫 teacher_note 不該把學生的版本號往上加。
--
-- week1_version / week2_version 這兩個觸發器對任何 update 都生效，包括老師留言。
-- 結果是：學生提交一次（第 1 版）→ 老師留言 → 學生回來看到「第 2 版」，
-- 但他根本沒有再提交過；learning_versions 也會多一筆沒有內容變動的快照。
--
-- 改法：只有在學生自己填的欄位真的變了，才 version+1 並留快照。
-- 教師欄位（teacher_note、needs_follow_up、review_status）單獨更新時不進版。

create or replace function public.bump_learning_version() returns trigger language plpgsql set search_path=public as $$
declare student_changed boolean;
begin
 -- 比較「學生可寫的那一份」。to_jsonb 後移除教師欄位與時間戳，兩邊一樣就代表
 -- 這次更新只動到教師欄位。
 student_changed := (to_jsonb(new) - 'teacher_note' - 'needs_follow_up' - 'review_status' - 'updated_at' - 'version')
                 is distinct from
                    (to_jsonb(old) - 'teacher_note' - 'needs_follow_up' - 'review_status' - 'updated_at' - 'version');
 if student_changed then
   new.version := old.version + 1;
 else
   new.version := old.version;
 end if;
 if old.submitted_at is not null then new.submitted_at := old.submitted_at; end if;
 new.updated_at := now();
 return new;
end $$;

-- 快照同樣跳過「只有教師欄位變動」的更新，否則版本號沒動卻多出一筆快照。
create or replace function public.snapshot_learning() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if TG_OP = 'UPDATE' and new.version = old.version then
   return new;
 end if;
 insert into public.learning_versions(class_id,student_id,week,version,snapshot)
 values(new.class_id,new.student_id,TG_ARGV[0]::integer,new.version,to_jsonb(new));
 return new;
end $$;
