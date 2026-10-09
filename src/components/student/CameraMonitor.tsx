"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, AlertTriangle, ShieldCheck, CameraOff } from "lucide-react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

export interface CameraMonitorProps {
  onWarning: (warningCount: number, message: string) => void;
  onMaxWarningsReached: () => void;
  isMonitoringActive: boolean;
  onCameraReady?: () => void;
}

export function CameraMonitor({
  onWarning,
  onMaxWarningsReached,
  isMonitoringActive,
  onCameraReady,
}: CameraMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing camera...");
  const [warningCount, setWarningCount] = useState(0);

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);
  const lastIncidentTimeRef = useRef<number>(0);
  const cooldownMs = 5000;
  const isNeutralRef = useRef<boolean>(true);

  // Setup Mediapipe FaceLandmarker
  useEffect(() => {
    let ignore = false;
    async function initFaceLandmarker() {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
        );
        if (ignore) return;
        
        const originalConsoleError = console.error;
        console.error = (...args) => {
          if (typeof args[0] === 'string' && args[0].includes('TensorFlow Lite XNNPACK delegate')) return;
          originalConsoleError(...args);
        };
        
        let faceLandmarker;
        try {
          faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
              delegate: "GPU",
            },
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: true,
            runningMode: "VIDEO",
            numFaces: 1,
          });
        } finally {
          console.error = originalConsoleError;
        }

        if (ignore) return;
        landmarkerRef.current = faceLandmarker;
      } catch (err) {
        if (typeof err === "string" && err.includes("TensorFlow Lite XNNPACK delegate")) {
          // ignore benign info log
        } else {
          console.error("Failed to load FaceLandmarker:", err);
        }
      }
    }
    initFaceLandmarker();
    return () => {
      ignore = true;
    };
  }, []);

  // Request Camera Permissions
  const startCamera = useCallback(async () => {
    if (streamRef.current) return;
    try {
      setIsInitializing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setHasPermission(true);
          setIsInitializing(false);
          setStatusMessage("Camera active");
          if (onCameraReady) onCameraReady();
        };
      }
    } catch (err) {
      console.error("Camera permission denied or unavailable", err);
      setHasPermission(false);
      setIsInitializing(false);
      setStatusMessage("Camera permission denied");
    }
  }, []);

  // Start processing frames when monitoring is active
  useEffect(() => {
    if (isMonitoringActive && hasPermission) {
      let lastVideoTime = -1;
      let consecutiveAbsence = 0;
      let consecutiveTurn = 0;

      const predictWebcam = async () => {
        if (!videoRef.current || !landmarkerRef.current) return;

        const startTimeMs = performance.now();
        if (lastVideoTime !== videoRef.current.currentTime && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
          lastVideoTime = videoRef.current.currentTime;
          
          // Suppress benign MediaPipe INFO logs sent to stderr/console.error
          const originalConsoleError = console.error;
          console.error = (...args) => {
            if (typeof args[0] === 'string' && args[0].includes('TensorFlow Lite XNNPACK delegate')) return;
            originalConsoleError(...args);
          };

          try {
            const results = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
            const now = Date.now();

            if (results.faceBlendshapes.length === 0 && results.facialTransformationMatrixes.length === 0) {
              consecutiveAbsence++;
              consecutiveTurn = 0;
              // E.g., ~15-20 frames absence -> warning
              if (consecutiveAbsence > 20) {
                if (now - lastIncidentTimeRef.current > cooldownMs && isNeutralRef.current) {
                  triggerWarning("Face not detected. Please stay visible.");
                  isNeutralRef.current = false;
                }
              } else {
                 setStatusMessage("Please look at the screen");
              }
            } else {
              consecutiveAbsence = 0;
              const matrix = results.facialTransformationMatrixes[0]?.data;
              if (matrix) {
                // Approximate pose logic
                // For a 4x4 matrix, matrix[2] and matrix[6] often correlate to rotation (yaw/pitch).
                // Or matrix[0], [4], [8]
                const yaw = Math.atan2(matrix[8], matrix[10]);
                const pitch = Math.atan2(-matrix[9], Math.sqrt(matrix[8]*matrix[8] + matrix[10]*matrix[10]));
                
                // convert to degrees
                const yawDeg = (yaw * 180) / Math.PI;
                const pitchDeg = (pitch * 180) / Math.PI;

                if (Math.abs(yawDeg) > 25 || Math.abs(pitchDeg) > 20) {
                  consecutiveTurn++;
                  if (consecutiveTurn > 10) {
                     if (now - lastIncidentTimeRef.current > cooldownMs && isNeutralRef.current) {
                        triggerWarning("Head turned away. Please face the screen.");
                        isNeutralRef.current = false;
                     }
                  } else {
                      setStatusMessage("Please look at the screen");
                  }
                } else {
                  consecutiveTurn = 0;
                  isNeutralRef.current = true;
                  setStatusMessage("Face detected");
                }
              }
            }
          } catch (e) {
            // Processing error
          } finally {
            console.error = originalConsoleError;
          }
        }
        
        if (isMonitoringActive) {
            animationRef.current = requestAnimationFrame(predictWebcam);
        }
      };

      animationRef.current = requestAnimationFrame(predictWebcam);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isMonitoringActive, hasPermission]);

  const triggerWarning = (reason: string) => {
    lastIncidentTimeRef.current = Date.now();
    setWarningCount((prev) => {
      const next = prev + 1;
      const msg = `Warning ${next} of 3: ${reason}`;
      
      // Defer parent callbacks out of the React render phase updater
      setTimeout(() => {
        onWarning(next, msg);
        if (next >= 3) {
          onMaxWarningsReached();
        }
      }, 0);
      
      return next;
    });
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 w-full text-slate-200 text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {hasPermission ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <CameraOff className="w-4 h-4 text-red-400" />
          )}
          <span className="font-semibold text-slate-100">Proctoring Status</span>
        </div>
        <div className="font-mono bg-slate-800 px-2 py-0.5 rounded text-amber-400 font-bold border border-slate-700">
          Warnings: {warningCount}/3
        </div>
      </div>
      
      <div className="flex items-start gap-4">
        <div className="w-24 h-24 bg-black rounded-lg overflow-hidden border border-slate-700 relative shrink-0">
          <video
            ref={videoRef}
            className="w-full h-full object-cover transform -scale-x-100"
            playsInline
            muted
          />
          {!hasPermission && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
              <CameraOff className="w-6 h-6" />
            </div>
          )}
        </div>
        
        <div className="flex-1 space-y-2">
          <p className="text-[11px] text-slate-400 leading-tight">
            Active monitoring requires your face to be visible. Turn your head or look away persistently and a warning will be issued.
          </p>
          <div className="bg-slate-800 p-2 rounded text-[10px] font-medium border border-slate-700 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isMonitoringActive ? "bg-emerald-500 animate-pulse" : "bg-slate-500"}`}></span>
            {statusMessage}
          </div>
          {!hasPermission && !isInitializing && (
             <button
                type="button"
                onClick={startCamera}
                className="mt-2 w-full px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded transition-colors"
             >
                Enable Camera
             </button>
          )}
          {isInitializing && (
             <span className="text-slate-400 text-[10px]">Requesting permission...</span>
          )}
        </div>
      </div>
    </div>
  );
}
