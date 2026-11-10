'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { supabaseSync } from '@/lib/supabase-sync';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, Send, MessageCircle, Users, Circle, UserPlus,
  Paperclip, Image, Video, Mic, FileText, X, Download, Play, ZoomIn
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MediaPayload {
  url: string;
  name: string;
  size: number;
  type: string;
  text?: string;
}

interface ParsedMessage {
  isMedia: boolean;
  text: string;
  media?: MediaPayload;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseMessageContent(content: string): ParsedMessage {
  if (!content.startsWith('{')) return { isMedia: false, text: content };
  try {
    const parsed = JSON.parse(content);
    if (parsed.media) return { isMedia: true, text: parsed.text || '', media: parsed.media };
  } catch {}
  return { isMedia: false, text: content };
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Media Display Component ──────────────────────────────────────────────────
function MediaMessage({ media }: { media: MediaPayload }) {
  const [lightbox, setLightbox] = useState(false);

  if (media.type.startsWith('image/')) {
    return (
      <>
        <div className="mt-1 cursor-pointer rounded-lg overflow-hidden max-w-[240px]" onClick={() => setLightbox(true)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.url} alt={media.name} className="w-full object-cover rounded-lg hover:opacity-90 transition-opacity" />
          <div className="flex items-center gap-1 mt-1 opacity-60 text-[10px]">
            <ZoomIn size={10} /> Click to enlarge
          </div>
        </div>
        {lightbox && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media.url} alt={media.name} className="max-w-full max-h-full rounded-lg shadow-2xl" />
            <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(false)}><X size={24}/></button>
          </div>
        )}
      </>
    );
  }

  if (media.type.startsWith('video/')) {
    return (
      <div className="mt-1 max-w-[280px]">
        <video controls className="w-full rounded-lg" preload="metadata">
          <source src={media.url} type={media.type} />
        </video>
        <p className="text-[10px] opacity-60 mt-1 truncate">{media.name}</p>
      </div>
    );
  }

  if (media.type.startsWith('audio/')) {
    return (
      <div className="mt-1 w-full max-w-[280px]">
        <div className="flex items-center gap-2 bg-black/10 rounded-lg px-3 py-2">
          <Play size={14} />
          <audio controls className="w-full h-8" preload="metadata">
            <source src={media.url} type={media.type} />
          </audio>
        </div>
        <p className="text-[10px] opacity-60 mt-1 truncate">{media.name}</p>
      </div>
    );
  }

  // Generic file
  return (
    <a
      href={media.url}
      download={media.name}
      target="_blank"
      rel="noreferrer"
      className="mt-1 flex items-center gap-3 bg-black/10 rounded-lg px-3 py-2.5 max-w-[260px] hover:bg-black/20 transition-colors"
    >
      <FileText size={20} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{media.name}</p>
        <p className="text-[10px] opacity-60">{formatFileSize(media.size)}</p>
      </div>
      <Download size={14} />
    </a>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChatPage() {
  const { currentUser, onlineUsers, messages, conversations } = useAppStore();
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversation');

  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [realtimeUnsubscribe, setRealtimeUnsubscribe] = useState<(() => void) | null>(null);

  // Media state
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ file: File; previewUrl: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profiles
  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);
    supabase.from('profiles').select('*').neq('id', currentUser.id).order('name')
      .then(({ data }) => { setProfiles(data || []); setIsLoading(false); });
  }, [currentUser]);

  // Load conversations
  useEffect(() => {
    if (!currentUser) return;
    supabaseSync.syncConversations().catch(() => toast.error('Unable to load chats'));
  }, [currentUser]);

  // Messages + realtime
  useEffect(() => {
    if (!selectedConversationId) return;
    supabaseSync.syncMessages(selectedConversationId).catch(() => toast.error('Unable to load messages'));
    if (realtimeUnsubscribe) realtimeUnsubscribe();
    const unsub = supabaseSync.subscribeToNewMessages(selectedConversationId, (newMsg) => {
      useAppStore.setState((state) => {
        if (state.messages.some(m => m.id === newMsg.id)) return state;
        return { messages: [...state.messages, newMsg] };
      });
    });
    setRealtimeUnsubscribe(() => unsub);
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  useEffect(() => {
    if (conversationIdFromUrl) {
      setSelectedConversationId(conversationIdFromUrl);
      supabaseSync.syncMessages(conversationIdFromUrl);
    }
  }, [conversationIdFromUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── File picker handler ──
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPendingMedia({ file, previewUrl });
    setShowMediaMenu(false);
    e.target.value = '';
  }, []);

  // ── Send (text or media) ──
  const handleSendMessage = async () => {
    if (!selectedConversationId) return;
    if (!messageInput.trim() && !pendingMedia) return;

    const content = messageInput;
    setMessageInput('');

    try {
      if (pendingMedia) {
        setIsUploading(true);
        // Simulate progress ticks
        const interval = setInterval(() => setUploadProgress(p => Math.min(p + 15, 85)), 300);
        const mediaData = await supabaseSync.uploadChatMedia(selectedConversationId, pendingMedia.file);
        clearInterval(interval);
        setUploadProgress(100);
        await supabaseSync.sendMessage(selectedConversationId, content, mediaData);
        URL.revokeObjectURL(pendingMedia.previewUrl);
        setPendingMedia(null);
        setUploadProgress(0);
        setIsUploading(false);
      } else {
        await supabaseSync.sendMessage(selectedConversationId, content);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to send';
      toast.error(msg);
      setMessageInput(content);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleStartDirectChat = async (otherUserId: string) => {
    try {
      const convId = await supabaseSync.getOrCreateDirectConversation(otherUserId);
      if (convId) { setSelectedConversationId(convId); setSearchTerm(''); }
      else toast.error('Could not start chat');
    } catch { toast.error('Could not start chat'); }
  };

  const filteredConversations = conversations.filter(conv => {
    if (conv.isGroup) return conv.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return (conv.otherUser?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const otherParticipantId = selectedConversation?.participants?.find((id: string) => id !== currentUser?.id);
  const otherUser = selectedConversation?.otherUser || profiles.find(p => p.id === otherParticipantId);

  const mediaMenuItems = [
    { label: 'Image', icon: <Image size={18} className="text-blue-500" />, ref: imageInputRef, accept: 'image/*' },
    { label: 'Video', icon: <Video size={18} className="text-purple-500" />, ref: videoInputRef, accept: 'video/*' },
    { label: 'Audio', icon: <Mic size={18} className="text-green-500" />, ref: audioInputRef, accept: 'audio/*' },
    { label: 'File', icon: <FileText size={18} className="text-orange-500" />, ref: fileInputRef, accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar' },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* Hidden file inputs */}
      {mediaMenuItems.map(item => (
        <input key={item.label} ref={item.ref} type="file" accept={item.accept} className="hidden" onChange={handleFileSelect} />
      ))}

      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground">Real-time collaboration with faculty and students</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <Card className="md:col-span-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border space-y-3 bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
              <Input placeholder="Search conversations..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} className="pl-10 text-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredConversations.length > 0 ? (
              filteredConversations.map(conv => {
                const displayName = conv.isGroup ? conv.name : (conv.otherUser?.name || 'Loading...');
                const userRole = !conv.isGroup && conv.otherUser?.role;
                return (
                  <button key={conv.id} onClick={() => setSelectedConversationId(conv.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 ${
                      selectedConversationId === conv.id ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted'
                    }`}>
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center flex-shrink-0">
                        {conv.isGroup ? <Users size={18} /> : <span className="text-sm font-bold text-white">{displayName?.charAt(0) || '?'}</span>}
                      </div>
                      {!conv.isGroup && onlineUsers?.includes(otherParticipantId || '') && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{displayName}</p>
                      <p className="text-[10px] opacity-70 capitalize">{conv.isGroup ? 'Group Chat' : (userRole || 'User')}</p>
                      {conv.lastMessage && (
                        <p className="text-xs truncate mt-1 opacity-70">{conv.lastMessage.substring(0, 50)}</p>
                      )}
                    </div>
                  </button>
                );
              })
            ) : searchTerm.length > 0 ? (
              <div className="p-4 space-y-4">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Start a new chat</p>
                {profiles.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(profile => (
                  <button key={profile.id} onClick={() => handleStartDirectChat(profile.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-all flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{profile.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{profile.name}</p>
                      <p className="text-[10px] opacity-70 capitalize">{profile.role}</p>
                    </div>
                    <UserPlus size={16} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-[10px] text-muted-foreground mt-2">Search for someone to start chatting!</p>
              </div>
            )}
          </div>
        </Card>

        {/* Chat Area */}
        {selectedConversationId ? (
          <Card className="md:col-span-2 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center">
                  {selectedConversation?.isGroup ? <Users size={18} /> : <span className="font-bold text-white">{otherUser?.name?.charAt(0) || '?'}</span>}
                </div>
                <div>
                  <h2 className="font-bold text-foreground leading-none">
                    {selectedConversation?.isGroup ? selectedConversation.name : otherUser?.name}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    {!selectedConversation?.isGroup && onlineUsers?.includes(otherParticipantId || '') ? (
                      <><Circle size={8} className="fill-green-500 text-green-500" /><span className="text-[10px] text-green-500 font-medium">Online now</span></>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{selectedConversation?.isGroup ? 'Group conversation' : 'User'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-transparent to-muted/5">
              {messages.length > 0 ? messages.map(msg => {
                const isMine = msg.senderId === currentUser?.id;
                const senderName = msg.sender?.name || (isMine ? currentUser?.name : otherUser?.name);
                const parsed = parseMessageContent(msg.content);
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {selectedConversation?.isGroup && !isMine && (
                      <span className="text-[10px] text-muted-foreground mb-1 ml-1">{senderName}</span>
                    )}
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl shadow-sm ${
                      isMine ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card border border-border text-foreground rounded-tl-none'
                    }`}>
                      {parsed.text && <p className="text-sm leading-relaxed">{parsed.text}</p>}
                      {parsed.isMedia && parsed.media && <MediaMessage media={parsed.media} />}
                      <div className={`flex items-center gap-1 mt-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[9px] opacity-60">{format(new Date(msg.createdAt), 'h:mm a')}</span>
                        {isMine && msg.read && <span className="text-[9px] opacity-60">✓✓</span>}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 space-y-3">
                  <MessageCircle size={48} strokeWidth={1} />
                  <p className="text-sm">No messages yet. Send a greeting!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="px-4 py-2 bg-primary/5 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span>Uploading {pendingMedia?.file.name}...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Pending Media Preview */}
            {pendingMedia && !isUploading && (
              <div className="px-4 py-2 bg-muted/30 border-t border-border">
                <div className="flex items-center gap-3">
                  {pendingMedia.file.type.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pendingMedia.previewUrl} alt="preview" className="w-16 h-16 rounded-lg object-cover" />
                  ) : pendingMedia.file.type.startsWith('video/') ? (
                    <video src={pendingMedia.previewUrl} className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      <FileText size={24} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pendingMedia.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(pendingMedia.file.size)}</p>
                  </div>
                  <button onClick={() => { URL.revokeObjectURL(pendingMedia.previewUrl); setPendingMedia(null); }}
                    className="text-muted-foreground hover:text-destructive transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-muted/30">
              <div className="flex gap-2 max-w-4xl mx-auto items-end relative">
                {/* Paperclip Button */}
                <div className="relative">
                  <Button variant="ghost" size="icon" type="button"
                    onClick={() => setShowMediaMenu(v => !v)}
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0">
                    <Paperclip size={18} />
                  </Button>
                  {/* Media Menu Popup */}
                  {showMediaMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMediaMenu(false)} />
                      <div className="absolute bottom-12 left-0 z-20 bg-card border border-border rounded-xl shadow-xl p-2 flex flex-col gap-1 w-36">
                        {mediaMenuItems.map(item => (
                          <button key={item.label} type="button"
                            onClick={() => { setShowMediaMenu(false); item.ref.current?.click(); }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium text-foreground transition-colors">
                            {item.icon}
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <Input
                  placeholder={pendingMedia ? 'Add a caption...' : 'Type your message...'}
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  className="flex-1 bg-background border-muted-foreground/20 focus:ring-primary/20"
                  disabled={isUploading}
                />
                <Button onClick={handleSendMessage} size="icon"
                  disabled={isUploading || (!messageInput.trim() && !pendingMedia)}
                  className="shadow-lg hover:scale-105 transition-transform flex-shrink-0">
                  <Send size={18} />
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="md:col-span-2 flex items-center justify-center bg-muted/10 border-dashed border-2">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <MessageCircle className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Select a chat</p>
                <p className="text-sm text-muted-foreground">Choose a person or group to start collaborating</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}