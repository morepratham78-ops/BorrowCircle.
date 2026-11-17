import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import {
  Globe,
  Leaf,
  Calculator,
  Flame,
  Award,
  Users,
  Building,
  PlusCircle,
  HelpCircle,
  MapPin,
  TrendingUp,
  Share2
} from 'lucide-react';

interface CommunityScreenProps {
  user: User;
}

export const CommunityScreen: React.FC<CommunityScreenProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'eco' | 'calculator' | 'wishwall' | 'heatmap' | 'leaderboard'>('eco');
  const [ecoStats, setEcoStats] = useState<any>({
    totalKgCo2Saved: 245,
    treesEquivalent: 12,
    rawMaterialsSavedKg: 430,
    completedRentals: 18,
    totalActiveSharers: 4
  });

  // Borrow vs Buy Calculator state
  const [calcBuyPrice, setCalcBuyPrice] = useState<number>(12000);
  const [calcHourlyRate, setCalcHourlyRate] = useState<number>(60);
  const [calcHours, setCalcHours] = useState<number>(4);
  const [calcResult, setCalcResult] = useState<any>(null);

  // Wish wall
  const [wishWallPosts, setWishWallPosts] = useState<any[]>([]);
  const [showPostModal, setShowPostModal] = useState<boolean>(false);
  const [wishTitle, setWishTitle] = useState<string>('');
  const [wishBudget, setWishBudget] = useState<string>('50');
  const [wishHours, setWishHours] = useState<string>('3');
  const [wishDesc, setWishDesc] = useState<string>('');

  // Heatmap
  const [heatmapHotspots, setHeatmapHotspots] = useState<any[]>([]);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Groups
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    api.getEcoStats().then(res => setEcoStats(res));
    api.getWishWall().then(res => setWishWallPosts(res.posts || []));
    api.getDemandHeatmap(user.city).then(res => setHeatmapHotspots(res.hotspots || []));
    api.getLeaderboard().then(res => setLeaderboard(res.leaderboard || []));
    api.getGroups(user.city).then(res => setGroups(res.groups || []));
  }, [user.city]);

  useEffect(() => {
    api.calculateBorrowVsBuy(calcBuyPrice, calcHourlyRate, calcHours).then(res => setCalcResult(res));
  }, [calcBuyPrice, calcHourlyRate, calcHours]);

  const handleCreateWishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.postWishWall({
        itemTitle: wishTitle,
        categoryId: 'tools-hardware', // will fallback in backend if needed
        maxBudgetPerHour: Number(wishBudget),
        neededHours: Number(wishHours),
        description: wishDesc
      });
      setShowPostModal(false);
      setWishTitle('');
      setWishDesc('');
      api.getWishWall().then(res => setWishWallPosts(res.posts || []));
      alert('Request posted to Community Wish Wall!');
    } catch (err: any) {
      alert(err.message || 'Failed to post request');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Community Hub & Smart Eco Features
        </h2>
        <p className="text-xs text-slate-500">
          Hyperlocal resource sharing saves money, reduces environmental footprint, and connects apartment societies.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'eco', label: 'Eco Impact Tracker', icon: Leaf },
          { id: 'calculator', label: 'Borrow vs Buy Calculator', icon: Calculator },
          { id: 'wishwall', label: 'Community Wish Wall', icon: HelpCircle },
          { id: 'heatmap', label: 'Demand Heatmap', icon: Flame },
          { id: 'leaderboard', label: 'Leaderboard', icon: Award }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-gradient-primary text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. ECO IMPACT TRACKER */}
      {activeTab === 'eco' && (
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white shadow-lg relative overflow-hidden">
            <div className="max-w-xl">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Hyperlocal Circular Economy
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold mt-1">
                Sharing Equipment Spares Raw Earth & Slashes CO₂
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100 mt-2 leading-relaxed">
                Manufacturing an average power tool consumes 12kg of virgin steel and plastics. When neighbors in {user.city} borrow equipment instead of purchasing single-use gadgets, real emissions are prevented.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <Leaf className="w-6 h-6" />
              </div>
              <div className="text-3xl font-black text-slate-900">{ecoStats.totalKgCo2Saved} kg</div>
              <div className="text-xs font-bold text-slate-500 mt-1">CO₂ Emissions Avoided</div>
              <div className="text-[10px] text-emerald-700 mt-1">~{ecoStats.treesEquivalent} mature trees equivalent</div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 text-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3">
                <Globe className="w-6 h-6" />
              </div>
              <div className="text-3xl font-black text-slate-900">{ecoStats.rawMaterialsSavedKg} kg</div>
              <div className="text-xs font-bold text-slate-500 mt-1">Raw Materials Spared</div>
              <div className="text-[10px] text-teal-700 mt-1">Virgin metals and plastics</div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3">
                <Share2 className="w-6 h-6" />
              </div>
              <div className="text-3xl font-black text-slate-900">{ecoStats.completedRentals}</div>
              <div className="text-xs font-bold text-slate-500 mt-1">Successful Peer Handover Sessions</div>
              <div className="text-[10px] text-blue-700 mt-1">100% verified with dual OTP</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. BORROW VS BUY CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900">
              Interactive Borrow vs Buy Financial Calculator
            </h3>
            <p className="text-xs text-slate-500">
              Compare retail purchase price with hyperlocal hourly rental cost.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Equipment Retail Price: ₹{calcBuyPrice.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="2000"
                max="80000"
                step="1000"
                value={calcBuyPrice}
                onChange={(e) => setCalcBuyPrice(Number(e.target.value))}
                className="w-full accent-teal-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>BorrowCircle Hourly Rate: ₹{calcHourlyRate}/hr</span>
              </div>
              <input
                type="range"
                min="30"
                max="300"
                step="10"
                value={calcHourlyRate}
                onChange={(e) => setCalcHourlyRate(Number(e.target.value))}
                className="w-full accent-teal-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Hours Needed for Your Task: {calcHours} hours</span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={calcHours}
                onChange={(e) => setCalcHours(Number(e.target.value))}
                className="w-full accent-teal-600"
              />
            </div>
          </div>

          {calcResult && (
            <div className="p-6 rounded-2xl bg-teal-50 border border-teal-200 space-y-3">
              <div className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                Financial Breakdown Result
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500">Rental Cost:</div>
                  <div className="text-xl font-black text-slate-900">₹{calcResult.totalRentalCost}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Net Money Saved:</div>
                  <div className="text-xl font-black text-emerald-700">₹{calcResult.netMoneySaved.toLocaleString('en-IN')}</div>
                </div>
              </div>
              <div className="text-xs font-semibold text-teal-900">
                You save <strong>{calcResult.savingsPercentage}%</strong> compared to buying. You would need to use this equipment for over <strong>{calcResult.breakEvenHours} hours</strong> for a purchase to break even.
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. COMMUNITY WISH WALL */}
      {activeTab === 'wishwall' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Neighborhood Wish Wall</h3>
              <p className="text-xs text-slate-500">Can't find a specific tool? Post your request and nearby neighbors will be notified.</p>
            </div>
            <button
              onClick={() => setShowPostModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-primary text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Post Request</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {wishWallPosts.map((post) => (
              <div key={post.id} className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                      ₹{post.maxBudgetPerHour}/hr budget
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {post.neededHours} hrs needed
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{post.itemTitle}</h4>
                  <p className="text-xs text-slate-600 mt-1">{post.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-teal-600" />
                    <span>{post.area}, {post.city}</span>
                  </div>
                  <span className="font-semibold text-slate-800">By {post.user?.name}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Post Wish Modal */}
          {showPostModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Post to Community Wish Wall</h3>
                  <button onClick={() => setShowPostModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
                </div>

                <form onSubmit={handleCreateWishPost} className="my-4 space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Equipment Name Needed</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 16ft Aluminium Ladder or Video Rig"
                      value={wishTitle}
                      onChange={(e) => setWishTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Budget (₹/hr)</label>
                      <input
                        type="number"
                        value={wishBudget}
                        onChange={(e) => setWishBudget(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Hours)</label>
                      <input
                        type="number"
                        value={wishHours}
                        onChange={(e) => setWishHours(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Details & Location</label>
                    <textarea
                      rows={2}
                      placeholder="Describe what you need it for and when..."
                      value={wishDesc}
                      onChange={(e) => setWishDesc(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-primary text-white text-xs font-bold shadow-xs"
                  >
                    Post Request
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. DEMAND HEATMAP */}
      {activeTab === 'heatmap' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900">
                Neighborhood Equipment Demand Heatmap ({user.city})
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Aggregated borrowing demand intensity across neighborhoods. High-demand areas represent prime opportunities for lenders to earn.
            </p>

            <div className="space-y-3 pt-2">
              {heatmapHotspots.map((h, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                      <span>{h.area}</span>
                      <span className="text-teal-700">{h.demandScore}% Intensity</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${h.demandScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-500 shrink-0">
                    <div>{h.activeListings} items</div>
                    <div className="font-semibold text-teal-800">{h.topCategory}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>Community Sharing Champions</span>
          </h3>
          <p className="text-xs text-slate-500">
            Recognizing trusted neighbors who share resources, return equipment punctually, and save CO₂.
          </p>

          <div className="divide-y divide-slate-100">
            {leaderboard.map((sharer, idx) => (
              <div key={sharer.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-amber-100 text-amber-800 font-black' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <img
                    src={sharer.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sharer.name}`}
                    alt={sharer.name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">{sharer.name}</div>
                    <div className="text-[10px] text-slate-500">{sharer.area}, {sharer.city}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-emerald-700">{sharer.completedLendsCount} Lends</div>
                  <div className="text-[10px] text-teal-700 font-semibold">Trust: {sharer.trustScore}/100</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
