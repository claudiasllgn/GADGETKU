const storageKey = 'gadgetku-data-v1';
const today = new Date();
const localDate = (daysAgo = 0, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
};

const seedData = {
  suppliers: [
    { id: 'sp-01', name: 'Nusantara Mobile Supply', contact_name: 'Dimas', phone: '0215550101', email: 'sales@nusantaramobile.example', address: 'Jl. Melati No. 18, Jakarta Pusat' },
    { id: 'sp-02', name: 'Sentra Audio Indonesia', contact_name: 'Maya', phone: '0215550102', email: 'order@sentraaudio.example', address: 'Jl. Industri Raya No. 7, Bandung' },
    { id: 'sp-03', name: 'Tekno Aksesori Bersama', contact_name: 'Raka', phone: '0215550103', email: 'halo@teknoaksesori.example', address: 'Jl. Ahmad Yani No. 42, Surabaya' },
  ],
  customers: [
    { id: 'c-01', name: 'Nadia Putri', phone: '081234567801' },
    { id: 'c-02', name: 'Bima Pratama', phone: '081234567802' },
    { id: 'c-03', name: 'Salsa Maharani', phone: '081234567803' },
    { id: 'c-04', name: 'Rizky Ananda', phone: '081234567804' },
  ],
  products: [
    { id: 'p-01', sku: 'PHN-014', name: 'iPhone 15 128GB', category: 'Smartphone', price: 12999000, stock: 3, supplier_id: 'sp-01' },
    { id: 'p-02', sku: 'PHN-021', name: 'Samsung Galaxy A55', category: 'Smartphone', price: 5799000, stock: 12, supplier_id: 'sp-01' },
    { id: 'p-03', sku: 'AUD-008', name: 'Sony WF-C700N', category: 'Audio', price: 1499000, stock: 2, supplier_id: 'sp-02' },
    { id: 'p-04', sku: 'WCH-011', name: 'Apple Watch SE', category: 'Wearable', price: 3799000, stock: 7, supplier_id: 'sp-01' },
    { id: 'p-05', sku: 'ACC-033', name: 'Anker Nano 30W', category: 'Aksesori', price: 329000, stock: 4, supplier_id: 'sp-03' },
    { id: 'p-06', sku: 'TAB-006', name: 'iPad Air 11-inch', category: 'Tablet', price: 10999000, stock: 8, supplier_id: 'sp-01' },
  ],
  sales: [
    { id: 's-01', customer_id: 'c-01', total: 13328000, amount_paid: 13328000, change_due: 0, payment_method: 'QRIS', created_at: localDate(0, 10) },
    { id: 's-02', customer_id: 'c-02', total: 6128000, amount_paid: 6128000, change_due: 0, payment_method: 'Transfer', created_at: localDate(0, 12) },
    { id: 's-03', customer_id: 'c-03', total: 3799000, amount_paid: 4000000, change_due: 201000, payment_method: 'Tunai', created_at: localDate(1, 13) },
    { id: 's-04', customer_id: 'c-04', total: 1499000, amount_paid: 1499000, change_due: 0, payment_method: 'QRIS', created_at: localDate(2, 15) },
  ],
  saleItems: [
    { id: 'si-01', sale_id: 's-01', product_id: 'p-01', quantity: 1, unit_price: 12999000 },
    { id: 'si-02', sale_id: 's-01', product_id: 'p-05', quantity: 1, unit_price: 329000 },
    { id: 'si-03', sale_id: 's-02', product_id: 'p-02', quantity: 1, unit_price: 5799000 },
    { id: 'si-04', sale_id: 's-02', product_id: 'p-05', quantity: 1, unit_price: 329000 },
    { id: 'si-05', sale_id: 's-03', product_id: 'p-04', quantity: 1, unit_price: 3799000 },
    { id: 'si-06', sale_id: 's-04', product_id: 'p-03', quantity: 1, unit_price: 1499000 },
  ],
  returns: [{ id: 'r-01', sale_id: 's-04', total_refund: 1499000, reason: 'Unit tidak dapat terhubung', created_at: localDate(1, 16) }],
  returnItems: [{ id: 'ri-01', return_id: 'r-01', sale_item_id: 'si-06', quantity: 1, refund_amount: 1499000 }],
};

