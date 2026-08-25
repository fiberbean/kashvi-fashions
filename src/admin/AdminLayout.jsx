import React, { useState, useEffect } from "react";
import "./admin.css";
import { supabase } from "../lib/supabase";
import { sendAutomatedEmail } from "../lib/emailService";
import AdminNotifications from "./AdminNotifications";

const makeId = prefix => `${prefix}${Date.now().toString().slice(-8)}`;

const extractStoragePath = (url, bucketName = "products") => {
  if (!url || typeof url !== "string") return null;
  const match = url.split(`/${bucketName}/`)[1];
  return match ? decodeURIComponent(match.split("?")[0]) : null;
};

const blankProduct = () => ({
  name: "",
  category: "",
  subCategory: "",
  brand: "",
  code: "",
  unit: "piece",
  mrp: "",
  sellingPrice: "",
  costPrice: "",
  weight: "",
  weightUnit: "grams",
  description: "",
  features: "",
  notes: "",
  images: [],
  sizes: [],
  colours: [],
  variants: {},
  active: true
});

const statuses = {
  new: "New Order",
  payment_verification: "Payment Verification",
  stock_check: "Stock Verification",
  payment_received: "Payment Received",
  packing: "Order Packed & Ready",
  shipped: "Dispatched (India Post)",
  delivered: "Delivered",
  stock_unavailable: "Stock Unavailable / Refund Required",
  refund_pending: "Refund Required",
  refund_initiated: "Refund Initiated",
  refund_completed: "Refund Completed"
};

const statusTone = status =>
  ["delivered", "payment_received", "refund_completed"].includes(status)
    ? "success"
    : status === "shipped" || status === "packing"
    ? "shipped"
    : status === "stock_check" || status === "processing"
    ? "processing"
    : ["stock_unavailable", "refund_pending"].includes(status)
    ? "danger"
    : "warning";

const generateWhatsAppTemplate = (order, stage, storeSettings) => {
  const storeName = storeSettings?.storeName || "Kashvi Fashions";
  const customerName = order.customer?.name || "Valued Customer";
  const orderId = order.id;
  const totalAmount = `₹${order.total}`;
  const itemsText = (order.items || [])
    .map((item, idx) => `  ${idx + 1}. *${item.name}* (${item.size}, ${item.colour || "Standard"}) x${item.qty}`)
    .join("\n");

  if (stage === "payment_verification" || stage === "new") {
    return `*🛍️ ORDER PLACED & VERIFICATION IN PROGRESS*\n\nDear *${customerName}*,\nThank you for shopping with *${storeName}*!\n\n📋 *Order Identifier:* #${orderId}\n💵 *Total Amount:* ${totalAmount} (Prepaid UPI)\n\n📦 *Selected Items:*\n${itemsText}\n\n⏳ *Status:* We are verifying your payment claim against bank statement. Once confirmed, stock check & packing will commence immediately.\n\nHelpline WhatsApp: ${storeSettings?.whatsapp || storeSettings?.whatsappNo || "919550724234"}`;
  }

  if (stage === "stock_check" || stage === "payment_received") {
    return `*💳 PAYMENT VERIFIED & CONFIRMED!*\n\nDear *${customerName}*,\nWe have successfully verified your payment of *${totalAmount}* for Order *#${orderId}*.\n\n✨ Your parcel items are undergoing final stock & quality inspection before packing.\n\n*${storeName}*`;
  }

  if (stage === "packing") {
    return `*📦 ORDER PACKED & READY FOR DISPATCH*\n\nDear *${customerName}*,\nYour order *#${orderId}* has been quality-checked, neatly packaged, and your India Post Speed Post label is generated.\n\n*${storeName}* · Quality Assured`;
  }

  if (stage === "shipped") {
    const courier = order.shipping?.courier || "India Post (Speed Post)";
    const trackingNo = order.shipping?.trackingId || "Assigned at counter";
    const trackingLink = `https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx`;

    return `*🚀 CONSIGNMENT DISPATCHED - INDIA POST*\n\nDear *${customerName}*,\nYour parcel for Order *#${orderId}* is on its way!\n\n📮 *Carrier:* ${courier}\n🔖 *Speed Post Article No:* *${trackingNo}*\n🔗 *India Post Live Tracking:* ${trackingLink}\n\nExpect delivery in 2–4 business days. - *${storeName}*`;
  }

  if (stage === "refund_pending" || stage === "stock_unavailable") {
    return `*⚠️ ORDER UPDATE: STOCK UNAVAILABLE*\n\nDear *${customerName}*,\nWe regret to inform you that selected items for Order *#${orderId}* are currently out of stock.\n\n💵 Full refund of *${totalAmount}* is initiated to your UPI account.\n\nHelpline: ${storeSettings?.whatsapp || storeSettings?.whatsappNo || "919550724234"}`;
  }

  if (stage === "refund_completed") {
    return `*💸 REFUND PROCESSED SUCCESSFULLY*\n\nDear *${customerName}*,\nFull refund of *${totalAmount}* for Order *#${orderId}* has been processed to your bank account.\n\nUTR / Ref No: *${order.refund?.utr || "Verified"}*\n\nTeam *${storeName}*`;
  }

  if (stage === "delivered") {
    return `*🎉 PARCEL DELIVERED!*\n\nDear *${customerName}*,\nYour order *#${orderId}* has been delivered.\n\nWe hope you love your new purchase! Reply directly if you have any questions.\n\nWarm regards,\n*Team ${storeName}*`;
  }

  return `Hello *${customerName}*, update on your order *#${orderId}*: Status is *${statuses[stage] || stage}*. - *${storeName}*`;
};

