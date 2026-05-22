import { Listing } from "./types";

export const MOCK_LISTINGS: Listing[] = [
  {
    id: "1",
    title: "Minimalist Oceanfront Villa",
    description: "A stunning architectural masterpiece perched on the cliffs of Malibu. Features floor-to-ceiling windows, a private infinity pool, and direct beach access. Perfect for those who seek tranquility and refined design.",
    price: 1200,
    location: "Malibu, California",
    images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=2000"],
    amenities: ["Infinity Pool", "Private Beach", "Wine Cellar", "Chef's Kitchen", "Home Cinema"],
    ownerId: "host1",
    createdAt: new Date().toISOString(),
    rating: 4.9,
    reviewsCount: 128,
    type: 'rental'
  },
  {
    id: "4",
    title: "Brutalist Concrete Estate",
    description: "An uncompromising vision of brutalist architecture. 15,000 square feet of raw concrete, glass, and steel. This permanent residence offers absolute security and architectural purity.",
    price: 8500000,
    location: "Austin, Texas",
    images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=2000"],
    amenities: ["Security Bunker", "Sculpture Garden", "10-Car Gallery", "Smart Fortress System", "Olympic Pool"],
    ownerId: "host4",
    createdAt: new Date().toISOString(),
    rating: 5.0,
    reviewsCount: 12,
    type: 'sale'
  },
  {
    id: "2",
    title: "Heritage Penthouse Suite",
    description: "Located in the heart of London, this penthouse combines historic charm with cutting-edge technology. Experience the best of the city with private terrace views of the Thames.",
    price: 850,
    location: "London, United Kingdom",
    images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=2000"],
    amenities: ["Rooftop Terrace", "Smart Home System", "Concierge Service", "Private Gym", "Steam Room"],
    ownerId: "host2",
    createdAt: new Date().toISOString(),
    rating: 4.8,
    reviewsCount: 94,
    type: 'rental'
  },
  {
    id: "5",
    title: "The Glass Monolith",
    description: "A single-story residence constructed entirely from smart glass and carbon fiber. Located on a private island, this property redefines the concept of ownership and privacy in the digital age.",
    price: 12400000,
    location: "Kyoto, Japan",
    images: ["https://plus.unsplash.com/premium_photo-1661915661139-5b6a4e4a6fcc?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8aG91c2VzfGVufDB8fDB8fHww"],
    amenities: ["Private Island", "Quantum Computing Lab", "Submarine Dock", "Zen Garden", "Tea Room"],
    ownerId: "host5",
    createdAt: new Date().toISOString(),
    rating: 4.9,
    reviewsCount: 5,
    type: 'sale'
  },
  {
    id: "3",
    title: "Alpine Glass Chalet",
    description: "Retreat to the snowy peaks of Switzerland in this fully transparent glass chalet. Unparalleled 360-degree views of the Alps from every room. A truly immersive winter experience.",
    price: 1500,
    location: "Zermatt, Switzerland",
    images: ["https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=2000"],
    amenities: ["Indoor Fireplace", "Ski-in/Ski-out", "Outdoor Hot Tub", "Heated Floors", "Private Chef"],
    ownerId: "host3",
    createdAt: new Date().toISOString(),
    rating: 5.0,
    reviewsCount: 76,
    type: 'rental'
  }
];
