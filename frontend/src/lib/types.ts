export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Settings {
  id: number;
  store_name: string;
  address: string | null;
  phone: string | null;
  receipt_footer: string | null;
}

export type Unit = "kg" | "pcs";

export interface Service {
  id: number;
  name: string;
  unit: Unit;
  price: string;
  estimated_days: number;
  is_active: boolean;
  order_items_count?: number;
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  orders_count?: number;
  orders_total?: string | null;
  created_at?: string;
  orders?: Order[];
}

export type OrderStatus = "diterima" | "dicuci" | "siap_diambil" | "diambil";
export type PaymentStatus = "belum_bayar" | "dp" | "lunas";
export type PaymentMethod = "tunai" | "transfer" | "qris";

export interface OrderItem {
  id: number;
  service_id: number | null;
  service_name: string;
  unit: Unit;
  price: string;
  quantity: string;
  subtotal: string;
}

export interface Payment {
  id: number;
  amount: string;
  method: PaymentMethod;
  received: string | null;
  note: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  invoice_code: string;
  customer_id: number;
  customer?: Customer;
  subtotal: string;
  discount: string;
  total: string;
  paid_amount: string;
  payment_status: PaymentStatus;
  status: OrderStatus;
  note: string | null;
  due_date: string | null;
  picked_up_at: string | null;
  created_at: string;
  items?: OrderItem[];
  payments?: Payment[];
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface OrdersResponse extends Paginated<Order> {
  status_counts: Record<OrderStatus, number>;
}

export interface BulkDeleteResult {
  deleted: number;
  skipped: string[];
  message: string;
}

/** Data pembayaran yang dikirim ke API. */
export interface PaymentInput {
  amount: number;
  method: PaymentMethod;
  received?: number | null;
}

export interface Report {
  from: string;
  to: string;
  revenue: number;
  orders_count: number;
  orders_value: number;
  average_order: number;
  payment_methods: { method: PaymentMethod; total: number; count: number }[];
  daily: { date: string; revenue: number; orders: number }[];
  top_services: { name: string; unit: Unit; quantity: number; total: number; count: number }[];
  receivable: { amount: number; count: number };
  queue: { diterima: number; dicuci: number; siap_diambil: number };
}
