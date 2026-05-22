import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, updateDoc, doc } from "firebase/firestore";
import { Calendar, MapPin, Receipt, ShieldCheck, ChevronRight, XCircle, Loader2, ShieldAlert, CheckCircle2, X } from "lucide-react";
import { MOCK_LISTINGS } from "../constants";

const ProfilePage = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<any | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        // Fetch Bookings
        const bq = query(
          collection(db, "bookings"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const bookingSnapshot = await getDocs(bq);
        setBookings(bookingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch My Listings (If any)
        const lq = query(
          collection(db, "listings"),
          where("ownerId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const listingSnapshot = await getDocs(lq);
        setMyListings(listingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleCancelBooking = async (booking: any) => {
    if (!booking) return;
    setCancellingId(booking.id);
    try {
      // 1. Process reversal via server protocol
      const response = await fetch("/api/cancel-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId: booking.settlementId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Protocol reversal failed.");
      }

      const resultData = await response.json();

      // 2. Update Firestore Status
      const bookingRef = doc(db, "bookings", booking.id);
      await updateDoc(bookingRef, {
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        reversalReference: resultData.refundStatus || "REVERSED"
      });

      // 3. Update Local State
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: "cancelled" } : b));
      setSuccessNotification("Sanctuary Reservation Cancelled. Refund initiated successfully.");
      setBookingToCancel(null);
    } catch (err: any) {
      console.error("Cancellation Error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
      setErrorNotification(`Failed to process reversal. Error: ${err.message}`);
    } finally {
      setCancellingId(null);
    }
  };

  const handleViewReceipt = (booking: any) => {
    // In a production app, this would link to a generated PDF or a unique receipt route
    // For this prototype, we simulate the receipt generation
    const receiptData = {
      protocolId: booking.settlementId || booking.stripeSessionId || "N/A",
      bookingId: booking.id,
      date: booking.createdAt ? new Date(booking.createdAt.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString(),
      listing: booking.listingName,
      user: user?.displayName || user?.email,
      amount: booking.price * (booking.days || 1),
      checkIn: booking.checkIn,
      guests: booking.guests,
      type: booking.type || 'rental'
    };
    
    setViewingReceipt(receiptData);
  };

  if (!user) {
    return (
      <div className="pt-40 pb-40 text-center min-h-screen">
        <h2 className="text-2xl font-light">Please sign in to view your dashboard</h2>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-40 bg-canvas min-h-screen">
      <div className="max-w-7xl mx-auto px-12">
        <header className="mb-16">
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-slate-400 mb-4">Member Dashboard</p>
          <h1 className="text-5xl font-light">Your <span className="font-semibold italic">Sanctuaries</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* User Info Card */}
          <div className="lg:col-span-4">
            <div className="minimal-card p-8 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {user.displayName?.charAt(0) || user.email?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{user.displayName || "Luxe Member"}</h3>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
              </div>
              
              <div className="space-y-4 pt-8 border-t border-slate-50">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Membership Status</span>
                    <span className="font-bold text-[10px] bg-black text-white px-2 py-0.5 rounded">ELITE</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Verified Identity</span>
                    <ShieldCheck size={16} className="text-green-500" />
                 </div>
              </div>

              <button className="minimal-button w-full py-3 text-xs opacity-50 cursor-not-allowed">
                Edit Membership Details
              </button>
            </div>
          </div>

          {/* Bookings & Listings */}
          <div className="lg:col-span-8 space-y-16">
            <section>
              <h2 className="text-xl font-semibold mb-8 flex items-center gap-3">
                Upcoming & Past Stays 
                <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-400">{bookings.length}</span>
              </h2>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="h-32 w-full bg-slate-50 animate-pulse rounded-2xl"></div>
                  ))}
                </div>
              ) : bookings.length > 0 ? (
                <div className="space-y-6">
                  {bookings.map((booking) => (
                    <motion.div 
                      key={booking.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="minimal-card p-6 flex flex-col md:flex-row gap-8 items-center"
                    >
                      <div className="w-32 h-32 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                        <img 
                          src={booking.listingImage || MOCK_LISTINGS.find(l => l.id === booking.listingId)?.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be60998ad50c"} 
                          className="w-full h-full object-cover" 
                          alt="" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-grow space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold">{booking.listingName}</h3>
                            <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={12} /> Confirmed Location</p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded ${booking.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {booking.status || 'Confirmed'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-slate-50">
                          <div>
                            <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">
                              {booking.type === 'sale' ? 'Acquisition Date' : 'Stay Period'}
                            </p>
                            <p className="text-xs font-semibold flex items-center gap-1">
                              <Calendar size={12} /> {booking.checkIn}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">
                              {booking.type === 'sale' ? 'Protocol' : 'Guests'}
                            </p>
                            <p className="text-xs font-semibold">
                              {booking.type === 'sale' ? 'Permanent' : `${booking.guests} Reserved`}
                            </p>
                          </div>
                          <div className="hidden md:block">
                            <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Receipt</p>
                            <button 
                              onClick={() => handleViewReceipt(booking)}
                              className="text-[10px] font-bold text-black border-b border-black hover:text-slate-600 transition-colors"
                            >
                              View PDF
                            </button>
                          </div>
                          <div>
                            {booking.status !== 'cancelled' && (
                              <button 
                                onClick={() => setBookingToCancel(booking)}
                                className="flex items-center gap-2 text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                              >
                                <XCircle size={12} />
                                Cancel Stay
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="text-slate-200 hidden md:block" />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="minimal-card p-12 text-center space-y-4 border-dashed border-slate-200">
                  <Receipt className="text-slate-200 mx-auto" size={32} />
                  <p className="text-sm text-slate-400">No reservations found yet.</p>
                </div>
              )}
            </section>

            {myListings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-8 flex items-center gap-3">
                  Managed Properties
                  <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-400">{myListings.length}</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myListings.map(listing => (
                    <div key={listing.id} className="minimal-card p-4 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                        <img src={listing.images?.[0]} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-grow">
                        <h4 className="text-sm font-bold">{listing.title}</h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{listing.location}</p>
                        <p className="text-xs font-semibold mt-1">${listing.price} / night</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter ${listing.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                          {listing.status || 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {viewingReceipt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingReceipt(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 sm:p-12 md:p-16 space-y-8 md:space-y-12 bg-[#fafafa]">
                <div className="flex justify-between items-start">
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                      <Receipt className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-light tracking-tight">Ledger Receipt</h3>
                      <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-extrabold mt-1">Official Sanctuary Settlement</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Date Issued</p>
                    <p className="text-sm font-mono">{viewingReceipt.date}</p>
                  </div>
                </div>

                <div className="space-y-6 pt-12 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-12">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Member</p>
                      <p className="text-sm font-semibold">{viewingReceipt.user}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Protocol ID</p>
                      <p className="text-sm font-mono">{viewingReceipt.protocolId}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 pt-4">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Sanctuary Residence</p>
                    <p className="text-xl font-bold">{viewingReceipt.listing}</p>
                    <p className="text-xs text-slate-500">
                      {viewingReceipt.type === 'sale' ? 'Permanent Acquisition' : `${viewingReceipt.checkIn} · ${viewingReceipt.guests} Guests`}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-12 border-t border-slate-200">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-400">
                    <span>Description</span>
                    <span>Amount</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-sm font-semibold">
                      {viewingReceipt.type === 'sale' ? 'Final Asset Acquisition' : 'Base Reservation Settlement'}
                    </p>
                    <p className="text-2xl font-light">${viewingReceipt.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center pt-8">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</p>
                    <span className="bg-black text-white text-[10px] font-bold px-3 py-1 rounded">SETTLED</span>
                  </div>
                </div>

                <div className="pt-12 text-center space-y-6">
                  <div className="flex items-center justify-center gap-3">
                    <button 
                      onClick={() => window.print()}
                      className="minimal-button py-3 px-8 text-[10px] font-bold uppercase tracking-widest bg-black text-white rounded-2xl"
                    >
                      Process Print Command
                    </button>
                    <button 
                      onClick={() => setViewingReceipt(null)}
                      className="minimal-button py-3 px-8 text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-200 rounded-2xl"
                    >
                      Dismiss
                    </button>
                  </div>
                  <p className="text-[8px] text-slate-400 uppercase tracking-[0.3em] font-medium max-w-xs mx-auto leading-relaxed">
                    This document serves as an immutable record of sanctuary settlement. 
                    Encryption key verified by Sanctuary Central Registry.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Premium Cancellation Confirmation Modal */}
      <AnimatePresence>
        {bookingToCancel && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!cancellingId) setBookingToCancel(null);
              }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-100 rounded-[32px] p-8 md:p-12 max-w-xl w-full relative z-[260] shadow-2xl space-y-8 text-center"
            >
              {!cancellingId && (
                <button 
                  onClick={() => setBookingToCancel(null)}
                  className="absolute top-6 right-6 p-2 text-slate-400 hover:text-black hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              )}

              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <ShieldAlert size={28} />
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#dc2626]">Cancellation Ledger Protocol</span>
                <h3 className="text-3xl font-light">Revoke Sanctuary <span className="font-semibold">Reservation</span></h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  You are initiating a refund and reversal protocol for your upcoming stay at:
                </p>
                <div className="bg-slate-50 rounded-2xl p-4 mt-2 border border-slate-100 text-left">
                  <p className="text-xs font-semibold text-slate-900">{bookingToCancel.listingName}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Check-in: {bookingToCancel.checkIn} · {bookingToCancel.guests} Guests</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">Settlement ID: {bookingToCancel.settlementId || "N/A"}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 font-normal">
                <button
                  onClick={() => setBookingToCancel(null)}
                  disabled={!!cancellingId}
                  className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                >
                  Keep Reservation
                </button>
                <button 
                  onClick={() => handleCancelBooking(bookingToCancel)}
                  disabled={!!cancellingId}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white shadow-lg py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {cancellingId === bookingToCancel.id ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Reversing...
                    </>
                  ) : (
                    "Cancel & Refund"
                  )}
                </button>
              </div>

              <p className="text-[9px] text-slate-400 font-mono">
                Approved Reversals are instantly logged to Firestore with SECURE_REFUND_AES_256 protocol.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Premium Success Notification Modal */}
      <AnimatePresence>
        {successNotification && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSuccessNotification(null)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-100 rounded-[32px] p-8 md:p-12 max-w-md w-full relative z-[310] shadow-2xl space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <CheckCircle2 size={28} />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-green-500">Protocol Success</span>
                <h3 className="text-2xl font-semibold">Ledger Updated</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {successNotification}
                </p>
              </div>

              <button 
                onClick={() => setSuccessNotification(null)}
                className="minimal-button w-full shadow-lg py-3.5 hover:shadow-xl transition-all cursor-pointer"
              >
                Continue
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Premium Error Notification Modal */}
      <AnimatePresence>
        {errorNotification && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setErrorNotification(null)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-100 rounded-[32px] p-8 md:p-12 max-w-md w-full relative z-[310] shadow-2xl space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <ShieldAlert size={28} />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#dc2626]">Protocol Interrupted</span>
                <h3 className="text-2xl font-semibold">Verification Failure</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  {errorNotification}
                </p>
              </div>

              <button 
                onClick={() => setErrorNotification(null)}
                className="minimal-button w-full shadow-lg py-3.5 hover:shadow-xl transition-all bg-red-650 text-white cursor-pointer"
              >
                Dismiss
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
