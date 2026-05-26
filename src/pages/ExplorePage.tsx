import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, Filter, SlidersHorizontal, ArrowRight, Loader2, MapPin } from "lucide-react";
import { MOCK_LISTINGS } from "../constants";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Listing } from "../types";

const ExplorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialSearch = queryParams.get("search") || "";
  const initialCity = queryParams.get("city") || "";

  const [searchQuery, setSearchQuery] = useState(initialSearch || initialCity);
  const [selectedIntent, setSelectedIntent] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [listings, setListings] = useState<Listing[]>(MOCK_LISTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(doc => !doc.status || doc.status === "active");
        
        if (fetched.length > 0) {
          setListings([...fetched, ...MOCK_LISTINGS]); // Mix for better demo
        } else {
          setListings(MOCK_LISTINGS);
        }
      } catch (error) {
        console.error("Failed to fetch listings, using mocks:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  const intents = ["All", "Stays", "Acquisitions"];
  const categories = ["All", "Coastal", "Mountain", "Urban", "Historic", "Contemporary"];

  const filteredListings = listings.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         l.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesIntent = selectedIntent === "All" || 
                         (selectedIntent === "Stays" && l.type !== 'sale') ||
                         (selectedIntent === "Acquisitions" && l.type === 'sale');
    
    return matchesSearch && matchesIntent;
  });

  return (
    <div className="pt-32 pb-40 bg-canvas min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400 mb-4">Discovery</p>
          <h1 className="text-5xl font-light mb-8">Curated <span className="font-semibold">Residences</span></h1>
          
          <div className="flex flex-col gap-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search location, house name, or style..."
                className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-black transition-all text-sm font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                {intents.map((intent) => (
                  <button 
                    key={intent}
                    onClick={() => setSelectedIntent(intent)}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${selectedIntent === intent ? "bg-white text-black shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    {intent}
                  </button>
                ))}
              </div>
              
              <div className="h-4 w-px bg-slate-200 hidden md:block" />

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-full">
                {categories.map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === cat ? "bg-black text-white" : "bg-white border border-slate-100 text-slate-500 hover:bg-slate-50"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-12 pb-6 border-b border-slate-100">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Showing {filteredListings.length} Assets</p>
          <button className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-black transition-all">
            <SlidersHorizontal size={14} /> Refine Portfolio
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredListings.map((listing, idx) => (
            <motion.div 
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              className="group cursor-pointer minimal-card overflow-hidden"
              onClick={() => navigate(`/listing/${listing.id}`)}
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <img 
                  src={listing.images[0]} 
                  alt={listing.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute top-4 left-4 bg-black/90 text-white px-3 py-1 text-[8px] font-bold uppercase tracking-[0.2em] rounded">
                  {listing.type === 'sale' ? 'Acquisition' : 'Residency'}
                </div>
                <div className="absolute bottom-4 right-4 bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded shadow-sm">
                  ${listing.price.toLocaleString()}{listing.type === 'sale' ? '' : '/Night'}
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-slate-900 group-hover:text-black transition-colors">{listing.title}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin size={12} /> {listing.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold">
                    <span className="text-black">★</span> {listing.rating}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex gap-4 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                    <span>{listing.reviewsCount} REVIEWS</span>
                    <span className="text-slate-200">|</span>
                    <span>VERIFIED</span>
                  </div>
                  <ArrowRight size={14} className="text-slate-200 group-hover:translate-x-1 group-hover:text-black transition-all" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