let data;
let connected = false;
let connectionError = '';
let toastTimer;
let editingSaleId = null;
let recentlySavedSaleId = null;
let activeReceiptSaleId = null;
const storeInfo = { name: 'Gadgetku', address: 'Jl. Melati No. 21, Jakarta Pusat', phone: '0812-0000-5678' };
const supabaseUrl = 'https://lugztkxdtbzsotxuypie.supabase.co';
const supabaseKey = 'sb_publishable_9zcH-AWB88qtlyEW2bD-Dw_cPGSRt3Y';
const supabaseReady = Boolean(supabaseUrl && supabaseKey);
const toCents = (value) => Math.round(Number(value || 0) * 100);
const fromCents = (value) => value / 100;
const rupiah = (value) => {
  const cents = toCents(value);
  const whole = Math.trunc(cents / 100);
  const fraction = Math.abs(cents % 100);
  const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(whole);
  return fraction ? `${formatted},${String(fraction).padStart(2, '0')}` : formatted;
};
const receiptNumber = (value) => {
  const cents = toCents(value);
  const whole = Math.trunc(cents / 100);
  const fraction = Math.abs(cents % 100);
  const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(whole);
  return fraction ? `${formatted},${String(fraction).padStart(2, '0')}` : formatted;
};
const dateText = (value, includeYear = false) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', ...(includeYear ? { year: 'numeric' } : {}), hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const findCustomer = (id) => data.customers.find((item) => item.id === id)?.name || 'Pelanggan';
const findCustomerPhone = (id) => data.customers.find((item) => item.id === id)?.phone || '';
const findProduct = (id) => data.products.find((item) => item.id === id);
const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const saleItemsFor = (saleId) => data.saleItems.filter((item) => item.sale_id === saleId);
const returnedQuantity = (saleItemId) => data.returnItems.filter((item) => item.sale_item_id === saleItemId).reduce((sum, item) => sum + Number(item.quantity), 0);
function restoreData() {
  try {
    const saved = localStorage.getItem(storageKey);
    const defaults = structuredClone(seedData);
    if (!saved) return defaults;
    const savedData = JSON.parse(saved);
    const migratePayments = Number(savedData.schemaVersion || 0) < 2;
    const restored = { ...defaults, ...savedData };
    restored.saleItems = restored.saleItems || defaults.saleItems;
    restored.sales = (restored.sales || defaults.sales).map((sale) => {
      const items = restored.saleItems.filter((item) => item.sale_id === sale.id);
      const savedTotal = Number(sale.total);
      const lineTotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
      const seedSale = defaults.sales.find((item) => item.id === sale.id);
      const isLegacySeed = migratePayments && Boolean(seedSale);
      const isMismatchedSeed = Boolean(seedSale) && items.length && lineTotal !== savedTotal;
      const total = isMismatchedSeed || (sale.amount_paid === undefined && items.length) ? lineTotal : savedTotal;
      const amountPaid = Number(isLegacySeed ? seedSale.amount_paid : isMismatchedSeed ? total : sale.amount_paid ?? total);
      const changeDue = Number(isLegacySeed ? seedSale.change_due : isMismatchedSeed ? 0 : sale.change_due ?? Math.max(0, amountPaid - total));
      return { ...sale, total, amount_paid: amountPaid, change_due: changeDue };
    });
    restored.schemaVersion = 2;
    restored.suppliers = (Array.isArray(restored.suppliers) && restored.suppliers.length ? restored.suppliers : defaults.suppliers).map((supplier) => {
      const supplierDefault = defaults.suppliers.find((item) => item.id === supplier.id || item.name === supplier.name);
      return { ...supplierDefault, ...supplier, address: supplier.address || supplierDefault?.address || 'Alamat belum diisi' };
    });
    const supplierBySku = new Map(defaults.products.map((product) => [product.sku, product.supplier_id]));
    restored.products = (restored.products || defaults.products).map((product, index) => ({
      ...product,
      supplier_id: product.supplier_id || restored.suppliers.find((supplier) => supplier.id === supplierBySku.get(product.sku))?.id || restored.suppliers[index % restored.suppliers.length].id,
    }));
    return restored;
  } catch {
    return structuredClone(seedData);
  }
}

function persist() {
  data.schemaVersion = 2;
  try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch { /* Local file storage may be unavailable. */ }
}

async function initialize() {
  data = restoreData();
  persist();
  try {
    data = await loadSupabaseDashboard();
    connected = true;
    connectionError = '';
    persist();
  } catch (error) {
    connected = false;
    connectionError = error.message || 'Tidak dapat menghubungi Supabase.';
    console.warn('Supabase belum tersambung.', error);
  }
  document.querySelector('#connection-label').textContent = connected ? 'Supabase terhubung' : 'Supabase tidak tersambung';
  document.querySelector('#data-mode').textContent = connected ? 'Data tersinkronisasi dengan Supabase' : 'Transaksi dinonaktifkan sampai Supabase tersambung';
  document.querySelector('.live-dot').style.background = connected ? '#55a67e' : '#c74747';
  render();
}

async function supabaseRequest(path, options = {}) {
  if (!supabaseReady) throw new Error('Konfigurasi Supabase belum tersedia.');
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    let message = text || `Supabase error ${response.status}`;
    try { message = JSON.parse(text).message || message; } catch { /* Keep response text. */ }
    throw new Error(message);
  }
  return text ? JSON.parse(text) : null;
}

async function supabaseRpc(name, params) {
  return supabaseRequest(`rpc/${name}`, { method: 'POST', body: JSON.stringify(params) });
}

async function loadSupabaseDashboard() {
  const [customers, suppliers, products, sales, saleItems, returns, returnItems] = await Promise.all([
    supabaseRequest('customers?select=id,name,phone&order=name'),
    supabaseRequest('suppliers?select=id,name,contact_name,phone,email,address&order=name'),
    supabaseRequest('products?select=id,sku,name,category,price,stock,supplier_id&order=name'),
    supabaseRequest('sales?select=id,customer_id,total,payment_method,amount_paid,change_due,created_at&order=created_at.desc&limit=100'),
    supabaseRequest('sale_items?select=id,sale_id,product_id,quantity,unit_price'),
    supabaseRequest('returns?select=id,sale_id,total_refund,reason,created_at&order=created_at.desc&limit=100'),
    supabaseRequest('return_items?select=id,return_id,sale_item_id,quantity,refund_amount'),
  ]);
  return { customers, suppliers, products, sales, saleItems, returns, returnItems };
}

function render() {
  renderDashboard();
  renderSales();
  renderReturns();
  renderProducts();
  renderSuppliers();
  renderCatalog();
}

