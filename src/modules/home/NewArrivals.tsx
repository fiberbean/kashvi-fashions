import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronRight as BreadcrumbChevron,
  Eye,
  Filter,
  Heart,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Check,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useWishlist } from '../../context/WishlistContext';

export type Department = 'fashions' | 'jewellery';

interface Category {
  id: string;
  name?: string | null;
  slug?: string | null;
  active?: boolean | null;
  department?: string | null;
}

interface SubCategory {
  id: string;
  name?: string | null;
  slug?: string | null;
  category_id?: string | null;
  active?: boolean | null;
  department?: string | null;
}

interface Product {
  id: string;
  name: string;
  category?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  sub_category?: string | null;
  sub_category_id?: string | null;
  sub_category_name?: string | null;
  colour?: string | null;
  size?: string | null;
  online_price?: number | null;
  inventory_mrp?: number | null;
  inventory_sizes?: string[];
  inventory_colors?: string[];
  images?: any;
  active?: boolean | null;
  fabric?: string | null;
  brand?: string | null;
  created_at?: string | null;
}

interface NewArrivalsProps {
  department: Department;
}

const NEW_ARRIVAL_DAYS = 7;
const MAX_HOME_PRODUCTS = 5;

const clean = (value: unknown) => String(value || '').trim().toLowerCase();

const splitValues = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const getImage = (images: any, department: Department): string => {
  const fallback =
    department === 'jewellery'
      ? 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80'
      : 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80';

  if (!images) return fallback;

  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === 'string') return first;
    if (first?.url) return first.url;
  }

  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        if (typeof first === 'string') return first;
        if (first?.url) return first.url;
      }
    } catch {
      return images.startsWith('http') ? images : fallback;
    }
  }

  return fallback;
};

const categoryIsJewellery = (category: Category): boolean => {
  const department = clean(category.department);
  if (department === 'jewellery' || department === 'jewelry') return true;
  if (department === 'fashions' || department === 'fashion') return false;

  return clean(category.name).includes('jewel') || clean(category.slug).includes('jewel');
};

const subCategoryIsJewellery = (sub: SubCategory): boolean => {
  const department = clean(sub.department);
  if (department === 'jewellery' || department === 'jewelry') return true;
  if (department === 'fashions' || department === 'fashion') return false;

  return clean(sub.name).includes('jewel') || clean(sub.slug).includes('jewel');
};

