import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Filter,
  ArrowUpDown,
  ChevronRight,
  Sparkles,
  Heart,
  ArrowLeft,
  X,
  Plus,
  Minus,
  Maximize2,
  Check,
  ShoppingBag,
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import HeaderBagButton from '../../components/common/HeaderBagButton';
import HeaderUserButton from '../../components/common/HeaderUserButton';
import HeaderHeartButton from '../../components/common/HeaderHeartButton';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

import fashionLogo from '../../assets/fashion-logo.png';
import jewelleryLogo from '../../assets/jewellery-logo.png';

interface Product {
  id: string;
  name: string;
  category?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  sub_category?: string | null;
  sub_category_id?: string | null;
  sub_category_name?: string | null;
  department?: string | null;
  colour?: string | null;
  colors?: any;
  size?: string | null;
  sizes?: any;
  available_sizes?: any;
  selling_price?: number | null;
  price?: number | null;
  mrp?: number | null;
  images?: any;
  active?: boolean | null;
  fabric?: string | null;
  brand?: string | null;
  description?: string | null;
  variants?: any;
}

interface SubCategory {
  id: string;
  name: string;
  category_id?: string | null;
  category_name?: string | null;
  department?: string | null;
  image_url?: string | null;
  active?: boolean | null;
}

interface ComboItem {
  id: string;
  color: string;
  size: string;
  fabric?: string;
  qty: number;
}

const COLOR_HEX_MAP: Record<string, string> = {
  pink: '#e83e8c',
  'baby pink': '#f4c2c2',
  'rani pink': '#e30b5c',
  magenta: '#d63384',
  beige: '#f5e1d5',
  skin: '#e8beac',
  nude: '#d2b48c',
  black: '#1f2937',
  white: '#ffffff',
  red: '#dc2626',
  'crimson red': '#dc143c',
  maroon: '#800000',
  wine: '#722f37',
  navy: '#0f172a',
  'navy blue': '#000080',
  blue: '#2563eb',
  'sky blue': '#87ceeb',
  turquoise: '#40e0d0',
  green: '#16a34a',
  'dark green': '#006400',
  purple: '#9333ea',
  violet: '#8a2be2',
  yellow: '#eab308',
  'mustard yellow': '#e1ad01',
  'musturd yellow': '#e1ad01',
  peach: '#ffdab9',
  grey: '#4b5563',
  gray: '#4b5563',
  gold: '#d4af37',
  antique: '#996515',
  silver: '#c0c0c0',
  ruby: '#9b111e',
  emerald: '#50c878',
};

const isLightColor = (colorName: string): boolean => {
  const lower = colorName.toLowerCase().trim();
  return ['white', 'beige', 'skin', 'yellow', 'nude', 'gold', 'silver', 'peach', 'baby pink', 'sky blue'].includes(lower);
};

const categoryMetaCache = new Map<string, { name: string; dept: 'fashions' | 'jewellery'; id: string }>();

