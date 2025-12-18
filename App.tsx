import { supabase } from "./services/supabase";
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Scene } from './components/Scene';
import { ChristmasTree } from './components/ChristmasTree';
import { GestureController } from './components/GestureController';
import { WishSystem, FloatingWishes } from './components/WishSystem';
import { WishUI } from './components/WishUI';
import { AppMode, GestureState, Wish } from './types';
import { COMMUNITY_WISHES } from './services/communityWishes';
import * as THREE from 'three';

const STORAGE_KEY = 'cyberpink_wishes_history_v2';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.TREE);
  const [gestureState, setGestureState] = useState<GestureState>({
    isHandDetected: false,
    isPinching: false,
    isOpen: false,
    handPosition: { x: 0.5, y: 0.5 },
    rotationOffset: 0
  });

  const [userLocation, setUserLocation] = useState<string>("Earth");
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [floatingWishes, setFloatingWishes] = useState<Wish[]>([]);
  const [flashTrigger, setFlashTrigger] = useState(0);
  
  useEffect(() => {
    const fetchLocation = async () => {
        try {
            const response = await fetch('https://get.geojs.io/v1/ip/geo.json');
            if (response.ok) {
                const data = await response.json();
                setUserLocation(data.city || data.region || data.country || "Earth");
            }
        } catch (e) {
            console.warn("Location fetch failed", e);
        }
    };
    fetchLocation();
  }, []);

  const handleRefreshWishes = useCallback(() => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const localHistory: string[] = stored ? JSON.parse(stored) : [];
        const globalPool = [...localHistory, ...COMMUNITY_WISHES];
        const cityMap = new Map<string, string[]>();
        
        globalPool.forEach(item => {
            const match = item.match(/User from (.*?):/);
            const city = match ? match[1] : 'Earth';
            if (!cityMap.has(city)) cityMap.set(city, []);
            cityMap.get(city)!.push(item);
        });

        const selectedTexts: string[] = [];
        const cities = Array.from(cityMap.keys()).sort(() => Math.random() - 0.5);

        for (const city of cities) {
            if (selectedTexts.length >= 5) break;
            const cityWishes = cityMap.get(city)!;
            selectedTexts.push(cityWishes[Math.floor(Math.random() * cityWishes.length)]);
        }

        if (selectedTexts.length < 5) {
            const shuffledPool = globalPool.sort(() => Math.random() - 0.5);
            for (const item of shuffledPool) {
                if (selectedTexts.length >= 5) break;
                if (!selectedTexts.includes(item)) selectedTexts.push(item);
            }
        }

        const loadedWishes: Wish[] = selectedTexts.map((text, index) => ({
            id: `global-${index}-${Date.now()}-${Math.random()}`,
            text: text,
            startTime: 0,
            startPos: new THREE.Vector3(),
            controlPos: new THREE.Vector3(),
            endPos: new THREE.Vector3()
        }));
        
        setFloatingWishes(loadedWishes);
    } catch (e) {
        console.error("Failed to load/refresh global wishes", e);
    }
  }, []);

  useEffect(() => {
    handleRefreshWishes();
  }, [handleRefreshWishes]);

  const toggleMode = () => {
    setMode((prev) => (prev === AppMode.TREE ? AppMode.EXPLODE : AppMode.TREE));
  };

  const handleGestureStateChange = useCallback((newState: Partial<GestureState>) => {
    setGestureState((prev) => ({ ...prev, ...newState }));
  }, []);

  const handleModeTrigger = useCallback((newMode: AppMode) => {
    setMode(newMode);
  }, []);

  const handleSendWish = useCallback(async (text: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const formattedText = `User from ${userLocation}:\n${text}`;

    const newWish: Wish = {
      id,
      text: formattedText,
      startTime: 0, 
      startPos: new THREE.Vector3(0, -8, 10),
      controlPos: new THREE.Vector3((Math.random() - 0.5) * 15, 0, 10),
      endPos: new THREE.Vector3(0, 5.5, 0)
    };

    setWishes(prev => [...prev, newWish]);

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        let history: string[] = stored ? JSON.parse(stored) : [];
        const newHistory = [formattedText, ...history].slice(0, 50); 
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (e) {
        console.error("Save failed", e);
    }
      // ✅ Write to Supabase (real shared data)
    try {
      const { error } = await supabase.from("wishes").insert([
        {
          wish: text,            // 注意：这里存用户原始输入
          city: userLocation,    // 你也可以换成更具体的 city
          lang: "en",            // 你如果有语言变量就用变量
          user_hash: "anon",     // 没登录就写固定值或留空
        },
      ]);

      if (error) {
        console.error("Supabase insert error:", error);
      } else {
        console.log("Supabase insert success ✅");
      }
    } catch (err) {
      console.error("Supabase insert exception:", err);
    }
  
  }, [userLocation]);

  const handleWishComplete = useCallback((completedWish: Wish) => {
    setWishes(prev => prev.filter(w => w.id !== completedWish.id));
    setFloatingWishes(prev => {
        const next = [...prev, completedWish];
        return next.length > 15 ? next.slice(next.length - 15) : next;
    });
    setFlashTrigger(prev => prev + 1);
  }, []);

  const handleClearWishes = useCallback(() => {
    setWishes([]);
    setFloatingWishes([]);
  }, []);

  return (
    <div className="relative w-full min-h-[100dvh]">
      {/* 3D BACKGROUND LAYER - Using h-[100vh] instead of percentages to prevent jitter on scroll */}
      <div className="fixed inset-0 z-0 h-[100vh] w-full overflow-hidden">
        <Scene>
          <ChristmasTree 
            mode={mode} 
            gestureRotation={gestureState.rotationOffset}
            flashTrigger={flashTrigger}
          />
          <WishSystem wishes={wishes} onWishComplete={handleWishComplete} />
          <FloatingWishes wishes={floatingWishes} />
        </Scene>
      </div>

      {/* UI OVERLAY LAYER - This handles global scrolling */}
      <div className="relative z-10 w-full min-h-[100dvh] flex flex-col items-center">
        
        {/* HEADER - Restored full bold gradient font */}
        <header className="w-full flex flex-col items-start px-8 pt-12 md:pt-20 pointer-events-none">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl landscape:text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-pink-300 via-pink-100 to-white drop-shadow-[0_4px_12px_rgba(255,105,180,0.6)] leading-tight">
            Merry Christmas,<br/>Make a Wish
          </h1>
          
          <div className="mt-6 flex flex-col gap-1.5 opacity-90">
            <p className="text-white text-xs md:text-base font-bold tracking-[0.2em] uppercase drop-shadow-md">
              PINCH: ASSEMBLE
            </p>
            <p className="text-white text-xs md:text-base font-bold tracking-[0.2em] uppercase drop-shadow-md">
              OPEN: EXPLODE
            </p>
          </div>
        </header>

        {/* INTERACTIVE SPACER: Allows clicking through to the tree area and captures scroll */}
        <div 
          className="w-full h-[50vh] md:h-[75vh] landscape:h-[40vh] cursor-pointer" 
          onClick={toggleMode}
        />

        {/* FOOTER SECTION: Interaction Area. Gradient removed for total transparency on desktop. */}
        <footer className="w-full pt-12 pb-20">
          <WishUI 
            onSendWish={handleSendWish} 
            onClearWishes={handleClearWishes} 
            onRefreshWishes={handleRefreshWishes}
          />
        </footer>
      </div>

      <GestureController 
        onStateChange={handleGestureStateChange}
        onModeTrigger={handleModeTrigger}
      />
    </div>
  );
}

export default App;