function renderDashboard() {
  const day = new Date().toLocaleDateString('en-CA');
  const todaysSales = data.sales.filter((sale) => new Date(sale.created_at).toLocaleDateString('en-CA') === day);
  const todaysReturns = data.returns.filter((item) => new Date(item.created_at).toLocaleDateString('en-CA') === day);
  const itemsSold = todaysSales.reduce((sum, sale) => sum + saleItemsFor(sale.id).reduce((subtotal, item) => subtotal + Number(item.quantity), 0), 0);
  document.querySelector('#stat-sales').textContent = rupiah(todaysSales.reduce((sum, sale) => sum + Number(sale.total), 0));
  document.querySelector('#stat-sales-count').textContent = `${todaysSales.length} transaksi tercatat`;
  document.querySelector('#stat-items').textContent = itemsSold;
  document.querySelector('#stat-returns').textContent = todaysReturns.length;
  document.querySelector('#stat-refunds').textContent = `${rupiah(todaysReturns.reduce((sum, item) => sum + Number(item.total_refund), 0))} nilai pengembalian`;
  const lowStock = data.products.filter((product) => Number(product.stock) <= 5).sort((a, b) => a.stock - b.stock);
  document.querySelector('#stat-low').textContent = lowStock.length;
  document.querySelector('#low-count').textContent = `${lowStock.length} item`;
  const latestSales = [...data.sales].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
  document.querySelector('#recent-sales').innerHTML = latestSales.length ? latestSales.map((sale) => `<tr><td><span class="customer-cell"><span class="customer-initial">${escapeHtml(initials(findCustomer(sale.customer_id)))}</span><strong>${escapeHtml(findCustomer(sale.customer_id))}</strong></span></td><td>${dateText(sale.created_at)}</td><td><span class="payment-badge">${escapeHtml(sale.payment_method)}</span></td><td class="align-right"><strong>${rupiah(sale.total)}</strong></td></tr>`).join('') : emptyRow(4, 'Belum ada transaksi penjualan.');
  document.querySelector('#low-stock-list').innerHTML = lowStock.length ? lowStock.slice(0, 4).map((product) => `<div class="stock-item"><span class="product-mark">▦</span><span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)}</small></span><span class="stock-level">${product.stock} unit</span></div>`).join('') : '<div class="empty-cell">Stok produk aman.</div>';
  const latestReturns = [...data.returns].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 2);
  document.querySelector('#recent-returns').innerHTML = latestReturns.length ? latestReturns.map((item) => {
    const sale = data.sales.find((entry) => entry.id === item.sale_id);
    return `<div class="return-item"><span><strong>${escapeHtml(findCustomer(sale?.customer_id))}</strong><small>${escapeHtml(item.reason)} · ${dateText(item.created_at)}</small></span><span class="return-value">−${rupiah(item.total_refund)}</span></div>`;
  }).join('') : '<div class="empty-cell">Belum ada pengajuan retur.</div>';
}

function renderSales() {
  const sales = [...data.sales].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  document.querySelector('#sales-count').textContent = `${sales.length} transaksi`;
  document.querySelector('#sales-table').innerHTML = sales.length ? sales.map((sale) => {
    const returned = data.returns.some((item) => item.sale_id === sale.id);
    const disabled = returned ? 'disabled title="Transaksi yang sudah diretur tidak dapat diubah"' : '';
    return `<tr><td><strong>#${escapeHtml(String(sale.id).slice(-6).toUpperCase())}</strong></td><td>${escapeHtml(findCustomer(sale.customer_id))}</td><td>${dateText(sale.created_at, true)}</td><td><span class="payment-badge">${escapeHtml(sale.payment_method)}</span></td><td class="align-right"><strong>${rupiah(sale.total)}</strong></td><td><div class="action-group"><button class="table-action" data-sale-edit="${escapeHtml(sale.id)}" ${disabled}>Edit</button><button class="table-action delete" data-sale-delete="${escapeHtml(sale.id)}" ${disabled}>Hapus</button><button class="table-action print-action" data-sale-print="${escapeHtml(sale.id)}" aria-label="Cetak struk transaksi ${escapeHtml(String(sale.id))}" title="Cetak struk">Cetak</button></div></td></tr>`;
  }).join('') : emptyRow(6, 'Belum ada transaksi penjualan.');
}

function renderReturns() {
  const returns = [...data.returns].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  document.querySelector('#returns-table').innerHTML = returns.length ? returns.map((item) => {
    const sale = data.sales.find((entry) => entry.id === item.sale_id);
    return `<tr><td><strong>#${escapeHtml(String(item.id).slice(-6).toUpperCase())}</strong></td><td>#${escapeHtml(String(item.sale_id).slice(-6).toUpperCase())} · ${escapeHtml(findCustomer(sale?.customer_id))}</td><td>${dateText(item.created_at, true)}</td><td>${escapeHtml(item.reason)}</td><td class="align-right"><strong>${rupiah(item.total_refund)}</strong></td></tr>`;
  }).join('') : emptyRow(5, 'Belum ada pengajuan retur.');
}

function renderProducts() {
  document.querySelector('#product-count').textContent = `${data.products.length} produk`;
  document.querySelector('#products-table').innerHTML = data.products.length ? [...data.products].sort((a, b) => a.name.localeCompare(b.name)).map((product) => {
    const supplier = data.suppliers.find((item) => item.id === product.supplier_id)?.name || 'Belum ditentukan';
    return `<tr><td><span class="product-name-cell"><span class="product-mark">▦</span><strong>${escapeHtml(product.name)}</strong></span></td><td>${escapeHtml(product.category)}</td><td>${escapeHtml(product.sku)}</td><td>${escapeHtml(supplier)}</td><td class="align-right">${rupiah(product.price)}</td><td class="align-right"><span class="stock-pill ${product.stock <= 5 ? 'low' : ''}">${product.stock} unit</span></td></tr>`;
  }).join('') : emptyRow(6, 'Belum ada produk.');
}

