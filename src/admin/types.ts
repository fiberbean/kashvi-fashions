export type AdminRole = 'admin' | 'manager' | 'operations';

export interface AdminStaffUser {
  id: string;
  employee_id: string;
  full_name: string;
  phone?: string;
  role: AdminRole;
  pin: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

// 1. Categories Table
export interface CategoryRecord {
  id: string;
  name: string;
  slug?: string;
  department?: string;
  image_url?: string;
  parent_id?: string;
  active: boolean;
  created_at?: string;
}

// 2. Sub Categories Table
export interface SubCategoryRecord {
  id: string;
  name: string;
  category_id?: string;
  category_name?: string;
  image_url?: string;
  active: boolean;
  created_at?: string;
}

// 3. Variant Masters
export interface ColourRecord {
  id: string;
  name: string;
  active: boolean;
  created_at?: string;
}

export interface SizeRecord {
  id: string;
  name: string;
  active: boolean;
  created_at?: string;
}

export interface FabricRecord {
  id: string;
  name: string;
  created_at?: string;
}

export interface UnitRecord {
  id: string;
  name: string;
  short_name?: string;
  active: boolean;
  created_at?: string;
}

// 4. Logistics & Pincodes Table
export interface PincodeRecord {
  id: string;
  pincode: string;
  city?: string;
  state?: string;
  zone_type: 'Local' | 'Within State' | 'Zone / Metro' | 'Other States' | string;
  delivery_available: boolean;
  created_at?: string;
}

// 5. Rate Cards Table
export interface DeliveryRateCardRecord {
  id: string;
  weight_from: number;
  weight_to?: number;
  local_rate: number;
  within_state_rate: number;
  zone_metro_rate: number;
  other_states_rate: number;
  additional_kg_rate_local?: number;
  additional_kg_rate_within_state?: number;
  additional_kg_rate_zone_metro?: number;
  additional_kg_rate_other_states?: number;
  active: boolean;
  created_at?: string;
}

// 6. Customers derived
export interface CustomerMasterRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  total_orders: number;
  total_spend: number;
  city?: string;
  last_order_date?: string;
}

// 7. Orders & Cart
export interface OrderItem {
  name: string;
  price: number;
  qty: number;
  color?: string;
  size?: string;
  fabric?: string;
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