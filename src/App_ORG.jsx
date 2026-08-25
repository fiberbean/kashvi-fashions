    import { useEffect, useState } from "react";
    import CustomerRegister from "./Components/Customer/CustomerRegister";
    import "./App.css";
    import { pincodeDatabase } from "./pincodeData";
    import { supabase } from "./lib/supabase";

    const STORAGE = { products: "kashvi_products", categories: "kashvi_categories", subCategories: "kashvi_subCategories", colours: "kashvi_colours", sizes: "kashvi_sizes", units: "kashvi_units", orders: "kashvi_orders", pincodes: "kashvi_pincodes", settings: "kashvi_settings" };
    const safeRead = (name, fallback) => { try { return JSON.parse(localStorage.getItem(STORAGE[name]) || "null") ?? fallback; } catch { return fallback; } };
    const money = value => `₹${Number(value || 0).toLocaleString("en-IN")}`;
    const stamp = value => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";
    const makeId = prefix => `${prefix}${Date.now().toString().slice(-10)}`;
    const names = list => list.map(name => ({ id: name, name, active: true }));
    const seedCategories = names(["Bras", "Panties", "Leggings", "Night Wear", "Camisoles", "Slips", "Tops", "Saree Essentials", "Accessories"]);
    const seedSubCategories = seedCategories.flatMap(category => ({ Bras: ["Full Coverage Non-Padded Bra", "Sports Bra", "Side Support Bra"], Panties: ["Cotton Panty", "High Waist Panty", "Brief Panty"], Leggings: ["Full Length", "Ankle Length", "Capri"], "Night Wear": ["Basic Comfort", "Premium Comfort"], Camisoles: ["Padded Camisole", "Basic Camisole"], Slips: ["Full Slip", "Half Slip"], Tops: ["Tank Top", "Basic T-Shirt"], "Saree Essentials": ["Saree Fall", "Blouse Piece"], Accessories: ["Hair Accessories", "Other Accessories"] }[category.name] || []).map(name => ({ id: `${category.name}-${name}`, name, category: category.name, active: true })));
    const seedColours = names(["Black", "White", "Skin", "Pink", "Red", "Blue"]);
    const seedSizes = names(["XS", "S", "M", "L", "XL", "XXL"]);
    const seedUnits = [{ id: "piece", name: "Piece", shortName: "pc", active: true }, { id: "set", name: "Set", shortName: "set", active: true }];
    const defaultSettings = { storeName: "Kashvi Fashions", upiId: "", whatsapp: "", originPincode: "533001", deliveryCharge: 0 };
    const blankProduct = () => ({ name: "", category: "", subCategory: "", brand: "", code: "", unit: "piece", mrp: "", sellingPrice: "", weight: "", weightUnit: "grams", description: "", features: "", notes: "", images: [], sizes: [], colours: [], variants: {}, active: true });
    const statuses = { new: "New Order", payment_verification: "Payment Verification", payment_received: "Payment Received", stock_check: "Stock Check", processing: "Order Processing", shipped: "Shipped", delivered: "Delivered", stock_unavailable: "Stock Unavailable / Refund Required", refund_pending: "Refund Required", refund_initiated: "Refund Initiated", refund_completed: "Refund Completed" };
    const statusTone = status => ["delivered", "payment_received"].includes(status) ? "success" : status === "shipped" ? "shipped" : ["processing", "stock_check"].includes(status) ? "processing" : ["stock_unavailable", "refund_pending"].includes(status) ? "danger" : "warning";
    const weightGrams = item => Number(item.productWeight || 0) * (item.weightUnit === "kg" ? 1000 : 1) * Number(item.qty || 0);
    const shippingRate = (grams, zone) => { const slabs = [[500, [27, 31, 34, 35]], [1000, [31, 44, 51, 57]], [1500, [36, 58, 70, 80]], [2000, [45, 80, 100, 115]], [3000, [57, 100, 125, 145]], [4000, [69, 120, 150, 175]], [5000, [81, 140, 175, 205]]]; const index = { Local: 0, "Within State": 1, "Zone/Metro": 2, "Other States": 3 }[zone] ?? 3; const slab = slabs.find(item => grams <= item[0]); if (slab) return slab[1][index]; const extra = Math.ceil((grams - 5000) / 1000); return slabs[slabs.length - 1][1][index] + extra * [15, 20, 25, 30][index]; };
    const shippingCategory = (destination, origin) => { if (!destination) return ""; const destinationZone = destination.zone?.trim().toLowerCase(); const originZone = origin?.zone?.trim().toLowerCase(); if (String(destination.pincode) === String(origin?.pincode) || (destinationZone === "local" && originZone === "local")) return "Local"; if (destination.state?.trim().toLowerCase() === "andhra pradesh") return "Within State"; if (destinationZone === "zone/metro") return "Zone/Metro"; return "Other States"; };
    
    export default function App() {
        const [view, setView] = useState("admin");
    
        const [customer, setCustomer] = useState(null);
    const [page, setPage] = useState("dashboard"); const [notice, setNotice] = useState(""); const [dialog, setDialog] = useState(null); const [order, setOrder] = useState(null);
    const [products, setProducts] = useState(() => safeRead("products", []));
    useEffect(() => {
    const loadProducts = async () => {
        const { data, error } = await supabase
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Products load error:", error);
            notify(error.message || "Failed to load products");
            return;
        }

        setProducts(
    (data || []).map(item => ({
        ...item,

        subCategory: item.sub_category || "",
        modelNo: item.model_no || "",
        sellingPrice: item.selling_price || 0,
        costPrice: item.cost_price || 0,
        weightUnit: item.weight_unit || "grams",

        colors: item.colour
            ? item.colour.split(",").map(x => x.trim()).filter(Boolean)
            : [],

        sizes: item.size
            ? item.size.split(",").map(x => x.trim()).filter(Boolean)
            : [],

        variants: item.variants || {},

        images: item.images || []
    }))
);
    };

    loadProducts();
}, []);
    const [orders, setOrders] = useState(() => safeRead("orders", []));
    useEffect(() => {
    const loadOrders = async () => {
        const { data, error } = await supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Orders load error:", error);
            notify(error.message || "Failed to load orders");
            return;
        }

        setOrders(data || []);
    };

    loadOrders();
}, []);

    const [categories, setCategories] = useState([]); 

    useEffect(() => {
  const loadUnits = async () => {
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Units load error:", error);
      return;
    }

    setUnits(
      (data || []).map(item => ({
        ...item,
        shortName: item.short_name
      }))
    );
  };

  loadUnits();
}, []);

    useEffect(() => {
    const loadCategories = async () => {
        const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: false });

        if (error) {
        console.error("Categories load error:", error);
        return;
        }

        setCategories(data || []);
    };

    loadCategories();
    }, []);
    const [subCategories, setSubCategories] = useState([]);
    useEffect(() => {
    const loadSubCategories = async () => {
        const { data, error } = await supabase
        .from("sub_categories")
        .select("*")
        .order("created_at", { ascending: false });

        if (error) {
        console.error("Sub-Categories load error:", error);
        return;
        }

        setSubCategories(data || []);
    };
    loadSubCategories();
    }, []);

    useEffect(() => {
  const loadColours = async () => {
    const { data, error } = await supabase
      .from("colours")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Colours load error:", error);
      return;
    }

    setColours(data || []);
  };

  loadColours();
}, []);

useEffect(() => {
  const loadUnits = async () => {
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Units load error:", error);
      return;
    }

    setUnits(data || []);
  };

  loadUnits();
}, []); 

    const [colours, setColours] = useState([]); 
    const [sizes, setSizes] = useState([]); 
    const [units, setUnits] = useState([]); 
    const [pincodes, setPincodes] = useState([]); 
    const [settings, setSettings] = useState(() => ({ ...defaultSettings, ...safeRead("settings", {}) }));
    useEffect(() => {
    const loadCategories = async () => {
        const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

        if (error) {
        console.error("Categories load failed:", error);
        return;
        }

        setCategories(data || []);
    };

    loadCategories();
    }, []);
useEffect(() => {
  const loadSizes = async () => {
    const { data, error } = await supabase
      .from("sizes")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Sizes load failed:", error);
      return;
    }

    setSizes(data || []);
  };

  loadSizes();
}, []);

