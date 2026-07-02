create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  currency text not null default 'RUB' check (currency = 'RUB'),
  timezone text not null default 'Europe/Moscow',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'seamstress')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  phone text,
  address text,
  instagram text,
  telegram text,
  whatsapp text,
  notification_channels jsonb not null default '{"in_app": true, "telegram": false, "whatsapp": false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  );
$$;

create or replace function public.current_org_role(target_organization_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select om.role from public.organization_members om
  where om.organization_id = target_organization_id
    and om.user_id = auth.uid()
    and om.is_active = true
  limit 1;
$$;

create or replace function public.is_org_owner(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_org_role(target_organization_id) = 'owner', false);
$$;

create or replace function public.can_manage_operations(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_org_role(target_organization_id) in ('owner', 'manager'), false);
$$;

create table public.garment_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.measurement_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  unit text not null default 'см',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.garment_measurement_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  garment_type_id uuid not null references public.garment_types(id) on delete cascade,
  measurement_definition_id uuid not null references public.measurement_definitions(id) on delete cascade,
  is_required boolean not null default true,
  sort_order integer not null default 0,
  unique (garment_type_id, measurement_definition_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  phone text,
  telegram text,
  whatsapp text,
  email text,
  birth_date date,
  address text,
  source text check (source is null or source in ('Instagram', 'Telegram', 'рекомендация', 'постоянный клиент', 'другое')),
  notes text,
  last_contact_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.client_measurement_sets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  version integer not null check (version > 0),
  measured_at timestamptz not null default now(),
  measured_by uuid references public.profiles(id) on delete set null,
  notes text,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, version)
);

