import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Phone, MapPin, Send, CheckCircle2, Shield, Loader2, ArrowRight, MessageSquare, Building2, CreditCard } from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  createdAtDate: Date;
  status: string;
}

const ContactPage = () => {
  const user = auth.currentUser;
  
  const [formData, setFormData] = useState({
    name: user?.displayName || "",
    email: user?.email || "",
    category: "GENERAL_INQUIRY",
    subject: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pastSubmissions, setPastSubmissions] = useState<ContactSubmission[]>([]);
  const [fetchingPast, setFetchingPast] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.displayName || "",
        email: user.email || ""
      }));
      fetchSubmissions();
    }
  }, [user]);

  const fetchSubmissions = async () => {
    if (!user) return;
    setFetchingPast(true);
    try {
      const q = query(
        collection(db, "contact_submissions"),
        where("userId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || "",
          email: data.email || "",
          category: data.category || "GENERAL_INQUIRY",
          subject: data.subject || "",
          message: data.message || "",
          createdAtDate: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
          status: data.status || "PENDING_CONCIERGE"
        } as ContactSubmission;
      });
      list.sort((a, b) => b.createdAtDate.getTime() - a.createdAtDate.getTime());
      setPastSubmissions(list);
    } catch (err) {
      console.error("Error fetching contact queries:", err);
      handleFirestoreError(err, OperationType.LIST, "contact_submissions");
    } finally {
      setFetchingPast(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      alert("Verification Error: Please populate all fields to submit secure transmission.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        category: formData.category,
        subject: formData.subject,
        message: formData.message,
        userId: user ? user.uid : "ANONYMOUS",
        status: "PENDING_CONCIERGE",
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "contact_submissions"), payload);
      setSuccess(true);
      setFormData(prev => ({ ...prev, subject: "", message: "" }));
      if (user) {
        fetchSubmissions();
      }
    } catch (err) {
      console.error("Transmission error:", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, "contact_submissions");
      } catch (e) {
        alert("Secure link failed to establish. Please check connection and retry.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case "HOST_APPLICATION":
        return { label: "Host Partnership", color: "text-amber-600 bg-amber-50 border-amber-150" };
      case "FINANCIAL_LEDGER":
        return { label: "Financial / Ledger", color: "text-emerald-600 bg-emerald-50 border-emerald-150" };
      case "TRUST_SAFETY":
        return { label: "Trust & lock-deed", color: "text-rose-600 bg-rose-50 border-rose-150" };
      default:
        return { label: "General Concierge", color: "text-blue-600 bg-blue-50 border-blue-150" };
    }
  };

  return (
    <div className="pt-32 pb-40 bg-slate-50/50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        
        {/* Decorative Grid Accent */}
        <div className="mb-12 space-y-4">
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">LUXESTAY CLEARANCES & TRUST</span>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-slate-900 leading-tight">
            How Can We Assist Your <span className="font-serif italic font-bold">Stay Experience</span>?
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            Connect directly with our elite global operations department. Register a secure tracking transmission regarding financial ledgers, lock-deed clearances, or hosting portfolio management.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mt-8">
          
          {/* Submission Panel */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {!success ? (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-white border border-slate-200/60 rounded-[32px] p-8 md:p-10 shadow-sm"
                >
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Your Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="e.g. Richard Hendricks"
                          className="w-full text-xs font-semibold bg-slate-50 border border-slate-200/80 rounded-2xl p-4 focus:outline-none focus:border-slate-900 focus:bg-white transition-all text-slate-800"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Secure Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="your.email@luxestay.com"
                          className="w-full text-xs font-semibold bg-slate-50 border border-slate-200/80 rounded-2xl p-4 focus:outline-none focus:border-slate-900 focus:bg-white transition-all text-slate-800"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Select Assistance protocol</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200/80 rounded-2xl p-4 focus:outline-none focus:border-slate-900 focus:bg-white transition-all text-slate-800 appearance-none cursor-pointer"
                      >
                        <option value="GENERAL_INQUIRY">General Concierge / Support</option>
                        <option value="HOST_APPLICATION">Real Estate / Host Partnership Audit</option>
                        <option value="FINANCIAL_LEDGER">Inbound Wire / Settlement Clearance Inquiry</option>
                        <option value="TRUST_SAFETY">Key-vault Lock Protocols & Integrity Issues</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Subject Brief</label>
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder="Inquire about custom deposit clearance, bank wires etc."
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200/80 rounded-2xl p-4 focus:outline-none focus:border-slate-900 focus:bg-white transition-all text-slate-800"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Details & Context</label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder="Detail any dates, transaction IDs, property codes, or procedural support you require..."
                        rows={5}
                        className="w-full text-xs font-medium bg-slate-50 border border-slate-200/80 rounded-2xl p-4 focus:outline-none focus:border-slate-900 focus:bg-white resize-none transition-all placeholder:text-slate-400 text-slate-800 leading-relaxed"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-mono">
                        <Shield size={12} className="text-slate-400" />
                        <span>256-bit Encrypted Protocol</span>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="minimal-button px-8 py-4 rounded-2xl cursor-pointer disabled:opacity-40"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="animate-spin" size={12} />
                            <span>Transmitting...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Send size={12} />
                            <span>Transmit Clearance Ticket</span>
                          </div>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white border border-slate-200/60 rounded-[32px] p-10 md:p-12 text-center space-y-8 shadow-sm"
                >
                  <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-slate-950/10">
                    <CheckCircle2 size={32} />
                  </div>
                  <div className="space-y-2 max-w-sm mx-auto">
                    <h2 className="text-2xl font-light">Transmission <span className="font-semibold text-black">Secured</span></h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Your clearance ticket has registered on our main systems under encrypted state. The Operations team responds to priority audits in less than 2 hours.
                    </p>
                  </div>
                  
                  <div className="py-2">
                    <button 
                      onClick={() => setSuccess(false)}
                      className="text-xs font-medium tracking-wide uppercase px-6 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Submit Another Query
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Core Support Info */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Quick Contact Desk card */}
            <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 md:p-8 space-y-6">
              <h3 className="text-lg font-semibold border-b border-slate-50 pb-4">Operations Headquarters</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100/50 text-slate-500 flex-shrink-0">
                    <Mail size={16} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Direct Comms Network</h4>
                    <p className="text-xs font-semibold text-slate-800 mt-1">operations@luxestay.estate</p>
                    <p className="text-[10px] text-slate-450 mt-0.5">Secure ledger inquiries & manual validation</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100/50 text-slate-500 flex-shrink-0">
                    <Phone size={16} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Secured Hotline</h4>
                    <p className="text-xs font-semibold text-slate-800 mt-1">+1 (800) LUX-STAY</p>
                    <p className="text-[10px] text-slate-455 mt-0.5">Automated queue for accredited key holders</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100/50 text-slate-500 flex-shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Corporate Node</h4>
                    <p className="text-xs font-semibold text-slate-800 mt-1">Bahnhofstrasse 45, Zürich, CH</p>
                    <p className="text-[10px] text-slate-450 mt-0.5">LuxeStay AG Operations & Settlement Registry</p>
                  </div>
                </div>
              </div>
            </div>

            {/* SLA Protocols card */}
            <div className="bg-slate-900 text-slate-200 rounded-[32px] p-6 md:p-8 space-y-4 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex items-center gap-2 text-white bg-white/10 border border-white/10 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider w-fit">
                <Shield size={10} />
                <span>Our SLA Guarantee</span>
              </div>
              <p className="text-sm font-light text-slate-100 leading-relaxed font-serif italic">
                "Operational excellence dictates immediate feedback. Ledger lockups are verified within 15 minutes of dynamic registration, while wire assets clear within 1 standard auditing cycle."
              </p>
              <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[9px] text-slate-400 font-mono uppercase tracking-widest">
                <span>ESTATE SECURITY ASSURANCE</span>
                <span>CH-NODE_01</span>
              </div>
            </div>

          </div>

        </div>

        {/* Dynamic Logged-in Ticket Tracking - Option 2 Execution */}
        {user && (
          <div className="mt-16 pt-16 border-t border-slate-200/50 space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-3 text-slate-900">
              Active Transmission Registry
              <span className="text-[10px] bg-slate-150 border border-slate-200/40 px-2.5 py-1 rounded-full text-slate-500 font-semibold font-mono">
                {pastSubmissions.length} Registered
              </span>
            </h2>

            {fetchingPast ? (
              <div className="h-24 w-full bg-slate-50 animate-pulse rounded-2xl border border-slate-100"></div>
            ) : pastSubmissions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastSubmissions.map((sub) => {
                  const theme = getCategoryTheme(sub.category);
                  return (
                    <div key={sub.id} className="bg-white border border-slate-200/65 rounded-2xl p-5 shadow-sm space-y-4 text-left">
                      <div className="flex justify-between items-start gap-4">
                        <span className={`text-[8px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${theme.color}`}>
                          {theme.label}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {sub.createdAtDate.toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-black line-clamp-1">{sub.subject}</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">{sub.message}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Protocol ID:</span>
                        <span className="text-[9px] text-slate-900 font-semibold font-mono bg-slate-50 border border-slate-100 px-2 py-0.5 rounded truncate max-w-[120px]">
                          {sub.id}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border border-dashed border-slate-200 rounded-[2rem] p-12 text-center max-w-lg mx-auto space-y-3">
                <MessageSquare className="mx-auto text-slate-300" size={32} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Secure Transmission Log Is Empty</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Clearance tickets you submit directly register above in real-time. Use the form above to lock in your priority concierge audits.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default ContactPage;
