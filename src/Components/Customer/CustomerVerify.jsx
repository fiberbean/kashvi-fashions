import React, { useState } from "react";

export default function CustomerVerify({
  supabase,
  notify,
  email,
  setAccountMode,
  onClose
}) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyOTP = async () => {
    if (!/^\d{6}$/.test(otp)) {
      notify("Enter the 6-digit verification code");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: "signup"
      });

      if (error) {
        console.error("OTP VERIFY ERROR:", error);
        notify(error.message || "Invalid verification code");
        return;
      }

      notify("Email verified successfully");

      // Verification complete
      setAccountMode("login");

    } catch (error) {
      console.error("OTP ERROR:", error);
      notify("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="verification-content">

        <div className="verification-icon">
          ✉
        </div>

        <h2>Verify Your Email</h2>

        <p>
          We have sent a verification code to
        </p>

        <strong>{email}</strong>

        <div className="account-fields">

          <label className="field">
            Verification Code

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) =>
                setOtp(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
              placeholder="Enter 6-digit OTP"
            />
          </label>

        </div>

        <button
          className="ecom-primary full"
          onClick={verifyOTP}
          disabled={loading}
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>

        <button
          className="account-switch"
          onClick={() => setAccountMode("register")}
          disabled={loading}
        >
          Change Email
        </button>

      </div>
    </>
  );
}