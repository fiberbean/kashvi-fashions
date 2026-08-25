import React, { useState } from "react";

export default function CustomerRegister({
  supabase,
  notify,
  setAccountMode,
  setVerificationEmail,
  setVerificationName,
  setVerificationMobile
}) {
  const [form, setForm] = useState({ name: "", email: "", mobile: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async e => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const mobile = form.mobile.trim();
    const password = form.password;

    if (!name || !email || !mobile || !password) {
      return notify("Please fill in all required fields.");
    }

    if (password.length < 6) {
      return notify("Password must be at least 6 characters long.");
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            mobile: mobile
          }
        }
      });

      if (error) throw error;

      // Check if user already exists
      if (data?.user?.identities && data.user.identities.length === 0) {
        notify("This email is already registered. Please sign in.");
        return setAccountMode("login");
      }

      // Save email for verification screen
      setVerificationEmail(email);
      if (setVerificationName) setVerificationName(name);
      if (setVerificationMobile) setVerificationMobile(mobile);

      notify("Verification code dispatched to your email!");
      
      // Directly switch to the Verification (OTP) Screen
      setAccountMode("verify");

    } catch (err) {
      console.error("Signup error:", err);
      notify(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="store-auth-form" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <label className="store-field">
        Full Name *
        <input
          type="text"
          required
          placeholder="Abhilash"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
      </label>

      <label className="store-field">
        Email Address *
        <input
          type="email"
          required
          placeholder="name@example.com"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />
      </label>

      <label className="store-field">
        WhatsApp Mobile Number *
        <input
          type="tel"
          required
          maxLength={10}
          placeholder="10-digit mobile number"
          value={form.mobile}
          onChange={e => setForm({ ...form, mobile: e.target.value })}
        />
        <small style={{ fontSize: "11px", color: "var(--store-text-muted)", marginTop: "2px" }}>
          We'll use this number to send order status and dispatch updates directly on WhatsApp.
        </small>
      </label>

      <label className="store-field">
        Password *
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <input
            type={showPassword ? "text" : "password"}
            required
            placeholder="At least 6 characters"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            style={{ width: "100%", paddingRight: "40px" }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            style={{
              position: "absolute",
              right: "10px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              color: "var(--store-text-muted)"
            }}
          >
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>
      </label>

      <button type="submit" className="store-primary-btn full" disabled={loading} style={{ marginTop: "6px" }}>
        {loading ? "Creating Account..." : "Create Account"}
      </button>

      <div className="store-auth-switch" style={{ marginTop: "10px", textAlign: "center" }}>
        <span>Already have an account?</span>
        <button
          type="button"
          className="store-auth-text-btn"
          onClick={() => setAccountMode("login")}
          style={{ marginLeft: "6px" }}
        >
          Sign In →
        </button>
      </div>
    </form>
  );
}