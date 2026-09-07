-- KANT BIBLE 관리자 기능 업그레이드
-- 기존 books / lectures 생성 후 이 SQL을 한 번 실행하세요.

-- 1) 업로드한 원본 파일명 저장
alter table public.lectures
  add column if not exists source_filename text;

-- 2) 관리자 이메일 목록
create table if not exists public.admins (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

drop policy if exists "Admin can see own admin record" on public.admins;
create policy "Admin can see own admin record"
on public.admins
for select
to authenticated
using (
  lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- 3) 관리자는 모든 강의안을 볼 수 있음
drop policy if exists "Admins can read all lectures" on public.lectures;
create policy "Admins can read all lectures"
on public.lectures
for select
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

-- 4) 관리자는 강의안 업로드 가능
drop policy if exists "Admins can insert lectures" on public.lectures;
create policy "Admins can insert lectures"
on public.lectures
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

-- 5) 관리자는 공개/비공개 및 내용 수정 가능
drop policy if exists "Admins can update lectures" on public.lectures;
create policy "Admins can update lectures"
on public.lectures
for update
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
)
with check (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

-- 6) 관리자는 강의안 삭제 가능
drop policy if exists "Admins can delete lectures" on public.lectures;
create policy "Admins can delete lectures"
on public.lectures
for delete
to authenticated
using (
  exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

-- 7) 아래 이메일을 실제 관리자 이메일로 바꾼 뒤 실행하세요.
-- 예:
-- insert into public.admins(email) values ('my@email.com')
-- on conflict (email) do nothing;

select '관리자 기능용 정책이 준비되었습니다.' as message;
