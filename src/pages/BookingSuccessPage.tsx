import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "motion/react";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { CheckCircle2, Loader2, Home } from "lucide-react";

const BookingSuccessPage = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const settlementId = queryParams.get("settlement_id");
  const listingId = queryParams.get("listingId");
  const listingName = queryParams.get("listingName");
  
  const stripeAuthorized = queryParams.get("stripe_authorized") === "true";
  const transferAuthorized = queryParams.get("transfer_authorized") === "true";
  const paystackAuthorized = queryParams.get("paystack_authorized") === "true";
  const paystackCurrency = queryParams.get("paystack_currency") || "NGN";
  const paystackAmount = queryParams.get("paystack_amount");
  const paystackSymbol = queryParams.get("paystack_symbol") ? decodeURIComponent(queryParams.get("paystack_symbol")!) : "₦";
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    // With Sanctuary Ledger, the booking is created before navigation
    // We just verify the presence of the settlement ID
    if (settlementId) {
      setTimeout(() => setStatus('success'), 1000);
    } else {
      setStatus('error');
    }
  }, [settlementId]);

  return (
    <div className="pt-32 pb-40 bg-canvas min-h-screen flex items-center justify-center px-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="minimal-card p-12 text-center max-w-md w-full"
      >
        {status === 'loading' ? (
          <div className="space-y-6">
            <Loader2 size={48} className="animate-spin mx-auto text-slate-200" />
            <div>
              <h1 className="text-2xl font-semibold mb-2">Finalizing Reservation</h1>
              <p className="text-slate-400 text-sm">Securing your stay in our global network...</p>
            </div>
          </div>
        ) : status === 'success' ? (
          <div className="space-y-8">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-light">Stay <span className="font-semibold text-black">Confirmed</span></h1>
              <p className="text-slate-500 text-xs leading-relaxed">
                Your sanctuary has been secured under Protocol ID <span className="font-mono text-black font-bold">{settlementId}</span>. You can view your itinerary and check-in details in your profile.
              </p>
              
              {stripeAuthorized && (
                <div className="bg-[#635bff]/5 border border-[#635bff]/10 py-3 px-4 rounded-xl flex flex-col items-center gap-1 animate-fade-in">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#635bff] animate-pulse"></span>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#635bff]">Stripe Sandbox Authorization Clearance</p>
                  </div>
                  <p className="text-[9px] text-[#635bff] font-mono leading-none">Receipt: ch_test_{(Math.random() + 1).toString(36).substring(2, 10).toUpperCase()}</p>
                </div>
              )}

              {transferAuthorized && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 py-3 px-4 rounded-xl flex flex-col items-center gap-1 animate-fade-in">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Local Bank Transfer Clearance</p>
                  </div>
                  <p className="text-[9px] text-emerald-600 font-mono leading-none">Reference: ACH_WIRE_{(Math.random() + 1).toString(36).substring(2, 10).toUpperCase()}</p>
                </div>
              )}

              {paystackAuthorized && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 py-4 px-5 rounded-2xl flex flex-col items-center gap-2 animate-fade-in font-sans">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Paystack Clearing Success</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] text-slate-400 capitalize mb-0.5">Settled Local Funds</p>
                    <p className="text-lg font-light text-slate-800">
                      <span className="font-sans font-normal text-emerald-600 mr-0.5">{paystackSymbol}</span>
                      {Number(paystackAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-bold text-slate-400 font-mono">{paystackCurrency}</span>
                    </p>
                  </div>
                  <p className="text-[9px] text-emerald-600 font-mono leading-none">Gateway Reference: PSTK_{(Math.random() + 1).toString(36).substring(2, 11).toUpperCase()}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <Link to="/profile" className="minimal-button py-4">
                View My Stays
              </Link>
              <Link to="/" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-black flex items-center justify-center gap-2">
                <Home size={14} /> Return to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} className="rotate-45" />
            </div>
            <div>
              <h1 className="text-3xl font-light mb-4">Verification <span className="font-semibold">Pending</span></h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                We couldn't instantly verify your session. Please check your email or contact support if your booking doesn't appear in your profile shortly.
              </p>
            </div>
            <Link to="/profile" className="minimal-button py-4 w-full">
              Go to Profile
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default BookingSuccessPage;
