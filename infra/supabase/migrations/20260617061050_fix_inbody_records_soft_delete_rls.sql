drop policy if exists "Users can update their own records" on public.inbody_records;
create policy "Users can update their own records"
on public.inbody_records
for update
using (
  auth.uid() = user_id
  and deleted_at is null
)
with check (auth.uid() = user_id);
