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
  colour: string | null;
  size: string | null;
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

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { addToCart, openCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [imageList, setImageList] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
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
    async function fetchProduct() {
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

          let imgs: string[] = [];
          if (Array.isArray(data.images)) {
            imgs = data.images.map((img: any) => (typeof img === 'string' ? img : img?.url || ''));
          } else if (typeof data.images === 'string') {
            try {
              const parsed = JSON.parse(data.images);
              if (Array.isArray(parsed)) {
                imgs = parsed.map((img: any) => (typeof img === 'string' ? img : img?.url || ''));
              }
            } catch {
              imgs = [data.images];
            }
          }

          const validImgs = imgs.filter(Boolean);
          const fallback = isJewellery
            ? 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80'
            : 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80';

          const finalImgs = validImgs.length > 0 ? validImgs : [fallback];
          setImageList(finalImgs);
          setSelectedImage(finalImgs[0]);

          if (data.size) {
            setSelectedSize(data.size.split(',')[0].trim());
          }
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchProduct();
  }, [id]);

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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
        <h2 className="text-xl font-bold text-neutral-800">Product Not Found</h2>
        <p className="text-sm text-neutral-500 mt-1">The item you are looking for is no longer available.</p>
        <Link
          to="/"
          className="mt-4 px-6 py-2.5 rounded-full bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-all shadow-md"
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
  const availableSizes = product.size ? product.size.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const handleWishlistToggle = () => {
    if (isFav) {
      removeFromWishlist(pid);
    } else {
      addToWishlist({
        id: pid,
        name: product.name,
        price: sellingPrice,
        originalPrice: mrp || undefined,
        image: selectedImage || imageList[0],
        color: product.colour?.split(',')[0]?.trim() || undefined,
        size: selectedSize || undefined,
        fabric: product.fabric || undefined,
        department: isJewellery ? 'jewellery' : 'fashions',
      });
    }
  };

  const handleAddToCart = (instantCheckout: boolean = false) => {
    addToCart({
      id: `${product.id}-${selectedSize || 'default'}-${product.colour || 'default'}`,
      productId: product.id,
      name: product.name,
      price: sellingPrice,
      mrp: mrp || undefined,
      image: selectedImage || imageList[0],
      color: product.colour?.split(',')[0]?.trim() || undefined,
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
    <div className={`min-h-screen ${isJewellery ? 'bg-[#fcfdfd]' : 'bg-[#fffafb]'}`}>
      {/* 1. Global Header with Matching Square Logo */}
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

            <Link to={`/?tab=${isJewellery ? 'jewellery' : 'fashions'}`} className="inline-flex items-center group py-0.5">
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

      {/* 2. Breadcrumbs Navigation */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 text-xs text-neutral-500 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <Link to={`/?tab=${isJewellery ? 'jewellery' : 'fashions'}`} className="hover:underline shrink-0">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <Link
          to={`/category/${isJewellery ? 'jewellery' : 'fashions'}`}
          className="capitalize hover:underline shrink-0"
        >
          {isJewellery ? 'Royal Vault' : 'Haute Couture'}
        </Link>
        {product.sub_category && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <Link
              to={`/category/${isJewellery ? 'jewellery' : 'fashions'}?sub=${encodeURIComponent(product.sub_category)}`}
              className="capitalize hover:underline shrink-0"
            >
              {product.sub_category}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <span className="text-neutral-900 font-medium truncate">{product.name}</span>
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
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-20 sm:w-20 sm:h-24 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-neutral-50 ${
                      selectedImage === img
                        ? isJewellery
                          ? 'border-[#0b3b2c] ring-2 ring-[#0b3b2c]/20'
                          : 'border-[#ff4d6d] ring-2 ring-[#ff4d6d]/20'
                        : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover object-top" />
                  </button>
                ))}
              </div>
            )}

            {/* Featured Image with Zoom Trigger */}
            <div className="flex-1 relative aspect-[3/4] rounded-3xl overflow-hidden bg-neutral-100 border border-neutral-200/60 shadow-sm group">
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
              />

              {/* Floating Wishlist Button */}
              <button
                type="button"
                onClick={handleWishlistToggle}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/85 hover:bg-white text-neutral-700 shadow-md backdrop-blur-md flex items-center justify-center transition-all active:scale-90 cursor-pointer z-10"
                aria-label={isFav ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    isFav
                      ? isJewellery
                        ? 'fill-[#0b3b2c] text-[#0b3b2c]'
                        : 'fill-[#ff4d6d] text-[#ff4d6d]'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                />
              </button>

              {/* Click to Zoom Pill */}
              <button
                type="button"
                onClick={() => setIsZoomOpen(true)}
                className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-md shadow-md transition-all cursor-pointer"
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
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1 rounded-full ${
                    isJewellery
                      ? 'bg-[#0b3b2c]/10 text-[#0b3b2c] border border-[#0b3b2c]/20'
                      : 'bg-[#ff4d6d]/10 text-[#ff4d6d] border border-[#ff4d6d]/20'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  {product.sub_category || (isJewellery ? 'Imperial Vault' : 'Haute Couture')}
                </span>

                {product.brand && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
                    {product.brand}
                  </span>
                )}
              </div>

              {/* Product Title */}
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900 leading-snug">
                {product.name}
              </h1>

              {/* Pricing Display */}
              <div className="flex items-baseline gap-3 pt-1">
                <span
                  className={`text-2xl sm:text-3xl font-bold ${
                    isJewellery ? 'text-[#0b3b2c]' : 'text-neutral-950'
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
                      className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                        isJewellery
                          ? 'text-[#0b3b2c] bg-emerald-50 border border-[#0b3b2c]/20'
                          : 'text-[#ff4d6d] bg-rose-50 border border-[#ff4d6d]/20'
                      }`}
                    >
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">Price includes all applicable taxes & insured shipping.</p>

              <hr className="border-neutral-200/70" />

              {/* Fabric & Colour Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {product.fabric && (
                  <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/70 shadow-2xs">
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider">
                      Fabric
                    </span>
                    <span className="font-semibold text-neutral-800 mt-0.5 block">{product.fabric}</span>
                  </div>
                )}
                {product.colour && (
                  <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/70 shadow-2xs">
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider">
                      Colour
                    </span>
                    <span className="font-semibold text-neutral-800 mt-0.5 block">{product.colour}</span>
                  </div>
                )}
              </div>

              {/* Size Selector */}
              {availableSizes.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-800 uppercase tracking-wider text-[11px]">
                      Select Size
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`min-w-12 h-10 px-3.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          selectedSize === sz
                            ? isJewellery
                              ? 'bg-[#0b3b2c] text-[#e5c07b] border-[#0b3b2c] shadow-xs'
                              : 'bg-[#ff4d6d] text-white border-[#ff4d6d] shadow-xs'
                            : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="space-y-2 pt-1">
                <span className="font-bold text-neutral-800 uppercase tracking-wider text-[11px] block">
                  Quantity
                </span>
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center border border-neutral-200 rounded-xl p-1 bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center text-xs font-bold text-neutral-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => prev + 1)}
                      className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
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
                      ? 'border-[#0b3b2c] text-[#0b3b2c] hover:bg-[#0b3b2c]/10'
                      : 'border-[#ff4d6d] text-[#ff4d6d] hover:bg-[#ff4d6d]/10'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Bag</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddToCart(true)}
                  className={`flex-1 py-4 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white shadow-xl transition-all duration-300 active:scale-95 cursor-pointer ${
                    isJewellery
                      ? 'bg-gradient-to-r from-[#0b3b2c] via-[#14532d] to-[#0b3b2c] shadow-[#0b3b2c]/40 ring-2 ring-[#e5c07b]/60'
                      : 'bg-gradient-to-r from-[#ff4d6d] via-[#e63956] to-[#ff2a55] shadow-[#ff4d6d]/40 ring-2 ring-rose-300/60'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current animate-bounce" />
                  <span className="tracking-widest font-black">Instant Buy</span>
                </button>
              </div>

              {/* Trust Assurances */}
              <div className="pt-4 border-t border-neutral-200/70 grid grid-cols-3 gap-2 text-center text-neutral-600">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-neutral-800" />
                  <span className="text-[10px] font-medium">100% Genuine</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Truck className="w-4 h-4 text-neutral-800" />
                  <span className="text-[10px] font-medium">Fast Dispatch</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <RotateCcw className="w-4 h-4 text-neutral-800" />
                  <span className="text-[10px] font-medium">Easy Returns</span>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="pt-4 text-xs text-neutral-600 space-y-1.5">
                  <h4 className="font-bold text-neutral-800 uppercase text-[10px] tracking-wider">
                    Product Description
                  </h4>
                  <p className="leading-relaxed whitespace-pre-line">{product.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 4. Mobile Sticky Bottom Action Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-neutral-200 px-4 py-3 z-40 flex items-center gap-3 shadow-lg">
        <button
          type="button"
          onClick={() => handleAddToCart(false)}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border active:scale-95 cursor-pointer ${
            isJewellery
              ? 'border-[#0b3b2c] text-[#0b3b2c]'
              : 'border-[#ff4d6d] text-[#ff4d6d]'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Add to Bag</span>
        </button>

        <button
          type="button"
          onClick={() => handleAddToCart(true)}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 text-white shadow-md active:scale-95 cursor-pointer ${
            isJewellery
              ? 'bg-[#0b3b2c] text-[#e5c07b]'
              : 'bg-[#ff4d6d] text-white'
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