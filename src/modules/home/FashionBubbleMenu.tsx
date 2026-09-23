import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  ShoppingBag,
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Maximize2,
  X,
  Plus,
  Minus,
  Check,
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
  category: string | null;
  sub_category: string | null;
  brand: string | null;
  sub_brand: string | null;
  selling_price: number | null;
  mrp: number | null;
  images: any;
  active: boolean | null;
  fabric: string | null;
  description: string | null;
  features: string | null;
  stock_quantity: number | null;
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

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { addToCart, openCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [imageList, setImageList] = useState<{ url: string; color?: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  
  // Strictly Inventory-based Stock States
  const [inventoryStock, setInventoryStock] = useState<any[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');

  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const isJewellery =
    product?.category?.toLowerCase().includes('jewel') ||
    product?.sub_category?.toLowerCase().includes('jewel');

  const currentLogo = isJewellery ? jewelleryLogo : fashionLogo;
  const brandAlt = isJewellery ? 'Kashvi Jewellery' : 'Kashvi Fashions';

  useEffect(() => {
    async function fetchProductAndInventory() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProduct(data);

          // Fetch Inventory Stock where stock_quantity > 0 strictly for this product
          const { data: invData, error: invError } = await supabase
            .from('inventory')
            .select('*')
            .eq('product_id', data.id)
            .gt('stock_quantity', 0);

          if (!invError && invData) {
            setInventoryStock(invData);

            // Extract ONLY colors that have inventory stock > 0
            const colors = Array.from(
              new Set(
                invData
                  .map((item: any) => item.variant_color)
                  .filter((c: string) => c && c.toLowerCase() !== 'standard')
              )
            );

            // Fallback to 'Standard' if no specific color variants exist
            const finalColors = colors.length > 0 ? colors : Array.from(new Set(invData.map((item: any) => item.variant_color).filter(Boolean)));
            setAvailableColors(finalColors);

            if (finalColors.length > 0) {
              const firstColor = finalColors[0];
              setSelectedColor(firstColor);

              // Get sizes strictly available for this first color
              const sizesForFirstColor = invData
                .filter((item: any) => item.variant_color === firstColor)
                .map((item: any) => item.variant_size)
                .filter(Boolean);

              if (sizesForFirstColor.length > 0) {
                setSelectedSize(sizesForFirstColor[0]);
              }
            }
          }

          // Images Parsing
          let parsedImgs: { url: string; color?: string }[] = [];
          if (Array.isArray(data.images)) {
            parsedImgs = data.images.map((img: any) =>
              typeof img === 'string'
                ? { url: img }
                : { url: img?.url || '', color: img?.color_tag || img?.color || img?.colour }
            );
          } else if (typeof data.images === 'string') {
            try {
              const parsed = JSON.parse(data.images);
              if (Array.isArray(parsed)) {
                parsedImgs = parsed.map((img: any) =>
                  typeof img === 'string' ? { url: img } : { url: img?.url || '', color: img?.color_tag || img?.color }
                );
              }
            } catch {
              parsedImgs = [{ url: data.images }];
            }
          }

          const fallback = isJewellery
            ? 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80'
            : 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80';

          const validImgs = parsedImgs.filter((img) => img.url).length > 0 ? parsedImgs.filter((img) => img.url) : [{ url: fallback }];
          setImageList(validImgs);
          setSelectedImage(validImgs[0].url);
        }
      } catch (err) {
        console.error('Error fetching product and inventory details:', err);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchProductAndInventory();
  }, [id]);

  // Dynamically filter sizes based strictly on the selected color's inventory stock > 0
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

  // Handle color click
  const handleColorClick = (colorName: string) => {
    setSelectedColor(colorName);
    
    // Automatically set size to the first available size for this selected color
    const sizes = inventoryStock
      .filter((item: any) => item.variant_color === colorName && item.stock_quantity > 0)
      .map((item: any) => item.variant_size)
      .filter(Boolean);
    
    if (sizes.length > 0) {
      setSelectedSize(sizes[0]);
    }

    // Switch image if matching color tag exists
    const lowerColor = colorName.toLowerCase().trim();
    const matchedImg = imageList.find((img) => img.color && img.color.toLowerCase().trim() === lowerColor);
    if (matchedImg) {
      setSelectedImage(matchedImg.url);
    } else {
      const urlMatch = imageList.find((img) => img.url.toLowerCase().includes(lowerColor));
      if (urlMatch) {
        setSelectedImage(urlMatch.url);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZoomOpen) {
        setIsZoomOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomOpen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080d1a]">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[#00f5d4] shadow-[0_0_12px_#00f5d4]"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#080d1a] px-4 text-center text-white">
        <h2 className="text-xl font-bold">Product Not Found</h2>
        <p className="text-sm text-neutral-400 mt-1">The item you are looking for is no longer available.</p>
        <Link
          to="/"
          className="mt-4 px-6 py-2.5 rounded-full bg-[#00f5d4] text-[#040814] text-xs font-bold hover:bg-white transition-all shadow-md"
        >
          Back to Shopping
        </Link>
      </div>
    );
  }

  const pid = String(product.id);
  const isFav = isInWishlist(pid);
  const sellingPrice = product.selling_price || 0;
  const mrp = product.mrp || 0;
  const discountPercent = mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;

  const handleWishlistToggle = () => {
    if (isFav) {
      removeFromWishlist(pid);
    } else {
      addToWishlist({
        id: pid,
        name: product.name,
        price: sellingPrice,
        originalPrice: mrp || undefined,
        image: selectedImage || imageList[0]?.url,
        color: selectedColor || undefined,
        size: selectedSize || undefined,
        fabric: product.fabric || undefined,
        department: isJewellery ? 'jewellery' : 'fashions',
      });
    }
  };

  const handleAddToCart = (instantCheckout: boolean = false) => {
    addToCart({
      id: `${product.id}-${selectedSize || 'default'}-${selectedColor || 'default'}`,
      productId: product.id,
      name: product.name,
      price: sellingPrice,
      mrp: mrp || undefined,
      image: selectedImage || imageList[0]?.url,
      color: selectedColor || undefined,
      size: selectedSize || undefined,
      fabric: product.fabric || undefined,
      qty: quantity,
      department: isJewellery ? 'jewellery' : 'fashions',
    });

    if (instantCheckout) {
      openCart();
    }
  };

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
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isJewellery
                  ? 'hover:bg-[#0b3b2c] text-[#e5c07b]'
                  : 'hover:bg-white/10 text-white'
              }`}
              title="Go Back"
              aria-label="Go Back"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <Link to={`/?tab=${isJewellery ? 'jewellery' : 'fashions'}`} className="inline-flex items-center group py-0.5">
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

      {/* 2. Breadcrumbs Navigation */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 text-xs text-neutral-400 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <Link to={`/?tab=${isJewellery ? 'jewellery' : 'fashions'}`} className="hover:underline shrink-0 text-neutral-300">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
        <Link
          to={`/category/${isJewellery ? 'jewellery' : 'fashions'}`}
          className="capitalize hover:underline shrink-0 text-neutral-300"
        >
          {isJewellery ? 'Royal Vault' : 'Haute Couture'}
        </Link>
        {product.sub_category && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
            <Link
              to={`/category/${isJewellery ? 'jewellery' : 'fashions'}?sub=${encodeURIComponent(product.sub_category)}`}
              className="capitalize hover:underline shrink-0 text-neutral-300"
            >
              {product.sub_category}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
        <span className="text-white font-medium truncate">{product.name}</span>
      </div>

      {/* 3. Main Product Showcase */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-4 pb-28 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left: Image Gallery */}
          <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
            {/* Thumbnails */}
            {imageList.length > 1 && (
              <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto no-scrollbar max-h-[520px] shrink-0">
                {imageList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img.url)}
                    className={`w-16 h-20 sm:w-20 sm:h-24 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-neutral-900 ${
                      selectedImage === img.url
                        ? isJewellery
                          ? 'border-[#e5c07b] ring-2 ring-[#e5c07b]/30'
                          : 'border-[#00f5d4] ring-2 ring-[#00f5d4]/30'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <img src={img.url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover object-top" />
                  </button>
                ))}
              </div>
            )}

            {/* Featured Image with Zoom Trigger */}
            <div className="flex-1 relative aspect-[3/4] rounded-3xl overflow-hidden bg-neutral-900 border border-white/10 shadow-md group">
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
              />

              {/* Floating Wishlist Button */}
              <button
                type="button"
                onClick={handleWishlistToggle}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black text-white shadow-md backdrop-blur-md flex items-center justify-center transition-all active:scale-90 cursor-pointer z-10 border border-white/10"
                aria-label={isFav ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    isFav
                      ? isJewellery
                        ? 'fill-[#e5c07b] text-[#e5c07b]'
                        : 'fill-[#ff3385] text-[#ff3385]'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                />
              </button>

              {/* Click to Zoom Pill */}
              <button
                type="button"
                onClick={() => setIsZoomOpen(true)}
                className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-md shadow-md transition-all cursor-pointer border border-white/10"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Zoom</span>
              </button>
            </div>
          </div>

          {/* Right: Specifications & Purchases */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Collection / Sub-Category Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-[0.25em] px-3 py-1 rounded-full ${
                    isJewellery
                      ? 'text-[#e5c07b] bg-[#0b3b2c] border border-[#e5c07b]/30'
                      : 'text-[#ff3385] bg-[#ff3385]/10 border border-[#ff3385]/30'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  {product.sub_category || (isJewellery ? 'Imperial Vault' : 'Haute Couture')}
                </span>

                {product.brand && (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-neutral-200 border border-white/10">
                    {product.brand}
                  </span>
                )}
              </div>

              {/* Product Title */}
              <h1
                className={`text-2xl sm:text-3xl font-bold leading-snug ${
                  isJewellery ? 'font-serif text-[#f5ebd7]' : 'font-sans text-white'
                }`}
              >
                {product.name}
              </h1>

              {/* Pricing Display */}
              <div className="flex items-baseline gap-3 pt-1">
                <span
                  className={`text-2xl sm:text-3xl font-bold ${
                    isJewellery ? 'text-[#e5c07b]' : 'text-white'
                  }`}
                >
                  ₹{sellingPrice.toLocaleString('en-IN')}
                </span>
                {mrp > sellingPrice && (
                  <>
                    <span className="text-base text-neutral-400 line-through">
                      ₹{mrp.toLocaleString('en-IN')}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        isJewellery
                          ? 'text-[#e5c07b] bg-[#0b3b2c] border border-[#e5c07b]/30'
                          : 'text-[#00f5d4] bg-[#00f5d4]/10 border border-[#00f5d4]/30'
                      }`}
                    >
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">Price includes all applicable taxes & insured shipping.</p>

              <hr className="border-white/10" />

              {/* Fabric Details */}
              {product.fabric && (
                <div
                  className={`p-3.5 rounded-2xl border shadow-2xs w-max ${
                    isJewellery ? 'bg-[#061e17]/90 border-[#e5c07b]/25' : 'bg-[#0f172a]/90 border-[#1e293b]'
                  }`}
                >
                  <span className="text-neutral-400 block text-[10px] uppercase font-mono font-bold tracking-wider">
                    Fabric
                  </span>
                  <span className="font-semibold text-neutral-200 mt-0.5 block">{product.fabric}</span>
                </div>
              )}

              {/* 1. Strictly In-Stock Color Options from Inventory */}
              {availableColors.length > 0 && availableColors[0] !== 'Standard' && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-neutral-300 block">
                    Available Colour: <b className="capitalize text-white">{selectedColor || availableColors[0]}</b>
                  </span>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {availableColors.map((cName) => {
                      const lower = cName.toLowerCase().trim();
                      const hex = COLOR_HEX_MAP[lower] || lower;
                      const isSelected = (selectedColor || availableColors[0]).toLowerCase() === lower;

                      return (
                        <button
                          key={cName}
                          type="button"
                          onClick={() => handleColorClick(cName)}
                          title={cName}
                          className={`relative w-8 h-8 rounded-full transition-all flex items-center justify-center cursor-pointer shadow-2xs ${
                            isSelected
                              ? isJewellery
                                ? 'ring-2 ring-offset-2 ring-offset-[#030907] ring-[#e5c07b] scale-110'
                                : 'ring-2 ring-offset-2 ring-offset-[#080d1a] ring-[#00f5d4] scale-110'
                              : 'hover:scale-105 border border-white/20'
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

              {/* 2. Strictly In-Stock Sizes for Selected Color from Inventory */}
              {availableSizesForSelectedColor.length > 0 && availableSizesForSelectedColor[0] !== 'Free Size' && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-neutral-300 block">
                    Available Size: <b className="text-white">{selectedSize || availableSizesForSelectedColor[0]}</b>
                  </span>

                  <div className="flex flex-wrap gap-2">
                    {availableSizesForSelectedColor.map((sz) => {
                      const isSelected = (selectedSize || availableSizesForSelectedColor[0]) === sz;
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`min-w-11 h-9 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? isJewellery
                                ? 'bg-[#e5c07b] text-[#061e17] border-[#e5c07b] shadow-xs'
                                : 'bg-[#00f5d4] text-[#040814] border-[#00f5d4] shadow-xs'
                              : 'bg-white/5 text-neutral-200 border-white/20 hover:border-white/40'
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="space-y-2 pt-1">
                <span className="font-bold text-neutral-300 uppercase tracking-wider text-[11px] block">
                  Quantity
                </span>
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center border border-white/20 rounded-xl p-1 bg-white/5">
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-neutral-300 transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center text-xs font-bold text-white">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => prev + 1)}
                      className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-neutral-300 transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Desktop) */}
              <div className="hidden md:flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => handleAddToCart(false)}
                  className={`flex-1 py-4 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border shadow-xs transition-all active:scale-98 cursor-pointer ${
                    isJewellery
                      ? 'border-[#e5c07b] text-[#e5c07b] hover:bg-[#e5c07b]/10'
                      : 'border-[#00f5d4] text-[#00f5d4] hover:bg-[#00f5d4]/10'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Bag</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddToCart(true)}
                  className={`relative flex-1 py-4 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-[#061e17] shadow-xl transition-all duration-300 active:scale-95 cursor-pointer overflow-hidden group ${
                    isJewellery
                      ? 'bg-gradient-to-r from-[#e5c07b] via-[#f7e7b4] to-[#b38728] shadow-[#e5c07b]/30 hover:brightness-110'
                      : 'bg-[#00f5d4] text-[#040814] shadow-[#00f5d4]/30 hover:bg-white'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current animate-bounce relative z-10 shrink-0" />
                  <span className="relative z-10 tracking-widest font-black drop-shadow-xs">
                    Instant Buy
                  </span>
                </button>
              </div>

              {/* Trust Assurances */}
              <div className="pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-neutral-400">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-neutral-300" />
                  <span className="text-[10px] font-medium">100% Genuine</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Truck className="w-4 h-4 text-neutral-300" />
                  <span className="text-[10px] font-medium">Fast Dispatch</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <RotateCcw className="w-4 h-4 text-neutral-300" />
                  <span className="text-[10px] font-medium">Easy Returns</span>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="pt-4 text-xs text-neutral-300 space-y-1.5">
                  <h4 className="font-bold text-white uppercase text-[10px] font-mono tracking-wider">
                    Product Description
                  </h4>
                  <p className="leading-relaxed whitespace-pre-line text-neutral-300">{product.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 4. Mobile Sticky Bottom Action Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-[#060b18]/95 backdrop-blur-md border-t border-white/10 px-4 py-3 z-40 flex items-center gap-3 shadow-lg">
        <button
          type="button"
          onClick={() => handleAddToCart(false)}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border active:scale-95 cursor-pointer ${
            isJewellery
              ? 'border-[#e5c07b] text-[#e5c07b]'
              : 'border-[#00f5d4] text-[#00f5d4]'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Add to Bag</span>
        </button>

        <button
          type="button"
          onClick={() => handleAddToCart(true)}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 text-[#040814] shadow-md active:scale-95 cursor-pointer ${
            isJewellery
              ? 'bg-[#e5c07b] text-[#061e17]'
              : 'bg-[#00f5d4] text-[#040814]'
          }`}
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>Buy Now</span>
        </button>
      </div>

      {/* 5. Fullscreen Zoom Lightbox Modal */}
      {isZoomOpen && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md p-4 animate-in fade-in duration-200 cursor-zoom-out"
        >
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/20 hover:bg-white text-white hover:text-black transition-colors cursor-pointer z-60"
            aria-label="Close Preview"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[88vh] flex flex-col items-center justify-center cursor-default"
          >
            <img
              src={selectedImage}
              alt={product.name}
              className="max-h-[84vh] w-auto object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
            />
            <p className="text-xs text-neutral-300 mt-2 font-medium">
              {product.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}