useEffect(() => {
  const loadPincodes = async () => {
    const { data, error } = await supabase
      .from("pincodes")
      .select("*")
      .order("pincode", { ascending: true })
      .range(0, 4999);

    if (error) {
      console.error("Pincodes load error:", error);
      return;
    }

    setPincodes(
      (data || []).map(item => ({
        ...item,
        zone: item.zone_type,
        areaType: item.delivery_available
          ? "Available"
          : "Not Available"
      }))
    );
  };

  loadPincodes();
}, []);

    useEffect(() => { Object.entries({ products, orders, subCategories, colours, sizes, units, pincodes, settings }).forEach(([name, value]) => localStorage.setItem(STORAGE[name], JSON.stringify(value))); }, [products, orders, categories, subCategories, colours, sizes, units, pincodes, settings]); 
    const notify = text => { setNotice(text); window.setTimeout(() => setNotice(""), 2600); }; const navigate = next => { setPage(next); setDialog(null); setOrder(null); };
    const updateOrder = (id, status, extra = {}) => { const event = { status, at: new Date().toISOString() }; setOrders(list => list.map(item => item.id === id ? { ...item, ...extra, status, history: [...(item.history || []), event] } : item)); setOrder(item => item ? { ...item, ...extra, status, history: [...(item.history || []), event] } : item); notify(`Order moved to ${statuses[status]}`); };
    if (view === "store") {
    return (
        <Storefront
        products={products}
        categories={categories}
        sizes={sizes}
        colours={colours}
        pincodes={pincodes}
        settings={settings}
        orders={orders}
        setOrders={setOrders}
        notify={notify}
        customer={customer}
        setCustomer={setCustomer}
        onAdmin={() => setView("admin")}
        />
    );
    }
    return <div className="admin-app"><Sidebar page={page} navigate={navigate} onStore={() => setView("store")} /><main className="main-content"><header className="topbar"><div><span className="mobile-brand">KASHVI</span><h1>{page === "dashboard" ? "Dashboard" : page === "subCategories" ? "Sub-Categories" : page === "pincodes" ? "Pincode Database" : page}</h1><p>Catalogue, orders and operations in one place</p></div><div className="top-actions"><span className="notification">◌ {orders.filter(item => item.status === "payment_verification").length}</span><span className="profile-pill"><span className="avatar">A</span> Admin</span></div></header>{page === "dashboard" && <Dashboard products={products} orders={orders} navigate={navigate} />}{page === "products" && <Products products={products} categories={categories} subCategories={subCategories} colours={colours} sizes={sizes} units={units} open={setDialog} notify={notify} setProducts={setProducts} />}{["categories", "subCategories", "colours", "sizes", "units", "pincodes"].includes(page) && <MasterPage type={page} data={{ categories, subCategories, colours, sizes, units, pincodes }} setters={{ categories: setCategories, subCategories: setSubCategories, colours: setColours, sizes: setSizes, units: setUnits, pincodes: setPincodes }} open={setDialog} />}{page === "orders" && <Orders orders={orders} onView={setOrder} />}{page === "settings" &&<Settings
    value={settings}
    setValue={setSettings}
    notify={notify}
    />}</main>{dialog?.kind === "product" && <ProductDialog value={dialog.value} masters={{ categories, subCategories, colours, sizes, units }} save={async item => {
    try {
        const productData = {
            id: item.id || makeId("PR"),
            name: item.name,
            category: item.category || null,
            sub_category: item.subCategory || null,
            colour: item.colors?.join(", ") || null,
            size: item.sizes?.join(", ") || null,
            unit: item.unit || null,
            brand: item.brand || null,
            sub_brand: item.subBrand || null,
            model_no: item.modelNo || null,
            barcode: null,
            selling_price: Number(item.sellingPrice || 0),
            cost_price: Number(item.costPrice || 0),
            gst: Number(item.gst || 0),
            weight: Number(item.weight || 0),
            weight_unit: item.weightUnit || "grams",
            images: item.images || [],
            variants: item.variants || {},
            active: true
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
                list.map(old =>
                    old.id === item.id
                        ? { ...item, ...data }
                        : old
                )
            );

            notify("Product updated");
        } else {
            const { data, error } = await supabase
                .from("products")
                .insert(productData)
                .select()
                .single();

            if (error) throw error;

            setProducts(list => [
                { ...item, ...data },
                ...list
            ]);

            notify("Product added");
        }

        setDialog(null);

    } catch (error) {
        console.error("Product save error:", error);
        notify(error.message || "Failed to save product");
    }
}}
close={() => setDialog(null)}
/>
    }

