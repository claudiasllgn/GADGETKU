create extension if not exists pgcrypto;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  created_at timestamptz not null default now()
);

alter table customers alter column phone drop not null;

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_name text not null,
  phone text not null,
  email text,
  address text not null default '',
  created_at timestamptz not null default now()
);

alter table suppliers add column if not exists address text not null default '';

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text not null,
  price numeric(14, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  supplier_id uuid references suppliers(id),
  created_at timestamptz not null default now()
);

alter table products add column if not exists supplier_id uuid references suppliers(id);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  total numeric(14, 2) not null check (total >= 0),
  payment_method text not null check (payment_method in ('Tunai', 'Transfer', 'QRIS')),
  amount_paid numeric(14, 2) not null default 0 check (amount_paid >= 0),
  change_due numeric(14, 2) not null default 0 check (change_due >= 0),
  created_at timestamptz not null default now()
);

alter table sales add column if not exists amount_paid numeric(14, 2) not null default 0;
alter table sales add column if not exists change_due numeric(14, 2) not null default 0;
update sales set amount_paid = total, change_due = 0 where amount_paid = 0;

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0)
);

create table if not exists returns (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id),
  total_refund numeric(14, 2) not null check (total_refund >= 0),
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references returns(id) on delete cascade,
  sale_item_id uuid not null references sale_items(id),
  quantity integer not null check (quantity > 0),
  refund_amount numeric(14, 2) not null check (refund_amount >= 0)
);

create index if not exists sales_created_at_idx on sales (created_at desc);
create index if not exists sale_items_sale_id_idx on sale_items (sale_id);
create index if not exists returns_created_at_idx on returns (created_at desc);

insert into customers (name, phone) values
  ('Nadia Putri', '081234567801'),
  ('Bima Pratama', '081234567802'),
  ('Salsa Maharani', '081234567803'),
  ('Rizky Ananda', '081234567804')
on conflict (phone) do nothing;

insert into suppliers (id, name, contact_name, phone, email, address) values
  ('10000000-0000-4000-8000-000000000001', 'Nusantara Mobile Supply', 'Dimas', '0215550101', 'sales@nusantaramobile.example', 'Jl. Melati No. 18, Jakarta Pusat'),
  ('10000000-0000-4000-8000-000000000002', 'Sentra Audio Indonesia', 'Maya', '0215550102', 'order@sentraaudio.example', 'Jl. Industri Raya No. 7, Bandung'),
  ('10000000-0000-4000-8000-000000000003', 'Tekno Aksesori Bersama', 'Raka', '0215550103', 'halo@teknoaksesori.example', 'Jl. Ahmad Yani No. 42, Surabaya')
on conflict (id) do update set address = excluded.address
  where suppliers.address = '';

insert into products (sku, name, category, price, stock, supplier_id) values
  ('PHN-014', 'iPhone 15 128GB', 'Smartphone', 12999000, 3, '10000000-0000-4000-8000-000000000001'),
  ('PHN-021', 'Samsung Galaxy A55', 'Smartphone', 5799000, 12, '10000000-0000-4000-8000-000000000001'),
  ('AUD-008', 'Sony WF-C700N', 'Audio', 1499000, 2, '10000000-0000-4000-8000-000000000002'),
  ('WCH-011', 'Apple Watch SE', 'Wearable', 3799000, 7, '10000000-0000-4000-8000-000000000001'),
  ('ACC-033', 'Anker Nano 30W', 'Aksesori', 329000, 4, '10000000-0000-4000-8000-000000000003'),
  ('TAB-006', 'iPad Air 11-inch', 'Tablet', 10999000, 8, '10000000-0000-4000-8000-000000000001')
on conflict (sku) do nothing;

update products set supplier_id = case
  when sku = 'AUD-008' then '10000000-0000-4000-8000-000000000002'::uuid
  when sku = 'ACC-033' then '10000000-0000-4000-8000-000000000003'::uuid
  else '10000000-0000-4000-8000-000000000001'::uuid
end
where supplier_id is null;

alter table products alter column supplier_id set not null;

