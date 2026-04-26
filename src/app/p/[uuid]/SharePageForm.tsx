"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import styles from "../page.module.css";

export default function SharePageForm({ uuid }: { uuid: string }) {
  const [loadingState, setLoadingState] = useState<"idle" | "locating" | "painting" | "success">("idle");
  const [address, setAddress] = useState("");
  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initMap = async () => {
      try {
        setOptions({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY as string,
          version: "weekly"
        });

        // @ts-ignore
        const { Autocomplete } = await importLibrary("places");

        if (addressInputRef.current) {
          const autocomplete = new Autocomplete(addressInputRef.current, {
            types: ["address"],
            componentRestrictions: { country: ["us", "ca"] },
          });

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place.formatted_address) {
              setAddress(place.formatted_address);
            }
          });
        }
      } catch (err) {
        console.error("Google Maps load error:", err);
      }
    };

    if (process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY) {
      initMap();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      widget_uuid: uuid,
      address: address || formData.get("address"),
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      sellerIntent: formData.get("sellerIntent"),
      valuation: formData.get("valuation") === "on",
    };

    setLoadingState("locating");
    
    // Simulate multi-step loading for UX
    setTimeout(() => {
      setLoadingState(prev => prev !== "success" ? "painting" : prev);
    }, 3000);

    try {
      const res = await fetch("/api/generate-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setLoadingState("success");
      } else if (res.status === 402) {
        alert("The real estate agent has run out of generation credits.");
        setLoadingState("idle");
      } else {
        alert("Failed to generate sketch. Please try again.");
        setLoadingState("idle");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting form.");
      setLoadingState("idle");
    }
  };

  if (loadingState === "success") {
    return (
      <div className={styles.widgetContainer}>
        <div className={styles.successContainer}>
          <div className={styles.successIcon}>✨</div>
          <h2 className={styles.title}>Sketch Complete!</h2>
          <p style={{ color: "var(--text-muted)", marginTop: "1rem" }}>
            Your custom architectural watercolor is being prepared and will be sent to you shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.widgetContainer} style={{ position: "relative" }}>
      {loadingState !== "idle" && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <div className={styles.loadingText}>
            {loadingState === "locating" ? "Locating architecture..." : "Applying watercolor layers..."}
          </div>
        </div>
      )}

      <h2 className={styles.title}>See Your Home as Art</h2>
      <p className={styles.subtitle}>Enter your address to receive a custom AI watercolor sketch.</p>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Home Address</label>
          <div className={styles.autocompleteContainer}>
            <input
              ref={addressInputRef}
              name="address"
              type="text"
              className="input-field"
              placeholder="123 Main St, City, State"
              required
              onChange={(e) => setAddress(e.target.value)}
              disabled={loadingState !== "idle"}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Full Name</label>
          <input type="text" name="fullName" className="input-field" required placeholder="John Doe" disabled={loadingState !== "idle"} />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Email Address</label>
          <input type="email" name="email" className="input-field" required placeholder="john@example.com" disabled={loadingState !== "idle"} />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Timeline</label>
          <select name="sellerIntent" className="input-field" disabled={loadingState !== "idle"}>
            <option value="Not selling">Just curious / Not selling</option>
            <option value="1-3 months">Considering selling in 1-3 months</option>
            <option value="3-6 months">Considering selling in 3-6 months</option>
            <option value="6-12 months">Considering selling in 6-12 months</option>
          </select>
        </div>

        <label className={styles.checkboxGroup}>
          <input type="checkbox" name="valuation" disabled={loadingState !== "idle"} />
          <span>Also request a free home valuation report</span>
        </label>

        <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loadingState !== "idle"}>
          Generate Sketch
        </button>
      </form>
    </div>
  );
}
