import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  Share2,
  ChevronRight,
  Maximize2,
  Check,
  ShoppingBag,
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  Plus,
  Minus,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import HeaderBagButton from '../../components/common/HeaderBagButton';
import HeaderUserButton from '../../components/common/HeaderUserButton';
import HeaderHeartButton from '../../components/common/HeaderHeartButton';
import CringeLoader from '../../components/common/CringeLoader';
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
}

interface InventoryItem {
  id: string;
  product_id: string;
  variant_color: string;
  variant_size: string;
  stock_quantity: number;
}

interface ComboItem {
  id: string;
  color: string;
  size: string;
  fabric?: string;
  qty: number;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { addToCart, openCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbColoursMap, setDbColoursMap] = useState<Record<string, string>>({});

  // Gallery & Inventory States
  const [images, setImages] = useState<{ url: string; color?: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [modalStock, setModalStock] = useState<InventoryItem[]>([]);
  const [stockColors, setStockColors] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [singleQty, setSingleQty] = useState<number>(1);
  const [comboList, setComboList] = useState<ComboItem[]>([]);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // 1. Fetch Colours Table for Dynamic Hex Codes
  useEffect(() => {
    async function fetchColours() {
      try {
        const { data, error } = await supabase
          .from('colours')
          .select('name, hex_code')
          .eq('active', true);

        if (!error && data) {
          const map: Record<string, string> = {};
          data.forEach((item: any) => {
            if (item.name && item.hex_code) {
              map[item.name.toLowerCase().trim()] = item.hex_code.trim();
            }
          });
          setDbColoursMap(map);
        }
      } catch (err) {
        console.error('Error fetching colours:', err);
      }
    }
    fetchColours();
  }, []);

  const resolveColorHex = (colorName: string): string => {
    if (!colorName) return '#475569';
    const clean = colorName.toLowerCase().trim();

    if (dbColoursMap[clean]) return dbColoursMap[clean];

    for (const [name, hex] of Object.entries(dbColoursMap)) {
      if (clean.includes(name) || name.includes(clean)) {
        return hex;
      }
    }

    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  const isLightColor = (colorName: string): boolean => {
    const hex = resolveColorHex(colorName).replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 155;
    }
    return false;
  };

  // 2. Fetch Product & Inventory
  useEffect(() => {
    let isCurrent = true;

    async function loadProductData() {
      if (!id) return;
      setLoading(true);
      try {
        const { data: prodData, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (isCurrent && prodData) {
          setProduct(prodData);

          // Parse Product Images
          let parsedImgs: { url: string; color?: string }[] = [];
          if (Array.isArray(prodData.images)) {
            parsedImgs = prodData.images.map((item: any) =>
              typeof item === 'string'
                ? { url: item }
                : { url: item.url || '', color: item.color_tag || item.color || item.colour }
            );
          } else if (typeof prodData.images === 'string') {
            try {
              const p = JSON.parse(prodData.images);
              if (Array.isArray(p)) {
                parsedImgs = p.map((item: any) =>
                  typeof item === 'string' ? { url: item } : { url: item.url || '', color: item.color_tag || item.color }
                );
              }
            } catch {
              parsedImgs = [{ url: prodData.images }];
            }
          }

          const fallback = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80';
          const validImgs = parsedImgs.filter((img) => img.url).length > 0 ? parsedImgs.filter((img) => img.url) : [{ url: fallback }];
          setImages(validImgs);
          setSelectedImage(validImgs[0].url);

          // Fetch Inventory Data
          const { data: invData } = await supabase
            .from('inventory')
            .select('*')
            .eq('product_id', id);

          const inStockItems = (invData || []).filter((item: any) => Number(item.stock_quantity) > 0);

          if (inStockItems.length > 0) {
            setModalStock(inStockItems);
            const uniqueColors = Array.from(
              new Set(inStockItems.map((item: any) => (item.variant_color || '').trim()).filter(Boolean))
            );
            setStockColors(uniqueColors);

            if (uniqueColors.length > 0) {
              const firstColor = uniqueColors[0];
              setSelectedColor(firstColor);

              const sizesForFirst = Array.from(
                new Set(
                  inStockItems
                    .filter((item: any) => (item.variant_color || '').trim().toLowerCase() === firstColor.toLowerCase())
                    .map((item: any) => (item.variant_size || '').trim())
                    .filter(Boolean)
                )
              );
              setSelectedSize(sizesForFirst.length > 0 ? sizesForFirst[0] : '');
            }
          } else {
            const prodColors = (prodData.colour || prodData.colors || '')
              .split(',')
              .map((c: string) => c.trim())
              .filter(Boolean);
            const prodSizes = (prodData.size || prodData.sizes || prodData.available_sizes || '')
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean);

            const finalColors = prodColors.length > 0 ? prodColors : ['Standard'];
            const finalSizes = prodSizes.length > 0 ? prodSizes : ['Free Size'];

            const simulatedStock: InventoryItem[] = [];
            finalColors.forEach((c: string) => {
              finalSizes.forEach((s: string) => {
                simulatedStock.push({
                  id: `${prodData.id}-${c}-${s}`,
                  product_id: prodData.id,
                  variant_color: c,
                  variant_size: s,
                  stock_quantity: 10,
                });
              });
            });

            setModalStock(simulatedStock);
            setStockColors(finalColors);
            setSelectedColor(finalColors[0]);
            setSelectedSize(finalSizes[0]);
          }
        }
      } catch (err) {
        console.error('Error loading product details:', err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    loadProductData();

    return () => {
      isCurrent = false;
    };
  }, [id]);

  const isJewellery =
    product?.department === 'jewellery' ||
    (product?.category || '').toLowerCase().includes('jewel') ||
    (product?.category_name || '').toLowerCase().includes('jewel');

  const currentLogo = isJewellery ? jewelleryLogo : fashionLogo;
  const brandAlt = isJewellery ? 'Kashvi Jewellery' : 'Kashvi Fashions';

  const stockSizesForSelectedColor = selectedColor
    ? Array.from(
        new Set(
          modalStock
            .filter((item) => (item.variant_color || '').trim().toLowerCase() === selectedColor.trim().toLowerCase() && item.stock_quantity > 0)
            .map((item) => (item.variant_size || '').trim())
            .filter(Boolean)
        )
      )
    : [];

  const handleColorShadeClick = (colorName: string) => {
    setSelectedColor(colorName);
    const sizes = modalStock
      .filter((item) => (item.variant_color || '').trim().toLowerCase() === colorName.trim().toLowerCase() && item.stock_quantity > 0)
      .map((item) => (item.variant_size || '').trim())
      .filter(Boolean);

    if (sizes.length > 0) setSelectedSize(sizes[0]);
    else setSelectedSize('');

    const colorLower = colorName.toLowerCase().trim();
    const matched = images.find((img) => img.color && img.color.toLowerCase().trim() === colorLower);
    if (matched) {
      setSelectedImage(matched.url);
      return;
    }
    const urlMatched = images.find((img) => img.url.toLowerCase().includes(colorLower));
    if (urlMatched) {
      setSelectedImage(urlMatched.url);
    }
  };

  const handleAddVariant = () => {
    if (!selectedSize && !selectedColor) return;
    const colorVal = selectedColor || 'Standard';
    const sizeVal = selectedSize || 'Free Size';
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
          fabric: product?.fabric || undefined,
          qty: 1,
        },
      ];
    });
  };

