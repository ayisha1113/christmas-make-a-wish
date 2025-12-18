import React, { useState } from 'react';

interface WishUIProps {
  onSendWish: (text: string) => void;
  onClearWishes: () => void;
  onRefreshWishes: () => void;
}

export const WishUI: React.FC<WishUIProps> = ({ onSendWish, onClearWishes, onRefreshWishes }) => {
  const [wishText, setWishText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wishText.trim()) {
      onSendWish(wishText);
      setWishText('');
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 px-4 pb-16 lg:mt-24">
      {/* Control Buttons Container */}
      <div className="flex gap-4 mb-2">
        <button 
          onClick={onClearWishes}
          className="px-6 py-2.5 bg-black/70 border border-pink-500/50 text-[10px] md:text-xs uppercase tracking-[0.2em] text-pink-200 rounded-xl backdrop-blur-2xl transition-all active:scale-95 shadow-2xl hover:bg-pink-900/40 font-bold"
        >
          CLEAR SCREEN
        </button>

        <button 
          onClick={onRefreshWishes}
          className="px-6 py-2.5 bg-black/70 border border-pink-500/50 text-[10px] md:text-xs uppercase tracking-[0.2em] text-pink-300 rounded-xl backdrop-blur-2xl transition-all flex items-center gap-2 active:scale-95 shadow-2xl hover:bg-pink-900/40 font-bold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          SHUFFLE
        </button>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xl relative flex items-center shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(255,105,180,0.25)] rounded-2xl overflow-hidden group border border-pink-500/40">
        <input 
          type="text" 
          value={wishText}
          onChange={(e) => setWishText(e.target.value)}
          placeholder="Make a wish..."
          className="w-full bg-black/80 backdrop-blur-3xl border-none text-white placeholder-pink-200/40 py-5 md:py-6 pl-6 pr-24 focus:outline-none transition-all font-mono rounded-2xl text-base md:text-lg"
        />
        <button 
          type="submit"
          className="absolute right-0 top-0 bottom-0 px-8 text-pink-400 font-black hover:text-white transition-all uppercase text-sm active:bg-pink-500/20 tracking-widest"
        >
          SEND
        </button>
      </form>
    </div>
  );
};