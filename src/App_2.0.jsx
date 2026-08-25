import React, { useEffect, useState } from "react";
import CustomerRegister from "./Components/Customer/CustomerRegister";
import Verification from "./components/customer/Verification";
import "./App.css";
import { pincodeDatabase } from "./pincodeData";
import { supabase } from "./lib/supabase";

const STORAGE = {
  products: "kashvi_products",
  categories: "kashvi_categories",
  subCategories: "kashvi_subCategories",
  colours: "kashvi_colours",
  sizes: "kashvi_sizes",
  units: "kashvi_units",
  orders: "kashvi_orders",
  pincodes: "kashvi_pincodes",
  settings: "kashvi_settings",
  banners: "kashvi_banners"
};

const safeRead = (name, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE[name]) || "null") ?? fallback;
  } catch {
    return fallback;
  }
};

const money = value => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const stamp = value =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
      })
    : "-";

const makeId = prefix => `${prefix}${Date.now().toString().slice(-8)}`;

const defaultSettings = {
  storeName: "Kashvi Fashions",
  upiId: "",
  whatsapp: "",
  originPincode: "533001",
  deliveryCharge: 0
};

const defaultBanners = [
  {
    id: "BAN001",
    tagline: "SUMMER & EVERYDAY LUXURY",
    mainTitle: "EFFORTLESS ELEGANCE.\nPRECISION TAILORED.",
    desc: "Experience pure silhouette comfort with high-grade breathable fabrics, designed for perfection in every stitch.",
    ctaText: "Explore Catalogue ↓",
    sideBadge: "ORIGINAL DESIGN",
    sideTitle: "PURE COMFORT.\nZERO COMPROMISE.",
    watermark: "KASHVI",
    active: true
  }
];

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
  payment_received: "Payment Received",
  stock_check: "Stock Check",
  processing: "Order Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  stock_unavailable: "Stock Unavailable / Refund Required",
  refund_pending: "Refund Required",
  refund_initiated: "Refund Initiated",
  refund_completed: "Refund Completed"
};

const statusTone = status =>
  ["delivered", "payment_received"].includes(status)
    ? "success"
    : status === "shipped"
    ? "shipped"
    : ["processing", "stock_check"].includes(status)
    ? "processing"
    : ["stock_unavailable", "refund_pending"].includes(status)
    ? "danger"
    : "warning";

const weightGrams = item =>
  Number(item.productWeight || 0) *
  (item.weightUnit === "kg" ? 1000 : 1) *
  Number(item.qty || 0);

const shippingRate = (grams, zone) => {
  const slabs = [
    [500, [27, 31, 34, 35]],
    [1000, [31, 44, 51, 57]],
    [1500, [36, 58, 70, 80]],
    [2000, [45, 80, 100, 115]],
    [3000, [57, 100, 125, 145]],
    [4000, [69, 120, 150, 175]],
    [5000, [81, 140, 175, 205]]
  ];
  const index = { Local: 0, "Within State": 1, "Zone/Metro": 2, "Other States": 3 }[zone] ?? 3;
  const slab = slabs.find(item => grams <= item[0]);
  if (slab) return slab[1][index];
  const extra = Math.ceil((grams - 5000) / 1000);
  return slabs[slabs.length - 1][1][index] + extra * [15, 20, 25, 30][index];
};

const shippingCategory = (destination, origin) => {
  if (!destination) return "";
  const destinationZone = destination.zone?.trim().toLowerCase();
  const originZone = origin?.zone?.trim().toLowerCase();
  if (
    String(destination.pincode) === String(origin?.pincode) ||
    (destinationZone === "local" && originZone === "local")
  )
    return "Local";
  if (destination.state?.trim().toLowerCase() === "andhra pradesh")
    return "Within State";
  if (destinationZone === "zone/metro") return "Zone/Metro";
  return "Other States";
};

export default function App() {
  const [view, setView] = useState("admin");
  const [customer, setCustomer] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState(null);
  const [order, setOrder] = useState(null);

  const [products, setProducts] = useState(() => safeRead("products", []));
  const [orders, setOrders] = useState(() => safeRead("orders", []));
  const [categories, setCategories] = useState(() => safeRead("categories", []));
  const [subCategories, setSubCategories] = useState(() => safeRead("subCategories", []));
  const [colours, setColours] = useState(() => safeRead("colours", []));
  const [sizes, setSizes] = useState(() => safeRead("sizes", []));
  const [units, setUnits] = useState(() => safeRead("units", []));
  const [pincodes, setPincodes] = useState(() => safeRead("pincodes", []));
  const [banners, setBanners] = useState(() => safeRead("banners", defaultBanners));
  const [settings, setSettings] = useState(() => ({
    ...defaultSettings,
    ...safeRead("settings", {})
  }));

  const notify = text => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 3000);
  };

  const navigate = next => {
    setPage(next);
    setDialog(null);
    setOrder(null);
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const { data: pData } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });
        if (pData) {
          setProducts(
            pData.map(item => ({
              ...item,
              subCategory: item.sub_category || "",
              modelNo: item.model_no || item.code || "",
              code: item.code || item.model_no || "",
              sellingPrice: item.selling_price || 0,
              costPrice: item.cost_price || 0,
              weightUnit: item.weight_unit || "grams",
              colours: item.colour
                ? item.colour.split(",").map(x => x.trim()).filter(Boolean)
                : [],
              sizes: item.size
                ? item.size.split(",").map(x => x.trim()).filter(Boolean)
                : [],
              variants: item.variants || {},
              images: item.images || []
            }))
          );
        }

        const { data: oData } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (oData) setOrders(oData);

        const { data: cData } = await supabase
          .from("categories")
          .select("*")
          .order("name", { ascending: true });
        if (cData) setCategories(cData);

        const { data: sData } = await supabase
          .from("sub_categories")
          .select("*")
          .order("name", { ascending: true });
        if (sData) setSubCategories(sData);

        const { data: clrData } = await supabase
          .from("colours")
          .select("*")
          .order("name", { ascending: true });
        if (clrData) setColours(clrData);

        const { data: szData } = await supabase
          .from("sizes")
          .select("*")
          .order("name", { ascending: true });
        if (szData) setSizes(szData);

        const { data: uData } = await supabase
          .from("units")
          .select("*")
          .order("name", { ascending: true });
        if (uData) {
          setUnits(
            uData.map(u => ({
              ...u,
              shortName: u.short_name || u.shortName
            }))
          );
        }

        const { data: pinData } = await supabase
          .from("pincodes")
          .select("*")
          .order("pincode", { ascending: true })
          .range(0, 4999);
        if (pinData) {
          setPincodes(
            pinData.map(item => ({
              ...item,
              zone: item.zone_type || item.zone,
              areaType: item.delivery_available ? "Available" : "Not Available"
            }))
          );
        }
      } catch (err) {
        console.error("Data fetch error:", err);
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    Object.entries({
      products,
      orders,
      categories,
      subCategories,
      colours,
      sizes,
      units,
      pincodes,
      settings,
      banners
    }).forEach(([name, value]) => {
      localStorage.setItem(STORAGE[name], JSON.stringify(value));
    });
  }, [products, orders, categories, subCategories, colours, sizes, units, pincodes, settings, banners]);

  const updateOrder = async (id, status, extra = {}) => {
    const event = { status, at: new Date().toISOString() };
    const currentOrder = orders.find(item => item.id === id);
    const updatedHistory = [...(currentOrder?.history || []), event];

    const updated = {
      ...currentOrder,
      ...extra,
      status,
      history: updatedHistory
    };

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status,
          history: updatedHistory,
          payment: updated.payment,
          shipping: updated.shipping,
          refund: updated.refund
        })
        .eq("id", id);

      if (error) throw error;

      setOrders(list => list.map(item => (item.id === id ? updated : item)));
      if (order && order.id === id) setOrder(updated);
      notify(`Order moved to ${statuses[status] || status}`);
    } catch (err) {
      console.error("Order status update failed:", err);
      notify("Failed to update order status");
    }
  };

  if (view === "store") {
    return (
      <Storefront
        products={products}
        categories={categories}
        sizes={sizes}
        colours={colours}
        pincodes={pincodes}
        settings={settings}
        banners={banners}
        orders={orders}
        setOrders={setOrders}
        notify={notify}
        customer={customer}
        setCustomer={setCustomer}
        onAdmin={() => setView("admin")}
      />
    );
  }

  return (
    <div className="admin-app">
      <Sidebar page={page} navigate={navigate} onStore={() => setView("store")} />

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="mobile-brand">KASHVI</span>
            <h1>
              {page === "dashboard"
                ? "Dashboard Overview"
                : page === "subCategories"
                ? "Sub-Categories"
                : page === "pincodes"
                ? "Pincode Database"
                : page === "banners"
                ? "Banner Management"
                : page === "settings"
                ? "Store Info"
                : page === "rateCards"
                ? "Delivery Rates"
                : page.toUpperCase()}
            </h1>
            <p>Smart Operations, Real-time Catalogue & Fulfilment Hub</p>
          </div>
          <div className="top-actions">
            <span className="notification">
              <span className="pulse-dot"></span>
              {orders.filter(item => item.status === "payment_verification").length} Verification Pending
            </span>
            <span className="profile-pill">
              <span className="avatar">A</span> Admin Workspace
            </span>
          </div>
        </header>

        {page === "dashboard" && (
          <Dashboard products={products} orders={orders} navigate={navigate} />
        )}

        {page === "products" && (
          <Products
            products={products}
            categories={categories}
            subCategories={subCategories}
            colours={colours}
            sizes={sizes}
            units={units}
            open={setDialog}
            notify={notify}
            setProducts={setProducts}
          />
        )}

        {["categories", "subCategories", "colours", "sizes", "units", "pincodes"].includes(
          page
        ) && (
          <MasterPage
            type={page}
            data={{ categories, subCategories, colours, sizes, units, pincodes }}
            setters={{
              categories: setCategories,
              subCategories: setSubCategories,
              colours: setColours,
              sizes: setSizes,
              units: setUnits,
              pincodes: setPincodes
            }}
            open={setDialog}
          />
        )}

        {page === "banners" && (
          <BannerManager banners={banners} setBanners={setBanners} notify={notify} />
        )}

        {page === "orders" && <Orders orders={orders} onView={setOrder} />}

        {page === "settings" && (
          <Settings value={settings} setValue={setSettings} notify={notify} />
        )}

        {page === "rateCards" && <RateCards notify={notify} />}
      </main>

      {dialog?.kind === "product" && (
        <ProductDialog
          value={dialog.value}
          masters={{ categories, subCategories, colours, sizes, units }}
          save={async item => {
            try {
              const productData = {
                id: item.id || makeId("PR"),
                name: item.name,
                category: item.category || null,
                sub_category: item.subCategory || null,
                colour: item.colours?.join(", ") || null,
                size: item.sizes?.join(", ") || null,
                unit: item.unit || null,
                brand: item.brand || null,
                model_no: item.code || null,
                selling_price: Number(item.sellingPrice || 0),
                cost_price: Number(item.costPrice || 0),
                weight: Number(item.weight || 0),
                weight_unit: item.weightUnit || "grams",
                images: item.images || [],
                variants: item.variants || {},
                active: item.active !== false
              };

              if (item.id) {
                const { data, error } = await supabase
                  .from("products")
                  .update(productData)
                  .eq("id", item.id)
                  .select()
                  .single();

                if (error) throw error;
                setProducts(list =>
                  list.map(old => (old.id === item.id ? { ...item, ...data } : old))
                );
                notify("Product updated successfully");
              } else {
                const { data, error } = await supabase
                  .from("products")
                  .insert([productData])
                  .select()
                  .single();

                if (error) throw error;
                setProducts(list => [{ ...item, ...data }, ...list]);
                notify("New product added successfully");
              }
              setDialog(null);
            } catch (error) {
              console.error("Product save error:", error);
              notify(error.message || "Failed to save product");
            }
          }}
          close={() => setDialog(null)}
        />
      )}

      {dialog?.kind === "master" && (
        <MasterDialog
          type={dialog.type}
          value={dialog.value}
          data={{ categories, subCategories }}
          save={async item => {
            const tableMap = {
              categories: "categories",
              subCategories: "sub_categories",
              colours: "colours",
              sizes: "sizes",
              units: "units",
              pincodes: "pincodes"
            };
            const tableName = tableMap[dialog.type];

            try {
              if (item.id) {
                const payload = { ...item };
                if (dialog.type === "units") {
                  payload.short_name = item.shortName;
                }
                const { data, error } = await supabase
                  .from(tableName)
                  .update(payload)
                  .eq("id", item.id)
                  .select()
                  .single();

                if (error) throw error;
                const setters = {
                  categories: setCategories,
                  subCategories: setSubCategories,
                  colours: setColours,
                  sizes: setSizes,
                  units: setUnits,
                  pincodes: setPincodes
                };
                setters[dialog.type](list =>
                  list.map(old => (old.id === item.id ? { ...old, ...data } : old))
                );
                setDialog(null);
                notify("Record updated");
              } else {
                const prefixMap = {
                  categories: "CAT",
                  subCategories: "SUB",
                  colours: "CLR",
                  sizes: "SZ",
                  units: "UN",
                  pincodes: "PIN"
                };
                const newRecord = {
                  ...item,
                  id: makeId(prefixMap[dialog.type] || "REC"),
                  created_at: new Date().toISOString()
                };
                if (dialog.type === "units") {
                  newRecord.short_name = item.shortName;
                }

                const { data, error } = await supabase
                  .from(tableName)
                  .insert([newRecord])
                  .select()
                  .single();

                if (error) throw error;
                const setters = {
                  categories: setCategories,
                  subCategories: setSubCategories,
                  colours: setColours,
                  sizes: setSizes,
                  units: setUnits,
                  pincodes: setPincodes
                };
                setters[dialog.type](list => [data, ...list]);
                setDialog(null);
                notify("Record created");
              }
            } catch (err) {
              console.error("Master save error:", err);
              notify(err.message || "Failed to save record");
            }
          }}
          close={() => setDialog(null)}
        />
      )}

      {dialog?.kind === "confirm" && (
        <Confirm dialog={dialog} close={() => setDialog(null)} />
      )}

      {order && (
        <OrderDialog
          order={order}
          update={updateOrder}
          close={() => setOrder(null)}
          notify={notify}
        />
      )}

      {notice && <div className="toast">✦ {notice}</div>}
    </div>
  );
}

