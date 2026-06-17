drop policy if exists "Users can view their own records" on public.inbody_records;
create policy "Users can view their own records"
on public.inbody_records
for select
using (auth.uid() = user_id);
