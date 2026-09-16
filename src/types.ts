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

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  image_url: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  sub_categories?: SubCategory[];
}