function renderSuppliers() {
  const suppliers = [...data.suppliers].sort((a, b) => a.name.localeCompare(b.name));
  document.querySelector('#suppliers-table').innerHTML = suppliers.length ? suppliers.map((supplier) => `<tr><td><strong>${escapeHtml(supplier.name)}</strong></td><td>${escapeHtml(supplier.contact_name)}</td><td>${escapeHtml(supplier.phone)}</td><td>${escapeHtml(supplier.address || 'Alamat belum diisi')}</td><td><div class="action-group"><button class="table-action" data-supplier-edit="${escapeHtml(supplier.id)}">Edit</button><button class="table-action delete" data-supplier-delete="${escapeHtml(supplier.id)}">Hapus</button></div></td></tr>`).join('') : emptyRow(5, 'Belum ada supplier.');
}

function renderCatalog() {
  const products = [...data.products].sort((a, b) => a.name.localeCompare(b.name));
  document.querySelector('#catalog-table').innerHTML = products.length ? products.map((product) => {
    const lowStock = Number(product.stock) <= 5;
    return `<tr><td><span class="catalog-thumb" aria-hidden="true">▦</span></td><td><div class="catalog-name"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.sku)}</small></div></td><td>${escapeHtml(product.category)}</td><td>${rupiah(product.price)}</td><td><span class="stock-state ${lowStock ? 'low' : 'ok'}">${lowStock ? `Stok Menipis · ${Number(product.stock)}` : `${Number(product.stock)} unit`}</span></td><td><div class="action-group"><button class="table-action" data-product-edit="${escapeHtml(product.id)}">Edit</button><button class="table-action delete" data-product-delete="${escapeHtml(product.id)}">Hapus</button></div></td></tr>`;
  }).join('') : emptyRow(6, 'Belum ada produk.');
}

function emptyRow(columns, text) { return `<tr><td class="empty-cell" colspan="${columns}">${text}</td></tr>`; }

function switchView(view) {
  document.querySelectorAll('.view').forEach((section) => section.classList.toggle('active-view', section.id === `${view}-view`));
  document.querySelectorAll('.nav-link').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  const titles = {
    dashboard: ['Ringkasan', 'Pantau penjualan dan inventaris hari ini.'],
    sales: ['Penjualan', 'Riwayat transaksi dan pembayaran toko.'],
    returns: ['Retur barang', 'Kelola barang kembali dan pengembalian dana.'],
    inventory: ['Inventaris', 'Pantau ketersediaan produk di toko.'],
    suppliers: ['Supplier', 'Kelola data pemasok barang.'],
    products: ['Produk', 'Katalog dan ketersediaan barang.'],
  };
  document.querySelector('#page-title').textContent = titles[view][0];
  document.querySelector('#page-subtitle').textContent = titles[view][1];
  document.querySelector('#new-sale').hidden = view !== 'sales';
  document.querySelector('#eyebrow').textContent = `TOKO GADGET · ${view === 'dashboard' ? 'OPERASIONAL' : titles[view][0].toUpperCase()}`;
  history.replaceState(null, '', `#${view}`);
}

function openSale(saleId = '') {
  const sale = data.sales.find((item) => item.id === saleId);
  if (sale && data.returns.some((item) => item.sale_id === sale.id)) {
    showToast('Transaksi yang sudah diretur tidak dapat diedit.');
    return;
  }
  editingSaleId = sale?.id || null;
  document.querySelector('#sale-error').textContent = '';
  document.querySelector('#sale-form').reset();
  document.querySelector('#sale-customer').value = sale ? findCustomer(sale.customer_id) : '';
  document.querySelector('#sale-customer-phone').value = sale ? findCustomerPhone(sale.customer_id) : '';
  document.querySelector('#sale-product-list').innerHTML = data.products.map((product) => {
    const quantityInSale = sale ? saleItemsFor(sale.id).filter((item) => item.product_id === product.id).reduce((sum, item) => sum + Number(item.quantity), 0) : 0;
    const available = Number(product.stock) + quantityInSale;
    return `<div class="picker-row"><span><strong>${escapeHtml(product.name)}</strong><small>${rupiah(product.price)} · Stok ${available}</small></span><input type="number" min="0" max="${available}" value="0" data-product-qty="${escapeHtml(product.id)}" aria-label="Jumlah ${escapeHtml(product.name)}" ${available <= 0 ? 'disabled' : ''}></div>`;
  }).join('');
  if (sale) {
    document.querySelector('#sale-payment-method').value = sale.payment_method;
    document.querySelector('#sale-amount-paid').value = String(sale.amount_paid ?? sale.total);
    for (const item of saleItemsFor(sale.id)) {
      const input = document.querySelector(`[data-product-qty="${item.product_id}"]`);
      if (input) { input.disabled = false; input.value = item.quantity; }
    }
  }
  document.querySelector('#sale-dialog-eyebrow').textContent = sale ? 'EDIT TRANSAKSI' : 'TRANSAKSI BARU';
  document.querySelector('#sale-dialog h2').textContent = sale ? 'Edit transaksi' : 'Catat penjualan';
  document.querySelector('#sale-form .modal-submit').innerHTML = sale ? 'Simpan perubahan <span>→</span>' : 'Simpan transaksi <span>→</span>';
  updateSaleTotal();
  document.querySelector('#sale-dialog').showModal();
}

function openSupplierForm(supplierId = '') {
  const form = document.querySelector('#supplier-form');
  const supplier = data.suppliers.find((item) => item.id === supplierId);
  form.reset();
  form.elements.id.value = supplier?.id || '';
  for (const field of ['name', 'contact_name', 'phone', 'address']) form.elements[field].value = supplier?.[field] || '';
  document.querySelector('#supplier-dialog-title').textContent = supplier ? 'Edit Supplier' : 'Tambah Supplier';
  document.querySelector('#supplier-error').textContent = '';
  document.querySelector('#supplier-dialog').showModal();
}

