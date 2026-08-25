import React, { useState, useEffect } from "react";
import AdminLayout from "./admin/AdminLayout";
import StorefrontLayout from "./customer/StorefrontLayout";
import { supabase } from "./lib/supabase";

const defaultSettings = {
  storeName: "Kashvi Fashions",
  upiId: "",
  whatsapp: "",
  originPincode: "533001",
  logoUrl: "",
  deliveryCharge: 0
};

export default function App() {
  const [view, setView] = useState(
  window.location.pathname.toLowerCase() === "/kfmama"
    ? "admin"
    : "store"
);
  const [page, setPage] = useState("dashboard");
  const [notice, setNotice] = useState("");

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [colours, setColours] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [units, setUnits] = useState([]);
  const [pincodes, setPincodes] = useState([]);
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("kashvi_settings");
      return saved ? JSON.parse(saved) : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const notify = text => {
    setNotice(text);
    setTimeout(() => setNotice(""), 3000);
  };

  useEffect(() => {
    try {
      localStorage.setItem("kashvi_settings", JSON.stringify(settings));
    } catch (e) {
      console.error("Storage sync error", e);
    }
  }, [settings]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Settings Table
        const { data: setRes } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
        if (setRes) {
  setSettings(prev => ({
    ...prev,
    ...setRes
  }));
}

        // 2. Products Table
        const { data: p } = await supabase.from("products").select("*").order("created_at", { ascending: false });
        if (p) {
          setProducts(
            p.map(item => {
              const sp = Number(item.selling_price ?? item.sellingPrice ?? 0);
              const mrpVal = Number(item.mrp ?? 0);
              const sizesList = Array.isArray(item.sizes)
                ? item.sizes
                : (item.size ? item.size.split(",").map(s => s.trim()) : []);
              const coloursList = Array.isArray(item.colours)
                ? item.colours
                : (item.colour ? item.colour.split(",").map(c => c.trim()) : []);

              return {
                ...item,
                sellingPrice: sp,
                selling_price: sp,
                mrp: mrpVal,
                sizes: sizesList,
                colours: coloursList,
                images: Array.isArray(item.images) ? item.images : (item.image ? [item.image] : [])
              };
            })
          );
        }

        // 3. Categories
        const { data: c } = await supabase.from("categories").select("*").order("name", { ascending: true });
        if (c) setCategories(c);

        // 4. Orders
        const { data: o } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
        if (o) setOrders(o);

        // 5. Master tables
        const { data: sub } = await supabase.from("sub_categories").select("*");
        if (sub) setSubCategories(sub);

        const { data: clr } = await supabase.from("colours").select("*");
        if (clr) setColours(clr);

        const { data: sz } = await supabase.from("sizes").select("*");
        if (sz) setSizes(sz);

        const { data: u } = await supabase.from("units").select("*");
        if (u) setUnits(u);

        // 6. Pincodes Table (Fetch with high range & format mapping)
        const { data: pin, error: pinErr } = await supabase
          .from("pincodes")
          .select("*")
          .limit(10000);

        if (pinErr) {
          console.error("Pincodes load error:", pinErr.message);
        } else if (pin) {
          setPincodes(
            pin.map(item => ({
              id: item.id || `PIN_${item.pincode || item.pin}`,
              pincode: String(item.pincode || item.pin || "").trim(),
              city: item.city || item.office || item.district || "",
              district: item.district || item.city || "",
              state: item.state || "Andhra Pradesh",
              zone_type: item.zone_type || item.zone || item.region || "Local",
              active: item.active !== false
            }))
          );
        }
      } catch (err) {
        console.error("Data load error:", err);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      {view === "admin" ? (
        <AdminLayout
          page={page}
          navigate={setPage}
          products={products}
          setProducts={setProducts}
          orders={orders}
          setOrders={setOrders}
          categories={categories}
          setCategories={setCategories}
          subCategories={subCategories}
          setSubCategories={setSubCategories}
          colours={colours}
          setColours={setColours}
          sizes={sizes}
          setSizes={setSizes}
          units={units}
          setUnits={setUnits}
          pincodes={pincodes}
          setPincodes={setPincodes}
          banners={banners}
          setBanners={setBanners}
          settings={settings}
          setSettings={setSettings}
          notify={notify}
          onStore={() => {
  window.history.pushState({}, "", "/");
  setView("store");
}}
        />
      ) : (
        <StorefrontLayout
          products={products}
          categories={categories}
          banners={banners}
          settings={settings}
          orders={orders}
          setOrders={setOrders}
          pincodes={pincodes}
          notify={notify}
          onAdmin={() => {
  window.history.pushState({}, "", "/kfmama");
  setView("admin");
}}
        />
      )}

      {notice && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#070d0a",
            color: "#2dd4bf",
            padding: "12px 24px",
            borderRadius: 8,
            border: "1px solid #2dd4bf",
            zIndex: 9999
          }}
        >
          ✦ {notice}
        </div>
      )}
    </>
  );
}