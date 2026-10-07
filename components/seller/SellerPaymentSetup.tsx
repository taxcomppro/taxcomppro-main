"use client";

import { CheckCircle2, ArrowUpRight, CreditCard, RefreshCw, Clock3 } from "lucide-react";
import type { SellerSetupState } from "@/lib/use-seller-setup";
import "./seller-payment-setup.css";

const copy: Record<SellerSetupState, { title: string; description: string; action: string }> = {
  checking: { title: "Checking your payment setup", description: "You can keep editing while we check your Stripe account.", action: "Checking Stripe…" },
  unconnected: { title: "One step before your first sale", description: "Create your offer now. Connect Stripe before publishing so buyers can pay you directly.", action: "Save & connect Stripe" },
  incomplete: { title: "Finish your Stripe setup", description: "Your account is connected, but Stripe still needs information before you can accept payments and receive payouts.", action: "Save & finish setup" },
  pending: { title: "Stripe is reviewing your account", description: "Your setup has been submitted. Keep editing or save your draft while Stripe completes verification.", action: "Check payment status" },
  review: { title: "Your payment setup needs a review", description: "Contact our team to update your existing connection before publishing a paid offer. Your draft stays available here.", action: "Save & contact support" },
  ready: { title: "Ready to accept payments", description: "Payments go directly to your Stripe account. The platform takes 0%; Stripe's fees still apply.", action: "Check again" },
  error: { title: "We couldn't check your payment setup", description: "Your content is safe on this page. Retry the check before publishing a paid offer.", action: "Try again" },
};

export function sellerPublishLabel(state: SellerSetupState) {
  return state === "unconnected" ? "Connect Stripe to publish" : state === "incomplete" ? "Finish Stripe setup" : state === "review" ? "Review payment setup" : state === "checking" ? "Checking payments…" : "Check payment status";
}

export default function SellerPaymentSetup({ paid, setup, onConnect, onFree, busy = false, id }: {
  paid: boolean;
  setup: { state: SellerSetupState; connecting: boolean; error: string; refresh: () => Promise<void> };
  onConnect: () => void;
  onFree: () => void;
  busy?: boolean;
  id: string;
}) {
  const content = copy[setup.state];
  const ready = setup.state === "ready";
  return (
    <section className="seller-payment-setup" data-ready={!paid || ready} aria-labelledby={`${id}-title`} id={id} tabIndex={-1}>
      <div className="seller-payment-setup-heading">
        <span className="seller-payment-setup-icon" aria-hidden="true">{!paid || ready ? <CheckCircle2 size={21} /> : setup.state === "pending" ? <Clock3 size={21} /> : <CreditCard size={21} />}</span>
        <div aria-live="polite">
          <span className="seller-payment-setup-eyebrow">Payment setup</span>
          <h3 id={`${id}-title`}>{paid ? content.title : "Free offers don’t need Stripe."}</h3>
          <p>{paid ? content.description : "You can publish a free offer now. Connect Stripe whenever you're ready to charge."}</p>
        </div>
      </div>
      {paid && !ready && <>
        <ol className="seller-payment-setup-steps" aria-label="Steps to start selling">
          <li><span>1</span> Prepare your offer</li>
          <li aria-current="step"><span>2</span> Connect & verify Stripe</li>
          <li><span>3</span> Review & publish</li>
        </ol>
        <div className="seller-payment-setup-actions">
          <button type="button" disabled={busy || setup.connecting || setup.state === "checking"} onClick={onConnect}>
            {setup.connecting ? "Opening Stripe…" : content.action}
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
          <button type="button" className="seller-payment-setup-link" disabled={busy || setup.connecting || setup.state === "checking"} onClick={() => void setup.refresh()} aria-label="Refresh Stripe payment status"><RefreshCw size={14} aria-hidden="true" /> Refresh status</button>
          <button type="button" className="seller-payment-setup-link" disabled={busy || setup.connecting} onClick={onFree}>Make this offer free</button>
        </div>
        <p className="seller-payment-setup-note">We save your draft on this browser before opening Stripe. Return here to review and publish — nothing goes live automatically.</p>
      </>}
      {setup.error && <p className="seller-payment-setup-error" role="alert">{setup.error}</p>}
    </section>
  );
}

export function CreationDraftNotice({ message, onSave, busy }: { message: string; onSave: () => void; busy?: boolean }) {
  return <div className="seller-draft-notice">
    <div><strong>Your work, at your pace</strong><p role="status">{message || "Drafts save on this browser for 7 days. You decide when to publish."}</p></div>
    <button type="button" onClick={onSave} disabled={busy}>Save draft</button>
  </div>;
}
