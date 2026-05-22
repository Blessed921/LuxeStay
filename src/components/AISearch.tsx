import React, { useState } from "react";
import { GoogleGenAI } from "@google/genai";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AISearch = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAISearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a luxury travel concierge for LuxeStay. 
        A user is looking for a place to stay with this request: "${query}".
        Extract the likely city and keywords for amenities or vibe.
        Return ONLY a JSON object with the keys "city" (string) and "keywords" (string array).`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text);
      // In a real app, we'd filter the database. 
      // For now, we'll navigate to explore with these params.
      navigate(`/explore?city=${result.city}&search=${result.keywords.join(" ")}`);
    } catch (error) {
      console.error("AI Search error:", error);
      // Fallback to normal search
      navigate(`/explore?search=${query}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <form onSubmit={handleAISearch} className="relative group">
        <div className="absolute inset-0 bg-white rounded-3xl sm:rounded-full border border-slate-100 shadow-xl group-focus-within:border-black transition-all duration-500"></div>
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center p-2.5 sm:p-2 gap-2 sm:gap-0">
          <div className="flex-1 flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-2.5 sm:py-0 text-slate-900 font-medium">
            <Sparkles size={18} className="text-slate-400 group-focus-within:text-black transition-colors shrink-0" />
            <input 
              type="text" 
              placeholder="Ask our AI Concierge..." 
              className="bg-transparent border-none focus:outline-none w-full text-xs sm:text-sm placeholder:text-slate-350 placeholder:uppercase placeholder:tracking-widest"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="minimal-button px-6 sm:px-10 py-3 sm:py-4 justify-center shrink-0 rounded-2xl sm:rounded-full"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            {loading ? "Consulting..." : "Search"}
          </button>
        </div>
      </form>
      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 px-1">
        <span className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Suggestions:</span>
        {['London Loft', 'Paris Sanctuary', 'Milan Penthouse'].map(suggestion => (
          <button 
            key={suggestion}
            onClick={() => setQuery(suggestion)}
            className="text-[10px] uppercase tracking-widest text-slate-400 hover:text-black transition-colors font-bold whitespace-nowrap"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AISearch;
