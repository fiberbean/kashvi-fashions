import React, { useState } from "react";

export default function Verification({ supabase, notify, email, setAccountMode, setAccountOpen }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async e => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      return notify("Please enter the 6-digit verification code.");
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: cleanOtp,
        type: "signup"
      });

      if (error) throw error;

      if (data?.user) {
        notify("Account verified successfully! Welcome to Kashvi Fashions.");
        setAccountOpen(false);
      }
    } catch (err) {
      console.error(err);
      notify(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email
      });
      if (error) throw error;
      notify("Verification code resent successfully to your email.");
    } catch (err) {
      notify(err.message || "Failed to resend code.");
    }
  };

  return (
    <form onSubmit={handleVerifyOtp} className="store-auth-form" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: 0 }}>
      <div style={{ textAlign: "center", marginBottom: "4px" }}>
        <p style={{ fontSize: "13.5px", color: "var(--store-text-muted)", lineHeight: "1.5", margin: 0 }}>
          We sent a 6-digit verification code to:
        </p>
        <strong style={{ fontSize: "14.5px", color: "var(--store-primary)", display: "block", marginTop: "6px" }}>
          {email}
        </strong>
      </div>

      <label className="store-field" style={{ textAlign: "center" }}>
        Verification Code *
        <input
          type="text"
          maxLength={6}
          required
          placeholder="123456"
          value={otp}
          onChange={e => setOtp(e.target.value)}
          style={{
            textAlign: "center",
            letterSpacing: "6px",
            fontSize: "18px",
            fontWeight: "700",
            padding: "12px",
            color: "var(--store-primary)"
          }}
        />
      </label>

      <button type="submit" className="store-primary-btn full" disabled={loading} style={{ marginTop: "4px" }}>
        {loading ? "Verifying..." : "Verify & Complete"}
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "13px" }}>
        <button
          type="button"
          className="store-auth-text-btn"
          onClick={handleResendOtp}
        >
          Resend Code
        </button>
        <button
          type="button"
          className="store-auth-text-btn"
          onClick={() => setAccountMode("register")}
          style={{ color: "var(--store-text-muted)" }}
        >
          ← Change Email
        </button>
      </div>
    </form>
  );
}