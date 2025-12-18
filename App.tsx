import React, { useState, useCallback, useEffect } from "react";
import * as THREE from "three";
import { supabase } from "./services/supabase";

import { Scene } from "./components/Scene";
import { ChristmasTree } from "./components/ChristmasTree";
import { GestureController } from "./components/GestureController";
import { WishSystem, FloatingWishes } from "./components/WishSystem";
import { WishUI } from "./components/WishUI";
import { AppMode, GestureState, Wish } from "./types";
import { COMMUNITY_WISHES } from "./services/communityWishes";

const STORAGE_KEY = "cyberpink_wishes_history_v2";

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.TREE);
  const [gestureState, setGestureState] = useState<GestureState>({
    isHandDetected: false,
    isPinching: false,
    isOpen: false,
    handPosition: { x: 0.5, y: 0.5 },
    rotationOffset: 0,
  });

  const [userLocation, setUserLocation] = useState<string>("Earth");
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [floatingWishes, setFloatingWishes] = useState<Wish[]>([]);
  const [flashTrigger, setFlashTrigger] = useState(0);

  // ---------- Location ----------
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const response = await fetch("https://get.geojs.io/v1/ip/geo.json");
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

  // ---------- Helpers ----------
  const toWish = useCallback((text: string, index: number): Wish => {
    return {
      id: `global-${index}-${Date.now()}-${Math.random()}`,
      text,
      startTime: 0,
      startPos: new THREE.Vector3(0, -8, 10),
      controlPos: new THREE.Vector3((Math.random() - 0.5) * 15, 0, 10),
      endPos: new THREE.Vector3(0, 5.5, 0),
    };
  }, []);

  // Pick up to 5 wishes, prefer different cities (your original idea)
  const pickFiveFromPool = useCallback((pool: string[]) => {
    const cityMap = new Map<string, string[]>();

    pool.forEach((item) => {
      const match = item.match(/User from (.*?):/);
      const city = match ? match[1] : "Earth";
      if (!cityMap.has(city)) cityMap.set(city, []);
      cityMap.get(city)!.push(item);
    });

    const selected: string[] = [];
    const cities = Array.from(cityMap.keys()).sort(() => Math.random() - 0.5);

    for (const city of cities) {
      if (selected.length >= 5) break;
      const arr = cityMap.get(city)!;
      selected.push(arr[Math.floor(Math.random() * arr.length)]);
    }

    if (selected.length < 5) {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      for (const item of shuffled) {
        if (selected.length >= 5) break;
        if (!selected.includes(item)) selected.push(item);
      }
    }

    return selected;
  }, []);

  // ---------- Refresh Wishes (Supabase first, fallback to local + community) ----------
  const handleRefreshWishes = useCallback(async () => {
    // 1) Try Supabase (real shared data)
    try {
      const { data, error } = await supabase
        .from("wishes")
        .select("wish, city, created_at")
        .order("created_at", { ascending: false })
        .limit(60);

      if (!error && data && data.length > 0) {
        const supabasePool = data
          .map((r) => `User from ${r.city ?? "Earth"}:\n${r.wish ?? ""}`)
          .filter((t) => t.trim().length > 0);

        const selected = pickFiveFromPool(supabasePool);
        setFloatingWishes(selected.map((t, i) => toWish(t, i)));
        return;
      }

      if (error) {
        console.warn("Supabase fetch failed, fallback will be used:", error);
      } else {
        console.warn("Supabase returned 0 rows, fallback will be used.");
      }
    } catch (e) {
      console.warn("Supabase fetch exception, fallback will be used:", e);
    }

    // 2) Fallback = localStorage + COMMUNITY_WISHES
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const localHistory: string[] = stored ? JSON.parse(stored) : [];
      const fallbackPool = [...localHistory, ...COMMUNITY_WISHES];

      const selected = pickFiveFromPool(fallbackPool);
      setFloatingWishes(selected.map((t, i) => toWish(t, i)));
    } catch (e) {
      console.error("Failed to load/refresh fallback wishes", e);
      // 3) last resort fallback: just COMMUNITY_WISHES
      const selected = pickFiveFromPool([...COMMUNITY_WISHES]);
      setFloatingWishes(selected.map((t, i) => toWish(t, i)));
    }
  }, [pickFiveFromPool, toWish]);

  // auto load on page open
  useEffect(() => {
    handleRefreshWishes();
  }, [handleRefreshWishes]);

  // ---------- Mode / Gesture ----------
  const toggleMode = () => {
    setMode((prev) => (prev === AppMode.TREE ? AppMode.EXPLODE : AppMode.TREE));
  };

  const handleGestureStateChange = useCallback((newState: Partial<GestureState>) => {
    setGestureState((prev) => ({ ...prev, ...newState }));
  }, []);

  const handleModeTrigger = useCallback((newMode: AppMode) => {
    setMode(newMode);
  }, []);

  // ---------- Submit Wish (local animation + local history + Supabase insert) ----------
  const handleSendWish = useCallback(
    async (text: string) => {
      const id = Math.random().toString(36).substr(2, 9);
      const formattedText = `User from ${userLocation}:\n${text}`;

      // show instantly in 3D (your original behavior)
      const newWish: Wish = {
        id,
        text: formattedText,
        startTime: 0,
        startPos: new THREE.Vector3(0, -8, 10),
        controlPos: new THREE.Vector3((Math.random() - 0.5) * 15, 0, 10),
        endPos: new THREE.Vector3(0, 5.5, 0),
      };
      setWishes((prev) => [...prev, newWish]);

      // keep local history (optional)
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const history: string[] = stored ? JSON.parse(stored) : [];
        const newHistory = [formattedText, ...history].slice(0, 50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      } catch (e) {
        console.error("Save failed", e);
      }

      // write to Supabase (real shared data)
      try {
        const { error } = await supabase.from("wishes").insert([
          {
            wish: text, // store raw user input
            city: userLocation,
            lang: "en",
            user_hash: "anon",
          },
        ]);

        if (error) {
          console.error("Supabase insert error:", error);
        } else {
          console.log("Supabase insert success ✅");
          // refresh wall after submit so others can see it (and you can too)
          handleRefreshWishes();
        }
      } catch (err) {
        console.error("Supabase insert exception:", err);
      }
    },
    [userLocation, handleRefreshWishes]
  );

  // ---------- Wish completion / clear ----------
  const handleWishComplete = useCallback((completedWish: Wish) => {
    setWishes((prev) => prev.filter((w) => w.id !== completedWish.id));
    setFloatingWishes((prev) => {
      const next = [...prev, completedWish];
      return next.length > 15 ? next.slice(next.length - 15) : next;
    });
    setFlashTrigger((prev) => prev + 1);
  }, []);

  const handleClearWishes = useCallback(() => {
    setWishes([]);
    setFloatingWishes([]);
  }, []);

  // ---------- Render ----------
  return (
    <div className="relative w-full min-h-[100dvh]">
      {/* 3D BACKGROUND LAYER */}
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

      {/* UI OVERLAY LAYER */}
      <div className="relative z-10 w-full min-h-[100dvh] flex flex-col items-center">
        <header className="w-full flex flex-col items-start px-8 pt-12 md:pt-20 pointer-events-none">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl landscape:text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-pink-300 via-pink-100 to-white drop-shadow-[0_4px_12px_rgba(255,105,180,0.6)] leading-tight">
            Merry Christmas,<br />Make a Wish
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

        <div
          className="w-full h-[50vh] md:h-[75vh] landscape:h-[40vh] cursor-pointer"
          onClick={toggleMode}
        />

        <footer className="w-full pt-12 pb-20">
          <WishUI
            onSendWish={handleSendWish}
            onClearWishes={handleClearWishes}
            onRefreshWishes={handleRefreshWishes}
          />
        </footer>
      </div>

      <GestureController onStateChange={handleGestureStateChange} onModeTrigger={handleModeTrigger} />
    </div>
  );
}

export default App;
