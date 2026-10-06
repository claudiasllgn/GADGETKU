const supabaseUrl = (process.env.SUPABASE_URL || 'https://lugztkxdtbzsotxuypie.supabase.co').replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_9zcH-AWB88qtlyEW2bD-Dw_cPGSRt3Y';
const configured = Boolean(supabaseUrl && supabaseKey);

async function request(pathname, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Supabase error ${response.status}`);
  return text ? JSON.parse(text) : null;
}

async function getDashboard() {
  const [customers, suppliers, products, sales, saleItems, returns, returnItems] = await Promise.all([
    request('customers?select=id,name,phone&order=name'),
    request('suppliers?select=id,name,contact_name,phone,email,address&order=name'),
    request('products?select=id,sku,name,category,price,stock,supplier_id&order=name'),
    request('sales?select=id,customer_id,total,payment_method,amount_paid,change_due,created_at&order=created_at.desc&limit=100'),
    request('sale_items?select=id,sale_id,product_id,quantity,unit_price'),
    request('returns?select=id,sale_id,total_refund,reason,created_at&order=created_at.desc&limit=100'),
    request('return_items?select=id,return_id,sale_item_id,quantity,refund_amount'),
  ]);
  return { customers, suppliers, products, sales, saleItems, returns, returnItems };
}

function createSale(body) {
  return request('rpc/create_sale_with_customer', {
    method: 'POST',
    body: JSON.stringify({ p_customer_name: body.customer_name, p_customer_phone: body.customer_phone, p_payment_method: body.payment_method, p_items: body.items, p_amount_paid: body.amount_paid }),
  });
}

function updateSale(saleId, body) {
  return request('rpc/update_sale_with_customer', {
    method: 'POST',
    body: JSON.stringify({ p_sale_id: saleId, p_customer_name: body.customer_name, p_customer_phone: body.customer_phone, p_payment_method: body.payment_method, p_items: body.items, p_amount_paid: body.amount_paid }),
  });
}

function deleteSale(saleId) {
  return request('rpc/delete_sale', {
    method: 'POST',
    body: JSON.stringify({ p_sale_id: saleId }),
  });
}

function createReturn(body) {
  return request('rpc/create_return', {
    method: 'POST',
    body: JSON.stringify({ p_sale_id: body.sale_id, p_reason: body.reason, p_items: body.items }),
  });
}

module.exports = { configured, getDashboard, createSale, updateSale, deleteSale, createReturn };