create table public.client_measurement_values (
  id uuid primary key default gen_random_uuid(),
  measurement_set_id uuid not null references public.client_measurement_sets(id) on delete cascade,
  measurement_definition_id uuid not null references public.measurement_definitions(id) on delete restrict,
  value numeric(8,2) not null check (value > 0),
  notes text,
  unique (measurement_set_id, measurement_definition_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_number text,
  client_id uuid not null references public.clients(id) on delete restrict,
  status text not null default 'new_request' check (status in ('new_request', 'measurements', 'awaiting_prepayment', 'purchasing_materials', 'sewing', 'fitting', 'alterations', 'ready', 'delivered', 'cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  responsible_user_id uuid references public.profiles(id) on delete set null,
  order_date date not null default current_date,
  due_date date,
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  general_notes text,
  internal_notes text,
  cancellation_reason text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, order_number)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  garment_type_id uuid not null references public.garment_types(id) on delete restrict,
  title text,
  quantity numeric(8,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  description text,
  fabric_description text,
  color text,
  style_notes text,
  fit_preferences text,
  measurement_set_id uuid references public.client_measurement_sets(id) on delete set null,
  measurement_snapshot jsonb not null default '{}'::jsonb,
  individual_adjustments text,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  comment text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  payment_type text not null check (payment_type in ('prepayment', 'final_payment', 'additional_payment', 'refund')),
  payment_method text not null check (payment_method in ('cash', 'bank_transfer', 'card', 'other')),
  payment_date date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  voided_at timestamptz
);

create table public.order_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  category text not null check (category in ('ткань', 'фурнитура', 'работа швеи', 'такси', 'упаковка', 'доля аренды', 'прочие расходы')),
  description text,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  amount numeric(12,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.general_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  expense_date date not null default current_date,
  category text not null check (category in ('аренда', 'реклама', 'оборудование', 'расходные материалы', 'услуги', 'доставка и такси', 'налоги', 'связь', 'программное обеспечение', 'прочее')),
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  payment_method text check (payment_method is null or payment_method in ('cash', 'bank_transfer', 'card', 'other')),
  vendor text,
  notes text,
  attachment_path text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  appointment_type text not null check (appointment_type in ('fitting', 'consultation', 'measurements', 'delivery', 'purchase', 'internal', 'other')),
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  status text not null default 'planned' check (status in ('planned', 'confirmed', 'completed', 'cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  check (end_at is null or end_at >= start_at)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('order', 'order_item', 'client', 'general_expense')),
  entity_id uuid not null,
  file_name text not null,
  storage_path text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  category text not null check (category in ('референс', 'фотография ткани', 'фотография изделия', 'чек', 'документ', 'другое')),
  description text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('client', 'order', 'order_item')),
  entity_id uuid not null,
  body text not null check (length(body) <= 4000),
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index clients_org_search_idx on public.clients (organization_id, name, phone);
create unique index clients_org_phone_unique_idx on public.clients (organization_id, phone) where phone is not null;
create index orders_org_status_due_idx on public.orders (organization_id, status, due_date);
create index order_items_order_idx on public.order_items (order_id);
create index payments_order_idx on public.payments (order_id, payment_date);
create index appointments_org_start_idx on public.appointments (organization_id, start_at);
create index comments_entity_idx on public.comments (organization_id, entity_type, entity_id);
create index attachments_entity_idx on public.attachments (organization_id, entity_type, entity_id);

create or replace function public.next_order_number(target_organization_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  year_part text := to_char(now() at time zone 'Europe/Moscow', 'YYYY');
  next_number integer;
begin
  select coalesce(max((regexp_match(order_number, 'SP-' || year_part || '-([0-9]+)'))[1]::integer), 0) + 1
    into next_number
  from public.orders
  where organization_id = target_organization_id
    and order_number like 'SP-' || year_part || '-%';

  return 'SP-' || year_part || '-' || lpad(next_number::text, 4, '0');
end;
$$;

create or replace function public.set_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := public.next_order_number(new.organization_id);
  end if;
  return new;
end;
$$;

create trigger set_order_number_before_insert
before insert on public.orders
for each row execute function public.set_order_number();

create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger organization_members_updated_at before update on public.organization_members for each row execute function public.set_updated_at();
create trigger organization_settings_updated_at before update on public.organization_settings for each row execute function public.set_updated_at();
create trigger garment_types_updated_at before update on public.garment_types for each row execute function public.set_updated_at();
create trigger measurement_definitions_updated_at before update on public.measurement_definitions for each row execute function public.set_updated_at();
create trigger clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger client_measurement_sets_updated_at before update on public.client_measurement_sets for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger order_items_updated_at before update on public.order_items for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger order_expenses_updated_at before update on public.order_expenses for each row execute function public.set_updated_at();
create trigger general_expenses_updated_at before update on public.general_expenses for each row execute function public.set_updated_at();
create trigger appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create trigger comments_updated_at before update on public.comments for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_settings enable row level security;
alter table public.garment_types enable row level security;
alter table public.measurement_definitions enable row level security;
alter table public.garment_measurement_requirements enable row level security;
alter table public.clients enable row level security;
alter table public.client_measurement_sets enable row level security;
alter table public.client_measurement_values enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.order_expenses enable row level security;
alter table public.general_expenses enable row level security;
alter table public.appointments enable row level security;
alter table public.attachments enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

create policy "profiles self read" on public.profiles for select using (id = auth.uid());
create policy "profiles self upsert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "organizations member read" on public.organizations for select using (public.is_org_member(id));
create policy "organizations authenticated create" on public.organizations for insert with check (auth.uid() is not null);
create policy "organizations owner update" on public.organizations for update using (public.is_org_owner(id)) with check (public.is_org_owner(id));

create policy "members read own org" on public.organization_members for select using (public.is_org_member(organization_id));
create policy "members first owner insert" on public.organization_members for insert with check (user_id = auth.uid() and role = 'owner');
create policy "members owner manage" on public.organization_members for update using (public.is_org_owner(organization_id)) with check (public.is_org_owner(organization_id));

create policy "settings member read" on public.organization_settings for select using (public.is_org_member(organization_id));
create policy "settings owner write" on public.organization_settings for all using (public.is_org_owner(organization_id)) with check (public.is_org_owner(organization_id));

create policy "garment member read" on public.garment_types for select using (public.is_org_member(organization_id));
create policy "garment owner write" on public.garment_types for all using (public.is_org_owner(organization_id)) with check (public.is_org_owner(organization_id));

create policy "measurement member read" on public.measurement_definitions for select using (public.is_org_member(organization_id));
create policy "measurement owner write" on public.measurement_definitions for all using (public.is_org_owner(organization_id)) with check (public.is_org_owner(organization_id));

create policy "requirements member read" on public.garment_measurement_requirements for select using (public.is_org_member(organization_id));
create policy "requirements owner write" on public.garment_measurement_requirements for all using (public.is_org_owner(organization_id)) with check (public.is_org_owner(organization_id));

create policy "clients operations read" on public.clients for select using (public.is_org_member(organization_id));
create policy "clients operations insert" on public.clients for insert with check (public.can_manage_operations(organization_id));
create policy "clients operations update" on public.clients for update using (public.can_manage_operations(organization_id)) with check (public.can_manage_operations(organization_id));

create policy "measurement sets read" on public.client_measurement_sets for select using (public.is_org_member(organization_id));
create policy "measurement sets write" on public.client_measurement_sets for all using (public.can_manage_operations(organization_id)) with check (public.can_manage_operations(organization_id));
create policy "measurement values read" on public.client_measurement_values for select using (exists (select 1 from public.client_measurement_sets s where s.id = measurement_set_id and public.is_org_member(s.organization_id)));
create policy "measurement values write" on public.client_measurement_values for all using (exists (select 1 from public.client_measurement_sets s where s.id = measurement_set_id and public.can_manage_operations(s.organization_id))) with check (exists (select 1 from public.client_measurement_sets s where s.id = measurement_set_id and public.can_manage_operations(s.organization_id)));

create policy "orders member read" on public.orders for select using (public.is_org_member(organization_id));
create policy "orders operations write" on public.orders for all using (public.can_manage_operations(organization_id)) with check (public.can_manage_operations(organization_id));
create policy "order items member read" on public.order_items for select using (public.is_org_member(organization_id));
create policy "order items operations write" on public.order_items for all using (public.can_manage_operations(organization_id)) with check (public.can_manage_operations(organization_id));
create policy "status history member read" on public.order_status_history for select using (public.is_org_member(organization_id));
create policy "status history operations insert" on public.order_status_history for insert with check (public.can_manage_operations(organization_id));

create policy "payments owner manager read" on public.payments for select using (public.can_manage_operations(organization_id));
create policy "payments owner manager write" on public.payments for all using (public.can_manage_operations(organization_id)) with check (public.can_manage_operations(organization_id));
create policy "order expenses owner manager read" on public.order_expenses for select using (public.can_manage_operations(organization_id));
create policy "order expenses owner manager write" on public.order_expenses for all using (public.can_manage_operations(organization_id)) with check (public.can_manage_operations(organization_id));
create policy "general expenses owner only" on public.general_expenses for all using (public.is_org_owner(organization_id)) with check (public.is_org_owner(organization_id));

create policy "appointments member read" on public.appointments for select using (public.is_org_member(organization_id));
create policy "appointments operations write" on public.appointments for all using (public.can_manage_operations(organization_id)) with check (public.can_manage_operations(organization_id));
create policy "attachments member read" on public.attachments for select using (public.is_org_member(organization_id));
create policy "attachments member write" on public.attachments for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "comments member read" on public.comments for select using (public.is_org_member(organization_id));
create policy "comments member insert" on public.comments for insert with check (public.is_org_member(organization_id));
create policy "comments author owner update" on public.comments for update using (author_id = auth.uid() or public.is_org_owner(organization_id)) with check (author_id = auth.uid() or public.is_org_owner(organization_id));
create policy "notifications own read" on public.notifications for select using (public.is_org_member(organization_id) and (user_id is null or user_id = auth.uid()));
create policy "notifications own update" on public.notifications for update using (public.is_org_member(organization_id) and (user_id is null or user_id = auth.uid())) with check (public.is_org_member(organization_id));