create or replace function create_sale(
  p_customer_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_amount_paid numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_total numeric(14, 2) := 0;
  v_item jsonb;
  v_product products%rowtype;
  v_quantity integer;
begin
  if not exists (select 1 from customers where id = p_customer_id) then
    raise exception 'Pelanggan tidak ditemukan';
  end if;
  if p_payment_method not in ('Tunai', 'Transfer', 'QRIS') then
    raise exception 'Metode pembayaran tidak valid';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang penjualan kosong';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity <= 0 then raise exception 'Jumlah barang tidak valid'; end if;
    select * into v_product from products
      where id = (v_item ->> 'product_id')::uuid for update;
    if not found then raise exception 'Produk tidak ditemukan'; end if;
    if v_product.stock < v_quantity then
      raise exception 'Stok % tidak mencukupi', v_product.name;
    end if;
    v_total := v_total + v_product.price * v_quantity;
  end loop;

  if p_amount_paid is null or p_amount_paid < v_total then
    raise exception 'Jumlah uang kurang dari total pembayaran';
  end if;
  if p_payment_method <> 'Tunai' and p_amount_paid <> v_total then
    raise exception 'Pembayaran non-tunai harus sesuai total transaksi';
  end if;

  insert into sales (customer_id, total, payment_method, amount_paid, change_due)
    values (p_customer_id, v_total, p_payment_method, p_amount_paid, greatest(0, p_amount_paid - v_total)) returning id into v_sale_id;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from products
      where id = (v_item ->> 'product_id')::uuid for update;
    insert into sale_items (sale_id, product_id, quantity, unit_price)
      values (v_sale_id, v_product.id, v_quantity, v_product.price);
    update products set stock = stock - v_quantity where id = v_product.id;
  end loop;
  return v_sale_id;
end;
$$;

create or replace function update_sale(
  p_sale_id uuid,
  p_customer_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_amount_paid numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale sales%rowtype;
  v_total numeric(14, 2) := 0;
  v_item jsonb;
  v_product products%rowtype;
  v_quantity integer;
begin
  select * into v_sale from sales where id = p_sale_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if exists (select 1 from returns where sale_id = p_sale_id) then
    raise exception 'Transaksi yang sudah diretur tidak dapat diedit';
  end if;
  if not exists (select 1 from customers where id = p_customer_id) then
    raise exception 'Pelanggan tidak ditemukan';
  end if;
  if p_payment_method not in ('Tunai', 'Transfer', 'QRIS') then
    raise exception 'Metode pembayaran tidak valid';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang penjualan kosong';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as item(value)
    group by value ->> 'product_id'
    having count(*) > 1
  ) then
    raise exception 'Produk yang sama tidak boleh dicantumkan dua kali';
  end if;

  update products p set stock = p.stock + si.quantity
    from sale_items si where si.sale_id = p_sale_id and p.id = si.product_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity <= 0 then raise exception 'Jumlah barang tidak valid'; end if;
    select * into v_product from products
      where id = (v_item ->> 'product_id')::uuid for update;
    if not found then raise exception 'Produk tidak ditemukan'; end if;
    if v_product.stock < v_quantity then
      raise exception 'Stok % tidak mencukupi', v_product.name;
    end if;
    v_total := v_total + v_product.price * v_quantity;
  end loop;

  if p_amount_paid is null or p_amount_paid < v_total then
    raise exception 'Jumlah uang kurang dari total pembayaran';
  end if;
  if p_payment_method <> 'Tunai' and p_amount_paid <> v_total then
    raise exception 'Pembayaran non-tunai harus sesuai total transaksi';
  end if;

  delete from sale_items where sale_id = p_sale_id;
  update sales set customer_id = p_customer_id, payment_method = p_payment_method, total = v_total,
    amount_paid = p_amount_paid, change_due = greatest(0, p_amount_paid - v_total)
    where id = p_sale_id;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from products
      where id = (v_item ->> 'product_id')::uuid for update;
    insert into sale_items (sale_id, product_id, quantity, unit_price)
      values (p_sale_id, v_product.id, v_quantity, v_product.price);
    update products set stock = stock - v_quantity where id = v_product.id;
  end loop;
  return p_sale_id;
end;
$$;

create or replace function delete_sale(p_sale_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from sales where id = p_sale_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if exists (select 1 from returns where sale_id = p_sale_id) then
    raise exception 'Transaksi yang sudah diretur tidak dapat dihapus';
  end if;
  update products p set stock = p.stock + si.quantity
    from sale_items si where si.sale_id = p_sale_id and p.id = si.product_id;
  delete from sales where id = p_sale_id;
  return p_sale_id;
end;
$$;

create or replace function resolve_customer(p_customer_name text, p_customer_phone text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_phone text := nullif(trim(p_customer_phone), '');
begin
  if nullif(trim(p_customer_name), '') is null then
    raise exception 'Nama pelanggan wajib diisi';
  end if;

  if v_phone is null then
    select id into v_customer_id from customers
      where phone is null and lower(trim(name)) = lower(trim(p_customer_name))
      order by created_at limit 1 for update;
    if v_customer_id is null then
      insert into customers (name, phone) values (trim(p_customer_name), null)
        returning id into v_customer_id;
    end if;
  else
    insert into customers (name, phone) values (trim(p_customer_name), v_phone)
      on conflict (phone) do update set name = excluded.name
      returning id into v_customer_id;
  end if;
  return v_customer_id;
end;
$$;

create or replace function create_sale_with_customer(
  p_customer_name text,
  p_customer_phone text,
  p_payment_method text,
  p_items jsonb,
  p_amount_paid numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  v_customer_id := resolve_customer(p_customer_name, p_customer_phone);
  return create_sale(v_customer_id, p_payment_method, p_items, p_amount_paid);
end;
$$;

create or replace function update_sale_with_customer(
  p_sale_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_payment_method text,
  p_items jsonb,
  p_amount_paid numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  v_customer_id := resolve_customer(p_customer_name, p_customer_phone);
  return update_sale(p_sale_id, v_customer_id, p_payment_method, p_items, p_amount_paid);
end;
$$;

create or replace function create_return(
  p_sale_id uuid,
  p_reason text,
  p_items jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_return_id uuid;
  v_total numeric(14, 2) := 0;
  v_item jsonb;
  v_sale_item sale_items%rowtype;
  v_quantity integer;
  v_already_returned integer;
begin
  if not exists (select 1 from sales where id = p_sale_id) then
    raise exception 'Transaksi tidak ditemukan';
  end if;
  if length(trim(p_reason)) = 0 then raise exception 'Alasan retur wajib diisi'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Pilih barang yang akan diretur';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as item(value)
    group by value ->> 'sale_item_id'
    having count(*) > 1
  ) then
    raise exception 'Barang retur yang sama tidak boleh dicantumkan dua kali';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_sale_item from sale_items
      where id = (v_item ->> 'sale_item_id')::uuid and sale_id = p_sale_id for update;
    if not found or v_quantity <= 0 then raise exception 'Barang retur tidak valid'; end if;
    select coalesce(sum(ri.quantity), 0) into v_already_returned
      from return_items ri join returns r on r.id = ri.return_id
      where ri.sale_item_id = v_sale_item.id;
    if v_already_returned + v_quantity > v_sale_item.quantity then
      raise exception 'Jumlah retur melebihi jumlah pembelian';
    end if;
    v_total := v_total + v_sale_item.unit_price * v_quantity;
  end loop;

  insert into returns (sale_id, total_refund, reason)
    values (p_sale_id, v_total, trim(p_reason)) returning id into v_return_id;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_sale_item from sale_items
      where id = (v_item ->> 'sale_item_id')::uuid and sale_id = p_sale_id for update;
    insert into return_items (return_id, sale_item_id, quantity, refund_amount)
      values (v_return_id, v_sale_item.id, v_quantity, v_sale_item.unit_price * v_quantity);
    update products set stock = stock + v_quantity where id = v_sale_item.product_id;
  end loop;
  return v_return_id;
end;
$$;