export default function AdminLayout({
  page,
  navigate,
  products,
  setProducts,
  orders,
  setOrders,
  categories,
  setCategories,
  subCategories,
  setSubCategories,
  colours,
  setColours,
  sizes,
  setSizes,
  units,
  setUnits,
  pincodes,
  setPincodes,
  banners,
  setBanners,
  settings,
  setSettings,
  notify,
  onStore
}) {
  const [productDialog, setProductDialog] = useState(null);
  const [inspectOrder, setInspectOrder] = useState(null);
  const [printLabelOrder, setPrintLabelOrder] = useState(null);
  const [masterDialog, setMasterDialog] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [whatsappPrompt, setWhatsappPrompt] = useState(null);
  const [customSlipWeight, setCustomSlipWeight] = useState(150);

  // UTR & TRACKING DIALOGS
  const [utrDialog, setUtrDialog] = useState({ open: false, orderId: "", type: "payment", value: "" });
  const [trackingDialog, setTrackingDialog] = useState({ open: false, orderId: "", trackingId: "", courier: "India Post (Speed Post)" });

  const inventoryPages = ["products", "categories", "subCategories", "colours", "sizes", "units"];
  const settingsPages = ["settings", "rateCards"];

  const [inventoryOpen, setInventoryOpen] = useState(() => inventoryPages.includes(page));
  const [settingsOpen, setSettingsOpen] = useState(() => settingsPages.includes(page));

  const [settingsDraft, setSettingsDraft] = useState({
    ...settings,
    defaultCourier: settings?.defaultCourier || "India Post (Speed Post)"
  });
  const [rateCards, setRateCards] = useState([]);
  const [isRateEditing, setIsRateEditing] = useState(false);

  // Filters & Search
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");

  // Pincodes
  const [pincodeSearch, setPincodeSearch] = useState("");
  const [pincodeZoneFilter, setPincodeZoneFilter] = useState("All");
  const [pincodePage, setPincodePage] = useState(1);
  const [pincodeRowsPerPage, setPincodeRowsPerPage] = useState(25);

  // Banner
  const [bannerEditing, setBannerEditing] = useState(null);
  const [bannerDraft, setBannerDraft] = useState({
    tagline: "",
    mainTitle: "",
    desc: "",
    ctaText: "Explore Catalogue ↓",
    sideBadge: "ORIGINAL DESIGN",
    sideTitle: "",
    watermark: "KASHVI"
  });

  useEffect(() => {
    setSettingsDraft({
      ...settings,
      defaultCourier: settings?.defaultCourier || "India Post (Speed Post)"
    });
  }, [settings]);

  useEffect(() => {
    if (page === "rateCards") {
      const loadRateCards = async () => {
        const { data, error } = await supabase
          .from("delivery_rate_cards")
          .select("*")
          .order("weight_from", { ascending: true });
        if (!error && data) setRateCards(data);
      };
      loadRateCards();
    }
  }, [page]);

  /* Image Upload */
  const handleProductImageUpload = async e => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    notify("Uploading image(s)...");

    try {
      const uploadedObjects = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `catalogue/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("products")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("products").getPublicUrl(filePath);
        if (data?.publicUrl) {
          const defaultColor = productDialog.value.colours?.[0] || "";
          uploadedObjects.push({ url: data.publicUrl, colour: defaultColor });
        }
      }

      setProductDialog(prev => {
        const existingImages = (prev.value.images || []).map(img =>
          typeof img === "string" ? { url: img, colour: "" } : img
        );
        return {
          ...prev,
          value: { ...prev.value, images: [...existingImages, ...uploadedObjects] }
        };
      });

      notify(`${uploadedObjects.length} image(s) uploaded successfully!`);
    } catch (err) {
      console.error(err);
      notify(`Upload failed: ${err.message || "Check storage bucket"}`);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  /* Remove Image */
  const handleRemoveProductImage = async (imgItem, idx) => {
    const imgUrl = typeof imgItem === "string" ? imgItem : imgItem.url;
    const storagePath = extractStoragePath(imgUrl, "products");

    setProductDialog(prev => {
      const updated = prev.value.images.filter((_, i) => i !== idx);
      return { ...prev, value: { ...prev.value, images: updated } };
    });

    if (storagePath) {
      try {
        await supabase.storage.from("products").remove([storagePath]);
        notify("Image deleted from Cloud Storage");
      } catch (err) {
        console.error("Storage delete error:", err);
      }
    }
  };

  /* Save Settings directly to Supabase Database (100% No localStorage Quota Limits) */
  const handleSaveSettings = async () => {
    try {
      const payloadData = {
        storeName: settingsDraft.storeName || "Kashvi Fashions",
        upiId: settingsDraft.upiId || "",
        whatsapp: settingsDraft.whatsapp || settingsDraft.whatsappNo || "",
        whatsappNo: settingsDraft.whatsappNo || settingsDraft.whatsapp || "",
        originPincode: settingsDraft.originPincode || "533001",
        logoUrl: settingsDraft.logoUrl || "",
        deliveryCharge: settingsDraft.deliveryCharge || 0,
        defaultCourier: settingsDraft.defaultCourier || "India Post (Registered Parcel)",
        instagramUrl: settingsDraft.instagramUrl || "",
        facebookUrl: settingsDraft.facebookUrl || "",
        youtubeUrl: settingsDraft.youtubeUrl || ""
      };

      setSettings(payloadData);

      // 1. Direct Save to store_settings table
      const storeSettingsPayload = {
        id: "main_settings",
        store_name: payloadData.storeName,
        upi_id: payloadData.upiId,
        whatsapp_no: payloadData.whatsappNo,
        origin_pincode: payloadData.originPincode,
        default_courier: payloadData.defaultCourier,
        instagram_url: payloadData.instagramUrl,
        facebook_url: payloadData.facebookUrl,
        youtube_url: payloadData.youtubeUrl,
        logo_url: payloadData.logoUrl,
        data: payloadData,
        updated_at: new Date().toISOString()
      };

      await supabase.from("store_settings").upsert(storeSettingsPayload, { onConflict: "id" });

      notify("✅ Store settings, logo & social media saved to Database successfully!");
    } catch (err) {
      console.error("Save error:", err);
      notify(`Failed to save settings: ${err.message || "Database error"}`);
    }
  };

  const handleLogoUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    notify("Uploading logo...");
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `store_logo_${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) {
        const reader = new FileReader();
        reader.onloadend = () => setSettingsDraft(prev => ({ ...prev, logoUrl: reader.result }));
        reader.readAsDataURL(file);
      } else {
        const { data } = supabase.storage.from("products").getPublicUrl(filePath);
        if (data?.publicUrl) {
          setSettingsDraft(prev => ({ ...prev, logoUrl: data.publicUrl }));
        }
      }
      notify("Logo file ready to save!");
    } catch (err) {
      console.warn("Logo upload fallback to inline:", err);
      const reader = new FileReader();
      reader.onloadend = () => setSettingsDraft(prev => ({ ...prev, logoUrl: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  /* Save Product */
  const handleSaveProduct = async item => {
    try {
      const formattedImages = (item.images || []).map(img => {
        if (typeof img === "string") return { url: img, colour: "" };
        return { url: img.url, colour: img.colour || "" };
      }).filter(img => Boolean(img.url));

      const productPayload = {
        id: item.id || makeId("PR"),
        name: item.name.trim(),
        category: item.category || null,
        sub_category: item.subCategory || null,
        colour: item.colours?.join(", ") || null,
        size: item.sizes?.join(", ") || null,
        unit: item.unit || null,
        brand: item.brand || null,
        model_no: item.code || null,
        selling_price: Number(item.sellingPrice || 0),
        cost_price: Number(item.costPrice || 0),
        mrp: Number(item.mrp || 0),
        weight: Number(item.weight || 0),
        weight_unit: item.weightUnit || "grams",
        description: item.description || "",
        features: item.features || "",
        notes: item.notes || "",
        images: formattedImages,
        variants: item.variants || {},
        active: item.active !== false
      };

      if (item.id) {
        const { data, error } = await supabase.from("products").update(productPayload).eq("id", item.id).select().single();
        if (error) throw error;
        setProducts(list => list.map(old => (old.id === item.id ? { ...item, ...data } : old)));
        notify("Product updated successfully");
      } else {
        const { data, error } = await supabase.from("products").insert([productPayload]).select().single();
        if (error) throw error;
        setProducts(list => [{ ...item, ...data }, ...list]);
        notify("Product created successfully!");
      }
      setProductDialog(null);
    } catch (err) {
      notify(`Error: ${err.message || "Failed to save product"}`);
    }
  };

  /* Delete Product */
  const handleDeleteProduct = async id => {
    const productToDelete = products.find(p => p.id === id);

    setConfirmDialog({
      title: "Delete Product?",
      text: "Are you sure you want to permanently delete this product and its images?",
      action: async () => {
        try {
          if (productToDelete?.images?.length) {
            const filePaths = productToDelete.images
              .map(img => extractStoragePath(typeof img === "string" ? img : img.url, "products"))
              .filter(Boolean);
            if (filePaths.length > 0) await supabase.storage.from("products").remove(filePaths);
          }
          const { error } = await supabase.from("products").delete().eq("id", id);
          if (error) throw error;
          setProducts(list => list.filter(p => p.id !== id));
          notify("Product deleted");
        } catch (err) {
          notify(err.message || "Failed to delete");
        }
      }
    });
  };

  const handleSaveBanner = () => {
    if (!bannerDraft.mainTitle) return notify("Main headline is required");
    if (bannerEditing) {
      setBanners(list => list.map(b => (b.id === bannerEditing.id ? { ...bannerDraft, id: bannerEditing.id } : b)));
      notify("Banner slide updated");
    } else {
      setBanners(list => [{ ...bannerDraft, id: makeId("BAN") }, ...list]);
      notify("Banner slide added");
    }
    setBannerEditing(null);
  };

  const handleSaveMaster = async (type, item) => {
    const tableMap = {
      categories: "categories",
      subCategories: "sub_categories",
      colours: "colours",
      sizes: "sizes",
      units: "units",
      pincodes: "pincodes"
    };
    const tableName = tableMap[type];

    try {
      let payload = {};
      const isActive = item.active !== false && item.active !== "false";
      
      if (type === "categories") payload = { name: item.name.trim(), active: isActive };
      else if (type === "subCategories") payload = { name: item.name.trim(), category_id: item.category_id || null, active: isActive };
      else if (type === "colours") payload = { name: item.name.trim(), active: isActive };
      else if (type === "sizes") payload = { name: item.name.trim(), active: isActive };
      else if (type === "units") payload = { name: item.name.trim(), short_name: item.shortName || item.short_name || null, active: isActive };
      else if (type === "pincodes") {
        payload = {
          pincode: String(item.pincode).trim(),
          city: item.city || item.office || "",
          state: item.state || "",
          zone_type: item.zone_type || item.zone || "Local",
          active: isActive
        };
      }

      if (item.id) {
        const { data, error } = await supabase.from(tableName).update(payload).eq("id", item.id).select().single();
        if (error) throw error;
        const setters = { categories: setCategories, subCategories: setSubCategories, colours: setColours, sizes: setSizes, units: setUnits, pincodes: setPincodes };
        setters[type](list => list.map(old => (old.id === item.id ? { ...old, ...data } : old)));
        notify("Master record updated");
      } else {
        const prefixMap = { categories: "CAT", subCategories: "SUB", colours: "CLR", sizes: "SZ", units: "UN", pincodes: "PIN" };
        payload.id = makeId(prefixMap[type] || "REC");
        const { data, error } = await supabase.from(tableName).insert([payload]).select().single();
        if (error) throw error;
        const setters = { categories: setCategories, subCategories: setSubCategories, colours: setColours, sizes: setSizes, units: setUnits, pincodes: setPincodes };
        setters[type](list => [data, ...list]);
        notify("Master record created successfully!");
      }
      setMasterDialog(null);
    } catch (err) {
      notify(`Error: ${err.message || "Failed to save record"}`);
    }
  };

  const handleDeleteMaster = (type, item) => {
    setConfirmDialog({
      title: "Delete Specification?",
      text: "Are you sure you want to remove this registry entry?",
      action: async () => {
        const tableMap = { categories: "categories", subCategories: "sub_categories", colours: "colours", sizes: "sizes", units: "units", pincodes: "pincodes" };
        const { error } = await supabase.from(tableMap[type]).delete().eq("id", item.id);
        if (error) return notify(error.message || "Failed to delete");
        const setters = { categories: setCategories, subCategories: setSubCategories, colours: setColours, sizes: setSizes, units: setUnits, pincodes: setPincodes };
        setters[type](list => list.filter(old => old.id !== item.id));
        notify("Specification deleted");
      }
    });
  };

  /* Step Transition with Automated Background Email & WhatsApp Prompt */
  const handleUpdateOrderStatus = async (orderId, newStatus, extra = {}) => {
    try {
      const current = orders.find(o => o.id === orderId);
      const updatedHistory = [...(current?.history || []), { status: newStatus, at: new Date().toISOString() }];
      const updatedOrder = { ...current, ...extra, status: newStatus, history: updatedHistory };

      const { error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          history: updatedHistory,
          payment: updatedOrder.payment,
          shipping: updatedOrder.shipping,
          refund: updatedOrder.refund
        })
        .eq("id", orderId);

      if (error) throw error;
      setOrders(list => list.map(o => (o.id === orderId ? updatedOrder : o)));
      if (inspectOrder?.id === orderId) setInspectOrder(updatedOrder);
      notify(`Order pipeline moved to: ${statuses[newStatus] || newStatus}`);

      // 1. AUTOMATIC EMAIL NOTIFICATION
      const recipientEmail = updatedOrder.customer?.email || updatedOrder.customer_email;
      sendAutomatedEmail({
        toEmail: recipientEmail,
        customerName: updatedOrder.customer?.name,
        orderId: updatedOrder.id,
        stage: newStatus,
        total: updatedOrder.total,
        items: updatedOrder.items,
        trackingNo: updatedOrder.shipping?.trackingId,
        courier: updatedOrder.shipping?.courier
      });

      // 2. WHATSAPP CONFIRMATION PROMPT MODAL
      const messageBody = generateWhatsAppTemplate(updatedOrder, newStatus, settings);
      setWhatsappPrompt({
        order: updatedOrder,
        stage: newStatus,
        message: messageBody
      });

    } catch (err) {
      console.error(err);
      notify("Failed to update order status");
    }
  };

  const handleSaveUTR = () => {
    if (!utrDialog.value.trim()) return notify("Please enter the UTR Number");
    if (utrDialog.type === "payment") {
      handleUpdateOrderStatus(utrDialog.orderId, "stock_check", {
        payment: {
          status: "received",
          utr: utrDialog.value.trim(),
          confirmedAt: new Date().toISOString()
        }
      });
    } else {
      handleUpdateOrderStatus(utrDialog.orderId, "refund_completed", {
        refund: {
          status: "completed",
          utr: utrDialog.value.trim(),
          refundedAt: new Date().toISOString()
        }
      });
    }
    setUtrDialog({ open: false, orderId: "", type: "payment", value: "" });
  };

  const handleSaveDispatch = () => {
    if (!trackingDialog.trackingId.trim()) return notify("Please enter India Post tracking number");
    handleUpdateOrderStatus(trackingDialog.orderId, "shipped", {
      shipping: {
        courier: trackingDialog.courier,
        trackingId: trackingDialog.trackingId.trim(),
        dispatchedAt: new Date().toISOString()
      }
    });
    setTrackingDialog({ open: false, orderId: "", trackingId: "", courier: "India Post (Speed Post)" });
  };

  /* Filtered Lists */
  const filteredProducts = products.filter(
    p =>
      (!productSearch ||
        p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.code?.toLowerCase().includes(productSearch.toLowerCase())) &&
      (!productCategoryFilter || p.category === productCategoryFilter)
  );

  const filteredOrders = orders.filter(
    o =>
      (orderFilter === "all" ||
        o.status === orderFilter ||
        (orderFilter === "refund" && o.status?.includes("refund"))) &&
      (!orderSearch ||
        o.id?.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customer?.name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customer?.phone?.includes(orderSearch))
  );

  const filteredPincodes = pincodes.filter(p => {
    const matchSearch =
      !pincodeSearch ||
      p.pincode?.includes(pincodeSearch.trim()) ||
      p.city?.toLowerCase().includes(pincodeSearch.toLowerCase()) ||
      p.state?.toLowerCase().includes(pincodeSearch.toLowerCase());

    const matchZone =
      pincodeZoneFilter === "All" ||
      (p.zone_type || p.zone)?.toLowerCase() === pincodeZoneFilter.toLowerCase();

    return matchSearch && matchZone;
  });

  const totalPincodePages = Math.ceil(filteredPincodes.length / pincodeRowsPerPage) || 1;
  const paginatedPincodes = filteredPincodes.slice(
    (pincodePage - 1) * pincodeRowsPerPage,
    pincodePage * pincodeRowsPerPage
  );

  return (
    <div className="admin-app">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-logo-card">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Store Logo" className="admin-logo-img" />
            ) : (
              <span className="admin-logo-fallback">KASHVI</span>
            )}
          </div>
        </div>

        <div className="admin-menu-title">WORKSPACE NAVIGATION</div>

        <button
          type="button"
          className={`admin-menu-item ${page === "dashboard" ? "active" : ""}`}
          onClick={() => navigate("dashboard")}
        >
          <span className="admin-item-icon">⌂</span>
          <span>Dashboard</span>
        </button>

        <div className="admin-nav-group">
          <button
            type="button"
            className={`admin-menu-item admin-nav-group-btn ${inventoryPages.includes(page) ? "active" : ""}`}
            onClick={() => setInventoryOpen(v => !v)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="admin-item-icon">🗃</span>
              <span>Inventory</span>
            </div>
            <span className={`admin-chevron ${inventoryOpen ? "open" : ""}`}>▾</span>
          </button>

          {inventoryOpen && (
            <div className="admin-nav-sub-menu">
              <button
                type="button"
                className={`admin-menu-item admin-sub-item ${page === "products" ? "active" : ""}`}
                onClick={() => navigate("products")}
              >
                <span className="admin-item-icon">▦</span>
                <span>Products</span>
              </button>
              <button
                type="button"
                className={`admin-menu-item admin-sub-item ${page === "categories" ? "active" : ""}`}
                onClick={() => navigate("categories")}
              >
                <span className="admin-item-icon">◉</span>
                <span>Categories</span>
              </button>
              <button
                type="button"
                className={`admin-menu-item admin-sub-item ${page === "subCategories" ? "active" : ""}`}
                onClick={() => navigate("subCategories")}
              >
                <span className="admin-item-icon">◇</span>
                <span>Sub-Categories</span>
              </button>
              <button
                type="button"
                className={`admin-menu-item admin-sub-item ${page === "colours" ? "active" : ""}`}
                onClick={() => navigate("colours")}
              >
                <span className="admin-item-icon">●</span>
                <span>Colours</span>
              </button>
              <button
                type="button"
                className={`admin-menu-item admin-sub-item ${page === "sizes" ? "active" : ""}`}
                onClick={() => navigate("sizes")}
              >
                <span className="admin-item-icon">□</span>
                <span>Sizes</span>
              </button>
              <button
                type="button"
                className={`admin-menu-item admin-sub-item ${page === "units" ? "active" : ""}`}
                onClick={() => navigate("units")}
              >
                <span className="admin-item-icon">◫</span>
                <span>Units</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className={`admin-menu-item ${page === "orders" ? "active" : ""}`}
          onClick={() => navigate("orders")}
        >
          <span className="admin-item-icon">▤</span>
          <span>Orders Pipeline ({orders.length})</span>
        </button>

        <button
          type="button"
          className={`admin-menu-item ${page === "banners" ? "active" : ""}`}
          onClick={() => navigate("banners")}
        >
          <span className="admin-item-icon">🎨</span>
          <span>Banner Studio</span>
        </button>

        <button
          type="button"
          className={`admin-menu-item ${page === "pincodes" ? "active" : ""}`}
          onClick={() => navigate("pincodes")}
        >
          <span className="admin-item-icon">⌖</span>
          <span>Pincode Database ({pincodes.length})</span>
        </button>

        <div className="admin-nav-group">
          <button
            type="button"
            className={`admin-menu-item admin-nav-group-btn ${settingsPages.includes(page) ? "active" : ""}`}
            onClick={() => setSettingsOpen(v => !v)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="admin-item-icon">⚙</span>
              <span>Settings</span>
            </div>
            <span className={`admin-chevron ${settingsOpen ? "open" : ""}`}>▾</span>
          </button>

          {settingsOpen && (
            <div className="admin-nav-sub-menu">
              <button
                type="button"
                className={`admin-menu-item admin-sub-item ${page === "settings" ? "active" : ""}`}
                onClick={() => {
                  setSettingsDraft({
                    ...settings,
                    defaultCourier: settings?.defaultCourier || "India Post (Speed Post)"
                  });
                  navigate("settings");
                }}
              >
                <span className="admin-item-icon">⚙</span>
                <span>Store Info</span>
              </button>
              <button
                type="button"
                className={`admin-menu-item admin-sub-item ${page === "rateCards" ? "active" : ""}`}
                onClick={() => navigate("rateCards")}
              >
                <span className="admin-item-icon">🚚</span>
                <span>Delivery Rates</span>
              </button>
            </div>
          )}
        </div>

        <button type="button" className="admin-store-link" onClick={onStore}>
          <span>↗</span>
          <span>Live Storefront</span>
        </button>

        <div className="admin-sidebar-bottom">
          <div className="admin-profile">
            <span className="admin-avatar">A</span>
            <div>
              <strong style={{ fontSize: "13px", color: "#fff" }}>Admin Workspace</strong>
              <small style={{ color: "var(--admin-text-muted)", display: "block", fontSize: "11px" }}>
                Super Administrator
              </small>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="admin-main-content">
        <header className="admin-topbar">
          <div>
            <h1>{page === "subCategories" ? "SUB-CATEGORIES" : page === "rateCards" ? "DELIVERY RATES" : page.toUpperCase()}</h1>
            <p>Smart Operations, Real-time Fulfilment Hub & Matrix Controls</p>
          </div>
          <div className="admin-top-actions" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <AdminNotifications orders={orders} navigateToOrders={() => navigate("orders")} />
            <span className="admin-notification">
              ● {orders.filter(item => item.status === "payment_verification").length} Verification Pending
            </span>
          </div>
        </header>

        {/* 1. DASHBOARD */}
        {page === "dashboard" && (
          <div className="admin-page">
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <span className="admin-stat-icon">▦</span>
                <div>
                  <small>Total Products</small>
                  <strong>{products.length}</strong>
                </div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-icon">▤</span>
                <div>
                  <small>Total Orders</small>
                  <strong>{orders.length}</strong>
                </div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-icon">✦</span>
                <div>
                  <small>Pending Verification</small>
                  <strong>{orders.filter(o => o.status === "payment_verification").length}</strong>
                </div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-icon">✓</span>
                <div>
                  <small>Delivered</small>
                  <strong>{orders.filter(o => o.status === "delivered").length}</strong>
                </div>
              </div>
            </div>

            <div className="admin-dashboard-grid">
              <div className="admin-section-card">
                <div className="admin-section-header">
                  <h3>Recent Orders</h3>
                  <button type="button" className="admin-text-button" onClick={() => navigate("orders")}>
                    View all →
                  </button>
                </div>
                {orders.length > 0 ? (
                  orders.slice(0, 5).map(o => (
                    <div key={o.id} className="admin-list-row">
                      <div>
                        <strong>#{o.id}</strong>
                        <small>{o.customer?.name} · {o.customer?.phone}</small>
                      </div>
                      <span className={`admin-status-badge ${statusTone(o.status)}`}>
                        {statuses[o.status] || o.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "var(--admin-text-muted)", fontSize: "13px" }}>No orders placed yet.</p>
                )}
              </div>

              <div className="admin-section-card">
                <div className="admin-section-header">
                  <h3>Recent Products</h3>
                  <button type="button" className="admin-text-button" onClick={() => navigate("products")}>
                    View all →
                  </button>
                </div>
                {products.length > 0 ? (
                  products.slice(0, 5).map(p => {
                    const sp = p.sellingPrice || p.selling_price;
                    return (
                      <div key={p.id} className="admin-list-row">
                        <div>
                          <strong>{p.name}</strong>
                          <small>{p.category} · ₹{sp}</small>
                        </div>
                        <span className={`admin-status-badge ${p.active !== false ? "success" : "danger"}`}>
                          {p.active !== false ? "Active" : "Inactive"}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color: "var(--admin-text-muted)", fontSize: "13px" }}>No products in catalogue.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. PRODUCTS */}
        {page === "products" && (
          <div className="admin-page">
            <div className="admin-section-card">
              <div className="admin-section-header">
                <h3>Product Catalogue ({filteredProducts.length})</h3>
                <button
                  type="button"
                  className="admin-primary-btn"
                  onClick={() => setProductDialog({ kind: "new", value: blankProduct() })}
                >
                  + Add Product
                </button>
              </div>

              <div className="admin-filter-bar">
                <input
                  placeholder="Search products by title, SKU..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
                <select
                  value={productCategoryFilter}
                  onChange={e => setProductCategoryFilter(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Selling Price</th>
                      <th>Weight</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => {
                      const mrp = Number(p.mrp || 0);
                      const sp = Number(p.sellingPrice || p.selling_price || 0);
                      const firstImgObj = Array.isArray(p.images) ? p.images[0] : p.image;
                      const img = typeof firstImgObj === "object" ? firstImgObj?.url : firstImgObj;

                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div className="admin-product-thumb">
                                {img ? <img src={img} alt={p.name} /> : "K"}
                              </div>
                              <div>
                                <strong style={{ color: "#fff", display: "block" }}>{p.name}</strong>
                                <small style={{ color: "var(--admin-text-muted)" }}>
                                  {p.code ? `SKU: ${p.code}` : "No SKU"}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <strong>{p.category || "-"}</strong>
                            {p.subCategory && <small style={{ display: "block", color: "var(--admin-brand-accent)" }}>{p.subCategory}</small>}
                          </td>
                          <td>
                            <strong>₹{sp}</strong>
                            {mrp > sp && <del style={{ color: "var(--admin-text-muted)", fontSize: "12px", marginLeft: "6px" }}>₹{mrp}</del>}
                          </td>
                          <td>{p.weight || 0} {p.weightUnit || p.weight_unit || "g"}</td>
                          <td>
                            <span className={`admin-status-badge ${p.active !== false ? "success" : "danger"}`}>
                              {p.active !== false ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="admin-secondary-btn"
                              style={{ padding: "6px 12px", marginRight: 6 }}
                              onClick={() => {
                                const parsedImages = (p.images || []).map(imgItem =>
                                  typeof imgItem === "string" ? { url: imgItem, colour: "" } : imgItem
                                );
                                setProductDialog({ kind: "edit", value: { ...blankProduct(), ...p, images: parsedImages } });
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="admin-secondary-btn"
                              style={{ padding: "6px 12px", color: "var(--admin-status-danger)" }}
                              onClick={() => handleDeleteProduct(p.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. PINCODES DATABASE */}
        {page === "pincodes" && (
          <div className="admin-page">
            <div className="admin-section-card">
              <div className="admin-section-header">
                <div>
                  <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>Pincode Logistics Hub</span>
                    <span style={{ fontSize: "12px", background: "rgba(45, 212, 191, 0.15)", color: "var(--admin-brand-accent)", padding: "3px 10px", borderRadius: "20px", border: "1px solid var(--admin-brand-accent)" }}>
                      Total {pincodes.length} Entries Loaded
                    </span>
                  </h3>
                  <p style={{ color: "var(--admin-text-muted)", fontSize: "12.5px", marginTop: "4px" }}>
                    Serviceable dispatch routes mapped to state and regional shipping zones.
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-primary-btn"
                  onClick={() => setMasterDialog({ type: "pincodes", value: { pincode: "", city: "", state: "Andhra Pradesh", zone_type: "Local", active: true } })}
                >
                  + Add Pincode
                </button>
              </div>

              <div className="admin-filter-bar" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr auto auto", gap: 12 }}>
                <input
                  placeholder="Search by 6-digit Pincode, City or State..."
                  value={pincodeSearch}
                  onChange={e => {
                    setPincodeSearch(e.target.value);
                    setPincodePage(1);
                  }}
                />

                <select
                  value={pincodeZoneFilter}
                  onChange={e => {
                    setPincodeZoneFilter(e.target.value);
                    setPincodePage(1);
                  }}
                >
                  <option value="All">All Shipping Zones</option>
                  <option value="Local">Local</option>
                  <option value="Within State">Within State</option>
                  <option value="Zone/Metro">Zone/Metro</option>
                  <option value="Other States">Other States</option>
                </select>

                <select
                  value={pincodeRowsPerPage}
                  onChange={e => {
                    setPincodeRowsPerPage(Number(e.target.value));
                    setPincodePage(1);
                  }}
                  style={{ width: "120px" }}
                >
                  <option value={25}>25 / Page</option>
                  <option value={50}>50 / Page</option>
                  <option value={100}>100 / Page</option>
                  <option value={250}>250 / Page</option>
                </select>

                <div style={{ display: "flex", alignItems: "center", fontSize: "12.5px", color: "var(--admin-text-secondary)", whiteSpace: "nowrap" }}>
                  Showing {filteredPincodes.length === 0 ? 0 : (pincodePage - 1) * pincodeRowsPerPage + 1}–{Math.min(pincodePage * pincodeRowsPerPage, filteredPincodes.length)} of {filteredPincodes.length}
                </div>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Pincode</th>
                      <th>City / Region</th>
                      <th>State</th>
                      <th>Shipping Zone</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPincodes.length > 0 ? (
                      paginatedPincodes.map(item => (
                        <tr key={item.id}>
                          <td>
                            <strong style={{ fontSize: "14px", color: "#fff", letterSpacing: "1px" }}>
                              {item.pincode}
                            </strong>
                          </td>
                          <td>{item.city || item.office || item.district || "-"}</td>
                          <td>{item.state || "Andhra Pradesh"}</td>
                          <td>
                            <span className={`admin-status-badge ${item.zone_type === "Local" ? "success" : item.zone_type === "Within State" ? "processing" : "shipped"}`}>
                              {item.zone_type || item.zone || "Local"}
                            </span>
                          </td>
                          <td>
                            <span className={`admin-status-badge ${item.active !== false ? "success" : "danger"}`}>
                              {item.active !== false ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="admin-secondary-btn"
                              style={{ padding: "5px 10px", marginRight: 6 }}
                              onClick={() => setMasterDialog({ type: "pincodes", value: item })}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="admin-secondary-btn"
                              style={{ padding: "5px 10px", color: "var(--admin-status-danger)" }}
                              onClick={() => handleDeleteMaster("pincodes", item)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "28px", color: "var(--admin-text-muted)" }}>
                          No pincode records match the search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPincodePages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "18px", padding: "8px 0" }}>
                  <span style={{ fontSize: "12.5px", color: "var(--admin-text-muted)" }}>
                    Page <b>{pincodePage}</b> of <b>{totalPincodePages}</b> ({filteredPincodes.length} matching pincodes)
                  </span>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      disabled={pincodePage === 1}
                      onClick={() => setPincodePage(1)}
                      style={{ padding: "6px 12px", opacity: pincodePage === 1 ? 0.5 : 1 }}
                    >
                      « First
                    </button>
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      disabled={pincodePage === 1}
                      onClick={() => setPincodePage(prev => Math.max(1, prev - 1))}
                      style={{ padding: "6px 12px", opacity: pincodePage === 1 ? 0.5 : 1 }}
                    >
                      ‹ Prev
                    </button>
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      disabled={pincodePage === totalPincodePages}
                      onClick={() => setPincodePage(prev => Math.min(totalPincodePages, prev + 1))}
                      style={{ padding: "6px 12px", opacity: pincodePage === totalPincodePages ? 0.5 : 1 }}
                    >
                      Next ›
                    </button>
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      disabled={pincodePage === totalPincodePages}
                      onClick={() => setPincodePage(totalPincodePages)}
                      style={{ padding: "6px 12px", opacity: pincodePage === totalPincodePages ? 0.5 : 1 }}
                    >
                      Last »
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. OTHER MASTER REGISTRIES */}
        {["categories", "subCategories", "colours", "sizes", "units"].includes(page) && (
          <div className="admin-page">
            <div className="admin-section-card">
              <div className="admin-section-header">
                <h3>
                  {page === "subCategories" ? "Sub-Categories" : page.toUpperCase()} Specification Registry ({(page === "categories" ? categories : page === "subCategories" ? subCategories : page === "colours" ? colours : page === "sizes" ? sizes : units).length})
                </h3>
                <button
                  type="button"
                  className="admin-primary-btn"
                  onClick={() => setMasterDialog({ type: page, value: { name: "", active: true } })}
                >
                  + Add {page.replace("subCategories", "Sub-Category").slice(0, -1)}
                </button>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Identifier / Name</th>
                      {page === "subCategories" && <th>Parent Category</th>}
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      page === "categories"
                        ? categories
                        : page === "subCategories"
                        ? subCategories
                        : page === "colours"
                        ? colours
                        : page === "sizes"
                        ? sizes
                        : units
                    ).map(item => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.name}</strong>
                          {item.shortName && <small style={{ display: "block", color: "var(--admin-text-muted)" }}>Short: {item.shortName}</small>}
                        </td>
                        {page === "subCategories" && (
                          <td>{categories.find(c => c.id === item.category_id)?.name || "-"}</td>
                        )}
                        <td>
                          <span className={`admin-status-badge ${item.active !== false ? "success" : "danger"}`}>
                            {item.active !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-secondary-btn"
                            style={{ padding: "6px 12px", marginRight: 6 }}
                            onClick={() => setMasterDialog({ type: page, value: item })}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-secondary-btn"
                            style={{ padding: "6px 12px", color: "var(--admin-status-danger)" }}
                            onClick={() => handleDeleteMaster(page, item)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. VISUAL ORDER PIPELINE */}
        {page === "orders" && (
          <div className="admin-page">
            <div className="admin-order-pipeline-tabs">
              <button
                type="button"
                className={`pipeline-tab-chip ${orderFilter === "all" ? "active" : ""}`}
                onClick={() => setOrderFilter("all")}
              >
                <span>All Orders</span>
                <b>{orders.length}</b>
              </button>

              <button
                type="button"
                className={`pipeline-tab-chip ${orderFilter === "payment_verification" ? "active" : ""}`}
                onClick={() => setOrderFilter("payment_verification")}
              >
                <span>1. Verification</span>
                <b>{orders.filter(o => o.status === "payment_verification").length}</b>
              </button>

              <button
                type="button"
                className={`pipeline-tab-chip ${orderFilter === "stock_check" ? "active" : ""}`}
                onClick={() => setOrderFilter("stock_check")}
              >
                <span>2. Stock Check</span>
                <b>{orders.filter(o => o.status === "stock_check").length}</b>
              </button>

              <button
                type="button"
                className={`pipeline-tab-chip ${orderFilter === "packing" ? "active" : ""}`}
                onClick={() => setOrderFilter("packing")}
              >
                <span>3. Packed & Ready</span>
                <b>{orders.filter(o => o.status === "packing").length}</b>
              </button>

              <button
                type="button"
                className={`pipeline-tab-chip ${orderFilter === "shipped" ? "active" : ""}`}
                onClick={() => setOrderFilter("shipped")}
              >
                <span>4. Dispatched</span>
                <b>{orders.filter(o => o.status === "shipped").length}</b>
              </button>

              <button
                type="button"
                className={`pipeline-tab-chip ${orderFilter === "delivered" ? "active" : ""}`}
                onClick={() => setOrderFilter("delivered")}
              >
                <span>5. Delivered</span>
                <b>{orders.filter(o => o.status === "delivered").length}</b>
              </button>
            </div>

            <div className="admin-section-card" style={{ marginTop: "16px" }}>
              <div className="admin-section-header">
                <h3>Customer Orders Pipeline ({filteredOrders.length})</h3>
              </div>

              <div className="admin-filter-bar">
                <input
                  placeholder="Search by Order ID, Phone, Customer Name..."
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                />
                <select value={orderFilter} onChange={e => setOrderFilter(e.target.value)}>
                  <option value="all">All Pipeline Stages</option>
                  {Object.entries(statuses).map(([st, label]) => (
                    <option key={st} value={st}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer Details</th>
                      <th>Items & Weight</th>
                      <th>Total Amount</th>
                      <th>Current Stage</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map(o => (
                        <tr key={o.id}>
                          <td>
                            <strong style={{ fontFamily: "monospace", fontSize: "14px", color: "var(--admin-brand-accent)" }}>
                              #{o.id}
                            </strong>
                            <small style={{ display: "block", color: "var(--admin-text-muted)", fontSize: "11px" }}>
                              {new Date(o.created_at || o.createdAt || Date.now()).toLocaleDateString()}
                            </small>
                          </td>
                          <td>
                            <strong style={{ color: "#fff" }}>{o.customer?.name}</strong>
                            <small style={{ display: "block", color: "var(--admin-text-muted)" }}>
                              {o.customer?.phone} · {o.customer?.city}, {o.customer?.pincode}
                            </small>
                          </td>
                          <td>
                            <strong>{o.items?.length || 0} item(s)</strong>
                            <small style={{ display: "block", color: "var(--admin-text-muted)" }}>
                              {o.total_weight || o.totalWeight || 0} grams
                            </small>
                          </td>
                          <td>
                            <strong style={{ fontSize: "14.5px" }}>₹{o.total}</strong>
                            {o.payment?.utr && (
                              <small style={{ display: "block", color: "#4ade80", fontSize: "11px" }}>
                                UTR: {o.payment.utr}
                              </small>
                            )}
                          </td>
                          <td>
                            <span className={`admin-status-badge ${statusTone(o.status)}`}>
                              {statuses[o.status] || o.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "6px" }}>
                              {["packing", "shipped", "delivered"].includes(o.status) && (
                                <button
                                  type="button"
                                  className="admin-secondary-btn"
                                  style={{ padding: "6px 10px", borderColor: "var(--admin-brand-accent)", color: "var(--admin-brand-accent)" }}
                                  title="Print India Post Address Slip"
                                  onClick={() => setPrintLabelOrder(o)}
                                >
                                  🖨️ Slip
                                </button>
                              )}

                              <button
                                type="button"
                                className="admin-primary-btn"
                                style={{ padding: "6px 12px", fontSize: "12px" }}
                                onClick={() => {
                                  setInspectOrder({
                                    ...o,
                                    shipping: {
                                      courier: o.shipping?.courier || settings?.defaultCourier || "India Post (Speed Post)",
                                      trackingId: o.shipping?.trackingId || ""
                                    }
                                  });
                                }}
                              >
                                Manage Stage →
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "var(--admin-text-muted)" }}>
                          No orders in this stage.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 6. BANNER STUDIO */}
        {page === "banners" && (
          <div className="admin-page">
            <div className="admin-section-card">
              <h3>{bannerEditing ? "Edit Banner Slide" : "Create New Banner Slide"}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                <label className="admin-field">
                  Top Tagline
                  <input
                    value={bannerDraft.tagline}
                    onChange={e => setBannerDraft({ ...bannerDraft, tagline: e.target.value })}
                    placeholder="e.g. SUMMER LUXURY"
                  />
                </label>
                <label className="admin-field">
                  Background Watermark
                  <input
                    value={bannerDraft.watermark}
                    onChange={e => setBannerDraft({ ...bannerDraft, watermark: e.target.value })}
                    placeholder="e.g. KASHVI"
                  />
                </label>
                <label className="admin-field" style={{ gridColumn: "1 / -1" }}>
                  Main Headline (Use Enter for new line)
                  <textarea
                    rows={2}
                    value={bannerDraft.mainTitle}
                    onChange={e => setBannerDraft({ ...bannerDraft, mainTitle: e.target.value })}
                    placeholder="EFFORTLESS ELEGANCE.&#10;PRECISION TAILORED."
                  />
                </label>
                <label className="admin-field" style={{ gridColumn: "1 / -1" }}>
                  Description Paragraph
                  <textarea
                    rows={2}
                    value={bannerDraft.desc}
                    onChange={e => setBannerDraft({ ...bannerDraft, desc: e.target.value })}
                  />
                </label>
                <label className="admin-field">
                  Right Side Badge
                  <input
                    value={bannerDraft.sideBadge}
                    onChange={e => setBannerDraft({ ...bannerDraft, sideBadge: e.target.value })}
                  />
                </label>
                <label className="admin-field">
                  Right Side Headline
                  <input
                    value={bannerDraft.sideTitle}
                    onChange={e => setBannerDraft({ ...bannerDraft, sideTitle: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
                {bannerEditing && (
                  <button
                    type="button"
                    className="admin-secondary-btn"
                    onClick={() => {
                      setBannerEditing(null);
                      setBannerDraft({
                        tagline: "",
                        mainTitle: "",
                        desc: "",
                        ctaText: "Explore Catalogue ↓",
                        sideBadge: "ORIGINAL DESIGN",
                        sideTitle: "",
                        watermark: "KASHVI"
                      });
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button type="button" className="admin-primary-btn" onClick={handleSaveBanner}>
                  {bannerEditing ? "Update Banner" : "+ Add Banner Slide"}
                </button>
              </div>
            </div>

            <div className="admin-section-card">
              <h3>Active Banner Slides ({banners.length})</h3>
              {banners.map(b => (
                <div key={b.id} className="admin-list-row">
                  <div>
                    <strong>{b.mainTitle?.replace(/\n/g, " ")}</strong>
                    <small>{b.tagline} · Watermark: {b.watermark}</small>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      style={{ padding: "6px 12px" }}
                      onClick={() => {
                        setBannerEditing(b);
                        setBannerDraft(b);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      style={{ padding: "6px 12px", color: "var(--admin-status-danger)" }}
                      onClick={() => setBanners(list => list.filter(item => item.id !== b.id))}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. SETTINGS */}
        {page === "settings" && (
          <div className="admin-page">
            <div className="admin-section-card">
              <h3>Store Configuration & Logistics Branding</h3>
              <p style={{ color: "var(--admin-text-secondary)", fontSize: "13px", marginTop: "4px" }}>
                Update your store credentials, UPI address, warehouse origin and default delivery carrier.
              </p>

              <div className="admin-logo-setting-box">
                <div className="admin-logo-preview">
                  {settingsDraft.logoUrl ? (
                    <img src={settingsDraft.logoUrl} alt="Logo Preview" />
                  ) : (
                    <div className="admin-logo-empty">No Logo Set</div>
                  )}
                </div>

                <div className="admin-logo-inputs">
                  <label className="admin-field">
                    Logo Image URL (Or Upload Below)
                    <input
                      value={settingsDraft.logoUrl || ""}
                      onChange={e => setSettingsDraft({ ...settingsDraft, logoUrl: e.target.value })}
                      placeholder="https://example.com/logo.png"
                    />
                  </label>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
                    <label className="admin-upload-btn">
                      📁 Upload Logo File
                      <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                    </label>
                    {settingsDraft.logoUrl && (
                      <button
                        type="button"
                        className="admin-secondary-btn"
                        style={{ color: "var(--admin-status-danger)" }}
                        onClick={() => setSettingsDraft({ ...settingsDraft, logoUrl: "" })}
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
                <label className="admin-field">
                  Store Display Name
                  <input
                    value={settingsDraft.storeName || ""}
                    onChange={e => setSettingsDraft({ ...settingsDraft, storeName: e.target.value })}
                  />
                </label>
                <label className="admin-field">
                  UPI Virtual Payment Address (VPA)
                  <input
                    value={settingsDraft.upiId || ""}
                    onChange={e => setSettingsDraft({ ...settingsDraft, upiId: e.target.value })}
                    placeholder="kashvi@upi"
                  />
                </label>
                <label className="admin-field">
                  WhatsApp Business Contact
                  <input
                    value={settingsDraft.whatsappNo || settingsDraft.whatsapp || ""}
                    onChange={e => setSettingsDraft({ ...settingsDraft, whatsapp: e.target.value, whatsappNo: e.target.value })}
                    placeholder="91XXXXXXXXXX"
                  />
                </label>
                <label className="admin-field">
                  Warehouse Origin Pincode
                  <input
                    value={settingsDraft.originPincode || ""}
                    onChange={e => setSettingsDraft({ ...settingsDraft, originPincode: e.target.value })}
                  />
                </label>

                <label className="admin-field" style={{ gridColumn: "1 / -1" }}>
                  Default Courier Partner (Speed Dispatch)
                  <select
                    value={settingsDraft.defaultCourier || "India Post (Registered Parcel)"}
                    onChange={e => setSettingsDraft({ ...settingsDraft, defaultCourier: e.target.value })}
                  >
                    <option value="India Post (Speed Post)">India Post (Speed Post / Parcel)</option>
                    <option value="India Post (Registered Parcel)">India Post (Registered Parcel)</option>
                    <option value="DTDC Courier">DTDC Courier</option>
                    <option value="Delhivery Express">Delhivery Express</option>
                    <option value="Blue Dart Express">Blue Dart Express</option>
                    <option value="Professional Courier">The Professional Couriers</option>
                  </select>
                </label>

                <label className="admin-field">
                  Instagram Profile URL
                  <input
                    value={settingsDraft.instagramUrl || ""}
                    onChange={e => setSettingsDraft({ ...settingsDraft, instagramUrl: e.target.value })}
                    placeholder="https://instagram.com/your_handle"
                  />
                </label>

                <label className="admin-field">
                  Facebook Page URL
                  <input
                    value={settingsDraft.facebookUrl || ""}
                    onChange={e => setSettingsDraft({ ...settingsDraft, facebookUrl: e.target.value })}
                    placeholder="https://facebook.com/your_page"
                  />
                </label>

                <label className="admin-field" style={{ gridColumn: "1 / -1" }}>
                  YouTube Channel URL
                  <input
                    value={settingsDraft.youtubeUrl || ""}
                    onChange={e => setSettingsDraft({ ...settingsDraft, youtubeUrl: e.target.value })}
                    placeholder="https://youtube.com/@your_channel"
                  />
                </label>
              </div>

              <button
                type="button"
                className="admin-primary-btn"
                style={{ marginTop: 24 }}
                onClick={handleSaveSettings}
              >
                Save Store Settings & Logistics
              </button>
            </div>
          </div>
        )}

        {/* 8. DELIVERY RATES */}
        {page === "rateCards" && (
          <div className="admin-page">
            <div className="admin-section-card">
              <div className="admin-section-header">
                <div>
                  <h3>India Post Delivery Rate Matrix</h3>
                  <p style={{ color: "var(--admin-text-secondary)", fontSize: "12.5px" }}>
                    Weight slab charges mapped directly to India Post speed postal tariffs.
                  </p>
                </div>
                {!isRateEditing && (
                  <button type="button" className="admin-primary-btn" onClick={() => setIsRateEditing(true)}>
                    Configure Rates
                  </button>
                )}
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Weight Slab</th>
                      <th>Local Rate (₹)</th>
                      <th>Within State (₹)</th>
                      <th>Zone / Metro (₹)</th>
                      <th>Other States (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateCards.map(item => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.id === "RATE008" ? "Every additional 1 kg" : `${item.weight_from}–${item.weight_to} g`}</strong>
                        </td>
                        <td>
                          <input
                            type="number"
                            style={{ width: "90px", padding: "6px", textAlign: "center", background: "rgba(255,255,255,0.05)", border: "1px solid var(--admin-border-subtle)", color: "#fff", borderRadius: 4 }}
                            value={item.id === "RATE008" ? item.additional_kg_rate_local : item.local_rate}
                            readOnly={!isRateEditing}
                            onChange={e =>
                              setRateCards(list =>
                                list.map(rc =>
                                  rc.id === item.id
                                    ? { ...rc, [item.id === "RATE008" ? "additional_kg_rate_local" : "local_rate"]: Number(e.target.value) }
                                    : rc
                                )
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            style={{ width: "90px", padding: "6px", textAlign: "center", background: "rgba(255,255,255,0.05)", border: "1px solid var(--admin-border-subtle)", color: "#fff", borderRadius: 4 }}
                            value={item.id === "RATE008" ? item.additional_kg_rate_within_state : item.within_state_rate}
                            readOnly={!isRateEditing}
                            onChange={e =>
                              setRateCards(list =>
                                list.map(rc =>
                                  rc.id === item.id
                                    ? { ...rc, [item.id === "RATE008" ? "additional_kg_rate_within_state" : "within_state_rate"]: Number(e.target.value) }
                                    : rc
                                )
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            style={{ width: "90px", padding: "6px", textAlign: "center", background: "rgba(255,255,255,0.05)", border: "1px solid var(--admin-border-subtle)", color: "#fff", borderRadius: 4 }}
                            value={item.id === "RATE008" ? item.additional_kg_rate_zone_metro : item.zone_metro_rate}
                            readOnly={!isRateEditing}
                            onChange={e =>
                              setRateCards(list =>
                                list.map(rc =>
                                  rc.id === item.id
                                    ? { ...rc, [item.id === "RATE008" ? "additional_kg_rate_zone_metro" : "zone_metro_rate"]: Number(e.target.value) }
                                    : rc
                                )
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            style={{ width: "90px", padding: "6px", textAlign: "center", background: "rgba(255,255,255,0.05)", border: "1px solid var(--admin-border-subtle)", color: "#fff", borderRadius: 4 }}
                            value={item.id === "RATE008" ? item.additional_kg_rate_other_states : item.other_states_rate}
                            readOnly={!isRateEditing}
                            onChange={e =>
                              setRateCards(list =>
                                list.map(rc =>
                                  rc.id === item.id
                                    ? { ...rc, [item.id === "RATE008" ? "additional_kg_rate_other_states" : "other_states_rate"]: Number(e.target.value) }
                                    : rc
                                )
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isRateEditing && (
                <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button type="button" className="admin-secondary-btn" onClick={() => setIsRateEditing(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="admin-primary-btn"
                    onClick={async () => {
                      for (const item of rateCards) {
                        await supabase.from("delivery_rate_cards").update(item).eq("id", item.id);
                      }
                      setIsRateEditing(false);
                      notify("Delivery rate matrix saved successfully");
                    }}
                  >
                    Save Rate Matrix
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* PRODUCT MODAL */}
      {productDialog && (
        <div className="admin-modal-backdrop" onClick={() => setProductDialog(null)}>
          <div className="admin-modal-card" style={{ maxWidth: "860px" }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{productDialog.value.id ? "Edit Product Specification & Matrix" : "Create New Product Entry"}</h2>
              <button type="button" onClick={() => setProductDialog(null)}>×</button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-form-block">
                <div className="admin-block-header">
                  <h4>General Identifiers & Taxonomy</h4>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 16 }}>
                  <label className="admin-field" style={{ gridColumn: "1 / -1" }}>
                    Product Title *
                    <input
                      value={productDialog.value.name}
                      placeholder="e.g. Pure Silk Night Slip"
                      onChange={e => setProductDialog({ ...productDialog, value: { ...productDialog.value, name: e.target.value } })}
                    />
                  </label>

                  <label className="admin-field">
                    Primary Category *
                    <select
                      value={productDialog.value.category}
                      onChange={e => setProductDialog({ ...productDialog, value: { ...productDialog.value, category: e.target.value, subCategory: "" } })}
                    >
                      <option value="">Select Category...</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </label>

                  <label className="admin-field">
                    Sub-Category
                    <select
                      value={productDialog.value.subCategory}
                      onChange={e => setProductDialog({ ...productDialog, value: { ...productDialog.value, subCategory: e.target.value } })}
                    >
                      <option value="">Select Sub-Category...</option>
                      {subCategories
                        .filter(s => {
                          const parent = categories.find(c => c.name === productDialog.value.category);
                          return !parent || s.category_id === parent.id;
                        })
                        .map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </label>

                  <label className="admin-field">
                    SKU / Identifier
                    <input
                      value={productDialog.value.code}
                      placeholder="KF-2026-001"
                      onChange={e => setProductDialog({ ...productDialog, value: { ...productDialog.value, code: e.target.value } })}
                    />
                  </label>
                </div>
              </div>

              <div className="admin-form-block">
                <div className="admin-block-header">
                  <h4>Pricing Tiers & Weight Calculations</h4>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
                  <label className="admin-field">
                    Selling Price (₹) *
                    <input
                      type="number"
                      value={productDialog.value.sellingPrice}
                      onChange={e => setProductDialog({ ...productDialog, value: { ...productDialog.value, sellingPrice: e.target.value } })}
                    />
                  </label>
                  <label className="admin-field">
                    Standard MRP (₹)
                    <input
                      type="number"
                      value={productDialog.value.mrp}
                      onChange={e => setProductDialog({ ...productDialog, value: { ...productDialog.value, mrp: e.target.value } })}
                    />
                  </label>
                  <label className="admin-field">
                    Weight Value *
                    <input
                      type="number"
                      value={productDialog.value.weight}
                      onChange={e => setProductDialog({ ...productDialog, value: { ...productDialog.value, weight: e.target.value } })}
                    />
                  </label>
                  <label className="admin-field">
                    Weight Dimension
                    <select
                      value={productDialog.value.weightUnit || "grams"}
                      onChange={e => setProductDialog({ ...productDialog, value: { ...productDialog.value, weightUnit: e.target.value } })}
                    >
                      <option value="grams">Grams (g)</option>
                      <option value="kg">Kilograms (kg)</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="admin-form-block">
                <div className="admin-block-header">
                  <h4>Sizes & Colours Matrix Assignment</h4>
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--admin-text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Select Selectable Sizes
                  </span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {sizes.map(sz => {
                      const selected = productDialog.value.sizes?.includes(sz.name);
                      return (
                        <button
                          type="button"
                          key={sz.id}
                          className={`admin-chip-btn ${selected ? "active" : ""}`}
                          onClick={() => {
                            const current = productDialog.value.sizes || [];
                            const updated = selected ? current.filter(x => x !== sz.name) : [...current, sz.name];
                            setProductDialog({ ...productDialog, value: { ...productDialog.value, sizes: updated } });
                          }}
                        >
                          {sz.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--admin-text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Select Selectable Colours
                  </span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {colours.map(clr => {
                      const selected = productDialog.value.colours?.includes(clr.name);
                      return (
                        <button
                          type="button"
                          key={clr.id}
                          className={`admin-chip-btn ${selected ? "active" : ""}`}
                          onClick={() => {
                            const current = productDialog.value.colours || [];
                            const updated = selected ? current.filter(x => x !== clr.name) : [...current, clr.name];
                            setProductDialog({ ...productDialog, value: { ...productDialog.value, colours: updated } });
                          }}
                        >
                          {clr.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {productDialog.value.sizes?.length > 0 && productDialog.value.colours?.length > 0 && (
                  <div className="admin-stock-matrix-box">
                    <div style={{ marginBottom: 12 }}>
                      <strong style={{ fontSize: "13px", color: "#fff" }}>Inventory Allocation Matrix</strong>
                      <p style={{ color: "var(--admin-text-muted)", fontSize: "11.5px" }}>Define individual stock available per size and colour.</p>
                    </div>
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Size</th>
                          {productDialog.value.colours.map(c => <th key={c}>{c}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {productDialog.value.sizes.map(sz => (
                          <tr key={sz}>
                            <td><strong>{sz}</strong></td>
                            {productDialog.value.colours.map(clr => {
                              const key = `${sz}__${clr}`;
                              return (
                                <td key={clr}>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    style={{ width: "70px", padding: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--admin-border-subtle)", color: "#fff", borderRadius: 4, textAlign: "center" }}
                                    value={productDialog.value.variants?.[key] || ""}
                                    onChange={e => {
                                      const updatedVariants = { ...(productDialog.value.variants || {}), [key]: e.target.value };
                                      setProductDialog({ ...productDialog, value: { ...productDialog.value, variants: updatedVariants } });
                                    }}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* GALLERY & COLOR TAGGING */}
              <div className="admin-form-block">
                <div className="admin-block-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4>Product Gallery & Colour-Variant Tagging</h4>
                    <p style={{ color: "var(--admin-text-muted)", fontSize: "12px", margin: "2px 0 0" }}>
                      Assign each photo to its corresponding colour. Removing a photo here will also clean it from Supabase Storage.
                    </p>
                  </div>
                  <label className="admin-primary-btn" style={{ cursor: "pointer", fontSize: "12px", padding: "6px 14px" }}>
                    {uploadingImage ? "Uploading..." : "+ Upload Image Files"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleProductImageUpload}
                      disabled={uploadingImage}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                {(productDialog.value.images || []).length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14, marginTop: 14 }}>
                    {productDialog.value.images.map((imgItem, idx) => {
                      const imgUrl = typeof imgItem === "string" ? imgItem : imgItem.url;
                      const assignedColor = typeof imgItem === "object" ? (imgItem.colour || "") : "";

                      return (
                        <div key={idx} style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)", position: "relative" }}>
                          <div style={{ height: "130px", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--admin-border-subtle)" }}>
                            <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                          
                          <div style={{ marginTop: "8px" }}>
                            <small style={{ fontSize: "10.5px", color: "var(--admin-brand-accent)", fontWeight: 700, display: "block", marginBottom: "3px" }}>
                              Assigned Colour:
                            </small>
                            <select
                              style={{ width: "100%", padding: "5px 8px", fontSize: "11.5px", background: "#0a1310", border: "1px solid var(--admin-border-subtle)", color: "#fff", borderRadius: "4px" }}
                              value={assignedColor}
                              onChange={e => {
                                const newColor = e.target.value;
                                const updatedImages = [...productDialog.value.images];
                                updatedImages[idx] = { url: imgUrl, colour: newColor };
                                setProductDialog({ ...productDialog, value: { ...productDialog.value, images: updatedImages } });
                              }}
                            >
                              <option value="">General / All Colours</option>
                              {productDialog.value.colours?.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            title="Delete photo permanently from Cloud Storage"
                            onClick={() => handleRemoveProductImage(imgItem, idx)}
                            style={{
                              position: "absolute",
                              top: 4,
                              right: 4,
                              background: "rgba(239, 68, 68, 0.9)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "50%",
                              width: "22px",
                              height: "22px",
                              cursor: "pointer",
                              fontSize: "12px",
                              display: "grid",
                              placeItems: "center"
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: "24px", border: "1.5px dashed var(--admin-border-subtle)", borderRadius: "8px", textAlign: "center", color: "var(--admin-text-muted)", fontSize: "13px", marginTop: "10px" }}>
                    No photos uploaded yet. Tap <b>+ Upload Image Files</b> to select from device.
                  </div>
                )}
              </div>

              <div className="admin-form-block" style={{ borderBottom: "none" }}>
                <div className="admin-block-header">
                  <h4>Product Descriptions & Status</h4>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <label className="admin-field" style={{ gridColumn: "1 / -1" }}>
                    Overview Story / Description
                    <textarea
                      rows={3}
                      value={productDialog.value.description}
                      placeholder="Thoughtfully designed for daily silhouette and enduring comfort."
                      onChange={e => setProductDialog({ ...productDialog, value: { ...productDialog.value, description: e.target.value } })}
                    />
                  </label>
                  <label className="admin-field">
                    Material & Fit Features
                    <textarea
                      rows={2}
                      value={productDialog.value.features}
                      placeholder="Breathable silk blend, precision tailored."
                      onChange={e => setProductDialog({ ...productDialog, value: { ...productDialog.value, features: e.target.value } })}
                    />
                  </label>
                  <label className="admin-field">
                    Listing Status
                    <select
                      value={productDialog.value.active !== false ? "true" : "false"}
                      onChange={e => setProductDialog({ ...productDialog, value: { ...productDialog.value, active: e.target.value === "true" } })}
                    >
                      <option value="true">Active (Visible in Store)</option>
                      <option value="false">Inactive (Hidden)</option>
                    </select>
                  </label>
                </div>
              </div>

              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button type="button" className="admin-secondary-btn" onClick={() => setProductDialog(null)}>
                  Discard
                </button>
                <button
                  type="button"
                  className="admin-primary-btn"
                  onClick={() => {
                    if (productDialog.value.name.trim() && productDialog.value.category && productDialog.value.sellingPrice) {
                      handleSaveProduct(productDialog.value);
                    } else {
                      notify("Please fill required fields: Product Name, Category & Selling Price");
                    }
                  }}
                >
                  Save & Publish Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MASTER REGISTRY DIALOG */}
      {masterDialog && (
        <div className="admin-modal-backdrop" onClick={() => setMasterDialog(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{masterDialog.value.id ? "Edit Specification" : "Create Specification"}</h2>
              <button type="button" onClick={() => setMasterDialog(null)}>×</button>
            </div>

            <div className="admin-modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {masterDialog.type === "pincodes" ? (
                  <>
                    <label className="admin-field">
                      Pincode *
                      <input
                        value={masterDialog.value.pincode || ""}
                        onChange={e => setMasterDialog({ ...masterDialog, value: { ...masterDialog.value, pincode: e.target.value } })}
                      />
                    </label>
                    <label className="admin-field">
                      City / District
                      <input
                        value={masterDialog.value.city || ""}
                        onChange={e => setMasterDialog({ ...masterDialog, value: { ...masterDialog.value, city: e.target.value } })}
                      />
                    </label>
                    <label className="admin-field">
                      State
                      <input
                        value={masterDialog.value.state || ""}
                        onChange={e => setMasterDialog({ ...masterDialog, value: { ...masterDialog.value, state: e.target.value } })}
                      />
                    </label>
                    <label className="admin-field">
                      Zone Classification
                      <select
                        value={masterDialog.value.zone_type || masterDialog.value.zone || "Local"}
                        onChange={e => setMasterDialog({ ...masterDialog, value: { ...masterDialog.value, zone_type: e.target.value, zone: e.target.value } })}
                      >
                        <option value="Local">Local</option>
                        <option value="Within State">Within State</option>
                        <option value="Zone/Metro">Zone/Metro</option>
                        <option value="Other States">Other States</option>
                      </select>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="admin-field" style={{ gridColumn: masterDialog.type === "subCategories" ? "span 1" : "1 / -1" }}>
                      {masterDialog.type === "subCategories" ? "Sub-Category Name *" : "Name *"}
                      <input
                        value={masterDialog.value.name || ""}
                        placeholder="e.g. Nightwear, Silk, Red..."
                        onChange={e => setMasterDialog({ ...masterDialog, value: { ...masterDialog.value, name: e.target.value } })}
                      />
                    </label>
                    {masterDialog.type === "subCategories" && (
                      <label className="admin-field">
                        Parent Category *
                        <select
                          value={masterDialog.value.category_id || ""}
                          onChange={e => setMasterDialog({ ...masterDialog, value: { ...masterDialog.value, category_id: e.target.value } })}
                        >
                          <option value="">Select Category...</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </label>
                    )}
                    {masterDialog.type === "units" && (
                      <label className="admin-field">
                        Short Symbol (e.g. pc, set)
                        <input
                          value={masterDialog.value.shortName || masterDialog.value.short_name || ""}
                          onChange={e => setMasterDialog({ ...masterDialog, value: { ...masterDialog.value, shortName: e.target.value } })}
                        />
                      </label>
                    )}

                    <label className="admin-field" style={{ gridColumn: "1 / -1" }}>
                      Status
                      <select
                        value={masterDialog.value.active !== false ? "true" : "false"}
                        onChange={e => setMasterDialog({ ...masterDialog, value: { ...masterDialog.value, active: e.target.value === "true" } })}
                      >
                        <option value="true">Active (Visible)</option>
                        <option value="false">Inactive (Hidden)</option>
                      </select>
                    </label>
                  </>
                )}
              </div>

              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button type="button" className="admin-secondary-btn" onClick={() => setMasterDialog(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-primary-btn"
                  onClick={() => handleSaveMaster(masterDialog.type, masterDialog.value)}
                >
                  Save Registry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT ORDER (HORIZONTAL STEPPER & ACTIONS) */}
      {inspectOrder && (
        <div className="admin-modal-backdrop" onClick={() => setInspectOrder(null)}>
          <div className="admin-modal-card" style={{ maxWidth: "820px" }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Order Pipeline Fulfilment: #{inspectOrder.id}</h2>
                <small style={{ color: "var(--admin-brand-accent)", fontWeight: 700 }}>
                  Current Status: {statuses[inspectOrder.status] || inspectOrder.status}
                </small>
              </div>
              <button type="button" onClick={() => setInspectOrder(null)}>×</button>
            </div>

            <div className="admin-modal-body">
              {/* CLEAN HORIZONTAL STEPPER */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", padding: "14px 16px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)", margin: "4px 0 16px" }}>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <span style={{ display: "inline-block", width: "24px", height: "24px", lineHeight: "24px", borderRadius: "50%", background: "#10b981", color: "#000", fontWeight: "bold", fontSize: "12px" }}>1</span>
                  <small style={{ display: "block", fontSize: "11px", color: "#10b981", marginTop: "4px", fontWeight: "bold" }}>Claimed</small>
                </div>
                <div style={{ flex: 1, height: "2px", background: ["stock_check", "payment_received", "packing", "shipped", "delivered"].includes(inspectOrder.status) ? "#10b981" : "rgba(255,255,255,0.1)" }} />
                
                <div style={{ textAlign: "center", flex: 1 }}>
                  <span style={{ display: "inline-block", width: "24px", height: "24px", lineHeight: "24px", borderRadius: "50%", background: ["stock_check", "payment_received", "packing", "shipped", "delivered"].includes(inspectOrder.status) ? "#10b981" : "rgba(255,255,255,0.1)", color: "#fff", fontWeight: "bold", fontSize: "12px" }}>2</span>
                  <small style={{ display: "block", fontSize: "11px", color: ["stock_check", "payment_received", "packing", "shipped", "delivered"].includes(inspectOrder.status) ? "#10b981" : "var(--admin-text-muted)", marginTop: "4px" }}>Payment OK</small>
                </div>
                <div style={{ flex: 1, height: "2px", background: ["packing", "shipped", "delivered"].includes(inspectOrder.status) ? "#10b981" : "rgba(255,255,255,0.1)" }} />

                <div style={{ textAlign: "center", flex: 1 }}>
                  <span style={{ display: "inline-block", width: "24px", height: "24px", lineHeight: "24px", borderRadius: "50%", background: ["packing", "shipped", "delivered"].includes(inspectOrder.status) ? "#10b981" : "rgba(255,255,255,0.1)", color: "#fff", fontWeight: "bold", fontSize: "12px" }}>3</span>
                  <small style={{ display: "block", fontSize: "11px", color: ["packing", "shipped", "delivered"].includes(inspectOrder.status) ? "#10b981" : "var(--admin-text-muted)", marginTop: "4px" }}>Stock/Packed</small>
                </div>
                <div style={{ flex: 1, height: "2px", background: ["shipped", "delivered"].includes(inspectOrder.status) ? "#10b981" : "rgba(255,255,255,0.1)" }} />

                <div style={{ textAlign: "center", flex: 1 }}>
                  <span style={{ display: "inline-block", width: "24px", height: "24px", lineHeight: "24px", borderRadius: "50%", background: ["shipped", "delivered"].includes(inspectOrder.status) ? "#10b981" : "rgba(255,255,255,0.1)", color: "#fff", fontWeight: "bold", fontSize: "12px" }}>4</span>
                  <small style={{ display: "block", fontSize: "11px", color: ["shipped", "delivered"].includes(inspectOrder.status) ? "#10b981" : "var(--admin-text-muted)", marginTop: "4px" }}>Dispatched</small>
                </div>
                <div style={{ flex: 1, height: "2px", background: inspectOrder.status === "delivered" ? "#10b981" : "rgba(255,255,255,0.1)" }} />

                <div style={{ textAlign: "center", flex: 1 }}>
                  <span style={{ display: "inline-block", width: "24px", height: "24px", lineHeight: "24px", borderRadius: "50%", background: inspectOrder.status === "delivered" ? "#10b981" : "rgba(255,255,255,0.1)", color: "#fff", fontWeight: "bold", fontSize: "12px" }}>5</span>
                  <small style={{ display: "block", fontSize: "11px", color: inspectOrder.status === "delivered" ? "#10b981" : "var(--admin-text-muted)", marginTop: "4px" }}>Delivered</small>
                </div>
              </div>

              {/* DATE & TIME AUDIT, RECIPIENT & DESTINATION */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 14, background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 10, border: "1px solid var(--admin-border-subtle)", marginTop: 14 }}>
                {/* 1. DATE & TIME AUDIT */}
                <div style={{ borderRight: "1px solid rgba(255,255,255,0.08)", paddingRight: "10px" }}>
                  <small style={{ color: "var(--admin-text-muted)", display: "block", fontSize: "10.5px", fontWeight: "bold" }}>
                    ⏰ ORDER TIMESTAMP
                  </small>
                  <strong style={{ display: "block", fontSize: "14px", color: "#38bdf8", marginTop: "4px", fontFamily: "monospace" }}>
                    {new Date(inspectOrder.created_at || inspectOrder.createdAt || inspectOrder.payment?.claimedAt || Date.now()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginTop: "2px" }}>
                    📅 {new Date(inspectOrder.created_at || inspectOrder.createdAt || inspectOrder.payment?.claimedAt || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", weekday: "short" })}
                  </span>
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "#fbbf24", fontWeight: "bold" }}>
                    Mode: {inspectOrder.payment?.method || "Prepaid UPI"} (₹{inspectOrder.total})
                  </div>
                </div>

                {/* 2. RECIPIENT DETAILS */}
                <div>
                  <small style={{ color: "var(--admin-text-muted)", display: "block", fontSize: "10.5px", fontWeight: "bold" }}>
                    👤 RECIPIENT DETAILS
                  </small>
                  <strong style={{ display: "block", fontSize: "13.5px", color: "#fff", marginTop: "4px" }}>
                    {inspectOrder.customer?.name}
                  </strong>
                  <span style={{ fontSize: "12px", color: "var(--admin-brand-accent)", fontWeight: 700, display: "block", marginTop: "2px" }}>
                    📞 {inspectOrder.customer?.phone}
                  </span>
                  <small style={{ color: "#94a3b8", fontSize: "11px" }}>{inspectOrder.customer?.email}</small>
                </div>

                {/* 3. DELIVERY DESTINATION */}
                <div>
                  <small style={{ color: "var(--admin-text-muted)", display: "block", fontSize: "10.5px", fontWeight: "bold" }}>
                    📍 DESTINATION
                  </small>
                  <p style={{ fontSize: "12px", color: "var(--admin-text-secondary)", margin: "4px 0 0", lineHeight: "1.4" }}>
                    {inspectOrder.customer?.address}, {inspectOrder.customer?.city || ""}
                  </p>
                  <div style={{ marginTop: "4px", fontSize: "12px", color: "#2dd4bf", fontWeight: "bold", fontFamily: "monospace" }}>
                    PIN: {inspectOrder.customer?.pincode}
                  </div>
                </div>
              </div>

              {/* ITEMS LIST */}
              <div style={{ marginTop: 18 }}>
                <h4 style={{ fontSize: "13.5px", marginBottom: 10 }}>Order Consignment Items ({inspectOrder.items?.length || 0})</h4>
                {(inspectOrder.items || []).map((it, idx) => (
                  <div key={idx} className="admin-list-row">
                    <div>
                      <strong style={{ color: "#fff" }}>{it.name}</strong>
                      <small style={{ color: "var(--admin-brand-accent)" }}>Size: {it.size} · Colour: {it.colour} · Qty: {it.qty}</small>
                    </div>
                    <strong>₹{it.price * it.qty}</strong>
                  </div>
                ))}
              </div>

              {/* STAGE CONTROLS */}
              <div style={{ marginTop: 22, padding: "16px", background: "rgba(45, 212, 191, 0.05)", border: "1px solid rgba(45, 212, 191, 0.2)", borderRadius: 10 }}>
                <h4 style={{ fontSize: "13.5px", color: "var(--admin-brand-accent)", marginBottom: 12 }}>
                  Stage Fulfilment Actions
                </h4>

                {inspectOrder.status === "payment_verification" && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className="admin-primary-btn"
                      onClick={() => setUtrDialog({ open: true, orderId: inspectOrder.id, type: "payment", value: "" })}
                    >
                      ✓ Confirm Payment (Enter Bank UTR)
                    </button>
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      style={{ color: "var(--admin-status-danger)" }}
                      onClick={() => handleUpdateOrderStatus(inspectOrder.id, "refund_pending")}
                    >
                      Payment Issue / Cancel
                    </button>
                  </div>
                )}

                {inspectOrder.status === "stock_check" && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className="admin-primary-btn"
                      style={{ background: "#166534" }}
                      onClick={() => handleUpdateOrderStatus(inspectOrder.id, "packing")}
                    >
                      ✓ Stock Verified (Proceed to Packing)
                    </button>
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      style={{ color: "var(--admin-status-danger)", borderColor: "var(--admin-status-danger)" }}
                      onClick={() => handleUpdateOrderStatus(inspectOrder.id, "refund_pending")}
                    >
                      ✕ Stock Unavailable (Issue Refund)
                    </button>
                  </div>
                )}

                {inspectOrder.status === "packing" && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className="admin-primary-btn"
                      style={{ background: "#0284c7" }}
                      onClick={() => {
                        setCustomSlipWeight(inspectOrder.total_weight || inspectOrder.totalWeight || 150);
                        setPrintLabelOrder(inspectOrder);
                      }}
                    >
                      🖨️ Print India Post Address Slip Label
                    </button>
                    <button
                      type="button"
                      className="admin-primary-btn"
                      onClick={() => setTrackingDialog({ open: true, orderId: inspectOrder.id, trackingId: inspectOrder.shipping?.trackingId || "", courier: "India Post (Speed Post)" })}
                    >
                      🚀 Enter AWB & Mark Dispatched
                    </button>
                  </div>
                )}

                {/* 4. SHIPPED / DISPATCHED STATUS - WITH LIVE INDIA POST TRACKING AUDIT */}
                {inspectOrder.status === "shipped" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ background: "rgba(2, 132, 199, 0.1)", border: "1.5px solid #0284c7", borderRadius: "8px", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "11px", fontWeight: "bold", color: "#38bdf8", textTransform: "uppercase", display: "block" }}>
                          📮 DISPATCHED CONSIGNMENT DETAILS
                        </span>
                        <div style={{ marginTop: "4px", fontSize: "13.5px", color: "#fff" }}>
                          Carrier: <b>{inspectOrder.shipping?.courier || "India Post (Speed Post)"}</b>
                        </div>
                        <div style={{ marginTop: "2px", fontSize: "15px", fontFamily: "monospace", color: "#fef08a", fontWeight: "bold" }}>
                          Consignment / AWB: {inspectOrder.shipping?.trackingId || "Assigned"}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="admin-primary-btn"
                        style={{ background: "#0284c7", color: "#fff", padding: "8px 14px", fontSize: "12.5px" }}
                        onClick={() => {
                          const consignmentNo = inspectOrder.shipping?.trackingId?.trim() || "";
                          if (consignmentNo) {
                            navigator.clipboard.writeText(consignmentNo);
                            notify(`Consignment #${consignmentNo} copied! Paste (Ctrl+V) on India Post page.`);
                          }
                          window.open(
                            `https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx`,
                            "_blank"
                          );
                        }}
                      >
                        🔍 Check Status on India Post ↗
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="admin-secondary-btn"
                        onClick={() => {
                          setCustomSlipWeight(inspectOrder.total_weight || inspectOrder.totalWeight || 150);
                          setPrintLabelOrder(inspectOrder);
                        }}
                      >
                        🖨️ Re-print Label Slip
                      </button>
                      <button
                        type="button"
                        className="admin-primary-btn"
                        style={{ background: "#166534" }}
                        onClick={() => handleUpdateOrderStatus(inspectOrder.id, "delivered")}
                      >
                        ✓ Verified Online & Mark as Delivered
                      </button>
                    </div>
                  </div>
                )}

                {inspectOrder.status === "refund_pending" && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className="admin-primary-btn"
                      style={{ background: "#991b1b" }}
                      onClick={() => setUtrDialog({ open: true, orderId: inspectOrder.id, type: "refund", value: "" })}
                    >
                      ₹ Record Outward Refund UTR & Complete
                    </button>
                  </div>
                )}

                {["delivered", "refund_completed"].includes(inspectOrder.status) && (
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ color: "var(--admin-status-success)", fontWeight: 700 }}>
                      ✓ Consignment lifecycle completed ({statuses[inspectOrder.status] || inspectOrder.status}).
                    </span>
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      onClick={() => {
                        setCustomSlipWeight(inspectOrder.total_weight || inspectOrder.totalWeight || 150);
                        setPrintLabelOrder(inspectOrder);
                      }}
                    >
                      🖨️ View Label Slip
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UTR ENTRY PROMPT MODAL */}
      {utrDialog.open && (
        <div className="admin-modal-backdrop" onClick={() => setUtrDialog({ open: false, orderId: "", type: "payment", value: "" })}>
          <div className="admin-modal-card" style={{ maxWidth: "440px" }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{utrDialog.type === "payment" ? "Verify Bank UPI Inward Payment" : "Record Refund Transaction"}</h2>
              <button type="button" onClick={() => setUtrDialog({ open: false, orderId: "", type: "payment", value: "" })}>×</button>
            </div>
            <div className="admin-modal-body">
              <p style={{ color: "var(--admin-text-secondary)", fontSize: "13px", margin: "0 0 12px" }}>
                {utrDialog.type === "payment"
                  ? "Enter the 12-digit UPI reference/UTR number verified from your bank statement:"
                  : "Enter the outward refund transaction reference / UTR number:"}
              </p>
              <input
                type="text"
                placeholder="e.g. 423589123456"
                value={utrDialog.value}
                onChange={e => setUtrDialog({ ...utrDialog, value: e.target.value })}
                style={{ width: "100%", padding: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--admin-border-subtle)", color: "#fff", borderRadius: 6, fontSize: "14px", marginBottom: "16px" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="admin-secondary-btn" onClick={() => setUtrDialog({ open: false, orderId: "", type: "payment", value: "" })}>
                  Cancel
                </button>
                <button type="button" className="admin-primary-btn" onClick={handleSaveUTR}>
                  Save UTR & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TRACKING ENTRY MODAL */}
      {trackingDialog.open && (
        <div className="admin-modal-backdrop" onClick={() => setTrackingDialog({ open: false, orderId: "", trackingId: "", courier: "India Post (Speed Post)" })}>
          <div className="admin-modal-card" style={{ maxWidth: "460px" }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Confirm India Post Consignment Dispatch</h2>
              <button type="button" onClick={() => setTrackingDialog({ open: false, orderId: "", trackingId: "", courier: "India Post (Speed Post)" })}>×</button>
            </div>
            <div className="admin-modal-body">
              <label className="admin-field" style={{ marginBottom: "12px" }}>
                Courier Service
                <input
                  value={trackingDialog.courier}
                  onChange={e => setTrackingDialog({ ...trackingDialog, courier: e.target.value })}
                />
              </label>
              <label className="admin-field" style={{ marginBottom: "16px" }}>
                Speed Post Article / Tracking No. *
                <input
                  placeholder="e.g. EK123456789IN"
                  value={trackingDialog.trackingId}
                  onChange={e => setTrackingDialog({ ...trackingDialog, trackingId: e.target.value })}
                />
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="admin-secondary-btn" onClick={() => setTrackingDialog({ open: false, orderId: "", trackingId: "", courier: "India Post (Speed Post)" })}>
                  Cancel
                </button>
                <button type="button" className="admin-primary-btn" onClick={handleSaveDispatch}>
                  Confirm Dispatch & Notify Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT SLIP MODAL */}
      {printLabelOrder && (
        <div className="admin-modal-backdrop" onClick={() => setPrintLabelOrder(null)}>
          <div className="admin-modal-card" style={{ maxWidth: "620px", background: "#ffffff", color: "#000", padding: "20px" }} onClick={e => e.stopPropagation()}>
            
            {/* WEIGHT ADJUSTMENT BAR */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f1f5f9", padding: "10px 14px", borderRadius: "6px", marginBottom: "14px", border: "1px solid #cbd5e1" }}>
              <span style={{ fontSize: "13px", fontWeight: "bold", color: "#0f172a" }}>⚖️ Actual Package Weight (after packing):</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="number"
                  value={customSlipWeight}
                  onChange={e => setCustomSlipWeight(e.target.value)}
                  style={{ width: "90px", padding: "6px 8px", fontSize: "14px", fontWeight: "bold", border: "1.5px solid #000", borderRadius: "4px", textAlign: "center" }}
                />
                <span style={{ fontSize: "13px", fontWeight: "bold" }}>grams</span>
              </div>
            </div>

            <div id="printable-shipping-slip" style={{ border: "2px solid #000000", padding: "16px", fontFamily: "Arial, sans-serif", color: "#000000", background: "#ffffff" }}>
              {/* HEADER */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #000000", paddingBottom: "10px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "900", letterSpacing: "1px", textTransform: "uppercase" }}>
                    INDIA POST SPEED POST
                  </h2>
                  <span style={{ fontSize: "11px", fontWeight: "bold" }}>DOMESTIC PARCEL DISPATCH SLIP</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "11px", fontWeight: "bold", display: "block" }}>BOOKING WEIGHT</span>
                  <strong style={{ fontSize: "16px" }}>{customSlipWeight || 150} g</strong>
                </div>
              </div>

              {/* PRODUCT TOTAL ONLY (EXCLUDING COURIER) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1.5px solid #000000" }}>
                <div>
                  <span style={{ fontSize: "11px", display: "block", fontWeight: "bold" }}>ORDER IDENTIFIER:</span>
                  <strong style={{ fontSize: "16px", fontFamily: "monospace" }}>#{printLabelOrder.id}</strong>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "11px", fontWeight: "bold" }}>PAYMENT MODE:</span>
                  <div style={{ fontSize: "13px", fontWeight: "900" }}>
                    PREPAID UPI (₹{(printLabelOrder.items || []).reduce((sum, it) => sum + Number(it.price || 0) * Number(it.qty || 1), 0)})
                  </div>
                </div>
              </div>

              {/* RECIPIENT */}
              <div style={{ padding: "12px 0", borderBottom: "1.5px solid #000000" }}>
                <span style={{ fontSize: "11px", fontWeight: "900", textDecoration: "underline", display: "block", marginBottom: "4px" }}>
                  DELIVER TO (RECIPIENT):
                </span>
                <strong style={{ fontSize: "16px", display: "block" }}>{printLabelOrder.customer?.name}</strong>
                <div style={{ fontSize: "13px", lineHeight: "1.4", marginTop: "2px" }}>
                  {printLabelOrder.customer?.address}<br />
                  {printLabelOrder.customer?.city}, {printLabelOrder.customer?.district || ""}, {printLabelOrder.customer?.state || "Andhra Pradesh"}
                </div>
                <div style={{ marginTop: "6px", fontSize: "15px", fontWeight: "900", letterSpacing: "1px" }}>
                  PINCODE: {printLabelOrder.customer?.pincode}
                </div>
                <div style={{ marginTop: "4px", fontSize: "13px", fontWeight: "bold" }}>
                  CONTACT TEL: {printLabelOrder.customer?.phone}
                </div>
              </div>

              {/* SENDER */}
              <div style={{ padding: "10px 0", borderBottom: "1.5px solid #000000", fontSize: "12px", lineHeight: "1.4" }}>
                <span style={{ fontSize: "10px", fontWeight: "900", textDecoration: "underline", display: "block", marginBottom: "2px" }}>
                  FROM (SENDER / WAREHOUSE):
                </span>
                <strong>{settings?.storeName || "Kashvi Fashions"}</strong>
                <div>Kakinada Central Fulfillment Hub, East Godavari District, Andhra Pradesh - <b>{settings?.originPincode || "533001"}</b></div>
                <div>Helpline: <b>{settings?.whatsappNo || settings?.whatsapp || "919550724234"}</b></div>
              </div>

              {/* CONTENTS */}
              <div style={{ paddingTop: "10px", fontSize: "11.5px" }}>
                <span style={{ fontWeight: "bold", display: "block", marginBottom: "4px" }}>PACKAGE CONTENTS:</span>
                <ul style={{ margin: 0, paddingLeft: "18px" }}>
                  {(printLabelOrder.items || []).map((item, idx) => (
                    <li key={idx}>
                      {item.name} [{item.size} - {item.colour || "Standard"}] x {item.qty}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 18 }}>
              <button
                type="button"
                className="admin-secondary-btn"
                style={{ background: "#f1f5f9", color: "#000", border: "1px solid #ccc" }}
                onClick={() => setPrintLabelOrder(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="admin-primary-btn"
                style={{ background: "#000", color: "#fff" }}
                onClick={() => {
                  const printContents = document.getElementById("printable-shipping-slip").innerHTML;
                  const win = window.open("", "", "height=600,width=800");
                  win.document.write(`<html><head><title>Dispatch Slip - #${printLabelOrder.id}</title></head><body style="margin:20px;">${printContents}</body></html>`);
                  win.document.close();
                  win.focus();
                  win.print();
                  win.close();
                }}
              >
                🖨️ Print Label / Address Sticker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION PROMPT */}
      {confirmDialog && (
        <div className="admin-modal-backdrop" onClick={() => setConfirmDialog(null)}>
          <div className="admin-modal-card" style={{ maxWidth: "440px" }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{confirmDialog.title}</h2>
              <button type="button" onClick={() => setConfirmDialog(null)}>×</button>
            </div>
            <div className="admin-modal-body">
              <p style={{ color: "var(--admin-text-secondary)", fontSize: "14px" }}>{confirmDialog.text}</p>
              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button type="button" className="admin-secondary-btn" onClick={() => setConfirmDialog(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-primary-btn"
                  style={{ background: "var(--admin-status-danger)" }}
                  onClick={() => {
                    confirmDialog.action();
                    setConfirmDialog(null);
                  }}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}