async function saveSupplier(event) {
  event.preventDefault();
  if (!connected) { document.querySelector('#supplier-error').textContent = 'Supabase belum tersambung. Supplier tidak disimpan.'; return; }
  const form = event.currentTarget;
  const id = form.elements.id.value;
  const supplier = {
    name: form.elements.name.value.trim(),
    contact_name: form.elements.contact_name.value.trim(),
    phone: form.elements.phone.value.trim(),
    address: form.elements.address.value.trim(),
  };
  const duplicate = data.suppliers.some((item) => item.id !== id && item.name.toLowerCase() === supplier.name.toLowerCase());
  if (duplicate) { document.querySelector('#supplier-error').textContent = 'Nama supplier sudah terdaftar.'; return; }
  const existingIndex = data.suppliers.findIndex((item) => item.id === id);
  try {
    await supabaseRequest(id ? `suppliers?id=eq.${encodeURIComponent(id)}` : 'suppliers', {
      method: id ? 'PATCH' : 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(supplier),
    });
    await refreshData();
    document.querySelector('#supplier-dialog').close();
    render();
    showToast(existingIndex >= 0 ? 'Data supplier berhasil diperbarui.' : 'Supplier berhasil ditambahkan.');
  } catch (error) { document.querySelector('#supplier-error').textContent = friendlyError(error); }
}

async function deleteSupplier(supplierId) {
  if (!connected) { showToast('Supabase belum tersambung. Supplier tidak dihapus.'); return; }
  if (data.products.some((product) => product.supplier_id === supplierId)) {
    showToast('Supplier masih dipakai oleh produk dan tidak dapat dihapus.');
    return;
  }
  try {
    await supabaseRequest(`suppliers?id=eq.${encodeURIComponent(supplierId)}`, { method: 'DELETE' });
    await refreshData();
    render();
    showToast('Supplier berhasil dihapus.');
  } catch (error) { showToast(friendlyError(error)); }
}

function openProductForm(productId = '') {
  const form = document.querySelector('#product-form');
  const product = data.products.find((item) => item.id === productId);
  form.reset();
  form.elements.id.value = product?.id || '';
  for (const field of ['sku', 'name', 'category', 'price', 'stock']) form.elements[field].value = product?.[field] ?? '';
  document.querySelector('#product-supplier').innerHTML = data.suppliers.map((supplier) => `<option value="${escapeHtml(supplier.id)}">${escapeHtml(supplier.name)}</option>`).join('');
  if (product) document.querySelector('#product-supplier').value = product.supplier_id;
  document.querySelector('#product-dialog-title').textContent = product ? 'Edit Produk' : 'Tambah Produk';
  document.querySelector('#product-error').textContent = '';
  document.querySelector('#product-dialog').showModal();
}

async function saveProduct(event) {
  event.preventDefault();
  if (!connected) { document.querySelector('#product-error').textContent = 'Supabase belum tersambung. Produk tidak disimpan.'; return; }
  const form = event.currentTarget;
  const id = form.elements.id.value;
  const product = {
    sku: form.elements.sku.value.trim(),
    name: form.elements.name.value.trim(),
    category: form.elements.category.value.trim(),
    supplier_id: form.elements.supplier_id.value,
    price: Number(form.elements.price.value),
    stock: Number(form.elements.stock.value),
  };
  const duplicateSku = data.products.some((item) => item.id !== id && item.sku.toLowerCase() === product.sku.toLowerCase());
  if (duplicateSku) { document.querySelector('#product-error').textContent = 'SKU sudah digunakan produk lain.'; return; }
  const existingIndex = data.products.findIndex((item) => item.id === id);
  try {
    await supabaseRequest(id ? `products?id=eq.${encodeURIComponent(id)}` : 'products', {
      method: id ? 'PATCH' : 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(product),
    });
    await refreshData();
    document.querySelector('#product-dialog').close();
    render();
    showToast(existingIndex >= 0 ? 'Produk berhasil diperbarui.' : 'Produk berhasil ditambahkan.');
  } catch (error) { document.querySelector('#product-error').textContent = friendlyError(error); }
}

async function deleteProduct(productId) {
  if (!connected) { showToast('Supabase belum tersambung. Produk tidak dihapus.'); return; }
  if (data.saleItems.some((item) => item.product_id === productId)) {
    showToast('Produk sudah tercatat dalam transaksi dan tidak dapat dihapus.');
    return;
  }
  try {
    await supabaseRequest(`products?id=eq.${encodeURIComponent(productId)}`, { method: 'DELETE' });
    await refreshData();
    render();
    showToast('Produk berhasil dihapus.');
  } catch (error) { showToast(friendlyError(error)); }
}

function openReturn() {
  document.querySelector('#return-error').textContent = '';
  document.querySelector('#return-form').reset();
  const eligible = data.sales.filter((sale) => saleItemsFor(sale.id).some((item) => Number(item.quantity) > returnedQuantity(item.id)));
  const select = document.querySelector('#return-sale');
  select.innerHTML = '<option value="">Pilih transaksi</option>' + eligible.map((sale) => `<option value="${escapeHtml(sale.id)}">#${escapeHtml(String(sale.id).slice(-6).toUpperCase())} · ${escapeHtml(findCustomer(sale.customer_id))} · ${dateText(sale.created_at, true)}</option>`).join('');
  renderReturnPicker('');
  document.querySelector('#return-total').textContent = rupiah(0);
  document.querySelector('#return-dialog').showModal();
}

