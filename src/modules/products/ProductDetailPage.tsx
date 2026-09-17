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
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import HeaderBagButton from '../../components/common/HeaderBagButton';
import HeaderUserButton from '../../components/common/HeaderUserButton';
import HeaderHeartButton from '../../components/common/HeaderHeartButton';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

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

  const isJewellery =
    product?.category?.toLowerCase().includes('jewel') ||
    product?.sub_category?.toLowerCase().includes('jewel');

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
          className="mt-4 px-6 py-2 rounded-full bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800"
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
  const availableSizes = product.size ? product.size.split(',').map((s) => s.trim()) : [];

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
              aria-label="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <Link to="/" className="flex flex-col">
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
            <HeaderHeartButton isJewellery={isJewellery} />
            <HeaderBagButton isJewellery={isJewellery} />
          </div>
        </div>
      </header>

      {/* 2. Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 text-xs text-neutral-500 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <Link to="/" className="hover:underline shrink-0">Home</Link>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        {product.category && (
          <>
            <span className="capitalize shrink-0">{product.category}</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          </>
        )}
        {product.sub_category && (
          <>
            <span className="capitalize shrink-0">{product.sub_category}</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          </>
        )}
        <span className="text-neutral-900 font-medium truncate">{product.name}</span>
      </div>

      {/* 3. Main Product Details Grid */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Image Gallery */}
          <div className="md:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
            {/* Thumbnails */}
            {imageList.length > 1 && (
              <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto no-scrollbar max-h-[520px]">
                {imageList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      selectedImage === img
                        ? isJewellery
                          ? 'border-[#0b3b2c] ring-2 ring-[#0b3b2c]/20'
                          : 'border-[#ff4d6d] ring-2 ring-[#ff4d6d]/20'
                        : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Main Featured Image with Functional Wishlist Toggle */}
            <div className="flex-1 relative aspect-3/4 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-100 shadow-sm group">
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <button
                type="button"
                onClick={handleWishlistToggle}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 hover:bg-white text-neutral-700 shadow-md backdrop-blur-xs transition-transform active:scale-90 cursor-pointer z-10"
                aria-label={isFav ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    isFav ? 'fill-[#ff4d6d] text-[#ff4d6d]' : 'text-neutral-600 hover:text-rose-500'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Right Column: Information & Actions */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Badge & Sub-Category */}
              <div className="flex items-center gap-2">
                {product.brand && (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                    {product.brand}
                  </span>
                )}
                {product.sub_category && (
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isJewellery ? 'text-[#b38728]' : 'text-[#ff4d6d]'
                    }`}
                  >
                    {product.sub_category}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900 leading-snug">
                {product.name}
              </h1>

              {/* Price Section */}
              <div className="flex items-baseline gap-3 pt-2">
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
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-neutral-500">Inclusive of all taxes.</p>

              <hr className="border-neutral-200/70" />

              {/* Fabric & Colour Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {product.fabric && (
                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                    <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Fabric</span>
                    <span className="font-semibold text-neutral-800 mt-0.5 block">{product.fabric}</span>
                  </div>
                )}
                {product.colour && (
                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                    <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Colour</span>
                    <span className="font-semibold text-neutral-800 mt-0.5 block">{product.colour}</span>
                  </div>
                )}
              </div>

              {/* Size Selector */}
              {availableSizes.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-neutral-800">Select Size</span>
                    <button type="button" className="text-neutral-500 hover:underline">Size Guide</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`min-w-12 h-10 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          selectedSize === sz
                            ? isJewellery
                              ? 'bg-[#0b3b2c] text-[#e5c07b] border-[#0b3b2c]'
                              : 'bg-[#ff4d6d] text-white border-[#ff4d6d]'
                            : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => handleAddToCart(false)}
                  className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer ${
                    isJewellery
                      ? 'bg-[#0b3b2c] text-[#e5c07b] hover:bg-[#07291f]'
                      : 'bg-[#ff4d6d] text-white hover:bg-[#e03a58]'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Bag</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddToCart(true)}
                  className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-neutral-900 text-white hover:bg-neutral-800 shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>Buy Now</span>
                </button>
              </div>

              {/* Value Assurances */}
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

              {/* Description & Features */}
              {product.description && (
                <div className="pt-4 text-xs text-neutral-600 space-y-1">
                  <h4 className="font-semibold text-neutral-800 uppercase text-[10px] tracking-wider">
                    Description
                  </h4>
                  <p className="leading-relaxed">{product.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}