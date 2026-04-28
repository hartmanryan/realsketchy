"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import styles from "../page.module.css";

export default function SharePageForm({ uuid }: { uuid: string }) {
  const [loadingState, setLoadingState] = useState<"idle" | "locating" | "painting" | "success">("idle");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [addressComponents, setAddressComponents] = useState({ street: "", city: "", state: "", zip: "" });
  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initMap = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
        if (!apiKey) {
          console.error("Missing NEXT_PUBLIC_GOOGLE_PLACES_KEY environment variable");
          return;
        }

        setOptions({
          key: apiKey,
          v: "weekly"
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
              let street_number = "";
              let route = "";
              let city = "";
              let state = "";
              let zip = "";
              place.address_components?.forEach((component: any) => {
                if (component.types.includes("street_number")) street_number = component.long_name;
                if (component.types.includes("route")) route = component.short_name;
                if (component.types.includes("locality")) city = component.long_name;
                if (component.types.includes("administrative_area_level_1")) state = component.short_name;
                if (component.types.includes("postal_code")) zip = component.long_name;
              });
              setAddressComponents({
                street: `${street_number} ${route}`.trim() || place.name || "",
                city,
                state,
                zip
              });
            }
          });
        }
      } catch (err) {
        console.error("Google Maps load error:", err);
      }
    };

    initMap();
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
      addressComponents: addressComponents.street ? addressComponents : undefined,
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
        const data = await res.json();
        if (data.imageUrl) {
          setGeneratedImageUrl(data.imageUrl);
        }
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
          
          {generatedImageUrl && (
            <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <img src={generatedImageUrl} alt="Generated Architectural Sketch" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          )}

          <p style={{ color: "var(--text-muted)", marginTop: "1rem" }}>
            Your custom architectural sketch has been sent to your email and is being prepared for physical mailing!
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
            {loadingState === "locating" ? "Locating architecture..." : "Drawing ink lines and hatching... (This takes about 30 seconds)"}
          </div>
        </div>
      )}

      <h2 className={styles.title}>Get A Custom Black & White Sketch Of Your House, FREE</h2>
      <p className={styles.subtitle}>Enter your address to receive a custom AI architectural sketch.</p>

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
          <span>Get A Detailed Report Showing What A Buyer Might Pay For Your House Today</span>
        </label>

        <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loadingState !== "idle"}>
          Generate Sketch
        </button>
      </form>
    </div>
  );
}
