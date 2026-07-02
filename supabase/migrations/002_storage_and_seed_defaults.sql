insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-files',
  'order-files',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

create policy "order-files authenticated read"
on storage.objects for select
using (
  bucket_id = 'order-files'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy "order-files authenticated upload"
on storage.objects for insert
with check (
  bucket_id = 'order-files'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
  and (metadata->>'size')::bigint <= 10485760
);

create policy "order-files authenticated update"
on storage.objects for update
using (
  bucket_id = 'order-files'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'order-files'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy "order-files authenticated delete"
on storage.objects for delete
using (
  bucket_id = 'order-files'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

create or replace function public.seed_organization_defaults(target_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  shirt_id uuid;
  skirt_id uuid;
  dress_id uuid;
  trench_id uuid;
  jacket_id uuid;
begin
  insert into public.organization_settings (organization_id)
  values (target_organization_id)
  on conflict (organization_id) do nothing;

  insert into public.garment_types (organization_id, name, sort_order) values
    (target_organization_id, 'рубашка', 10),
    (target_organization_id, 'блуза', 20),
    (target_organization_id, 'топ', 30),
    (target_organization_id, 'юбка', 40),
    (target_organization_id, 'брюки', 50),
    (target_organization_id, 'платье', 60),
    (target_organization_id, 'жакет', 70),
    (target_organization_id, 'жилет', 80),
    (target_organization_id, 'костюм', 90),
    (target_organization_id, 'тренч', 100),
    (target_organization_id, 'пальто', 110),
    (target_organization_id, 'куртка', 120),
    (target_organization_id, 'корсет', 130),
    (target_organization_id, 'комбинезон', 140),
    (target_organization_id, 'ремонт/подгонка', 150),
    (target_organization_id, 'другое', 160)
  on conflict (organization_id, name) do nothing;

  insert into public.measurement_definitions (organization_id, code, name, sort_order) values
    (target_organization_id, 'height', 'рост', 10),
    (target_organization_id, 'neck', 'обхват шеи', 20),
    (target_organization_id, 'chest', 'обхват груди', 30),
    (target_organization_id, 'waist', 'обхват талии', 40),
    (target_organization_id, 'hips', 'обхват бёдер', 50),
    (target_organization_id, 'shoulder_width', 'ширина плеч', 60),
    (target_organization_id, 'back_width', 'ширина спины', 70),
    (target_organization_id, 'back_to_waist', 'длина спины до талии', 80),
    (target_organization_id, 'front_to_waist', 'длина переда до талии', 90),
    (target_organization_id, 'bust_height', 'высота груди', 100),
    (target_organization_id, 'bust_center', 'центр груди', 110),
    (target_organization_id, 'shoulder_length', 'длина плеча', 120),
    (target_organization_id, 'sleeve_length', 'длина рукава', 130),
    (target_organization_id, 'biceps', 'обхват плеча или бицепса', 140),
    (target_organization_id, 'elbow', 'обхват локтя', 150),
    (target_organization_id, 'wrist', 'обхват запястья', 160),
    (target_organization_id, 'hip_height', 'высота бёдер', 170),
    (target_organization_id, 'product_length', 'длина изделия', 180),
    (target_organization_id, 'skirt_length', 'длина юбки', 190),
    (target_organization_id, 'dress_length', 'длина платья', 200),
    (target_organization_id, 'outerwear_length', 'длина верхней одежды', 210),
    (target_organization_id, 'ease', 'желаемая свобода облегания', 220)
  on conflict (organization_id, code) do nothing;

  select id into shirt_id from public.garment_types where organization_id = target_organization_id and name = 'рубашка';
  select id into skirt_id from public.garment_types where organization_id = target_organization_id and name = 'юбка';
  select id into dress_id from public.garment_types where organization_id = target_organization_id and name = 'платье';
  select id into trench_id from public.garment_types where organization_id = target_organization_id and name = 'тренч';
  select id into jacket_id from public.garment_types where organization_id = target_organization_id and name = 'куртка';

  insert into public.garment_measurement_requirements (organization_id, garment_type_id, measurement_definition_id, sort_order)
  select target_organization_id, garment_id, md.id, row_number() over ()
  from (
    values
      (shirt_id, 'neck'), (shirt_id, 'chest'), (shirt_id, 'waist'), (shirt_id, 'hips'), (shirt_id, 'shoulder_width'), (shirt_id, 'back_width'), (shirt_id, 'back_to_waist'), (shirt_id, 'shoulder_length'), (shirt_id, 'sleeve_length'), (shirt_id, 'biceps'), (shirt_id, 'wrist'), (shirt_id, 'product_length'),
      (skirt_id, 'waist'), (skirt_id, 'hips'), (skirt_id, 'hip_height'), (skirt_id, 'skirt_length'),
      (dress_id, 'chest'), (dress_id, 'waist'), (dress_id, 'hips'), (dress_id, 'shoulder_width'), (dress_id, 'back_to_waist'), (dress_id, 'front_to_waist'), (dress_id, 'bust_height'), (dress_id, 'bust_center'), (dress_id, 'shoulder_length'), (dress_id, 'sleeve_length'), (dress_id, 'biceps'), (dress_id, 'wrist'), (dress_id, 'dress_length'),
      (trench_id, 'chest'), (trench_id, 'waist'), (trench_id, 'hips'), (trench_id, 'shoulder_width'), (trench_id, 'back_width'), (trench_id, 'back_to_waist'), (trench_id, 'shoulder_length'), (trench_id, 'sleeve_length'), (trench_id, 'biceps'), (trench_id, 'wrist'), (trench_id, 'outerwear_length'), (trench_id, 'ease'),
      (jacket_id, 'chest'), (jacket_id, 'waist'), (jacket_id, 'hips'), (jacket_id, 'shoulder_width'), (jacket_id, 'back_width'), (jacket_id, 'back_to_waist'), (jacket_id, 'shoulder_length'), (jacket_id, 'sleeve_length'), (jacket_id, 'biceps'), (jacket_id, 'wrist'), (jacket_id, 'product_length'), (jacket_id, 'ease')
  ) as req(garment_id, code)
  join public.measurement_definitions md on md.organization_id = target_organization_id and md.code = req.code
  where garment_id is not null
  on conflict (garment_type_id, measurement_definition_id) do nothing;
end;
$$;
