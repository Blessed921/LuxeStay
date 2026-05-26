import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Search, MapPin, Calendar, User, LayoutDashboard, LogOut, Menu, X, ArrowRight, Loader2, CreditCard, Building2, CheckCircle2, Shield, ArrowUpRight, Check, DollarSign } from "lucide-react";

const ListingDetailPage = lazy(() => import("./pages/ListingDetailPage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const HostPage = lazy(() => import("./pages/HostPage"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const BookingSuccessPage = lazy(() => import("./pages/BookingSuccessPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
import { auth, loginWithGoogle, logout, db, handleFirestoreError, OperationType, isFirebaseConfigured } from "./lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { MOCK_LISTINGS } from "./constants";

// Navigation Component
const Navbar = ({ 
  user, 
  loading, 
  userRole, 
  setUserRole,
  dbRole
}: { 
  user: FirebaseUser | null; 
  loading: boolean; 
  userRole: "client" | "host" | "admin";
  setUserRole: (role: "client" | "host" | "admin") => void;
  dbRole: "client" | "host" | "admin";
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-white/90 backdrop-blur-md h-20 shadow-sm border-b border-gray-100" : "bg-transparent h-24"}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 h-full flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-black rounded-sm flex items-center justify-center text-white font-bold">L</div>
          <span className="font-semibold tracking-tight text-xl italic uppercase">LuxeStay</span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-10">
          <Link to="/explore" className="text-sm font-medium text-slate-500 hover:text-black transition-colors">Rentals</Link>
          <Link to="/portfolio" className="text-sm font-medium text-slate-500 hover:text-black transition-colors">Portfolios</Link>
          <Link to="/host" className="text-sm font-medium text-slate-500 hover:text-black transition-colors">Hosting</Link>
          <Link to="/contact" className="text-sm font-medium text-slate-500 hover:text-black transition-colors">Contact</Link>
          
          <div className="h-4 w-px bg-slate-200 mx-2"></div>

          {loading ? (
            <div className="w-20 h-8 bg-slate-50 animate-pulse rounded-lg"></div>
          ) : user ? (
            <div className="flex items-center space-x-4">
              <Link to="/profile" className="flex items-center space-x-4 group">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest leading-none">
                    {userRole === "admin" ? "Master Admin" : userRole === "host" ? "Platform Host" : "Elite Member"}
                  </p>
                  <p className="text-sm font-semibold group-hover:text-black">{user.displayName?.split(" ")[0]}</p>
                </div>
                <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                  {user.displayName?.charAt(0) || "U"}
                </div>
              </Link>
              <button 
                onClick={() => logout()}
                className="text-slate-400 hover:text-black cursor-pointer"
                title="Log Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button onClick={() => loginWithGoogle()} className="secondary-button">LOG IN</button>
          )}
        </div>

        <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 bg-white border-b border-gray-100 p-8 flex flex-col space-y-6 md:hidden shadow-xl"
          >
            <Link to="/explore" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium border-b border-gray-50 pb-2">Rentals</Link>
            <Link to="/portfolio" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium border-b border-gray-50 pb-2">Portfolios</Link>
            <Link to="/host" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium border-b border-gray-50 pb-2">Hosting</Link>
            <Link to="/contact" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium border-b border-gray-50 pb-2">Contact</Link>
            {user ? (
               <>
                 <button onClick={() => { logout(); setIsMenuOpen(false); }} className="minimal-button w-full">LOG OUT</button>
               </>
            ) : (
               <button onClick={() => { loginWithGoogle(); setIsMenuOpen(false); }} className="minimal-button w-full">SIGN IN</button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

import AISearch from "./components/AISearch";

// Hero Component
const Hero = () => {
  return (
    <div className="relative min-h-[85vh] h-auto py-16 md:py-0 flex items-center px-6 md:px-12 overflow-hidden bg-gray-50 pt-24 md:pt-20">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-12 relative z-10 text-left">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-light leading-tight tracking-tight mb-4">
              Premium Urban Living <br/>
              <span className="font-semibold text-black">Curated for Professionals</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg max-w-md">
              Integrated booking and automated property management for high-yield real estate portfolios.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <AISearch />
          </motion.div>
        </div>
      </div>
      
      {/* Background Graphic Element */}
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-slate-100/50 -skew-x-12 transform translate-x-1/2"></div>
    </div>
  );
};

// Listings Grid
const ListingsSection = () => {
  return (
    <section className="pt-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400 mb-2">Featured Assets</p>
          <h2 className="text-4xl font-light">Available <span className="font-semibold">Sanctuaries</span></h2>
        </div>
        <Link to="/explore" className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 hover:text-black transition-all flex items-center gap-2">
          View All Listings <ArrowRight size={14} />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {MOCK_LISTINGS.slice(0, 2).map((listing, idx) => (
          <Link 
            key={listing.id}
            to={`/listing/${listing.id}`}
            className="flex flex-col group cursor-pointer minimal-card overflow-hidden"
          >
            <div className="aspect-[16/10] overflow-hidden relative">
              <img 
                src={listing.images[0]} 
                alt={listing.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute top-4 right-4 bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded shadow-sm">
                ${listing.price}/Night
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-medium mb-1">{listing.title}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin size={12} /> {listing.location}
                  </p>
                </div>
                <span className="status-badge">Available</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

// Footer Component
const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-100 py-16 px-6 md:px-12">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
        <div className="max-w-xs">
          <div className="flex items-center space-x-2 mb-6">
            <div className="w-6 h-6 bg-black rounded-sm flex items-center justify-center text-white font-bold text-xs">L</div>
            <span className="font-semibold tracking-tight text-lg italic uppercase">LuxeStay</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Estate management platform optimizing hospitality revenue through curated professional experiences and automated settlements.
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-12 lg:gap-24">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Management</p>
            <nav className="flex flex-col space-y-3">
              <Link to="/portfolio" className="text-xs font-medium text-slate-600 hover:text-black transition-colors">Portfolio Status</Link>
              <Link to="/" className="text-xs font-medium text-slate-600 hover:text-black transition-colors">Revenue & Ledger</Link>
              <Link to="/host" className="text-xs font-medium text-slate-600 hover:text-black transition-colors">Host Console</Link>
            </nav>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Rentals</p>
            <nav className="flex flex-col space-y-3">
              <Link to="/explore" className="text-xs font-medium text-slate-600 hover:text-black transition-colors flex items-center gap-1">Explore Sanctuary</Link>
              <Link to="/profile" className="text-xs font-medium text-slate-600 hover:text-black transition-colors">User Profile</Link>
              <Link to="/" className="text-xs font-medium text-slate-600 hover:text-black transition-colors">Home Portal</Link>
              <Link to="/contact" className="text-xs font-medium text-slate-600 hover:text-black transition-colors">Contact Support</Link>
            </nav>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 text-center text-[10px] text-gray-400 uppercase tracking-widest">
        <div>© 2026 Estate OS Management Suite</div>
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-center">
          <span>Compliance: SEC Rule 506(c)</span>
          <span>Secure Node: 142.10.4.9</span>
        </div>
      </div>
    </footer>
  );
};

export default function App() {
  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 selection:bg-white selection:text-black">
        <div className="max-w-2xl w-full bg-slate-950/80 border border-slate-800/80 backdrop-blur-md rounded-3xl p-8 sm:p-12 space-y-8 shadow-2xl relative overflow-hidden">
          {/* Subtle neon alignment glow */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-slate-800/80 border border-slate-755/50 font-mono text-[10px] uppercase tracking-widest text-cyan-400 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              LuxeStay Operation Portal
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight">
              Awaiting <span className="font-semibold text-cyan-400">Environment Allocation</span>
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your front-end application successfully compiled and loaded on Vercel. However, to synchronize listings, authenticate elite patrons, and record settlement portfolios, we require standard Firebase credentials configured in the environment.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800/60 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-200">Required Vercel Environment Configuration</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              In Vercel, navigate to <strong>Settings &rarr; Environment Variables</strong>, then add the following <strong>both keys and values</strong>:
            </p>
            
            <div className="space-y-2 font-mono text-xs">
              {[
                "VITE_FIREBASE_API_KEY",
                "VITE_FIREBASE_AUTH_DOMAIN",
                "VITE_FIREBASE_PROJECT_ID",
                "VITE_FIREBASE_STORAGE_BUCKET",
                "VITE_FIREBASE_MESSAGING_SENDER_ID",
                "VITE_FIREBASE_APP_ID",
                "VITE_FIREBASE_FIRESTORE_DATABASE_ID"
              ].map(key => (
                <div key={key} className="flex items-center justify-between bg-slate-950/55 p-2 rounded-lg border border-slate-800 text-left">
                  <span className="text-slate-300 font-semibold">{key}</span>
                  {key === "VITE_FIREBASE_FIRESTORE_DATABASE_ID" ? (
                    <span className="text-[10px] text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded font-sans font-bold select-all">ai-studio-d1422b8e-308c-453a-831e-4c5839358a71</span>
                  ) : (
                    <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded font-sans font-bold">Awaiting Value</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-slate-800/80 rounded-xl p-5 bg-slate-950/40 text-xs text-slate-300 leading-relaxed space-y-2">
            <p className="font-semibold text-slate-200">💡 Critical Deployment Notice:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Add <strong>both the variable name (Key) and your Firebase secret configuration values (Value)</strong>.</li>
              <li>Your Firebase settings can be found inside your Firebase project console under Project Settings under the Web app configuration script copy section.</li>
              <li>After saving the variables, trigger a fresh redeploy or update in Vercel to load the active variables.</li>
            </ul>
          </div>

          <div className="pt-2 flex justify-end">
            <a 
              href="https://vercel.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white uppercase tracking-widest font-sans transition-all"
            >
              Verify on Vercel Dashboard <span className="ml-1 text-cyan-400">&nearrow;</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbRole, setDbRole] = useState<'client' | 'host' | 'admin'>('client');
  const [userRole, setUserRole] = useState<'client' | 'host' | 'admin'>('client');
  const [balance, setBalance] = useState(42910.00);
  const [transferStep, setTransferStep] = useState<'idle' | 'account_select' | 'transferring' | 'completed'>('idle');
  const [bankAccounts, setBankAccounts] = useState<any[]>([
    { name: "Swiss Federal Bank •••• 9823", type: "Vault Asset Routing" },
    { name: "Chase Private Client •••• 4410", type: "Liquidity Clearing" }
  ]);
  const [selectedBank, setSelectedBank] = useState("Swiss Federal Bank •••• 9823");
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [newBankSwift, setNewBankSwift] = useState("");
  const [newBankAccountNum, setNewBankAccountNum] = useState("");
  const [newBankClass, setNewBankClass] = useState("Direct Host Payout");

  const [transferAmount, setTransferAmount] = useState("0");
  const [transactionId, setTransactionId] = useState("");
  const [recentTransfers, setRecentTransfers] = useState<any[]>([
    {
      id: "TX-9012A88",
      amount: 15400.00,
      bank: "Swiss Federal Bank •••• 9823",
      date: "May 12, 2026",
      time: "10:24 AM",
      status: "SETTLED"
    }
  ]);
  const [isInstant, setIsInstant] = useState(true);
  const [activeRitualLog, setActiveRitualLog] = useState("Locking settlement quantum...");
  const [activeTab, setActiveTab] = useState<'inquiries' | 'transfers' | 'tickets'>('inquiries');
  const [realInquiries, setRealInquiries] = useState<any[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [replyContents, setReplyContents] = useState<Record<string, string>>({});
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});
  
  // Admin Ticket management
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  useEffect(() => {
    const fetchAndCalculate = async () => {
      if (!user) {
        setBalance(42910.00);
        return;
      }
      try {
        let bookings: any[] = [];

        if (userRole === "admin") {
          try {
            const bookingsSnap = await getDocs(collection(db, "bookings"));
            bookings = bookingsSnap.docs.map(docSnap => docSnap.data());
          } catch (err) {
            handleFirestoreError(err, OperationType.LIST, "bookings");
          }
        } else if (userRole === "host") {
          try {
            const listingsQ = query(collection(db, "listings"), where("ownerId", "==", user.uid));
            const listingsSnap = await getDocs(listingsQ);
            const hostListingIds = listingsSnap.docs.map(d => d.id);
            
            if (hostListingIds.length > 0) {
              const fetchPromises = hostListingIds.map(async (listingId) => {
                const bq = query(collection(db, "bookings"), where("listingId", "==", listingId));
                const bSnap = await getDocs(bq);
                return bSnap.docs.map(d => d.data());
              });
              const results = await Promise.all(fetchPromises);
              bookings = results.flat();
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.LIST, "bookings");
          }
        } else {
          bookings = [];
        }

        let initialAmount = 42910.00;
        
        if (userRole === "admin") {
          const dynamicRevenue = bookings.reduce((sum, b) => {
            const amount = Number(b.price || 0) * Number(b.days || 1);
            return sum + amount;
          }, 0);
          initialAmount = 85200.00 + dynamicRevenue;
        } else if (userRole === "host") {
          const hostRevenue = bookings.reduce((sum, b) => {
            const amount = Number(b.price || 0) * Number(b.days || 1);
            return sum + amount;
          }, 0);
          
          initialAmount = hostRevenue > 0 ? hostRevenue : 18200.00;
        } else {
          initialAmount = 0.00;
        }
        
        const transferredSum = recentTransfers
          .filter(t => t.id !== "TX-9012A88")
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
          
        setBalance(Math.max(0, initialAmount - transferredSum));
      } catch (err) {
        console.error("Dynamic ledger computation error:", err);
      }
    };
    
    fetchAndCalculate();
  }, [user, userRole, recentTransfers]);

  const fetchRealInquiries = async (uid: string, role: string) => {
    setInquiriesLoading(true);
    try {
      const listingsSnap = await getDocs(collection(db, "listings"));
      const listingsMap: Record<string, any> = {};
      listingsSnap.docs.forEach(docSnap => {
        listingsMap[docSnap.id] = docSnap.data();
      });

      const usersSnap = await getDocs(collection(db, "users"));
      const usersMap: Record<string, any> = {};
      usersSnap.docs.forEach(docSnap => {
        usersMap[docSnap.id] = docSnap.data();
      });

      // Fetch received inquiries
      const q = query(
        collection(db, "messages"),
        where("receiverId", "==", uid)
      );
      const msgSnap = await getDocs(q);

      // Fetch replies sent by this host
      const sentQ = query(
        collection(db, "messages"),
        where("senderId", "==", uid)
      );
      const sentSnap = await getDocs(sentQ);
      const sentReplies = sentSnap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAtDate: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
        };
      });

      const msgsList = msgSnap.docs.map(docSnap => {
        const data = docSnap.data();
        const listing = listingsMap[data.listingId] || MOCK_LISTINGS.find(m => m.id === data.listingId);
        const sender = usersMap[data.senderId];
        
        // Find matched replies sent by this host
        const associatedReplies = sentReplies
          .filter((r: any) => r.parentMessageId === docSnap.id)
          .sort((a: any, b: any) => a.createdAtDate.getTime() - b.createdAtDate.getTime());

        return {
          id: docSnap.id,
          ...data,
          listingTitle: listing?.title || "Curated Residence",
          senderEmail: sender?.email || "guest@luxestay.com",
          senderDisplayName: sender?.displayName || sender?.email?.split('@')[0] || "Luxe Guest",
          createdAtDate: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
          replies: associatedReplies
        };
      });

      msgsList.sort((a, b) => b.createdAtDate.getTime() - a.createdAtDate.getTime());
      setRealInquiries(msgsList);
    } catch (err) {
      console.error("Error fetching real inquiries from database:", err);
    } finally {
      setInquiriesLoading(false);
    }
  };

  const handleSendReply = async (inqId: string, recipientId: string, listingId: string) => {
    const text = replyContents[inqId]?.trim();
    if (!text || !user) return;

    setReplyLoading(prev => ({ ...prev, [inqId]: true }));
    try {
      const replyData = {
        listingId,
        senderId: user.uid,
        receiverId: recipientId,
        content: text,
        parentMessageId: inqId,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "messages"), replyData);

      // Reset reply state
      setReplyContents(prev => ({ ...prev, [inqId]: "" }));

      // Reload inquiries
      await fetchRealInquiries(user.uid, userRole);
    } catch (err) {
      console.error("Error sending reply message:", err);
      alert("Operational issue sending response to key-vault server. Please retry.");
    } finally {
      setReplyLoading(prev => ({ ...prev, [inqId]: false }));
    }
  };

  const fetchContactTickets = async () => {
    if (!user) return;
    setTicketsLoading(true);
    try {
      const q = collection(db, "contact_submissions");
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAtDate: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
        };
      });
      list.sort((a, b) => b.createdAtDate.getTime() - a.createdAtDate.getTime());
      setRecentTickets(list);
    } catch (err) {
      console.error("Error fetching contact tickets for admin view:", err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const ticketRef = doc(db, "contact_submissions", ticketId);
      await updateDoc(ticketRef, { status: newStatus });
      await fetchContactTickets();
    } catch (err) {
      console.error("Error updating ticket status:", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, "contact_submissions");
      } catch (e) {
        alert("Authorization issue. Failed to update clearance ticket status.");
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchRealInquiries(user.uid, userRole);
      if (userRole === "admin") {
        fetchContactTickets();
      }
    } else {
      setRealInquiries([]);
      setRecentTickets([]);
    }
  }, [user, userRole]);

  // Simulated live logging steps during transfer
  useEffect(() => {
    if (transferStep === 'transferring') {
      const logs = [
        "Locking settlement quantum...",
        "Evaluating route authentication...",
        "Broadcasting wire packet to clearance hub...",
        "Confirming SWIFT signature ledger...",
        "Sanctuary settlement completed."
      ];
      let logIdx = 0;
      const interval = setInterval(() => {
        logIdx++;
        if (logIdx < logs.length) {
          setActiveRitualLog(logs[logIdx]);
        }
      }, 700);

      const timer = setTimeout(() => {
        const amt = parseFloat(transferAmount) || 0;
        setBalance(prev => Math.max(0, prev - amt));
        setRecentTransfers(prev => [
          {
            id: transactionId,
            amount: amt,
            bank: selectedBank,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            status: 'SETTLED'
          },
          ...prev
        ]);
        setTransferStep('completed');
      }, 3500);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [transferStep, transactionId, selectedBank, transferAmount]);

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }
      setUser(u);
      if (u) {
        setLoading(true);
        try {
          const userRef = doc(db, "users", u.uid);
          const userSnap = await getDoc(userRef);
          
          // Secure auto-admin detection (blessedt.BJ@gmail.com)
          const isBootstrappedAdmin = u.email === "blessedt.BJ@gmail.com";

          if (userSnap.exists()) {
            const data = userSnap.data();
            let currentDbRole = data.role || 'client';
            
            if (isBootstrappedAdmin && currentDbRole !== 'admin') {
              currentDbRole = 'admin';
              await updateDoc(userRef, { role: 'admin' });
            }
          } else {
            const initialRole = isBootstrappedAdmin ? 'admin' : 'client';
            // Intelligently save user to database with correct role
            await setDoc(userRef, {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName || "Luxe Member",
              role: initialRole,
              createdAt: new Date().toISOString()
            });
          }

          // Set up real-time listener for user document changes (instant dashboard reaction)
          unsubSnapshot = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const role = data.role || 'client';
              setDbRole(role);
              setUserRole(role);
            }
          });
        } catch (err) {
          console.error("Error fetching secure user role ledger:", err);
          setDbRole('client');
          setUserRole('client');
        } finally {
          setLoading(false);
        }
      } else {
        setDbRole('client');
        setUserRole('client');
        setLoading(false);
      }
    });
    return () => {
      unsubscribe();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-[#f9fafb] text-slate-900 overflow-x-hidden selection:bg-black selection:text-white">
        <Navbar user={user} loading={loading} userRole={userRole} setUserRole={setUserRole} dbRole={dbRole} />
        <Suspense fallback={
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 bg-[#f9fafb]">
            <Loader2 className="animate-spin text-slate-400 animate-duration-1000" size={24} />
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">Synchronizing Portal...</p>
          </div>
        }>
          <Routes>
          <Route path="/" element={
            <main>
              <Hero />
              
              <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-12 gap-6 md:gap-12 pb-32">
                {/* Left Side: Performance Metrics */}
                <div className={`col-span-12 ${user ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-12`}>
                   <ListingsSection />
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { label: 'Portfolio ROI', value: '+14.2%', color: 'text-green-600' },
                      { label: 'Monthly Inquiries', value: '1.2k', color: 'text-slate-900' },
                      { label: 'Avg Occupancy', value: '94%', color: 'text-slate-900' }
                    ].map(metric => (
                      <div key={metric.label} className="p-6 minimal-card flex flex-col">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">{metric.label}</span>
                        <span className={`text-2xl font-semibold ${metric.color}`}>{metric.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side Column */}
                {user && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="col-span-12 lg:col-span-5 space-y-8"
                  >
                    {userRole === "client" ? (
                      /* Render Client / Buyer Sanctuary Portal instead of revenue */
                      <div className="minimal-card h-full flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                          <h2 className="font-semibold text-lg">Your Residence Hub</h2>
                          <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Client Member</span>
                        </div>

                        <div className="p-6 sm:p-12 flex-grow space-y-8">
                          <div className="space-y-2">
                            <h3 className="text-3xl font-light italic">Sanctuary Portfolio</h3>
                            <p className="text-sm text-slate-400">Manage your active reservations, digital ledger keys of properties, and global acquisitions.</p>
                          </div>

                          {/* Action Cards / Active Booking Quick Summary */}
                          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                              <Calendar size={14} className="text-slate-500" />
                              Global Rental Access
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              You are currently signed in as a luxury guest/client. Explore our hand-picked high-end destinations around the world.
                            </p>
                            <Link 
                              to="/explore"
                              className="w-full block text-center py-3 bg-black text-white text-[10px] uppercase font-bold tracking-widest rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              Explore Sanctuaries
                            </Link>
                          </div>

                          {/* Beautiful CTA to switch to Host role */}
                          <div className="border border-slate-200/60 p-6 rounded-2xl space-y-4 text-left">
                            <div className="flex items-center gap-2">
                              <Building2 size={16} className="text-slate-600" />
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">Become a Host</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              To become a Host, you must first list/submit a prestige residence. Once audited and approved by our curation team, your profile is promoted to Sovereign Host.
                            </p>
                            <Link
                              to="/host"
                              className="w-full block text-center py-2.5 border border-black hover:bg-black hover:text-white transition-all text-[10px] text-black font-semibold uppercase tracking-widest rounded-xl cursor-pointer"
                            >
                              Submit Residence for Audit
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Render Host / Operator Dashboard (integrated revenue) */
                      <div className="minimal-card h-full flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                          <h2 className="font-semibold text-lg">Platform Performance</h2>
                          <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded-full tracking-wide uppercase">{userRole} MODE</span>
                        </div>

                        <div className="p-6 sm:p-12 flex-grow space-y-8">
                          <div className="space-y-2">
                            <h3 className="text-3xl font-light italic">Integrated Revenue</h3>
                            <p className="text-sm text-slate-400">Automated settlements and multi-channel revenue distribution for real estate owners.</p>
                          </div>

                          <div className="p-6 sm:p-8 bg-slate-900 text-white rounded-2xl animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40">Settlement Account</span>
                              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-bold">SECURE SSL</span>
                            </div>
                            <div className="flex items-baseline space-x-2">
                              <span className="text-4xl font-light">
                                ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-xs text-green-400 font-medium">READY</span>
                            </div>
                            <button 
                              onClick={() => {
                                setTransferAmount(balance.toFixed(2));
                                setTransactionId(`TX-${Math.random().toString(36).substring(2, 11).toUpperCase()}`);
                                setTransferStep('account_select');
                              }}
                              className="w-full mt-6 py-4 bg-white text-black text-xs font-bold rounded-xl tracking-widest hover:bg-slate-100 transition-colors uppercase cursor-pointer"
                            >
                              Transfer to Bank
                            </button>
                          </div>

                          {/* Interactive Settlement Allocation Breakdown */}
                          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-sans">
                                <Shield size={14} className="text-slate-500" />
                                Ledger Split Architecture
                              </h4>
                              <span className="text-[8px] font-mono tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase font-bold">Verified Contracts</span>
                            </div>
                            
                            <p className="text-xs text-slate-500 leading-relaxed">
                              These settlement funds represent gross booking revenues. The platform automates splitting protocol allocations in real time:
                            </p>

                            {/* Dynamic Visualization Bars */}
                            {(() => {
                              const hostYieldPct = userRole === 'admin' ? 1.00 : 0.90;
                              const platformFeePct = userRole === 'admin' ? 0.00 : 0.10;
                              return (
                                <div className="space-y-3 pt-1">
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="font-semibold text-slate-700">Property Owner Yield ({(hostYieldPct * 100).toFixed(0)}%)</span>
                                      <span className="font-mono font-bold text-slate-950">${(balance * hostYieldPct).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-black h-full transition-all duration-500" style={{ width: `${hostYieldPct * 100}%` }} />
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="font-semibold text-slate-700">LuxeStay Platform Fee ({(platformFeePct * 100).toFixed(0)}%)</span>
                                      <span className="font-mono font-bold text-slate-400">${(balance * platformFeePct).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-slate-400 h-full transition-all duration-500" style={{ width: `${platformFeePct * 100}%` }} />
                                    </div>
                                  </div>

                                  {userRole === 'admin' && (
                                    <div className="p-2 border border-emerald-100 bg-emerald-50 rounded text-[9px] text-emerald-700">
                                      🛡️ <span className="font-bold">Admin Rate Bypass:</span> Platform fees are bypassed (0%) for assets owned directly by the operational administrator.
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            <div className="p-3 bg-white rounded-xl border border-slate-100 text-[10px] text-slate-400 leading-relaxed">
                              🔒 <span className="text-slate-500 font-semibold">Asset Security:</span> Clicking <span className="text-slate-600 font-bold font-mono">Transfer to Bank</span> triggers immediate wire settlement of your approved host share to the chosen destination credentials below.
                            </div>
                          </div>

                          <div className="space-y-4">
                             <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                               <div className="flex gap-4">
                                 <button 
                                   onClick={() => setActiveTab('inquiries')}
                                   className={`text-[10px] font-bold uppercase tracking-widest transition-colors pb-1 ${activeTab === 'inquiries' ? 'text-black border-b border-black' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                   Recent Inquiries
                                 </button>
                                 <button 
                                   onClick={() => setActiveTab('transfers')}
                                   className={`text-[10px] font-bold uppercase tracking-widest transition-colors pb-1 ${activeTab === 'transfers' ? 'text-black border-b border-black' : 'text-slate-400 hover:text-slate-600'}`}
                                 >
                                   Settlement Records
                                 </button>
                                 {userRole === "admin" && (
                                   <button 
                                     onClick={() => setActiveTab('tickets')}
                                     className={`text-[10px] font-bold uppercase tracking-widest transition-colors pb-1 ${activeTab === 'tickets' ? 'text-black border-b border-black' : 'text-slate-400 hover:text-slate-600'}`}
                                   >
                                     Contact Tickets
                                   </button>
                                 )}
                               </div>
                             </div>
                             
                             {activeTab === 'inquiries' && (
                               <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                 {inquiriesLoading ? (
                                   <div className="flex items-center justify-center py-6 gap-2">
                                     <Loader2 size={16} className="animate-spin text-slate-400" />
                                     <span className="text-xs text-slate-400 font-mono">Syncing messages...</span>
                                   </div>
                                 ) : realInquiries.length === 0 ? (
                                   <div className="text-center py-8 bg-slate-50 border border-slate-100/60 rounded-xl">
                                     <p className="text-xs text-slate-400 italic">No inquiries received yet for your properties.</p>
                                   </div>
                                 ) : (
                                   realInquiries.map((inq) => {
                                     const initials = inq.senderDisplayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                                     return (
                                       <div key={inq.id} className="flex flex-col p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-300 transition-all text-left">
                                          <div className="flex justify-between items-start gap-4">
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-xs font-bold uppercase">{initials || 'G'}</div>
                                              <div>
                                                <p className="text-xs font-semibold">{inq.senderDisplayName} ({inq.senderEmail})</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Residence: <span className="text-slate-800 font-bold">{inq.listingTitle}</span></p>
                                                <p className="text-[9px] text-slate-400">{inq.createdAtDate.toLocaleDateString()} • {inq.createdAtDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="mt-3 bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs text-slate-600 italic">
                                            "{inq.content}"
                                           </div>

                                           {/* Existing replies list */}
                                           {inq.replies && inq.replies.length > 0 && (
                                             <div className="space-y-2 pl-4 border-l-2 border-slate-200 pt-1">
                                               {inq.replies.map((reply: any) => (
                                                 <div key={reply.id} className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-xs text-slate-700">
                                                   <div className="flex justify-between items-center mb-1">
                                                     <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Host Response</span>
                                                     <span className="text-[8px] text-slate-450 font-mono">
                                                       {reply.createdAtDate.toLocaleDateString()} • {reply.createdAtDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                     </span>
                                                   </div>
                                                   <p className="leading-relaxed font-normal text-slate-700">{reply.content}</p>
                                                 </div>
                                               ))}
                                             </div>
                                           )}

                                           {/* Reply Input Form */}
                                           <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                                             <div className="flex gap-2">
                                               <input 
                                                 type="text"
                                                 placeholder="Compose secure reply..."
                                                 name={`reply-${inq.id}`}
                                                 value={replyContents[inq.id] || ""}
                                                 onChange={(e) => setReplyContents(prev => ({ ...prev, [inq.id]: e.target.value }))}
                                                 onKeyDown={(e) => {
                                                   if (e.key === 'Enter' && !e.shiftKey) {
                                                     e.preventDefault();
                                                     handleSendReply(inq.id, inq.senderId, inq.listingId);
                                                   }
                                                 }}
                                                 className="flex-1 bg-slate-50 border border-slate-200/65 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-slate-900 focus:bg-white transition-all text-slate-800"
                                               />
                                               <button
                                                 type="button"
                                                 disabled={replyLoading[inq.id] || !(replyContents[inq.id]?.trim())}
                                                 onClick={() => handleSendReply(inq.id, inq.senderId, inq.listingId)}
                                                 className="px-3 py-1.5 bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-slate-800 disabled:opacity-40 leading-none cursor-pointer flex items-center justify-center min-w-[60px]"
                                               >
                                                 {replyLoading[inq.id] ? (
                                                   <Loader2 size={10} className="animate-spin" />
                                                 ) : (
                                                   "Send"
                                                 )}
                                               </button>
                                             </div>
                                           </div>
                                          </div>
                                      );
                                    })
                                  )}
                               </div>
                             )}

                             {activeTab === 'transfers' && (
                               <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                 {recentTransfers.length > 0 ? (
                                   recentTransfers.map((item, idx) => (
                                     <div key={idx} className="flex justify-between items-center p-4 rounded-xl border border-slate-50 hover:bg-slate-50 transition-all">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                                            <ArrowUpRight size={16} />
                                          </div>
                                          <div>
                                            <p className="text-xs font-semibold">Wire Protocol {item.id}</p>
                                            <p className="text-[10px] text-slate-400">{item.date} • {item.time}</p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-xs font-bold font-mono">-${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                          <p className="text-[8px] bg-slate-100 text-slate-500 font-extrabold tracking-widest px-1.5 py-0.5 rounded uppercase">{item.status}</p>
                                        </div>
                                     </div>
                                   ))
                                 ) : (
                                   <p className="text-xs text-slate-400 italic text-center py-4">No recent settlements catalogued.</p>
                                 )}
                               </div>
                             )}

                             {activeTab === 'tickets' && userRole === 'admin' && (
                               <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                 {ticketsLoading ? (
                                   <div className="flex items-center justify-center py-6 gap-2">
                                     <Loader2 size={16} className="animate-spin text-slate-400" />
                                     <span className="text-xs text-slate-400 font-mono">Syncing tickets...</span>
                                   </div>
                                 ) : recentTickets.length === 0 ? (
                                   <div className="text-center py-8 bg-slate-50 border border-slate-100/60 rounded-xl">
                                     <p className="text-xs text-slate-400 italic">No concierge tickets received yet.</p>
                                   </div>
                                 ) : (
                                   recentTickets.map((ticket) => {
                                     const initials = ticket.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || "C";
                                     return (
                                       <div key={ticket.id} className="flex flex-col p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-300 transition-all text-left space-y-3">
                                         <div className="flex justify-between items-start gap-3">
                                           <div className="flex items-center gap-3">
                                             <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold uppercase">
                                               {initials}
                                             </div>
                                             <div>
                                               <p className="text-xs font-semibold">{ticket.name}</p>
                                               <p className="text-[10px] text-slate-500">{ticket.email}</p>
                                               <p className="text-[9px] text-slate-400">
                                                 {ticket.createdAtDate.toLocaleDateString()} at {ticket.createdAtDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                               </p>
                                             </div>
                                           </div>
                                         </div>

                                         <div className="space-y-1">
                                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                              Subject: <span className="text-slate-900 font-semibold">{ticket.subject}</span>
                                           </p>
                                           <p className="text-xs bg-slate-50 p-2.5 rounded-lg text-slate-600 border border-slate-100 leading-relaxed italic">
                                             "{ticket.message}"
                                           </p>
                                         </div>

                                         <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-[10px]">
                                           <div className="flex items-center gap-2">
                                             <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Category:</span>
                                             <span className="text-[9px] text-slate-800 font-medium px-1.5 py-0.5 bg-slate-100 border border-slate-200/50 rounded font-mono">
                                               {ticket.category?.replace('_', ' ')}
                                             </span>
                                           </div>

                                           <div className="flex items-center gap-1">
                                             <select 
                                               value={ticket.status}
                                               onChange={(e) => handleUpdateTicketStatus(ticket.id, e.target.value)}
                                               className="bg-slate-50 border border-slate-200 text-[10px] font-bold rounded px-1.5 py-1 text-slate-700 focus:outline-none appearance-none cursor-pointer"
                                             >
                                               <option value="PENDING_CONCIERGE">Pending</option>
                                               <option value="IN_PROCESS">In Process</option>
                                               <option value="RESOLVED">Resolved</option>
                                             </select>
                                           </div>
                                         </div>
                                       </div>
                                     );
                                   })
                                 )}
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </main>
          }/>
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
          <Route path="/host" element={<HostPage userRole={userRole} />} />
          <Route path="/booking-success" element={<BookingSuccessPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
        </Suspense>
        <Footer />

        {/* Transfer Portal Modal */}
        <AnimatePresence>
          {transferStep !== 'idle' && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => transferStep !== 'transferring' && setTransferStep('idle')}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
              >
                <div className="p-10 space-y-8">
                  {/* ACCOUNT SELECT & INPUT STEP */}
                  {transferStep === 'account_select' && (
                    <>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-extrabold bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                            Protocol ID: {transactionId}
                          </span>
                          <h3 className="text-3xl font-light tracking-tight mt-2">Wire Clearance</h3>
                        </div>
                        <button 
                          onClick={() => setTransferStep('idle')} 
                          className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-300 hover:text-black"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="space-y-6">
                        {/* Amount and Input */}
                        <div className="bg-[#fafafa] p-6 rounded-2xl border border-slate-100 space-y-3">
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            <span>Amount to Transfer</span>
                            <button 
                              onClick={() => setTransferAmount(balance.toFixed(2))}
                              className="text-black border-b border-black text-[9px] font-bold uppercase"
                            >
                              Transfer Full Balance
                            </button>
                          </div>
                          <div className="flex items-center">
                            <span className="text-3xl font-light text-slate-400 mr-2">$</span>
                            <input 
                              type="number"
                              value={transferAmount}
                              onChange={(e) => {
                                const value = e.target.value;
                                setTransferAmount(value);
                              }}
                              className="bg-transparent border-none text-4xl font-light focus:outline-none w-full"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Available Funds: ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            {parseFloat(transferAmount) > balance && (
                              <span className="text-red-500 font-bold tracking-widest font-mono">EXCEEDS LIMIT</span>
                            )}
                          </div>
                        </div>

                        {/* Bank Accounts */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center pr-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Destination Credentials</p>
                            <button 
                              type="button"
                              onClick={() => setIsAddingBank(!isAddingBank)}
                              className="text-[10px] font-bold text-black border-b border-black hover:text-slate-600 transition-colors uppercase p-0 cursor-pointer"
                            >
                              {isAddingBank ? "Cancel" : "+ Link Account"}
                            </button>
                          </div>

                          {isAddingBank ? (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4 text-left"
                            >
                              <div className="space-y-1">
                                <span className="text-[8px] font-mono tracking-widest uppercase text-slate-400 block font-bold">Anchor New Node Link</span>
                                <p className="text-[11px] text-slate-500 leading-tight">Link a sovereign bank account to route payouts securely.</p>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Institution Name</label>
                                  <input 
                                    type="text"
                                    placeholder="e.g. HSBC Private Bank"
                                    value={newBankName}
                                    onChange={(e) => setNewBankName(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-black outline-none"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">SWIFT / BIC</label>
                                    <input 
                                      type="text"
                                      placeholder="e.g. HSBCCHZZXXX"
                                      value={newBankSwift}
                                      onChange={(e) => setNewBankSwift(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:border-black outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Account Number / IBAN</label>
                                    <input 
                                      type="text"
                                      placeholder="e.g. CH93 0000 0000 1042"
                                      value={newBankAccountNum}
                                      onChange={(e) => setNewBankAccountNum(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:border-black outline-none"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Clearance Routing Class</label>
                                  <select 
                                    value={newBankClass}
                                    onChange={(e) => setNewBankClass(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-black outline-none"
                                  >
                                    <option value="Direct Host Payout">Direct Host Payout</option>
                                    <option value="Sovereign Vault Payout">Sovereign Vault Payout</option>
                                    <option value="Tactical Operating Cash">Tactical Operating Cash</option>
                                  </select>
                                </div>
                              </div>

                              <button 
                                type="button"
                                onClick={() => {
                                  if (!newBankName || !newBankAccountNum) {
                                    alert("Please supply at least a bank name and account identification.");
                                    return;
                                  }
                                  // Mask account number to show last 4 digits
                                  const sanitizedAcc = newBankAccountNum.replace(/\s/g, '');
                                  const lastFour = sanitizedAcc.slice(-4) || "8888";
                                  const maskName = `${newBankName} •••• ${lastFour}`;
                                  
                                  const updated = [
                                    ...bankAccounts,
                                    { name: maskName, type: newBankClass }
                                  ];
                                  setBankAccounts(updated);
                                  setSelectedBank(maskName);
                                  
                                  // Reset inputs
                                  setNewBankName("");
                                  setNewBankSwift("");
                                  setNewBankAccountNum("");
                                  setIsAddingBank(false);
                                }}
                                className="w-full py-2.5 bg-black text-white text-[10px] uppercase font-bold tracking-widest rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                              >
                                Anchor & Link Account
                              </button>
                            </motion.div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                              {bankAccounts.map(acc => (
                                <div 
                                  key={acc.name}
                                  onClick={() => setSelectedBank(acc.name)}
                                  className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 cursor-pointer ${selectedBank === acc.name ? "border-black bg-slate-50/50" : "border-slate-100 bg-white opacity-60 hover:opacity-100"}`}
                                >
                                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                    <Building2 size={20} />
                                  </div>
                                  <div className="flex-grow text-left">
                                    <p className="text-xs font-bold text-slate-950">{acc.name}</p>
                                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">{acc.type}</p>
                                  </div>
                                  <div className="w-5 h-5 rounded-full border-2 border-black flex items-center justify-center">
                                    {selectedBank === acc.name && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Instant Routing Options */}
                        <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-950 font-semibold">
                          <div className="flex items-center gap-3">
                            <Shield size={16} className="text-slate-400" />
                            <div>
                              <p className="text-slate-950 font-bold">Instant Clearing System</p>
                              <p className="text-[9px] text-slate-400">Zero settlement lag on the SWIFT net</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setIsInstant(!isInstant)}
                            className={`w-10 h-6 rounded-full p-1 transition-all flex items-center ${isInstant ? 'bg-black justify-end' : 'bg-slate-200 justify-start'}`}
                          >
                            <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                          </button>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          if (parseFloat(transferAmount) > 0 && parseFloat(transferAmount) <= balance) {
                            setTransferStep('transferring');
                          }
                        }}
                        disabled={parseFloat(transferAmount) <= 0 || parseFloat(transferAmount) > balance || !transferAmount}
                        className="minimal-button w-full py-5 flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs rounded-2xl disabled:opacity-40"
                      >
                        <span>Authorize Wire Settlement</span>
                        <ArrowRight size={14} />
                      </button>
                    </>
                  )}

                  {/* TRANSFERRING STEP */}
                  {transferStep === 'transferring' && (
                    <div className="py-16 flex flex-col items-center justify-center text-center space-y-8">
                      <div className="relative">
                        <div className="w-20 h-20 border-2 border-slate-100 rounded-full" />
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 w-20 h-20 border-2 border-transparent border-t-black rounded-full"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="animate-spin text-black" size={28} />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-2xl font-light tracking-tight">Processing Wire Clearance</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.25em] font-extrabold animate-pulse h-4">
                          {activeRitualLog}
                        </p>
                      </div>

                      <div className="grid grid-cols-4 gap-2 w-full max-w-xs pt-4">
                        {[1, 2, 3, 4].map(idx => (
                          <div key={idx} className="h-1 bg-slate-50 flex overflow-hidden rounded-full">
                            <motion.div 
                              initial={{ width: "0%" }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 1.5, delay: idx * 0.2, repeat: Infinity }}
                              className="bg-black/35"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* COMPLETED STEP */}
                  {transferStep === 'completed' && (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
                      <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center shadow-2xl">
                        <CheckCircle2 size={40} className="text-white" />
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-3xl font-light tracking-tight font-serif italic">Clearance Settled</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-extrabold">
                          Wire code: <span className="text-black font-mono">{transactionId}</span>
                        </p>
                      </div>

                      <div className="w-full bg-[#fafafa] p-6 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-200/60">
                          <span className="text-slate-400">Yield Cleared</span>
                          <span className="font-bold font-mono text-black">-${parseFloat(transferAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-200/60">
                          <span className="text-slate-400">Swiss Destination</span>
                          <span className="font-semibold text-slate-900">{selectedBank}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Current Balance</span>
                          <span className="font-bold text-slate-900">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div className="flex gap-3 w-full pt-4">
                        <button 
                          onClick={() => window.print()}
                          className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all"
                        >
                          Print Receipt
                        </button>
                        <button 
                          onClick={() => setTransferStep('idle')}
                          className="flex-1 py-4 bg-black hover:bg-zinc-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all"
                        >
                          Done
                        </button>
                      </div>

                      <div className="flex items-center justify-center gap-2 text-slate-400 text-[9px] uppercase tracking-widest">
                        <Shield size={12} />
                        <span>Ledger Verified Secure</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Router>
  );
}
