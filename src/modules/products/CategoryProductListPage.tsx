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
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import HeaderBagButton from '../../components/common/HeaderBagButton';
import HeaderUserButton from '../../components/common/HeaderUserButton';
import { useCart } from '../../context/CartContext';

interface Product {
  id: string;
  name: string;
  category: string | null;
  sub_category: string | null;
  colour: string | null;
  size: string | null;
  selling_price: number | null;
  mrp: number | null;
  images: any;
  active: boolean | null;
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
  magenta: '#d63384',
  beige: '#f5e1d5',
  skin: '#e8beac',
  nude: '#d2b48c',
  black: '#1f2937',
  white: '#ffffff',
  red: '#dc2626',
  maroon: '#800000',
  wine: '#722f37',
  navy: '#0f172a',
  blue: '#2563eb',
  green: '#16a34a',
  purple: '#9333ea',
  yellow: '#eab308',
  grey: '#4b5563',
};

const isLightColor = (colorName: string): boolean => {
  const lower = colorName.toLowerCase().trim();
  return ['white', 'beige', 'skin', 'yellow', 'nude'].includes(lower);
};

// మెటాడేటా & క్వెరీ క్యాష్
const categoryMetaCache = new Map<string, { name: string; dept: 'fashions' | 'jewellery'; id: string }>();
const subCategoryCache = new Map<string, SubCategory[]>();