const uniqueById = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = String(item.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

// Remove only true duplicate variant records. Different sizes/colours remain separate.
const uniqueNewArrivalVariants = (items: Product[]) => {
  const seen = new Set<string>();

  return items.filter((product) => {
    const signature = [
      clean(product.name),
      clean(product.category_id),
      clean(product.sub_category_id),
      splitValues(product.size).map(clean).sort().join('|'),
      splitValues(product.colour).map(clean).sort().join('|'),
      getImage(product.images, 'fashions'),
    ].join('||');

    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
};

function NewArrivalCard({
  product,
  department,
  compact = false,
}: {
  product: Product;
  department: Department;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [copied, setCopied] = useState(false);

  const isJewellery = department === 'jewellery';
  const currentPrice = Number(product.online_price ?? 0);
  const mrp = Number(product.inventory_mrp ?? 0);
  const originalPrice = mrp > currentPrice ? mrp : null;
  const discountPercent = originalPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;
  const isFav = isInWishlist(String(product.id));
  const imageUrl = getImage(product.images, department);
  const colors = product.inventory_colors || [];
  const sizes = product.inventory_sizes || [];

  const handleWishlist = (event: React.MouseEvent) => {
    event.stopPropagation();

    if (isFav) {
      removeFromWishlist(String(product.id));
      return;
    }

    addToWishlist({
      id: String(product.id),
      name: product.name,
      price: currentPrice,
      originalPrice: originalPrice || undefined,
      image: imageUrl,
      color: colors[0],
      size: sizes[0],
      fabric: product.fabric || undefined,
      department,
    });
  };

  const handleShare = async (event: React.MouseEvent) => {
    event.stopPropagation();

    const url = `${window.location.origin}${window.location.pathname}#/product/${product.id}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // User cancelled the native share dialog.
    }
  };

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className={`group relative rounded-2xl overflow-hidden bg-white border transition-all duration-300 flex flex-col cursor-pointer ${
        isJewellery
          ? 'border-amber-100/70 shadow-[0_6px_20px_rgba(212,175,55,0.12)] hover:shadow-[0_12px_28px_rgba(212,175,55,0.25)] hover:border-amber-300'
          : 'border-stone-200/80 shadow-[0_6px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_28px_rgba(255,45,133,0.18)] hover:border-pink-300'
      }`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-100">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {sizes.length > 0 && (
          <div className="absolute top-2.5 right-2.5 z-30 max-w-[46%]">
            <span
              className={`block px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm border shadow-sm text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-right truncate ${
                isJewellery
                  ? 'border-amber-200 text-[#7a5a12]'
                  : 'border-pink-200 text-[#ff2d85]'
              }`}
              title={sizes.join(' / ')}
            >
              {sizes.join(' / ')}
            </span>
          </div>
        )}

        <div
          className={`absolute right-2.5 flex items-center gap-1.5 z-20 ${
            sizes.length > 0 ? 'top-12' : 'top-2.5'
          }`}
        >
          <button
            type="button"
            aria-label="Share Product"
            onClick={handleShare}
            className={`w-8 h-8 rounded-full bg-white/85 hover:bg-white text-stone-700 transition-all flex items-center justify-center shadow-sm backdrop-blur-sm ${
              copied ? 'bg-emerald-600 text-white' : ''
            }`}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            aria-label={isFav ? 'Remove from Wishlist' : 'Add to Wishlist'}
            onClick={handleWishlist}
            className="w-8 h-8 rounded-full bg-white/85 hover:bg-white text-stone-700 transition-all flex items-center justify-center shadow-sm backdrop-blur-sm"
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                isFav
                  ? isJewellery
                    ? 'fill-[#D4AF37] text-[#D4AF37]'
                    : 'fill-[#ff2d85] text-[#ff2d85]'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            />
          </button>
        </div>

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-sm backdrop-blur-md ${
              isJewellery
                ? 'bg-gradient-to-r from-[#0b3b2c] to-[#164f3a] text-[#e5c07b]'
                : 'bg-gradient-to-r from-[#ff2d85] to-[#ff639f] text-white'
            }`}
          >
            NEW
          </span>

          {discountPercent > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-sm backdrop-blur-md ${
                isJewellery
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-stone-950'
                  : 'bg-gradient-to-r from-[#ff2d85] to-[#ff639f] text-white'
              }`}
            >
              {discountPercent}% OFF
            </span>
          )}

          {product.fabric && (
            <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-white/80 text-stone-800 backdrop-blur-sm w-max border border-stone-200/50">
              {product.fabric}
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 py-2.5 px-3 bg-gradient-to-t from-stone-900/80 via-stone-900/30 to-transparent flex items-center justify-center gap-1.5 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
          <Eye className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Quick View</span>
        </div>
      </div>

      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          {(product.sub_category || product.sub_category_name) && (
            <span
              className={`text-[9px] uppercase tracking-[0.2em] font-semibold block mb-1 ${
                isJewellery ? 'text-[#b38728] font-cinzel' : 'text-[#ff2d85]'
              }`}
            >
              {product.sub_category || product.sub_category_name}
            </span>
          )}

          <h3
            className={`text-xs sm:text-sm font-bold line-clamp-2 leading-snug transition-colors ${
              isJewellery
                ? 'font-cinzel text-stone-900'
                : 'font-sans text-stone-900 group-hover:text-[#ff2d85]'
            }`}
          >
            {product.name}
          </h3>
        </div>

        <div className="pt-2 border-t border-stone-100 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <span
              className={`text-sm sm:text-base font-bold whitespace-nowrap ${
                isJewellery ? 'text-[#b38728]' : 'text-stone-950'
              }`}
            >
              ₹{currentPrice.toLocaleString('en-IN')}
            </span>
            {originalPrice && (
              <span className="text-[11px] text-stone-400 line-through whitespace-nowrap">
                ₹{originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          <span
            className={`text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-full transition-all whitespace-nowrap ${
              isJewellery
                ? 'bg-amber-50 text-[#b38728] border border-amber-200 group-hover:bg-[#D4AF37] group-hover:text-stone-950'
                : 'bg-pink-50 text-[#ff2d85] border border-pink-200 group-hover:bg-[#ff2d85] group-hover:text-white'
            }`}
          >
            Select
          </span>
        </div>
      </div>
    </div>
  );
}

async function fetchNewArrivalProducts(department: Department) {
  const now = Date.now();
  const cutoff = now - NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000;

  const [categoryResult, subResult, productResult] = await Promise.all([
    supabase.from('categories').select('*').eq('active', true),
    supabase.from('sub_categories').select('*').eq('active', true),
    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false }),
  ]);

  if (categoryResult.error) throw categoryResult.error;
  if (subResult.error) throw subResult.error;
  if (productResult.error) throw productResult.error;

  const categories = (categoryResult.data || []) as Category[];
  const subCategories = (subResult.data || []) as SubCategory[];
  const allProducts = (productResult.data || []) as Product[];

  const categoryMap = new Map(categories.map((category) => [String(category.id), category]));
  const subCategoryMap = new Map(subCategories.map((sub) => [String(sub.id), sub]));

  const allowedCategoryIds = new Set(
    categories
      .filter((category) => categoryIsJewellery(category) === (department === 'jewellery'))
      .map((category) => String(category.id))
  );

  const recent = allProducts.filter((product) => {
    if (!product.created_at) return false;

    const created = new Date(product.created_at).getTime();
    if (!Number.isFinite(created) || created < cutoff || created > now) return false;

    const category = categoryMap.get(String(product.category_id || ''));
    if (category) {
      return categoryIsJewellery(category) === (department === 'jewellery');
    }

    const subCategory = subCategoryMap.get(String(product.sub_category_id || ''));
    return subCategoryIsJewellery(subCategory || {}) === (department === 'jewellery');
  });

  const recentProductIds = recent.map((product) => String(product.id).trim()).filter(Boolean);
  const inventoryPriceMap = new Map<string, { online_price: number; mrp: number; sizes: string[]; colors: string[] }>();

  if (recentProductIds.length > 0) {
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory')
      .select('product_id, variant_color, variant_size, stock_quantity, updated_at, online_price, mrp')
      .in('product_id', recentProductIds);

    if (inventoryError) {
      console.error('New Arrivals inventory price fetch error:', inventoryError);
    } else {
      const grouped = new Map<string, any[]>();

      (inventoryData || []).forEach((row: any) => {
        const pid = String(row.product_id || '').trim();
        if (!pid) return;
        const rows = grouped.get(pid) || [];
        rows.push(row);
        grouped.set(pid, rows);
      });

      grouped.forEach((rows, pid) => {
        const usableRows = rows
          .filter((row) => Number(row.online_price) > 0)
          .sort((a, b) => {
            const stockDiff = Number(b.stock_quantity || 0) - Number(a.stock_quantity || 0);
            if (stockDiff !== 0) return stockDiff;
            return (
              new Date(String(b.updated_at || 0)).getTime() -
              new Date(String(a.updated_at || 0)).getTime()
            );
          });

        if (usableRows.length > 0) {
          const row = usableRows[0];
          const inStockRows = rows.filter((item) => Number(item.stock_quantity || 0) > 0);
          const variantRows = inStockRows.length > 0 ? inStockRows : usableRows;
          const sizes = Array.from(
            new Set(
              variantRows
                .map((item) => String(item.variant_size || '').trim())
                .filter((value) => value && value.toLowerCase() !== 'free size')
            )
          );
          const colors = Array.from(
            new Set(
              variantRows
                .map((item) => String(item.variant_color || '').trim())
                .filter((value) => value && value.toLowerCase() !== 'standard')
            )
          );

          inventoryPriceMap.set(pid, {
            online_price: Number(row.online_price) || 0,
            mrp: Number(row.mrp) || 0,
            sizes,
            colors,
          });
        }
      });
    }
  }

  const productsWithInventoryPrice = recent.map((product) => {
    const pricing = inventoryPriceMap.get(String(product.id).trim());
    return {
      ...product,
      online_price: pricing?.online_price || 0,
      inventory_mrp: pricing?.mrp || 0,
      inventory_sizes: pricing?.sizes || [],
      inventory_colors: pricing?.colors || [],
    };
  });

  return {
    categories: categories.filter(
      (category) => categoryIsJewellery(category) === (department === 'jewellery')
    ),
    subCategories: subCategories.filter((sub) => {
      const parentId = String(sub.category_id || '');
      if (allowedCategoryIds.has(parentId)) return true;
      return !parentId && subCategoryIsJewellery(sub) === (department === 'jewellery');
    }),
    products: uniqueNewArrivalVariants(uniqueById(productsWithInventoryPrice)),
  };
}

export default function NewArrivals({ department }: NewArrivalsProps) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const sectionId = `new-arrivals-${department}`;

  useEffect(() => {
    let current = true;

    fetchNewArrivalProducts(department)
      .then(({ products: recentProducts }) => {
        if (!current) return;
        setProducts(
          uniqueNewArrivalVariants(
            uniqueById(
              [...recentProducts]
              .sort(
                (a, b) =>
                  new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
              )
              .slice(0, MAX_HOME_PRODUCTS)
            )
          )
        );
      })
      .catch((error) => {
        console.error('Error loading New Arrivals:', error);
        if (current) setProducts([]);
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [department]);

  useEffect(() => {
    const update = () => {
      const container = document.getElementById(sectionId);
      if (!container) return;
      const maxScroll = container.scrollWidth - container.clientWidth;
      setCanScrollLeft(container.scrollLeft > 5);
      setCanScrollRight(container.scrollLeft < maxScroll - 5);
    };

    update();
    const container = document.getElementById(sectionId);
    container?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      container?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [sectionId, products]);

  const scrollProducts = (direction: 'left' | 'right') => {
    const container = document.getElementById(sectionId);
    if (!container) return;

    container.scrollBy({
      left: direction === 'right' ? container.clientWidth * 0.86 : -container.clientWidth * 0.86,
      behavior: 'smooth',
    });
  };

  const isJewellery = department === 'jewellery';
  const accent = isJewellery ? 'text-[#b38728]' : 'text-[#ff2d85]';
  const heading = isJewellery ? 'text-stone-900' : 'text-stone-900';
  const arrow = isJewellery
    ? 'bg-[#0b3b2c] text-[#e5c07b] border-[#b38728]/40 hover:bg-[#123f30]'
    : 'bg-[#ff2d85] text-white border-[#ff2d85] hover:bg-[#e91f72]';
  const more = isJewellery
    ? 'border-[#b38728] text-[#7a5a12] hover:bg-[#0b3b2c] hover:text-[#e5c07b]'
    : 'border-[#ff2d85] text-[#ff2d85] hover:bg-[#ff2d85] hover:text-white';

  if (!loading && products.length === 0) return null;

  return (
    <section className={`w-full px-3 sm:px-5 md:px-8 lg:px-10 py-6 sm:py-8 ${isJewellery ? 'font-cinzel' : 'font-sans'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-4 sm:mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className={`w-4 h-4 sm:w-5 sm:h-5 ${accent}`} />
              <span className={`text-[9px] sm:text-[10px] uppercase tracking-[0.25em] font-extrabold ${accent}`}>
                New Arrivals
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <h2 className={`text-xl sm:text-2xl md:text-3xl font-bold tracking-tight ${heading}`}>
                New Arrivals
              </h2>
              <span className={`h-1 w-8 sm:w-10 rounded-full ${isJewellery ? 'bg-[#D4AF37]' : 'bg-[#ff2d85]'}`} />
            </div>

          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollProducts('left')}
              disabled={!canScrollLeft}
              aria-label="Previous new arrivals"
              className={`hidden sm:flex w-8 h-8 rounded-full border items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${arrow}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => scrollProducts('right')}
              disabled={!canScrollRight}
              aria-label="Next new arrivals"
              className={`hidden sm:flex w-8 h-8 rounded-full border items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${arrow}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate(`/category/new-arrivals?tab=${department}`)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${more}`}
            >
              More
            </button>
          </div>
        </div>

        <div
          id={sectionId}
          className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth no-scrollbar snap-x snap-mandatory pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading
            ? Array.from({ length: MAX_HOME_PRODUCTS }).map((_, index) => (
                <div
                  key={index}
                  className="shrink-0 snap-start w-[calc(72vw)] sm:w-[230px] md:w-[240px] lg:w-[250px] rounded-2xl overflow-hidden bg-white border border-stone-200 animate-pulse"
                >
                  <div className="aspect-[3/4] bg-stone-200" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-stone-200 rounded w-3/4" />
                    <div className="h-4 bg-stone-200 rounded w-1/2" />
                  </div>
                </div>
              ))
            : products.map((product) => (
                <div
                  key={product.id}
                  className="shrink-0 snap-start w-[calc(72vw)] sm:w-[230px] md:w-[240px] lg:w-[250px]"
                >
                  <NewArrivalCard product={product} department={department} compact />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}

export function NewArrivalsCollectionPage() {
  const [searchParams] = useSearchParams();
  const department: Department = searchParams.get('tab') === 'jewellery' ? 'jewellery' : 'fashions';
  const isJewellery = department === 'jewellery';

  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedColour, setSelectedColour] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedPriceRange, setSelectedPriceRange] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'name-asc'>('newest');

  useEffect(() => {
    let current = true;

    setLoading(true);

    fetchNewArrivalProducts(department)
      .then(({ categories: loadedCategories, subCategories: loadedSubs, products: loadedProducts }) => {
        if (!current) return;
        setCategories(loadedCategories);
        setSubCategories(loadedSubs);
        setProducts(uniqueNewArrivalVariants(uniqueById(loadedProducts)));
      })
      .catch((error) => {
        console.error('Error loading New Arrivals page:', error);
        if (!current) return;
        setCategories([]);
        setSubCategories([]);
        setProducts([]);
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [department]);

  useEffect(() => {
    setSelectedCategory('');
    setSelectedSubCategory('');
    setSelectedColour('');
    setSelectedSize('');
    setSelectedBrand('');
    setSelectedPriceRange('');
    setSortBy('newest');
  }, [department]);

  const visibleSubCategories = useMemo(() => {
    if (!selectedCategory) return subCategories;
    return subCategories.filter((sub) => String(sub.category_id || '') === selectedCategory);
  }, [selectedCategory, subCategories]);

  const filterBaseProducts = useMemo(() => {
    return products.filter((product) => {
      if (selectedCategory && String(product.category_id || '') !== selectedCategory) return false;
      if (selectedSubCategory && String(product.sub_category_id || '') !== selectedSubCategory) return false;
      return true;
    });
  }, [products, selectedCategory, selectedSubCategory]);

  const availableColours = useMemo(
    () => Array.from(new Set(filterBaseProducts.flatMap((product) => splitValues(product.colour)))).sort((a, b) => a.localeCompare(b)),
    [filterBaseProducts]
  );

  const availableSizes = useMemo(
    () => Array.from(new Set(filterBaseProducts.flatMap((product) => splitValues(product.size)))).sort((a, b) => a.localeCompare(b)),
    [filterBaseProducts]
  );

  const availableBrands = useMemo(
    () => Array.from(new Set(filterBaseProducts.map((product) => String(product.brand || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [filterBaseProducts]
  );

  const filteredProducts = useMemo(() => {
    const priceRange = selectedPriceRange;

    const result = products.filter((product) => {
      if (selectedCategory && String(product.category_id || '') !== selectedCategory) return false;
      if (selectedSubCategory && String(product.sub_category_id || '') !== selectedSubCategory) return false;

      const productColours = splitValues(product.colour).map(clean);
      const productSizes = splitValues(product.size).map(clean);
      const brand = clean(product.brand);
      const price = Number(product.online_price ?? 0);

      if (selectedColour && !productColours.includes(clean(selectedColour))) return false;
      if (selectedSize && !productSizes.includes(clean(selectedSize))) return false;
      if (selectedBrand && brand !== clean(selectedBrand)) return false;

      if (priceRange === 'under-500' && price >= 500) return false;
      if (priceRange === '500-1000' && (price < 500 || price > 1000)) return false;
      if (priceRange === '1000-2000' && (price < 1000 || price > 2000)) return false;
      if (priceRange === 'above-2000' && price <= 2000) return false;

      return true;
    });

    return result.sort((a, b) => {
      if (sortBy === 'price-asc') return Number(a.online_price ?? 0) - Number(b.online_price ?? 0);
      if (sortBy === 'price-desc') return Number(b.online_price ?? 0) - Number(a.online_price ?? 0);
      if (sortBy === 'name-asc') return String(a.name).localeCompare(String(b.name));
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [products, selectedCategory, selectedSubCategory, selectedColour, selectedSize, selectedBrand, selectedPriceRange, sortBy]);

  const activeFilterCount =
    (selectedCategory ? 1 : 0) +
    (selectedSubCategory ? 1 : 0) +
    (selectedColour ? 1 : 0) +
    (selectedSize ? 1 : 0) +
    (selectedBrand ? 1 : 0) +
    (selectedPriceRange ? 1 : 0);

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedSubCategory('');
    setSelectedColour('');
    setSelectedSize('');
    setSelectedBrand('');
    setSelectedPriceRange('');
    setSortBy('newest');
  };

  const resetDependentFilters = () => {
    setSelectedColour('');
    setSelectedSize('');
    setSelectedBrand('');
    setSelectedPriceRange('');
  };

  const accent = isJewellery ? 'text-[#b38728]' : 'text-[#ff2d85]';
  const border = isJewellery ? 'border-amber-100/70' : 'border-stone-200/80';
  const active = isJewellery
    ? 'bg-[#0b3b2c] text-[#e5c07b] border-[#0b3b2c]'
    : 'bg-[#ff2d85] text-white border-[#ff2d85]';

  const FilterContent = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Category</label>
        <select
          value={selectedCategory}
          onChange={(event) => {
            setSelectedCategory(event.target.value);
            setSelectedSubCategory('');
            resetDependentFilters();
          }}
          className={`w-full h-10 rounded-xl border bg-white px-3 text-xs text-stone-800 outline-none focus:ring-2 ${
            isJewellery ? 'border-amber-200 focus:ring-amber-100' : 'border-stone-200 focus:ring-pink-100'
          }`}
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Sub-Category</label>
        <select
          value={selectedSubCategory}
          disabled={!selectedCategory}
          onChange={(event) => {
            setSelectedSubCategory(event.target.value);
            resetDependentFilters();
          }}
          className={`w-full h-10 rounded-xl border bg-white px-3 text-xs text-stone-800 outline-none disabled:bg-stone-50 disabled:text-stone-400 focus:ring-2 ${
            isJewellery ? 'border-amber-200 focus:ring-amber-100' : 'border-stone-200 focus:ring-pink-100'
          }`}
        >
          <option value="">{selectedCategory ? 'All Sub-Categories' : 'Select Category First'}</option>
          {visibleSubCategories.map((sub) => (
            <option key={sub.id} value={String(sub.id)}>
              {sub.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Colour</label>
        <select
          value={selectedColour}
          disabled={!selectedSubCategory}
          onChange={(event) => setSelectedColour(event.target.value)}
          className={`w-full h-10 rounded-xl border bg-white px-3 text-xs text-stone-800 outline-none disabled:bg-stone-50 disabled:text-stone-400 focus:ring-2 ${
            isJewellery ? 'border-amber-200 focus:ring-amber-100' : 'border-stone-200 focus:ring-pink-100'
          }`}
        >
          <option value="">All Colours</option>
          {availableColours.map((colour) => (
            <option key={colour} value={colour}>{colour}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Size</label>
        <select
          value={selectedSize}
          disabled={!selectedSubCategory}
          onChange={(event) => setSelectedSize(event.target.value)}
          className={`w-full h-10 rounded-xl border bg-white px-3 text-xs text-stone-800 outline-none disabled:bg-stone-50 disabled:text-stone-400 focus:ring-2 ${
            isJewellery ? 'border-amber-200 focus:ring-amber-100' : 'border-stone-200 focus:ring-pink-100'
          }`}
        >
          <option value="">All Sizes</option>
          {availableSizes.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Brand</label>
        <select
          value={selectedBrand}
          disabled={!selectedSubCategory}
          onChange={(event) => setSelectedBrand(event.target.value)}
          className={`w-full h-10 rounded-xl border bg-white px-3 text-xs text-stone-800 outline-none disabled:bg-stone-50 disabled:text-stone-400 focus:ring-2 ${
            isJewellery ? 'border-amber-200 focus:ring-amber-100' : 'border-stone-200 focus:ring-pink-100'
          }`}
        >
          <option value="">All Brands</option>
          {availableBrands.map((brand) => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Price</label>
        <select
          value={selectedPriceRange}
          disabled={!selectedSubCategory}
          onChange={(event) => setSelectedPriceRange(event.target.value)}
          className={`w-full h-10 rounded-xl border bg-white px-3 text-xs text-stone-800 outline-none disabled:bg-stone-50 disabled:text-stone-400 focus:ring-2 ${
            isJewellery ? 'border-amber-200 focus:ring-amber-100' : 'border-stone-200 focus:ring-pink-100'
          }`}
        >
          <option value="">All Prices</option>
          <option value="under-500">Under ₹500</option>
          <option value="500-1000">₹500 – ₹1,000</option>
          <option value="1000-2000">₹1,000 – ₹2,000</option>
          <option value="above-2000">Above ₹2,000</option>
        </select>
      </div>
    </div>
  );

  return (
    <main
      className={`min-h-screen transition-colors duration-500 pb-16 ${
        isJewellery
          ? 'bg-[#FBF9F5] text-stone-900 font-cinzel'
          : 'bg-[#FAF8F5] text-stone-900 font-sans'
      }`}
    >
      <div
        className={`w-full py-4 sm:py-6 px-4 md:px-8 border-b ${
          isJewellery
            ? 'bg-gradient-to-b from-amber-50/40 via-transparent to-transparent border-amber-100/60'
            : 'bg-gradient-to-b from-pink-50/50 via-transparent to-transparent border-pink-100/60'
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Link
              to={`/?tab=${isJewellery ? 'jewellery' : 'fashions'}`}
              className="hover:underline font-medium text-stone-700"
            >
              Home
            </Link>
            <BreadcrumbChevron className="w-3 h-3 text-stone-400" />
            <span className="capitalize">{isJewellery ? 'Jewellery' : 'Fashions'}</span>
            <BreadcrumbChevron className="w-3 h-3 text-stone-400" />
            <span className={`font-semibold ${accent}`}>New Arrivals</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1.5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className={`w-4 h-4 ${accent}`} />
                <span className={`text-[10px] uppercase tracking-[0.25em] font-extrabold ${accent}`}>
                  New Arrivals
                </span>
              </div>
              <h1
                className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                  isJewellery ? 'font-cinzel text-stone-900 tracking-wider' : 'font-sans text-stone-950'
                }`}
              >
                New Arrivals
              </h1>
            </div>

            <span className="text-xs text-stone-500 font-medium">
              {loading ? 'Loading...' : `Showing ${filteredProducts.length} items`}
            </span>
          </div>

        </div>
      </div>

      <div
        className={`max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between border-b ${
          isJewellery ? 'border-amber-100/70' : 'border-stone-200/80'
        }`}
      >
        <div className="flex items-center gap-2.5 text-xs min-w-0">
          <div className="flex items-center gap-2 text-stone-500 min-w-0">
            <Filter className="w-3.5 h-3.5 text-stone-600 shrink-0" />
            <span className="truncate">
              Filters Active:{' '}
              <b className="text-stone-900">
                {selectedSubCategory
                  ? visibleSubCategories.find((item) => String(item.id) === selectedSubCategory)?.name || 'Sub-Category'
                  : selectedCategory
                    ? categories.find((item) => String(item.id) === selectedCategory)?.name || 'Category'
                    : 'New Arrivals'}
              </b>
              {activeFilterCount > 0 && <span className="ml-1 text-stone-400">({activeFilterCount})</span>}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setFilterOpen((value) => !value)}
            aria-expanded={filterOpen}
            aria-label={filterOpen ? 'Hide filters' : 'Show filters'}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold transition-all shadow-sm shrink-0 ${
              filterOpen
                ? isJewellery
                  ? 'bg-[#0b3b2c] text-[#e5c07b] border-[#0b3b2c]'
                  : 'bg-[#ff2d85] text-white border-[#ff2d85]'
                : isJewellery
                  ? 'bg-white text-[#7a5a12] border-amber-200 hover:bg-amber-50'
                  : 'bg-white text-[#ff2d85] border-pink-200 hover:bg-pink-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span
                className={`min-w-[17px] h-[17px] px-1 rounded-full text-[9px] flex items-center justify-center font-extrabold ${
                  filterOpen
                    ? isJewellery
                      ? 'bg-[#e5c07b] text-[#0b3b2c]'
                      : 'bg-white text-[#ff2d85]'
                    : isJewellery
                      ? 'bg-[#0b3b2c] text-[#e5c07b]'
                      : 'bg-[#ff2d85] text-white'
                }`}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            aria-label="Sort products"
            className={`bg-white border rounded-xl px-3 py-1.5 text-xs text-stone-800 focus:outline-none cursor-pointer shadow-sm ${
              isJewellery ? 'border-amber-200/80' : 'border-stone-200'
            }`}
          >
            <option value="newest">Newest First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A to Z</option>
          </select>
        </div>
      </div>

      {filterOpen && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-3 sm:p-4">
            <FilterContent />
          </div>
        </div>
      )}

      {activeFilterCount > 0 && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] text-stone-500 truncate">
              {selectedCategory && <span className="mr-2">Category: <b>{categories.find((item) => String(item.id) === selectedCategory)?.name}</b></span>}
              {selectedSubCategory && <span className="mr-2">Sub-Category: <b>{visibleSubCategories.find((item) => String(item.id) === selectedSubCategory)?.name}</b></span>}
              {selectedColour && <span className="mr-2">Colour: <b>{selectedColour}</b></span>}
              {selectedSize && <span className="mr-2">Size: <b>{selectedSize}</b></span>}
              {selectedBrand && <span className="mr-2">Brand: <b>{selectedBrand}</b></span>}
              {selectedPriceRange && <span>Price: <b>{selectedPriceRange.replace('under-500', 'Under ₹500').replace('500-1000', '₹500 – ₹1,000').replace('1000-2000', '₹1,000 – ₹2,000').replace('above-2000', 'Above ₹2,000')}</b></span>}
            </div>
            <button type="button" onClick={clearFilters} className={`text-[10px] font-bold shrink-0 ${accent}`}>Clear All</button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 min-h-[380px]">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="rounded-2xl overflow-hidden bg-white border border-stone-200 animate-pulse">
                <div className="aspect-[3/4] bg-stone-200" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-stone-200 rounded w-3/4" />
                  <div className="h-4 bg-stone-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in duration-150">
            {filteredProducts.map((product) => (
              <NewArrivalCard key={product.id} product={product} department={department} />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center space-y-3">
            <Sparkles className={`w-8 h-8 mx-auto mb-3 ${accent}`} />
            <p className="text-stone-500 text-sm">No matching new arrivals.</p>
            <button type="button" onClick={clearFilters} className={`text-xs font-bold underline ${accent}`}>
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
