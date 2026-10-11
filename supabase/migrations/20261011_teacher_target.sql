-- 老師指路：老師的那句回饋可以指向學生卡上的某一格（people / cost / evidence …），
-- 學生端把它變成一顆「老師要你改：__ →」的按鈕。
-- 只新增欄位，不改既有資料；和 teacher_note 一樣不計入學生版本。
begin;

alter table public.week2_submissions
  add column if not exists teacher_target text not null default '';

alter table public.week2_submissions
  drop constraint if exists week2_submissions_teacher_target_check;
alter table public.week2_submissions
  add constraint week2_submissions_teacher_target_check
  check (teacher_target in ('','people','cost','evidence','frequency','workaround','solution','context','interviewees'));

create or replace function public.bump_learning_version() returns trigger language plpgsql set search_path=public as $$
declare student_changed boolean;
begin
 student_changed := (to_jsonb(new) - 'teacher_note' - 'teacher_target' - 'needs_follow_up' - 'review_status' - 'updated_at' - 'version')
                 is distinct from
                    (to_jsonb(old) - 'teacher_note' - 'teacher_target' - 'needs_follow_up' - 'review_status' - 'updated_at' - 'version');
 if student_changed then
   new.version := old.version + 1;
 else
   new.version := old.version;
 end if;
 if old.submitted_at is not null then new.submitted_at := old.submitted_at; end if;
 new.updated_at := now();
 return new;
end $$;

commit;

-- 檢查：欄位存在、既有資料版本沒動
select count(*) as week2_rows,
       count(*) filter (where teacher_target='') as target_empty,
       max(version) as max_version
from public.week2_submissions;
