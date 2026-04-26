"use client";

import { useState } from "react";

export default function CheckoutButton() {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Failed to start checkout", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handlePurchase} 
      disabled={loading}
      className="btn-primary" 
      style={{ width: '100%' }}
    >
      {loading ? "Redirecting..." : "Purchase 100 Credits ($49)"}
    </button>
  );
}
