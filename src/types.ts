export type ListingType = 'rental' | 'sale';

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  images: string[];
  amenities: string[];
  ownerId: string;
  createdAt: string;
  rating: number;
  reviewsCount: number;
  type?: ListingType; // Optional for backward compatibility in mock data if I don't update all
  capacity?: number;
  bedrooms?: number;
  bathrooms?: number;
  surface?: string;
}

export interface Booking {
  id: string;
  listingId: string;
  userId: string;
  startDate?: string;
  endDate?: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  type: ListingType;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'host' | 'admin';
  email: string;
}
