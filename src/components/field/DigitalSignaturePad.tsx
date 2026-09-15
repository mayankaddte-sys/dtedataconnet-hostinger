import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  PenTool, 
  RotateCcw, 
  Trash2, 
  Fingerprint, 
  ShieldCheck,
  Undo2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface DigitalSignaturePadProps {
  initialSignature?: string;
  officerName: string;
  officerDesignation: string;
  onSaveSignature: (dataUrl: string) => void;
  onClear?: () => void;
  // Whether a signature is actually mandatory for this requisition. Purely
  // cosmetic — it only changes the helper label below the canvas — since
  // the real enforcement lives in the parent's submit validation
  // (requisition.requireOfficialSealUpload).
  required?: boolean;
}

interface Point {
  x: number;
  y: number;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  initialSignature,
  officerName,
  officerDesignation,
  onSaveSignature,
  onClear,
  required = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(Boolean(initialSignature));
  const [penColor, setPenColor] = useState<string>('#1e3a8a'); // Institutional Blue Ink
  const [strokeWidth, setStrokeWidth] = useState<number>(2.8);
  const [history, setHistory] = useState<string[]>([]);
  const pointsRef = useRef<Point[]>([]);

  // Initialize and resize canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || 500;
    const height = 160;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = strokeWidth;

    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = initialSignature;
    }
  }, [initialSignature, penColor, strokeWidth]);

  useEffect(() => {
    initCanvas();
    const handleResize = () => {
      initCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = strokeWidth;
    }
  }, [penColor, strokeWidth]);

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setHistory(prev => [...prev.slice(-15), dataUrl]);
  };

  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Pointer Down (Finger / Touch / Pen / Mouse)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture pointer for smooth dragging across canvas boundaries
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveCanvasState();
    const point = getCanvasCoordinates(e);
    pointsRef.current = [point];

    ctx.beginPath();
    ctx.arc(point.x, point.y, strokeWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = penColor;
    ctx.fill();

    setIsDrawing(true);
    setHasDrawn(true);
  };

  // Pointer Move (Finger Dragging / Touch Dragging)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = getCanvasCoordinates(e);
    const points = pointsRef.current;
    points.push(point);

    if (points.length < 3) {
      const b = points[0];
      ctx.beginPath();
      ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2, !0);
      ctx.fillStyle = penColor;
      ctx.fill();
      return;
    }

    // Quadratic bezier curve interpolation for natural, smooth finger strokes
    const i = points.length - 1;
    const xc = (points[i].x + points[i - 1].x) / 2;
    const yc = (points[i].y + points[i - 1].y) / 2;

    ctx.beginPath();
    ctx.strokeStyle = penColor;
    ctx.lineWidth = strokeWidth;
    ctx.moveTo(points[i - 1].x, points[i - 1].y);
    ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    ctx.stroke();
  };

  // Pointer Up / End
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe fallback
      }
      const dataUrl = canvas.toDataURL('image/png');
      onSaveSignature(dataUrl);
    }

    setIsDrawing(false);
    pointsRef.current = [];
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setHistory([]);
    pointsRef.current = [];
    if (onClear) onClear();
    onSaveSignature('');
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop(); // remove current
    const previousState = newHistory[newHistory.length - 1];

    if (previousState) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const rect = canvas.getBoundingClientRect();
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHistory(newHistory);
        onSaveSignature(canvas.toDataURL('image/png'));
      };
      img.src = previousState;
    } else {
      handleClear();
    }
  };

  return (
    <div ref={containerRef} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
            <Fingerprint className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-xs">
              उंगली अथवा टच-स्क्रीन से डिजिटल हस्ताक्षर करें (Draw Digital Signature)
            </span>
            <p className="text-[11px] text-slate-500">
              Drag your finger or stylus across the signature pad to sign
            </p>
          </div>
        </div>

        {/* Ink & Stroke Palette */}
        <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
          {/* Stroke Width */}
          <div className="flex items-center gap-1 bg-white px-2 py-0.5 border border-slate-200 rounded-lg">
            <span className="text-[10px] text-slate-500 font-medium">Pen:</span>
            <button
              type="button"
              onClick={() => setStrokeWidth(2.0)}
              className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${strokeWidth === 2.0 ? 'bg-blue-100 text-blue-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Fine
            </button>
            <button
              type="button"
              onClick={() => setStrokeWidth(2.8)}
              className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${strokeWidth === 2.8 ? 'bg-blue-100 text-blue-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setStrokeWidth(4.0)}
              className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${strokeWidth === 4.0 ? 'bg-blue-100 text-blue-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Thick
            </button>
          </div>

          {/* Ink Color Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-slate-600">Ink:</span>
            <button
              type="button"
              onClick={() => setPenColor('#1e3a8a')}
              className={`w-6 h-6 rounded-full bg-blue-900 border-2 transition-all ${
                penColor === '#1e3a8a' ? 'border-amber-400 scale-110 shadow-xs' : 'border-white'
              }`}
              title="Institutional Blue Ink (विभागीय नीली स्याही)"
            />
            <button
              type="button"
              onClick={() => setPenColor('#0f172a')}
              className={`w-6 h-6 rounded-full bg-slate-900 border-2 transition-all ${
                penColor === '#0f172a' ? 'border-amber-400 scale-110 shadow-xs' : 'border-white'
              }`}
              title="Official Black Ink (काली स्याही)"
            />
            <button
              type="button"
              onClick={() => setPenColor('#15803d')}
              className={`w-6 h-6 rounded-full bg-emerald-700 border-2 transition-all ${
                penColor === '#15803d' ? 'border-amber-400 scale-110 shadow-xs' : 'border-white'
              }`}
              title="Green Verification Ink (हरी स्याही)"
            />
          </div>
        </div>
      </div>

      {/* Signature Canvas Area with Touch Events */}
      <div className="relative group select-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-40 bg-white border-2 border-dashed border-blue-300 rounded-xl cursor-crosshair touch-none shadow-inner"
          style={{ touchAction: 'none' }}
        />

        {/* Watermark Guidelines */}
        {!hasDrawn && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 select-none space-y-1">
            <PenTool className="w-6 h-6 text-blue-500/70 animate-pulse" />
            <span className="text-xs font-bold text-slate-600">
              कृपया यहां अपनी उंगली घुमाकर हस्ताक्षर करें (Touch & Sign with Finger)
            </span>
            <span className="text-[10px] text-slate-400">
              Smooth finger drag enabled for Mobile, Tablet & Touchscreen
            </span>
          </div>
        )}

        {/* Signature Line & Officer Watermark */}
        <div className="absolute bottom-3 left-6 right-6 border-b border-dashed border-slate-300 pointer-events-none flex justify-between text-[10px] text-slate-400 pb-0.5">
          <span>{officerName ? `अधिकारी: ${officerName}` : 'हस्ताक्षरकर्ता'}</span>
          <span>{officerDesignation || 'कार्यालय प्रमुख'}</span>
        </div>
      </div>

      {/* Footer Toolbar */}
      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="एक स्ट्रोक पूर्ववत करें"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasDrawn}
            className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-slate-300 text-rose-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="हस्ताक्षर साफ करें"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear (पुनः बनाएं)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {hasDrawn ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Digital Signature Captured (हस्ताक्षर संलग्न)</span>
            </span>
          ) : required ? (
            <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              * उंगली से हस्ताक्षर करना आवश्यक है
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              हस्ताक्षर वैकल्पिक है (Signature optional for this requisition)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
