-- Run AFTER explicit teacher_classes assignments and access checks.
begin;
do $$ begin
 if not exists(select 1 from public.teacher_classes) then raise exception '請先建立教師與班級授權';end if;
 if exists(select 1 from public.classes c where exists(select 1 from public.week1_submissions s where s.class_id=c.id) and not exists(select 1 from public.teacher_classes tc where tc.class_id=c.id)) then raise exception '仍有包含學生資料的班級尚未授權教師';end if;
end $$;
drop policy if exists "teachers read classes" on public.classes;
create policy "teachers read classes" on public.classes for select to authenticated using(public.teaches_class(id));
drop policy if exists "teachers read submissions" on public.week1_submissions;
drop policy if exists "teachers update submissions" on public.week1_submissions;
create policy "teachers read submissions" on public.week1_submissions for select to authenticated using(public.teaches_class(class_id));
create policy "teachers update submissions" on public.week1_submissions for update to authenticated using(public.teaches_class(class_id)) with check(public.teaches_class(class_id));
drop policy if exists "teachers read ai feedback" on public.week1_ai_feedback;
drop policy if exists "teachers moderate ai feedback" on public.week1_ai_feedback;
create policy "teachers read ai feedback" on public.week1_ai_feedback for select to authenticated using(public.teaches_class(class_id));
create policy "teachers moderate ai feedback" on public.week1_ai_feedback for update to authenticated using(public.teaches_class(class_id)) with check(public.teaches_class(class_id));
commit;
