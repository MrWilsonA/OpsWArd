'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Layers,
  Maximize2,
  Minimize2,
  Move,
  Plus,
  RotateCcw,
  Save,
  Square,
  Trash2,
  Undo2,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface FloorRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface ObstacleRect {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  shape?: 'rect' | 'ellipse';
  through?: boolean;
  base?: number;
  occlude?: boolean;
}

interface ColliderEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const WORLD_WIDTH = 1536;
const WORLD_HEIGHT = 1024;

const ROOM_SHORTCUTS = [
  { name: 'Server Vault', x: 250, y: 250 },
  { name: 'Security Watch', x: 250, y: 500 },
  { name: 'Archive Library', x: 270, y: 850 },
  { name: 'Data Garden', x: 1280, y: 250 },
  { name: 'Briefing Room', x: 1280, y: 550 },
  { name: 'Pantry Lounge', x: 1250, y: 850 },
  { name: 'Central Hall', x: 768, y: 512 },
];

export const ColliderEditorModal: React.FC<ColliderEditorModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  const [floors, setFloors] = useState<FloorRect[]>([]);
  const [obstacles, setObstacles] = useState<ObstacleRect[]>([]);
  const [history, setHistory] = useState<{ floors: FloorRect[]; obstacles: ObstacleRect[] }[]>([]);

  // Selection & Mode
  const [selectedType, setSelectedType] = useState<'floor' | 'obstacle' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<'select' | 'add-floor' | 'add-obstacle' | 'add-through'>('select');

  // Viewport / Zoom & Pan
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 50, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging & Resizing Box
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [drawingBox, setDrawingBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Visibility toggles
  const [showFloors, setShowFloors] = useState(true);
  const [showObstacles, setShowObstacles] = useState(true);
  const [snapGrid, setSnapGrid] = useState<number>(2);

  // Status message
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load Initial Colliders
  const loadColliders = useCallback(async () => {
    try {
      const res = await fetch('/api/colliders');
      if (res.ok) {
        const data = await res.json();
        setFloors(data.floors || []);
        setObstacles(data.obstacles || []);
      }
    } catch (err) {
      console.error('Failed to fetch colliders:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadColliders();
      const img = new Image();
      img.src = '/game-assets/campus-loop-frames/campus-00.png';
      img.onload = () => setBgImage(img);
    }
  }, [isOpen, loadColliders]);

  const recordHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-15), { floors: [...floors], obstacles: [...obstacles] }]);
  }, [floors, obstacles]);

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setFloors(last.floors);
    setObstacles(last.obstacles);
    setHistory((prev) => prev.slice(0, -1));
    setSelectedIndex(null);
    setSelectedType(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg('Compiling & saving layout...');
    try {
      const res = await fetch('/api/colliders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floors, obstacles }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg('✅ Colliders saved & compiled successfully!');
        setTimeout(() => setStatusMsg(null), 3500);
        onSaved?.();
      } else {
        setStatusMsg('❌ Error: ' + (data.error || 'Failed to save'));
      }
    } catch (err) {
      setStatusMsg('❌ Error: ' + String(err));
    } finally {
      setIsSaving(false);
    }
  };

  // World to Screen / Screen to World coordinates
  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const wx = Math.round((sx - pan.x) / zoom);
      const wy = Math.round((sy - pan.y) / zoom);
      return { x: wx, y: wy };
    },
    [pan, zoom]
  );

  const snap = useCallback(
    (val: number) => {
      if (snapGrid <= 1) return Math.round(val);
      return Math.round(val / snapGrid) * snapGrid;
    },
    [snapGrid]
  );

  // Selected item reference
  const selectedItem = selectedType === 'floor' && selectedIndex !== null
    ? floors[selectedIndex]
    : selectedType === 'obstacle' && selectedIndex !== null
    ? obstacles[selectedIndex]
    : null;

  // Render Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 1. Draw Campus Background
    if (bgImage?.complete) {
      ctx.drawImage(bgImage, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    } else {
      ctx.fillStyle = '#1e1a18';
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }

    // World border
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // 2. Draw Walkable Floors
    if (showFloors) {
      floors.forEach((f, idx) => {
        const isSelected = selectedType === 'floor' && selectedIndex === idx;
        const w = f.x2 - f.x1;
        const h = f.y2 - f.y1;

        ctx.fillStyle = isSelected ? 'rgba(16, 185, 129, 0.45)' : 'rgba(16, 185, 129, 0.22)';
        ctx.fillRect(f.x1, f.y1, w, h);

        ctx.strokeStyle = isSelected ? '#10b981' : 'rgba(16, 185, 129, 0.7)';
        ctx.lineWidth = (isSelected ? 2.5 : 1) / zoom;
        ctx.strokeRect(f.x1, f.y1, w, h);

        // Label
        ctx.fillStyle = '#10b981';
        ctx.font = `${Math.max(10, Math.round(11 / zoom))}px monospace`;
        ctx.fillText(`Floor #${idx + 1}`, f.x1 + 4, f.y1 + 14);
      });
    }

    // 3. Draw Obstacles
    if (showObstacles) {
      obstacles.forEach((ob, idx) => {
        const isSelected = selectedType === 'obstacle' && selectedIndex === idx;
        const w = ob.x2 - ob.x1;
        const h = ob.y2 - ob.y1;

        if (ob.shape === 'ellipse') {
          ctx.beginPath();
          ctx.ellipse(ob.x1 + w / 2, ob.y1 + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.25)';
          ctx.fill();
          ctx.strokeStyle = isSelected ? '#ef4444' : 'rgba(239, 68, 68, 0.75)';
          ctx.lineWidth = (isSelected ? 2.5 : 1) / zoom;
          ctx.stroke();
        } else {
          ctx.fillStyle = ob.through
            ? isSelected ? 'rgba(168, 85, 247, 0.5)' : 'rgba(168, 85, 247, 0.25)'
            : isSelected ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.25)';
          ctx.fillRect(ob.x1, ob.y1, w, h);

          ctx.strokeStyle = ob.through
            ? isSelected ? '#a855f7' : 'rgba(168, 85, 247, 0.75)'
            : isSelected ? '#ef4444' : 'rgba(239, 68, 68, 0.75)';
          ctx.lineWidth = (isSelected ? 2.5 : 1) / zoom;
          ctx.strokeRect(ob.x1, ob.y1, w, h);
        }

        // Label
        ctx.fillStyle = ob.through ? '#c084fc' : '#f87171';
        ctx.font = `${Math.max(9, Math.round(10 / zoom))}px monospace`;
        ctx.fillText(ob.id, ob.x1 + 4, ob.y1 + 13);
      });
    }

    // 4. Draw Current Drag/Drawing Box
    if (drawingBox) {
      const minX = Math.min(drawingBox.x1, drawingBox.x2);
      const minY = Math.min(drawingBox.y1, drawingBox.y2);
      const w = Math.abs(drawingBox.x2 - drawingBox.x1);
      const h = Math.abs(drawingBox.y2 - drawingBox.y1);

      ctx.fillStyle = editMode === 'add-floor' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)';
      ctx.fillRect(minX, minY, w, h);
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(minX, minY, w, h);
      ctx.setLineDash([]);
    }

    // 5. Draw Handles on Selected Box
    if (selectedItem) {
      const { x1, y1, x2, y2 } = selectedItem;
      const handleSize = 7 / zoom;
      const handles = [
        { name: 'nw', x: x1, y: y1 },
        { name: 'ne', x: x2, y: y1 },
        { name: 'se', x: x2, y: y2 },
        { name: 'sw', x: x1, y: y2 },
        { name: 'n', x: (x1 + x2) / 2, y: y1 },
        { name: 's', x: (x1 + x2) / 2, y: y2 },
        { name: 'w', x: x1, y: (y1 + y2) / 2 },
        { name: 'e', x: x2, y: (y1 + y2) / 2 },
      ];

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5 / zoom;
      handles.forEach((h) => {
        ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      });
    }

    ctx.restore();
  }, [
    bgImage,
    drawingBox,
    editMode,
    floors,
    obstacles,
    pan,
    selectedIndex,
    selectedItem,
    selectedType,
    showFloors,
    showObstacles,
    zoom,
  ]);

  // Mouse / Pointer Events on Canvas
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Middle click or Space/Alt key -> Pan
    if (e.button === 1 || e.altKey || e.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const { x: wx, y: wy } = screenToWorld(sx, sy);

    if (editMode === 'add-floor' || editMode === 'add-obstacle' || editMode === 'add-through') {
      recordHistory();
      setDrawingBox({ x1: snap(wx), y1: snap(wy), x2: snap(wx), y2: snap(wy) });
      return;
    }

    // Check if clicked a handle on the selected item
    if (selectedItem) {
      const { x1, y1, x2, y2 } = selectedItem;
      const hitRadius = 8 / zoom;
      const handles: Record<string, { x: number; y: number }> = {
        nw: { x: x1, y: y1 },
        ne: { x: x2, y: y1 },
        se: { x: x2, y: y2 },
        sw: { x: x1, y: y2 },
        n: { x: (x1 + x2) / 2, y: y1 },
        s: { x: (x1 + x2) / 2, y: y2 },
        w: { x: x1, y: (y1 + y2) / 2 },
        e: { x: x2, y: (y1 + y2) / 2 },
      };

      for (const [name, pt] of Object.entries(handles)) {
        if (Math.hypot(wx - pt.x, wy - pt.y) <= hitRadius) {
          recordHistory();
          setResizeHandle(name);
          setDragStart({ x: wx, y: wy });
          return;
        }
      }
    }

    // Check hit on Obstacles first (top layer)
    let found = false;
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const ob = obstacles[i];
      if (wx >= ob.x1 && wx <= ob.x2 && wy >= ob.y1 && wy <= ob.y2) {
        recordHistory();
        setSelectedType('obstacle');
        setSelectedIndex(i);
        setIsDraggingBox(true);
        setDragStart({ x: wx, y: wy });
        found = true;
        break;
      }
    }

    // Check hit on Floors
    if (!found) {
      for (let i = floors.length - 1; i >= 0; i--) {
        const f = floors[i];
        if (wx >= f.x1 && wx <= f.x2 && wy >= f.y1 && wy <= f.y2) {
          recordHistory();
          setSelectedType('floor');
          setSelectedIndex(i);
          setIsDraggingBox(true);
          setDragStart({ x: wx, y: wy });
          found = true;
          break;
        }
      }
    }

    if (!found) {
      setSelectedType(null);
      setSelectedIndex(null);
      // If clicked empty space, start panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);

    if (drawingBox) {
      setDrawingBox((prev) => (prev ? { ...prev, x2: snap(wx), y2: snap(wy) } : null));
      return;
    }

    if (resizeHandle && selectedItem && selectedIndex !== null) {
      const dx = snap(wx) - snap(dragStart.x);
      const dy = snap(wy) - snap(dragStart.y);
      if (dx === 0 && dy === 0) return;

      const updateRect = (r: FloorRect) => {
        let { x1, y1, x2, y2 } = r;
        if (resizeHandle.includes('w')) x1 += dx;
        if (resizeHandle.includes('e')) x2 += dx;
        if (resizeHandle.includes('n')) y1 += dy;
        if (resizeHandle.includes('s')) y2 += dy;
        return {
          ...r,
          x1: Math.min(x1, x2 - 4),
          y1: Math.min(y1, y2 - 4),
          x2: Math.max(x2, x1 + 4),
          y2: Math.max(y2, y1 + 4),
        };
      };

      if (selectedType === 'floor') {
        setFloors((prev) => prev.map((f, i) => (i === selectedIndex ? (updateRect(f) as FloorRect) : f)));
      } else if (selectedType === 'obstacle') {
        setObstacles((prev) => prev.map((ob, i) => (i === selectedIndex ? (updateRect(ob) as ObstacleRect) : ob)));
      }
      setDragStart({ x: wx, y: wy });
      return;
    }

    if (isDraggingBox && selectedItem && selectedIndex !== null) {
      const dx = snap(wx) - snap(dragStart.x);
      const dy = snap(wy) - snap(dragStart.y);
      if (dx === 0 && dy === 0) return;

      const moveRect = (r: FloorRect) => ({
        ...r,
        x1: r.x1 + dx,
        y1: r.y1 + dy,
        x2: r.x2 + dx,
        y2: r.y2 + dy,
      });

      if (selectedType === 'floor') {
        setFloors((prev) => prev.map((f, i) => (i === selectedIndex ? (moveRect(f) as FloorRect) : f)));
      } else if (selectedType === 'obstacle') {
        setObstacles((prev) => prev.map((ob, i) => (i === selectedIndex ? (moveRect(ob) as ObstacleRect) : ob)));
      }
      setDragStart({ x: wx, y: wy });
    }
  };

  const onMouseUp = () => {
    if (drawingBox) {
      const minX = Math.min(drawingBox.x1, drawingBox.x2);
      const maxX = Math.max(drawingBox.x1, drawingBox.x2);
      const minY = Math.min(drawingBox.y1, drawingBox.y2);
      const maxY = Math.max(drawingBox.y1, drawingBox.y2);

      if (maxX - minX >= 6 && maxY - minY >= 6) {
        if (editMode === 'add-floor') {
          const newFloor: FloorRect = { x1: minX, y1: minY, x2: maxX, y2: maxY };
          setFloors((prev) => [...prev, newFloor]);
          setSelectedType('floor');
          setSelectedIndex(floors.length);
        } else if (editMode === 'add-obstacle' || editMode === 'add-through') {
          const newObs: ObstacleRect = {
            id: `custom-${Date.now().toString().slice(-4)}`,
            x1: minX,
            y1: minY,
            x2: maxX,
            y2: maxY,
            shape: 'rect',
            through: editMode === 'add-through',
            occlude: true,
          };
          setObstacles((prev) => [...prev, newObs]);
          setSelectedType('obstacle');
          setSelectedIndex(obstacles.length);
        }
      }
      setDrawingBox(null);
      setEditMode('select');
    }

    setIsPanning(false);
    setIsDraggingBox(false);
    setResizeHandle(null);
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(2.8, Math.max(0.4, zoom * zoomFactor));

    // Zoom centered around cursor
    setPan({
      x: mouseX - ((mouseX - pan.x) / zoom) * newZoom,
      y: mouseY - ((mouseY - pan.y) / zoom) * newZoom,
    });
    setZoom(newZoom);
  };

  const deleteSelected = () => {
    if (selectedIndex === null) return;
    recordHistory();
    if (selectedType === 'floor') {
      setFloors((prev) => prev.filter((_, i) => i !== selectedIndex));
    } else if (selectedType === 'obstacle') {
      setObstacles((prev) => prev.filter((_, i) => i !== selectedIndex));
    }
    setSelectedType(null);
    setSelectedIndex(null);
  };

  const duplicateSelected = () => {
    if (!selectedItem || selectedIndex === null) return;
    recordHistory();
    const offset = 16;
    if (selectedType === 'floor') {
      const f = selectedItem as FloorRect;
      const copy: FloorRect = { x1: f.x1 + offset, y1: f.y1 + offset, x2: f.x2 + offset, y2: f.y2 + offset };
      setFloors((prev) => [...prev, copy]);
      setSelectedIndex(floors.length);
    } else if (selectedType === 'obstacle') {
      const ob = selectedItem as ObstacleRect;
      const copy: ObstacleRect = {
        ...ob,
        id: `${ob.id}-copy`,
        x1: ob.x1 + offset,
        y1: ob.y1 + offset,
        x2: ob.x2 + offset,
        y2: ob.y2 + offset,
      };
      setObstacles((prev) => [...prev, copy]);
      setSelectedIndex(obstacles.length);
    }
  };

  const jumpToRoom = (rx: number, ry: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width;
    const ch = canvas.height;
    setPan({
      x: cw / 2 - rx * zoom,
      y: ch / 2 - ry * zoom,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 select-none">
      <div className="relative flex flex-col w-full h-full max-w-[1600px] max-h-[95vh] bg-[#120e0d] border border-amber-900/40 rounded-2xl shadow-2xl overflow-hidden text-neutral-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-amber-900/30 bg-[#1a1412]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-amber-100 flex items-center gap-2">
                Campus Collider & Floor Visual Editor
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Drag & Drop
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Click & drag boxes to edit boundaries, or click empty space in Add mode to draw new colliders.
              </p>
            </div>
          </div>

          {/* Action buttons & status */}
          <div className="flex items-center gap-3">
            {statusMsg && (
              <div className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium animate-pulse">
                {statusMsg}
              </div>
            )}
            <button
              onClick={undo}
              disabled={history.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 transition-colors"
            >
              <Undo2 className="w-4 h-4" /> Undo
            </button>
            <button
              onClick={loadColliders}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Save & Rebuild Map
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Toolbar */}
          <div className="w-64 bg-[#16110f] border-r border-amber-900/20 p-4 flex flex-col gap-4 overflow-y-auto">
            {/* Tool Mode */}
            <div>
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Editor Tool</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEditMode('select')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    editMode === 'select'
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                  }`}
                >
                  <Move className="w-3.5 h-3.5" /> Select / Move
                </button>
                <button
                  onClick={() => setEditMode('add-floor')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    editMode === 'add-floor'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" /> Draw Floor
                </button>
                <button
                  onClick={() => setEditMode('add-obstacle')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    editMode === 'add-obstacle'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 text-rose-400" /> Solid Object
                </button>
                <button
                  onClick={() => setEditMode('add-through')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    editMode === 'add-through'
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 text-purple-400" /> Walk-Behind
                </button>
              </div>
            </div>

            {/* Layer Visibility */}
            <div>
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Layers</div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setShowFloors((v) => !v)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-900/80 border border-neutral-800 text-xs font-medium text-neutral-300 hover:bg-neutral-800"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-500/80 inline-block" /> Walkable Floors ({floors.length})
                  </span>
                  {showFloors ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-neutral-500" />}
                </button>
                <button
                  onClick={() => setShowObstacles((v) => !v)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-900/80 border border-neutral-800 text-xs font-medium text-neutral-300 hover:bg-neutral-800"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-rose-500/80 inline-block" /> Obstacles ({obstacles.length})
                  </span>
                  {showObstacles ? <Eye className="w-3.5 h-3.5 text-rose-400" /> : <EyeOff className="w-3.5 h-3.5 text-neutral-500" />}
                </button>
              </div>
            </div>

            {/* Room Shortcuts */}
            <div>
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Jump to Room</div>
              <div className="grid grid-cols-2 gap-1.5">
                {ROOM_SHORTCUTS.map((r) => (
                  <button
                    key={r.name}
                    onClick={() => jumpToRoom(r.x, r.y)}
                    className="px-2.5 py-1.5 text-left text-xs bg-neutral-900/60 hover:bg-amber-950/40 border border-neutral-800/80 hover:border-amber-700/50 rounded-lg text-neutral-300 hover:text-amber-200 transition-colors truncate"
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Box Details */}
            {selectedItem && (
              <div className="mt-auto p-3 rounded-xl bg-neutral-900/90 border border-amber-900/30 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 uppercase">
                    {selectedType === 'floor' ? `Floor #${selectedIndex! + 1}` : (selectedItem as ObstacleRect).id}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={duplicateSelected}
                      title="Duplicate"
                      className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={deleteSelected}
                      title="Delete"
                      className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-neutral-300">
                  <div>X1: <span className="text-amber-200">{selectedItem.x1}</span></div>
                  <div>Y1: <span className="text-amber-200">{selectedItem.y1}</span></div>
                  <div>X2: <span className="text-amber-200">{selectedItem.x2}</span></div>
                  <div>Y2: <span className="text-amber-200">{selectedItem.y2}</span></div>
                  <div className="col-span-2 text-neutral-400">
                    Size: {selectedItem.x2 - selectedItem.x1} × {selectedItem.y2 - selectedItem.y1} px
                  </div>
                </div>

                {selectedType === 'obstacle' && (
                  <div className="pt-1 flex flex-col gap-1 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean((selectedItem as ObstacleRect).through)}
                        onChange={(e) => {
                          recordHistory();
                          const val = e.target.checked;
                          setObstacles((prev) =>
                            prev.map((ob, i) => (i === selectedIndex ? { ...ob, through: val } : ob))
                          );
                        }}
                        className="rounded border-neutral-700 bg-neutral-800 text-purple-600 focus:ring-0"
                      />
                      <span>Walk-behind (Through)</span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Center Canvas Area */}
          <div className="relative flex-1 bg-[#0d0a09] overflow-hidden flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={1400}
              height={850}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onWheel={onWheel}
              className="cursor-crosshair w-full h-full block"
            />

            {/* Bottom Floating Canvas Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1412]/90 border border-amber-900/40 shadow-xl backdrop-blur-md">
              <button
                onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
                className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-amber-200 min-w-[50px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(2.8, z + 0.15))}
                className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-neutral-700 mx-1" />
              <button
                onClick={() => {
                  setZoom(0.85);
                  setPan({ x: 50, y: 30 });
                }}
                className="px-2.5 py-1 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg font-medium"
              >
                Fit Canvas
              </button>
              <div className="h-4 w-px bg-neutral-700 mx-1" />
              <span className="text-xs text-neutral-400">Snap:</span>
              {[1, 2, 4, 8].map((s) => (
                <button
                  key={s}
                  onClick={() => setSnapGrid(s)}
                  className={`px-2 py-0.5 text-xs font-mono rounded ${
                    snapGrid === s ? 'bg-amber-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {s}px
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
