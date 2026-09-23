import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Filter,
  ArrowUpDown,
  ChevronRight,
  Heart,
  Share2,
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
  selling_price?: number | null;
  price?: number | null;
  mrp?: number | null;
  images?: any;
  active?: boolean | null;
  fabric?: string | null;
  brand?: string | null;
  description?: string | null;
}

interface SubCategory {
  id: string;
  name: string;
  category_id?: string | null;
  category_name?: string | null;
  image_url?: string | null;
  active?: boolean | null;
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
  
  const [headerLoading, setHeaderLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  // Quick View Modal States
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [inventoryStock, setInventoryStock] = useState<any[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Jewellery Styling Check (only applied if category is Jewellery)
  const isJewellery = (slug || '').toLowerCase().includes('jewel') || searchParams.get('tab') === 'jewellery';
  const currentLogo = isJewellery ? jewelleryLogo : fashionLogo;
  const brandAlt = isJewellery ? 'Kashvi Jewellery' : 'Kashvi Fashions';

  // 1. Fetch Categories and Sub-categories safely without department column
  useEffect(() => {
    let isCurrent = true;

    async function loadMetaAndSubs() {
      setHeaderLoading(true);
      const slugKey = (slug || '').trim();

      try {
        // Query categories using only existing columns
        const { data: catList } = await supabase
          .from('categories')
          .select('id, name, slug')
          .limit(50);

        let activeCatId = '';
        let matchedName = slugKey;

        if (catList && catList.length > 0) {
          const target = slugKey.toLowerCase().replace(/['s]/g, '').trim();
          const matched = catList.find((c: any) => 
            String(c.id).toLowerCase() === target ||
            (c.slug && c.slug.toLowerCase().replace(/['s]/g, '').trim() === target) ||
            (c.name && c.name.toLowerCase().replace(/['s]/g, '').trim() === target)
          );

          if (matched) {
            activeCatId = String(matched.id);
            matchedName = matched.name;
          }
        }

        if (isCurrent) {
          setCategoryName(matchedName);
        }

        // Query sub_categories
        const { data: subData } = await supabase
          .from('sub_categories')
          .select('id, name, category_id, category_name, image_url, active');

        if (isCurrent && subData) {
          const filtered = subData.filter((sub: any) => {
            if (sub.active === false) return false;
            if (activeCatId && String(sub.category_id).trim() === activeCatId) return true;
            if (sub.category_name && matchedName && sub.category_name.toLowerCase().trim() === matchedName.toLowerCase().trim()) return true;
            return !activeCatId;
          });
          setSubCategories(filtered);
        }
      } catch (err) {
        console.error('Error fetching categories/subs:', err);
      } finally {
        if (isCurrent) setHeaderLoading(false);
      }
    }

    loadMetaAndSubs();

    return () => {
      isCurrent = false;
    };
  }, [slug]);

  // 2. Fetch Products
  useEffect(() => {
    let isCurrent = true;

    async function loadProducts() {
      setProductsLoading(true);
      const slugKey = (slug || '').trim().toLowerCase().replace(/['s]/g, '');

      try {
        const { data: prodData, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (isCurrent && prodData) {
          const matched = prodData.filter((p: any) => {
            if (p.active === false) return false;

            // Subcategory filter if present in URL
            if (selectedSub) {
              const sel = selectedSub.toLowerCase().replace(/['s]/g, '').trim();
              const pSub = (p.sub_category || p.sub_category_name || '').toLowerCase().replace(/['s]/g, '').trim();
              const pName = (p.name || '').toLowerCase().replace(/['s]/g, '').trim();
              return pSub.includes(sel) || sel.includes(pSub) || pName.includes(sel);
            }

            // Category matching
            const pCat = (p.category || p.category_name || '').toLowerCase().replace(/['s]/g, '').trim();
            const pName = (p.name || '').toLowerCase().replace(/['s]/g, '').trim();
            return pCat.includes(slugKey) || slugKey.includes(pCat) || pName.includes(slugKey);
          });

          setProducts(matched);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        if (isCurrent) setProducts([]);
      } finally {
        if (isCurrent) setProductsLoading(false);
      }
    }

    loadProducts();

    return () => {
      isCurrent = false;
    };
  }, [slug, selectedSub]);

  // Image Helper
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

  // Open Pop Modal & Fetch Inventory
  const handleOpenPopModel = async (product: Product) => {
    setActiveProduct(product);
    setQuantity(1);

    // Extract images
    let imgs: string[] = [];
    if (Array.isArray(product.images)) {
      imgs = product.images.map((img: any) => (typeof img === 'string' ? img : img?.url || ''));
    } else if (typeof product.images === 'string') {
      try {
        const p = JSON.parse(product.images);
        if (Array.isArray(p)) imgs = p.map((i: any) => (typeof i === 'string' ? i : i?.url || ''));
      } catch {
        imgs = [product.images];
      }
    }
    const finalImgs = imgs.filter(Boolean).length > 0 ? imgs.filter(Boolean) : [getProductImage(product.images)];
    setModalImages(finalImgs);
    setSelectedImage(finalImgs[0]);

    // Fetch Inventory Stock > 0
    try {
      const { data: invData } = await supabase
        .from('inventory')
        .select('*')
        .eq('product_id', product.id)
        .gt('stock_quantity', 0);

      if (invData && invData.length > 0) {
        setInventoryStock(invData);

        const colors = Array.from(new Set(invData.map((item: any) => item.variant_color).filter(Boolean)));
        setAvailableColors(colors);
        if (colors.length > 0) {
          setSelectedColor(colors[0]);
          const sizes = invData.filter((i: any) => i.variant_color === colors[0]).map((i: any) => i.variant_size).filter(Boolean);
          if (sizes.length > 0) setSelectedSize(sizes[0]);
        }
      } else {
        setInventoryStock([]);
        setAvailableColors([]);
        setSelectedColor('');
        setSelectedSize('');
      }
    } catch (err) {
      console.error('Inventory fetch error:', err);
    }
  };

  const availableSizesForSelectedColor = selectedColor
    ? Array.from(
        new Set(
          inventoryStock
            .filter((item: any) => item.variant_color === selectedColor && item.stock_quantity > 0)
            .map((item: any) => item.variant_size)
            .filter(Boolean)
        )
      )
    : [];

  const handleColorClick = (colorName: string) => {
    setSelectedColor(colorName);
    const sizes = inventoryStock
      .filter((item: any) => item.variant_color === colorName && item.stock_quantity > 0)
      .map((item: any) => item.variant_size)
      .filter(Boolean);
    if (sizes.length > 0) setSelectedSize(sizes[0]);
  };

  const handleWishlistToggle = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const pid = String(product.id);
    if (isInWishlist(pid)) {
      removeFromWishlist(pid);
    } else {
      addToWishlist({
        id: pid,
        name: product.name,
        price: product.selling_price || product.price || 0,
        originalPrice: product.mrp || undefined,
        image: getProductImage(product.images),
      });
    }
  };

  const handleShareProduct = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url: shareUrl });
      } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(String(product.id));
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleAddToCart = (instantCheckout: boolean = false) => {
    if (!activeProduct) return;
    addToCart({
      id: `${activeProduct.id}-${selectedSize || 'default'}-${selectedColor || 'default'}`,
      productId: activeProduct.id,
      name: activeProduct.name,
      price: activeProduct.selling_price || activeProduct.price || 0,
      mrp: activeProduct.mrp || undefined,
      image: selectedImage || modalImages[0],
      color: selectedColor || undefined,
      size: selectedSize || undefined,
      fabric: activeProduct.fabric || undefined,
      qty: quantity,
    });

    setActiveProduct(null);
    if (instantCheckout) {
      openCart();
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    const priceA = a.selling_price || a.price || 0;
    const priceB = b.selling_price || b.price || 0;
    if (sortBy === 'price-asc') return priceA - priceB;
    if (sortBy === 'price-desc') return priceB - priceA;
    return 0;
  });

  return (
    <div className={`min-h-screen ${isJewellery ? 'bg-[#030907] text-[#f5ebd7]' : 'bg-[#080d1a] text-white'}`}>
      {/* 1. Global Header */}
      <header
        className={`w-full sticky top-0 z-40 backdrop-blur-md transition-all duration-300 border-b ${
          isJewellery
            ? 'bg-[#04120e]/95 border-[#e5c07b]/20 shadow-md'
            : 'bg-[#060b18]/95 border-[#00f5d4]/20 shadow-md'
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
              title="Go Back"
              aria-label="Go Back"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <Link to="/" className="inline-flex items-center group py-0.5">
              <div
                className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden p-1 transition-all duration-300 shadow-sm border flex items-center justify-center shrink-0 ${
                  isJewellery
                    ? 'bg-[#061e17] border-[#e5c07b]/40 shadow-[#061e17]/40'
                    : 'bg-[#080d1a] border-[#00f5d4]/40 shadow-[#00f5d4]/10'
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

      {/* 2. Sub-Category Track - Center Aligned */}
      <div
        className={`w-full py-4 sm:py-6 px-4 md:px-8 border-b transition-all duration-300 ${
          isJewellery
            ? 'bg-gradient-to-b from-[#0b3b2c]/25 via-transparent to-transparent border-[#e5c07b]/15'
            : 'bg-gradient-to-b from-[#ff3385]/15 via-transparent to-transparent border-[#00f5d4]/15'
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Link to="/" className="hover:underline font-medium text-neutral-300">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
            <span className={`font-semibold capitalize ${isJewellery ? 'text-[#e5c07b]' : 'text-[#00f5d4]'}`}>
              {categoryName || slug || 'Collection'}
            </span>
            {selectedSub && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
                <span className="text-white font-medium">{selectedSub}</span>
              </>
            )}
          </div>

          <div className="flex items-end justify-between">
            <h1 className={`text-2xl sm:text-3xl font-bold capitalize ${isJewellery ? 'font-serif text-[#f5ebd7]' : 'font-sans text-white tracking-tight'}`}>
              {selectedSub || categoryName || 'Collection'}
            </h1>
            <span className="text-xs text-neutral-400 font-mono">
              Showing {sortedProducts.length} items
            </span>
          </div>

          {/* Sub-category Quick Track - Centered */}
          <div className="flex justify-center items-start gap-3 sm:gap-4 overflow-x-auto pb-2 pt-3 px-1 scrollbar-none mx-auto w-full">
            {subCategories.map((sub) => {
              const isActive = selectedSub?.toLowerCase().trim() === sub.name.toLowerCase().trim();
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    searchParams.set('sub', sub.name);
                    setSearchParams(searchParams);
                  }}
                  className="group shrink-0 flex flex-col items-center w-[66px] sm:w-[74px] text-center transition-all cursor-pointer focus:outline-none"
                >
                  <div
                    className={`relative w-full h-[76px] sm:h-[84px] rounded-lg overflow-hidden border transition-all duration-300 ${
                      isActive
                        ? isJewellery
                          ? 'border-[#e5c07b] ring-2 ring-[#e5c07b]/40 scale-105'
                          : 'border-[#00f5d4] ring-2 ring-[#00f5d4]/40 scale-105'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <img
                      src={sub.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=80'}
                      alt={sub.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <span
                    className={`block text-[9px] font-bold mt-1.5 truncate w-full ${
                      isActive
                        ? isJewellery ? 'text-[#e5c07b]' : 'text-[#00f5d4]'
                        : 'text-neutral-300'
                    }`}
                  >
                    {sub.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Toolbar */}
      <div className={`max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between border-b ${isJewellery ? 'border-[#e5c07b]/15' : 'border-white/10'}`}>
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters Active: <b className="text-white">{selectedSub || categoryName || 'All'}</b></span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#0c1427] border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none cursor-pointer"
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
              <div key={idx} className="bg-[#0b1224] rounded-2xl aspect-[3/4] animate-pulse border border-white/5" />
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <p className="text-neutral-400 text-sm">No products found in this collection.</p>
            <Link to="/" className={`inline-block text-xs font-bold underline ${isJewellery ? 'text-[#e5c07b]' : 'text-[#00f5d4]'}`}>
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
              const isCopied = copiedId === String(product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => handleOpenPopModel(product)}
                  className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col cursor-pointer shadow-lg hover:shadow-2xl ${
                    isJewellery
                      ? 'bg-[#061e17]/90 border-[#e5c07b]/25 hover:border-[#e5c07b]'
                      : 'bg-[#0f172a]/90 border-[#1e293b] hover:border-[#00f5d4]'
                  }`}
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-900">
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                      loading="lazy"
                    />

                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                      <button
                        type="button"
                        onClick={(e) => handleShareProduct(e, product)}
                        className={`w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white transition-all flex items-center justify-center border border-white/10 ${
                          isCopied ? 'bg-emerald-600 text-white' : ''
                        }`}
                        title="Share Product"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleWishlistToggle(e, product)}
                        className="w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white transition-all flex items-center justify-center border border-white/10"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            isFav
                              ? isJewellery ? 'fill-[#e5c07b] text-[#e5c07b]' : 'fill-[#ff3385] text-[#ff3385]'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        />
                      </button>
                    </div>

                    {discountPercent > 0 && (
                      <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${isJewellery ? 'bg-[#0b3b2c] text-[#e5c07b]' : 'bg-[#ff3385] text-white'}`}>
                        {discountPercent}% OFF
                      </span>
                    )}

                    <div className="absolute inset-x-0 bottom-0 py-2.5 px-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-center gap-1.5 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Quick View</span>
                    </div>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                    <div>
                      {(product.sub_category || product.sub_category_name) && (
                        <span className={`text-[9px] uppercase tracking-[0.2em] font-mono font-bold block mb-1 ${isJewellery ? 'text-[#e5c07b]' : 'text-[#00f5d4]'}`}>
                          {product.sub_category || product.sub_category_name}
                        </span>
                      )}
                      <h3 className={`text-xs sm:text-sm font-bold line-clamp-2 ${isJewellery ? 'font-serif text-[#f5ebd7]' : 'font-sans text-neutral-200'}`}>
                        {product.name}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-baseline justify-between">
                      <span className={`text-sm sm:text-base font-bold ${isJewellery ? 'text-[#e5c07b]' : 'text-white'}`}>
                        ₹{currentPrice.toLocaleString('en-IN')}
                      </span>
                      <span className={`text-[10px] font-mono font-bold uppercase py-1 px-2.5 rounded-full ${isJewellery ? 'bg-[#0b3b2c] text-[#e5c07b]' : 'bg-white/10 text-[#00f5d4]'}`}>
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

      {/* 5. Quick View Pop Modal (Strict Inventory Stock only) */}
      {activeProduct && (
        <div
          onClick={() => setActiveProduct(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs overflow-y-auto cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border cursor-default my-auto max-h-[92vh] flex flex-col ${
              isJewellery ? 'bg-[#051611] text-[#f5ebd7] border-[#e5c07b]/30' : 'bg-[#0b1329] text-white border-white/15'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveProduct(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-all cursor-pointer z-30"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto p-4 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Modal Image */}
              <div className="md:col-span-6 flex flex-col gap-3">
                <div
                  onClick={() => setIsZoomOpen(true)}
                  className="w-full relative aspect-[3/4] max-h-[440px] rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 cursor-zoom-in"
                >
                  <img src={selectedImage} alt={activeProduct.name} className="w-full h-full object-cover object-top" />
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-medium flex items-center gap-1 backdrop-blur-xs">
                    <Maximize2 className="w-3 h-3" />
                    <span>Zoom</span>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="md:col-span-6 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <h2 className={`text-xl sm:text-2xl font-bold leading-snug ${isJewellery ? 'font-serif text-[#f5ebd7]' : 'font-sans text-white'}`}>
                    {activeProduct.name}
                  </h2>

                  <div className="flex items-baseline gap-2.5">
                    <span className={`text-xl sm:text-2xl font-bold ${isJewellery ? 'text-[#e5c07b]' : 'text-white'}`}>
                      ₹{(activeProduct.selling_price || activeProduct.price || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <hr className="border-white/10" />

                  {/* Strictly In-Stock Colors */}
                  {availableColors.length > 0 && availableColors[0] !== 'Standard' && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-neutral-300 block">
                        Colour: <b className="capitalize text-white">{selectedColor}</b>
                      </span>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {availableColors.map((cName) => {
                          const hex = COLOR_HEX_MAP[cName.toLowerCase().trim()] || cName;
                          const isSelected = selectedColor === cName;
                          return (
                            <button
                              key={cName}
                              type="button"
                              onClick={() => handleColorClick(cName)}
                              className={`relative w-8 h-8 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                                isSelected ? 'ring-2 ring-[#00f5d4] scale-110' : 'border border-white/20'
                              }`}
                              style={{ backgroundColor: hex }}
                            >
                              {isSelected && <Check className={`w-3.5 h-3.5 ${isLightColor(cName) ? 'text-black' : 'text-white'}`} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Strictly In-Stock Sizes */}
                  {availableSizesForSelectedColor.length > 0 && availableSizesForSelectedColor[0] !== 'Free Size' && (
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-semibold text-neutral-300 block">
                        Size: <b className="text-white">{selectedSize}</b>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {availableSizesForSelectedColor.map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setSelectedSize(sz)}
                            className={`min-w-11 h-9 px-3.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              selectedSize === sz
                                ? isJewellery ? 'bg-[#e5c07b] text-black border-[#e5c07b]' : 'bg-[#00f5d4] text-black border-[#00f5d4]'
                                : 'bg-white/5 text-white border-white/20'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity Counter */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-semibold text-neutral-300 block">Quantity:</span>
                    <div className="inline-flex items-center border border-white/20 rounded-xl p-1 bg-white/5">
                      <button
                        type="button"
                        onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-neutral-300 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-white">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((prev) => prev + 1)}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-neutral-300 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Add to Cart & Buy */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(false)}
                      className={`flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border cursor-pointer ${
                        isJewellery ? 'border-[#e5c07b] text-[#e5c07b]' : 'border-[#00f5d4] text-[#00f5d4]'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add to Bag</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(true)}
                      className={`flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer ${
                        isJewellery ? 'bg-[#e5c07b] text-[#061e17]' : 'bg-[#00f5d4] text-[#040814]'
                      }`}
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Buy Now</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Lightbox Zoom */}
      {isZoomOpen && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/92 backdrop-blur-md p-4 cursor-zoom-out"
        >
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/20 text-white cursor-pointer z-70"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={selectedImage} alt="Zoom" className="max-h-[84vh] w-auto object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}