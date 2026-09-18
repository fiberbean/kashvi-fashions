export interface OrderItem {
  name: string;
  price: number;
  qty: number;
  color?: string;
  size?: string;
  image?: string;
}

export interface OrderRecord {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  total_amount: number;
  subtotal?: number;
  delivery_fee?: number;
  shipping_address?: string;
  pincode?: string;
  order_status: string;
  payment_status: string;
  payment_method?: string;
  items?: OrderItem[];
  created_at: string;
}

export interface AbandonedCartUser {
  id: string;
  customer_name: string;
  customer_phone: string;
  items_count: number;
  cart_value: number;
  last_active: string;
  items_preview: string;
}