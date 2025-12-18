import React, { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { AppMode, GestureState } from '../types';

interface GestureControllerProps {
  onStateChange: (state: Partial<GestureState>) => void;
  onModeTrigger: (mode: AppMode) => void;
}

export const GestureController: React.FC<GestureControllerProps> = ({ onStateChange, onModeTrigger }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stateHistory = useRef({ pinchCount: 0, openCount: 0 });

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let requestId: number;
    let isMounted = true;
    
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
        );
        
        const delegate = isMobile ? "CPU" : "GPU";
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: delegate
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.3, // Lowered for faster detection on Android
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3
        });

        if (isMounted) startCamera(handLandmarker);
      } catch (err) {
        console.error("MediaPipe Init Error:", err);
      }
    };

    const startCamera = async (landmarker: HandLandmarker) => {
      if (!videoRef.current) return;
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          } 
        });
        
        videoRef.current.srcObject = stream;
        
        // Ensure play() is called and resolved before starting detection
        await videoRef.current.play();
        
        // Use requestVideoFrameCallback if available (Chrome Android)
        if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
          const processFrame = () => {
            if (!isMounted) return;
            predictWebcam(landmarker);
            (videoRef.current as any).requestVideoFrameCallback(processFrame);
          };
          (videoRef.current as any).requestVideoFrameCallback(processFrame);
        } else {
          // Fallback for Safari/iOS
          const frameLoop = () => {
            if (!isMounted) return;
            predictWebcam(landmarker);
            requestId = requestAnimationFrame(frameLoop);
          };
          requestId = requestAnimationFrame(frameLoop);
        }
      } catch (err) {
        console.error("Camera Access Error:", err);
      }
    };

    const predictWebcam = (landmarker: HandLandmarker) => {
      if (!videoRef.current || !isMounted || videoRef.current.readyState < 2) return;
      
      const now = performance.now();
      try {
        const results = landmarker.detectForVideo(videoRef.current, now);

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          const palmSize = Math.hypot(landmarks[0].x - landmarks[9].x, landmarks[0].y - landmarks[9].y);
          const pinchDist = Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y);
          const currentPinch = pinchDist < (palmSize * 0.65); 

          const tips = [8, 12, 16, 20].map(i => landmarks[i]);
          const avgTipDist = tips.reduce((acc, t) => acc + Math.hypot(t.x - landmarks[0].x, t.y - landmarks[0].y), 0) / 4;
          const currentOpen = avgTipDist > (palmSize * 1.8);

          if (currentPinch) stateHistory.current.pinchCount++; else stateHistory.current.pinchCount = 0;
          if (currentOpen) stateHistory.current.openCount++; else stateHistory.current.openCount = 0;

          const isPinching = stateHistory.current.pinchCount >= 2;
          const isOpen = stateHistory.current.openCount >= 2;
          const handX = 1.0 - landmarks[9].x; 

          onStateChange({
            isHandDetected: true,
            isPinching,
            isOpen,
            handPosition: { x: handX, y: landmarks[9].y },
            rotationOffset: (handX - 0.5) * 2
          });

          if (isPinching) onModeTrigger(AppMode.TREE);
          else if (isOpen) onModeTrigger(AppMode.EXPLODE);
        } else {
          onStateChange({ isHandDetected: false });
          stateHistory.current.pinchCount = 0;
          stateHistory.current.openCount = 0;
        }
      } catch (e) {
        // Handle sync errors gracefully
      }
    };

    setupMediaPipe();

    return () => {
      isMounted = false;
      cancelAnimationFrame(requestId);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      if (handLandmarker) handLandmarker.close();
    };
  }, [onStateChange, onModeTrigger]);

  return (
    <div className="fixed -top-full -left-full w-1 h-1 opacity-0 pointer-events-none z-0 overflow-hidden">
        <video 
            ref={videoRef} 
            className="w-full h-full object-cover scale-x-[-1]" 
            autoPlay 
            playsInline 
            muted 
        />
    </div>
  );
};