function renderReturnPicker(saleId) {
  const items = saleItemsFor(saleId).filter((item) => Number(item.quantity) > returnedQuantity(item.id));
  const list = document.querySelector('#return-item-list');
  list.classList.toggle('empty-picker', items.length === 0);
  list.innerHTML = items.length ? items.map((item) => {
    const product = findProduct(item.product_id);
    const available = Number(item.quantity) - returnedQuantity(item.id);
    return `<div class="picker-row"><span><strong>${escapeHtml(product?.name || 'Produk')}</strong><small>${rupiah(item.unit_price)} · Maks. ${available} unit</small></span><input type="number" min="0" max="${available}" value="0" data-return-qty="${escapeHtml(item.id)}" aria-label="Jumlah retur ${escapeHtml(product?.name || 'produk')}"></div>`;
  }).join('') : (saleId ? 'Semua barang pada transaksi ini sudah diretur.' : 'Pilih transaksi untuk melihat barang.');
}

function updateSaleTotal() {
  const totalCents = [...document.querySelectorAll('[data-product-qty]')].reduce((sum, input) => sum + toCents(data.products.find((product) => product.id === input.dataset.productQty)?.price) * Number(input.value || 0), 0);
  const total = fromCents(totalCents);
  document.querySelector('#sale-total').textContent = rupiah(total);
  const paymentMethod = document.querySelector('#sale-payment-method').value;
  const amountInput = document.querySelector('#sale-amount-paid');
  const amountLabel = document.querySelector('#sale-amount-label');
  const isCash = paymentMethod === 'Tunai';
  amountLabel.hidden = !isCash;
  amountInput.disabled = !isCash;
  amountInput.min = String(total);
  if (!isCash || (total > 0 && Number(amountInput.value) === 0)) amountInput.value = String(total);
}

function updateReturnTotal() {
  const total = [...document.querySelectorAll('[data-return-qty]')].reduce((sum, input) => {
    const item = data.saleItems.find((entry) => entry.id === input.dataset.returnQty);
    return sum + Number(input.value || 0) * Number(item?.unit_price || 0);
  }, 0);
  document.querySelector('#return-total').textContent = rupiah(total);
}

async function saveSale(event) {
  event.preventDefault();
  if (!connected) { document.querySelector('#sale-error').textContent = `Transaksi tidak disimpan. Periksa koneksi Supabase${connectionError ? `: ${connectionError}` : '.'}`; return; }
  const items = [...document.querySelectorAll('[data-product-qty]')].filter((input) => Number(input.value) > 0).map((input) => ({ product_id: input.dataset.productQty, quantity: Number(input.value) }));
  if (!items.length) { document.querySelector('#sale-error').textContent = 'Pilih setidaknya satu barang.'; return; }
  const customerName = document.querySelector('#sale-customer').value.trim();
  if (!customerName) { document.querySelector('#sale-error').textContent = 'Nama pelanggan wajib diisi.'; return; }
  const customerPhone = document.querySelector('#sale-customer-phone').value.trim();
  const paymentMethod = document.querySelector('#sale-payment-method').value;
  const totalCents = items.reduce((sum, item) => sum + toCents(findProduct(item.product_id)?.price) * item.quantity, 0);
  const total = fromCents(totalCents);
  const amountPaid = paymentMethod === 'Tunai' ? Number(document.querySelector('#sale-amount-paid').value) : total;
  if (toCents(amountPaid) < totalCents) {
    document.querySelector('#sale-error').textContent = 'Jumlah uang diterima kurang dari total pembayaran.';
    return;
  }
  const payload = { customer_name: customerName, customer_phone: customerPhone || null, payment_method: paymentMethod, amount_paid: amountPaid, items };
  const button = document.querySelector('#sale-form .modal-submit');
  const existingSale = editingSaleId ? data.sales.find((sale) => sale.id === editingSaleId) : null;
  let savedSaleId = existingSale?.id || null;
  button.disabled = true;
  try {
    if (connected) {
      const result = existingSale
        ? await supabaseRpc('update_sale_with_customer', {
          p_sale_id: existingSale.id,
          p_customer_name: payload.customer_name,
          p_customer_phone: payload.customer_phone,
          p_payment_method: payload.payment_method,
          p_items: payload.items,
          p_amount_paid: payload.amount_paid,
        })
        : await supabaseRpc('create_sale_with_customer', {
          p_customer_name: payload.customer_name,
          p_customer_phone: payload.customer_phone,
          p_payment_method: payload.payment_method,
          p_items: payload.items,
          p_amount_paid: payload.amount_paid,
        });
      savedSaleId = result || savedSaleId;
      await refreshData();
    } else {
      const availableStock = new Map(data.products.map((product) => [product.id, Number(product.stock)]));
      if (existingSale) {
        for (const oldItem of saleItemsFor(existingSale.id)) {
          availableStock.set(oldItem.product_id, (availableStock.get(oldItem.product_id) || 0) + Number(oldItem.quantity));
        }
      }
      for (const item of items) {
        const product = findProduct(item.product_id);
        if (!product) throw new Error('Produk tidak ditemukan.');
        const remaining = availableStock.get(product.id) || 0;
        if (item.quantity > remaining) throw new Error(`Stok ${product.name} tidak mencukupi.`);
        availableStock.set(product.id, remaining - item.quantity);
      }
      for (const product of data.products) product.stock = availableStock.get(product.id);
      let customer = customerPhone
        ? data.customers.find((item) => String(item.phone || '').trim() === customerPhone)
        : data.customers.find((item) => !item.phone && item.name.trim().toLowerCase() === customerName.toLowerCase());
      if (!customer) {
        customer = { id: `c-${crypto.randomUUID()}`, name: customerName, phone: customerPhone || null };
        data.customers.push(customer);
      } else {
        customer.name = customerName;
        if (customerPhone) customer.phone = customerPhone;
      }
      const sale = existingSale || { id: `s-${crypto.randomUUID()}`, created_at: new Date().toISOString() };
      const changeDue = fromCents(Math.max(0, toCents(amountPaid) - totalCents));
      Object.assign(sale, { customer_id: customer.id, payment_method: payload.payment_method, total, amount_paid: amountPaid, change_due: changeDue });
      savedSaleId = sale.id;
      if (existingSale) data.saleItems = data.saleItems.filter((item) => item.sale_id !== existingSale.id);
      for (const item of items) {
        const product = findProduct(item.product_id);
        data.saleItems.push({ id: `si-${crypto.randomUUID()}`, sale_id: sale.id, product_id: product.id, quantity: item.quantity, unit_price: product.price });
      }
      if (!existingSale) data.sales.push(sale);
      persist();
    }
    document.querySelector('#sale-dialog').close();
    editingSaleId = null;
    render();
    showSaleSuccess(savedSaleId, Boolean(existingSale));
  } catch (error) { document.querySelector('#sale-error').textContent = friendlyError(error); }
  finally { button.disabled = false; }
}