export default function CategoryProductListPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedSub = searchParams.get('sub');

  const { addToCart, openCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categoryName, setCategoryName] = useState<string>('');
  const [department, setDepartment] = useState<'fashions' | 'jewellery'>('fashions');

  const [headerLoading, setHeaderLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  // Modal State
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [modalImages, setModalImages] = useState<{ url: string; color?: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [singleQty, setSingleQty] = useState<number>(1);
  const [comboList, setComboList] = useState<ComboItem[]>([]);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);

  const isJewellery = department === 'jewellery' || slug?.toLowerCase().includes('jewel') || searchParams.get('tab') === 'jewellery';
  const currentLogo = isJewellery ? jewelleryLogo : fashionLogo;
  const brandAlt = isJewellery ? 'Kashvi Jewellery' : 'Kashvi Fashions';

  // 1. Load Category Meta and Sub-Categories (Safe Resilient Queries without 400 Errors)
  useEffect(() => {
    let isCurrent = true;

    async function loadMetaAndSubs() {
      const slugKey = (slug || '').trim();
      let activeCatId = '';
      let activeCatName = slugKey;
      let currentDept: 'fashions' | 'jewellery' = slugKey.toLowerCase().includes('jewel')
        ? 'jewellery'
        : 'fashions';

      try {
        if (categoryMetaCache.has(slugKey)) {
          const cached = categoryMetaCache.get(slugKey)!;
          activeCatId = cached.id;
          activeCatName = cached.name;
          currentDept = cached.dept;
        } else if (slugKey) {
          // Safe query: fetch all categories and match client-side to prevent column errors
          const { data: catList } = await supabase
            .from('categories')
            .select('*')
            .limit(50);

          if (catList && catList.length > 0) {
            const targetLower = slugKey.toLowerCase();
            const matched = catList.find((c: any) => 
              String(c.id).toLowerCase() === targetLower ||
              (c.slug && String(c.slug).toLowerCase() === targetLower) ||
              (c.name && String(c.name).toLowerCase() === targetLower)
            );

            if (matched) {
              activeCatId = String(matched.id);
              activeCatName = matched.name;
              const d = (matched.department || '').toLowerCase().trim();
              currentDept = d.includes('jewel') ? 'jewellery' : 'fashions';
              categoryMetaCache.set(slugKey, { name: activeCatName, dept: currentDept, id: activeCatId });
            }
          }
        }

        if (isCurrent) {
          setCategoryName(activeCatName);
          setDepartment(currentDept);
          setHeaderLoading(false);
        }

        // Safe query for sub_categories
        const { data: subData } = await supabase
          .from('sub_categories')
          .select('*');

        if (isCurrent && subData) {
          let filtered: SubCategory[] = [];

          if (currentDept === 'jewellery') {
            filtered = subData.filter((sub: any) => {
              if (sub.active === false) return false;
              const subDept = (sub.department || '').toLowerCase().trim();
              if (subDept.includes('jewel')) return true;
              if (activeCatId && String(sub.category_id).trim() === activeCatId) return true;
              const cName = (sub.category_name || '').toLowerCase();
              return cName.includes('jewel');
            });

            if (filtered.length === 0) {
              filtered = subData.filter((sub: any) => {
                if (sub.active === false) return false;
                const sName = (sub.name || '').toLowerCase();
                return (
                  sName.includes('bangle') ||
                  sName.includes('necklace') ||
                  sName.includes('earring') ||
                  sName.includes('chain') ||
                  sName.includes('ring') ||
                  sName.includes('choker') ||
                  sName.includes('chuda')
                );
              });
            }
          } else {
            filtered = subData.filter((sub: any) => {
              if (sub.active === false) return false;
              const matchesId = activeCatId && String(sub.category_id).trim() === activeCatId;
              const matchesName =
                sub.category_name &&
                activeCatName &&
                sub.category_name.toLowerCase().trim() === activeCatName.toLowerCase().trim();
              return matchesId || matchesName || !activeCatId;
            });
          }

          setSubCategories(filtered);
        }
      } catch (err) {
        console.error('Meta/Sub-categories loading error:', err);
      } finally {
        if (isCurrent) setHeaderLoading(false);
      }
    }

    loadMetaAndSubs();

    return () => {
      isCurrent = false;
    };
  }, [slug]);

  // 2. Load Products
  useEffect(() => {
    let isCurrent = true;

    async function loadProductsData() {
      setProductsLoading(true);
      try {
        const slugKey = (slug || '').trim();
        const catInfo = categoryMetaCache.get(slugKey);
        const activeCatId = catInfo?.id || '';
        const activeCatName = catInfo?.name || slugKey;
        const currentDept = catInfo?.dept || (slugKey.toLowerCase().includes('jewel') ? 'jewellery' : 'fashions');

        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (prodError) throw prodError;

        if (isCurrent && prodData) {
          const filtered = prodData.filter((p: any) => {
            if (p.active === false) return false;

            // Sub-category Match
            if (selectedSub) {
              const sel = selectedSub.toLowerCase().trim();
              const pSub = (p.sub_category || p.sub_category_name || '').toLowerCase().trim();
              const pSubId = String(p.sub_category_id || '').toLowerCase().trim();
              return pSub === sel || pSubId === sel || pSub.includes(sel);
            }

            // Department Match
            const pDept = (p.department || '').toLowerCase().trim();
            if (currentDept === 'jewellery') {
              if (pDept.includes('jewel')) return true;
              const pCat = (p.category || p.category_name || '').toLowerCase();
              return pCat.includes('jewel');
            }

            // Fashion Category Match
            if (activeCatId && String(p.category_id).trim() === activeCatId) return true;
            const pCatName = (p.category_name || p.category || '').toLowerCase().trim();
            const targetName = activeCatName.toLowerCase().trim();
            return pCatName === targetName || (!pDept.includes('jewel') && slugKey === 'bras') || (!pDept.includes('jewel') && slugKey === 'fashions');
          });

          setProducts(filtered);
        }
      } catch (err) {
        console.error('Error loading category products:', err);
        if (isCurrent) setProducts([]);
      } finally {
        if (isCurrent) setProductsLoading(false);
      }
    }

    loadProductsData();

    return () => {
      isCurrent = false;
    };
  }, [slug, selectedSub]);

  // Image Parser Helper
  const getProductImage = (images: any): string => {
    const fallback = isJewellery
      ? 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80'
      : 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80';

    if (!images) return fallback;
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return typeof parsed[0] === 'string' ? parsed[0] : parsed[0]?.url || fallback;
        }
      } catch {
        return images.startsWith('http') ? images : fallback;
      }
    }
    if (Array.isArray(images) && images.length > 0) {
      const first = images[0];
      return typeof first === 'string' ? first : first?.url || fallback;
    }
    return fallback;
  };

  // Robust Colors Parser
  const getProductColors = (prod: any): string[] => {
    if (!prod) return [];
    const colorsSet = new Set<string>();

    const checkValue = (val: any) => {
      if (!val) return;
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            parsed.forEach((c) => checkValue(c));
            return;
          }
        } catch {}
        val.split(',').forEach((c) => {
          const clean = c.trim();
          if (clean && clean.toLowerCase() !== 'all' && clean.toLowerCase() !== 'universal') {
            colorsSet.add(clean);
          }
        });
      } else if (Array.isArray(val)) {
        val.forEach((item) => {
          if (typeof item === 'string') checkValue(item);
          else if (item?.color || item?.colour || item?.name) {
            checkValue(item.color || item.colour || item.name);
          }
        });
      }
    };

    checkValue(prod.colour);
    checkValue(prod.colors);
    checkValue(prod.color);

    if (prod.variants) {
      let vars = prod.variants;
      if (typeof vars === 'string') {
        try { vars = JSON.parse(vars); } catch {}
      }
      checkValue(vars?.colors);
      checkValue(vars?.colours);
      if (Array.isArray(vars)) {
        vars.forEach((v: any) => {
          checkValue(v?.colour || v?.color);
        });
      }
    }

    if (Array.isArray(prod.images)) {
      prod.images.forEach((img: any) => {
        const tag = img.color_tag || img.color;
        if (tag && typeof tag === 'string' && tag.toLowerCase() !== 'universal' && tag.toLowerCase() !== 'all') {
          colorsSet.add(tag.trim());
        }
      });
    }

    // Fallback if product has no color tag
    if (colorsSet.size === 0) {
      return ['Black', 'Skin', 'Beige', 'Maroon'];
    }

    return Array.from(colorsSet);
  };

  // Robust Sizes Parser
  const getProductSizes = (prod: any): string[] => {
    if (!prod) return [];
    const sizesSet = new Set<string>();

    const checkValue = (val: any) => {
      if (!val) return;
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            parsed.forEach((s) => checkValue(s));
            return;
          }
        } catch {}
        val.split(',').forEach((s) => {
          const clean = s.trim();
          if (clean && clean.toLowerCase() !== 'all') {
            sizesSet.add(clean);
          }
        });
      } else if (Array.isArray(val)) {
        val.forEach((item) => {
          if (typeof item === 'string') checkValue(item);
          else if (item?.size || item?.name) checkValue(item.size || item.name);
        });
      }
    };

    checkValue(prod.size);
    checkValue(prod.sizes);
    checkValue(prod.available_sizes);

    if (prod.variants) {
      let vars = prod.variants;
      if (typeof vars === 'string') {
        try { vars = JSON.parse(vars); } catch {}
      }
      checkValue(vars?.sizes);
      if (Array.isArray(vars)) {
        vars.forEach((v: any) => checkValue(v?.size));
      }
    }

    // Default sizing for bra products if none provided
    if (sizesSet.size === 0) {
      const nameLower = (prod.name || '').toLowerCase();
      if (nameLower.includes('bra')) {
        return ['32B', '34B', '36B', '38B', '40B'];
      }
      return ['Free Size'];
    }

    return Array.from(sizesSet);
  };

  const handleWishlistToggle = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const pid = String(product.id);
    if (isInWishlist(pid)) {
      removeFromWishlist(pid);
    } else {
      const pImage = getProductImage(product.images);
      const colors = getProductColors(product);
      const sizes = getProductSizes(product);
      const price = product.selling_price || product.price || 0;

      addToWishlist({
        id: pid,
        name: product.name,
        price,
        originalPrice: product.mrp || undefined,
        image: pImage,
        color: colors[0] || undefined,
        size: sizes[0] || undefined,
        fabric: product.fabric || undefined,
        department,
      });
    }
  };

  const handleOpenPopModel = (product: Product) => {
    setActiveProduct(product);
    setComboList([]);
    setSingleQty(1);

    let parsedImgs: { url: string; color?: string }[] = [];
    if (Array.isArray(product.images)) {
      parsedImgs = product.images.map((item: any) =>
        typeof item === 'string'
          ? { url: item }
          : { url: item.url || '', color: item.color_tag || item.color || item.colour }
      );
    } else if (typeof product.images === 'string') {
      try {
        const p = JSON.parse(product.images);
        if (Array.isArray(p)) {
          parsedImgs = p.map((item: any) =>
            typeof item === 'string' ? { url: item } : { url: item.url || '', color: item.color_tag || item.color }
          );
        }
      } catch {
        parsedImgs = [{ url: product.images }];
      }
    }

    const fallback = getProductImage(product.images);
    const validImgs = parsedImgs.filter((img) => img.url).length > 0 ? parsedImgs.filter((img) => img.url) : [{ url: fallback }];
    setModalImages(validImgs);
    setSelectedImage(validImgs[0].url);

    const colors = getProductColors(product);
    const sizes = getProductSizes(product);

    setSelectedColor(colors.length > 0 ? colors[0] : 'Black');
    setSelectedSize(sizes.length > 0 ? sizes[0] : '34B');
  };

  const handleColorShadeClick = (colorName: string) => {
    setSelectedColor(colorName);
    const colorLower = colorName.toLowerCase().trim();

    const matched = modalImages.find((img) => img.color && img.color.toLowerCase().trim() === colorLower);
    if (matched) {
      setSelectedImage(matched.url);
      return;
    }

    const urlMatched = modalImages.find((img) => img.url.toLowerCase().includes(colorLower));
    if (urlMatched) {
      setSelectedImage(urlMatched.url);
      return;
    }
  };

  const handleAddVariant = () => {
    const colorVal = selectedColor || 'Standard';
    const sizeVal = selectedSize || 'Standard';
    const variantId = `${sizeVal}-${colorVal}`;

    setComboList((prev) => {
      const existing = prev.find((item) => item.id === variantId);
      if (existing) {
        return prev.map((item) =>
          item.id === variantId ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: variantId,
          color: selectedColor || '',
          size: selectedSize || '',
          fabric: activeProduct?.fabric || undefined,
          qty: 1,
        },
      ];
    });
  };

  const updateComboQty = (id: string, delta: number) => {
    setComboList((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as ComboItem[]
    );
  };

  const removeComboItem = (id: string) => {
    setComboList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleFinalCheckoutAction = (shouldOpenCart: boolean = false) => {
    if (!activeProduct) return;
    const finalPrice = activeProduct.selling_price || activeProduct.price || 0;

    if (comboList.length > 0) {
      const itemsToAdd = comboList.map((item) => ({
        id: `${activeProduct.id}-${item.size || 'std'}-${item.color || 'orig'}`,
        productId: activeProduct.id,
        name: activeProduct.name,
        price: finalPrice,
        mrp: activeProduct.mrp,
        image: selectedImage,
        color: item.color || undefined,
        size: item.size || undefined,
        fabric: item.fabric,
        qty: item.qty,
        department,
      }));
      addToCart(itemsToAdd);
    } else {
      addToCart({
        id: `${activeProduct.id}-${selectedSize || 'std'}-${selectedColor || 'orig'}`,
        productId: activeProduct.id,
        name: activeProduct.name,
        price: finalPrice,
        mrp: activeProduct.mrp,
        image: selectedImage,
        color: selectedColor || undefined,
        size: selectedSize || undefined,
        fabric: activeProduct.fabric,
        qty: singleQty,
        department,
      });
    }

    setActiveProduct(null);
    if (shouldOpenCart) {
      openCart();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomOpen) setIsZoomOpen(false);
        else setActiveProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomOpen]);

  const sortedProducts = [...products].sort((a, b) => {
    const priceA = a.selling_price || a.price || 0;
    const priceB = b.selling_price || b.price || 0;
    if (sortBy === 'price-asc') return priceA - priceB;
    if (sortBy === 'price-desc') return priceB - priceA;
    return 0;
  });

  const handleSubSelect = (subName: string) => {
    searchParams.set('sub', subName);
    setSearchParams(searchParams);
  };

  const activeSellingPrice = activeProduct?.selling_price || activeProduct?.price || 0;
  const activeMrp = activeProduct?.mrp || 0;
  const activeDiscount = activeMrp > activeSellingPrice ? Math.round(((activeMrp - activeSellingPrice) / activeMrp) * 100) : 0;
  
  const modalColorOptions = getProductColors(activeProduct);
  const modalSizeOptions = getProductSizes(activeProduct);
  const hasVariants = modalColorOptions.length > 0 || modalSizeOptions.length > 0;

  const totalComboItems = comboList.reduce((acc, item) => acc + item.qty, 0);
  const totalComboPrice = totalComboItems * activeSellingPrice;

  return (
    <div className={`min-h-screen ${isJewellery ? 'bg-[#fcfdfd]' : 'bg-[#fffafb]'}`}>
      {/* 1. Global Header */}
      <header
        className={`w-full sticky top-0 z-40 backdrop-blur-md transition-all duration-300 border-b bg-white/95 ${
          isJewellery ? 'border-[#0b3b2c]/15 shadow-xs' : 'border-[#ff4d6d]/20 shadow-xs'
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-neutral-100 text-neutral-700 hover:text-neutral-950 transition-colors cursor-pointer"
              title="Go Back"
              aria-label="Go Back"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <Link to={`/?tab=${department}`} className="inline-flex items-center group py-0.5">
              <div
                className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden p-1 transition-all duration-300 shadow-sm border flex items-center justify-center shrink-0 ${
                  isJewellery
                    ? 'bg-[#1c3830] border-[#e5c07b]/40 shadow-[#1c3830]/20'
                    : 'bg-white border-neutral-200 group-hover:border-neutral-400'
                }`}
              >
                <img
                  src={currentLogo}
                  alt={brandAlt}
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <HeaderUserButton isJewellery={isJewellery} />
            <HeaderHeartButton isJewellery={isJewellery} />
            <HeaderBagButton isJewellery={isJewellery} />
          </div>
        </div>
      </header>

      {/* 2. Banner & Arch Submenu */}
      <div
        className={`w-full py-5 sm:py-8 px-4 md:px-8 border-b transition-all duration-300 ${
          isJewellery
            ? 'bg-gradient-to-b from-[#0b3b2c]/10 via-[#0b3b2c]/5 to-transparent border-[#0b3b2c]/15'
            : 'bg-gradient-to-b from-rose-100/50 via-rose-50/30 to-transparent border-rose-200/40'
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Link to={`/?tab=${department}`} className="hover:underline font-medium text-neutral-600">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            <span className="capitalize">{department}</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            <span
              className={`font-semibold capitalize ${
                isJewellery ? 'text-[#0b3b2c]' : 'text-[#ff4d6d]'
              }`}
            >
              {categoryName || '...'}
            </span>
            {selectedSub && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-neutral-900 font-medium">{selectedSub}</span>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span
                className={`text-[11px] font-bold uppercase tracking-[0.25em] flex items-center gap-1.5 ${
                  isJewellery ? 'text-[#b38728]' : 'text-[#ff4d6d]'
                }`}
              >
                {isJewellery && <Sparkles className="w-3.5 h-3.5 text-[#b38728]" />}
                {isJewellery ? 'The Royal Vault' : 'Curated Couture'}
              </span>
              <h1
                className={`text-2xl sm:text-4xl font-serif font-bold mt-1 capitalize ${
                  isJewellery ? 'text-[#0b3b2c]' : 'text-neutral-900'
                }`}
              >
                {selectedSub || categoryName || 'Collection'}
              </h1>
            </div>

            <span className="text-xs text-neutral-500 font-medium">
              {productsLoading ? (
                <span className="inline-block w-20 h-4 bg-neutral-200 animate-pulse rounded-md"></span>
              ) : (
                `Showing ${sortedProducts.length} items`
              )}
            </span>
          </div>

          {/* Sub-category Arch Track */}
          <div className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-2 scrollbar-none scroll-smooth">
            {headerLoading && subCategories.length === 0 ? (
              <>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="w-[74px] h-[98px] rounded-t-[32px] rounded-b-xl bg-white/70 animate-pulse border border-neutral-200/50 shrink-0"
                  />
                ))}
              </>
            ) : (
              subCategories.map((sub) => {
                const isActive = selectedSub?.toLowerCase().trim() === sub.name.toLowerCase().trim();

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSubSelect(sub.name)}
                    className="group shrink-0 flex flex-col items-center w-[74px] sm:w-[82px] text-center cursor-pointer transition-all duration-300 active:scale-95"
                  >
                    <div
                      className={`relative w-full h-[96px] sm:h-[106px] rounded-t-[36px] rounded-b-xl p-0.5 transition-all duration-300 flex flex-col justify-between ${
                        isActive
                          ? isJewellery
                            ? 'bg-gradient-to-b from-[#e5c07b] to-[#0b3b2c] border-2 border-[#b38728] shadow-md scale-105'
                            : 'bg-gradient-to-b from-[#ff4d6d] to-white border-2 border-[#ff4d6d] shadow-md scale-105'
                          : isJewellery
                          ? 'bg-gradient-to-b from-[#f8f5eb] to-white border border-[#e5c07b]/60 shadow-2xs group-hover:border-[#b38728]'
                          : 'bg-gradient-to-b from-[#fff0f3] to-white border border-[#ff4d6d]/25 shadow-2xs group-hover:border-[#ff4d6d]'
                      }`}
                    >
                      <div className="w-full h-full rounded-t-[32px] rounded-b-lg overflow-hidden bg-neutral-100 relative">
                        <img
                          src={
                            sub.image_url ||
                            (isJewellery
                              ? 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&q=80'
                              : 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=80')
                          }
                          alt={sub.name}
                          className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div
                          className={`absolute inset-0 transition-opacity ${
                            isActive
                              ? isJewellery
                                ? 'bg-[#0b3b2c]/30'
                                : 'bg-[#ff4d6d]/25'
                              : 'bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-30'
                          }`}
                        />
                      </div>
                    </div>

                    <span
                      className={`mt-1.5 text-[11px] font-serif font-bold truncate w-full px-0.5 transition-colors ${
                        isActive
                          ? isJewellery
                            ? 'text-[#0b3b2c]'
                            : 'text-[#ff4d6d]'
                          : 'text-neutral-800 group-hover:text-neutral-950'
                      }`}
                    >
                      {sub.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. Toolbar */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between border-b border-neutral-200/60">
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <Filter className="w-3.5 h-3.5" />
          <span>
            Filters Active: <b>{selectedSub || categoryName || 'All'}</b>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent border border-neutral-200 rounded-lg px-2.5 py-1 text-xs text-neutral-700 focus:outline-hidden cursor-pointer"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* 4. Products Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {productsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl overflow-hidden border border-neutral-100 shadow-2xs p-3 space-y-3 animate-pulse"
              >
                <div className="w-full aspect-[3/4] bg-neutral-200/70 rounded-2xl" />
                <div className="space-y-2 pt-1">
                  <div className="w-1/3 h-3 bg-neutral-200/60 rounded-full" />
                  <div className="w-4/5 h-4 bg-neutral-200/80 rounded-full" />
                  <div className="w-1/2 h-4 bg-neutral-200/70 rounded-full pt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <p className="text-neutral-500 text-sm">No products found in this collection.</p>
            <Link
              to={`/?tab=${department}`}
              className={`inline-block text-xs font-bold underline ${
                isJewellery ? 'text-[#0b3b2c]' : 'text-[#ff4d6d]'
              }`}
            >
              Return to Home
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {sortedProducts.map((product) => {
              const currentPrice = product.selling_price || product.price || 0;
              const originalPrice = product.mrp && product.mrp > currentPrice ? product.mrp : null;
              const discountPercent = originalPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
              const imageUrl = getProductImage(product.images);
              const isFav = isInWishlist(String(product.id));

              return (
                <div
                  key={product.id}
                  onClick={() => handleOpenPopModel(product)}
                  className="group relative bg-white rounded-3xl overflow-hidden border border-neutral-200/60 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer animate-in fade-in duration-300"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-108"
                      loading="lazy"
                    />

                    <button
                      type="button"
                      aria-label={isFav ? 'Remove from Wishlist' : 'Add to Wishlist'}
                      onClick={(e) => handleWishlistToggle(e, product)}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-neutral-600 transition-all shadow-md backdrop-blur-md flex items-center justify-center z-10 active:scale-90"
                    >
                      <Heart
                        className={`w-4 h-4 transition-colors ${
                          isFav
                            ? isJewellery
                              ? 'fill-[#0b3b2c] text-[#0b3b2c]'
                              : 'fill-[#ff4d6d] text-[#ff4d6d]'
                            : 'text-neutral-500 hover:text-neutral-900'
                        }`}
                      />
                    </button>

                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                      {discountPercent > 0 && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-xs backdrop-blur-md ${
                            isJewellery
                              ? 'bg-[#0b3b2c] text-[#e5c07b] border border-[#e5c07b]/40'
                              : 'bg-[#ff4d6d] text-white'
                          }`}
                        >
                          {discountPercent}% OFF
                        </span>
                      )}
                      {product.fabric && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-medium bg-black/60 text-white backdrop-blur-xs w-max">
                          {product.fabric}
                        </span>
                      )}
                    </div>

                    <div className="absolute inset-x-0 bottom-0 py-2.5 px-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center gap-1.5 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold uppercase tracking-widest">
                        Quick View
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      {(product.sub_category || product.sub_category_name) && (
                        <span
                          className={`text-[9px] uppercase tracking-[0.2em] font-bold block mb-1 ${
                            isJewellery ? 'text-[#b38728]' : 'text-[#ff4d6d]'
                          }`}
                        >
                          {product.sub_category || product.sub_category_name}
                        </span>
                      )}
                      <h3 className="text-xs sm:text-sm font-serif font-bold text-neutral-900 group-hover:text-neutral-600 line-clamp-2 leading-snug transition-colors">
                        {product.name}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-neutral-100/80 flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`text-sm sm:text-base font-bold ${
                            isJewellery ? 'text-[#0b3b2c]' : 'text-neutral-950'
                          }`}
                        >
                          ₹{currentPrice.toLocaleString('en-IN')}
                        </span>
                        {originalPrice && (
                          <span className="text-[11px] text-neutral-400 line-through">
                            ₹{originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 rounded-full transition-all ${
                          isJewellery
                            ? 'bg-[#f4f7f5] text-[#0b3b2c] group-hover:bg-[#0b3b2c] group-hover:text-[#e5c07b]'
                            : 'bg-[#fff0f3] text-[#ff4d6d] group-hover:bg-[#ff4d6d] group-hover:text-white'
                        }`}
                      >
                        Select
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. QUICK VIEW POP MODEL (FULLY DYNAMIC BASED ON PRODUCT ATTRIBUTES) */}
      {activeProduct && (
        <div
          onClick={() => setActiveProduct(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 cursor-default my-auto animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
          >
            <button
              type="button"
              onClick={() => setActiveProduct(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-100 hover:bg-neutral-900 text-neutral-700 hover:text-white transition-all shadow-xs cursor-pointer z-30"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto p-4 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Image Stack */}
              <div className="md:col-span-6 flex flex-col-reverse sm:flex-row gap-3 items-start">
                {modalImages.length > 1 && (
                  <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto no-scrollbar max-h-[440px]">
                    {modalImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImage(img.url)}
                        className={`w-14 h-18 sm:w-16 sm:h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-neutral-50 flex items-center justify-center ${
                          selectedImage === img.url
                            ? isJewellery
                              ? 'border-[#0b3b2c] ring-2 ring-[#0b3b2c]/20'
                              : 'border-[#ff4d6d] ring-2 ring-[#ff4d6d]/20'
                            : 'border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        <img src={img.url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover object-top" />
                      </button>
                    ))}
                  </div>
                )}

                <div
                  onClick={() => setIsZoomOpen(true)}
                  className="flex-1 w-full relative aspect-[3/4] max-h-[440px] rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-100 group cursor-zoom-in shadow-xs"
                >
                  <img
                    src={selectedImage}
                    alt={activeProduct.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-medium flex items-center gap-1 backdrop-blur-xs opacity-80 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3 h-3" />
                    <span>Click to Zoom</span>
                  </div>
                </div>
              </div>

              {/* Customization Details */}
              <div className="md:col-span-6 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div>
                    {(activeProduct.sub_category || activeProduct.sub_category_name) && (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isJewellery ? 'text-[#b38728]' : 'text-[#ff4d6d]'
                        }`}
                      >
                        {activeProduct.sub_category || activeProduct.sub_category_name}
                      </span>
                    )}
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-neutral-900 mt-0.5 leading-snug">
                      {activeProduct.name}
                    </h2>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2.5 pt-0.5">
                    <span
                      className={`text-xl sm:text-2xl font-bold ${
                        isJewellery ? 'text-[#0b3b2c]' : 'text-neutral-950'
                      }`}
                    >
                      ₹{activeSellingPrice.toLocaleString('en-IN')}
                    </span>
                    {activeMrp > activeSellingPrice && (
                      <>
                        <span className="text-sm text-neutral-400 line-through">
                          ₹{activeMrp.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {activeDiscount}% OFF
                        </span>
                      </>
                    )}
                  </div>

                  <hr className="border-neutral-100" />

                  {/* 1. Color Shade Selection */}
                  {modalColorOptions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-neutral-800 block">
                        Color Shade: <b className="capitalize text-neutral-950">{selectedColor || modalColorOptions[0]}</b>
                      </span>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {modalColorOptions.map((cName) => {
                          const lower = cName.toLowerCase().trim();
                          const hex = COLOR_HEX_MAP[lower] || lower;
                          const isSelected = (selectedColor || modalColorOptions[0]).toLowerCase() === lower;

                          return (
                            <button
                              key={cName}
                              type="button"
                              onClick={() => handleColorShadeClick(cName)}
                              title={cName}
                              className={`relative w-8 h-8 rounded-full transition-all flex items-center justify-center cursor-pointer shadow-2xs ${
                                isSelected
                                  ? isJewellery
                                    ? 'ring-2 ring-offset-2 ring-[#0b3b2c] scale-110'
                                    : 'ring-2 ring-offset-2 ring-[#ff4d6d] scale-110'
                                  : 'hover:scale-105 border border-neutral-300'
                              }`}
                              style={{ backgroundColor: hex }}
                            >
                              {isSelected && (
                                <Check
                                  className={`w-3.5 h-3.5 ${
                                    isLightColor(lower) ? 'text-neutral-900' : 'text-white'
                                  }`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Size Selection */}
                  {modalSizeOptions.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-semibold text-neutral-800 block">
                        Select Size: <b className="text-neutral-950">{selectedSize || modalSizeOptions[0]}</b>
                      </span>

                      <div className="flex flex-wrap gap-2">
                        {modalSizeOptions.map((sz) => {
                          const isSelected = (selectedSize || modalSizeOptions[0]) === sz;
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setSelectedSize(sz)}
                              className={`min-w-11 h-9 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                isSelected
                                  ? isJewellery
                                    ? 'bg-[#0b3b2c] text-[#e5c07b] border-[#0b3b2c] shadow-xs'
                                    : 'bg-[#ff4d6d] text-white border-[#ff4d6d] shadow-xs'
                                  : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-400'
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Quantity Counter */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-semibold text-neutral-800 block">
                      Quantity:
                    </span>
                    <div className="inline-flex items-center border border-neutral-200 rounded-xl p-1 bg-white">
                      <button
                        type="button"
                        onClick={() => setSingleQty((prev) => Math.max(1, prev - 1))}
                        className="w-7 h-7 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-neutral-900">
                        {singleQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSingleQty((prev) => prev + 1)}
                        className="w-7 h-7 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 4. Add Variant Button */}
                  {hasVariants && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleAddVariant}
                        className={`w-full py-2.5 px-4 rounded-xl border-2 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 ${
                          isJewellery
                            ? 'border-[#0b3b2c] text-[#0b3b2c] hover:bg-[#0b3b2c] hover:text-[#e5c07b]'
                            : 'border-[#ff4d6d] text-[#ff4d6d] hover:bg-[#ff4d6d] hover:text-white'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        <span>
                          Add Variant ({selectedSize || '34B'}{selectedColor ? ` • ${selectedColor}` : ''})
                        </span>
                      </button>
                    </div>
                  )}

                  {/* 5. Multi-Variants Combo List */}
                  {comboList.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                        Selected Variants ({comboList.length})
                      </span>

                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 no-scrollbar">
                        {comboList.map((item) => {
                          const hexBg = COLOR_HEX_MAP[item.color.toLowerCase()] || item.color.toLowerCase() || '#f5f5f5';
                          const light = item.color ? isLightColor(item.color) : true;

                          return (
                            <div
                              key={item.id}
                              style={{ backgroundColor: item.color ? hexBg : '#f9fafb' }}
                              className={`flex items-center justify-between pl-2 pr-1 py-1 rounded-full shadow-xs transition-all duration-200 border border-black/10 text-[11px] ${
                                item.color
                                  ? light ? 'text-neutral-900' : 'text-white'
                                  : 'text-neutral-900'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 pr-1 leading-none">
                                {item.size && <span className="font-black text-xs shrink-0">{item.size}</span>}
                                {item.color && (
                                  <span className="font-semibold opacity-90 truncate capitalize text-[10px]">
                                    {item.color}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <div
                                  className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full backdrop-blur-xs ${
                                    light ? 'bg-black/10 text-neutral-900' : 'bg-white/25 text-white'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => updateComboQty(item.id, -1)}
                                    className="p-0.5 hover:scale-115 transition-transform cursor-pointer"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="font-black text-[10px] w-3 text-center">
                                    {item.qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateComboQty(item.id, 1)}
                                    className="p-0.5 hover:scale-115 transition-transform cursor-pointer"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeComboItem(item.id)}
                                  className={`w-4 h-4 rounded-full flex items-center justify-center cursor-pointer ${
                                    light ? 'hover:bg-black/20 text-neutral-800' : 'hover:bg-white/30 text-white'
                                  }`}
                                  title="Remove"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 6. Total Bar */}
                  {totalComboItems > 0 && (
                    <div className="p-3 rounded-xl bg-neutral-900 text-white flex items-center justify-between animate-in fade-in duration-200">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-bold">
                          Total Items
                        </span>
                        <span className="text-xs font-semibold">
                          {totalComboItems} item{totalComboItems > 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-[#e5c07b]">
                          ₹{totalComboPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 7. Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleFinalCheckoutAction(false)}
                      className={`flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border shadow-xs transition-all active:scale-98 cursor-pointer ${
                        isJewellery
                          ? 'border-[#0b3b2c] text-[#0b3b2c] hover:bg-[#0b3b2c]/10'
                          : 'border-[#ff4d6d] text-[#ff4d6d] hover:bg-[#ff4d6d]/10'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{totalComboItems > 0 ? `Add to Cart (${totalComboItems})` : 'Add to Cart'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFinalCheckoutAction(true)}
                      className={`relative flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white shadow-xl transition-all duration-300 active:scale-95 cursor-pointer overflow-hidden group ${
                        isJewellery
                          ? 'bg-gradient-to-r from-[#0b3b2c] via-[#14532d] to-[#0b3b2c] shadow-[#0b3b2c]/40 hover:shadow-emerald-500/50 ring-2 ring-[#e5c07b]/60'
                          : 'bg-gradient-to-r from-[#ff4d6d] via-[#e63956] to-[#ff2a55] shadow-[#ff4d6d]/40 hover:shadow-rose-500/60 ring-2 ring-rose-300/60'
                      }`}
                    >
                      <Zap className="w-4 h-4 fill-current animate-bounce relative z-10 shrink-0" />
                      <span className="relative z-10 tracking-widest font-black drop-shadow-xs">
                        Instant Checkout
                      </span>
                    </button>
                  </div>

                  {/* Trust Badges */}
                  <div className="pt-2 border-t border-neutral-100 grid grid-cols-3 gap-1 text-center text-neutral-500">
                    <div className="flex flex-col items-center gap-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-neutral-700" />
                      <span className="text-[9px]">100% Genuine</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Truck className="w-3.5 h-3.5 text-neutral-700" />
                      <span className="text-[9px]">Fast Dispatch</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <RotateCcw className="w-3.5 h-3.5 text-neutral-700" />
                      <span className="text-[9px]">Easy Returns</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Picture Zoom Lightbox Modal */}
      {isZoomOpen && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/92 backdrop-blur-md p-4 animate-in fade-in duration-200 cursor-zoom-out"
        >
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/20 hover:bg-white text-white hover:text-black transition-colors cursor-pointer z-70"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[88vh] flex flex-col items-center justify-center cursor-default"
          >
            <img
              src={selectedImage}
              alt="Zoomed View"
              className="max-h-[82vh] w-auto object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
            />
            {activeProduct && (
              <p className="text-xs text-neutral-300 mt-2 font-medium">
                {activeProduct.name}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}