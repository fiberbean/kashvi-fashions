// ==========================================
// 1. BANNER & PROMO TYPES
// ==========================================
export interface Banner {
  id: string;
  type: 'fashions' | 'jewellery';
  title: string;
  subtitle?: string;
  badge?: string;
  image_url: string;
  link_url?: string;
  span_size?: 'large' | 'small'; // Un-even sizing: 7-col vs 5-col
}

// ==========================================
// 2. CATEGORY & SUB-CATEGORY TYPES
// ==========================================
export interface SubCategory {
  id: string;
  category_id?: string;
  name: string;
  slug: string;
  image_url?: string;
  size_group?: 'bangles' | 'lingerie' | 'apparel' | 'free_size' | string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  department?: 'fashions' | 'jewellery';
  sub_categories?: SubCategory[];
}

// ==========================================
// 3. SIZE & VARIANT TYPES (Updated with Sub-Category)
// ==========================================
export type SizeGroupType = 'bangles' | 'lingerie' | 'apparel' | 'free_size' | string;

export interface SizeRecord {
  id: string;
  name: string;
  sub_category_id?: string | null;
  sub_category_name?: string | null;
  size_group: SizeGroupType;
  display_order: number;
  active: boolean;
  created_at?: string;
}

// ==========================================
// 4. OTHER MASTER RECORDS (Colours, Fabrics, Units)
// ==========================================
export interface ColourRecord {
  id: string;
  name: string;
  hex_code?: string;
  active?: boolean;
}

export interface FabricRecord {
  id: string;
  name: string;
  active?: boolean;
}

export interface UnitRecord {
  id: string;
  name: string;
  symbol?: string;
}