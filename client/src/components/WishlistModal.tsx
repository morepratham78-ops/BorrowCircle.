import React, { useState, useEffect } from 'react';
import { Item } from '../types';
import { api } from '../services/api';
import {
  X,
  Heart,
  MapPin,
  Trash2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Star
} from 'lucide-react';

interface WishlistModalProps {
  wishlistIds: string[];
  onClose: () => void;
  onToggleWishlist: (itemId: string) => void;
  onSelectItem: (item: Item) => void;
  onNavigate?: (tab: string) => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  wishlistIds,
  onClose,
  onToggleWishlist,
  onSelectItem,
  onNavigate
}) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const res = await api.getWishlistItems();
      setItems(res.items || []);
    } catch (err) {
      console.error('Failed to load wishlist items', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (itemId: string) => {
    onToggleWishlist(itemId);
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#003B3B] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Heart className="w-5 h-5 fill-rose-400 text-rose-400" />
            <div>
              <h3 className="text-lg font-black tracking-tight text-white">
                Saved Equipment ({items.length})
              </h3>
              <p className="text-xs text-teal-200/80">
                Your shortlisted tools and gear ready for instant booking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-sm font-medium text-slate-400">
              Loading your saved equipment...
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <Heart className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h4 className="text-base font-bold text-slate-800">Your wishlist is empty</h4>
              <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                Browse power tools, cameras, projectors, and camping gear on the Discover page. Click the heart icon on any card to save it here.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onNavigate) {
                    onNavigate('explore');
                  }
                }}
                className="mt-5 px-6 py-2.5 rounded-xl bg-[#003B3B] hover:bg-[#002b2b] text-white text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2 mx-auto"
              >
                <span>Browse Equipment</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#16D9CC]" />
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-[#F5F7F8] border border-[#E5E9ED] hover:border-teal-400 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div
                  className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
                  onClick={() => {
                    onClose();
                    onSelectItem(item);
                  }}
                >
                  <img
                    src={item.images?.[0]?.url || 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=400&q=80'}
                    alt={item.title}
                    className="w-16 h-16 rounded-xl object-cover bg-white border border-[#E5E9ED] shrink-0 group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-bold text-[#102A2A] truncate group-hover:text-teal-700 transition-colors">
                      {item.title}
                    </h5>
                    <div className="flex items-center gap-2 text-xs text-[#718096] mt-0.5">
                      <span className="font-extrabold text-[#003B3B]">₹{item.hourlyRate}/hr</span>
                      {item.dailyRate && (
                        <>
                          <span>•</span>
                          <span>₹{item.dailyRate}/day</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                        <span>{item.area}, {item.city}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                        {item.condition}
                      </span>
                      <span className="text-amber-800 font-bold flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{item.owner?.rating || '4.9'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="p-2.5 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-[#E5E9ED] transition-colors cursor-pointer"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectItem(item);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#003B3B] hover:bg-[#002b2b] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Rent Now</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#16D9CC]" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