function showSaleSuccess(saleId, wasEdit) {
  recentlySavedSaleId = saleId;
  const sale = data.sales.find((item) => item.id === saleId);
  if (!sale) return;
  document.querySelector('#sale-success-title').textContent = wasEdit ? 'Transaksi diperbarui' : 'Penjualan berhasil';
  document.querySelector('#sale-success-summary').textContent = `Nota #${String(sale.id).toUpperCase()} · ${rupiah(sale.total)}`;
  document.querySelector('#sale-success-dialog').showModal();
}

function renderReceipt(saleId) {
  const sale = data.sales.find((item) => item.id === saleId);
  if (!sale) { showToast('Transaksi tidak ditemukan.'); return false; }
  const lines = saleItemsFor(saleId).map((item) => ({ item, product: findProduct(item.product_id), subtotalCents: toCents(item.unit_price) * Number(item.quantity) }));
  const itemsTotalCents = lines.reduce((sum, line) => sum + line.subtotalCents, 0);
  const saleTotalCents = toCents(sale.total);
  if (!lines.length || itemsTotalCents !== saleTotalCents) {
    showToast('Struk tidak dapat dicetak: subtotal barang tidak sama dengan total transaksi.');
    return false;
  }

  const width = document.querySelector('#receipt-width').value;
  const customer = findCustomer(sale.customer_id);
  const paidCents = toCents(sale.amount_paid ?? sale.total);
  const changeCents = toCents(sale.change_due ?? Math.max(0, Number(sale.amount_paid ?? sale.total) - Number(sale.total)));
  const date = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(sale.created_at));
  const rows = lines.map(({ item, product, subtotalCents }) => `<tr class="receipt-product-row"><td colspan="3">${escapeHtml(product?.name || 'Produk')}</td></tr><tr class="receipt-values-row"><td><span class="receipt-detail-label">Qty</span><strong>${Number(item.quantity)}</strong></td><td><span class="receipt-detail-label">Harga Satuan (Rp)</span><strong>${receiptNumber(item.unit_price)}</strong></td><td><span class="receipt-detail-label">Subtotal (Rp)</span><strong>${receiptNumber(fromCents(subtotalCents))}</strong></td></tr>`).join('');
  const cashLabel = sale.payment_method === 'Tunai' ? 'Tunai' : sale.payment_method;
  document.querySelector('#receipt-preview').innerHTML = `<article class="receipt-paper" data-receipt-width="${width}" style="--receipt-width:${width}mm">
    <header class="receipt-header"><h1>${escapeHtml(storeInfo.name)}</h1><p>${escapeHtml(storeInfo.address)}</p><p>Tel. ${escapeHtml(storeInfo.phone)}</p></header>
    <div class="receipt-rule"></div>
    <div class="receipt-meta"><div><span>Tanggal/Waktu</span><strong>${escapeHtml(date)}</strong></div><div><span>No. Nota</span><strong>${escapeHtml(String(sale.id).toUpperCase())}</strong></div></div>
    <div class="receipt-customer"><span>Pelanggan</span><strong>${escapeHtml(customer)}</strong></div>
    <div class="receipt-rule"></div>
    <table class="receipt-items"><tbody>${rows}</tbody></table>
    <div class="receipt-rule"></div>
    <div class="receipt-summary"><div class="receipt-total"><span>Total Pembayaran</span><strong>${rupiah(fromCents(saleTotalCents))}</strong></div><div><span>Jumlah Uang (${escapeHtml(cashLabel)})</span><strong>${rupiah(fromCents(paidCents))}</strong></div><div><span>Kembalian</span><strong>${rupiah(fromCents(changeCents))}</strong></div></div>
    <div class="receipt-rule"></div><p class="receipt-thanks">Terima kasih telah berbelanja di Gadgetku.</p>
  </article>`;
  return true;
}

function openReceipt(saleId, printImmediately = false) {
  if (!renderReceipt(saleId)) return;
  activeReceiptSaleId = saleId;
  const dialog = document.querySelector('#receipt-dialog');
  if (!dialog.open) dialog.showModal();
  if (printImmediately) setTimeout(() => window.print(), 150);
}

async function deleteSale(saleId) {
  if (!connected) { showToast('Hapus transaksi dinonaktifkan sampai Supabase tersambung.'); return; }
  const sale = data.sales.find((item) => item.id === saleId);
  if (!sale) return;
  if (data.returns.some((item) => item.sale_id === saleId)) {
    showToast('Transaksi yang sudah diretur tidak dapat dihapus.');
    return;
  }
  if (!window.confirm('Hapus transaksi ini dan kembalikan stok produk?')) return;
  try {
    if (connected) {
      await supabaseRpc('delete_sale', { p_sale_id: saleId });
      await refreshData();
    } else {
      for (const item of saleItemsFor(saleId)) {
        const product = findProduct(item.product_id);
        if (product) product.stock = Number(product.stock) + Number(item.quantity);
      }
      data.saleItems = data.saleItems.filter((item) => item.sale_id !== saleId);
      data.sales = data.sales.filter((item) => item.id !== saleId);
      persist();
    }
    render();
    showToast('Transaksi dihapus dan stok dikembalikan.');
  } catch (error) {
    showToast(friendlyError(error));
  }
}

