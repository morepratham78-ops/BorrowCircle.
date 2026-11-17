import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { User, Message } from '../types';
import {
  MessageSquare,
  Send,
  User as UserIcon,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  CheckCheck,
  Search,
  Paperclip,
  Smile,
  ChevronLeft,
  Calendar,
  ExternalLink,
  Shield,
  HelpCircle,
  X,
  Image as ImageIcon
} from 'lucide-react';

interface MessagesScreenProps {
  user: User;
  initialContactId?: string | null;
  onSelectItem?: (item: any) => void;
  onNavigateToRentals?: () => void;
  onNavigateToExplore?: () => void;
  onMessagesRead?: () => void;
}

export const MessagesScreen: React.FC<MessagesScreenProps> = ({
  user,
  initialContactId,
  onSelectItem,
  onNavigateToRentals,
  onNavigateToExplore,
  onMessagesRead
}) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeContact, setActiveContact] = useState<any | null>(null);
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'rentals' | 'unread'>('all');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = async () => {
    try {
      const res = await api.getConversations();
      const list = res.conversations || [];
      setConversations(list);

      if (initialContactId) {
        const found = list.find((c: any) => c.contact.id === initialContactId);
        if (found) {
          setActiveContact(found.contact);
          if (found.booking) setActiveBooking(found.booking);
        } else {
          setActiveContact({ id: initialContactId, name: 'Lender / Borrower', area: user.area, city: user.city });
        }
      } else if (list.length > 0 && !activeContact) {
        setActiveContact(list[0].contact);
        if (list[0].booking) setActiveBooking(list[0].booking);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [initialContactId]);

  useEffect(() => {
    if (!activeContact) return;

    const fetchMessages = async () => {
      try {
        const res = await api.getMessages(activeContact.id);
        setMessages(res.messages || []);
        if (res.booking) {
          setActiveBooking(res.booking);
        }
        onMessagesRead?.();
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [activeContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string, mediaUrl?: string) => {
    const text = textToSend || inputText;
    if ((!text.trim() && !mediaUrl) || !activeContact) return;

    setSending(true);
    try {
      await api.sendMessage(activeContact.id, text.trim() || '📷 [Attached Photo]', activeBooking?.id, mediaUrl);
      setInputText('');
      setPreviewMediaUrl(null);
      setShowEmojiPicker(false);
      const res = await api.getMessages(activeContact.id);
      setMessages(res.messages || []);
      fetchConversations();
      onMessagesRead?.();
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create local object URL for instant high-quality handover photo attachment
      const localUrl = URL.createObjectURL(file);
      setPreviewMediaUrl(localUrl);
    }
  };

  // Contextual Quick Action Handover & Coordination Pills
  const quickPills = [
    '📍 What is the pickup landmark?',
    '⏱️ Is this available today?',
    '🚗 I have arrived at the gate!',
    '🔄 Can I extend the rental by 2 hours?',
    '🔋 Is the equipment battery fully charged?',
    '🤝 Handover confirmed! Thanks a lot.'
  ];

  // Quick Emoji reactions/insert
  const quickEmojis = ['👍', '📍', '🤝', '⏱️', '⚡', '✅', '🙏', '😊', '📦', '⭐'];

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.booking?.item?.title && c.booking.item.title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterTab === 'rentals') return Boolean(c.booking);
    if (filterTab === 'unread') return Boolean(c.unread);
    return true;
  });

  return (
    <div className="w-full h-full min-h-0 bg-white rounded-2xl border border-[#E5E9ED] shadow-sm flex overflow-hidden">
      {/* 1. LEFT PANEL: Conversations Sidebar */}
      <div
        className={`w-full md:w-80 lg:w-92 border-r border-[#E5E9ED] flex flex-col h-full bg-[#FAFBFB] shrink-0 ${
          activeContact ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#E5E9ED] bg-white shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-[#003B3B] flex items-center gap-2 tracking-tight">
              <MessageSquare className="w-5 h-5 text-[#16D9CC]" />
              <span>Messages</span>
            </h2>
            {conversations.length > 0 && (
              <span className="text-xs font-bold text-[#003B3B] bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                {conversations.length} Active
              </span>
            )}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#718096] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chats or equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-[#F5F7F8] border border-[#E5E9ED] focus:border-[#003B3B] rounded-xl text-xs sm:text-sm text-[#102A2A] placeholder:text-[#718096] focus:bg-white focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-[#F5F7F8] rounded-lg text-xs font-semibold">
            {[
              { id: 'all', label: 'All Chats' },
              { id: 'rentals', label: 'Rentals' },
              { id: 'unread', label: 'Unread' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`flex-1 py-1 px-2 rounded-md transition-all cursor-pointer text-center truncate ${
                  filterTab === tab.id
                    ? 'bg-white text-[#003B3B] shadow-2xs font-bold'
                    : 'text-[#718096] hover:text-[#102A2A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E5E9ED]/60">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#102A2A]">No conversations found</p>
              <p className="text-[11px] text-[#718096] mt-1">
                {searchQuery ? 'Try another search term' : 'When you rent or lend equipment, messages appear here.'}
              </p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = activeContact?.id === c.contact.id;
              return (
                <div
                  key={c.contact.id}
                  onClick={() => {
                    setActiveContact(c.contact);
                    if (c.booking) setActiveBooking(c.booking);
                  }}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-teal-50/80 border-l-4 border-[#003B3B] shadow-2xs'
                      : 'hover:bg-slate-100/60'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={c.contact.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.contact.name)}`}
                      alt={c.contact.name}
                      className="w-11 h-11 rounded-full object-cover border border-[#E5E9ED] bg-white shadow-2xs"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="text-sm sm:text-base font-bold text-[#102A2A] truncate flex items-center gap-1.5">
                        <span className="truncate">{c.contact.name}</span>
                        {c.contact.trustScore >= 80 && (
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-[#718096] font-medium shrink-0 ml-1">
                        {new Date(c.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className={`text-xs sm:text-sm truncate leading-relaxed ${c.unread ? 'font-bold text-[#003B3B]' : 'text-[#718096]'}`}>
                      {c.lastMessage}
                    </div>

                    {c.booking && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200/50 truncate max-w-full">
                        <span>📦</span>
                        <span className="truncate">{c.booking.item?.title || 'Equipment Rental'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. RIGHT PANEL: Active Chat Workspace */}
      {activeContact ? (
        <div className="flex-1 flex flex-col h-full min-w-0 bg-white relative">
          {/* A. Conversation Header */}
          <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-[#E5E9ED] flex items-center justify-between bg-white shrink-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Back Button */}
              <button
                onClick={() => setActiveContact(null)}
                className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                title="Back to conversations"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="relative shrink-0">
                <img
                  src={activeContact.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(activeContact.name)}`}
                  alt={activeContact.name}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-[#E5E9ED] bg-white shadow-2xs"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-[#102A2A] truncate">
                    {activeContact.name}
                  </h3>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
                <div className="text-[11px] sm:text-xs text-[#718096] flex items-center gap-1.5 truncate">
                  <span className="truncate">{activeContact.area ? `${activeContact.area}, ` : ''}{activeContact.city || user.city}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">Active now</span>
                </div>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {activeBooking?.item && (
                <button
                  onClick={() => onSelectItem && onSelectItem(activeBooking.item)}
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E9ED] bg-[#F5F7F8] hover:bg-slate-100 text-xs font-bold text-[#003B3B] transition-colors cursor-pointer"
                  title="View Equipment Specifications"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#16D9CC]" />
                  <span>View Equipment</span>
                </button>
              )}

              <button
                onClick={() => setShowProfileModal(true)}
                className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100/70 text-teal-800 text-xs font-bold border border-teal-200/60 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-teal-600" />
                <span className="hidden sm:inline">Trust: </span>
                <span>{activeContact.trustScore || 96}/100</span>
              </button>
            </div>
          </div>

          {/* B. Compact Rental Context Card (Sticky under header) */}
          {activeBooking?.item && (
            <div className="px-4 py-2.5 sm:px-6 bg-[#F5F7F8] border-b border-[#E5E9ED] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={
                    activeBooking.item.images?.[0]?.url ||
                    'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=300&q=80'
                  }
                  alt={activeBooking.item.title}
                  className="w-11 h-11 rounded-lg object-cover border border-[#E5E9ED] bg-white shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-[#102A2A] truncate">
                      {activeBooking.item.title}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                      {activeBooking.status || 'CONFIRMED'}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#718096] flex items-center gap-2 mt-0.5">
                    <span className="font-extrabold text-[#003B3B]">₹{activeBooking.hourlyRate || activeBooking.item.hourlyRate}/hr</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-bold">Zero Deposit</span>
                    <span>•</span>
                    <span className="truncate">{activeBooking.durationHours ? `${activeBooking.durationHours}h rental` : 'Dual-OTP protected'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectItem && onSelectItem(activeBooking.item)}
                  className="text-xs font-bold text-[#003B3B] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Specs</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                {onNavigateToRentals && (
                  <button
                    onClick={onNavigateToRentals}
                    className="px-2.5 py-1 text-xs font-bold rounded bg-[#003B3B] text-white hover:bg-[#002b2b] transition-colors cursor-pointer"
                  >
                    Booking Details
                  </button>
                )}
              </div>
            </div>
          )}

          {/* C. Message History - Independently Scrollable & Proportional */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FAFBFB]/50">
            {messages.length === 0 ? (
              <div className="py-16 text-center max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-3 text-teal-600">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-[#102A2A]">Direct Neighbor Handover Chat</h4>
                <p className="text-sm text-[#718096] mt-1 leading-relaxed">
                  Send a message below to coordinate exact equipment pickup timing, gate directions, or ask about usage guidelines.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.senderId === user.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[72%] rounded-3xl px-5 py-3.5 text-base sm:text-lg leading-relaxed shadow-xs ${
                        isMe
                          ? 'bg-[#002f34] text-white rounded-br-xs'
                          : 'bg-white text-[#102A2A] border border-slate-200 rounded-bl-xs'
                      }`}
                    >
                      {/* Attached Media Image if present */}
                      {m.mediaUrl && (
                        <div className="mb-2.5 rounded-2xl overflow-hidden border border-white/20">
                          <img
                            src={m.mediaUrl}
                            alt="Attached Handover Photo"
                            className="max-h-64 w-full object-cover"
                          />
                        </div>
                      )}
                      <div className="whitespace-pre-wrap break-words font-medium">{m.content}</div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-[#718096] mt-1 px-1 font-medium">
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && (
                        <span title="Read by recipient" className="inline-flex items-center ml-1">
                          <CheckCheck className="w-4 h-4 text-[#16D9CC]" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* D. Contextual Quick Actions */}
          <div className="px-4 py-2 border-t border-[#E5E9ED]/80 flex gap-2 overflow-x-auto no-scrollbar bg-[#FAFBFB] shrink-0">
            {quickPills.map((pill, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(pill)}
                className="px-3.5 py-1.5 rounded-full bg-white border border-[#E5E9ED] hover:border-[#002f34] hover:text-[#002f34] text-[#718096] text-xs sm:text-sm font-semibold shrink-0 transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Image Attachment Preview */}
          {previewMediaUrl && (
            <div className="px-5 py-2.5 bg-teal-50 border-t border-teal-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <img src={previewMediaUrl} alt="Preview" className="w-12 h-12 rounded-xl object-cover border" />
                <span className="text-xs sm:text-sm font-semibold text-teal-900">Equipment photo attached</span>
              </div>
              <button
                onClick={() => setPreviewMediaUrl(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <div className="px-5 py-2.5 bg-white border-t border-[#E5E9ED] flex items-center gap-2.5 shrink-0">
              <span className="text-xs font-bold text-[#718096] uppercase mr-1">Quick Emojis:</span>
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setInputText((prev) => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="text-xl hover:scale-125 transition-transform cursor-pointer p-1.5"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* E. Fixed Large Message Composer - Expanded Text Box & Always Fully Visible */}
          <div className="p-3 sm:p-4 border-t-2 border-slate-200 bg-white flex items-end gap-2 sm:gap-3 shrink-0 shadow-sm z-10">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Left Attachment Buttons */}
            <div className="flex items-center gap-1 pb-0.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-[#718096] hover:text-[#002f34] bg-[#F5F7F8] hover:bg-slate-200/80 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title="Attach Handover Inspection Photo"
              >
                <Paperclip className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-[#718096] hover:text-[#002f34] bg-[#F5F7F8] hover:bg-slate-200/80 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title="Insert Emoji"
              >
                <Smile className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Enlarged Text Box - Auto-Sizing Textarea for Comfortable Reading & Writing */}
            <div className="flex-1 min-w-0">
              <textarea
                placeholder="Type your message, ask questions, or coordinate handover details..."
                value={inputText}
                rows={1}
                onChange={(e) => {
                  setInputText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(undefined, previewMediaUrl || undefined);
                  }
                }}
                className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-[#F5F7F8] border-2 border-slate-200 focus:border-[#002f34] rounded-2xl text-base sm:text-lg text-[#102A2A] placeholder:text-[#718096] placeholder:text-sm sm:placeholder:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002f34]/15 transition-all font-medium min-h-[52px] sm:min-h-[58px] max-h-36 resize-none leading-relaxed"
              />
            </div>

            {/* Send Button */}
            <div className="pb-0.5">
              <button
                onClick={() => handleSendMessage(undefined, previewMediaUrl || undefined)}
                disabled={sending || (!inputText.trim() && !previewMediaUrl)}
                className="px-5 sm:px-7 h-[52px] sm:h-[58px] rounded-2xl bg-[#002f34] hover:bg-[#003B3B] text-white shadow-md disabled:opacity-40 transition-all flex items-center gap-2 cursor-pointer shrink-0 font-bold text-sm sm:text-base active:scale-95"
              >
                <span>Send</span>
                <Send className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* F. Better Empty State When No Chat is Selected */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FAFBFB]">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200/70 flex items-center justify-center mb-4 text-[#003B3B] shadow-xs">
            <MessageSquare className="w-8 h-8 text-[#003B3B]" />
          </div>
          <h3 className="text-lg font-black text-[#003B3B] tracking-tight">Direct Equipment Sharing Messages</h3>
          <p className="text-xs sm:text-sm text-[#718096] mt-1.5 max-w-sm leading-relaxed">
            Select a conversation on the left to coordinate equipment handover, confirm pickup timing, or ask neighbors about tools.
          </p>
          {onNavigateToExplore && (
            <button
              onClick={onNavigateToExplore}
              className="mt-6 px-6 py-2.5 rounded-xl bg-[#003B3B] hover:bg-[#002b2b] text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Explore Equipment Catalog</span>
              <ExternalLink className="w-4 h-4 text-[#16D9CC]" />
            </button>
          )}
        </div>
      )}

      {/* User Profile Modal */}
      {showProfileModal && activeContact && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase text-slate-400">Neighbor Trust Card</span>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center">
              <img
                src={activeContact.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(activeContact.name)}`}
                alt={activeContact.name}
                className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-teal-500 shadow-md mb-3"
              />
              <h4 className="text-base font-extrabold text-[#003B3B] flex items-center justify-center gap-1.5">
                <span>{activeContact.name}</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">{activeContact.area || 'Indiranagar'}, {activeContact.city || user.city}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-left">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Trust Score</div>
                  <div className="text-base font-black text-emerald-700">{activeContact.trustScore || 96}/100</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Handover Safety</div>
                  <div className="text-xs font-black text-slate-800 mt-1">Dual-OTP</div>
                </div>
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-900 font-medium text-left flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-700 shrink-0" />
                <span>Identity verified via Aadhaar & mobile OTP.</span>
              </div>

              <button
                onClick={() => setShowProfileModal(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-[#003B3B] text-white font-bold text-xs hover:bg-[#002b2b] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};