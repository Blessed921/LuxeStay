import { useState, useRef, useEffect } from "react";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ImagePlus, MapPin, DollarSign, Info, CheckCircle2, Loader2, X, Plus, ShieldCheck, Users, ClipboardList, Check, Trash2, ShieldAlert, KeyRound, ShieldCheck as VerifiedIcon, Sparkles } from "lucide-react";
import { db, auth, loginWithGoogle, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, updateDoc, doc, query, where, orderBy } from "firebase/firestore";
import { Link } from "react-router-dom";

const HostPage = ({ userRole }: { userRole?: "client" | "host" | "admin" }) => {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDismissibleBanner, setShowDismissibleBanner] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
      if (u) {
        setShowAuthModal(false); // Auto-dismiss modal on successful login
      }
    });
    return () => unsub();
  }, []);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    price: "",
    description: "",
    amenities: [] as string[],
    images: [] as string[],
    type: "rental" as "rental" | "sale",
    capacity: "4",
    bedrooms: "2",
    bathrooms: "2",
    surface: "1200"
  });

  // Admin Curation and System Promotion states
  const [adminTab, setAdminTab] = useState<'submissions' | 'users'>('submissions');
  const [pendingListings, setPendingListings] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [adminCurationLoading, setAdminCurationLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Email based promotion input
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [promotionMessage, setPromotionMessage] = useState({ text: "", type: "success" as "success" | "error" });

  const fetchCurationQueue = async () => {
    if (userRole !== "admin") return;
    setAdminCurationLoading(true);
    try {
      // 1. Fetch properties awaiting audit review
      const q = query(collection(db, "listings"), where("status", "==", "pending_approval"));
      const snap = await getDocs(q);
      const docsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingListings(docsList);

      // 2. Fetch full registered users list
      const uSnap = await getDocs(collection(db, "users"));
      const usersList = uSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegisteredUsers(usersList);
    } catch (err) {
      console.error("Failed to execute curation data sync:", err);
    } finally {
      setAdminCurationLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === "admin") {
      fetchCurationQueue();
    }
  }, [userRole]);

  const handleApproveListing = async (listingId: string, ownerId: string) => {
    setActionInProgress(listingId);
    try {
      // Approve property status
      const listingRef = doc(db, "listings", listingId);
      await updateDoc(listingRef, { status: "active" });

      // Promote client to host status automatically
      if (ownerId) {
        const userRef = doc(db, "users", ownerId);
        await updateDoc(userRef, { role: "host" });
      }

      await fetchCurationQueue();
    } catch (err) {
      console.error("Curation approval execution error:", err);
      alert("Verification write failed. Please check backend integration.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectListing = async (listingId: string) => {
    setActionInProgress(listingId);
    try {
      const listingRef = doc(db, "listings", listingId);
      await updateDoc(listingRef, { status: "rejected" });
      await fetchCurationQueue();
    } catch (err) {
      console.error("Curation rejection execution error:", err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handlePromoteUser = async (targetUserId: string, targetRole: 'host' | 'admin' | 'client') => {
    setActionInProgress(targetUserId);
    try {
      const userRef = doc(db, "users", targetUserId);
      await updateDoc(userRef, { role: targetRole });
      await fetchCurationQueue();
    } catch (err) {
      console.error("Operational user promotion write error:", err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handlePromoteByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    setPromotionMessage({ text: "", type: "success" });
    try {
      const q = query(collection(db, "users"), where("email", "==", newAdminEmail.trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setPromotionMessage({ text: "No user directory file matched that email.", type: "error" });
        return;
      }
      
      const targetDoc = snap.docs[0];
      await updateDoc(doc(db, "users", targetDoc.id), { role: "admin" });
      
      setPromotionMessage({ text: `Prestige admin privileges successfully granted to ${newAdminEmail.trim()}`, type: "success" });
      setNewAdminEmail("");
      await fetchCurationQueue();
    } catch (err) {
      console.error("Promote by email error:", err);
      setPromotionMessage({ text: "Operational error updating security privilege block.", type: "error" });
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const amenitiesOptions = ["Wifi", "Parking", "Kitchen", "Pool", "Gym", "AC", "TV", "Security"];

  const handleToggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity) 
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: any) => {
      if (!file.type.startsWith('image/')) return;
      
      // Check file size (limit to ~500KB per image for base64 safety)
      if (file.size > 500000) {
        alert(`Image "${file.name}" is too large. Please use images smaller than 500KB for the initial curation review.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => {
          // Check if this image already exists to prevent duplicates
          if (prev.images.includes(reader.result as string)) return prev;
          
          return {
            ...prev,
            images: [...prev.images, reader.result as string].slice(0, 8) // Limit to 8 images
          };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) {
      setShowAuthModal(true);
      return;
    }

    if (formData.title.length < 5) {
      alert("Property title must be at least 5 characters long.");
      return;
    }

    if (formData.images.length === 0) {
      alert("Please upload at least one image of your sanctuary.");
      return;
    }

    // Estimate total payload size (Firestore limit is 1MB)
    const estimatedSize = JSON.stringify(formData).length;
    if (estimatedSize > 800000) { // 800KB safety margin
      alert("The total size of your images and description exceeds the limit. Please remove some images or use smaller files.");
      return;
    }

    setLoading(true);
    try {
      if (!auth.currentUser) throw new Error("User must be logged in");

      const listingData = {
        title: formData.title.trim(),
        location: formData.location.trim(),
        price: Number(formData.price),
        description: formData.description.trim(),
        amenities: formData.amenities,
        ownerId: auth.currentUser.uid,
        ownerEmail: auth.currentUser.email,
        createdAt: serverTimestamp(),
        images: formData.images, 
        rating: 5.0,
        reviewsCount: 0,
        status: "pending_approval",
        type: formData.type,
        capacity: Number(formData.capacity),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        surface: formData.surface ? `${Number(formData.surface).toLocaleString()} sqft` : "1,200 sqft"
      };

      console.log("Publishing protocol initiated...");
      
      const docRef = await addDoc(collection(db, "listings"), listingData);
      console.log("Protocol successful. ID:", docRef.id);
      
      setCreatedListingId(docRef.id);
      setStep(4);
    } catch (error: any) {
      console.error("Submission Failure:", error);
      let errorMessage = "Our curation servers are momentarily unresponsive.";
      
      if (error.code === 'permission-denied') {
        errorMessage = "Security protocol rejected the write. Ensure all fields meet the prestige standards.";
      } else if (error.message && error.message.includes("too large")) {
        errorMessage = "The transmission packet is too large. Please reduce image quantity or quality.";
      } else if (error.message) {
        errorMessage = `Operational Error: ${error.message}`;
      }
      
      alert(errorMessage);
      handleFirestoreError(error, OperationType.CREATE, "listings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-32 pb-40 bg-canvas min-h-screen">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* On-Screen Premium Auth & Registration Modal */}
        <AnimatePresence>
          {showAuthModal && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
              {/* Blur backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAuthModal(false)}
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
              />
              
              {/* Core Sheet Container */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white border border-slate-100 rounded-[32px] p-8 md:p-12 max-w-xl w-full relative z-[310] shadow-2xl space-y-8 text-center"
              >
                {/* Custom absolute close trigger */}
                <button 
                  onClick={() => setShowAuthModal(false)}
                  className="absolute top-6 right-6 p-2 text-slate-400 hover:text-black hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>

                {/* Aesthetic Icon Box */}
                <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
                  <KeyRound size={24} className="text-yellow-400" />
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vault Security Node</span>
                  <h3 className="text-3xl font-light">Interactive Sign-In & <span className="font-semibold">Automatic Registration</span></h3>
                  <p className="text-xs text-slate-550 max-w-sm mx-auto leading-relaxed">
                    To maintain our platform's ultra-premium curation standards, we combine login and registration into a single, seamless step.
                  </p>
                </div>

                {/* Dual Path Informative Blocks */}
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

                {/* Single Premium Action */}
                <button 
                  onClick={async () => {
                    try {
                      await loginWithGoogle();
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

        {!currentUser && showDismissibleBanner && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 rounded-2xl bg-[#0f172a] text-white border border-slate-800 flex items-start justify-between gap-4 shadow-xl text-left"
          >
            <div className="flex gap-4 items-start">
              <div className="p-2.5 bg-slate-800 rounded-xl text-yellow-400 flex-shrink-0">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300">Secure Guest Session</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  LuxeStay requires an authenticated secure session to log properties. Clicking 
                  <span className="text-yellow-400 font-semibold cursor-pointer underline hover:text-yellow-300 mx-1" onClick={() => setShowAuthModal(true)}>Sign In / Register</span>
                  will automatically log in or register your prestige profile with Google instantly. No password or separate sign-up form required.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowDismissibleBanner(false)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer flex-shrink-0"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
        
        {userRole === "admin" && (
          <div className="mb-16 bg-slate-900 text-white rounded-3xl p-8 md:p-10 shadow-2xl border border-slate-800 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/85 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-emerald-400" size={20} />
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Prestige Systems Management</span>
                </div>
                <h2 className="text-3xl font-light mt-1">LuxeStay Administration</h2>
              </div>
              <div className="flex p-1 bg-slate-950 rounded-xl">
                <button
                  onClick={() => setAdminTab('submissions')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${adminTab === 'submissions' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}
                >
                  <ClipboardList size={14} />
                  Auditing ({pendingListings.length})
                </button>
                <button
                  onClick={() => setAdminTab('users')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${adminTab === 'users' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}
                >
                  <Users size={14} />
                  Accounts ({registeredUsers.length})
                </button>
              </div>
            </div>

            {adminTab === 'submissions' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Pending Residence Audits</h3>
                  <button onClick={fetchCurationQueue} className="text-[10px] text-slate-500 hover:text-white uppercase tracking-wider">↻ Sync Telemetry</button>
                </div>

                {adminCurationLoading ? (
                  <div className="flex items-center justify-center py-12 gap-3">
                    <Loader2 size={20} className="animate-spin text-slate-400" />
                    <p className="text-xs text-slate-400 font-mono">Loading data feeds...</p>
                  </div>
                ) : pendingListings.length === 0 ? (
                  <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-8 text-center">
                    <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
                    <p className="text-xs text-slate-400 font-medium">All pending residences processed. Audit queue empty.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {pendingListings.map((listing) => (
                      <div key={listing.id} className="bg-slate-950/50 border border-slate-850 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-6 transition-all hover:border-slate-750">
                        <div className="flex gap-4">
                          {listing.images && listing.images[0] ? (
                            <img referrerPolicy="no-referrer" src={listing.images[0]} alt={listing.title} className="w-20 h-20 object-cover rounded-xl bg-slate-800 border border-slate-800" />
                          ) : (
                            <div className="w-20 h-20 bg-slate-850 rounded-xl flex items-center justify-center text-[10px] text-slate-500">No Image</div>
                          )}
                          <div>
                            <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded uppercase font-bold tracking-widest">Awaiting curation</span>
                            <h4 className="text-lg font-medium mt-1">{listing.title}</h4>
                            <p className="text-xs text-slate-350 flex items-center gap-1 mt-0.5">
                              <MapPin size={12} /> {listing.location}
                            </p>
                            <p className="text-xs font-mono text-emerald-400 font-bold mt-1.5">${(listing.price || 0).toLocaleString()} <span className="text-[10px] text-slate-500">/ stay</span></p>
                            <div className="mt-2 text-[10px] text-slate-500">
                              <span className="font-mono text-slate-400">Owner email: </span>{listing.ownerEmail || 'Unknown'}
                            </div>
                          </div>
                        </div>

                        <div className="flex md:flex-col justify-end gap-2.5 min-w-[140px]">
                          <button
                            disabled={actionInProgress !== null}
                            onClick={() => handleApproveListing(listing.id, listing.ownerId)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                          >
                            {actionInProgress === listing.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            Approve & Host
                          </button>
                          <button
                            disabled={actionInProgress !== null}
                            onClick={() => handleRejectListing(listing.id)}
                            className="border border-red-500/30 hover:border-red-500 text-red-400 hover:text-white hover:bg-red-500/10 font-bold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                          >
                            <Trash2 size={12} />
                            Decline Listing
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Email based designation */}
                <form onSubmit={handlePromoteByEmail} className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Designate Premium Administrator</h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Directly elevate any registered member of LuxeStay to full administrative capabilities under the security rules.</p>
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="email"
                      required
                      placeholder="Enter registered account email address"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="bg-slate-900 border border-slate-850 rounded-xl px-4 py-3 text-xs w-full focus:outline-none focus:border-slate-700 font-mono"
                    />
                    <button
                      type="submit"
                      className="bg-white text-black text-[10px] font-extrabold uppercase tracking-widest px-6 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Authorize Admin
                    </button>
                  </div>
                  {promotionMessage.text && (
                    <p className={`text-[11px] font-bold ${promotionMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {promotionMessage.text}
                    </p>
                  )}
                </form>

                {/* Registered user records table */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Active System Accounts</h3>
                    <button onClick={fetchCurationQueue} className="text-[10px] text-slate-500 hover:text-white uppercase tracking-wider">↻ Sync Accounts</button>
                  </div>

                  <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
                      {registeredUsers.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-6 text-center">No system user documents identified.</p>
                      ) : (
                        registeredUsers.map((usr) => (
                          <div key={usr.id} className="flex justify-between items-center p-4 gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs uppercase text-slate-300">
                                {usr.displayName ? usr.displayName.charAt(0) : 'U'}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold">{usr.displayName || 'Luxe Stay User'}</h4>
                                <p className="text-[10px] text-slate-400 font-mono">{usr.email}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`text-[8px] px-2 py-0.5 rounded font-extrabold uppercase tracking-widest border ${usr.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : usr.role === 'host' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                {usr.role || 'client'}
                              </span>

                              {/* Administration switch button */}
                              {usr.role !== 'admin' ? (
                                <button
                                  disabled={actionInProgress !== null}
                                  onClick={() => handlePromoteUser(usr.id, 'admin')}
                                  className="text-[9px] font-bold text-yellow-400 border border-yellow-400/20 hover:border-yellow-400 px-2.5 py-1.5 rounded uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer"
                                >
                                  Make Admin
                                </button>
                              ) : (
                                <button
                                  disabled={actionInProgress !== null}
                                  onClick={() => handlePromoteUser(usr.id, 'client')}
                                  className="text-[9px] font-bold text-red-400 border border-red-400/20 hover:border-red-400 px-2.5 py-1.5 rounded uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer"
                                >
                                  Revoke Admin
                                </button>
                              )}

                              {/* Host License switch button */}
                              {usr.role === 'client' && (
                                <button
                                  disabled={actionInProgress !== null}
                                  onClick={() => handlePromoteUser(usr.id, 'host')}
                                  className="text-[9px] font-bold text-emerald-400 border border-emerald-400/20 hover:border-emerald-400 px-2.5 py-1.5 rounded uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer"
                                >
                                  Grant Host
                                </button>
                              )}
                              {usr.role === 'host' && (
                                <button
                                  disabled={actionInProgress !== null}
                                  onClick={() => handlePromoteUser(usr.id, 'client')}
                                  className="text-[9px] font-bold text-slate-450 border border-slate-700 hover:border-slate-500 px-2.5 py-1.5 rounded uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer"
                                >
                                  Revoke Host
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mb-16 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400 mb-4">Partnership</p>
          <h1 className="text-5xl font-light mb-6">List Your <span className="font-semibold">Residence</span></h1>
          <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
            Begin your journey as a LuxeStay host. Our curation team will review your application within 48 hours for brand alignment.
          </p>
        </div>

        <div className="minimal-card p-12 md:p-16 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-50">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(step / 4) * 100}%` }}
              className="h-full bg-black"
            />
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="space-y-8">
                  <h2 className="text-2xl font-semibold">Primary Details</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3 block">Property Title</label>
                      <input 
                        type="text" 
                        placeholder="e.g., The Obsidian Penthouse"
                        className="w-full bg-white border border-slate-100 rounded-xl px-6 py-4 focus:border-black outline-none transition-all text-lg font-medium"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3 block">Location</label>
                      <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-6 py-4 focus-within:border-black transition-all">
                        <MapPin size={18} className="text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="City, Country"
                          className="w-full bg-transparent outline-none text-lg font-medium"
                          value={formData.location}
                          onChange={(e) => setFormData({...formData, location: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3 block">Property Description</label>
                      <textarea 
                        placeholder="Describe the experience, the view, and the sanctuary..."
                        className="w-full bg-white border border-slate-100 rounded-xl px-6 py-4 focus:border-black outline-none transition-all text-sm font-medium h-32 resize-none"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      setShowAuthModal(true);
                    } else {
                      setStep(2);
                    }
                  }}
                  className="minimal-button w-full"
                >
                  Continue to Pricing
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="space-y-8">
                  <h2 className="text-2xl font-semibold">Rates, Specs & Sanctuary</h2>
                  <div className="space-y-10">
                    {/* Intention Toggle */}
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3 block">Listing Intention</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, type: 'rental' })}
                          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 ${formData.type === 'rental' ? 'border-black bg-slate-50 shadow-sm' : 'border-slate-100 hover:border-slate-200'}`}
                        >
                          <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-900">Rental Stay</span>
                          <span className="text-xs text-slate-400 mt-1">Guests pay a premium nightly rate to reserve temporary stays.</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, type: 'sale' })}
                          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 ${formData.type === 'sale' ? 'border-black bg-slate-50 shadow-sm' : 'border-slate-100 hover:border-slate-200'}`}
                        >
                          <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-900">Permanent Acquisition</span>
                          <span className="text-xs text-slate-400 mt-1">A one-time ultimate settlement includes full property rights & deed access.</span>
                        </button>
                      </div>
                    </div>

                    {/* Price Input based on selection */}
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3 block">
                        {formData.type === 'rental' ? 'Nightly Rate (USD)' : 'Absolute Acquisition Price (One-Time USD)'}
                      </label>
                      <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3.5 focus-within:border-black transition-all">
                        <span className="text-lg font-semibold text-slate-400">$</span>
                        <input 
                          type="number" 
                          placeholder={formData.type === 'rental' ? "1,200" : "8,500,000"}
                          className="w-full bg-transparent outline-none text-2xl font-light"
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Specifications Grid */}
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3 block">Sanctuary Specifications</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-2">
                          <label className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 block">Guest Capacity</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="50" 
                            className="bg-transparent text-lg font-medium outline-none border-b border-transparent focus:border-slate-200 w-full"
                            value={formData.capacity}
                            onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                          />
                        </div>
                        <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-2">
                          <label className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 block">Bedrooms</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="20" 
                            className="bg-transparent text-lg font-medium outline-none border-b border-transparent focus:border-slate-200 w-full"
                            value={formData.bedrooms}
                            onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                          />
                        </div>
                        <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-2">
                          <label className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 block">Bathrooms</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="20" 
                            className="bg-transparent text-lg font-medium outline-none border-b border-transparent focus:border-slate-200 w-full"
                            value={formData.bathrooms}
                            onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                          />
                        </div>
                        <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-2">
                          <label className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 block">Surface Area (sqft)</label>
                          <input 
                            type="number" 
                            min="10" 
                            className="bg-transparent text-lg font-medium outline-none border-b border-transparent focus:border-slate-200 w-full"
                            value={formData.surface}
                            onChange={(e) => setFormData({...formData, surface: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Amenities Provided */}
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-4 block">Amenities Provided</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {amenitiesOptions.map(opt => (
                          <button 
                            type="button"
                            key={opt}
                            onClick={() => handleToggleAmenity(opt)}
                            className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest border rounded-xl transition-all ${formData.amenities.includes(opt) ? "bg-black text-white border-black" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                   <button type="button" onClick={() => setStep(1)} className="px-8 py-4 border border-slate-100 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all text-slate-500">Back</button>
                   <button 
                    type="button"
                    onClick={() => setStep(3)} 
                    className="minimal-button flex-1"
                   >
                     Continue to Gallery
                   </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="space-y-8">
                  <div className="flex justify-between items-end">
                    <h2 className="text-2xl font-semibold">Visual Gallery</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {formData.images.length} / 8 Images
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden relative group bg-slate-50">
                        <img src={img} className="w-full h-full object-cover" alt="" />
                        <button 
                          onClick={() => removeImage(idx)}
                          className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur shadow-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} className="text-black" />
                        </button>
                        {idx === 0 && (
                          <div className="absolute bottom-2 left-2 bg-black text-white text-[8px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded">
                            Cover
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {formData.images.length < 8 && (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 hover:border-black hover:bg-slate-50 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                          <Plus size={20} />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-black">Add Image</span>
                      </button>
                    )}
                  </div>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  <div className="bg-slate-50 p-6 rounded-2xl flex gap-4 items-start">
                    <Info size={16} className="text-slate-400 mt-1" />
                    <p className="text-xs text-slate-500 leading-relaxed">
                      First image will be used as the sanctuary's primary cover. Use high-resolution interiors or sweeping landscape views for better curation results.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                   <button onClick={() => setStep(2)} className="px-8 py-4 border border-slate-100 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all text-slate-500">Back</button>
                   <button 
                    disabled={loading || formData.images.length === 0}
                    onClick={handleSubmit} 
                    className="minimal-button flex-1 flex items-center justify-center gap-3 disabled:opacity-50"
                   >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? "Publishing..." : "Submit for Curation"}
                   </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center py-10"
              >
                <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-10">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-4xl font-light mb-6">Submitted for Audit</h2>
                <p className="text-sm text-slate-450 max-w-sm mx-auto mb-12 leading-relaxed">
                  Your majestic residence <span className="text-black font-semibold">"{formData.title}"</span> has been logged to the curation ledger. Once reviewed and authorized by our admin crew, your listing will go active and your account will instantly become a Sovereign Host.
                </p>
                <div className="flex flex-col gap-4 max-w-xs mx-auto">
                  <Link 
                    to="/" 
                    className="minimal-button text-center py-4"
                  >
                    Return to Dashboard
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default HostPage;