/* ---------------- ADMIN SUB-COMPONENTS ---------------- */

function Sidebar({ page, navigate, onStore }) {
  const [inventoryOpen, setInventoryOpen] = useState(
    ["products", "categories", "subCategories", "colours", "sizes", "units"].includes(page)
  );
  const [settingsOpen, setSettingsOpen] = useState(
    ["settings", "rateCards"].includes(page)
  );

  const inventoryItems = [
    ["products", "▦", "Products"],
    ["categories", "◉", "Categories"],
    ["subCategories", "◇", "Sub-Categories"],
    ["colours", "●", "Colours"],
    ["sizes", "□", "Sizes"],
    ["units", "◫", "Units"]
  ];

  const settingsItems = [
    ["settings", "⚙", "Store Info"],
    ["rateCards", "🚚", "Delivery Rates"]
  ];

  const isInventoryActive = inventoryItems.some(([id]) => page === id);
  const isSettingsActive = settingsItems.some(([id]) => page === id);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">K</div>
        <div>
          <div className="brand-name">Kashvi</div>
          <div className="brand-sub">STUDIO OPERATIONS</div>
        </div>
      </div>

      <div className="menu-title">WORKSPACE NAVIGATION</div>

      <button
        className={`menu-item ${page === "dashboard" ? "active" : ""}`}
        onClick={() => navigate("dashboard")}
      >
        <span className="menu-icon">⌂</span>
        Dashboard
      </button>

      {/* Collapsible Inventory Dropdown Group */}
      <div className="nav-group">
        <button
          className={`menu-item nav-group-btn ${isInventoryActive ? "active" : ""}`}
          onClick={() => setInventoryOpen(prev => !prev)}
        >
          <span className="menu-icon">🗃</span>
          <span style={{ flex: 1, textAlign: "left" }}>Inventory</span>
          <span className={`chevron ${inventoryOpen ? "open" : ""}`}>▾</span>
        </button>

        {inventoryOpen && (
          <div className="nav-sub-menu">
            {inventoryItems.map(([id, icon, label]) => (
              <button
                className={`menu-item sub-item ${page === id ? "active" : ""}`}
                onClick={() => navigate(id)}
                key={id}
              >
                <span className="menu-icon">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Orders */}
      <button
        className={`menu-item ${page === "orders" ? "active" : ""}`}
        onClick={() => navigate("orders")}
      >
        <span className="menu-icon">▤</span>
        Orders
      </button>

      {/* Banner Studio / Customization */}
      <button
        className={`menu-item ${page === "banners" ? "active" : ""}`}
        onClick={() => navigate("banners")}
      >
        <span className="menu-icon">🎨</span>
        Banner Studio
      </button>

      {/* Pincode Database */}
      <button
        className={`menu-item ${page === "pincodes" ? "active" : ""}`}
        onClick={() => navigate("pincodes")}
      >
        <span className="menu-icon">⌖</span>
        Pincode Database
      </button>

      {/* Collapsible Settings Dropdown Group */}
      <div className="nav-group">
        <button
          className={`menu-item nav-group-btn ${isSettingsActive ? "active" : ""}`}
          onClick={() => setSettingsOpen(prev => !prev)}
        >
          <span className="menu-icon">⚙</span>
          <span style={{ flex: 1, textAlign: "left" }}>Settings</span>
          <span className={`chevron ${settingsOpen ? "open" : ""}`}>▾</span>
        </button>

        {settingsOpen && (
          <div className="nav-sub-menu">
            {settingsItems.map(([id, icon, label]) => (
              <button
                className={`menu-item sub-item ${page === id ? "active" : ""}`}
                onClick={() => navigate(id)}
                key={id}
              >
                <span className="menu-icon">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="store-link" onClick={onStore}>
        ↗ Live Storefront
      </button>

      <div className="sidebar-bottom">
        <div className="admin-profile">
          <span className="avatar">A</span>
          <div>
            <strong>Admin</strong>
            <small>Administrator</small>
          </div>
        </div>
      </div>
    </aside>
  );
}

function BannerManager({ banners, setBanners, notify }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({
    tagline: "",
    mainTitle: "",
    desc: "",
    ctaText: "Explore Catalogue ↓",
    sideBadge: "ORIGINAL DESIGN",
    sideTitle: "",
    watermark: "KASHVI"
  });

  const saveSlide = () => {
    if (!draft.mainTitle) return notify("Headline is required");
    if (editing) {
      setBanners(list => list.map(b => (b.id === editing.id ? { ...draft, id: editing.id } : b)));
      notify("Banner slide updated");
    } else {
      setBanners(list => [{ ...draft, id: makeId("BAN") }, ...list]);
      notify("New banner slide created");
    }
    setEditing(null);
    setDraft({
      tagline: "",
      mainTitle: "",
      desc: "",
      ctaText: "Explore Catalogue ↓",
      sideBadge: "ORIGINAL DESIGN",
      sideTitle: "",
      watermark: "KASHVI"
    });
  };

  const removeSlide = id => {
    setBanners(list => list.filter(b => b.id !== id));
    notify("Banner removed");
  };

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">STOREFRONT CUSTOMIZATION</span>
          <h2>Banner Studio</h2>
          <p>Configure customer home hero banners, scroll slides, and typography.</p>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-section-header">
          <div>
            <h3>{editing ? "Edit Banner Slide" : "Create New Slide"}</h3>
            <p>Define typography, badge accents, and CTA actions for storefront hero.</p>
          </div>
        </div>

        <div className="settings-grid">
          <Field
            label="Top Tagline"
            value={draft.tagline}
            onChange={v => setDraft({ ...draft, tagline: v })}
            placeholder="e.g. SUMMER & EVERYDAY LUXURY"
          />
          <Field
            label="Background Watermark Text"
            value={draft.watermark}
            onChange={v => setDraft({ ...draft, watermark: v })}
            placeholder="e.g. KASHVI"
          />
          <Field
            wide
            label="Main Headline (Use Enter for new line)"
            textarea
            value={draft.mainTitle}
            onChange={v => setDraft({ ...draft, mainTitle: v })}
            placeholder="EFFORTLESS ELEGANCE.&#10;PRECISION TAILORED."
          />
          <Field
            wide
            label="Description Paragraph"
            textarea
            value={draft.desc}
            onChange={v => setDraft({ ...draft, desc: v })}
            placeholder="Experience pure silhouette comfort..."
          />
          <Field
            label="Button Label"
            value={draft.ctaText}
            onChange={v => setDraft({ ...draft, ctaText: v })}
            placeholder="Explore Catalogue ↓"
          />
          <Field
            label="Right Side Badge"
            value={draft.sideBadge}
            onChange={v => setDraft({ ...draft, sideBadge: v })}
            placeholder="ORIGINAL DESIGN"
          />
          <Field
            wide
            label="Right Side Headline"
            textarea
            value={draft.sideTitle}
            onChange={v => setDraft({ ...draft, sideTitle: v })}
            placeholder="PURE COMFORT.&#10;ZERO COMPROMISE."
          />
        </div>

        <div className="settings-footer">
          {editing && (
            <button
              className="secondary-button"
              onClick={() => {
                setEditing(null);
                setDraft({
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
              Cancel Edit
            </button>
          )}
          <button className="primary-button" onClick={saveSlide}>
            {editing ? "Update Banner Slide" : "+ Add Banner Slide"}
          </button>
        </div>
      </div>

      <Card title={`${banners.length} Active Slides in Rotation`}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Main Headline</th>
                <th>Tagline</th>
                <th>Watermark</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners.map(item => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.mainTitle.replace(/\n/g, " ")}</strong>
                  </td>
                  <td>{item.tagline}</td>
                  <td>{item.watermark}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="icon-button"
                        onClick={() => {
                          setEditing(item);
                          setDraft(item);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="icon-button danger-text"
                        onClick={() => removeSlide(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

function Dashboard({ products, orders, navigate }) {
  const metrics = [
    ["Total Products", products.length, "▦"],
    ["Active Products", products.filter(item => item.active !== false).length, "◉"],
    [
      "New Orders",
      orders.filter(item => ["new", "payment_verification"].includes(item.status)).length,
      "✦"
    ],
    ["Processing", orders.filter(item => item.status === "processing").length, "◷"],
    ["Shipped Orders", orders.filter(item => item.status === "shipped").length, "↗"],
    ["Delivered", orders.filter(item => item.status === "delivered").length, "✓"],
    ["Pending Payment", orders.filter(item => item.payment?.status !== "received").length, "₹"],
    ["Refunds Active", orders.filter(item => item.status?.includes("refund")).length, "↺"]
  ];

  return (
    <section className="page">
      <div className="stats-grid">
        {metrics.map(item => (
          <Stat key={item[0]} label={item[0]} value={item[1]} icon={item[2]} />
        ))}
      </div>

      <div className="dashboard-grid">
        <Card title="Recent Orders" action="View all" onAction={() => navigate("orders")}>
          {orders.length ? (
            <OrderRows orders={orders.slice(0, 5)} />
          ) : (
            <Empty title="No orders yet" text="Customer storefront orders will display here." />
          )}
        </Card>

        <Card title="Recent Catalogue" action="View catalogue" onAction={() => navigate("products")}>
          {products.length ? (
            <div className="mini-list">
              {products.slice(0, 5).map(product => (
                <div className="mini-row" key={product.id}>
                  <Thumb product={product} />
                  <div>
                    <strong>{product.name}</strong>
                    <small>
                      {product.category} · {money(product.sellingPrice)}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Your catalogue is empty" text="Add products to make them visible." />
          )}
        </Card>
      </div>

      <Card title="Order Lifecycle Pipeline">
        <div className="status-summary">
          {Object.entries(statuses).map(([status, label]) => {
            const count = orders.filter(item => item.status === status).length;
            return count ? (
              <div key={status}>
                <span>{label}</span>
                <strong>{count}</strong>
                <i
                  style={{
                    width: `${Math.max(10, (count / Math.max(orders.length, 1)) * 100)}%`
                  }}
                />
              </div>
            ) : null;
          })}
        </div>
      </Card>
    </section>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Card({ title, action, onAction, children }) {
  return (
    <div className="section-card">
      <div className="section-header">
        <h3>{title}</h3>
        {action && (
          <button className="text-button" onClick={onAction}>
            {action} →
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ title, text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">◌</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Thumb({ product }) {
  const image = product.images?.[0] || product.image;
  return image ? (
    <img className="product-thumb" src={image} alt="" />
  ) : (
    <div className="product-thumb placeholder">K</div>
  );
}

function OrderRows({ orders }) {
  return (
    <div className="order-list">
      {orders.map(item => (
        <div className="order-row" key={item.id}>
          <div>
            <strong>#{item.id}</strong>
            <small>
              {item.customer?.name} · {item.customer?.phone || item.customer?.mobile}
            </small>
          </div>
          <div>
            <strong>{money(item.total)}</strong>
            <span className={`status-badge ${statusTone(item.status)}`}>
              {statuses[item.status] || item.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Products({
  products,
  categories,
  subCategories,
  colours,
  sizes,
  units,
  open,
  notify,
  setProducts
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  const filtered = products.filter(
    item =>
      (!query ||
        item.name?.toLowerCase().includes(query.toLowerCase()) ||
        item.code?.toLowerCase().includes(query.toLowerCase())) &&
      (!category || item.category === category) &&
      (!status || String(item.active !== false) === status)
  );

  const remove = item =>
    open({
      kind: "confirm",
      title: "Delete Product?",
      text: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      action: async () => {
        const { error } = await supabase.from("products").delete().eq("id", item.id);
        if (error) {
          console.error("Product delete failed:", error);
          alert(`Delete failed: ${error.message}`);
          return;
        }
        setProducts(list => list.filter(old => old.id !== item.id));
        notify("Product removed from database");
      }
    });

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">INVENTORY MATRIX</span>
          <h2>Products</h2>
          <p>Configure variants, pricing tiers, and stock dimensions.</p>
        </div>
        <button
          className="primary-button glow"
          onClick={() =>
            open({
              kind: "product",
              value: blankProduct()
            })
          }
        >
          + Add Product
        </button>
      </div>

      <div className="toolbar product-toolbar">
        <input
          className="search-input"
          placeholder="Search by name, model or SKU..."
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <select value={category} onChange={event => setCategory(event.target.value)}>
          <option value="">All Categories</option>
          {categories.map(item => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <Card title={`${filtered.length} Items Indexed`}>
        <div className="table-wrapper">
          <table className="data-table products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Weight</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const mrp = Number(item.mrp || 0);
                const sellingPrice = Number(item.sellingPrice || 0);
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="product-cell">
                        <Thumb product={item} />
                        <div className="product-info-cell">
                          <strong className="product-title">{item.name}</strong>
                          <small className="product-model">
                            {item.code ? `Model: ${item.code}` : "No model"}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="category-cell">
                        <strong>{item.category || "-"}</strong>
                        {item.subCategory && <small>{item.subCategory}</small>}
                      </div>
                    </td>
                    <td>
                      <div className="price-cell">
                        <strong>{money(sellingPrice)}</strong>
                        {mrp > sellingPrice && <small className="strike">{money(mrp)}</small>}
                      </div>
                    </td>
                    <td>
                      <strong>{item.weight || 0}</strong> {item.weightUnit === "kg" ? "kg" : "g"}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          item.active === false ? "danger" : "success"
                        }`}
                      >
                        {item.active === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="icon-button"
                          onClick={() =>
                            open({
                              kind: "product",
                              value: { ...blankProduct(), ...item }
                            })
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="icon-button danger-text"
                          onClick={() => remove(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && (
            <Empty
              title="No Products Found"
              text="Adjust your search filters or create a new product entry."
            />
          )}
        </div>
      </Card>
    </section>
  );
}

function MasterPage({ type, data, setters, open }) {
  const list = data[type] || [];
  const title =
    type === "subCategories"
      ? "Sub-Categories"
      : type === "pincodes"
      ? "Pincode Database"
      : type[0].toUpperCase() + type.slice(1);

  const remove = item =>
    open({
      kind: "confirm",
      title: `Delete from ${title}?`,
      text: "This master record will be deleted immediately from Supabase.",
      action: async () => {
        const tableMap = {
          categories: "categories",
          subCategories: "sub_categories",
          colours: "colours",
          sizes: "sizes",
          units: "units",
          pincodes: "pincodes"
        };
        const tableName = tableMap[type];
        const { error } = await supabase.from(tableName).delete().eq("id", item.id);
        if (error) {
          console.error("Delete failed:", error);
          alert(`Delete failed: ${error.message}`);
          return;
        }
        setters[type](items => items.filter(old => old.id !== item.id));
      }
    });

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MASTER REGISTRY</span>
          <h2>{title}</h2>
          <p>Global baseline specifications across product forms and checkouts.</p>
        </div>
        <button
          className="primary-button"
          onClick={() =>
            open({
              kind: "master",
              type,
              value: { name: "", active: true }
            })
          }
        >
          + Add {type === "pincodes" ? "Pincode" : title.replace("Sub-Categories", "Sub-Category").replace(/s$/, "")}
        </button>
      </div>

      <Card title={`${list.length} Registered Specifications`}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {type === "pincodes" ? (
                  <>
                    <th>Pincode</th>
                    <th>City</th>
                    <th>State</th>
                    <th>Zone</th>
                    <th>Delivery Status</th>
                  </>
                ) : (
                  <>
                    <th>Name</th>
                    {type === "subCategories" && <th>Category</th>}
                    {type === "units" && <th>Short Form</th>}
                    <th>Status</th>
                  </>
                )}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(item => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name || item.pincode}</strong>
                  </td>
                  {type === "pincodes" ? (
                    <>
                      <td>{item.city}</td>
                      <td>{item.state}</td>
                      <td>{item.zone}</td>
                      <td>{item.areaType}</td>
                    </>
                  ) : (
                    <>
                      {type === "subCategories" && (
                        <td>
                          {data.categories.find(c => c.id === item.category_id)?.name || "-"}
                        </td>
                      )}
                      {type === "units" && <td>{item.shortName}</td>}
                      <td>
                        <span
                          className={`status-badge ${
                            item.active === false ? "danger" : "success"
                          }`}
                        >
                          {item.active === false ? "Inactive" : "Active"}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="actions">
                    <button
                      className="icon-button"
                      onClick={() => open({ kind: "master", type, value: item })}
                    >
                      Edit
                    </button>
                    <button
                      className="icon-button danger-text"
                      onClick={() => remove(item)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && (
            <Empty title="No records found" text="Add your first specification entry." />
          )}
        </div>
      </Card>
    </section>
  );
}

function MasterDialog({ type, value, data, save, close }) {
  const [item, setItem] = useState({ active: true, ...value });
  const set = (key, val) => setItem(old => ({ ...old, [key]: val }));
  const isPin = type === "pincodes";
  const isSub = type === "subCategories";
  const isUnit = type === "units";

  return (
    <Modal
      title={`${value.id ? "Edit" : "Add"} ${
        isPin ? "Pincode" : type === "subCategories" ? "Sub-Category" : type.slice(0, -1)
      }`}
      close={close}
    >
      <div className="dialog-grid">
        {isPin ? (
          <>
            <Field label="Pincode *" value={item.pincode} onChange={v => set("pincode", v)} />
            <Field label="City" value={item.city} onChange={v => set("city", v)} />
            <Field label="District" value={item.district} onChange={v => set("district", v)} />
            <Field label="State" value={item.state} onChange={v => set("state", v)} />
            <Select
              label="Zone"
              value={item.zone_type || item.zone}
              onChange={v => {
                set("zone_type", v);
                set("zone", v);
              }}
              options={["Local", "Within State", "Zone/Metro", "Other States"]}
            />
            <Select
              label="Delivery Available"
              value={item.delivery_available !== false ? "Yes" : "No"}
              onChange={v => set("delivery_available", v === "Yes")}
              options={["Yes", "No"]}
            />
          </>
        ) : (
          <>
            <Field
              label={
                isSub
                  ? "Sub-Category Name *"
                  : type === "units"
                  ? "Unit Name *"
                  : `${type.slice(0, -1)} Name *`
              }
              value={item.name}
              onChange={v => set("name", v)}
            />
            {isSub && (
              <Select
                label="Parent Category *"
                value={item.category_id || ""}
                onChange={v => set("category_id", v)}
                options={data.categories.map(cat => ({
                  value: cat.id,
                  label: cat.name
                }))}
              />
            )}
            {isUnit && (
              <Field
                label="Short Form (e.g. pc, set)"
                value={item.shortName}
                onChange={v => set("shortName", v)}
              />
            )}
            <Select
              label="Status"
              value={item.active === false ? "Inactive" : "Active"}
              onChange={v => set("active", v === "Active")}
              options={["Active", "Inactive"]}
            />
          </>
        )}
      </div>
      <div className="dialog-actions">
        <button className="secondary-button" onClick={close}>
          Cancel
        </button>
        <button className="primary-button" onClick={() => save(item)}>
          Save Specification
        </button>
      </div>
    </Modal>
  );
}

function ProductDialog({ value, masters, save, close }) {
  const [product, setProduct] = useState({
    ...blankProduct(),
    ...value,
    images: value.images || (value.image ? [value.image] : [])
  });

  const patch = (key, val) => setProduct(old => ({ ...old, [key]: val }));

  const toggle = (key, val) =>
    setProduct(old => ({
      ...old,
      [key]: old[key].includes(val)
        ? old[key].filter(item => item !== val)
        : [...old[key], val]
    }));

  const addImage = () => patch("images", [...product.images, ""]);

  const updateImage = (index, val) =>
    patch("images", product.images.map((img, i) => (i === index ? val : img)));

  return (
    <Modal title={product.id ? "Edit Product Specification" : "Create New Product"} close={close} wide>
      <div className="product-dialog">
        <div className="form-section">
          <div className="form-section-header">
            <div>
              <h3>General Product Information</h3>
              <p>Primary identifiers and taxonomy classifications.</p>
            </div>
          </div>

          <div className="dialog-grid">
            <Field
              wide
              label="Product Title *"
              value={product.name}
              onChange={v => patch("name", v)}
              placeholder="e.g. Pure Silk Night Slip"
            />
            <Select
              label="Primary Category *"
              value={product.category}
              onChange={v =>
                setProduct(old => ({
                  ...old,
                  category: v,
                  subCategory: ""
                }))
              }
              options={masters.categories
                .filter(item => item.active !== false)
                .map(item => item.name)}
            />
            <Select
              label="Sub-Category"
              value={product.subCategory}
              onChange={v => patch("subCategory", v)}
              options={masters.subCategories
                .filter(item => {
                  const cat = masters.categories.find(c => c.name === product.category);
                  return item.category_id === cat?.id && item.active !== false;
                })
                .map(item => item.name)}
            />
            <Field
              label="Brand / Label"
              value={product.brand}
              onChange={v => patch("brand", v)}
              placeholder="Kashvi Select"
            />
            <Field
              label="SKU / Model Identifier"
              value={product.code}
              onChange={v => patch("code", v)}
              placeholder="KF-2026-001"
            />
            <Select
              label="Inventory Unit"
              value={product.unit}
              onChange={v => patch("unit", v)}
              options={masters.units.map(item => item.name)}
            />
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-header">
            <div>
              <h3>Pricing & Weight Specifications</h3>
              <p>Values used directly in automated shipping calculation.</p>
            </div>
          </div>

          <div className="dialog-grid">
            <Field
              label="MRP (Standard ₹)"
              type="number"
              value={product.mrp}
              onChange={v => patch("mrp", v)}
            />
            <Field
              label="Selling Price (₹) *"
              type="number"
              value={product.sellingPrice}
              onChange={v => patch("sellingPrice", v)}
            />
            <Field
              label="Unit Weight *"
              type="number"
              value={product.weight}
              onChange={v => patch("weight", v)}
            />
            <Select
              label="Weight Dimension"
              value={product.weightUnit}
              onChange={v => patch("weightUnit", v)}
              options={["grams", "kg"]}
            />
            <Select
              label="Publishing Status"
              value={product.active === false ? "Inactive" : "Active"}
              onChange={v => patch("active", v === "Active")}
              options={["Active", "Inactive"]}
            />
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-header">
            <div>
              <h3>Sizes & Colours Mapping</h3>
              <p>Configure selectable customer variants and matrix stock.</p>
            </div>
          </div>

          <div className="variant-group">
            <label>Available Sizes</label>
            <div className="choice-grid">
              {masters.sizes.map(item => (
                <button
                  type="button"
                  className={`choice-button ${
                    product.sizes.includes(item.name) ? "selected" : ""
                  }`}
                  key={item.id}
                  onClick={() => toggle("sizes", item.name)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div className="variant-group">
            <label>Available Colours</label>
            <div className="choice-grid">
              {masters.colours.map(item => (
                <button
                  type="button"
                  className={`choice-button ${
                    product.colours.includes(item.name) ? "selected" : ""
                  }`}
                  key={item.id}
                  onClick={() => toggle("colours", item.name)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {product.sizes.length > 0 && product.colours.length > 0 && (
            <div className="variant-stock-box">
              <div className="variant-stock-header">
                <div>
                  <h4>Stock Matrix (Quantity Allocation)</h4>
                  <p>Define inventory quantity available per combination.</p>
                </div>
              </div>
              <div className="table-wrapper">
                <table className="variant-table">
                  <thead>
                    <tr>
                      <th>Size</th>
                      {product.colours.map(clr => (
                        <th key={clr}>{clr}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {product.sizes.map(sz => (
                      <tr key={sz}>
                        <td>
                          <strong>{sz}</strong>
                        </td>
                        {product.colours.map(clr => {
                          const key = `${sz}__${clr}`;
                          return (
                            <td key={clr}>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={product.variants[key] || ""}
                                onChange={e =>
                                  patch("variants", {
                                    ...product.variants,
                                    [key]: e.target.value
                                  })
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="form-section">
          <div className="form-section-header">
            <div>
              <h3>Gallery & Product Copy</h3>
              <p>Image URLs and customer-facing descriptions.</p>
            </div>
          </div>

          <div className="image-list">
            {product.images.map((img, idx) => (
              <div className="image-input-row" key={idx}>
                <input
                  value={img}
                  placeholder="https://image-url.com/photo.jpg"
                  onChange={e => updateImage(idx, e.target.value)}
                />
                {img && <img src={img} alt="Preview" className="image-url-preview" />}
                <button
                  type="button"
                  className="icon-button danger-text"
                  onClick={() =>
                    patch(
                      "images",
                      product.images.filter((_, i) => i !== idx)
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="secondary-button" onClick={addImage}>
            + Add Image Link
          </button>

          <div className="dialog-grid description-fields">
            <Field
              wide
              label="Product Story / Overview"
              value={product.description}
              onChange={v => patch("description", v)}
              textarea
            />
            <Field
              wide
              label="Material & Fit Features"
              value={product.features}
              onChange={v => patch("features", v)}
              textarea
            />
            <Field
              wide
              label="Internal Operations Notes"
              value={product.notes}
              onChange={v => patch("notes", v)}
              textarea
            />
          </div>
        </div>

        <div className="dialog-actions product-dialog-actions">
          <button className="secondary-button" onClick={close}>
            Discard
          </button>
          <button
            className="primary-button"
            onClick={() => {
              if (product.name.trim() && product.category && product.sellingPrice) {
                save(product);
              } else {
                alert("Please fill required fields: Product Name, Category and Price");
              }
            }}
          >
            Save & Publish Product
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Orders({ orders, onView }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const shown = orders.filter(
    order =>
      (filter === "all" ||
        order.status === filter ||
        (filter === "refund" && order.status?.includes("refund"))) &&
      (!query ||
        order.id?.toLowerCase().includes(query.toLowerCase()) ||
        order.customer?.name?.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">FULFILMENT PIPELINE</span>
          <h2>Customer Orders</h2>
          <p>Verify UPI claims, dispatch parcels, and trigger customer WhatsApp alerts.</p>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search by Order ID, Phone or Customer name..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className="filter-row">
        {[
          "all",
          "new",
          "payment_verification",
          "payment_received",
          "stock_check",
          "processing",
          "shipped",
          "delivered",
          "refund"
        ].map(item => (
          <button
            className={`filter-chip ${filter === item ? "active" : ""}`}
            onClick={() => setFilter(item)}
            key={item}
          >
            {item === "all" ? "All Orders" : item === "refund" ? "Refunds" : statuses[item]}
          </button>
        ))}
      </div>

      <Card title={`${shown.length} Matching Orders`}>
        <div className="table-wrapper">
          <table className="data-table orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Created</th>
                <th>Amount</th>
                <th>Payment State</th>
                <th>Fulfillment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(item => (
                <tr key={item.id}>
                  <td>
                    <strong>#{item.id}</strong>
                    <small>Claim: {stamp(item.payment?.claimedAt || item.payment?.paidAt)}</small>
                  </td>
                  <td>
                    <strong>{item.customer?.name}</strong>
                    <small>{item.customer?.phone || item.customer?.mobile}</small>
                  </td>
                  <td>{stamp(item.createdAt || item.created_at)}</td>
                  <td>
                    <strong>{money(item.total)}</strong>
                    <small>{item.total_weight || item.totalWeight || 0}g</small>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        item.payment?.status === "received" ? "success" : "warning"
                      }`}
                    >
                      {item.payment?.status === "received" ? "Verified" : "Pending Check"}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${statusTone(item.status)}`}>
                      {statuses[item.status] || item.status}
                    </span>
                  </td>
                  <td>
                    <button className="text-button" onClick={() => onView(item)}>
                      Inspect Order →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && (
            <Empty
              title="No Orders Found"
              text="Storefront checkout submissions will appear here directly."
            />
          )}
        </div>
      </Card>
    </section>
  );
}

function OrderDialog({ order, update, close, notify }) {
  const [shipping, setShipping] = useState(order.shipping || {});
  const [refund, setRefund] = useState(order.refund || {});
  const setShip = (key, val) => setShipping(old => ({ ...old, [key]: val }));
  const setRefundVal = (key, val) => setRefund(old => ({ ...old, [key]: val }));

  const whatsapp = message => {
    const phone = (order.customer?.phone || order.customer?.mobile || "").replace(/\D/g, "");
    if (phone) {
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(
          `Hello ${order.customer?.name}, update on your Kashvi Fashions order #${order.id}: ${message}.`
        )}`,
        "_blank"
      );
    } else {
      notify("Customer phone number is missing");
    }
  };

  const action = (status, extra) => update(order.id, status, extra);

  return (
    <Modal title={`Fulfilment Details: #${order.id}`} close={close} wide>
      <div className="detail-grid">
        <div>
          <span>Customer Information</span>
          <strong>
            {order.customer?.name}
            <small>{order.customer?.phone || order.customer?.mobile}</small>
          </strong>
        </div>
        <div>
          <span>Timestamp</span>
          <strong>{stamp(order.createdAt || order.created_at)}</strong>
        </div>
        <div className="full">
          <span>Delivery Destination</span>
          <strong>
            {order.customer?.address}, {order.customer?.city || ""}, {order.customer?.pincode}
          </strong>
        </div>
      </div>

      <div className="section-mini">
        <h3>Order Items & Weight Breakdown</h3>
        {(order.items || []).map((item, idx) => (
          <div className="order-item" key={idx}>
            <div>
              <strong>{item.name}</strong>
              <small>
                {item.size} · {item.colour || item.color} · Qty {item.qty} · {item.productWeight}
                {item.weightUnit === "kg" ? "kg" : "g"} each
              </small>
            </div>
            <strong>{money(item.price * item.qty)}</strong>
          </div>
        ))}
        <div className="total-line">
          <span>Total Parcelling Weight</span>
          <strong>{order.total_weight || order.totalWeight}g</strong>
        </div>
      </div>

      <div className="payment-box">
        <div>
          <span>Grand Total</span>
          <strong>{money(order.total)}</strong>
        </div>
        <div>
          <span>Payment Status</span>
          <strong>
            {order.payment?.status === "received" ? "Verified & Received" : "Awaiting Verification"}
          </strong>
        </div>
        <div>
          <span>Claimed At</span>
          <strong>{stamp(order.payment?.claimedAt)}</strong>
        </div>
      </div>

      <div className="timeline">
        {["new", "payment_received", "stock_check", "processing", "shipped", "delivered"].map(
          stage => {
            const event =
              (order.history || []).find(item => item.status === stage) ||
              (stage === "new" ? { at: order.createdAt || order.created_at } : null);
            return (
              <div className={event ? "done" : ""} key={stage}>
                <b>{event ? "✓" : "○"}</b>
                <span>
                  {statuses[stage]}
                  <small>{event ? stamp(event.at) : "Pending"}</small>
                </span>
              </div>
            );
          }
        )}
      </div>

      <div className="modal-actions">
        {order.status === "payment_verification" && (
          <>
            <button
              className="primary-button"
              onClick={() =>
                action("payment_received", {
                  payment: {
                    ...order.payment,
                    status: "received",
                    verifiedAt: new Date().toISOString()
                  }
                })
              }
            >
              Approve Payment
            </button>
            <button
              className="secondary-button"
              onClick={() =>
                action("stock_unavailable", {
                  payment: { ...order.payment, status: "issue" }
                })
              }
            >
              Payment Query / Stock Issue
            </button>
            <button
              className="danger-button"
              onClick={() =>
                action("refund_pending", {
                  payment: { ...order.payment, status: "not_found" }
                })
              }
            >
              Reject / Refund Required
            </button>
          </>
        )}

        {order.status === "payment_received" && (
          <button className="primary-button" onClick={() => action("stock_check")}>
            Commence Stock Verification
          </button>
        )}

        {order.status === "stock_check" && (
          <>
            <button className="primary-button" onClick={() => action("processing")}>
              Confirm Stock & Process
            </button>
            <button className="danger-button" onClick={() => action("stock_unavailable")}>
              Mark Out-of-Stock
            </button>
          </>
        )}

        {order.status === "processing" && (
          <div className="inline-form">
            <input
              placeholder="Courier Partner (e.g. DTDC, Delhivery)"
              value={shipping.courier || ""}
              onChange={e => setShip("courier", e.target.value)}
            />
            <input
              placeholder="AWB / Tracking Number"
              value={shipping.trackingId || ""}
              onChange={e => setShip("trackingId", e.target.value)}
            />
            <input
              type="date"
              value={shipping.shippingDate || ""}
              onChange={e => setShip("shippingDate", e.target.value)}
            />
            <button
              className="primary-button"
              onClick={() => {
                if (shipping.trackingId) {
                  action("shipped", { shipping });
                } else {
                  notify("Tracking ID is mandatory for dispatch");
                }
              }}
            >
              Confirm Dispatch
            </button>
          </div>
        )}

        {order.status === "shipped" && (
          <button
            className="primary-button"
            onClick={() =>
              action("delivered", { deliveredAt: new Date().toISOString() })
            }
          >
            Mark Parcel Delivered
          </button>
        )}

        {order.status === "stock_unavailable" && (
          <>
            <button
              className="primary-button"
              onClick={() => action("refund_initiated", { refund })}
            >
              Initiate Refund Process
            </button>
            <button
              className="whatsapp-button"
              onClick={() => whatsapp("refund is currently being processed by our accounts team")}
            >
              WhatsApp Refund Notice
            </button>
          </>
        )}

        {order.status === "refund_initiated" && (
          <div className="inline-form">
            <input
              placeholder="Refund UTR / Bank Reference No."
              value={refund.reference || ""}
              onChange={e => setRefundVal("reference", e.target.value)}
            />
            <button
              className="primary-button"
              onClick={() =>
                action("refund_completed", {
                  refund: { ...refund, completedAt: new Date().toISOString() }
                })
              }
            >
              Complete Refund
            </button>
          </div>
        )}

        {["payment_received", "processing", "shipped", "delivered"].includes(order.status) && (
          <button
            className="whatsapp-button"
            onClick={() => whatsapp(`your order status is currently "${statuses[order.status]}"`)}
          >
            Send WhatsApp Update
          </button>
        )}
      </div>

      {order.shipping?.trackingId && (
        <div className="tracking-box">
          <span>Courier Consignment</span>
          <strong>{order.shipping.trackingId}</strong>
          <small>
            {order.shipping.courier} · Dispatched: {order.shipping.shippingDate}
          </small>
        </div>
      )}
    </Modal>
  );
}

function Settings({ value, setValue, notify }) {
  const [draft, setDraft] = useState(value);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => setDraft(value), [value]);

  const patch = (key, val) => setDraft(old => ({ ...old, [key]: val }));

  const saveSettings = () => {
    setValue(draft);
    setIsEditing(false);
    notify("Store settings saved successfully");
  };

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">STORE CONFIGURATION</span>
          <h2>Store Info</h2>
          <p>Define merchant details, UPI VPA for payment QR, and WhatsApp support contact.</p>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-section-header">
          <div>
            <h3>UPI & Merchant Identifiers</h3>
            <p>Direct destination credentials used by checkout and automated QR generation.</p>
          </div>
          {!isEditing && (
            <button className="primary-button" onClick={() => setIsEditing(true)}>
              Edit Info
            </button>
          )}
        </div>

        <div className="settings-grid">
          <Field
            label="Store Display Name"
            value={draft.storeName}
            onChange={v => patch("storeName", v)}
            readOnly={!isEditing}
          />
          <Field
            label="WhatsApp Business Contact"
            value={draft.whatsapp}
            onChange={v => patch("whatsapp", v)}
            placeholder="91XXXXXXXXXX"
            readOnly={!isEditing}
          />
          <Field
            label="UPI Virtual Payment Address (VPA) *"
            value={draft.upiId}
            onChange={v => patch("upiId", v)}
            placeholder="kashvi@upi"
            readOnly={!isEditing}
          />
          <Field
            label="Warehouse Origin Pincode"
            value={draft.originPincode}
            onChange={v => patch("originPincode", v)}
            readOnly={!isEditing}
          />
          <Field
            label="Fallback Flat Delivery Charge"
            type="number"
            value={draft.deliveryCharge}
            onChange={v => patch("deliveryCharge", v)}
            readOnly={!isEditing}
          />
        </div>

        {isEditing && (
          <div className="settings-footer">
            <button
              className="secondary-button"
              onClick={() => {
                setDraft(value);
                setIsEditing(false);
              }}
            >
              Cancel
            </button>
            <button className="primary-button" onClick={saveSettings}>
              Save Changes
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function RateCards({ notify }) {
  const [rateCards, setRateCards] = useState([]);
  const [rateLoading, setRateLoading] = useState(true);
  const [isRateEditing, setIsRateEditing] = useState(false);

  useEffect(() => {
    const loadRateCards = async () => {
      const { data, error } = await supabase
        .from("delivery_rate_cards")
        .select("*")
        .order("weight_from", { ascending: true });

      if (error) {
        console.error(error);
        notify("Failed to load delivery rate card");
      } else {
        setRateCards(data || []);
      }
      setRateLoading(false);
    };
    loadRateCards();
  }, []);

  const updateRateCard = (id, field, val) => {
    setRateCards(list =>
      list.map(item => (item.id === id ? { ...item, [field]: Number(val) } : item))
    );
  };

  const saveRateCards = async () => {
    try {
      for (const item of rateCards) {
        const { error } = await supabase
          .from("delivery_rate_cards")
          .update({
            local_rate: item.local_rate,
            within_state_rate: item.within_state_rate,
            zone_metro_rate: item.zone_metro_rate,
            other_states_rate: item.other_states_rate,
            additional_kg_rate_local: item.additional_kg_rate_local,
            additional_kg_rate_within_state: item.additional_kg_rate_within_state,
            additional_kg_rate_zone_metro: item.additional_kg_rate_zone_metro,
            additional_kg_rate_other_states: item.additional_kg_rate_other_states
          })
          .eq("id", item.id);

        if (error) throw error;
      }
      setIsRateEditing(false);
      notify("Delivery rate matrix saved successfully");
    } catch (error) {
      console.error(error);
      notify("Failed to save delivery rate card");
    }
  };

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">LOGISTICS CONFIGURATION</span>
          <h2>Delivery Rates</h2>
          <p>Weight slab delivery charges mapped directly from Supabase PostgreSQL tables.</p>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-section-header">
          <div>
            <h3>Dynamic Rate Cards Matrix</h3>
            <p>Automatic shipping charge calculations based on parcel weight and zone.</p>
          </div>
          {!isRateEditing && (
            <button className="primary-button" onClick={() => setIsRateEditing(true)}>
              Configure Rates
            </button>
          )}
        </div>

        {rateLoading ? (
          <p>Loading database rate cards...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
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
                      <strong>
                        {item.id === "RATE008"
                          ? "Every additional 1 kg"
                          : `${item.weight_from}–${item.weight_to} g`}
                      </strong>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={
                          item.id === "RATE008"
                            ? item.additional_kg_rate_local
                            : item.local_rate
                        }
                        readOnly={!isRateEditing}
                        onChange={e =>
                          updateRateCard(
                            item.id,
                            item.id === "RATE008"
                              ? "additional_kg_rate_local"
                              : "local_rate",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={
                          item.id === "RATE008"
                            ? item.additional_kg_rate_within_state
                            : item.within_state_rate
                        }
                        readOnly={!isRateEditing}
                        onChange={e =>
                          updateRateCard(
                            item.id,
                            item.id === "RATE008"
                              ? "additional_kg_rate_within_state"
                              : "within_state_rate",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={
                          item.id === "RATE008"
                            ? item.additional_kg_rate_zone_metro
                            : item.zone_metro_rate
                        }
                        readOnly={!isRateEditing}
                        onChange={e =>
                          updateRateCard(
                            item.id,
                            item.id === "RATE008"
                              ? "additional_kg_rate_zone_metro"
                              : "zone_metro_rate",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={
                          item.id === "RATE008"
                            ? item.additional_kg_rate_other_states
                            : item.other_states_rate
                        }
                        readOnly={!isRateEditing}
                        onChange={e =>
                          updateRateCard(
                            item.id,
                            item.id === "RATE008"
                              ? "additional_kg_rate_other_states"
                              : "other_states_rate",
                            e.target.value
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isRateEditing && (
          <div className="settings-footer">
            <button
              className="secondary-button"
              onClick={() => setIsRateEditing(false)}
            >
              Cancel
            </button>
            <button className="primary-button" onClick={saveRateCards}>
              Save Rate Matrix
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- CUSTOMER STOREFRONT (WITH AUTO-SCROLL HERO SLIDER) ---------------- */

function Storefront({
  products,
  categories,
  sizes,
  colours,
  pincodes,
  settings,
  banners,
  orders,
  setOrders,
  notify,
  customer,
  setCustomer,
  onAdmin
}) {
  const [cart, setCart] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState("");
  const [paymentStep, setPaymentStep] = useState(false);

  // Dynamic Banner Slider State
  const [currentSlide, setCurrentSlide] = useState(0);
  const activeBanners = banners && banners.length > 0 ? banners : defaultBanners;

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const [form, setForm] = useState({ name: "", phone: "", address: "", pincode: "" });
  const [tracking, setTracking] = useState({ id: "", phone: "" });
  const [trackResult, setTrackResult] = useState(null);

  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMode, setAccountMode] = useState("login");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationName, setVerificationName] = useState("");
  const [verificationMobile, setVerificationMobile] = useState("");

  const [accountForm, setAccountForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    identifier: ""
  });

  const destination = pincodes.find(
    item => String(item.pincode) === String(form.pincode).trim()
  );
  const origin = pincodes.find(
    item => String(item.pincode) === String(settings.originPincode)
  );
  const zone = shippingCategory(destination, origin);
  const totalWeight = cart.reduce((sum, item) => sum + weightGrams(item), 0);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
  const shipping = destination ? shippingRate(totalWeight || 1, zone) : 0;
  const total = subtotal + shipping;
  const cartCount = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  const filtered = products.filter(
    p =>
      p.active !== false &&
      (category === "All" || p.category === category) &&
      (!search || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = ({ product, quantity, size, colour }) => {
    const item = {
      productId: product.id,
      name: product.name,
      price: Number(product.sellingPrice),
      qty: quantity,
      size,
      colour,
      productWeight: Number(product.weight || 0),
      weightUnit: product.weightUnit || "grams",
      image: product.images?.[0] || product.image || ""
    };
    setCart(list => {
      const idx = list.findIndex(
        x => x.productId === item.productId && x.size === item.size && x.colour === item.colour
      );
      if (idx < 0) return [...list, item];
      return list.map((x, i) => (i === idx ? { ...x, qty: x.qty + item.qty } : x));
    });
    setSelected(null);
    notify("Added to your shopping bag");
  };

  const changeQty = (index, delta) =>
    setCart(list =>
      list.map((item, i) => (i === index ? { ...item, qty: Math.max(1, item.qty + delta) } : item))
    );

  const removeItem = index => setCart(list => list.filter((_, i) => i !== index));

  const upiLink = `upi://pay?pa=${encodeURIComponent(settings.upiId || "")}&pn=${encodeURIComponent(
    settings.storeName || "Kashvi Fashions"
  )}&am=${encodeURIComponent(total.toFixed(2))}&cu=INR&tn=${encodeURIComponent(
    "Kashvi Fashions Order"
  )}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(
    upiLink
  )}`;

  const startPayment = () => {
    if (!cart.length) return notify("Your cart is empty");
    if (!form.name || !form.phone || !form.pincode || !form.address)
      return notify("Please complete all delivery fields");
    if (!destination)
      return notify("Pincode not serviceable currently");
    if (!settings.upiId)
      return notify("Store UPI ID is not configured");

    setPaymentStep(true);
    setTimeout(() => {
      window.location.href = upiLink;
    }, 250);
  };

  const retryPayment = () => {
    if (!settings.upiId) return notify("Store UPI ID is missing");
    setTimeout(() => {
      window.location.href = upiLink;
    }, 150);
  };

  const placeOrder = async () => {
    if (!cart.length || !form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.pincode.trim()) {
      notify("Please fill all contact & delivery details");
      return;
    }
    if (!destination) {
      notify("Pincode is unserviceable");
      return;
    }
    if (!settings.upiId) {
      notify("UPI ID configuration missing");
      return;
    }

    const createdAt = new Date().toISOString();
    const newOrder = {
      id: makeId("KF"),
      created_at: createdAt,
      createdAt,
      customer: {
        ...form,
        city: destination.city || destination.office || "",
        district: destination.district || "",
        state: destination.state || ""
      },
      items: cart,
      subtotal,
      shippingCharge: shipping,
      total,
      totalWeight,
      total_weight: totalWeight,
      shippingZone: zone,
      payment: {
        status: "claimed",
        claimedAt: createdAt,
        method: "UPI",
        amount: total
      },
      status: "payment_verification",
      history: [
        { status: "new", at: createdAt },
        { status: "payment_verification", at: createdAt }
      ],
      shipping: {},
      refund: {}
    };

    try {
      const { error } = await supabase.from("orders").insert({
        id: newOrder.id,
        customer_id: customer?.id || null,
        status: newOrder.status,
        total: newOrder.total,
        total_weight: newOrder.totalWeight,
        payment: newOrder.payment,
        shipping: newOrder.shipping,
        refund: {},
        customer: newOrder.customer,
        items: newOrder.items,
        history: newOrder.history
      });

      if (error) throw error;

      setOrders(list => [newOrder, ...list]);
      setSubmittedOrderId(newOrder.id);
      setCart([]);
      setCheckoutOpen(true);
      setPaymentStep(false);
      setPaymentSubmitted(true);
      notify("Order placed! Verification in progress.");
    } catch (err) {
      console.error("Order error:", err);
      notify("Failed to place order. Try again.");
    }
  };

  const track = () => {
    const res = orders.find(
      o =>
        o.id.toLowerCase() === tracking.id.trim().toLowerCase() &&
        String(o.customer?.phone || o.customer?.mobile).trim() === String(tracking.phone).trim()
    );
    setTrackResult(res || false);
  };

  const loginCustomer = async () => {
    const identifier = accountForm.identifier.trim();
    if (!identifier || !accountForm.password) {
      notify("Enter both email/phone and password");
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier.includes("@") ? identifier : undefined,
        password: accountForm.password
      });

      if (error) throw error;
      if (data?.user) {
        setCustomer(data.user);
        setAccountOpen(false);
        setAccountForm({ name: "", email: "", mobile: "", password: "", identifier: "" });
        notify("Welcome back!");
      }
    } catch (err) {
      console.error("Login err:", err);
      notify(err.message || "Invalid credentials");
    }
  };

  const activeBanner = activeBanners[currentSlide] || activeBanners[0];

  return (
    <div className="ecom-store">
      <div className="ecom-announcement">
        ✦ COMPLIMENTARY SHIPPING ON ALL PREPAID UPI PURCHASES ✦
      </div>

      <header className="ecom-header">
        <div className="ecom-header-inner">
          <button
            className="ecom-logo"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <strong>KASHVI</strong>
            <span>FASHIONS · ESTD 2025</span>
          </button>

          <nav>
            <button onClick={() => document.getElementById("ecom-shop")?.scrollIntoView({ behavior: "smooth" })}>
              Collection
            </button>
            <button onClick={() => document.getElementById("ecom-shop")?.scrollIntoView({ behavior: "smooth" })}>
              Categories
            </button>
            <button onClick={() => document.getElementById("ecom-track")?.scrollIntoView({ behavior: "smooth" })}>
              Track Parcel
            </button>
          </nav>

          <div className="ecom-actions">
            <button
              className="cart-icon"
              onClick={() => setCartOpen(true)}
              title="Shopping Bag"
            >
              🛍 Bag {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>

            <button
              className="account-button"
              onClick={() => {
                if (!customer) {
                  setAccountMode("login");
                  setAccountOpen(true);
                } else {
                  notify(`Signed in as ${customer.email || "Customer"}`);
                }
              }}
            >
              {customer ? `Hi, ${(customer.email || "User").split("@")[0]}` : "Sign In"}
            </button>

            <button className="admin-link" onClick={onAdmin}>
              Admin Hub ↗
            </button>
          </div>
        </div>
      </header>

      {/* DYNAMIC AUTO-SCROLL HERO BANNER */}
      <section className="ecom-hero">
        <div className="slide-watermark">{activeBanner.watermark || "KASHVI"}</div>
        
        <div className="hero-content">
          <span className="ecom-eyebrow">{activeBanner.tagline}</span>
          <h1>
            {activeBanner.mainTitle.split("\n").map((line, idx) => (
              <React.Fragment key={idx}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </h1>
          <p>{activeBanner.desc}</p>
          <button
            className="ecom-primary"
            onClick={() => document.getElementById("ecom-shop")?.scrollIntoView({ behavior: "smooth" })}
          >
            {activeBanner.ctaText}
          </button>
        </div>

        <div className="hero-copy">
          <span>{activeBanner.sideBadge}</span>
          <strong>
            {activeBanner.sideTitle.split("\n").map((line, idx) => (
              <React.Fragment key={idx}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </strong>
        </div>

        {activeBanners.length > 1 && (
          <div className="slider-dots-container">
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                className={`slider-dot ${idx === currentSlide ? "active" : ""}`}
                onClick={() => setCurrentSlide(idx)}
              />
            ))}
          </div>
        )}
      </section>

      {/* CLEAN MINIMAL SEARCH & CATEGORY BAR (NO REDUNDANT HEADERS) */}
      <section id="ecom-shop" className="ecom-shop-section">
        <div className="search-filter-wrapper">
          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input
              placeholder="Search styles, fabrics, codes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="clear-search" onClick={() => setSearch("")}>
                ×
              </button>
            )}
          </div>

          <div className="category-pills">
            <button
              className={`pill-btn ${category === "All" ? "active" : ""}`}
              onClick={() => setCategory("All")}
            >
              All
            </button>
            {categories
              .filter(x => x.active !== false)
              .map(x => (
                <button
                  className={`pill-btn ${category === x.name ? "active" : ""}`}
                  key={x.id}
                  onClick={() => setCategory(x.name)}
                >
                  {x.name}
                </button>
              ))}
          </div>
        </div>

        {/* PRODUCTS GRID */}
        <div className="ecom-product-grid">
          {filtered.map(product => {
            const mrp = Number(product.mrp || 0);
            const price = Number(product.sellingPrice || 0);
            const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
            return (
              <article className="ecom-product-card" key={product.id}>
                <button
                  className="ecom-product-image"
                  onClick={() => setSelected(product)}
                >
                  {product.images?.[0] || product.image ? (
                    <img src={product.images?.[0] || product.image} alt={product.name} />
                  ) : (
                    <div className="image-placeholder">KF</div>
                  )}
                  {discount > 0 && <span className="discount-tag">{discount}% OFF</span>}
                </button>
                <div className="ecom-product-info">
                  <small>{product.category}</small>
                  <h3>{product.name}</h3>
                  <div className="price-row">
                    <strong>{money(price)}</strong>
                    {mrp > price && <del>{money(mrp)}</del>}
                  </div>
                  <button className="ecom-add" onClick={() => setSelected(product)}>
                    Quick Select
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {!filtered.length && (
          <div className="ecom-empty">
            <h3>No products found</h3>
            <p>Try resetting the search query or select another category.</p>
          </div>
        )}
      </section>

      <section className="ecom-trust">
        <div>✓ <span>Certified Quality Fabrics</span></div>
        <div>₹ <span>Instant UPI QR Verification</span></div>
        <div>↗ <span>Real-time Consignment Tracking</span></div>
        <div>♡ <span>Dedicated Helpline Support</span></div>
      </section>

      <section id="ecom-track" className="ecom-track">
        <span className="ecom-eyebrow">ORDER RECONCILIATION</span>
        <h2>Track Your Parcel</h2>
        <p>Enter your unique Order ID and registered phone number below.</p>
        <div className="track-form">
          <input
            placeholder="Order ID (e.g. KF123456)"
            value={tracking.id}
            onChange={e => setTracking({ ...tracking, id: e.target.value })}
          />
          <input
            placeholder="Phone Number"
            value={tracking.phone}
            onChange={e => setTracking({ ...tracking, phone: e.target.value })}
          />
          <button className="ecom-primary" onClick={track}>
            Track Consignment
          </button>
        </div>

        {trackResult && (
          <div className="track-card">
            <strong>Order #{trackResult.id}</strong>
            <span className={`status-badge ${statusTone(trackResult.status)}`}>
              {statuses[trackResult.status] || trackResult.status}
            </span>
            {trackResult.shipping?.trackingId && (
              <p>
                Courier: <b>{trackResult.shipping.courier}</b> | AWB:{" "}
                <strong>{trackResult.shipping.trackingId}</strong>
              </p>
            )}
          </div>
        )}
        {trackResult === false && (
          <p className="error-text">No corresponding order matches those credentials.</p>
        )}
      </section>

      <footer className="ecom-footer">
        <div>
          <strong>KASHVI FASHIONS</strong>
        </div>
        <p>Redefining daily lifestyle essentials with unmatched precision.</p>
        <button onClick={onAdmin}>Open Admin Operations</button>
      </footer>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="ecom-overlay" onClick={() => setCartOpen(false)}>
          <aside className="ecom-cart" onClick={e => e.stopPropagation()}>
            <div className="cart-head">
              <div>
                <span>SHOPPING BAG</span>
                <h2>Your Cart ({cartCount})</h2>
              </div>
              <button onClick={() => setCartOpen(false)}>×</button>
            </div>

            <div className="cart-items">
              {!cart.length && (
                <div className="ecom-empty">
                  <h3>Your bag is empty</h3>
                  <p>Discover pieces crafted for your daily wardrobe.</p>
                </div>
              )}
              {cart.map((item, index) => (
                <div
                  className="cart-item"
                  key={`${item.productId}-${item.size}-${item.colour}`}
                >
                  <div className="cart-img">
                    {item.image ? <img src={item.image} alt="" /> : "KF"}
                  </div>
                  <div>
                    <strong>{item.name}</strong>
                    <small>
                      {item.size}
                      {item.colour ? ` · ${item.colour}` : ""}
                    </small>
                    <b>{money(item.price)}</b>
                    <div className="qty">
                      <button onClick={() => changeQty(index, -1)}>−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => changeQty(index, 1)}>+</button>
                      <button className="remove-btn" onClick={() => removeItem(index)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="cart-bottom">
                <div>
                  <span>Bag Subtotal</span>
                  <strong>{money(subtotal)}</strong>
                </div>
                <button
                  className="ecom-primary full"
                  onClick={() => {
                    setCartOpen(false);
                    setCheckoutOpen(true);
                  }}
                >
                  Proceed to Secure Checkout →
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div
          className="ecom-overlay"
          onClick={() => {
            if (!paymentSubmitted) {
              setCheckoutOpen(false);
              setPaymentStep(false);
            }
          }}
        >
          <div className="checkout-modal" onClick={e => e.stopPropagation()}>
            <div className="cart-head">
              <div>
                <span>KASHVI CHECKOUT</span>
                <h2>
                  {paymentSubmitted
                    ? "Order Confirmation"
                    : paymentStep
                    ? "UPI Payment Portal"
                    : "Shipping & Contact"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setCheckoutOpen(false);
                  setPaymentStep(false);
                  setPaymentSubmitted(false);
                }}
              >
                ×
              </button>
            </div>

            {paymentSubmitted ? (
              <div className="payment-success-screen">
                <div className="payment-success-icon">✓</div>
                <span className="eyebrow">ORDER INITIATED</span>
                <h2>Thank you for your purchase!</h2>
                <p>
                  Your UPI payment claim is submitted. Our dispatch unit will verify the
                  transaction and release your parcel.
                </p>

                <div className="submitted-order-card">
                  <span>ORDER IDENTIFIER</span>
                  <strong>#{submittedOrderId}</strong>
                </div>

                <div className="submitted-payment-card">
                  <div>
                    <span>Total Paid</span>
                    <strong>{money(total)}</strong>
                  </div>
                  <div>
                    <span>Payment Mode</span>
                    <strong>UPI QR / App</strong>
                  </div>
                  <div>
                    <span>State</span>
                    <strong>Verification Pending</strong>
                  </div>
                </div>

                <div className="success-actions">
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setCheckoutOpen(false);
                      setPaymentSubmitted(false);
                    }}
                  >
                    Continue Browsing
                  </button>
                  <button
                    className="ecom-primary"
                    onClick={() => {
                      setCheckoutOpen(false);
                      setPaymentSubmitted(false);
                      document.getElementById("ecom-track")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Track Dispatch Status
                  </button>
                </div>
              </div>
            ) : !paymentStep ? (
              <div className="checkout-grid">
                <div>
                  <h3>Delivery Coordinates</h3>
                  <div className="checkout-fields">
                    <Field
                      label="Full Name *"
                      value={form.name}
                      onChange={v => setForm({ ...form, name: v })}
                    />
                    <Field
                      label="Mobile Contact *"
                      value={form.phone}
                      onChange={v => setForm({ ...form, phone: v })}
                    />
                    <Field
                      wide
                      label="Street Address, House No. *"
                      value={form.address}
                      onChange={v => setForm({ ...form, address: v })}
                    />
                    <Field
                      label="Destination Pincode *"
                      value={form.pincode}
                      onChange={v => setForm({ ...form, pincode: v })}
                    />
                  </div>

                  {destination ? (
                    <div className="destination-card">
                      <small>SERVICEABLE LOGISTICS DESTINATION</small>
                      <strong>
                        {destination.city || destination.office}, {destination.district}
                      </strong>
                      <span>
                        {destination.state} · Zone: {zone}
                      </span>
                    </div>
                  ) : form.pincode ? (
                    <p className="error-text">
                      Entered pincode not found in database. Check pincode.
                    </p>
                  ) : null}
                </div>

                <div className="summary-card">
                  <h3>Order Summary</h3>
                  {cart.map((item, idx) => (
                    <div className="summary-line" key={idx}>
                      <span>
                        {item.name}
                        <small>
                          {item.size} · {item.colour} · Qty {item.qty}
                        </small>
                      </span>
                      <strong>{money(item.price * item.qty)}</strong>
                    </div>
                  ))}
                  <hr />
                  <div className="summary-line">
                    <span>Consignment Weight</span>
                    <strong>{totalWeight} g</strong>
                  </div>
                  <div className="summary-line">
                    <span>Delivery Charge</span>
                    <strong>{destination ? money(shipping) : "—"}</strong>
                  </div>
                  <div className="summary-total">
                    <span>Grand Settlement</span>
                    <strong>{destination ? money(total) : "—"}</strong>
                  </div>

                  <button
                    className="ecom-primary full"
                    onClick={startPayment}
                  >
                    Proceed to UPI Payment · {destination ? money(total) : "—"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="upi-payment-screen">
                <div className="upi-payment-total">
                  <span>TOTAL SETTLEMENT</span>
                  <strong>{money(total)}</strong>
                </div>

                <div className="upi-qr-card">
                  <img src={qrUrl} alt="UPI QR Code" />
                  <strong>Scan QR Code</strong>
                  <small>Compatible with GPay, PhonePe, Paytm and BHIM</small>
                </div>

                <button className="ecom-primary full" onClick={retryPayment}>
                  Launch Installed UPI App
                </button>

                <div className="upi-return-note">
                  <strong>Verification Step</strong>
                  <p>
                    Once payment finishes in your UPI app, return here and tap{" "}
                    <b>I HAVE COMPLETED PAYMENT</b>.
                  </p>
                </div>

                <div className="upi-payment-actions">
                  <button className="secondary-button" onClick={retryPayment}>
                    Re-trigger App
                  </button>
                  <button className="ecom-primary" onClick={placeOrder}>
                    I HAVE COMPLETED PAYMENT
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account Modal */}
      {accountOpen && (
        <div className="ecom-overlay" onClick={() => setAccountOpen(false)}>
          <div className="account-modal" onClick={e => e.stopPropagation()}>
            <div className="cart-head">
              <div>
                <span>CUSTOMER PORTAL</span>
                <h2>{accountMode === "login" ? "Account Sign In" : "Register Profile"}</h2>
              </div>
              <button onClick={() => setAccountOpen(false)}>×</button>
            </div>

            {accountMode === "login" ? (
              <>
                <div className="account-fields">
                  <Field
                    label="Email ID or Mobile"
                    value={accountForm.identifier}
                    onChange={v => setAccountForm({ ...accountForm, identifier: v })}
                    placeholder="name@email.com"
                  />
                  <Field
                    label="Password"
                    type="password"
                    value={accountForm.password}
                    onChange={v => setAccountForm({ ...accountForm, password: v })}
                    placeholder="••••••••"
                  />
                </div>
                <button className="ecom-primary full" onClick={loginCustomer}>
                  Sign In
                </button>
                <button
                  className="account-switch"
                  onClick={() => setAccountMode("register")}
                >
                  New customer? Create an account →
                </button>
              </>
            ) : accountMode === "verify" ? (
              <Verification
                supabase={supabase}
                notify={notify}
                email={verificationEmail}
                name={verificationName}
                mobile={verificationMobile}
                setAccountMode={setAccountMode}
                setAccountOpen={setAccountOpen}
              />
            ) : (
              <CustomerRegister
                supabase={supabase}
                notify={notify}
                setAccountMode={setAccountMode}
                setVerificationEmail={setVerificationEmail}
                setVerificationName={setVerificationName}
                setVerificationMobile={setVerificationMobile}
              />
            )}
          </div>
        </div>
      )}

      {/* Quick View */}
      {selected && (
        <ProductQuickView
          product={selected}
          add={addToCart}
          close={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ---------------- GENERIC UI ELEMENTS ---------------- */

function Modal({ title, close, children, wide = false }) {
  return (
    <div className="modal-backdrop">
      <div className={`dialog ${wide ? "wide" : ""}`}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">KASHVI ARCHITECTURE</span>
            <h2>{title}</h2>
          </div>
          <button className="close-button" onClick={close}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Confirm({ dialog, close }) {
  return (
    <Modal title={dialog.title} close={close}>
      <p className="confirm-text">{dialog.text}</p>
      <div className="dialog-actions">
        <button className="secondary-button" onClick={close}>
          Cancel
        </button>
        <button
          className="danger-button"
          onClick={() => {
            dialog.action();
            close();
          }}
        >
          Confirm Delete
        </button>
      </div>
    </Modal>
  );
}

function Field({
  label,
  value = "",
  onChange,
  placeholder = "",
  type = "text",
  wide = false,
  textarea = false,
  readOnly = false
}) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      {label}
      {textarea ? (
        <textarea
          rows="3"
          value={value}
          placeholder={placeholder}
          readOnly={readOnly}
          onChange={e => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          readOnly={readOnly}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function Select({ label, value = "", onChange, options = [] }) {
  return (
    <label className="field">
      {label}
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select Option...</option>
        {options.map((opt, idx) => {
          const isObj = typeof opt === "object";
          const val = isObj ? opt.value : opt;
          const lab = isObj ? opt.label : opt;
          return (
            <option key={val || idx} value={val}>
              {lab}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function ProductQuickView({ product, add, close }) {
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState(product.sizes?.[0] || "");
  const [colour, setColour] = useState(product.colours?.[0] || "");

  return (
    <Modal title="" close={close} wide>
      <div className="ecom-quick-view">
        <div className="quick-image">
          {product.images?.[0] || product.image ? (
            <img src={product.images?.[0] || product.image} alt={product.name} />
          ) : (
            <div className="image-placeholder">KF</div>
          )}
        </div>
        <div className="quick-info">
          <small>{product.category}</small>
          <h2>{product.name}</h2>
          <div className="quick-price">
            <strong>{money(product.sellingPrice)}</strong>
            {product.mrp && Number(product.mrp) > Number(product.sellingPrice) && (
              <del>{money(product.mrp)}</del>
            )}
          </div>
          <p>{product.description || "Thoughtfully designed for daily silhouette and enduring comfort."}</p>

          {product.sizes?.length > 0 && (
            <div className="option">
              <label>SELECT SIZE</label>
              <div className="chip-grid">
                {product.sizes.map(item => (
                  <button
                    key={item}
                    className={size === item ? "selected" : ""}
                    onClick={() => setSize(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.colours?.length > 0 && (
            <div className="option">
              <label>SELECT COLOUR</label>
              <div className="chip-grid">
                {product.colours.map(item => (
                  <button
                    key={item}
                    className={colour === item ? "selected" : ""}
                    onClick={() => setColour(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="option">
            <label>QUANTITY</label>
            <div className="qty large">
              <button onClick={() => setQuantity(v => Math.max(1, v - 1))}>−</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity(v => v + 1)}>+</button>
            </div>
          </div>

          <button
            className="ecom-primary full glow"
            onClick={() => add({ product, quantity, size, colour })}
          >
            Add to Bag · {money(Number(product.sellingPrice) * quantity)}
          </button>
        </div>
      </div>
    </Modal>
  );
}