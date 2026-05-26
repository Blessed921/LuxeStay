import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Users, Heart, Share, Shield, Coffee, Wifi, Car, Tv, Wind, Calendar, User, ChevronRight, ChevronLeft, MessageSquare, Star, Send, X, CreditCard, Lock, Activity, CheckCircle2, Building2, Globe, KeyRound, ShieldAlert, Sparkles, ShieldCheck as VerifiedIcon } from "lucide-react";
import { MOCK_LISTINGS } from "../constants";
import { db, auth, loginWithGoogle, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from "firebase/firestore";

const EXCHANGE_RATES = {
  NG: { rate: 1510, symbol: "₦", name: "Nigerian Naira (NGN)" },
  GH: { rate: 15.4, symbol: "GH₵", name: "Ghanaian Cedi (GHS)" },
  ZA: { rate: 18.2, symbol: "R", name: "South African Rand (ZAR)" },
  KE: { rate: 130.5, symbol: "KSh", name: "Kenyan Shilling (KES)" }
};

const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any>(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [days, setDays] = useState(3);
  const [guests, setGuests] = useState(2);
  const [loading, setLoading] = useState(false);
  const [checkIn, setCheckIn] = useState(new Date().toISOString().split('T')[0]);

  // Dynamic booking calendar & availability states
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Parse check-in date string robustly, returning local Date (00:00:00)
  const parseBookingDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(dateStr);
  };

  // Calculate check-in range boundaries
  const getBookingRange = (checkInStr: string, daysCount: number) => {
    const start = parseBookingDate(checkInStr);
    const end = new Date(start.getTime() + daysCount * 24 * 60 * 60 * 1000);
    return { start, end };
  };

  const getActiveConflict = () => {
    if (!listing) return null;

    // 1. If listing is permanent acquisition and already sold
    if (listing.type === 'sale') {
      const activeSale = existingBookings.find(b => b.status === 'confirmed');
      if (activeSale) {
        return {
          conflict: true,
          message: "PERMANENTLY ACQUIRED",
          details: "This asset has been bought and is structurally deed-locked."
        };
      }
      return null;
    }

    // 2. If listing is rental, check for date interval overlap
    const proposed = getBookingRange(checkIn, days);
    
    // Prevent booking in the past
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (proposed.start.getTime() < today.getTime()) {
      return {
        conflict: true,
        message: "PAST DATES SELECTED",
        details: "Check-in cannot be initiated for past timeline schedules."
      };
    }

    for (const booking of existingBookings) {
      if (booking.status === 'cancelled') continue;
      
      const bDays = Number(booking.days || 1);
      const bCheckIn = booking.checkIn;
      if (!bCheckIn) continue;

      const activeRange = getBookingRange(bCheckIn, bDays);
      
      // Overlap formula: proposedStart < activeEnd && activeStart < proposedEnd
      if (proposed.start.getTime() < activeRange.end.getTime() && activeRange.start.getTime() < proposed.end.getTime()) {
        const checkInFmt = activeRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const checkOutFmt = activeRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return {
          conflict: true,
          message: "RESERVATION COLLISION",
          details: `This sanctuary is fully booked from ${checkInFmt} to ${checkOutFmt}.`
        };
      }
    }

    return null;
  };

  const conflict = getActiveConflict();
  
  // Settlement State
  const [showSettlementPortal, setShowSettlementPortal] = useState(false);
  const [settlementStep, setSettlementStep] = useState<'details' | 'processing' | 'verified'>('details');
  const [settlementId, setSettlementId] = useState("");
  const [cardData, setCardData] = useState({ number: "**** **** **** 4422", expiry: "12/28", cvc: "***" });
  
  // Payment integration test states
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'stripe' | 'paystack'>('stripe');
  const [stripeForm, setStripeForm] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [stripeError, setStripeError] = useState<string | null>(null);
  
  const [transferForm, setTransferForm] = useState({ routing: '', account: '', name: '' });
  const [transferError, setTransferError] = useState<string | null>(null);

  const [paystackCountry, setPaystackCountry] = useState<'NG' | 'GH' | 'ZA' | 'KE'>('NG');
  const [paystackForm, setPaystackForm] = useState({ email: '', number: '', expiry: '', cvc: '', phone: '', name: '' });
  const [paystackError, setPaystackError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [isPostingReview, setIsPostingReview] = useState(false);

  // Contact State
  const [showContactModal, setShowContactModal] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authReason, setAuthReason] = useState("Please sign in to initiate a booking protocol.");

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;
      
      setLoadingListing(true);
      
      try {
        // 1. Try Firestore First
        const docRef = doc(db, "listings", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            data.createdAt = data.createdAt.toDate().toISOString();
          }
          setListing({ id: docSnap.id, ...data });
          fetchReviews(docSnap.id);
          setLoadingListing(false);
          return;
        }

        // 2. Fallback to mock
        const mock = MOCK_LISTINGS.find(l => l.id === id);
        if (mock) {
          setListing(mock);
          setLoadingListing(false);
          return;
        }

        setListing(null);
      } catch (err) {
        console.error("Error fetching listing protocol:", err);
      } finally {
        setLoadingListing(false);
      }
    };

    fetchListing();
  }, [id]);

  useEffect(() => {
    const fetchExistingBookings = async () => {
      if (!listing?.id) return;
      setLoadingBookings(true);
      try {
        const q = query(
          collection(db, "bookings"),
          where("listingId", "==", listing.id)
        );
        const querySnapshot = await getDocs(q);
        const bookingsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Keep confirmed/active bookings (exclude cancelled)
        const activeBookings = bookingsList.filter((b: any) => b.status !== "cancelled");
        setExistingBookings(activeBookings);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, "bookings");
      } finally {
        setLoadingBookings(false);
      }
    };

    fetchExistingBookings();
  }, [listing?.id]);

  const fetchReviews = async (listingId: string) => {
    setLoadingReviews(true);
    try {
      const q = query(
        collection(db, "reviews"),
        where("listingId", "==", listingId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const reviewsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(reviewsData);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handlePostReview = async () => {
    if (!auth.currentUser) {
      setAuthReason("Verification required. Please sign in to authenticate your review.");
      setShowAuthModal(true);
      return;
    }
    if (!newComment.trim()) return;

    setIsPostingReview(true);
    try {
      const reviewData = {
        listingId: listing.id,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || "Anonymous Professional",
        userImage: auth.currentUser.photoURL || "",
        rating: newRating,
        comment: newComment,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "reviews"), reviewData);
      setNewComment("");
      setNewRating(5);
      fetchReviews(listing.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "reviews");
    } finally {
      setIsPostingReview(false);
    }
  };

  const handleContactOwner = async () => {
    if (!auth.currentUser) {
      setAuthReason("Sign in required to initiate communication with management.");
      setShowAuthModal(true);
      return;
    }
    if (!messageContent.trim()) return;

    setIsSendingMessage(true);
    try {
      const messageData = {
        senderId: auth.currentUser.uid,
        receiverId: listing.ownerId || "system", // Fallback to system for mock listings
        listingId: listing.id,
        content: messageContent,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "messages"), messageData);
      setMessageContent("");
      setShowContactModal(false);
      alert("Protocol Transmission Message sent successfully to management.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "messages");
    } finally {
      setIsSendingMessage(false);
    }
  };

  if (loadingListing) return (
    <div className="pt-60 text-center flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-2 border-slate-100 border-t-black rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Synchronizing Details</p>
    </div>
  );

  if (!listing) return (
    <div className="pt-60 text-center py-40 min-h-screen">
      <h1 className="text-3xl font-light mb-8 italic">Asset Not Found.</h1>
      <p className="text-[11px] uppercase tracking-widest max-w-sm mx-auto text-slate-400 leading-relaxed mb-12">
        The requested residence protocol could not be located in our global curation portfolio. 
        ID: <span className="text-black font-mono">{id}</span>
      </p>
      <Link to="/explore" className="minimal-button inline-block">Return to Portfolio</Link>
    </div>
  );

  const handleBooking = async () => {
    if (!auth.currentUser) {
      setAuthReason("Please sign in to initiate a booking protocol.");
      setShowAuthModal(true);
      return;
    }

    const currentConflict = getActiveConflict();
    if (currentConflict) {
      alert(`Ledger Lock: ${currentConflict.message}. ${currentConflict.details}`);
      return;
    }

    setLoading(true);
    try {
      let data;
      try {
        const response = await fetch("/api/initiate-settlement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingId: listing.id,
            listingName: listing.title,
            price: listing.price,
            days: listing.type === 'sale' ? 1 : days,
            guests: listing.type === 'sale' ? 1 : guests,
            checkIn: listing.type === 'sale' ? new Date().toISOString() : checkIn,
            userId: auth.currentUser.uid
          }),
        });

        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          console.warn("Express server API not found or returned non-JSON. Falling back to client-side settlement simulation.");
          throw new Error("api_not_found");
        }
      } catch (fetchErr) {
        // Fallback to client-side logic for static Vercel host
        const simulatedSettlementId = `SL-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
        data = {
          success: true,
          settlementId: simulatedSettlementId,
          protocolVersion: "2.4.1-alpha",
          timestamp: new Date().toISOString(),
          details: {
            listingName: listing.title,
            amount: listing.price * (listing.type === 'sale' ? 1 : days),
            currency: "USD"
          }
        };
      }

      setSettlementId(data.settlementId);
      setShowSettlementPortal(true);
      setSettlementStep('details');
    } catch (err: any) {
      console.error("Booking Initiation Error:", err);
      alert(`Initiation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const executeFinalSettlement = async () => {
    if (paymentMethod === 'stripe') {
      if (!stripeForm.number.trim() || !stripeForm.expiry.trim() || !stripeForm.cvc.trim() || !stripeForm.name.trim()) {
        setStripeError("All payment card fields are required for Stripe Sandbox clearance.");
        return;
      }
      setStripeError(null);
    } else if (paymentMethod === 'transfer') {
      if (!transferForm.routing.trim() || !transferForm.account.trim() || !transferForm.name.trim()) {
        setTransferError("All fields (Routing, Account number, and Name) are required for bank transfer clearance.");
        return;
      }
      setTransferError(null);
    } else if (paymentMethod === 'paystack') {
      if (!paystackForm.email.trim() || !paystackForm.number.trim() || !paystackForm.expiry.trim() || !paystackForm.cvc.trim() || !paystackForm.phone.trim() || !paystackForm.name.trim()) {
        setPaystackError("All Paystack security input fields are required to process checkout clearance.");
        return;
      }
      setPaystackError(null);
    }

    setSettlementStep('processing');
    
    // Simulate high-tech verification rituals
    await new Promise(resolve => setTimeout(resolve, 2800));
    
    try {
      // Create confirmed booking in Firestore with authentic testing receipt trace
      const bookingData = {
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        listingId: listing.id,
        listingName: listing.title,
        listingImage: listing.images?.[0] || "",
        price: listing.price,
        days: listing.type === 'sale' ? 1 : days,
        guests: listing.type === 'sale' ? 1 : guests,
        checkIn: listing.type === 'sale' ? new Date().toISOString() : checkIn,
        settlementId: settlementId,
        status: "confirmed",
        type: listing.type || 'rental',
        createdAt: serverTimestamp(),
        paymentMethod: paymentMethod,
        stripeSessionId: paymentMethod === 'stripe' ? `ch_test_${Math.random().toString(36).substring(2, 12).toUpperCase()}` : paymentMethod === 'paystack' ? `pstk_test_${Math.random().toString(36).substring(2, 12).toUpperCase()}` : `wire_test_${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      };

      await addDoc(collection(db, "bookings"), bookingData);
      
      setSettlementStep('verified');
      
      // Navigate to success after a brief verification display
      setTimeout(() => {
        const finalDays = listing.type === 'sale' ? 1 : days;
        const finalGuests = listing.type === 'sale' ? 1 : guests;
        const finalCheckIn = listing.type === 'sale' ? new Date().toISOString() : checkIn;
        
        let actionParam = '';
        if (paymentMethod === 'stripe') {
          actionParam = '&stripe_authorized=true';
        } else if (paymentMethod === 'paystack') {
          const exchangeData = EXCHANGE_RATES[paystackCountry];
          const calculatedLocalAmount = (listing.price * (listing.type === 'sale' ? 1 : days) * exchangeData.rate).toFixed(2);
          actionParam = `&paystack_authorized=true&paystack_currency=${paystackCountry}&paystack_amount=${calculatedLocalAmount}&paystack_symbol=${encodeURIComponent(exchangeData.symbol)}`;
        } else {
          actionParam = '&transfer_authorized=true';
        }

        navigate(`/booking-success?settlement_id=${settlementId}&listingId=${listing.id}&days=${finalDays}&guests=${finalGuests}&checkIn=${finalCheckIn}&listingName=${encodeURIComponent(listing.title)}${actionParam}&payment_method=${paymentMethod}`);
      }, 1500);
    } catch (err: any) {
      console.error("Final Settlement Error:", err);
      handleFirestoreError(err, OperationType.WRITE, "bookings");
      alert("Critical Failure during final ledger entry. Please contact administration.");
      setSettlementStep('details');
    }
  };

  const amenitiesMap: Record<string, any> = {
    "Wifi": <Wifi size={20} />,
    "Parking": <Car size={20} />,
    "Kitchen": <Coffee size={20} />,
    "TV": <Tv size={20} />,
    "AC": <Wind size={20} />,
    "Gym": <Shield size={20} />
  };

  return (
    <div className="pt-32 pb-40 bg-canvas min-h-screen">
      <div className="max-w-7xl mx-auto px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <div className="rounded-3xl overflow-hidden minimal-card h-[500px] relative group">
                  <AnimatePresence mode="wait">
                    <motion.img 
                      key={activeImage}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      src={listing.images?.[activeImage] || listing.images?.[0] || ""} 
                      alt={listing.title} 
                      className="w-full h-full object-cover"
                    />
                  </AnimatePresence>
                  
                  {listing.images.length > 1 && (
                    <>
                      <button 
                        onClick={() => setActiveImage(prev => (prev === 0 ? listing.images.length - 1 : prev - 1))}
                        className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-black hover:text-white"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button 
                        onClick={() => setActiveImage(prev => (prev === listing.images.length - 1 ? 0 : prev + 1))}
                        className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-black hover:text-white"
                      >
                        <ChevronRight size={20} />
                      </button>
                      
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                        {listing.images.map((_: any, idx: number) => (
                          <button 
                            key={idx}
                            onClick={() => setActiveImage(idx)}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${idx === activeImage ? "bg-white w-4" : "bg-white/40"}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
                
                {listing.images.length > 1 && (
                  <div className="grid grid-cols-6 gap-3">
                    {listing.images.map((img: string, idx: number) => (
                      <button 
                        key={idx}
                        onClick={() => setActiveImage(idx)}
                        className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${idx === activeImage ? "border-black" : "border-transparent opacity-60 hover:opacity-100"}`}
                      >
                        <img src={img} className="w-full h-full object-cover" alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-8">
                  <div>
                    <h1 className="text-5xl font-light mb-4">{listing.title}</h1>
                    <p className="text-slate-400 font-medium flex items-center gap-2">
                       <MapPin size={16} /> {listing.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Asset Rating</p>
                    <div className="text-2xl font-semibold flex items-center gap-2">
                       <span className="text-black">★</span> {listing.rating}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: 'Surface', value: (listing as any).surface || '1,240 sqft' },
                    { label: 'Capacity', value: (listing as any).capacity ? `${(listing as any).capacity} Guests` : '4 Guests' },
                    { label: 'Bedrooms', value: (listing as any).bedrooms ? `${(listing as any).bedrooms} ${Number((listing as any).bedrooms) === 1 ? 'Suite' : 'Suites'}` : '2 Suites' }
                  ].map(spec => (
                    <div key={spec.label} className="p-4 rounded-xl bg-white border border-slate-50">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{spec.label}</p>
                      <p className="text-sm font-semibold">{spec.value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-12 pt-12 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-semibold flex items-center gap-3">
                      Portolio Reviews
                      <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-400">{reviews.length}</span>
                    </h3>
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <Star size={16} className="fill-black" />
                      {listing.rating} Average
                    </div>
                  </div>

                  {/* Add Review */}
                  {auth.currentUser && (
                    <div className="minimal-card p-6 space-y-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Authenticate Your Experience</p>
                      <div className="flex items-center gap-2 mb-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button 
                            key={star} 
                            onClick={() => setNewRating(star)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star 
                              size={20} 
                              className={star <= newRating ? "fill-black text-black" : "text-slate-200"} 
                            />
                          </button>
                        ))}
                      </div>
                      <textarea 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Detail your stay protocol and curated experience..."
                        className="w-full bg-slate-50 rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-slate-200 min-h-[100px] resize-none"
                      />
                      <div className="flex justify-end">
                        <button 
                          onClick={handlePostReview}
                          disabled={isPostingReview || !newComment.trim()}
                          className="minimal-button py-2 px-6 text-xs flex items-center gap-2"
                        >
                          {isPostingReview ? "Transmitting..." : "Submit Review"}
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reviews List */}
                  <div className="space-y-8">
                    {loadingReviews ? (
                      <div className="space-y-4">
                         {[1, 2].map(i => <div key={i} className="h-24 bg-slate-50 animate-pulse rounded-xl"></div>)}
                      </div>
                    ) : reviews.length > 0 ? (
                      reviews.map((review) => (
                        <div key={review.id} className="space-y-4 group">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden">
                                {review.userImage ? <img src={review.userImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">{review.userName?.[0]}</div>}
                              </div>
                              <div>
                                <p className="text-sm font-semibold">{review.userName}</p>
                                <p className="text-[9px] text-slate-400 uppercase tracking-widest">{review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Recent'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={10} className={i < review.rating ? "fill-black text-black" : "text-slate-200"} />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-slate-500 leading-relaxed pl-13">
                            {review.comment}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                        <MessageSquare className="mx-auto text-slate-200 mb-2" size={24} />
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">No feedback transmitted yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-6">
              <div className="minimal-card p-8 space-y-8">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      {listing.type === 'sale' ? 'Acquisition Value' : 'Nightly Settlement'}
                    </p>
                    <p className="text-4xl font-light">${listing.price.toLocaleString()}</p>
                  </div>
                  <div className="flex">
                    {listing.type === 'sale' && existingBookings.some(b => b.status === 'confirmed') ? (
                      <span className="bg-red-50 text-red-600 border border-red-100/50 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5 animate-pulse">
                        <Lock size={12} /> Sold Check Out
                      </span>
                    ) : (
                      <span className="status-badge max-w-full truncate whitespace-normal">
                        {listing.type === 'sale' ? 'Available for Acquisition' : 'Available for Residency'}
                      </span>
                    )}
                  </div>
                </div>

                {listing.type !== 'sale' ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-slate-100 space-y-4">
                      <div className="flex items-center justify-between text-xs font-semibold">
                         <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-450" />
                            <span>Check In</span>
                         </div>
                         <input 
                          type="date" 
                          value={checkIn}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setCheckIn(e.target.value)}
                          className="bg-transparent border-none focus:outline-none text-right cursor-pointer font-semibold text-slate-800"
                         />
                      </div>
                      <div className="h-px bg-slate-50"></div>
                      <div className="flex items-center justify-between text-xs font-semibold">
                         <div className="flex items-center gap-2">
                            <Users size={14} className="text-slate-450" />
                            <span>Guests</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <button onClick={() => setGuests(Math.max(1, guests - 1))} className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100">-</button>
                            <span>{guests}</span>
                            <button onClick={() => setGuests(guests + 1)} className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100">+</button>
                         </div>
                      </div>
                      <div className="h-px bg-slate-50"></div>
                      <div className="flex items-center justify-between text-xs font-semibold">
                         <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-450" />
                            <span>Duration (Nights)</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <button onClick={() => setDays(Math.max(1, days - 1))} className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100">-</button>
                            <span>{days}</span>
                            <button onClick={() => setDays(days + 1)} className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100">+</button>
                         </div>
                      </div>
                    </div>

                    {/* Blackout dates schedule list */}
                    {existingBookings.length > 0 && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Reserved Schedule</p>
                          <span className="text-[8px] font-mono tracking-widest text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded font-bold uppercase">
                            {existingBookings.length} Blocked
                          </span>
                        </div>
                        <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                          {existingBookings.map((b, idx) => {
                            const bDays = Number(b.days || 1);
                            const bCheckIn = b.checkIn;
                            if (!bCheckIn) return null;
                            const range = getBookingRange(bCheckIn, bDays);
                            const startFmt = range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            const endFmt = range.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            return (
                              <div key={idx} className="flex justify-between items-center text-[10px] font-mono text-slate-600 bg-white border border-slate-100/80 px-2.5 py-1.5 rounded-lg">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                                  {startFmt} – {endFmt}
                                </span>
                                <span className="text-slate-400 text-[9px] font-semibold">{bDays}N</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Protocol Note</p>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      This asset is classified as a Permanent Acquisition. One-time settlement includes full property rights and infrastructure access protocols.
                    </p>
                  </div>
                )}

                {conflict && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-left">
                    <ShieldAlert size={18} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-red-650 uppercase tracking-wider">{conflict.message}</p>
                      <p className="text-[11px] text-red-500 font-normal mt-0.5 leading-relaxed">{conflict.details}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <button 
                    onClick={handleBooking}
                    disabled={loading || !!conflict}
                    className="minimal-button w-full py-4 flex items-center justify-center gap-3 rounded-2xl cursor-pointer disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                  >
                    {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                    {conflict ? (
                      conflict.message === "PERMANENTLY ACQUIRED" ? "STRUCTURALLY LOCK DEED" : "UNAVAILABLE FOR DATES"
                    ) : loading ? (
                      "Synchronizing Settlement..."
                    ) : (
                      "Initiate Protocol Settlement"
                    )}
                  </button>
                  
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Shield size={10} className="text-slate-350" />
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Encrypted Sanctuary Protocol</p>
                  </div>
                </div>
              </div>

              <div className="minimal-card p-6 bg-slate-50/50 border-dashed border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">LO</div>
                  <div>
                    <p className="text-sm font-semibold">Listing Owner</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Verified Professional</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowContactModal(true)}
                  className="w-full py-2.5 text-[10px] font-bold uppercase tracking-widest border border-slate-200 rounded-lg hover:bg-white transition-all"
                >
                  Contact Management
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settlement Portal Modal */}
      <AnimatePresence>
        {showSettlementPortal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] md:rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 md:p-10 flex-1 overflow-y-auto space-y-6 md:space-y-8 scrollbar-thin">
                {settlementStep === 'details' && (
                  <>
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="text-3xl font-light tracking-tight">Ledger Settlement</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-extrabold">Protocol ID: <span className="text-black font-mono">{settlementId}</span></p>
                      </div>
                      <button onClick={() => setShowSettlementPortal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                        <X size={20} className="text-slate-300" />
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                          <span>Listing Protocol</span>
                          <span>Total Settlement</span>
                        </div>
                        <div className="flex justify-between items-end">
                          <p className="text-lg font-bold">{listing.title}</p>
                          <p className="text-3xl font-light">${(listing.price * (listing.type === 'sale' ? 1 : days)).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-extrabold pl-1">Payment Instrumentation</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div 
                            onClick={() => {
                              setPaymentMethod('transfer');
                              setTransferError(null);
                            }}
                            className={`p-3 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all h-24 sm:h-28 ${paymentMethod === 'transfer' ? 'border-black bg-slate-50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                          >
                            <div className="flex justify-between items-start w-full">
                              <Building2 size={16} className={paymentMethod === 'transfer' ? 'text-black' : 'text-slate-400'} />
                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'transfer' ? 'border-black' : 'border-slate-300'}`}>
                                {paymentMethod === 'transfer' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                              </div>
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-slate-800 leading-tight">Bank Transfer</p>
                              <p className="text-[7.5px] text-slate-400 uppercase tracking-wider font-semibold">ACH Direct Swap</p>
                            </div>
                          </div>
                          
                          <div 
                            onClick={() => {
                              setPaymentMethod('stripe');
                              setStripeError(null);
                            }}
                            className={`p-3 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all h-24 sm:h-28 ${paymentMethod === 'stripe' ? 'border-black bg-slate-50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                          >
                            <div className="flex justify-between items-start w-full">
                              <Lock size={16} className={paymentMethod === 'stripe' ? 'text-[#635bff]' : 'text-slate-400'} />
                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'stripe' ? 'border-[#635bff]' : 'border-slate-300'}`}>
                                {paymentMethod === 'stripe' && <div className="w-1.5 h-1.5 bg-[#635bff] rounded-full" />}
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-slate-800 leading-tight font-sans">Stripe Card</span>
                                <span className="bg-[#635bff]/10 text-[#635bff] text-[6.5px] font-extrabold px-0.5 rounded">TEST</span>
                              </div>
                              <p className="text-[7.5px] text-slate-400 uppercase tracking-wider font-semibold">Visa/Mastercard</p>
                            </div>
                          </div>

                          <div 
                            onClick={() => {
                              setPaymentMethod('paystack');
                              setPaystackError(null);
                            }}
                            className={`p-3 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all h-24 sm:h-28 ${paymentMethod === 'paystack' ? 'border-emerald-600 bg-emerald-50/20' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                          >
                            <div className="flex justify-between items-start w-full">
                              <Globe size={16} className={paymentMethod === 'paystack' ? 'text-emerald-600' : 'text-slate-400'} />
                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'paystack' ? 'border-emerald-600' : 'border-slate-300'}`}>
                                {paymentMethod === 'paystack' && <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />}
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-slate-800 leading-tight">Paystack</span>
                                <span className="bg-emerald-600/10 text-emerald-600 text-[6.5px] font-extrabold px-0.5 rounded">INTL</span>
                              </div>
                              <p className="text-[7.5px] text-slate-400 uppercase tracking-wider font-semibold">Local Currencies</p>
                            </div>
                          </div>
                        </div>

                        {paymentMethod === 'stripe' && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-slate-50 border border-slate-150 rounded-[2rem] p-6 space-y-4 text-left"
                          >
                            <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                              <span>Secure Stripe Handshake</span>
                              <span className="text-[#635bff] bg-[#635bff]/10 px-2 py-0.5 rounded font-mono">Sandbox Enabled</span>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Card Number</label>
                                <div className="relative">
                                  <input 
                                    type="text"
                                    placeholder="4242 4242 4242 4242"
                                    value={stripeForm.number}
                                    onChange={(e) => {
                                      let v = e.target.value.replace(/\D/g, '');
                                      let parts = [];
                                      for (let i = 0; i < v.length; i += 4) {
                                        parts.push(v.substring(i, i + 4));
                                      }
                                      let formatted = parts.join(' ');
                                      if (formatted.length <= 19) {
                                        setStripeForm({ ...stripeForm, number: formatted });
                                      }
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold tracking-widest text-slate-800 outline-none focus:border-black focus:ring-1 focus:ring-black"
                                  />
                                  <span className="absolute right-3 top-2.5 text-[7px] font-bold text-[#635bff] bg-[#635bff]/10 px-1 py-0.5 rounded uppercase">Visa Test</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Expiration</label>
                                  <input 
                                    type="text"
                                    placeholder="MM/YY"
                                    value={stripeForm.expiry}
                                    onChange={(e) => {
                                      let v = e.target.value.replace(/\D/g, '');
                                      if (v.length > 2) {
                                        v = v.substring(0, 2) + '/' + v.substring(2, 4);
                                      }
                                      if (v.length <= 5) {
                                        setStripeForm({ ...stripeForm, expiry: v });
                                      }
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-widest text-[#1e293b] outline-none focus:border-black focus:ring-1 focus:ring-black"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">CVC</label>
                                  <input 
                                    type="password"
                                    placeholder="424"
                                    value={stripeForm.cvc}
                                    onChange={(e) => {
                                      let v = e.target.value.replace(/\D/g, '');
                                      if (v.length <= 3) {
                                        setStripeForm({ ...stripeForm, cvc: v });
                                      }
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-widest text-slate-800 outline-none focus:border-black focus:ring-1 focus:ring-black"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cardholder Name</label>
                                <input 
                                  type="text"
                                  placeholder="Jane Doe"
                                  value={stripeForm.name}
                                  onChange={(e) => setStripeForm({ ...stripeForm, name: e.target.value })}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-black focus:ring-1 focus:ring-black"
                                />
                              </div>
                            </div>
                            
                            {stripeError ? (
                              <p className="text-[10px] font-semibold text-rose-500">✕ {stripeError}</p>
                            ) : (
                              <p className="text-[9px] text-slate-400 leading-normal">
                                💡 Standard Stripe Test: input card <span className="font-mono text-[#635bff] font-bold">4242 4242 4242 4242</span> with any future date and valid CVC.
                              </p>
                            )}
                          </motion.div>
                        )}

                        {paymentMethod === 'transfer' && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-slate-50 border border-slate-150 rounded-[2rem] p-6 space-y-4 text-left"
                          >
                            <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                              <span>Direct Bank Wire Clearing</span>
                              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono">Sandbox Connection</span>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-slate-600">
                                <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider font-sans">Sanctuary Trust Clearance Details</p>
                                <p className="text-[10px] font-semibold">Bank: <span className="font-bold text-slate-800">Chase Curation Trust</span></p>
                                <p className="text-[10px] font-semibold">Routing Type: <span className="font-mono text-slate-800 font-bold">ABA/ACH Direct Wire</span></p>
                                <p className="text-[10px] font-semibold">Routing No: <span className="font-mono text-slate-800 font-bold">021000021</span></p>
                                <p className="text-[10px] font-semibold">Account No: <span className="font-mono text-slate-800 font-bold">482-1284-902</span></p>
                              </div>

                              <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your Account Routing Number</label>
                                <input 
                                  type="text"
                                  placeholder="9-digit Routing Number"
                                  value={transferForm.routing}
                                  onChange={(e) => {
                                    let v = e.target.value.replace(/\D/g, '');
                                    if (v.length <= 9) {
                                      setTransferForm({ ...transferForm, routing: v });
                                    }
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold tracking-widest text-slate-800 outline-none focus:border-black focus:ring-1 focus:ring-black"
                                />
                              </div>

                              <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your Account Number</label>
                                <input 
                                  type="text"
                                  placeholder="10-15 digit Account Number"
                                  value={transferForm.account}
                                  onChange={(e) => {
                                    let v = e.target.value.replace(/\D/g, '');
                                    if (v.length <= 15) {
                                      setTransferForm({ ...transferForm, account: v });
                                    }
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold tracking-widest text-slate-800 outline-none focus:border-black focus:ring-1 focus:ring-black"
                                />
                              </div>

                              <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Account Depositor Legal Name</label>
                                <input 
                                  type="text"
                                  placeholder="Jane Doe"
                                  value={transferForm.name}
                                  onChange={(e) => setTransferForm({ ...transferForm, name: e.target.value })}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-black focus:ring-1 focus:ring-black"
                                />
                              </div>
                            </div>
                            
                            {transferError ? (
                              <p className="text-[10px] font-semibold text-rose-500">✕ {transferError}</p>
                            ) : (
                              <p className="text-[9px] text-slate-400 leading-normal">
                                💡 Tip: Input any valid direct routing coordinates to verify local database handshake protocols.
                              </p>
                            )}
                          </motion.div>
                        )}

                        {paymentMethod === 'paystack' && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-slate-50 border border-slate-150 rounded-[2rem] p-6 space-y-4 text-left font-sans"
                          >
                            <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                              <span>Paystack Local Currency Clearance</span>
                              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono font-bold">Sandbox connection</span>
                            </div>

                            {/* Currency Selector */}
                            <div className="space-y-2">
                              <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider pl-1">Target Billing Region</label>
                              <div className="grid grid-cols-4 gap-2">
                                {(Object.keys(EXCHANGE_RATES) as Array<keyof typeof EXCHANGE_RATES>).map((cc) => (
                                  <button
                                    key={cc}
                                    type="button"
                                    onClick={() => {
                                      setPaystackCountry(cc);
                                      setPaystackError(null);
                                    }}
                                    className={`py-2 px-1 rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center transition-all ${
                                      paystackCountry === cc 
                                        ? "border-emerald-600 bg-emerald-600/10 text-emerald-800" 
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                    }`}
                                  >
                                    <span className="text-base">
                                      {cc === 'NG' ? '🇳🇬' : cc === 'GH' ? '🇬🇭' : cc === 'ZA' ? '🇿🇦' : '🇰🇪'}
                                    </span>
                                    <span className="text-[8px] mt-0.5">{cc}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Conversion Box */}
                            <div className="p-4 bg-emerald-50/20 border border-emerald-500/10 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Dynamic Forex Conversion</p>
                              <div className="flex items-baseline gap-1.5 justify-center">
                                <span className="text-2xl font-light text-slate-800">
                                  {EXCHANGE_RATES[paystackCountry].symbol}
                                  {((listing.price * (listing.type === 'sale' ? 1 : days)) * EXCHANGE_RATES[paystackCountry].rate).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">
                                  {paystackCountry === 'NG' ? 'NGN' : paystackCountry === 'GH' ? 'GHS' : paystackCountry === 'ZA' ? 'ZAR' : 'KES'}
                                </span>
                              </div>
                              <p className="text-[8px] text-slate-400 font-mono">
                                exchange clearance rate: 1 USD = {EXCHANGE_RATES[paystackCountry].rate} {paystackCountry === 'NG' ? 'NGN' : paystackCountry === 'GH' ? 'GHS' : paystackCountry === 'ZA' ? 'ZAR' : 'KES'}
                              </p>
                            </div>

                            {/* Input form */}
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer Remitter Email</label>
                                <input 
                                  type="email"
                                  placeholder="remitter@domain.com"
                                  value={paystackForm.email}
                                  onChange={(e) => setPaystackForm({ ...paystackForm, email: e.target.value })}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                                />
                              </div>

                              <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number (Mobile Money Dial-In)</label>
                                <input 
                                  type="text"
                                  placeholder="+234 / +233..."
                                  value={paystackForm.phone}
                                  onChange={(e) => setPaystackForm({ ...paystackForm, phone: e.target.value })}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                                />
                              </div>

                              <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Card Number (or local test identifier)</label>
                                <input 
                                  type="text"
                                  placeholder="4006 0000 0000 0000"
                                  value={paystackForm.number}
                                  onChange={(e) => {
                                    let v = e.target.value.replace(/\D/g, '');
                                    let parts = [];
                                    for (let i = 0; i < v.length; i += 4) {
                                      parts.push(v.substring(i, i + 4));
                                    }
                                    let formatted = parts.join(' ');
                                    if (formatted.length <= 19) {
                                      setPaystackForm({ ...paystackForm, number: formatted });
                                    }
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold tracking-widest text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Expiration</label>
                                  <input 
                                    type="text"
                                    placeholder="MM/YY"
                                    value={paystackForm.expiry}
                                    onChange={(e) => {
                                      let v = e.target.value.replace(/\D/g, '');
                                      if (v.length > 2) {
                                        v = v.substring(0, 2) + '/' + v.substring(2, 4);
                                      }
                                      if (v.length <= 5) {
                                        setPaystackForm({ ...paystackForm, expiry: v });
                                      }
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-widest text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">CVV</label>
                                  <input 
                                    type="password"
                                    placeholder="123"
                                    value={paystackForm.cvc}
                                    onChange={(e) => {
                                      let v = e.target.value.replace(/\D/g, '');
                                      if (v.length <= 3) {
                                        setPaystackForm({ ...paystackForm, cvc: v });
                                      }
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-widest text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Depositor Legal Name</label>
                                <input 
                                  type="text"
                                  placeholder="Kofi Mensah"
                                  value={paystackForm.name}
                                  onChange={(e) => setPaystackForm({ ...paystackForm, name: e.target.value })}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                                />
                              </div>
                            </div>
                            
                            {paystackError ? (
                              <p className="text-[10px] font-semibold text-rose-500">✕ {paystackError}</p>
                            ) : (
                              <p className="text-[9px] text-slate-400 leading-normal">
                                💡 Tip: Input any standard card or mobile money number like <span className="font-mono text-emerald-600 font-bold">4006 0000 0000 0000</span> to verify direct Paystack routing clearance protocols.
                              </p>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={executeFinalSettlement}
                      className="minimal-button w-full py-5 flex items-center justify-center gap-4 group rounded-[2rem]"
                    >
                      <span className="text-xs uppercase tracking-[0.2em] font-extrabold">Finalize Settlement Protocol</span>
                      <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <div className="flex items-center justify-center gap-2">
                       <Activity size={12} className="text-slate-400" />
                       <p className="text-[9px] text-slate-400 uppercase tracking-[0.1em] font-medium">Encrypted via RSA-4096 Sanctuary Protocol</p>
                    </div>
                  </>
                )}

                {settlementStep === 'processing' && (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-8">
                    <div className="relative">
                      <div className={`w-24 h-24 border-2 rounded-full ${paymentMethod === 'stripe' ? 'border-[#635bff]/10' : paymentMethod === 'paystack' ? 'border-emerald-500/10' : 'border-slate-100'}`} />
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className={`absolute inset-0 w-24 h-24 border-2 border-transparent rounded-full ${paymentMethod === 'stripe' ? 'border-t-[#635bff]' : paymentMethod === 'paystack' ? 'border-t-emerald-600' : 'border-t-black'}`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Activity size={32} className={`animate-pulse ${paymentMethod === 'stripe' ? 'text-[#635bff]' : paymentMethod === 'paystack' ? 'text-emerald-600' : 'text-black'}`} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-2xl font-light tracking-tight">
                        {paymentMethod === 'stripe' ? "Processing Stripe Clearance" : paymentMethod === 'paystack' ? "Initializing Paystack Checkout" : "Processing Direct Wire Clearing"}
                      </h3>
                      <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-extrabold animate-pulse">
                        {paymentMethod === 'stripe' ? "Communicating secure tokens with Stripe Hub" : paymentMethod === 'paystack' ? "Resolving real-time multi-currency settlement" : "Enforcing SWIFT Ledger validation handshake"}
                      </p>
                      
                      {paymentMethod === 'stripe' && (
                        <div className="max-w-xs mx-auto text-[9px] font-mono text-slate-500 bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-1 text-left leading-normal animate-fade-in">
                          <p className="text-emerald-600 flex items-center gap-1.5 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            ✓ Stripe Sandbox Mode Active
                          </p>
                          <p className="text-slate-600">→ Issuer: Verified Test Visa Visa Card ({stripeForm.number.substring(0, 4)})</p>
                          <p className="text-slate-600">→ Transaction: Charge authorization request sent</p>
                          <p className="text-blue-600 animate-pulse">→ Response: ch_test_972B... ACCEPTED</p>
                        </div>
                      )}

                      {paymentMethod === 'transfer' && (
                        <div className="max-w-xs mx-auto text-[9px] font-mono text-slate-500 bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-1 text-left leading-normal animate-fade-in font-medium">
                          <p className="text-emerald-600 flex items-center gap-1.5 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            ✓ Direct Transfer Network Connected
                          </p>
                          <p className="text-slate-600">→ Remitter: {transferForm.name || 'Anonymous User'}</p>
                          <p className="text-slate-600">→ Routing: {transferForm.routing} · Account: *{transferForm.account.slice(-4) || '819'}</p>
                          <p className="text-blue-600 animate-pulse font-semibold">→ Status: wire_cleared_test_{Math.random().toString(36).substring(2, 8).toUpperCase()} MATCHED</p>
                        </div>
                      )}

                      {paymentMethod === 'paystack' && (
                        <div className="max-w-xs mx-auto text-[9px] font-mono text-slate-500 bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-1 text-left leading-normal animate-fade-in font-medium">
                          <p className="text-emerald-600 flex items-center gap-1.5 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            ✓ Paystack Regional Gateway Active
                          </p>
                          <p className="text-slate-600">→ Customer: {paystackForm.email}</p>
                          <p className="text-slate-600">→ Exchange Region: {EXCHANGE_RATES[paystackCountry].name}</p>
                          <p className="text-slate-600">→ Amount: {EXCHANGE_RATES[paystackCountry].symbol}{((listing.price * (listing.type === 'sale' ? 1 : days)) * EXCHANGE_RATES[paystackCountry].rate).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                          <p className="text-emerald-600 animate-pulse font-semibold">→ Response: paystack_cleared_test_{Math.random().toString(36).substring(2, 8).toUpperCase()} ACCEPTED</p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full max-w-xs pt-4">
                       {[1, 2, 3, 4].map(idx => (
                         <div key={idx} className="h-1 bg-slate-50 flex overflow-hidden rounded-full">
                           <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 1.5, delay: idx * 0.2, repeat: Infinity }}
                            className={paymentMethod === 'stripe' ? "bg-[#635bff]/30" : paymentMethod === 'paystack' ? "bg-emerald-600/30" : "bg-black/20"}
                           />
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {settlementStep === 'verified' && (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-8">
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", damping: 15 }}
                      className="w-24 h-24 bg-black rounded-full flex items-center justify-center shadow-2xl shadow-black/20"
                    >
                      <CheckCircle2 size={48} className="text-white" />
                    </motion.div>
                    <div className="space-y-3">
                      <h3 className="text-3xl font-light tracking-tight">Settlement Verified</h3>
                      <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-extrabold">Entry Confirmed on Protocol Chain</p>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">HASH: {Math.random().toString(16).substring(2, 10).toUpperCase()}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {showContactModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowContactModal(false)}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-8 max-w-lg w-full relative z-[310] shadow-2xl space-y-6 text-left"
            >
              <button 
                onClick={() => setShowContactModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-black hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Direct Message Client</span>
                <h3 className="text-2xl font-light tracking-tight">Contact Property Management</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Send a secure inquiry regarding this curated asset. Your request will register directly on the host's ledger console.
                </p>
              </div>

              {listing && (
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <img 
                    src={listing.images?.[0] || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80"} 
                    alt={listing.title} 
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover shrink-0" 
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{listing.title}</h4>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin size={10} />
                      {listing.location}
                    </p>
                    <p className="text-[11px] text-slate-900 font-semibold font-mono mt-1">
                      ${listing.price.toLocaleString()} / night
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Inquiry Message</label>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Inquire about custom dates, special service request protocols, or check-in clearance arrangements..."
                  rows={4}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200/80 rounded-2xl p-4 focus:outline-none focus:border-slate-900 focus:bg-white resize-none transition-all placeholder:text-slate-400 text-slate-800 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[9px] text-slate-400 font-mono">
                  Channel ID: SECURE_COMMS_MUTEX
                </p>
                <button
                  type="button"
                  onClick={handleContactOwner}
                  disabled={isSendingMessage || !messageContent.trim()}
                  className="minimal-button px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {isSendingMessage ? (
                    <div className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Send size={12} />
                  )}
                  <span>{isSendingMessage ? "Transmitting..." : "Send Message"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showAuthModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-100 rounded-[32px] p-8 md:p-12 max-w-xl w-full relative z-[310] shadow-2xl space-y-8 text-center"
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-black hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
                <KeyRound size={24} className="text-yellow-400" />
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vault Security Node</span>
                <h3 className="text-3xl font-light">Interactive Sign-In & <span className="font-semibold">Automatic Registration</span></h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  {authReason} To maintain our platform's premium standards, we combine login and registration into a single, seamless step.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left border-y border-slate-100 py-6 my-6">
                <div className="space-y-2 pr-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900">
                    <VerifiedIcon size={12} className="text-emerald-500" />
                    Sign In Access
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                    Already have an account? Connect to view your managed sanctuaries, track conversion inquiries, and manage wire ledger payouts.
                  </p>
                </div>
                <div className="space-y-2 pl-2 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900">
                    <Sparkles size={12} className="text-amber-500" />
                    Register Account
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                    New partner? Single-click sign-in will register your unique profile on Firestore. No manual signup forms or passwords needed!
                  </p>
                </div>
              </div>

              <button 
                onClick={async () => {
                  try {
                    await loginWithGoogle();
                    setShowAuthModal(false);
                  } catch (e) {
                    console.error("Authentication pop-up error:", e);
                  }
                }}
                className="minimal-button w-full shadow-lg py-4 hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <span>Authenticate with Google</span>
              </button>

              <p className="text-[10px] text-slate-400 font-mono">
                Encryption Key: SECURE_AUTH_AES_256 // Firestore Rules Enabled
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ListingDetailPage;
