-- PART 4/5: Storage bucket for screenshots
-- Paste and Run after part 3 succeeds
-- If bucket already exists, ignore the error and continue

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload screenshots" on storage.objects;
create policy "Users can upload screenshots"
  on storage.objects for insert
  with check (
    bucket_id = 'screenshots'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Anyone can view screenshots" on storage.objects;
create policy "Anyone can view screenshots"
  on storage.objects for select
  using (bucket_id = 'screenshots');

drop policy if exists "Users can update own screenshots" on storage.objects;
create policy "Users can update own screenshots"
  on storage.objects for update
  using (
    bucket_id = 'screenshots'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own screenshots" on storage.objects;
create policy "Users can delete own screenshots"
  on storage.objects for delete
  using (
    bucket_id = 'screenshots'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