  const updateComboQty = (variantId: string, delta: number) => {
    setComboList((prev) =>
      prev
        .map((item) => {
          if (item.id === variantId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as ComboItem[]
    );
  };

  const removeComboItem = (variantId: string) => {
    setComboList((prev) => prev.filter((item) => item.id !== variantId));
  };

  const handleFinalCheckoutAction = (shouldOpenCart: boolean = false) => {
    if (!product) return;
    const finalPrice = product.selling_price || product.price || 0;

    if (comboList.length > 0) {
      const itemsToAdd = comboList.map((item) => ({
        id: `${product.id}-${item.size || 'std'}-${item.color || 'orig'}`,
        productId: product.id,
        name: product.name,
        price: finalPrice,
        mrp: product.mrp || undefined,
        image: selectedImage,
        color: item.color || undefined,
        size: item.size || undefined,
        fabric: item.fabric,
        qty: item.qty,
        department: isJewellery ? 'jewellery' : 'fashions',
      }));
      addToCart(itemsToAdd);
    } else {
      addToCart({
        id: `${product.id}-${selectedSize || 'std'}-${selectedColor || 'orig'}`,
        productId: product.id,
        name: product.name,
        price: finalPrice,
        mrp: product.mrp || undefined,
        image: selectedImage,
        color: selectedColor || undefined,
        size: selectedSize || undefined,
        fabric: product.fabric || undefined,
        qty: singleQty,
        department: isJewellery ? 'jewellery' : 'fashions',
      });
    }

    if (shouldOpenCart) {
      openCart();
    }
  };

  const handleWishlistToggle = () => {
    if (!product) return;
    const pid = String(product.id);
    if (isInWishlist(pid)) {
      removeFromWishlist(pid);
    } else {
      addToWishlist({
        id: pid,
        name: product.name,
        price: product.selling_price || product.price || 0,
        originalPrice: product.mrp || undefined,
        image: selectedImage,
        fabric: product.fabric || undefined,
        department: isJewellery ? 'jewellery' : 'fashions',
      });
    }
  };

  const handleShare = async () => {
    if (!product) return;
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on Kashvi!`,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    }
  };

  const sellingPrice = product?.selling_price || product?.price || 0;
  const mrp = product?.mrp || 0;
  const discountPercent = mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
  const isOutOfStock = stockColors.length === 0;
  const showColors = stockColors.filter((c) => c.toLowerCase() !== 'standard');
  const showSizes = stockSizesForSelectedColor.filter((s) => s.toLowerCase() !== 'free size');

  const totalComboItems = comboList.reduce((acc, item) => acc + item.qty, 0);
  const totalComboPrice = totalComboItems * sellingPrice;

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
                isJewellery ? 'hover:bg-[#0b3b2c] text-[#e5c07b]' : 'hover:bg-white/10 text-white'
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

      {/* 2. Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {loading ? (
          <CringeLoader size="lg" />
        ) : !product ? (
          <div className="py-24 text-center space-y-4">
            <p className="text-neutral-400 text-sm">Product not found or has been removed.</p>
            <Link
              to="/"
              className={`inline-block text-xs font-bold underline ${
                isJewellery ? 'text-[#e5c07b]' : 'text-[#00f5d4]'
              }`}
            >
              Return to Catalog
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
              <Link to={`/?tab=${isJewellery ? 'jewellery' : 'fashions'}`} className="hover:underline text-neutral-300">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
              <span className="capitalize">{isJewellery ? 'jewellery' : 'fashions'}</span>
              {(product.category || product.category_name) && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
                  <span className="capitalize text-neutral-300">
                    {product.category || product.category_name}
                  </span>
                </>
              )}
              {(product.sub_category || product.sub_category_name) && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
                  <span className={`capitalize font-semibold ${isJewellery ? 'text-[#e5c07b]' : 'text-[#00f5d4]'}`}>
                    {product.sub_category || product.sub_category_name}
                  </span>
                </>
              )}
            </div>

            {/* Product Overview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Image Stack */}
              <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-3.5 items-start">
                {images.length > 1 && (
                  <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto no-scrollbar max-h-[560px] w-full sm:w-20 shrink-0">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImage(img.url)}
                        className={`w-16 h-20 sm:w-full sm:h-24 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-neutral-900 ${
                          selectedImage === img.url
                            ? isJewellery
                              ? 'border-[#e5c07b] ring-2 ring-[#e5c07b]/30'
                              : 'border-[#00f5d4] ring-2 ring-[#00f5d4]/30'
                            : 'border-white/15 hover:border-white/40'
                        }`}
                      >
                        <img src={img.url} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover object-top" />
                      </button>
                    ))}
                  </div>
                )}

                <div
                  onClick={() => setIsZoomOpen(true)}
                  className="relative flex-1 w-full aspect-[3/4] max-h-[580px] rounded-3xl overflow-hidden bg-neutral-900 border border-white/10 group cursor-zoom-in shadow-2xl"
                >
                  <img
                    src={selectedImage}
                    alt={product.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Actions Over Image */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare();
                      }}
                      className={`w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center border border-white/15 transition-all shadow-md ${
                        isCopied ? 'bg-emerald-600' : ''
                      }`}
                      title="Share Product"
                      aria-label="Share Product"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWishlistToggle();
                      }}
                      className="w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center border border-white/15 transition-all shadow-md"
                      title="Wishlist"
                      aria-label="Wishlist"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isInWishlist(String(product.id))
                            ? isJewellery
                              ? 'fill-[#e5c07b] text-[#e5c07b]'
                              : 'fill-[#ff3385] text-[#ff3385]'
                            : 'text-neutral-300 hover:text-white'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-md opacity-85 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Zoom View</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Customization & Cart Checkout */}
              <div
                className={`lg:col-span-5 p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col justify-between space-y-6 ${
                  isJewellery
                    ? 'bg-[#051611]/90 border-[#e5c07b]/25 shadow-[#061e17]/60'
                    : 'bg-[#0b1329]/90 border-white/10 shadow-[#00f5d4]/5'
                }`}
              >
                <div className="space-y-4">
                  {(product.sub_category || product.sub_category_name) && (
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-[0.2em] block ${
                        isJewellery ? 'text-[#e5c07b]' : 'text-[#00f5d4]'
                      }`}
                    >
                      {product.sub_category || product.sub_category_name}
                    </span>
                  )}

                  <h1
                    className={`text-2xl sm:text-3xl font-bold leading-snug ${
                      isJewellery ? 'font-serif text-[#f5ebd7]' : 'font-sans text-white'
                    }`}
                  >
                    {product.name}
                  </h1>

                  {/* Pricing Overview */}
                  <div className="flex items-baseline gap-3 pt-1">
                    <span
                      className={`text-2xl sm:text-3xl font-black ${
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
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                            isJewellery
                              ? 'text-[#e5c07b] bg-[#0b3b2c] border border-[#e5c07b]/40'
                              : 'text-[#00f5d4] bg-[#00f5d4]/10 border border-[#00f5d4]/30'
                          }`}
                        >
                          {discountPercent}% OFF
                        </span>
                      </>
                    )}
                  </div>

                  <hr className="border-white/10" />

                  {isOutOfStock ? (
                    <div className="py-3 px-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
                      <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">
                        Currently Out of Stock
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* 1. Dynamic Colours Table Exact Shades */}
                      {showColors.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-neutral-300 block">
                            Color Shade: <b className="capitalize text-white">{selectedColor}</b>
                          </span>

                          <div className="flex flex-wrap items-center gap-3">
                            {showColors.map((cName) => {
                              const resolvedHex = resolveColorHex(cName);
                              const isSelected = selectedColor.toLowerCase().trim() === cName.toLowerCase().trim();
                              const isLight = isLightColor(cName);

                              return (
                                <button
                                  key={cName}
                                  type="button"
                                  onClick={() => handleColorShadeClick(cName)}
                                  title={cName}
                                  className={`relative w-8 h-8 rounded-full transition-all flex items-center justify-center cursor-pointer shadow-md ${
                                    isSelected
                                      ? isJewellery
                                        ? 'ring-2 ring-offset-2 ring-offset-[#051611] ring-[#e5c07b] scale-110'
                                        : 'ring-2 ring-offset-2 ring-offset-[#0b1329] ring-[#00f5d4] scale-110'
                                      : 'hover:scale-105 border border-white/20'
                                  }`}
                                  style={{
                                    backgroundColor: resolvedHex,
                                    boxShadow: isSelected
                                      ? isJewellery
                                        ? '0 0 12px rgba(229, 192, 123, 0.4)'
                                        : '0 0 12px rgba(0, 245, 212, 0.4)'
                                      : undefined,
                                  }}
                                >
                                  {isSelected && (
                                    <Check
                                      className={`w-4 h-4 stroke-[3] ${
                                        isLight ? 'text-black' : 'text-white'
                                      }`}
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 2. Size Badges */}
                      {showSizes.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-xs font-semibold text-neutral-300 block">
                            Select Size: <b className="text-white">{selectedSize}</b>
                          </span>

                          <div className="flex flex-wrap gap-2">
                            {showSizes.map((sz) => {
                              const isSelected = selectedSize === sz;
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

                      {/* 3. Quantity Counter */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-semibold text-neutral-300 block">
                          Quantity:
                        </span>
                        <div className="inline-flex items-center border border-white/20 rounded-xl p-1 bg-white/5">
                          <button
                            type="button"
                            onClick={() => setSingleQty((prev) => Math.max(1, prev - 1))}
                            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-neutral-300 transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-white">
                            {singleQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSingleQty((prev) => prev + 1)}
                            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-neutral-300 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 4. Add Variant Button */}
                      {(showColors.length > 0 || showSizes.length > 0) && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleAddVariant}
                            className={`w-full py-2.5 px-4 rounded-xl border-2 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 ${
                              isJewellery
                                ? 'border-[#e5c07b] text-[#e5c07b] hover:bg-[#e5c07b] hover:text-[#061e17]'
                                : 'border-[#00f5d4] text-[#00f5d4] hover:bg-[#00f5d4] hover:text-[#040814]'
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                            <span>
                              Add Variant ({selectedSize || 'Free Size'}{selectedColor && selectedColor !== 'Standard' ? ` • ${selectedColor}` : ''})
                            </span>
                          </button>
                        </div>
                      )}

                      {/* 5. Multi-Variants Combo List */}
                      {comboList.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                            Selected Variants ({comboList.length})
                          </span>

                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 no-scrollbar">
                            {comboList.map((item) => {
                              const hexBg = resolveColorHex(item.color);
                              const light = item.color ? isLightColor(item.color) : false;

                              return (
                                <div
                                  key={item.id}
                                  style={{ backgroundColor: item.color ? hexBg : '#1e293b' }}
                                  className={`flex items-center justify-between pl-2 pr-1 py-1 rounded-full shadow-xs transition-all duration-200 border border-black/20 text-[11px] ${
                                    item.color
                                      ? light ? 'text-neutral-900' : 'text-white'
                                      : 'text-white'
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

                      {/* 6. Total Summary */}
                      {totalComboItems > 0 && (
                        <div className="p-3 rounded-xl bg-black/60 border border-white/10 text-white flex items-center justify-between">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-bold">
                              Total Selected
                            </span>
                            <span className="text-xs font-semibold">
                              {totalComboItems} item{totalComboItems > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-sm font-bold ${
                                isJewellery ? 'text-[#e5c07b]' : 'text-[#00f5d4]'
                              }`}
                            >
                              ₹{totalComboPrice.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* 7. Action Checkout Buttons */}
                  <div className="flex items-center gap-3 pt-3">
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => handleFinalCheckoutAction(false)}
                      className={`flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isJewellery
                          ? 'border-[#e5c07b] text-[#e5c07b] hover:bg-[#e5c07b]/10'
                          : 'border-[#00f5d4] text-[#00f5d4] hover:bg-[#00f5d4]/10'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{totalComboItems > 0 ? `Add (${totalComboItems})` : 'Add to Bag'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => handleFinalCheckoutAction(true)}
                      className={`relative flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-[#061e17] shadow-xl transition-all duration-300 active:scale-95 cursor-pointer overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed ${
                        isJewellery
                          ? 'bg-gradient-to-r from-[#e5c07b] via-[#f7e7b4] to-[#b38728] shadow-[#e5c07b]/30 hover:brightness-110'
                          : 'bg-[#00f5d4] text-[#040814] shadow-[#00f5d4]/30 hover:bg-white'
                      }`}
                    >
                      <Zap className="w-4 h-4 fill-current animate-bounce relative z-10 shrink-0" />
                      <span className="relative z-10 tracking-widest font-black drop-shadow-xs">
                        Instant Checkout
                      </span>
                    </button>
                  </div>

                  {/* Trust Badges */}
                  <div className="pt-3 border-t border-white/10 grid grid-cols-3 gap-1 text-center text-neutral-400">
                    <div className="flex flex-col items-center gap-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-neutral-300" />
                      <span className="text-[9px]">100% Genuine</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Truck className="w-3.5 h-3.5 text-neutral-300" />
                      <span className="text-[9px]">Fast Dispatch</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <RotateCcw className="w-3.5 h-3.5 text-neutral-300" />
                      <span className="text-[9px]">Easy Returns</span>
                    </div>
                  </div>
                </div>

                {/* Description Snippet if available */}
                {product.description && (
                  <div className="pt-3 border-t border-white/10 text-xs text-neutral-300 leading-relaxed">
                    <span className="font-bold text-white block mb-1">Product Details:</span>
                    <p>{product.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. Lightbox Full Image Zoom */}
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
            {product && (
              <p className="text-xs text-neutral-300 mt-2 font-medium">
                {product.name}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}