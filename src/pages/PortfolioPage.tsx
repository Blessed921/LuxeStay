import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowRight, MapPin, Building2, Globe, TrendingUp } from "lucide-react";
import { MOCK_LISTINGS } from "../constants";
import { Link } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

const PortfolioPage = () => {
  const [activeCity, setActiveCity] = useState("London");
  const cities = ["London", "Paris", "Berlin", "Tokyo"];
  const [listings, setListings] = useState<any[]>(MOCK_LISTINGS);
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
          setListings([...fetched, ...MOCK_LISTINGS]);
        }
      } catch (error) {
        console.error("Failed to fetch listings for portfolio page:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  const getCityAssets = (city: string) => {
    return listings.filter(l => l.location.toLowerCase().includes(city.toLowerCase()));
  };

  const cityData: Record<string, any> = {
    "London": {
      yield: "8.4%",
      mktValue: "$42.5M",
      description: "Prime central London residences curated for senior executives and diplomatic stays."
    },
    "Paris": {
      yield: "7.2%",
      mktValue: "$31.8M",
      description: "Haussmann-style apartments in the 8th and 16th Arrondissements."
    },
    "Berlin": {
      yield: "9.1%",
      mktValue: "$28.2M",
      description: "Modern lofts and industrial-chic conversions in Mitte and Charlottenburg."
    },
    "Tokyo": {
      yield: "6.8%",
      mktValue: "$45.0M",
      description: "High-floor sanctuaries in Minato-ku with integrated smart-home protocols."
    }
  };

  return (
    <div className="pt-32 pb-40 bg-canvas min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-20">
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-slate-400 mb-4">Institutional Grade</p>
          <h1 className="text-6xl font-light mb-8">Global <span className="font-semibold italic">Portfolios</span></h1>
          <p className="text-slate-500 max-w-2xl text-lg leading-relaxed">
            Our portfolios represent curated clusters of high-yield residential assets. Each property undergoes rigorous brand alignment and professional management integration.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Portfolio Nav */}
          <div className="lg:col-span-4 space-y-4">
            {cities.map(city => (
              <button 
                key={city}
                onClick={() => setActiveCity(city)}
                className={`w-full p-8 rounded-2xl text-left transition-all border ${activeCity === city ? "bg-black text-white border-black" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"}`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-medium">{city}</h3>
                  <Globe size={20} className="opacity-20" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-bold opacity-40">Assets</p>
                    <p className="text-sm font-bold">{getCityAssets(city).length}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-bold opacity-40">Yield</p>
                    <p className="text-sm font-bold text-green-400">{cityData[city].yield}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Portfolio Details */}
          <div className="lg:col-span-8">
            <motion.div 
              key={activeCity}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="minimal-card p-12 space-y-12"
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-12">
                <div className="space-y-4 max-w-md">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Selected Market Strategy</p>
                  <h2 className="text-4xl font-light underline decoration-slate-200 underline-offset-8">{activeCity} Core Fund</h2>
                  <p className="text-slate-500 leading-relaxed">{cityData[activeCity].description}</p>
                </div>
                <div className="text-right space-y-6">
                   <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Market Value</p>
                      <p className="text-3xl font-semibold">{cityData[activeCity].mktValue}</p>
                   </div>
                   <div className="flex items-center justify-end gap-2 text-green-600 font-bold text-sm">
                      <TrendingUp size={16} /> <span>Bullish Outlook</span>
                   </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold">Key Assets</h3>
                  <Link to="/explore" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-black transition-colors flex items-center gap-2">Explore All <ArrowRight size={14} /></Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {getCityAssets(activeCity).length > 0 ? (
                    getCityAssets(activeCity).map(item => (
                      <Link 
                        key={item.id} 
                        to={`/listing/${item.id}`}
                        className="p-4 rounded-xl border border-slate-50 bg-slate-50/50 flex gap-4 transition-all hover:bg-white hover:shadow-sm text-left group"
                      >
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={item.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be60998ad50c"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex flex-col justify-center">
                          <p className="text-xs font-semibold mb-1 group-hover:text-black transition-colors">{item.title}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1"><MapPin size={10} /> {item.location}</p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-2 p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-sm font-medium text-slate-400 italic">No public assets found in this pool yet.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 rounded-full"><Building2 size={24} className="text-slate-400" /></div>
                  <div>
                    <p className="text-sm font-semibold">Asset Acquisition Protocol</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Inquiry required for allocation</p>
                  </div>
                </div>
                <button className="minimal-button px-10 py-4">Request Deck</button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioPage;