export default function CategoryProductListPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedSub = searchParams.get('sub');

  const { addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categoryName, setCategoryName] = useState<string>('');
  const [department, setDepartment] = useState<'fashions' | 'jewellery'>('fashions');
  
  // వేర్వేరు లోడింగ్ స్టేట్స్ (ఒకదానిపై ఒకటి ఆగకుండా ఉండటానికి)
  const [headerLoading, setHeaderLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  // Pop Model States
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [modalImages, setModalImages] = useState<{ url: string; color?: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [comboList, setComboList] = useState<ComboItem[]>([]);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);

  const isJewellery = department === 'jewellery' || slug?.toLowerCase().includes('jewel');

  // 1. స్వతంత్రంగా కేటగిరీ మరియు సబ్‌-మెనూలను వేగంగా లోడ్ చేయడం
  useEffect(() => {
    let isCurrent = true;

    async function loadMetaAndSubs() {
      const slugKey = slug || '';
      let activeCatId = '';
      let activeCatName = slugKey;
      let currentDept: 'fashions' | 'jewellery' = slugKey.toLowerCase().includes('jewel')
        ? 'jewellery'
        : 'fashions';

      if (categoryMetaCache.has(slugKey)) {
        const cached = categoryMetaCache.get(slugKey)!;
        activeCatId = cached.id;
        activeCatName = cached.name;
        currentDept = cached.dept;
      } else if (slugKey) {
        const { data: catData } = await supabase
          .from('categories')
          .select('id, name, slug, department')
          .eq('id', slugKey)
          .maybeSingle();

        if (catData) {
          activeCatId = catData.id;
          activeCatName = catData.name;
          currentDept = (catData.department || '').toLowerCase() === 'jewellery' ? 'jewellery' : 'fashions';
          categoryMetaCache.set(slugKey, { name: activeCatName, dept: currentDept, id: activeCatId });
        } else {
          const { data: altCat } = await supabase
            .from('categories')
            .select('id, name, slug, department')
            .eq('slug', slugKey)
            .maybeSingle();

          if (altCat) {
            activeCatId = altCat.id;
            activeCatName = altCat.name;
            currentDept = (altCat.department || '').toLowerCase() === 'jewellery' ? 'jewellery' : 'fashions';
            categoryMetaCache.set(slugKey, { name: activeCatName, dept: currentDept, id: activeCatId });
          }
        }
      }

      if (isCurrent) {
        setCategoryName(activeCatName);
        setDepartment(currentDept);
        setHeaderLoading(false);
      }

      // సబ్-కేటగిరీల ఫెచింగ్
      if (subCategoryCache.has(activeCatId)) {
        if (isCurrent) setSubCategories(subCategoryCache.get(activeCatId)!);
      } else {
        const { data } = await supabase
          .from('sub_categories')
          .select('id, name, category_id, category_name')
          .eq('active', true);
        
        const filtered = (data || []).filter((sub) => {
          const mId = activeCatId && String(sub.category_id).trim() === String(activeCatId).trim();
          const mName =
            sub.category_name &&
            activeCatName &&
            sub.category_name.toLowerCase().trim() === activeCatName.toLowerCase().trim();
          return mId || mName;
        });

        if (activeCatId) subCategoryCache.set(activeCatId, filtered);
        if (isCurrent) setSubCategories(filtered);
      }
    }

    loadMetaAndSubs();

    return () => {
      isCurrent = false;
    };
  }, [slug]);

  // 2. ప్రొడక్ట్స్‌ను లోడ్ చేయడం (షెడ్యూల్డ్ యానిమేషన్ కోసం)
  useEffect(() => {
    let isCurrent = true;

    async function loadProductsData() {
      setProductsLoading(true);
      try {
        const slugKey = slug || '';
        const catInfo = categoryMetaCache.get(slugKey);
        const activeCatName = catInfo?.name || slugKey;
        const currentDept = catInfo?.dept || (slugKey.toLowerCase().includes('jewel') ? 'jewellery' : 'fashions');

        let prodQuery = supabase
          .from('products')
          .select('id, name, category, sub_category, colour, size, selling_price, mrp, images, active, fabric, brand, description, variants')
          .eq('active', true);

        if (selectedSub) {
          prodQuery = prodQuery.eq('sub_category', selectedSub);
        } else if (currentDept === 'jewellery') {
          prodQuery = prodQuery.ilike('category', '%jewel%');
        } else if (activeCatName && activeCatName !== slugKey) {
          prodQuery = prodQuery.eq('category', activeCatName);
        }

        const { data: prodData, error: prodError } = await prodQuery;

        if (isCurrent) {
          if (!prodError && prodData && prodData.length > 0) {
            setProducts(prodData);
          } else if (selectedSub) {
            const { data: fallbackData } = await supabase
              .from('products')
              .select('id, name, category, sub_category, colour, size, selling_price, mrp, images, active, fabric, brand, description, variants')
              .eq('active', true)
              .ilike('sub_category', `%${selectedSub}%`);

            setProducts(fallbackData || []);
          } else {
            setProducts([]);
          }
        }
      } catch (err) {
        console.error('Error in product load:', err);
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

  const getProductColors = (prod: Product | null): string[] => {
    if (!prod) return ['Pink', 'Beige', 'Black'];
    if (prod.colour && prod.colour.trim().length > 0) {
      return prod.colour.split(',').map((c) => c.trim()).filter(Boolean);
    }
    if (prod.variants?.colours && Array.isArray(prod.variants.colours)) {
      return prod.variants.colours;
    }
    return ['Pink', 'Beige', 'Black'];
  };

  const getProductSizes = (prod: Product | null): string[] => {
    if (!prod) return ['32B', '34B', '36B', '38B'];
    if (prod.size && prod.size.trim().length > 0) {
      return prod.size.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (prod.variants?.sizes && Array.isArray(prod.variants.sizes)) {
      return prod.variants.sizes;
    }
    return ['32B', '34B', '36B', '38B'];
  };

  const handleOpenPopModel = (product: Product) => {
    setActiveProduct(product);
    setComboList([]);

    let parsedImgs: { url: string; color?: string }[] = [];
    if (Array.isArray(product.images)) {
      parsedImgs = product.images.map((item: any) =>
        typeof item === 'string' ? { url: item } : { url: item.url || '', color: item.color || item.colour }
      );
    } else if (typeof product.images === 'string') {
      try {
        const p = JSON.parse(product.images);
        if (Array.isArray(p)) {
          parsedImgs = p.map((item: any) =>
            typeof item === 'string' ? { url: item } : { url: item.url || '', color: item.color }
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
    setSelectedColor(colors[0] || 'Pink');
    setSelectedSize(sizes[0] || '32B');
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

    const colorIdx = ['pink', 'beige', 'skin', 'black'].indexOf(colorLower);
    if (colorIdx >= 0 && modalImages[colorIdx]) {
      setSelectedImage(modalImages[colorIdx].url);
    }
  };

  const handleAddVariant = () => {
    if (!selectedColor || !selectedSize) return;
    const variantId = `${selectedSize}-${selectedColor}`;

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
          color: selectedColor,
          size: selectedSize,
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

  const handleFinalCheckoutAction = () => {
    if (!activeProduct) return;

    if (comboList.length > 0) {
      const itemsToAdd = comboList.map((item) => ({
        id: `${activeProduct.id}-${item.size}-${item.color}`,
        productId: activeProduct.id,
        name: activeProduct.name,
        price: activeProduct.selling_price || 0,
        mrp: activeProduct.mrp,
        image: selectedImage,
        color: item.color,
        size: item.size,
        fabric: item.fabric,
        qty: item.qty,
        department,
      }));
      addToCart(itemsToAdd);
    } else {
      addToCart({
        id: `${activeProduct.id}-${selectedSize}-${selectedColor}`,
        productId: activeProduct.id,
        name: activeProduct.name,
        price: activeProduct.selling_price || 0,
        mrp: activeProduct.mrp,
        image: selectedImage,
        color: selectedColor,
        size: selectedSize,
        fabric: activeProduct.fabric,
        qty: 1,
        department,
      });
    }

    setActiveProduct(null);
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
    const priceA = a.selling_price || 0;
    const priceB = b.selling_price || 0;
    if (sortBy === 'price-asc') return priceA - priceB;
    if (sortBy === 'price-desc') return priceB - priceA;
    return 0;
  });

  const handleSubSelect = (subName: string) => {
    searchParams.set('sub', subName);
    setSearchParams(searchParams);
  };

  const activeSellingPrice = activeProduct?.selling_price || 0;
  const activeMrp = activeProduct?.mrp || 0;
  const activeDiscount = activeMrp > activeSellingPrice ? Math.round(((activeMrp - activeSellingPrice) / activeMrp) * 100) : 0;
  const modalColorOptions = getProductColors(activeProduct);
  const modalSizeOptions = getProductSizes(activeProduct);

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
        <div className="w-full max-w-7xl mx-auto px-4 py-2.5 md:py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-700 hover:text-neutral-950 transition-colors cursor-pointer"
              title="Go Back"
              aria-label="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <Link to={`/?tab=${department}`} className="flex flex-col">
              <span
                className={`text-xl sm:text-2xl md:text-3xl font-serif font-bold tracking-[0.2em] leading-none ${
                  isJewellery ? 'text-[#0b3b2c]' : 'text-neutral-950'
                }`}
              >
                KASHVI
              </span>
              <span
                className={`text-[8px] sm:text-[9px] uppercase tracking-[0.3em] font-medium mt-0.5 ${
                  isJewellery ? 'text-[#b38728]' : 'text-[#ff4d6d]'
                }`}
              >
                {isJewellery ? 'Royal Vault' : 'Haute Couture'}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <HeaderUserButton isJewellery={isJewellery} />
            <button
              type="button"
              aria-label="Wishlist"
              className={`p-2 rounded-full transition-colors text-neutral-700 ${
                isJewellery ? 'hover:text-[#0b3b2c] hover:bg-[#f4f7f5]' : 'hover:text-[#ff4d6d] hover:bg-[#fff0f3]'
              }`}
            >
              <Heart className="w-5 h-5" />
            </button>
            <HeaderBagButton isJewellery={isJewellery} />
          </div>
        </div>
      </header>

      {/* 2. Breadcrumbs & Category Title Banner */}
      <div
        className={`w-full py-6 sm:py-10 px-4 md:px-8 border-b transition-all duration-300 ${
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

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
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

          {/* Sub-category Filter Pills (Relaxing Placeholder Shimmer) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 min-h-[38px]">
            {headerLoading && subCategories.length === 0 ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-24 bg-white/70 rounded-full animate-pulse border border-neutral-200/50 shrink-0"
                  />
                ))}
              </>
            ) : (
              subCategories.map((sub) => {
                const isActive = selectedSub === sub.name;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSubSelect(sub.name)}
                    className={`text-xs px-4 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? isJewellery
                          ? 'bg-[#0b3b2c] text-[#e5c07b] shadow-sm'
                          : 'bg-[#ff4d6d] text-white shadow-sm'
                        : 'bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    {sub.name}
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

      {/* 4. Products Grid with 1-by-1 Staggered Animation & Shimmer */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {productsLoading ? (
          /* Shimmer Placeholders (కస్టమర్‌కు లోడింగ్ టైమ్ అనిపించకుండా ప్రీమియంగా కనిపించే కార్డ్స్) */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-2xs p-3 space-y-3 animate-pulse"
              >
                <div className="w-full aspect-[3/4] bg-neutral-200/70 rounded-xl" />
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
          /* ఒక్కొక్క ప్రొడక్ట్ కార్డ్ వరుసగా తేలుతూ వచ్చే 1-by-1 Staggered Entrance Animation */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {sortedProducts.map((product, index) => {
              const currentPrice = product.selling_price || 0;
              const originalPrice = product.mrp && product.mrp > currentPrice ? product.mrp : null;
              const imageUrl = getProductImage(product.images);

              // ప్రతి కార్డ్‌కు 50ms ఆలస్యంతో ఒక్కొక్కటిగా లోడ్ అయ్యే యానిమేషన్ స్టైల్
              const staggerDelay = `${Math.min(index * 60, 600)}ms`;

              return (
                <div
                  key={product.id}
                  onClick={() => handleOpenPopModel(product)}
                  style={{
                    animationDelay: staggerDelay,
                    animationFillMode: 'both',
                  }}
                  className="group relative bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
                >
                  <div className="relative aspect-3/4 overflow-hidden bg-neutral-100">
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/80 hover:bg-white text-neutral-600 hover:text-rose-500 transition-colors shadow-2xs backdrop-blur-xs cursor-pointer z-10"
                    >
                      <Heart className="w-4 h-4" />
                    </button>

                    {originalPrice && (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 text-white tracking-wider">
                        SALE
                      </span>
                    )}

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider">Quick View</span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      {product.sub_category && (
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                          {product.sub_category}
                        </span>
                      )}
                      <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 group-hover:text-neutral-600 line-clamp-2 mt-0.5">
                        {product.name}
                      </h3>
                      {product.fabric && (
                        <span className="text-[11px] text-neutral-500 block mt-0.5">
                          Fabric: {product.fabric}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2 pt-1 border-t border-neutral-100">
                      <span
                        className={`text-sm sm:text-base font-bold ${
                          isJewellery ? 'text-[#0b3b2c]' : 'text-neutral-900'
                        }`}
                      >
                        ₹{currentPrice.toLocaleString('en-IN')}
                      </span>
                      {originalPrice && (
                        <span className="text-xs text-neutral-400 line-through">
                          ₹{originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. QUICK VIEW POP MODEL */}
      {activeProduct && (
        <div
          onClick={() => setActiveProduct(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 cursor-default my-auto animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveProduct(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-100 hover:bg-neutral-900 text-neutral-700 hover:text-white transition-all shadow-xs cursor-pointer z-30"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto p-4 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Fixed Aspect Ratio Image with Thumbnails */}
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

                {/* Main Image Container */}
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

              {/* Right Column: Information & Selection Flow */}
              <div className="md:col-span-6 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div>
                    {activeProduct.sub_category && (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isJewellery ? 'text-[#b38728]' : 'text-[#ff4d6d]'
                        }`}
                      >
                        {activeProduct.sub_category}
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
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-neutral-800 block">
                      Color Shade: <b className="capitalize text-neutral-950">{selectedColor}</b>
                    </span>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {modalColorOptions.map((cName) => {
                        const lower = cName.toLowerCase().trim();
                        const hex = COLOR_HEX_MAP[lower] || lower;
                        const isSelected = selectedColor.toLowerCase() === lower;

                        return (
                          <button
                            key={cName}
                            type="button"
                            onClick={() => handleColorShadeClick(cName)}
                            title={cName}
                            className={`relative w-8 h-8 rounded-full transition-all flex items-center justify-center cursor-pointer shadow-2xs ${
                              isSelected
                                ? 'ring-2 ring-offset-2 ring-neutral-900 scale-110'
                                : 'hover:scale-105 border border-neutral-300'
                            }`}
                            style={{ backgroundColor: hex }}
                          >
                            {isSelected && (
                              <Check
                                className={`w-3.5 h-3.5 ${
                                  ['white', 'beige', 'yellow', 'skin'].includes(lower)
                                    ? 'text-neutral-900'
                                    : 'text-white'
                                }`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Size Selection */}
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-semibold text-neutral-800 block">
                      Select Size: <b className="text-neutral-950">{selectedSize}</b>
                    </span>

                    <div className="flex flex-wrap gap-2">
                      {modalSizeOptions.map((sz) => {
                        const isSelected = selectedSize === sz;
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setSelectedSize(sz)}
                            className={`min-w-11 h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
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

                  {/* 3. "Add Variant" Button */}
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
                      <span>Add Variant ({selectedSize} • {selectedColor})</span>
                    </button>
                  </div>

                  {/* 4. Side-by-Side Compact Mini Capsules Grid */}
                  {comboList.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                        Selected Variants ({comboList.length})
                      </span>

                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 no-scrollbar">
                        {comboList.map((item) => {
                          const hexBg = COLOR_HEX_MAP[item.color.toLowerCase()] || item.color.toLowerCase();
                          const light = isLightColor(item.color);

                          return (
                            <div
                              key={item.id}
                              style={{ backgroundColor: hexBg }}
                              className={`flex items-center justify-between pl-2 pr-1 py-1 rounded-full shadow-xs transition-all duration-200 border border-black/10 text-[11px] ${
                                light ? 'text-neutral-900' : 'text-white'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 pr-1 leading-none">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    light ? 'bg-neutral-900/60' : 'bg-white/80'
                                  } shrink-0`}
                                />
                                <span className="font-black text-xs shrink-0">{item.size}</span>
                                <span className="font-semibold opacity-90 truncate capitalize text-[10px]">
                                  {item.color}
                                </span>
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
                                    aria-label="Decrease quantity"
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
                                    aria-label="Increase quantity"
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

                  {/* 5. Total Bar */}
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

                  {/* 6. Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleFinalCheckoutAction}
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
                      onClick={handleFinalCheckoutAction}
                      className={`relative flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white shadow-xl transition-all duration-300 active:scale-95 cursor-pointer overflow-hidden group ${
                        isJewellery
                          ? 'bg-gradient-to-r from-[#0b3b2c] via-[#14532d] to-[#0b3b2c] shadow-[#0b3b2c]/40 hover:shadow-emerald-500/50 ring-2 ring-[#e5c07b]/60'
                          : 'bg-gradient-to-r from-[#ff4d6d] via-[#e63956] to-[#ff2a55] shadow-[#ff4d6d]/40 hover:shadow-rose-500/60 ring-2 ring-rose-300/60'
                      }`}
                    >
                      <span
                        className={`absolute inset-0 rounded-2xl animate-pulse opacity-75 blur-xs ${
                          isJewellery
                            ? 'bg-gradient-to-r from-[#e5c07b]/20 to-emerald-400/30'
                            : 'bg-gradient-to-r from-white/20 to-rose-300/30'
                        }`}
                      />

                      <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                      <Zap className="w-4 h-4 fill-current animate-bounce relative z-10 shrink-0" />
                      <span className="relative z-10 tracking-widest font-black drop-shadow-xs">
                        Instant Checkout
                      </span>
                    </button>
                  </div>

                  {/* Badges */}
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
                {activeProduct.name} — {selectedColor || 'Original'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}