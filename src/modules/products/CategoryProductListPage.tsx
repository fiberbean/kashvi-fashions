import React, { useState, useEffect, useTransition } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Filter,
  ArrowUpDown,
  ChevronRight,
  Heart,
  Share2,
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
import CringeLoader from '../../components/common/CringeLoader';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

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

const cleanStr = (val?: string | null): string => {
  if (!val) return '';
  return decodeURIComponent(String(val))
    .toLowerCase()
    .replace(/%27/g, "'")
    .replace(/['’`"]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

const categoryMetaCache = new Map<string, { name: string; dept: 'fashions' | 'jewellery'; id: string }>();

export default function CategoryProductListPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSub = searchParams.get('sub');

  const { addToCart, openCartDrawer, openCart } = useCart() as any;
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const [isSwitching, startTransition] = useTransition();

  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categoryName, setCategoryName] = useState<string>('');
  const [department, setDepartment] = useState<'fashions' | 'jewellery'>('fashions');

  const [dbColoursMap, setDbColoursMap] = useState<Record<string, string>>({});

  const [headerLoading, setHeaderLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  // Modal State
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [modalImages, setModalImages] = useState<{ url: string; color?: string }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  
  const [modalStock, setModalStock] = useState<InventoryItem[]>([]);
  const [stockColors, setStockColors] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [singleQty, setSingleQty] = useState<number>(1);
  const [comboList, setComboList] = useState<ComboItem[]>([]);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isJewellery =
    department === 'jewellery' ||
    (slug || '').toLowerCase().includes('jewel') ||
    searchParams.get('tab') === 'jewellery' ||
    ['earring', 'earrings', 'bangle', 'bangles', 'necklace', 'necklaces', 'chain', 'ring', 'choker', 'bridal jewellery', 'jewellery sets'].some((j) =>
      (selectedSub || '').toLowerCase().includes(j)
    );

  // 1. Fetch Colours from DB
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
    if (!colorName) return '#94a3b8';
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

  // 2. Load Category Meta and Sub-Categories
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
          const { data: catList } = await supabase
            .from('categories')
            .select('id, name, slug, image_url, active, display_order')
            .limit(50);

          if (catList && catList.length > 0) {
            const targetNorm = cleanStr(slugKey);
            const matched = catList.find((c: any) => 
              cleanStr(c.id) === targetNorm ||
              cleanStr(c.slug) === targetNorm ||
              cleanStr(c.name) === targetNorm
            );

            if (matched) {
              activeCatId = String(matched.id);
              activeCatName = matched.name;
              currentDept = matched.name.toLowerCase().includes('jewel') || (matched.slug && matched.slug.toLowerCase().includes('jewel'))
                ? 'jewellery'
                : 'fashions';
              categoryMetaCache.set(slugKey, { name: activeCatName, dept: currentDept, id: activeCatId });
            }
          }
        }

        if (isCurrent) {
          setCategoryName(activeCatName);
          setDepartment(currentDept);
        }

        const { data: subData } = await supabase
          .from('sub_categories')
          .select('*');

        if (isCurrent && subData) {
          let filtered: SubCategory[] = [];

          if (currentDept === 'jewellery' || slugKey.toLowerCase().includes('jewel')) {
            filtered = subData.filter((sub: any) => {
              if (sub.active === false) return false;
              const subDept = (sub.department || '').toLowerCase().trim();
              if (subDept.includes('jewel')) return true;
              if (activeCatId && String(sub.category_id).trim() === activeCatId) return true;
              const cName = (sub.category_name || '').toLowerCase();
              if (cName.includes('jewel')) return true;

              const sName = (sub.name || '').toLowerCase();
              return (
                sName.includes('bangle') ||
                sName.includes('necklace') ||
                sName.includes('earring') ||
                sName.includes('chain') ||
                sName.includes('ring') ||
                sName.includes('choker') ||
                sName.includes('chuda') ||
                sName.includes('jewel') ||
                sName.includes('set')
              );
            });
          } else {
            filtered = subData.filter((sub: any) => {
              if (sub.active === false) return false;
              const matchesId = activeCatId && String(sub.category_id).trim() === activeCatId;
              const matchesName =
                sub.category_name &&
                activeCatName &&
                cleanStr(sub.category_name) === cleanStr(activeCatName);
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

  // 3. Load Category Products
  useEffect(() => {
    let isCurrent = true;

    async function loadCategoryProducts() {
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
          const categoryMatched = prodData.filter((p: any) => {
            if (p.active === false) return false;
            
            const pDept = (p.department || '').toLowerCase().trim();
            if (currentDept === 'jewellery' || slugKey.toLowerCase().includes('jewel')) {
              if (pDept.includes('jewel')) return true;
              const pCat = (p.category || p.category_name || '').toLowerCase();
              return pCat.includes('jewel');
            }

            if (activeCatId && String(p.category_id).trim() === activeCatId) return true;
            
            const pCatNorm = cleanStr(p.category_name || p.category);
            const targetNorm = cleanStr(activeCatName);
            const slugNorm = cleanStr(slugKey);

            if (pCatNorm && (pCatNorm === targetNorm || pCatNorm === slugNorm || pCatNorm.includes('ethnic') || targetNorm.includes('ethnic'))) {
              return true;
            }

            return true;
          });

          setRawProducts(categoryMatched);
        }
      } catch (err) {
        console.error('Error loading products:', err);
        if (isCurrent) setRawProducts([]);
      } finally {
        if (isCurrent) setProductsLoading(false);
      }
    }

    loadCategoryProducts();

    return () => {
      isCurrent = false;
    };
  }, [slug]);

  // 4. Dynamic Sub-Category Filtering
  useEffect(() => {
    if (!selectedSub) {
      setFilteredProducts(rawProducts);
      return;
    }

    const token = cleanStr(selectedSub);

    const targetObj = subCategories.find(
      (s) => cleanStr(s.name) === token || cleanStr(s.id) === token
    );
    const targetId = targetObj ? String(targetObj.id).trim().toLowerCase() : '';
    const rawTargetName = (targetObj?.name || selectedSub).toLowerCase().trim();

    const matched = rawProducts.filter((p: any) => {
      const pSubId = String(p.sub_category_id || '').trim().toLowerCase();
      if (targetId && pSubId && pSubId === targetId) return true;

      const pSub = String(p.sub_category || p.sub_category_name || '').toLowerCase().trim();
      if (pSub) {
        const pSubNorm = cleanStr(pSub);
        if (pSubNorm === token || pSubNorm.includes(token) || token.includes(pSubNorm)) return true;
        if (pSub.includes(rawTargetName) || rawTargetName.includes(pSub)) return true;
      }

      const pName = String(p.name || '').toLowerCase();
      const pNameNorm = cleanStr(pName);
      if (token.length >= 3 && (pNameNorm.includes(token) || pName.includes(rawTargetName))) {
        return true;
      }

      return false;
    });

    setFilteredProducts(matched);
  }, [rawProducts, selectedSub, subCategories]);

  const handleSubSelect = (subName: string) => {
    if (selectedSub === subName) return;
    startTransition(() => {
      searchParams.set('sub', subName);
      setSearchParams(searchParams);
    });
  };

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

  const handleWishlistToggle = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const pid = String(product.id);
    if (isInWishlist(pid)) {
      removeFromWishlist(pid);
    } else {
      const pImage = getProductImage(product.images);
      const price = product.selling_price || product.price || 0;

      addToWishlist({
        id: pid,
        name: product.name,
        price,
        originalPrice: product.mrp || undefined,
        image: pImage,
        fabric: product.fabric || undefined,
        department: isJewellery ? 'jewellery' : 'fashions',
      });
    }
  };

  const handleShareProduct = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/#/category/${slug}?sub=${encodeURIComponent(
      product.sub_category || product.sub_category_name || selectedSub || ''
    )}&prod=${product.id}`;

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
        setCopiedId(String(product.id));
        setTimeout(() => setCopiedId(null), 2000);
      } catch (err) {
        console.error('Copy to clipboard failed:', err);
      }
    }
  };

  const handleOpenPopModel = async (product: Product) => {
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

    try {
      const pid = String(product.id).trim();
      const { data: invData, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('product_id', pid);

      if (error) {
        console.error('Inventory fetch error:', error);
      }

      const inStockItems = (invData || []).filter((item: any) => Number(item.stock_quantity) > 0);

      if (inStockItems.length > 0) {
        setModalStock(inStockItems);

        const uniqueColors = Array.from(
          new Set(
            inStockItems
              .map((item: any) => (item.variant_color || '').trim())
              .filter(Boolean)
          )
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
        } else {
          setSelectedColor('');
          setSelectedSize('');
        }
      } else if (invData && invData.length > 0) {
        setModalStock([]);
        setStockColors([]);
        setSelectedColor('');
        setSelectedSize('');
      } else {
        const prodColors = (product.colour || product.colors || '')
          .split(',')
          .map((c: string) => c.trim())
          .filter(Boolean);
        const prodSizes = (product.size || product.sizes || product.available_sizes || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);

        const finalColors = prodColors.length > 0 ? prodColors : ['Standard'];
        const finalSizes = prodSizes.length > 0 ? prodSizes : ['Free Size'];

        const simulatedStock: InventoryItem[] = [];
        finalColors.forEach((c: string) => {
          finalSizes.forEach((s: string) => {
            simulatedStock.push({
              id: `${product.id}-${c}-${s}`,
              product_id: product.id,
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
    } catch (err) {
      console.error('Error fetching inventory for modal:', err);
      setModalStock([]);
      setStockColors([]);
      setSelectedColor('');
      setSelectedSize('');
    }
  };

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

    if (sizes.length > 0) {
      setSelectedSize(sizes[0]);
    } else {
      setSelectedSize('');
    }

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

  // ROBUST CART CHECKOUT ACTION (Supports both Single Item & Array Batching with full property compatibility)
  const handleFinalCheckoutAction = (shouldOpenCart: boolean = false) => {
    if (!activeProduct) return;
    const finalPrice = activeProduct.selling_price || activeProduct.price || 0;

    const buildPayload = (sizeVal?: string, colorVal?: string, quantityNum: number = 1) => {
      const s = sizeVal || 'Free Size';
      const c = colorVal || 'Standard';
      return {
        id: `${activeProduct.id}-${s}-${c}`,
        productId: activeProduct.id,
        product_id: activeProduct.id,
        name: activeProduct.name,
        price: finalPrice,
        selling_price: finalPrice,
        mrp: activeProduct.mrp || undefined,
        image: selectedImage,
        image_url: selectedImage,
        color: c,
        size: s,
        variant_color: c,
        variant_size: s,
        fabric: activeProduct.fabric || undefined,
        quantity: quantityNum,
        qty: quantityNum,
        department: isJewellery ? 'jewellery' : 'fashions',
      };
    };

    if (comboList.length > 0) {
      comboList.forEach((item) => {
        const payload = buildPayload(item.size, item.color, item.qty);
        addToCart(payload);
      });
    } else {
      const payload = buildPayload(selectedSize, selectedColor, singleQty);
      addToCart(payload);
    }

    setActiveProduct(null);

    if (shouldOpenCart) {
      if (typeof openCartDrawer === 'function') {
        openCartDrawer();
      } else if (typeof openCart === 'function') {
        openCart();
      }
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

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const priceA = a.selling_price || a.price || 0;
    const priceB = b.selling_price || b.price || 0;
    if (sortBy === 'price-asc') return priceA - priceB;
    if (sortBy === 'price-desc') return priceB - priceA;
    return 0;
  });

  const activeSellingPrice = activeProduct?.selling_price || activeProduct?.price || 0;
  const activeMrp = activeProduct?.mrp || 0;
  const activeDiscount = activeMrp > activeSellingPrice ? Math.round(((activeMrp - activeSellingPrice) / activeMrp) * 100) : 0;
  
  const isOutOfStock = stockColors.length === 0;
  const showColors = stockColors.filter((c) => c.toLowerCase() !== 'standard');
  const showSizes = stockSizesForSelectedColor.filter((s) => s.toLowerCase() !== 'free size');

  const totalComboItems = comboList.reduce((acc, item) => acc + item.qty, 0);
  const totalComboPrice = totalComboItems * activeSellingPrice;

  return (
    <div
      className={`min-h-screen transition-colors duration-500 pb-16 ${
        isJewellery ? 'bg-[#FBF9F5] text-stone-900 font-cinzel' : 'bg-[#FAF8F5] text-stone-900 font-sans'
      }`}
    >
      {/* 1. Page Header & Arched Sub-Category Track */}
      <div
        className={`w-full py-4 sm:py-6 px-4 md:px-8 border-b transition-all duration-300 ${
          isJewellery
            ? 'bg-gradient-to-b from-amber-50/40 via-transparent to-transparent border-amber-100/60'
            : 'bg-gradient-to-b from-pink-50/50 via-transparent to-transparent border-pink-100/60'
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-4">
          
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Link
              to={`/?tab=${isJewellery ? 'jewellery' : 'fashions'}`}
              className="hover:underline font-medium text-stone-700"
            >
              Home
            </Link>
            <ChevronRight className="w-3 h-3 text-stone-400" />
            <span className="capitalize">{isJewellery ? 'jewellery' : department}</span>
            <ChevronRight className="w-3 h-3 text-stone-400" />
            <span
              className={`font-semibold capitalize ${
                isJewellery ? 'text-[#b38728]' : 'text-[#ff2d85]'
              }`}
            >
              {categoryName || (isJewellery ? 'Jewellery' : 'Collection')}
            </span>
            {selectedSub && (
              <>
                <ChevronRight className="w-3 h-3 text-stone-400" />
                <span className="text-stone-900 font-bold">{selectedSub}</span>
              </>
            )}
          </div>

          {/* Title & Items Counter */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1.5">
            <div className="flex items-center gap-3">
              <h1
                className={`text-2xl sm:text-3xl font-bold capitalize ${
                  isJewellery ? 'font-cinzel text-stone-900 tracking-wider' : 'font-sans text-stone-950 tracking-tight'
                }`}
              >
                {selectedSub || categoryName || (isJewellery ? 'Jewellery Collection' : 'Collection')}
              </h1>
              {isSwitching && <CringeLoader size="sm" />}
            </div>

            <span className="text-xs text-stone-500 font-medium">
              {productsLoading || isSwitching ? (
                <span className="inline-block w-20 h-4 bg-stone-200 animate-pulse rounded-md"></span>
              ) : (
                `Showing ${sortedProducts.length} items`
              )}
            </span>
          </div>

          {/* SUB-CATEGORY TRACK: Stroke-Free Arched Windows with Baby Pink / Gold Shadow */}
          <div className="w-full flex items-center justify-center overflow-x-auto pb-4 pt-2 px-2 no-scrollbar scroll-smooth">
            <div className="flex items-start justify-center gap-4 sm:gap-5 min-w-max mx-auto">
              {headerLoading && subCategories.length === 0 ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-[84px] h-[116px] rounded-t-full rounded-b-2xl bg-stone-200/70 animate-pulse shrink-0"
                    />
                  ))}
                </>
              ) : (
                subCategories.map((sub) => {
                  const isActive = cleanStr(selectedSub) === cleanStr(sub.name);

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSubSelect(sub.name)}
                      className="group shrink-0 flex flex-col items-center w-[84px] sm:w-[94px] text-center cursor-pointer active:scale-95 transition-all duration-300"
                    >
                      {/* Arched Window Shape */}
                      <div
                        className={`relative w-full h-[116px] sm:h-[126px] rounded-t-full rounded-b-2xl overflow-hidden bg-stone-100 transition-all duration-300 ${
                          isJewellery
                            ? isActive
                              ? 'shadow-[0_12px_28px_rgba(212,175,55,0.7),0_4px_12px_rgba(212,175,55,0.4)] ring-2 ring-[#D4AF37]'
                              : 'shadow-[0_8px_20px_rgba(212,175,55,0.38),0_2px_6px_rgba(212,175,55,0.2)] group-hover:shadow-[0_12px_28px_rgba(212,175,55,0.65)]'
                            : isActive
                            ? 'shadow-[0_12px_28px_rgba(255,140,165,0.8),0_4px_12px_rgba(255,182,193,0.5)] ring-2 ring-[#ff2d85]'
                            : 'shadow-[0_8px_20px_rgba(255,182,193,0.55),0_2px_6px_rgba(255,192,203,0.3)] group-hover:shadow-[0_12px_28px_rgba(255,150,175,0.75)]'
                        }`}
                      >
                        <img
                          src={
                            sub.image_url ||
                            (isJewellery
                              ? 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&q=80'
                              : 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=80')
                          }
                          alt={sub.name}
                          className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-40 group-hover:opacity-15 transition-opacity" />
                      </div>

                      {/* Text Tag with Multi-line Text Wrap and Equal Height */}
                      <div className="mt-2 w-full px-0.5 min-h-[34px] flex items-center justify-center">
                        <span
                          className={`block text-[11px] leading-snug whitespace-normal break-words text-center transition-colors ${
                            isJewellery
                              ? `font-cinzel font-bold uppercase tracking-wide ${
                                  isActive ? 'text-[#b38728]' : 'text-stone-800 group-hover:text-[#b38728]'
                                }`
                              : `font-sans font-semibold tracking-tight ${
                                  isActive ? 'text-[#ff2d85]' : 'text-stone-800 group-hover:text-[#ff2d85]'
                                }`
                          }`}
                        >
                          {sub.name}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter & Sort Toolbar */}
      <div
        className={`max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between border-b ${
          isJewellery ? 'border-amber-100/70' : 'border-stone-200/80'
        }`}
      >
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Filter className="w-3.5 h-3.5 text-stone-600" />
          <span>
            Filters Active: <b className="text-stone-900">{selectedSub || categoryName || 'All'}</b>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`bg-white border rounded-xl px-3 py-1.5 text-xs text-stone-800 focus:outline-hidden cursor-pointer shadow-xs ${
              isJewellery ? 'border-amber-200/80' : 'border-stone-200'
            }`}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* 3. Products Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 min-h-[380px]">
        {productsLoading || isSwitching ? (
          <CringeLoader size="lg" />
        ) : sortedProducts.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <p className="text-stone-500 text-sm">No products found in this collection.</p>
            <Link
              to={`/?tab=${isJewellery ? 'jewellery' : 'fashions'}`}
              className={`inline-block text-xs font-bold underline ${
                isJewellery ? 'text-[#b38728]' : 'text-[#ff2d85]'
              }`}
            >
              Return to Home
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in duration-150">
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

                    {/* Floating Controls */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
                      <button
                        type="button"
                        aria-label="Share Product"
                        onClick={(e) => handleShareProduct(e, product)}
                        className={`w-8 h-8 rounded-full bg-white/85 hover:bg-white text-stone-700 transition-all flex items-center justify-center shadow-sm backdrop-blur-xs ${
                          isCopied ? 'bg-emerald-600 text-white' : ''
                        }`}
                        title="Share Product"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 stroke-[2.5] text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        aria-label={isFav ? 'Remove from Wishlist' : 'Add to Wishlist'}
                        onClick={(e) => handleWishlistToggle(e, product)}
                        className="w-8 h-8 rounded-full bg-white/85 hover:bg-white text-stone-700 transition-all flex items-center justify-center shadow-sm backdrop-blur-xs"
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
                      {discountPercent > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-xs backdrop-blur-md ${
                            isJewellery
                              ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-stone-950'
                              : 'bg-gradient-to-r from-[#ff2d85] to-[#ff639f] text-white'
                          }`}
                        >
                          {discountPercent}% OFF
                        </span>
                      )}
                      {product.fabric && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-white/80 text-stone-800 backdrop-blur-xs w-max border border-stone-200/50">
                          {product.fabric}
                        </span>
                      )}
                    </div>

                    <div className="absolute inset-x-0 bottom-0 py-2.5 px-3 bg-gradient-to-t from-stone-900/80 via-stone-900/30 to-transparent flex items-center justify-center gap-1.5 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Quick View
                      </span>
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

                    <div className="pt-2 border-t border-stone-100 flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`text-sm sm:text-base font-bold ${
                            isJewellery ? 'text-[#b38728]' : 'text-stone-950'
                          }`}
                        >
                          ₹{currentPrice.toLocaleString('en-IN')}
                        </span>
                        {originalPrice && (
                          <span className="text-[11px] text-stone-400 line-through">
                            ₹{originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-full transition-all ${
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
            })}
          </div>
        )}
      </div>

      {/* 4. QUICK VIEW POPUP MODAL */}
      {activeProduct && (
        <div
          onClick={() => setActiveProduct(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] overflow-hidden bg-white border border-stone-100 cursor-default my-auto animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col text-stone-900"
          >
            <button
              type="button"
              onClick={() => setActiveProduct(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer z-30"
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
                        className={`w-14 h-18 sm:w-16 sm:h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-stone-100 flex items-center justify-center ${
                          selectedImage === img.url
                            ? isJewellery
                              ? 'border-[#D4AF37] ring-2 ring-amber-200'
                              : 'border-[#ff2d85] ring-2 ring-pink-200'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <img src={img.url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover object-top" />
                      </button>
                    ))}
                  </div>
                )}

                <div
                  onClick={() => setIsZoomOpen(true)}
                  className="flex-1 w-full relative aspect-[3/4] max-h-[440px] rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/80 group cursor-zoom-in shadow-xs"
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
                          isJewellery ? 'text-[#b38728] font-cinzel' : 'text-[#ff2d85]'
                        }`}
                      >
                        {activeProduct.sub_category || activeProduct.sub_category_name}
                      </span>
                    )}
                    <h2
                      className={`text-xl sm:text-2xl font-bold mt-0.5 leading-snug ${
                        isJewellery ? 'font-cinzel text-stone-900' : 'font-sans text-stone-950'
                      }`}
                    >
                      {activeProduct.name}
                    </h2>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2.5 pt-0.5">
                    <span
                      className={`text-xl sm:text-2xl font-bold ${
                        isJewellery ? 'text-[#b38728]' : 'text-stone-950'
                      }`}
                    >
                      ₹{activeSellingPrice.toLocaleString('en-IN')}
                    </span>
                    {activeMrp > activeSellingPrice && (
                      <>
                        <span className="text-sm text-stone-400 line-through">
                          ₹{activeMrp.toLocaleString('en-IN')}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            isJewellery
                              ? 'text-[#b38728] bg-amber-50 border border-amber-200'
                              : 'text-[#ff2d85] bg-pink-50 border border-pink-200'
                          }`}
                        >
                          {activeDiscount}% OFF
                        </span>
                      </>
                    )}
                  </div>

                  <hr className="border-stone-100" />

                  {/* Stock Check Alert */}
                  {isOutOfStock ? (
                    <div className="py-2.5 px-3 rounded-xl bg-rose-50 border border-rose-200">
                      <p className="text-xs font-bold text-rose-600 uppercase tracking-wider text-center">
                        Out of Stock
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* 1. Database-driven Exact Color Shade Circles */}
                      {showColors.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-stone-600 block">
                            Color Shade: <b className="capitalize text-stone-900">{selectedColor}</b>
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
                                  className={`relative w-8 h-8 rounded-full transition-all flex items-center justify-center cursor-pointer shadow-xs ${
                                    isSelected
                                      ? isJewellery
                                        ? 'ring-2 ring-offset-2 ring-offset-white ring-[#D4AF37] scale-110'
                                        : 'ring-2 ring-offset-2 ring-offset-white ring-[#ff2d85] scale-110'
                                      : 'hover:scale-105 border border-stone-300'
                                  }`}
                                  style={{
                                    backgroundColor: resolvedHex,
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

                      {/* 2. Size Selection */}
                      {showSizes.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-xs font-semibold text-stone-600 block">
                            Select Size: <b className="text-stone-900">{selectedSize}</b>
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
                                        ? 'bg-[#D4AF37] text-stone-950 border-[#D4AF37] shadow-xs'
                                        : 'bg-[#ff2d85] text-white border-[#ff2d85] shadow-xs'
                                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-300'
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
                        <span className="text-xs font-semibold text-stone-600 block">
                          Quantity:
                        </span>
                        <div className="inline-flex items-center border border-stone-200 rounded-xl p-1 bg-stone-50">
                          <button
                            type="button"
                            onClick={() => setSingleQty((prev) => Math.max(1, prev - 1))}
                            className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-stone-900">
                            {singleQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSingleQty((prev) => prev + 1)}
                            className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
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
                                ? 'border-[#D4AF37] text-[#b38728] hover:bg-amber-50'
                                : 'border-[#ff2d85] text-[#ff2d85] hover:bg-pink-50'
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
                          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                            Selected Variants ({comboList.length})
                          </span>

                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 no-scrollbar">
                            {comboList.map((item) => {
                              const hexBg = resolveColorHex(item.color);
                              const light = item.color ? isLightColor(item.color) : false;

                              return (
                                <div
                                  key={item.id}
                                  style={{ backgroundColor: item.color ? hexBg : '#e2e8f0' }}
                                  className={`flex items-center justify-between pl-2 pr-1 py-1 rounded-full shadow-xs transition-all duration-200 border border-black/10 text-[11px] ${
                                    item.color
                                      ? light ? 'text-stone-900' : 'text-white'
                                      : 'text-stone-900'
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
                                        light ? 'bg-black/10 text-stone-900' : 'bg-white/30 text-white'
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
                                        light ? 'hover:bg-black/20 text-stone-800' : 'hover:bg-white/30 text-white'
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
                        <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 flex items-center justify-between animate-in fade-in duration-200">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-stone-500 block font-bold">
                              Total Items
                            </span>
                            <span className="text-xs font-semibold">
                              {totalComboItems} item{totalComboItems > 1 ? 's' : ''} selected
                            </span>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-sm font-bold ${
                                isJewellery ? 'text-[#b38728]' : 'text-[#ff2d85]'
                              }`}
                            >
                              ₹{totalComboPrice.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* 7. Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => handleFinalCheckoutAction(false)}
                      className={`flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isJewellery
                          ? 'border-[#D4AF37] text-[#b38728] hover:bg-amber-50'
                          : 'border-[#ff2d85] text-[#ff2d85] hover:bg-pink-50'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{totalComboItems > 0 ? `Add to Cart (${totalComboItems})` : 'Add to Bag'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => handleFinalCheckoutAction(true)}
                      className={`relative flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white shadow-md transition-all duration-300 active:scale-95 cursor-pointer overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed ${
                        isJewellery
                          ? 'bg-gradient-to-r from-[#D4AF37] via-[#DFBF58] to-[#B8860B] text-stone-950 shadow-amber-200 hover:brightness-105'
                          : 'bg-gradient-to-r from-[#ff2d85] to-[#ff639f] text-white shadow-pink-200 hover:brightness-105'
                      }`}
                    >
                      <Zap className="w-4 h-4 fill-current animate-bounce relative z-10 shrink-0" />
                      <span className="relative z-10 tracking-widest font-bold">
                        Instant Checkout
                      </span>
                    </button>
                  </div>

                  {/* Trust Badges */}
                  <div className="pt-2 border-t border-stone-100 grid grid-cols-3 gap-1 text-center text-stone-500">
                    <div className="flex flex-col items-center gap-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-stone-600" />
                      <span className="text-[9px]">100% Genuine</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Truck className="w-3.5 h-3.5 text-stone-600" />
                      <span className="text-[9px]">Fast Dispatch</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
                      <span className="text-[9px]">Easy Returns</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Picture Zoom Lightbox Modal */}
      {isZoomOpen && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 cursor-zoom-out"
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
              className="max-h-[82vh] w-auto object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
            />
            {activeProduct && (
              <p className="text-xs text-white/90 mt-3 font-medium">
                {activeProduct.name}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}