{dialog?.kind === "master" && (
    <MasterDialog
        type={dialog.type}
        value={dialog.value}
        data={{ categories, subCategories }}
        save={async item => {
        if (dialog.type === "categories") {
            try {
            if (item.id) {
                const { data, error } = await supabase
                .from("categories")
                .update({
                    name: item.name
                })
                .eq("id", item.id)
                .select()
                .single();

                if (error) throw error;

                setCategories(list =>
                list.map(old => old.id === item.id ? data : old)
                );

                setDialog(null);
                notify("Category updated");
            } else {
                const newCategory = {
                id: makeId("CAT"),
                name: item.name,
                created_at: new Date().toISOString()
                };

                const { data, error } = await supabase
                .from("categories")
                .insert([newCategory])
                .select()
                .single();

                if (error) throw error;

                setCategories(list => [data, ...list]);

                setDialog(null);
                notify("Category added");
            }
            } catch (error) {
            console.error("Category save error:", error);
            notify(error.message || "Failed to save category");
            }

            return;
        }

        if (dialog.type === "subCategories") {
    try {
        if (item.id) {
        const { data, error } = await supabase
            .from("sub_categories")
            .update({
            name: item.name,
            category_id: item.category_id
            })
            .eq("id", item.id)
            .select()
            .single();

        if (error) throw error;

        setSubCategories(list =>
            list.map(old => old.id === item.id ? data : old)
        );

        setDialog(null);
        notify("Sub-Category updated");
        } else {
        const newSubCategory = {
            id: makeId("SUB"),
            name: item.name,
            category_id: item.category_id,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from("sub_categories")
            .insert([newSubCategory])
            .select()
            .single();

        if (error) throw error;

        setSubCategories(list => [data, ...list]);

        setDialog(null);
        notify("Sub-Category added");
        }
    } catch (error) {
        console.error("Sub-Category save error:", error);
        notify(error.message || "Failed to save sub-category");
    }

    return;
    }

    if (dialog.type === "colours") {
  try {
    if (item.id) {
      const { data, error } = await supabase
        .from("colours")
        .update({
          name: item.name,
          active: item.active !== false
        })
        .eq("id", item.id)
        .select()
        .single();

      if (error) throw error;

      setColours(list =>
        list.map(old =>
          old.id === item.id ? data : old
        )
      );

      setDialog(null);
      notify("Colour updated");
    } else {
      const newColour = {
        id: makeId("CLR"),
        name: item.name,
        active: item.active !== false,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("colours")
        .insert([newColour])
        .select()
        .single();

      if (error) throw error;

      setColours(list => [data, ...list]);

      setDialog(null);
      notify("Colour added");
    }
  } catch (error) {
    console.error("Colour save error:", error);
    notify(error.message || "Failed to save colour");
  }

  return;
}

if (dialog.type === "sizes") {
  try {
    if (item.id) {
      const { data, error } = await supabase
        .from("sizes")
        .update({
          name: item.name,
          active: item.active !== false
        })
        .eq("id", item.id)
        .select()
        .single();

      if (error) throw error;

      setSizes(list =>
        list.map(old => old.id === item.id ? data : old)
      );

      setDialog(null);
      notify("Size updated");
    } else {
      const newSize = {
        id: makeId("SIZE"),
        name: item.name,
        active: item.active !== false,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("sizes")
        .insert([newSize])
        .select()
        .single();

      if (error) throw error;

      setSizes(list => [data, ...list]);

      setDialog(null);
      notify("Size added");
    }
  } catch (error) {
    console.error("Size save error:", error);
    notify(error.message || "Failed to save size");
  }

  return;
}
if (dialog.type === "units") {
  try {
    if (item.id) {
      const { data, error } = await supabase
        .from("units")
        .update({
          name: item.name,
          short_name: item.shortName,
          active: item.active !== false
        })
        .eq("id", item.id)
        .select()
        .single();

      if (error) throw error;

      const updatedUnit = {
        ...data,
        shortName: data.short_name
      };

      setUnits(list =>
        list.map(old =>
          old.id === item.id ? updatedUnit : old
        )
      );

      setDialog(null);
      notify("Unit updated");
    } else {
      const newUnit = {
        id: makeId("UNIT"),
        name: item.name,
        short_name: item.shortName,
        active: item.active !== false,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("units")
        .insert([newUnit])
        .select()
        .single();

      if (error) throw error;

      const addedUnit = {
        ...data,
        shortName: data.short_name
      };

      setUnits(list => [addedUnit, ...list]);

      setDialog(null);
      notify("Unit added");
    }
  } catch (error) {
    console.error("Unit save error:", error);
    notify(error.message || "Failed to save unit");
  }

  return;
}

if (dialog.type === "pincodes") {
  try {
    if (item.id) {
      const { data, error } = await supabase
        .from("pincodes")
        .update({
          pincode: item.pincode,
          city: item.city,
          state: item.state,
          zone_type: item.zone_type,
          delivery_available: item.delivery_available
        })
        .eq("id", item.id)
        .select()
        .single();

      if (error) throw error;

      setPincodes(list =>
        list.map(old => old.id === item.id ? data : old)
      );

      setDialog(null);
      notify("Pincode updated");
    } else {
      const newPincode = {
        id: makeId("PIN"),
        pincode: item.pincode,
        city: item.city || "",
        state: item.state || "",
        zone_type: item.zone_type || "Other States",
        delivery_available: item.delivery_available !== false,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("pincodes")
        .insert([newPincode])
        .select()
        .single();

      if (error) throw error;

      setPincodes(list => [data, ...list]);

      setDialog(null);
      notify("Pincode added");
    }
  } catch (error) {
    console.error("Pincode save error:", error);
    notify(error.message || "Failed to save pincode");
  }

  return;
}
        }}
        close={() => setDialog(null)}
    />
    )}{dialog?.kind === "confirm" && <Confirm dialog={dialog} close={() => setDialog(null)} />}{order && <OrderDialog order={order} update={updateOrder} close={() => setOrder(null)} notify={notify} />}{notice && <div className="toast">✓ {notice}</div>}</div>;
    }

    function Sidebar({ page, navigate, onStore }) { const links = [["dashboard", "⌂", "Dashboard"], ["products", "▦", "Products"], ["orders", "▤", "Orders"], ["categories", "◉", "Categories"], ["subCategories", "◇", "Sub-Categories"], ["colours", "●", "Colours"], ["sizes", "□", "Sizes"], ["units", "◫", "Units"], ["pincodes", "⌖", "Pincode Database"], ["settings", "⚙", "Settings"]]; return <aside className="sidebar"><div className="brand"><div className="brand-logo">K</div><div><div className="brand-name">Kashvi</div><div className="brand-sub">FASHIONS ADMIN</div></div></div><div className="menu-title">WORKSPACE</div>{links.map(([id, icon, label]) => <button className={`menu-item ${page === id ? "active" : ""}`} onClick={() => navigate(id)} key={id}><span>{icon}</span>{label}</button>)}<button className="store-link" onClick={onStore}>↗ Open Storefront</button><div className="sidebar-bottom"><div className="admin-profile"><span className="avatar">A</span><div><strong>Admin</strong><small>Catalogue manager</small></div></div></div></aside>; }
    function Dashboard({ products, orders, navigate }) { const metrics = [["Total Products", products.length, "▦"], ["Active Products", products.filter(item => item.active !== false).length, "◉"], ["New Orders", orders.filter(item => ["new", "payment_verification"].includes(item.status)).length, "✦"], ["Processing Orders", orders.filter(item => item.status === "processing").length, "◷"], ["Shipped Orders", orders.filter(item => item.status === "shipped").length, "↗"], ["Delivered Orders", orders.filter(item => item.status === "delivered").length, "✓"], ["Pending Payments", orders.filter(item => item.payment?.status !== "received").length, "₹"], ["Categories", "-", "⌘"]]; return <section className="page"><div className="welcome-card"><div><span className="eyebrow">KASHVI FASHIONS / OPERATIONS</span><h2>Good morning, Admin.</h2><p>Keep your catalogue polished and every order moving.</p><button className="primary-button" onClick={() => navigate("products")}>Manage Catalogue →</button></div><div className="welcome-mark">K</div></div><div className="stats-grid">{metrics.map(item => <Stat key={item[0]} label={item[0]} value={item[1]} icon={item[2]} />)}</div><div className="dashboard-grid"><Card title="Recent Orders" action="View all" onAction={() => navigate("orders")}>{orders.length ? <OrderRows orders={orders.slice(0, 5)} /> : <Empty title="No orders yet" text="Customer orders will appear here." />}</Card><Card title="Recent Products" action="View catalogue" onAction={() => navigate("products")}>{products.length ? <div className="mini-list">{products.slice(0, 5).map(product => <div className="mini-row" key={product.id}><Thumb product={product} /><div><strong>{product.name}</strong><small>{product.category} · {money(product.sellingPrice)}</small></div></div>)}</div> : <Empty title="Your catalogue is empty" text="Add your first product to begin." />}</Card></div><Card title="Order Status Summary"><div className="status-summary">{Object.entries(statuses).map(([status, label]) => { const count = orders.filter(item => item.status === status).length; return count ? <div key={status}><span>{label}</span><strong>{count}</strong><i style={{ width: `${Math.max(10, count / Math.max(orders.length, 1) * 100)}%` }} /></div> : null; })}</div></Card></section>; }
    function Stat({ label, value, icon }) { return <div className="stat-card"><span className="stat-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>; } function Card({ title, action, onAction, children }) { return <div className="section-card"><div className="section-header"><h3>{title}</h3>{action && <button className="text-button" onClick={onAction}>{action} →</button>}</div>{children}</div>; } function Empty({ title, text }) { return <div className="empty-state"><div className="empty-icon">◌</div><h3>{title}</h3><p>{text}</p></div>; } function Thumb({ product }) { const image = product.images?.[0] || product.image; return image ? <img className="product-thumb" src={image} alt="" /> : <div className="product-thumb placeholder">K</div>; } function OrderRows({ orders }) { return <div className="order-list">{orders.map(item => <div className="order-row" key={item.id}><div><strong>#{item.id}</strong><small>{item.customer.name} · {item.customer.phone || item.customer.mobile}</small></div><div><strong>{money(item.total)}</strong><span className={`status-badge ${statusTone(item.status)}`}>{statuses[item.status] || item.status}</span></div></div>)}</div>; }

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

    const filtered = products.filter(item =>
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
        text: "This product will be permanently removed.",
        action: async () => {
            const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", item.id);

            if (error) {
                console.error("Product delete failed:", error);
                alert(`Delete failed: ${error.message}`);
                return;
            }

            setProducts(list =>
                list.filter(old => old.id !== item.id)
            );

            notify("Product deleted");
        }
    });
    return (
        <section className="page">

        <div className="page-heading">
            <div>
            <span className="eyebrow">CATALOGUE</span>
            <h2>Products</h2>
            <p>Maintain your customer-facing product range.</p>
            </div>

            <button
            className="primary-button"
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
            placeholder="Search product or model..."
            value={query}
            onChange={event => setQuery(event.target.value)}
            />

            <select
            value={category}
            onChange={event => setCategory(event.target.value)}
            >
            <option value="">All Categories</option>

            {categories.map(item => (
                <option key={item.id} value={item.name}>
                {item.name}
                </option>
            ))}
            </select>

            <select
            value={status}
            onChange={event => setStatus(event.target.value)}
            >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
            </select>

        </div>

        <Card title={`${filtered.length} Products`}>

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
                            <strong className="product-title">
                                {item.name}
                            </strong>

                            <small className="product-model">
                                {item.code
                                ? `Model: ${item.code}`
                                : "No model number"}
                            </small>
                            </div>

                        </div>
                        </td>

                        <td>
                        <div className="category-cell">
                            <strong>{item.category || "-"}</strong>

                            {item.subCategory && (
                            <small>{item.subCategory}</small>
                            )}
                        </div>
                        </td>

                        <td>
                        <div className="price-cell">

                            <strong>
                            {money(sellingPrice)}
                            </strong>

                            {mrp > sellingPrice && (
                            <small className="strike">
                                {money(mrp)}
                            </small>
                            )}

                        </div>
                        </td>

                        <td>
                        <strong>
                            {item.weight || 0}
                        </strong>{" "}
                        {item.weightUnit === "kg" ? "kg" : "g"}
                        </td>

                        <td>
                        <span
                            className={`status-badge ${
                            item.active === false
                                ? "danger"
                                : "success"
                            }`}
                        >
                            {item.active === false
                            ? "Inactive"
                            : "Active"}
                        </span>
                        </td>

                        <td>
                        <div className="table-actions">

                            <button
                            className="icon-button"
                            onClick={() =>
                                open({
                                kind: "product",
                                value: {
                                    ...blankProduct(),
                                    ...item
                                }
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
                text="Adjust your filters or add a new product."
                />
            )}

            </div>

        </Card>

        </section>
    );
    }

    function MasterPage({ type, data, setters, open }) { const list = data[type] || []; const title = type === "subCategories" ? "Sub-Categories" : type === "pincodes" ? "Pincode Database" : type[0].toUpperCase() + type.slice(1); const remove = item => open({
    kind: "confirm",
    title: `Delete ${title.toLowerCase()}?`,
    text: "This record will be permanently removed.",
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

        if (!tableName) {
        console.error("Unknown table:", type);
        return;
        }

        const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", item.id);

        if (error) {
        console.error("Delete failed:", error);
        alert(`Delete failed: ${error.message}`);
        return;
        }

        // Remove from UI only after successful database deletion
        setters[type](
        items => items.filter(old => old.id !== item.id)
        );
    }
    }); return <section className="page"><div className="page-heading"><div><span className="eyebrow">MASTER DATA</span><h2>{title}</h2><p>Keep catalogue data consistent across products and checkout.</p></div><button className="primary-button" onClick={() => open({ kind: "master", type, value: { name: "", active: true } })}>+ Add {type === "pincodes" ? "Pincode" : title.replace("Sub-Categories", "Sub-Category").replace(/s$/, "")}</button></div><Card title={`${list.length} records`}><div className="table-wrapper"><table className="data-table"><thead><tr>{type === "pincodes" ? <><th>Pincode</th><th>City</th><th>State</th><th>Zone</th><th>Delivery</th></> : <><th>Name</th>{type === "subCategories" && <th>Category</th>}{type === "units" && <th>Short Name</th>}<th>Status</th></>}<th>Actions</th></tr></thead><tbody>{list.map(item => <tr key={item.id}><td><strong>{item.name || item.pincode}</strong></td>{type === "pincodes" ? <><td>{item.city}</td><td>{item.state}</td><td>{item.zone}</td><td>{item.areaType}</td></> : <>{type === "subCategories" && (
  <td>
    {data.categories.find(category => category.id === item.category_id)?.name || "-"}
  </td>
)}{type === "units" && <td>{item.shortName}</td>}<td><span className={`status-badge ${item.active === false ? "danger" : "success"}`}>{item.active === false ? "Inactive" : "Active"}</span></td></>}<td className="actions"><button className="icon-button" onClick={() => open({ kind: "master", type, value: item })}>Edit</button><button className="icon-button danger-text" onClick={() => remove(item)}>Delete</button></td></tr>)}</tbody></table>{!list.length && <Empty title="No records yet" text="Create your first master-data record." />}</div></Card></section>; }
    function MasterDialog({ type, value, data, save, close }) { const [item, setItem] = useState({ active: true, ...value }); const set = (key, val) => setItem(old => ({ ...old, [key]: val })); const isPin = type === "pincodes"; const isSub = type === "subCategories"; const isUnit = type === "units"; return <Modal title={`${value.id ? "Edit" : "Add"} ${isPin ? "Pincode" : type === "subCategories" ? "Sub-Category" : type.slice(0, -1)}`} close={close}><div className="dialog-grid">{isPin ? <><Field label="Pincode" value={item.pincode} onChange={v => set("pincode", v)} /><Field label="City" value={item.city} onChange={v => set("city", v)} /><Field label="District" value={item.district} onChange={v => set("district", v)} /><Field label="State" value={item.state} onChange={v => set("state", v)} /><Select label="Zone" value={item.zone} onChange={v => set("zone", v)} options={["Local", "Within State", "Zone/Metro", "Other States"]} /><Field label="Delivery Type / Area Type" value={item.areaType} onChange={v => set("areaType", v)} /></> : <><Field label={isSub ? "Sub-Category Name" : type === "units" ? "Unit Name" : `${type.slice(0, -1)} Name`} value={item.name} onChange={v => set("name", v)} />{isSub && (
  <Select
    label="Category"
    value={item.category_id || ""}
    onChange={v => set("category_id", v)}
    options={data.categories.map(category => ({
      value: category.id,
      label: category.name
    }))}
  />
)}{isUnit && <Field label="Short Name" value={item.shortName} onChange={v => set("shortName", v)} />}<Select label="Status" value={item.active === false ? "Inactive" : "Active"} onChange={v => set("active", v === "Active")} options={["Active", "Inactive"]} /></>}</div><div className="dialog-actions"><button className="secondary-button" onClick={close}>Cancel</button><button className="primary-button" onClick={() => save(item)}>Save</button></div></Modal>; }
    function ProductDialog({ value, masters, save, close }) {

    const [product, setProduct] = useState({
        ...blankProduct(),
        ...value,
        images:
        value.images ||
        (value.image ? [value.image] : [])
    });

    const patch = (key, val) =>
        setProduct(old => ({
        ...old,
        [key]: val
        }));

    const toggle = (key, value) =>
        setProduct(old => ({
        ...old,
        [key]: old[key].includes(value)
            ? old[key].filter(item => item !== value)
            : [...old[key], value]
        }));

    const addImage = () =>
        patch("images", [...product.images, ""]);

    const updateImage = (index, value) =>
        patch(
        "images",
        product.images.map((image, i) =>
            i === index ? value : image
        )
        );

    return (
        <Modal
        title={product.id ? "Edit Product" : "Add Product"}
        close={close}
        wide
        >

        <div className="product-dialog">

            {/* BASIC INFORMATION */}
            <div className="form-section">

            <div className="form-section-header">
                <div>
                <h3>Basic Information</h3>
                <p>Enter the basic details of this product.</p>
                </div>
            </div>

            <div className="dialog-grid">

                <Field
                wide
                label="Product Name *"
                value={product.name}
                onChange={v => patch("name", v)}
                placeholder="e.g. Full Coverage Non-Padded Bra"
                />

                <Select
                label="Category *"
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
        const category = masters.categories.find(
            c => c.name === product.category
        );

        return (
            item.category_id === category?.id &&
            item.active !== false
        );
    })
    .map(item => item.name)}
                />

                <Field
                label="Brand"
                value={product.brand}
                onChange={v => patch("brand", v)}
                />

                <Field
                label="Product Code / Model No"
                value={product.code}
                onChange={v => patch("code", v)}
                placeholder="e.g. KF0001"
                />

                <Select
                label="Unit"
                value={product.unit}
                onChange={v => patch("unit", v)}
                options={masters.units.map(item => item.name)}
                />

            </div>

            </div>


            {/* PRICING */}
            <div className="form-section">

            <div className="form-section-header">
                <div>
                <h3>Pricing & Weight</h3>
                <p>Set product pricing and weight details.</p>
                </div>
            </div>

            <div className="dialog-grid">

                <Field
                label="MRP"
                type="number"
                value={product.mrp}
                onChange={v => patch("mrp", v)}
                />

                <Field
                label="Selling Price *"
                type="number"
                value={product.sellingPrice}
                onChange={v =>
                    patch("sellingPrice", v)
                }
                />

                <Field
                label="Product Weight / Unit"
                type="number"
                value={product.weight}
                onChange={v =>
                    patch("weight", v)
                }
                />

                <Select
                label="Weight Unit"
                value={product.weightUnit}
                onChange={v =>
                    patch("weightUnit", v)
                }
                options={["grams", "kg"]}
                />

                <Select
                label="Status"
                value={
                    product.active === false
                    ? "Inactive"
                    : "Active"
                }
                onChange={v =>
                    patch("active", v === "Active")
                }
                options={["Active", "Inactive"]}
                />

            </div>

            </div>


            {/* SIZES & COLOURS */}
            <div className="form-section">

            <div className="form-section-header">
                <div>
                <h3>Sizes & Colours</h3>
                <p>Select the available variants for this product.</p>
                </div>
            </div>

            <div className="variant-group">

                <label>Available Sizes</label>

                <div className="choice-grid">

                {masters.sizes.map(item => (
                    <button
                    type="button"
                    className={`choice-button ${
                        product.sizes.includes(item.name)
                        ? "selected"
                        : ""
                    }`}
                    key={item.id}
                    onClick={() =>
                        toggle("sizes", item.name)
                    }
                    >
                    {item.name}
                    </button>
                ))}

                <button
                    type="button"
                    className="add-chip"
                    onClick={() =>
                    alert(
                        "Create a size from the Sizes menu"
                    )
                    }
                >
                    + Size
                </button>

                </div>

            </div>


            <div className="variant-group">

                <label>Available Colours</label>

                <div className="choice-grid">

                {masters.colours.map(item => (
                    <button
                    type="button"
                    className={`choice-button ${
                        product.colours.includes(item.name)
                        ? "selected"
                        : ""
                    }`}
                    key={item.id}
                    onClick={() =>
                        toggle("colours", item.name)
                    }
                    >
                    {item.name}
                    </button>
                ))}

                <button
                    type="button"
                    className="add-chip"
                    onClick={() =>
                    alert(
                        "Create a colour from the Colours menu"
                    )
                    }
                >
                    + Colour
                </button>

                </div>

            </div>


            {product.sizes.length > 0 &&
                product.colours.length > 0 && (

                <div className="variant-stock-box">

                    <div className="variant-stock-header">
                    <div>
                        <h4>Stock by Size & Colour</h4>
                        <p>
                        Enter the available quantity for
                        each variant.
                        </p>
                    </div>
                    </div>

                    <div className="table-wrapper">

                    <table className="variant-table">

                        <thead>
                        <tr>
                            <th>Size</th>

                            {product.colours.map(colour => (
                            <th key={colour}>
                                {colour}
                            </th>
                            ))}

                        </tr>
                        </thead>

                        <tbody>

                        {product.sizes.map(size => (

                            <tr key={size}>

                            <td>
                                <strong>{size}</strong>
                            </td>

                            {product.colours.map(colour => {

                                const key =
                                `${size}__${colour}`;

                                return (
                                <td key={colour}>

                                    <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={
                                        product.variants[key] ||
                                        ""
                                    }
                                    onChange={event =>
                                        patch(
                                        "variants",
                                        {
                                            ...product.variants,
                                            [key]:
                                            event.target.value
                                        }
                                        )
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


            {/* IMAGES & DESCRIPTION */}
            <div className="form-section">

            <div className="form-section-header">
                <div>
                <h3>Images & Description</h3>
                <p>
                    Add product images and customer-facing
                    information.
                </p>
                </div>
            </div>

            <div className="image-list">

                {product.images.map((image, index) => (

                <div
                    className="image-input-row"
                    key={index}
                >

                    <input
                    value={image}
                    placeholder="Product image URL"
                    onChange={event =>
                        updateImage(
                        index,
                        event.target.value
                        )
                    }
                    />

                    {image && (
                    <img
                        src={image}
                        alt="Preview"
                        className="image-url-preview"
                    />
                    )}

                    <button
                    type="button"
                    className="icon-button danger-text"
                    onClick={() =>
                        patch(
                        "images",
                        product.images.filter(
                            (_, i) => i !== index
                        )
                        )
                    }
                    >
                    Remove
                    </button>

                </div>

                ))}

            </div>

            <button
                type="button"
                className="secondary-button"
                onClick={addImage}
            >
                + Add Image URL
            </button>


            <div className="dialog-grid description-fields">

                <Field
                wide
                label="Product Description"
                value={product.description}
                onChange={v =>
                    patch("description", v)
                }
                textarea
                />

                <Field
                wide
                label="Features"
                value={product.features}
                onChange={v =>
                    patch("features", v)
                }
                textarea
                />

                <Field
                wide
                label="Optional Notes"
                value={product.notes}
                onChange={v =>
                    patch("notes", v)
                }
                textarea
                />

            </div>

            </div>


            {/* ACTIONS */}
            <div className="dialog-actions product-dialog-actions">

            <button
                className="secondary-button"
                onClick={close}
            >
                Cancel
            </button>

            <button
                className="primary-button"
                onClick={() =>
                product.name.trim() &&
                product.category &&
                product.sellingPrice
                    ? save(product)
                    : alert(
                        "Enter product name, category and selling price"
                    )
                }
            >
                Save Product
            </button>

            </div>

        </div>

        </Modal>
    );
    }

    function Orders({ orders, onView }) { const [query, setQuery] = useState(""); const [filter, setFilter] = useState("all"); const shown = orders.filter(order => (filter === "all" || order.status === filter || (filter === "refund" && order.status.includes("refund"))) && (!query || order.id.toLowerCase().includes(query.toLowerCase()) || order.customer.name.toLowerCase().includes(query.toLowerCase()))); return <section className="page"><div className="page-heading"><div><span className="eyebrow">FULFILMENT</span><h2>Orders</h2><p>Verify payments, check stock and keep customers informed.</p></div></div><div className="toolbar"><input className="search-input" placeholder="Search order, customer..." value={query} onChange={event => setQuery(event.target.value)} /></div><div className="filter-row">{["all", "new", "payment_verification", "payment_received", "stock_check", "processing", "shipped", "delivered", "refund"].map(item => <button className={`filter-chip ${filter === item ? "active" : ""}`} onClick={() => setFilter(item)} key={item}>{item === "all" ? "All" : item === "refund" ? "Refund" : statuses[item]}</button>)}</div><Card title={`${shown.length} orders`}><div className="table-wrapper"><table className="data-table orders-table"><thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Amount</th><th>Payment</th><th>Order Status</th><th /></tr></thead><tbody>{shown.map(item => <tr key={item.id}><td><strong>#{item.id}</strong><small>Claimed {stamp(item.payment?.claimedAt || item.payment?.paidAt)}</small></td><td><strong>{item.customer.name}</strong><small>{item.customer.phone}</small></td><td>{stamp(item.createdAt)}</td><td><strong>{money(item.total)}</strong><small>{item.totalWeight}g total weight</small></td><td><span className={`status-badge ${item.payment?.status === "received" ? "success" : "warning"}`}>{item.payment?.status === "received" ? "Received" : "Verify"}</span></td><td><span className={`status-badge ${statusTone(item.status)}`}>{statuses[item.status] || item.status}</span></td><td><button className="text-button" onClick={() => onView(item)}>View Order →</button></td></tr>)}</tbody></table>{!shown.length && <Empty title="No matching orders" text="Orders placed through the storefront will appear here." />}</div></Card></section>; }
    function OrderDialog({ order, update, close, notify }) { const [shipping, setShipping] = useState(order.shipping || {}); const [refund, setRefund] = useState(order.refund || {}); const setShip = (key, value) => setShipping(old => ({ ...old, [key]: value })); const setRefundValue = (key, value) => setRefund(old => ({ ...old, [key]: value })); const whatsapp = kind => { const phone = (order.customer.phone || "").replace(/\D/g, ""); if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${order.customer.name}, your Kashvi Fashions order #${order.id} ${kind}.`)}`, "_blank"); else notify("Customer phone is missing"); }; const action = (status, extra) => update(order.id, status, extra); return <Modal title={`Order #${order.id}`} close={close} wide><div className="detail-grid"><div><span>Customer</span><strong>{order.customer.name}<small>{order.customer.phone}</small></strong></div><div><span>Order Date</span><strong>{stamp(order.createdAt)}</strong></div><div className="full"><span>Delivery Address</span><strong>{order.customer.address}, {order.customer.city || ""}, {order.customer.pincode}</strong></div></div><div className="section-mini"><h3>Products and weight</h3>{order.items.map((item, index) => <div className="order-item" key={index}><div><strong>{item.name}</strong><small>{item.size} · {item.colour || item.color} · Qty {item.qty} · {item.productWeight}{item.weightUnit === "kg" ? "kg" : "g"} each</small></div><strong>{money(item.price * item.qty)}</strong></div>)}<div className="total-line"><span>Total weight</span><strong>{order.totalWeight}g</strong></div></div><div className="payment-box"><div><span>Amount</span><strong>{money(order.total)}</strong></div><div><span>Payment status</span><strong>{order.payment?.status === "received" ? "Received" : "Payment Verification"}</strong></div><div><span>Claimed</span><strong>{stamp(order.payment?.claimedAt)}</strong></div></div><div className="timeline">{["new", "payment_received", "stock_check", "processing", "shipped", "delivered"].map(stage => { const event = (order.history || []).find(item => item.status === stage) || (stage === "new" ? { at: order.createdAt } : null); return <div className={event ? "done" : ""} key={stage}><b>{event ? "✓" : "○"}</b><span>{statuses[stage]}<small>{event ? stamp(event.at) : "Pending"}</small></span></div>; })}</div><div className="modal-actions">{order.status === "payment_verification" && <><button className="primary-button" onClick={() => action("payment_received", { payment: { ...order.payment, status: "received", verifiedAt: new Date().toISOString() } })}>Confirm Payment</button><button className="secondary-button" onClick={() => action("stock_unavailable", { payment: { ...order.payment, status: "issue" } })}>Payment Issue</button><button className="danger-button" onClick={() => action("refund_pending", { payment: { ...order.payment, status: "not_found" } })}>Payment Not Found</button></>}{order.status === "payment_received" && <button className="primary-button" onClick={() => action("stock_check")}>Check Stock</button>}{order.status === "stock_check" && <><button className="primary-button" onClick={() => action("processing")}>Confirm Order</button><button className="danger-button" onClick={() => action("stock_unavailable")}>Stock Not Available</button></>}{order.status === "processing" && <div className="inline-form"><input placeholder="Courier / Transporter" value={shipping.courier || ""} onChange={event => setShip("courier", event.target.value)} /><input placeholder="Tracking ID" value={shipping.trackingId || ""} onChange={event => setShip("trackingId", event.target.value)} /><input type="date" value={shipping.shippingDate || ""} onChange={event => setShip("shippingDate", event.target.value)} /><button className="primary-button" onClick={() => shipping.trackingId ? action("shipped", { shipping }) : notify("Tracking ID is required")}>Ship Order</button></div>}{order.status === "shipped" && <button className="primary-button" onClick={() => action("delivered", { deliveredAt: new Date().toISOString() })}>Mark as Delivered</button>}{order.status === "stock_unavailable" && <><button className="primary-button" onClick={() => action("refund_initiated", { refund })}>Refund Initiated</button><button className="whatsapp-button" onClick={() => whatsapp("refund is being processed")}>Send WhatsApp Update</button></>}{order.status === "refund_initiated" && <><input placeholder="Refund reference / UTR" value={refund.reference || ""} onChange={event => setRefundValue("reference", event.target.value)} /><button className="primary-button" onClick={() => action("refund_completed", { refund: { ...refund, completedAt: new Date().toISOString() } })}>Refund Completed</button></>}{["payment_received", "processing", "shipped", "delivered"].includes(order.status) && <button className="whatsapp-button" onClick={() => whatsapp(`status is ${statuses[order.status]}`)}>Send WhatsApp Update</button>}</div>{order.shipping?.trackingId && <div className="tracking-box"><span>Tracking</span><strong>{order.shipping.trackingId}</strong><small>{order.shipping.courier} · {order.shipping.shippingDate}</small></div>}</Modal>; }
    function Settings({ value, setValue, notify }) {
    const [draft, setDraft] = useState(value);
    const [isEditing, setIsEditing] = useState(false);

    const [rateCards, setRateCards] = useState([]);
    const [rateLoading, setRateLoading] = useState(true);
    const [isRateEditing, setIsRateEditing] = useState(false);

    useEffect(() => {
        setDraft(value);
    }, [value]);

    useEffect(() => {
        const loadRateCards = async () => {
            const { data, error } = await supabase
                .from("delivery_rate_cards")
                .select(
                    "id, weight_from, weight_to, local_rate, within_state_rate, zone_metro_rate, other_states_rate, additional_kg_rate_local, additional_kg_rate_within_state, additional_kg_rate_zone_metro, additional_kg_rate_other_states"
                )
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

    const patch = (key, val) => {
        setDraft(old => ({
            ...old,
            [key]: val
        }));
    };

    const saveSettings = () => {
        setValue(draft);
        setIsEditing(false);
        notify("Settings saved successfully");
    };

    const cancelSettings = () => {
        setDraft(value);
        setIsEditing(false);
    };

    const updateRateCard = (id, field, val) => {
        setRateCards(list =>
            list.map(item =>
                item.id === id
                    ? { ...item, [field]: Number(val) }
                    : item
            )
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
                        additional_kg_rate_within_state:
                            item.additional_kg_rate_within_state,
                        additional_kg_rate_zone_metro:
                            item.additional_kg_rate_zone_metro,
                        additional_kg_rate_other_states:
                            item.additional_kg_rate_other_states
                    })
                    .eq("id", item.id);

                if (error) throw error;
            }

            setIsRateEditing(false);
            notify("Delivery rate card saved successfully");
        } catch (error) {
            console.error(error);
            notify("Failed to save delivery rate card");
        }
    };

    return (
        <section className="page">

            <div className="page-heading">
                <div>
                    <span className="eyebrow">CONFIGURATION</span>
                    <h2>Settings</h2>
                    <p>Store details used by checkout and customer updates.</p>
                </div>
            </div>

            {/* STORE INFORMATION */}
            <div className="form-card settings-card">

                <div className="settings-section-header">
                    <div>
                        <h3>Store Information</h3>
                        <p>Manage your store and payment details.</p>
                    </div>

                    {!isEditing && (
                        <button
                            type="button"
                            className="primary-button"
                            onClick={() => setIsEditing(true)}
                        >
                            Edit
                        </button>
                    )}
                </div>

                <div className="settings-grid">

                    <Field
                        label="Store Name"
                        value={draft.storeName}
                        onChange={v => patch("storeName", v)}
                        readOnly={!isEditing}
                    />

                    <Field
                        label="WhatsApp Number"
                        value={draft.whatsapp}
                        onChange={v => patch("whatsapp", v)}
                        placeholder="91XXXXXXXXXX"
                        readOnly={!isEditing}
                    />

                    <Field
                        label="UPI ID"
                        value={draft.upiId}
                        onChange={v => patch("upiId", v)}
                        placeholder="store@upi"
                        readOnly={!isEditing}
                    />

                    <Field
                        label="Origin Pincode"
                        value={draft.originPincode}
                        onChange={v => patch("originPincode", v)}
                        readOnly={!isEditing}
                    />

                    <Field
                        label="Fallback Delivery Charge"
                        type="number"
                        value={draft.deliveryCharge}
                        onChange={v => patch("deliveryCharge", v)}
                        readOnly={!isEditing}
                    />

                </div>

                {isEditing && (
                    <div className="settings-footer">

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={cancelSettings}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className="primary-button"
                            onClick={saveSettings}
                        >
                            Save Changes
                        </button>

                    </div>
                )}

            </div>


            {/* DELIVERY RATE CARD */}
            <div
                className="form-card settings-card"
                style={{ marginTop: "20px" }}
            >

                <div className="settings-section-header">
                    <div>
                        <h3>Delivery Rate Card</h3>
                        <p>
                            Manage delivery charges based on weight and zone.
                        </p>
                    </div>

                    {!isRateEditing && (
                        <button
                            type="button"
                            className="primary-button"
                            onClick={() => setIsRateEditing(true)}
                        >
                            Edit
                        </button>
                    )}
                </div>

                {rateLoading ? (
                    <p>Loading rate card...</p>
                ) : (
                    <>

                        <div style={{ overflowX: "auto" }}>
                            <table className="data-table">

                                <thead>
                                    <tr>
                                        <th>Weight</th>
                                        <th>Local</th>
                                        <th>Within State</th>
                                        <th>Zone / Metro</th>
                                        <th>Other States</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {rateCards.map(item => (

                                        <tr key={item.id}>

                                            <td>
                                                {item.id === "RATE008"
                                                    ? "Every additional 1 kg"
                                                    : `${item.weight_from}–${item.weight_to} g`}
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

                        {isRateEditing && (
                            <div className="settings-footer">

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => {
                                        window.location.reload();
                                    }}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className="primary-button"
                                    onClick={saveRateCards}
                                >
                                    Save Rate Card
                                </button>

                            </div>
                        )}

                    </>
                )}

            </div>

        </section>
    );
}
    function Storefront({
    products,
    categories,
    sizes,
    colours,
    pincodes,
    settings,
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
    const [form, setForm] = useState({ name: "", phone: "", address: "", pincode: "" });
    const [tracking, setTracking] = useState({ id: "", phone: "" });
    const [trackResult, setTrackResult] = useState(null);
    const [accountOpen, setAccountOpen] = useState(false);
    const [accountMode, setAccountMode] = useState("login");
    const [accountForm, setAccountForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    pin: "",
    identifier: ""
    });

    const [verificationEmail, setVerificationEmail] = useState("");

    const [loginMethod, setLoginMethod] = useState("password");

    const loginCustomer = async () => {
  const identifier = accountForm.identifier.trim();

  if (!identifier) {
    notify("Enter email or mobile number");
    return;
  }

  if (loginMethod === "password" && !accountForm.password) {
    notify("Enter password");
    return;
  }

  if (loginMethod === "pin" && !accountForm.pin) {
    notify("Enter PIN");
    return;
  }

  try {
    let query = supabase
      .from("customers")
      .select("*");

    if (identifier.includes("@")) {
      query = query.ilike("email", identifier);
    } else {
      query = query.eq("mobile", identifier);
    }

    if (loginMethod === "password") {
      query = query.eq("password", accountForm.password);
    } else {
      query = query.eq("pin", accountForm.pin);
    }

    const { data, error } = await query.maybeSingle();

    console.log("LOGIN DATA:", data);
    console.log("LOGIN ERROR:", error);

    if (error) {
      notify(error.message || "Login failed");
      return;
    }

    if (!data) {
      notify("Invalid login details");
      return;
    }

    setCustomer(data);
    setAccountOpen(false);

    setAccountForm({
      name: "",
      email: "",
      mobile: "",
      password: "",
      pin: "",
      identifier: ""
    });

    notify("Welcome back");
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    notify("Login failed");
  }
};
    const createCustomer = async () => {
  if (!accountForm.name.trim()) {
    notify("Enter your name");
    return;
  }

  if (!accountForm.email.trim()) {
    notify("Email is required");
    return;
  }

  if (!accountForm.mobile.trim()) {
    notify("Mobile number is required");
    return;
  }

  if (!accountForm.password) {
    notify("Create a password");
    return;
  }

  if (accountForm.password.length < 8) {
    notify("Password must be at least 8 characters");
    return;
  }

  if (!/^\d{4}$/.test(accountForm.pin)) {
    notify("PIN must be exactly 4 digits");
    return;
  }

  try {
    // 1. Create Supabase Auth account
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email: accountForm.email.trim(),
        password: accountForm.password
      });

    if (authError) {
      console.error("AUTH REGISTER ERROR:", authError);
      notify(authError.message || "Registration failed");
      return;
    }

    // 2. Create customer record
    const newCustomer = {
      id: makeId("CU"),
      name: accountForm.name.trim(),
      email: accountForm.email.trim(),
      mobile: accountForm.mobile.trim(),
      pin: accountForm.pin
    };

        // 3. Save customer data in Supabase
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .insert([newCustomer])
      .select()
      .single();

    if (customerError) {
      console.error("CUSTOMER INSERT ERROR:", customerError);
      notify(customerError.message || "Could not save customer details");
      return;
    }

    console.log("CUSTOMER CREATED:", customerData);

    // 4. Store email for OTP verification screen
    setVerificationEmail(accountForm.email.trim());

    // 5. Open OTP verification screen
    setAccountMode("verify");

    notify("Verification code sent to your email");

    const { data, error } = await supabase
      .from("customers")
      .insert([newCustomer])
      .select()
      .single();

    if (error) {
      console.error("CUSTOMER REGISTER ERROR:", error);
      notify(error.message || "Customer registration failed");
      return;
    }

    console.log("REGISTER SUCCESS:", data);
    console.log("AUTH USER:", authData.user);

    // 3. Do not automatically login
    setCustomer(null);

    setAccountForm({
      name: "",
      email: "",
      mobile: "",
      password: "",
      pin: "",
      identifier: ""
    });

    setAccountMode("login");

    notify(
      "Account created. Please check your email and verify your email address before login."
    );

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    notify("Registration failed");
  }
};

const verifyCustomerOtp = async () => {
  const otp = accountForm.pin.trim();

  if (!/^\d{6}$/.test(otp)) {
    notify("Enter the 6-digit verification code");
    return;
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: verificationEmail,
      token: otp,
      type: "signup"
    });

    if (error) {
      console.error("OTP VERIFY ERROR:", error);
      notify(error.message || "Invalid verification code");
      return;
    }

    console.log("OTP VERIFIED:", data);

    // Get verified user
    const user = data.user;

    if (!user) {
      notify("Verification completed. Please login.");
      setAccountMode("login");
      return;
    }

    // Find the customer record we created earlier
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("email", verificationEmail)
      .single();

    if (customerError) {
      console.error("CUSTOMER FETCH ERROR:", customerError);
      notify("Email verified, but customer details could not be loaded");
      return;
    }

    // Login customer only AFTER email verification
    setCustomer(customerData);

    setAccountForm({
      name: "",
      email: "",
      mobile: "",
      password: "",
      pin: "",
      identifier: ""
    });

    setAccountMode("login");
    setAccountOpen(false);

    notify("Email verified successfully. Welcome to Kashvi Fashions!");
  } catch (error) {
    console.error("OTP VERIFY ERROR:", error);
    notify("Verification failed");
  }
};

    const logoutCustomer = () => {
  setCustomer(null);
  notify("Logged out");
};

    const destination = pincodes.find(item => String(item.pincode) === String(form.pincode).trim());
    const origin = pincodes.find(item => String(item.pincode) === String(settings.originPincode));
    const zone = shippingCategory(destination, origin);
    const totalWeight = cart.reduce((sum, item) => sum + weightGrams(item), 0);
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
    const shipping = destination ? shippingRate(totalWeight || 1, zone) : 0;
    const total = subtotal + shipping;
    const cartCount = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);

    const filtered = products.filter(product =>
        product.active !== false &&
        (category === "All" || product.category === category) &&
        (!search || product.name.toLowerCase().includes(search.toLowerCase()))
    );

    const addToCart = ({ product, quantity, size, colour }) => {
        const item = { productId: product.id, name: product.name, price: Number(product.sellingPrice), qty: quantity, size, colour, productWeight: Number(product.weight || 0), weightUnit: product.weightUnit || "grams", image: product.images?.[0] || product.image || "" };
        setCart(list => {
        const index = list.findIndex(x => x.productId === item.productId && x.size === item.size && x.colour === item.colour);
        if (index < 0) return [...list, item];
        return list.map((x, i) => i === index ? { ...x, qty: x.qty + item.qty } : x);
        });
        setSelected(null);
        notify("Added to cart");
    };

    const changeQty = (index, amount) => setCart(list => list.map((item, i) => i === index ? { ...item, qty: Math.max(1, item.qty + amount) } : item));
    const removeItem = index => setCart(list => list.filter((_, i) => i !== index));

    const upiLink = `upi://pay?pa=${encodeURIComponent(settings.upiId || "")}&pn=${encodeURIComponent(settings.storeName || "Kashvi Fashions")}&am=${encodeURIComponent(total.toFixed(2))}&cu=INR&tn=${encodeURIComponent("Kashvi Fashions Order")}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(upiLink)}`;

    const startPayment = () => {
        if (!cart.length) return notify("Your cart is empty");
        if (!form.name || !form.phone || !form.pincode || !form.address) return notify("Complete customer and delivery details");
        if (!destination) return notify("Pincode not available. Please check your pincode.");
        if (!settings.upiId) return notify("UPI ID is not configured. Add it in Admin → Settings.");
        setPaymentStep(true);
        setTimeout(() => {
        window.location.href = upiLink;
        }, 250);
    };

    const retryPayment = () => {
        if (!settings.upiId) return notify("UPI ID is not configured.");
        setTimeout(() => {
        window.location.href = upiLink;
        }, 150);
    };

    const placeOrder = async () => {
    if (
        !cart.length ||
        !form.name.trim() ||
        !form.phone.trim() ||
        !form.address.trim() ||
        !form.pincode.trim()
    ) {
        notify("Please complete delivery details");
        return;
    }

    if (!destination) {
        notify("Pincode not available. Please check your pincode.");
        return;
    }

    if (!settings.upiId) {
        notify("UPI ID is not configured");
        return;
    }

    const createdAt = new Date().toISOString();

    const newOrder = {
        id: makeId("KF"),
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
        shippingZone: zone,

        payment: {
        status: "claimed",
        claimedAt: createdAt,
        method: "UPI",
        amount: total
        },

        status: "payment_verification",

        history: [
        {
            status: "new",
            at: createdAt
        },
        {
            status: "payment_verification",
            at: createdAt
        }
        ],

        shipping: {}
    };

    const { error } = await supabase
    .from("orders")
    .insert({
        id: newOrder.id,
        customer_id: null,
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

if (error) {
    console.error("Order save error:", error);
    notify("Failed to save order");
    return;
}

setOrders(list => [
    newOrder,
    ...list
]);

    setSubmittedOrderId(newOrder.id);

    // Keep payment/checkout screen open
    setCheckoutOpen(true);
    setPaymentStep(false);
    setPaymentSubmitted(true);

    notify("Payment claim submitted");
    };

    const track = () => setTrackResult(orders.find(order => order.id.toLowerCase() === tracking.id.trim().toLowerCase() && String(order.customer.phone) === String(tracking.phone).trim()) || false);

    return <div className="ecom-store">
        <header className="ecom-header"><div className="ecom-header-inner">
        <button className="ecom-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><strong>KASHVI</strong><span>FASHIONS</span></button>
        <nav><button onClick={() => document.getElementById("ecom-shop")?.scrollIntoView({ behavior: "smooth" })}>Shop</button><button onClick={() => document.getElementById("ecom-categories")?.scrollIntoView({ behavior: "smooth" })}>Categories</button><button onClick={() => document.getElementById("ecom-track")?.scrollIntoView({ behavior: "smooth" })}>Track Order</button></nav>
        <div className="ecom-actions"><button onClick={() => document.getElementById("ecom-shop")?.scrollIntoView({ behavior: "smooth" })}>⌕</button><button className="cart-icon" onClick={() => setCartOpen(true)}>🛍 {cartCount > 0 && <b>{cartCount}</b>}</button>
        
        <button
    className="account-button"
    onClick={() => {
    if (!customer) {
        setAccountMode("login");
        setAccountOpen(true);
    }
}}
    >
    {customer ? `Hi, ${customer.name.split(" ")[0]}` : "Login"}
    </button>
    
    <button className="admin-link" onClick={onAdmin}>Admin ↗</button></div>
        </div></header>

        <section className="ecom-hero"><div><span className="ecom-eyebrow">KASHVI FASHIONS</span><h1>Everyday essentials,<br/>made beautifully.</h1><p>Comfortable everyday wear, thoughtfully selected for you.</p><button className="ecom-primary" onClick={() => document.getElementById("ecom-shop")?.scrollIntoView({ behavior: "smooth" })}>Shop Now</button></div><div className="hero-copy"><span>NEW COLLECTION</span><strong>Comfort<br/>meets style.</strong></div></section>

        <section id="ecom-categories" className="ecom-categories"><span className="ecom-eyebrow">SHOP BY CATEGORY</span><h2>Find your essentials</h2><div className="category-scroll"><button className={category === "All" ? "active" : ""} onClick={() => setCategory("All")}>All Products</button>{categories.filter(x => x.active !== false).map(x => <button className={category === x.name ? "active" : ""} key={x.id} onClick={() => setCategory(x.name)}>{x.name}</button>)}</div></section>

        <section id="ecom-shop" className="ecom-shop"><div className="shop-heading"><div><span className="ecom-eyebrow">OUR COLLECTION</span><h2>{category === "All" ? "Shop everything" : category}</h2></div><span>{filtered.length} products</span></div><div className="ecom-search"><span>⌕</span><input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}/><select value={category} onChange={e => setCategory(e.target.value)}><option>All</option>{categories.filter(x => x.active !== false).map(x => <option key={x.id}>{x.name}</option>)}</select></div><div className="ecom-product-grid">{filtered.map(product => { const mrp = Number(product.mrp || 0); const price = Number(product.sellingPrice || 0); const discount = mrp > price ? Math.round((mrp-price)/mrp*100) : 0; return <article className="ecom-product-card" key={product.id}><button className="ecom-product-image" onClick={() => setSelected(product)}>{product.images?.[0] || product.image ? <img src={product.images?.[0] || product.image} alt={product.name}/> : <div className="image-placeholder">K</div>}{discount > 0 && <span>{discount}% OFF</span>}</button><div className="ecom-product-info"><small>{product.category}</small><h3>{product.name}</h3><div><strong>{money(price)}</strong>{mrp > price && <del>{money(mrp)}</del>}</div><button className="ecom-add" onClick={() => setSelected(product)}>Add to Cart</button></div></article>; })}</div>{!filtered.length && <div className="ecom-empty"><h3>No products found</h3><p>Try another search or category.</p></div>}</section>

        <section className="ecom-trust"><div>✓ <span>Quality Products</span></div><div>₹ <span>Secure UPI Payment</span></div><div>↗ <span>Order Tracking</span></div><div>♡ <span>Customer Support</span></div></section>

        <section id="ecom-track" className="ecom-track"><span className="ecom-eyebrow">ORDER TRACKING</span><h2>Where is my order?</h2><p>Enter your Order ID and registered phone number.</p><div><input placeholder="Order ID" value={tracking.id} onChange={e => setTracking({ ...tracking, id: e.target.value })}/><input placeholder="Phone Number" value={tracking.phone} onChange={e => setTracking({ ...tracking, phone: e.target.value })}/><button className="ecom-primary" onClick={track}>Track Order</button></div>{trackResult && <div className="track-card"><strong>#{trackResult.id}</strong><span className="status-badge success">{statuses[trackResult.status]}</span>{trackResult.shipping?.trackingId && <p>Tracking ID: <strong>{trackResult.shipping.trackingId}</strong></p>}</div>}{trackResult === false && <p className="error-text">No order found. Please check your details.</p>}</section>

        <footer className="ecom-footer"><div><strong>KASHVI</strong><span>FASHIONS</span></div><p>Everyday essentials for every woman.</p><button onClick={onAdmin}>Admin Login</button></footer>

        {cartOpen && <div className="ecom-overlay" onClick={() => setCartOpen(false)}><aside className="ecom-cart" onClick={e => e.stopPropagation()}><div className="cart-head"><div><span>YOUR BAG</span><h2>Cart</h2></div><button onClick={() => setCartOpen(false)}>×</button></div><div className="cart-items">{!cart.length && <div className="ecom-empty"><h3>Your bag is empty</h3><p>Add something you love.</p></div>}{cart.map((item,index) => <div className="cart-item" key={`${item.productId}-${item.size}-${item.colour}`}><div className="cart-img">{item.image ? <img src={item.image} alt=""/> : "K"}</div><div><strong>{item.name}</strong><small>{item.size}{item.colour ? ` · ${item.colour}` : ""}</small><b>{money(item.price)}</b><div className="qty"><button onClick={() => changeQty(index,-1)}>−</button><span>{item.qty}</span><button onClick={() => changeQty(index,1)}>+</button><button onClick={() => removeItem(index)}>Remove</button></div></div></div>)}</div>{cart.length > 0 && <div className="cart-bottom"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><button className="ecom-primary full" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>Proceed to Checkout</button></div>}</aside></div>}

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
        <div
        className="checkout-modal"
        onClick={(e) => e.stopPropagation()}
        >

        {/* HEADER */}
        <div className="cart-head">
            <div>
            <span>KASHVI FASHIONS</span>

            <h2>
                {paymentSubmitted
                ? "Order Submitted"
                : paymentStep
                ? "UPI Payment"
                : "Checkout"}
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


        {/* =========================================
            PAYMENT SUCCESS / ORDER SUBMITTED
            ========================================= */}

        {paymentSubmitted ? (
            <div className="payment-success-screen">

            <div className="payment-success-icon">
                ✓
            </div>

            <span className="eyebrow">
                PAYMENT CLAIM SUBMITTED
            </span>

            <h2>
                Thank you for your order!
            </h2>

            <p>
                Your payment claim has been submitted successfully.
                Our team will verify your UPI payment and process your order.
            </p>

            <div className="submitted-order-card">

                <span>ORDER ID</span>

                <strong>
                #{submittedOrderId}
                </strong>

            </div>

            <div className="submitted-payment-card">

                <div>
                <span>Amount</span>
                <strong>
                    {money(total)}
                </strong>
                </div>

                <div>
                <span>Payment</span>
                <strong>
                    UPI
                </strong>
                </div>

                <div>
                <span>Status</span>
                <strong>
                    Verification Pending
                </strong>
                </div>

            </div>

            <p className="success-note">
                Please save your Order ID for tracking.
            </p>

            <div className="success-actions">

                <button
                className="secondary-button"
                onClick={() => {
                    setCheckoutOpen(false);
                    setPaymentStep(false);
                    setPaymentSubmitted(false);
                    setSubmittedOrderId("");
                }}
                >
                Continue Shopping
                </button>

                <button
                className="ecom-primary"
                onClick={() => {
                    setCheckoutOpen(false);
                    setPaymentStep(false);
                    setPaymentSubmitted(false);

                    setTimeout(() => {
                    document
                        .getElementById("ecom-track")
                        ?.scrollIntoView({
                        behavior: "smooth"
                        });
                    }, 100);
                }}
                >
                Track Order
                </button>

            </div>

            </div>

        ) : !paymentStep ? (

            /* =========================================
            CHECKOUT DETAILS
            ========================================= */

            <div className="checkout-grid">

            <div>

                <h3>Delivery Details</h3>

                <div className="checkout-fields">

                <Field
                    label="Full Name"
                    value={form.name}
                    onChange={(v) =>
                    setForm({
                        ...form,
                        name: v
                    })
                    }
                />

                <Field
                    label="Phone Number"
                    value={form.phone}
                    onChange={(v) =>
                    setForm({
                        ...form,
                        phone: v
                    })
                    }
                />

                <Field
                    wide
                    label="Delivery Address"
                    value={form.address}
                    onChange={(v) =>
                    setForm({
                        ...form,
                        address: v
                    })
                    }
                />

                <Field
                    label="Pincode"
                    value={form.pincode}
                    onChange={(v) =>
                    setForm({
                        ...form,
                        pincode: v
                    })
                    }
                />

                </div>


                {destination ? (

                <div className="destination-card">

                    <small>DELIVERY TO</small>

                    <strong>
                    {destination.city || destination.office},{" "}
                    {destination.district}
                    </strong>

                    <span>
                    {destination.state} · {zone}
                    </span>

                </div>

                ) : form.pincode ? (

                <p className="error-text">
                    Pincode not available. Please check your pincode.
                </p>

                ) : null}

            </div>


            {/* ORDER SUMMARY */}

            <div className="summary-card">

                <h3>
                Order Summary
                </h3>

                {cart.map((item, index) => (

                <div
                    className="summary-line"
                    key={index}
                >

                    <span>

                    {item.name}

                    <small>
                        {item.size}
                        {item.colour
                        ? ` · ${item.colour}`
                        : ""}

                        {" · Qty "}
                        {item.qty}
                    </small>

                    </span>

                    <strong>
                    {money(
                        item.price * item.qty
                    )}
                    </strong>

                </div>

                ))}


                <hr />


                <div className="summary-line">

                <span>
                    Weight
                </span>

                <strong>
                    {totalWeight} g
                </strong>

                </div>


                <div className="summary-line">

                <span>
                    Shipping
                </span>

                <strong>
                    {destination
                    ? money(shipping)
                    : "-"}
                </strong>

                </div>


                <div className="summary-total">

                <span>
                    Grand Total
                </span>

                <strong>
                    {destination
                    ? money(total)
                    : "-"}
                </strong>

                </div>


                <div className="upi-box">

                <small>
                    UPI PAYMENT
                </small>

                <strong>
                    {settings.upiId ||
                    "UPI ID not configured"}
                </strong>

                <p>
                    Your QR and UPI app payment
                    options will appear on the
                    next step.
                </p>

                </div>


                <button
                className="ecom-primary full"
                onClick={startPayment}
                >
                Proceed to Payment ·{" "}
                {destination
                    ? money(total)
                    : "-"}
                </button>

            </div>

            </div>

        ) : (

            /* =========================================
            UPI PAYMENT SCREEN
            ========================================= */

            <div className="upi-payment-screen">

            <div className="upi-payment-total">

                <span>
                PAYMENT AMOUNT
                </span>

                <strong>
                {money(total)}
                </strong>

            </div>


            <div className="upi-qr-card">

                <img
                src={qrUrl}
                alt="UPI payment QR code"
                />

                <strong>
                Scan & Pay
                </strong>

                <small>
                Or tap below to open your UPI app
                </small>

            </div>


            <button
                className="ecom-primary full"
                onClick={retryPayment}
            >
                Open UPI App & Pay
            </button>


            <div className="upi-return-note">

                <strong>
                After payment
                </strong>

                <p>
                Complete the payment in your
                UPI app, return to Kashvi Fashions,
                and tap <b>I HAVE PAID</b>.
                </p>

            </div>


            <div className="upi-payment-actions">

                <button
                className="secondary-button"
                onClick={retryPayment}
                >
                Retry Payment
                </button>

                <button
                className="ecom-primary"
                onClick={placeOrder}
                >
                I HAVE PAID
                </button>

            </div>

            </div>

        )}

        </div>
    </div>
    )}

    {accountOpen && (
    <div
        className="ecom-overlay"
        onClick={() => setAccountOpen(false)}
    >
        <div
        className="account-modal"
        onClick={event => event.stopPropagation()}
        >
        <div className="cart-head">
            <div>
            <span>KASHVI FASHIONS</span>
            <h2>
                {accountMode === "login"
                ? "Welcome Back"
                : "Create Account"}
            </h2>
            </div>

            <button onClick={() => setAccountOpen(false)}>
            ×
            </button>
        </div>

        {accountMode === "login" ? (
    <>
        <div className="account-fields">

        <Field
            label="Email ID or Mobile Number"
            value={accountForm.identifier}
            onChange={value =>
            setAccountForm({
                ...accountForm,
                identifier: value
            })
            }
            placeholder="Email ID or Mobile Number"
        />

        <div className="login-method-section">

            <label className="login-method-label">
            Login with
            </label>

            <div className="login-method-toggle">

            <button
                type="button"
                className={
                loginMethod === "password"
                    ? "login-method-btn active"
                    : "login-method-btn"
                }
                onClick={() => setLoginMethod("password")}
            >
                Password
            </button>
            <button
                type="button"

                className={
                loginMethod === "pin"
                    ? "login-method-btn active"
                    : "login-method-btn"
                }
                onClick={() => setLoginMethod("pin")}
            >
                PIN
            </button>

            </div>

        </div>

        {loginMethod === "password" ? (
            <Field
            label="Password"
            type="password"
            value={accountForm.password}
            onChange={value =>
                setAccountForm({
                ...accountForm,
                password: value
                })
            }
            placeholder="Password"
            />
        ) : (
            <Field
            label="PIN"
            type="password"
            value={accountForm.pin}
            onChange={value =>
                setAccountForm({
                ...accountForm,
                pin: value
                })
            }
            placeholder="PIN"
            />
        )}

        </div>

        <button
        className="ecom-primary full"
        onClick={loginCustomer}
        >
        Login
        </button>

        <button
        className="account-switch"
        onClick={() => setAccountMode("register")}
        >
        New Customer? Create Account
        </button>
    </>
    ) : (
            <>
            <div className="account-fields">
                <Field
                label="Full Name"
                value={accountForm.name}
                onChange={value =>
                    setAccountForm({
                    ...accountForm,
                    name: value
                    })
                }
                />

                <Field
                label="Email ID"
                value={accountForm.email}
                onChange={value =>
                    setAccountForm({
                    ...accountForm,
                    email: value
                    })
                }
                />

                <Field
                label="Mobile Number"
                value={accountForm.mobile}
                onChange={value =>
                    setAccountForm({
                    ...accountForm,
                    mobile: value
                    })
                }
                />

                <Field
                label="Password"
                type="password"
                value={accountForm.password}
                onChange={value =>
                    setAccountForm({
                    ...accountForm,
                    password: value
                    })
                }
                />

                <Field
                label="PIN"
                type="password"
                value={accountForm.pin}
                onChange={value =>
                    setAccountForm({
                    ...accountForm,
                    pin: value
                    })
                }
                />
            </div>

            <button
                className="ecom-primary full"
                onClick={createCustomer}
            >
                Create Account
            </button>

            <button
                className="account-switch"
                onClick={() => setAccountMode("login")}
            >
                Already have an account? Login
            </button>
            </>
        )}
        </div>
    </div>
    )}

        {selected && <ProductQuickView product={selected} add={addToCart} close={() => setSelected(null)}/>}
    </div>;
    }

    function Modal({ title, close, children, wide = false }) { return <div className="modal-backdrop"><div className={`dialog ${wide ? "wide" : ""}`}><div className="modal-header"><div><span className="eyebrow">KASHVI FASHIONS</span><h2>{title}</h2></div><button className="close-button" onClick={close}>×</button></div><div className="modal-body">{children}</div></div></div>; }
    function Confirm({ dialog, close }) { return <Modal title={dialog.title} close={close}><p className="confirm-text">{dialog.text}</p><div className="dialog-actions"><button className="secondary-button" onClick={close}>Cancel</button><button className="danger-button" onClick={() => { dialog.action(); close(); }}>Delete</button></div></Modal>; }
    function Field({ label, value = "", onChange, placeholder = "", type = "text", wide = false, textarea = false, readonly = false }) { return <label className={`field ${wide ? "wide" : ""}`}>{label}{textarea ? <textarea rows="3" value={value} placeholder={placeholder} readonly={readonly} onChange={event => onChange(event.target.value)} /> : <input type={type} value={value} placeholder={placeholder} readonly={readonly} onChange={event => onChange(event.target.value)} />}</label>; }
    function Select({ label, value = "", onChange, options = [] }) {
  return (
    <label className="field">
      {label}

      <select
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        <option value="">Select...</option>

        {options.map((option, index) => {
          const isObject = typeof option === "object";

          const optionValue = isObject
            ? option.value
            : option;

          const optionLabel = isObject
            ? option.label
            : option;

          return (
            <option key={optionValue || index} value={optionValue}>
              {optionLabel}
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
    return <Modal title="" close={close} wide><div className="ecom-quick-view"><div className="quick-image">{product.images?.[0] || product.image ? <img src={product.images?.[0] || product.image} alt={product.name}/> : <div>K</div>}</div><div className="quick-info"><small>{product.category}</small><h2>{product.name}</h2><div className="quick-price"><strong>{money(product.sellingPrice)}</strong>{product.mrp && Number(product.mrp) > Number(product.sellingPrice) && <del>{money(product.mrp)}</del>}</div><p>{product.description || "Made for everyday comfort with a considered fit."}</p>{product.sizes?.length > 0 && <div className="option"><label>SIZE</label><div>{product.sizes.map(item => <button key={item} className={size===item ? "selected" : ""} onClick={() => setSize(item)}>{item}</button>)}</div></div>}{product.colours?.length > 0 && <div className="option"><label>COLOUR</label><div>{product.colours.map(item => <button key={item} className={colour===item ? "selected" : ""} onClick={() => setColour(item)}>{item}</button>)}</div></div>}<div className="option"><label>QUANTITY</label><div className="qty large"><button onClick={() => setQuantity(v => Math.max(1,v-1))}>−</button><span>{quantity}</span><button onClick={() => setQuantity(v => v+1)}>+</button></div></div><button className="ecom-primary full" onClick={() => add({ product, quantity, size, colour })}>Add to Cart</button></div></div></Modal>; }