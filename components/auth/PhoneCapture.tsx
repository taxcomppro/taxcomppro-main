"use client";

import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { normalizePhoneNumber, phoneReturnPath } from "@/lib/phone-number";
import "./phone-capture.css";

export default function PhoneCapture({ returnTo = "/feed" }: { returnTo?: string }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return;
    const normalized = normalizePhoneNumber(phone);
    if (!normalized) { setError("Include your country code, for example +1 555 123 4567."); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/user/phone", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: normalized }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn't save your number. Please retry.");
      window.location.replace(phoneReturnPath(returnTo));
    } catch (err) { setError(err instanceof Error ? err.message : "We couldn't save your number. Please retry."); setSaving(false); }
  }
  async function leave() {
    setLeaving(true); setError("");
    try { const result = await signOut(); if (result.error) throw new Error("Unable to sign out. Please retry."); window.location.replace("/login"); }
    catch { setError("Unable to sign out. Please retry."); setLeaving(false); }
  }
  return <main className="phone-setup"><section className="phone-setup-card" aria-labelledby="phone-title">
    <span className="phone-setup-brand">TAX COMPLIANCE PRO</span>
    <div className="phone-setup-icon" aria-hidden="true">☎</div>
    <p className="phone-setup-eyebrow">ONE ACCOUNT DETAIL TO COMPLETE</p>
    <h1 id="phone-title">Add your phone number</h1>
    <p className="phone-setup-copy">Phone numbers are now required for member accounts. Add yours once to continue where you left off.</p>
    <form onSubmit={submit}>
      <label htmlFor="required-phone">Phone number <span>(required)</span></label>
      <input id="required-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="+1 555 123 4567" maxLength={40} required disabled={saving || leaving} aria-invalid={!!error} aria-describedby={error ? "phone-help phone-error" : "phone-help"} />
      <p id="phone-help" className="phone-setup-help">Include your country code, such as +1 or +44.</p>
      {error && <p id="phone-error" role="alert" className="phone-setup-error">{error}</p>}
      <button className="phone-setup-submit" type="submit" disabled={saving || leaving}>{saving ? "Saving your number…" : "Save and continue"}</button>
    </form>
    <button className="phone-setup-signout" type="button" onClick={leave} disabled={saving || leaving}>{leaving ? "Signing out…" : "Sign out"}</button>
  </section></main>;
}