async function saveReturn(event) {
  event.preventDefault();
  if (!connected) { document.querySelector('#return-error').textContent = `Retur tidak disimpan. Periksa koneksi Supabase${connectionError ? `: ${connectionError}` : '.'}`; return; }
  const items = [...document.querySelectorAll('[data-return-qty]')].filter((input) => Number(input.value) > 0).map((input) => ({ sale_item_id: input.dataset.returnQty, quantity: Number(input.value) }));
  const reason = document.querySelector('[name="reason"]').value.trim();
  if (!items.length) { document.querySelector('#return-error').textContent = 'Pilih setidaknya satu barang.'; return; }
  const payload = { sale_id: document.querySelector('#return-sale').value, reason, items };
  const button = document.querySelector('#return-form .modal-submit');
  button.disabled = true;
  try {
    if (connected) {
      await supabaseRpc('create_return', { p_sale_id: payload.sale_id, p_reason: payload.reason, p_items: payload.items });
      await refreshData();
    } else {
      const record = { id: `r-${crypto.randomUUID()}`, sale_id: payload.sale_id, reason, total_refund: 0, created_at: new Date().toISOString() };
      for (const item of items) {
        const saleItem = data.saleItems.find((entry) => entry.id === item.sale_item_id);
        const remaining = Number(saleItem.quantity) - returnedQuantity(saleItem.id);
        if (!saleItem || item.quantity > remaining) throw new Error('Jumlah retur melebihi jumlah pembelian.');
        const product = findProduct(saleItem.product_id);
        record.total_refund += Number(saleItem.unit_price) * item.quantity;
        product.stock = Number(product.stock) + item.quantity;
        data.returnItems.push({ id: `ri-${crypto.randomUUID()}`, return_id: record.id, sale_item_id: saleItem.id, quantity: item.quantity, refund_amount: Number(saleItem.unit_price) * item.quantity });
      }
      data.returns.push(record);
      persist();
    }
    document.querySelector('#return-dialog').close();
    render();
    showToast('Retur berhasil dicatat dan stok diperbarui.');
  } catch (error) { document.querySelector('#return-error').textContent = friendlyError(error); }
  finally { button.disabled = false; }
}

async function refreshData() {
  data = await loadSupabaseDashboard();
}

function friendlyError(error) {
  try { return JSON.parse(error.message).message || error.message; } catch { return error.message || 'Terjadi kesalahan.'; }
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.go)));
document.querySelector('#new-sale').addEventListener('click', openSale);
document.querySelector('#sales-table').addEventListener('click', (event) => {
  const editButton = event.target.closest('[data-sale-edit]');
  const deleteButton = event.target.closest('[data-sale-delete]');
  const printButton = event.target.closest('[data-sale-print]');
  if (editButton) openSale(editButton.dataset.saleEdit);
  if (deleteButton) deleteSale(deleteButton.dataset.saleDelete);
  if (printButton) openReceipt(printButton.dataset.salePrint, true);
});
document.querySelector('[data-action="new-return"]').addEventListener('click', openReturn);
document.querySelector('[data-action="new-supplier"]').addEventListener('click', () => openSupplierForm());
document.querySelector('[data-action="new-product"]').addEventListener('click', () => openProductForm());
document.querySelector('#supplier-form').addEventListener('submit', saveSupplier);
document.querySelector('#product-form').addEventListener('submit', saveProduct);
document.querySelector('#suppliers-table').addEventListener('click', (event) => {
  const editButton = event.target.closest('[data-supplier-edit]');
  const deleteButton = event.target.closest('[data-supplier-delete]');
  if (editButton) openSupplierForm(editButton.dataset.supplierEdit);
  if (deleteButton) deleteSupplier(deleteButton.dataset.supplierDelete);
});
document.querySelector('#catalog-table').addEventListener('click', (event) => {
  const editButton = event.target.closest('[data-product-edit]');
  const deleteButton = event.target.closest('[data-product-delete]');
  if (editButton) openProductForm(editButton.dataset.productEdit);
  if (deleteButton) deleteProduct(deleteButton.dataset.productDelete);
});
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelector('#sale-form').addEventListener('submit', saveSale);
document.querySelector('#sale-payment-method').addEventListener('change', updateSaleTotal);
document.querySelector('#return-form').addEventListener('submit', saveReturn);
document.querySelector('#sale-product-list').addEventListener('input', updateSaleTotal);
document.querySelector('#receipt-width').addEventListener('change', () => { if (activeReceiptSaleId) renderReceipt(activeReceiptSaleId); });
document.querySelector('#print-saved-sale').addEventListener('click', () => {
  document.querySelector('#sale-success-dialog').close();
  if (recentlySavedSaleId) openReceipt(recentlySavedSaleId, true);
});
document.querySelector('#print-receipt').addEventListener('click', () => window.print());
document.querySelector('#return-sale').addEventListener('change', (event) => { renderReturnPicker(event.target.value); updateReturnTotal(); });
document.querySelector('#return-item-list').addEventListener('input', updateReturnTotal);
document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(today);
const initialView = ['dashboard', 'sales', 'returns', 'inventory', 'suppliers', 'products'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard';
switchView(initialView);
initialize();