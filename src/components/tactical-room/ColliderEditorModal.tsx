'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  EyeOff,
  Grid,
  Hand,
  Info,
  Layers,
  Maximize2,
  Minimize2,
  MousePointer,
  Move,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Sliders,
  Sparkles,
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
  { name: 'Server Vault', x: 250, y: 250, color: '#38bdf8' },
  { name: 'Security Watch', x: 250, y: 500, color: '#fb923c' },
  { name: 'Archive Library', x: 270, y: 850, color: '#a78bfa' },
  { name: 'Data Garden', x: 1280, y: 250, color: '#4ade80' },
  { name: 'Briefing Room', x: 1280, y: 550, color: '#f43f5e' },
  { name: 'Pantry Lounge', x: 1250, y: 850, color: '#facc15' },
  { name: 'Central Hall', x: 768, y: 512, color: '#e2e8f0' },
];

export const ColliderEditorModal: React.FC<ColliderEditorModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  const [floors, setFloors] = useState<FloorRect[]>([]);
  const [obstacles, setObstacles] = useState<ObstacleRect[]>([]);
  
  // Undo & Redo History Stacks
  const [undoStack, setUndoStack] = useState<{ floors: FloorRect[]; obstacles: ObstacleRect[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ floors: FloorRect[]; obstacles: ObstacleRect[] }[]>([]);

  // Selection & Active Tool
  const [selectedType, setSelectedType] = useState<'floor' | 'obstacle' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'pan' | 'add-floor' | 'add-solid' | 'add-through'>('select');

  // Spacebar Pan State
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);

  // Viewport / Zoom & Pan
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 60, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging & Resizing State
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragInitialBox, setDragInitialBox] = useState<FloorRect | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [drawingBox, setDrawingBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [hoverCursor, setHoverCursor] = useState<string>('default');

  // Live Mouse Tracker
  const [cursorWorld, setCursorWorld] = useState({ x: 0, y: 0 });

  // Visual Controls
  const [showFloors, setShowFloors] = useState(true);
  const [showObstacles, setShowObstacles] = useState(true);
  const [showGridLines, setShowGridLines] = useState(false);
  const [bgDimmer, setBgDimmer] = useState(0.9);
  const [overlayOpacity, setOverlayOpacity] = useState(0.42);
  const [snapGrid, setSnapGrid] = useState<number>(2);

  // Sidebar Tabs & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'inspector' | 'list' | 'settings'>('inspector');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Status Toast
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load Initial Colliders
  const loadColliders = useCallback(async () => {
    try {
      const res = await fetch('/api/colliders');
      if (res.ok) {
        const data = await res.json();
        setFloors(data.floors || []);
        setObstacles(data.obstacles || []);
        setUndoStack([]);
        setRedoStack([]);
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

  // Record History for Undo (Clears Redo stack on new change)
  const recordHistory = useCallback(() => {
    setUndoStack((prev) => [
      ...prev.slice(-25),
      { floors: JSON.parse(JSON.stringify(floors)), obstacles: JSON.parse(JSON.stringify(obstacles)) },
    ]);
    setRedoStack([]);
  }, [floors, obstacles]);

  // Undo Function (Ctrl+Z)
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [
      ...prev,
      { floors: JSON.parse(JSON.stringify(floors)), obstacles: JSON.parse(JSON.stringify(obstacles)) },
    ]);
    setFloors(previous.floors);
    setObstacles(previous.obstacles);
    setUndoStack((prev) => prev.slice(0, -1));
    setSelectedIndex(null);
    setSelectedType(null);
    setStatusMsg({ text: 'Undo', type: 'info' });
    setTimeout(() => setStatusMsg(null), 1500);
  }, [floors, obstacles, undoStack]);

  // Redo Function (Ctrl+Y / Ctrl+Shift+Z)
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [
      ...prev,
      { floors: JSON.parse(JSON.stringify(floors)), obstacles: JSON.parse(JSON.stringify(obstacles)) },
    ]);
    setFloors(next.floors);
    setObstacles(next.obstacles);
    setRedoStack((prev) => prev.slice(0, -1));
    setSelectedIndex(null);
    setSelectedType(null);
    setStatusMsg({ text: 'Redo', type: 'info' });
    setTimeout(() => setStatusMsg(null), 1500);
  }, [floors, obstacles, redoStack]);

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg({ text: 'Baking & rebuilding collision maps...', type: 'info' });
    try {
      const res = await fetch('/api/colliders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floors, obstacles }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: '✨ Colliders successfully compiled & applied!', type: 'success' });
        setTimeout(() => setStatusMsg(null), 4000);
        onSaved?.();
      } else {
        setStatusMsg({ text: 'Error: ' + (data.error || 'Failed to save colliders'), type: 'error' });
      }
    } catch (err) {
      setStatusMsg({ text: 'Network Error: ' + String(err), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Coordinates Transformation
  const worldToScreen = useCallback(
    (wx: number, wy: number) => ({
      sx: wx * zoom + pan.x,
      sy: wy * zoom + pan.y,
    }),
    [pan, zoom]
  );

  const screenToWorld = useCallback(
    (sx: number, sy: number) => ({
      wx: Math.round((sx - pan.x) / zoom),
      wy: Math.round((sy - pan.y) / zoom),
    }),
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
  const selectedItem = useMemo(() => {
    if (selectedType === 'floor' && selectedIndex !== null && floors[selectedIndex]) {
      return floors[selectedIndex];
    }
    if (selectedType === 'obstacle' && selectedIndex !== null && obstacles[selectedIndex]) {
      return obstacles[selectedIndex];
    }
    return null;
  }, [floors, obstacles, selectedIndex, selectedType]);

  // Compute 8 handle positions for selected item
  const getHandles = useCallback((box: FloorRect) => {
    const { x1, y1, x2, y2 } = box;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    return [
      { name: 'nw', x: x1, y: y1, cursor: 'nwse-resize' },
      { name: 'ne', x: x2, y: y1, cursor: 'nesw-resize' },
      { name: 'se', x: x2, y: y2, cursor: 'nwse-resize' },
      { name: 'sw', x: x1, y: y2, cursor: 'nesw-resize' },
      { name: 'n', x: midX, y: y1, cursor: 'ns-resize' },
      { name: 's', x: midX, y: y2, cursor: 'ns-resize' },
      { name: 'w', x: x1, y: midY, cursor: 'ew-resize' },
      { name: 'e', x: x2, y: midY, cursor: 'ew-resize' },
    ];
  }, []);

  // Filtered obstacles & floors for list search
  const filteredList = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const floorMatches = floors
      .map((f, idx) => ({ type: 'floor' as const, index: idx, id: `Floor #${idx + 1}`, x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2 }))
      .filter((item) => !term || item.id.toLowerCase().includes(term));

    const obstacleMatches = obstacles
      .map((ob, idx) => ({ type: 'obstacle' as const, index: idx, id: ob.id, x1: ob.x1, y1: ob.y1, x2: ob.x2, y2: ob.y2, through: ob.through }))
      .filter((item) => !term || item.id.toLowerCase().includes(term));

    return { floors: floorMatches, obstacles: obstacleMatches };
  }, [floors, obstacles, searchTerm]);

  // Resize canvas to fill container
  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isOpen, isSidebarOpen]);

  // Spacebar Pan Event Listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      // Spacebar to pan
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpaceHeld(true);
      }

      // Undo: Ctrl+Z / Cmd+Z (without Shift)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Redo: Ctrl+Y / Cmd+Y OR Ctrl+Shift+Z / Cmd+Shift+Z
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        handleRedo();
      }

      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'f' || e.key === 'F') setActiveTool('add-floor');
      if (e.key === 'o' || e.key === 'O') setActiveTool('add-solid');
      if (e.key === 't' || e.key === 'T') setActiveTool('add-through');
      if (e.key === 'h' || e.key === 'H') setActiveTool('pan');

      // Delete key
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIndex !== null) {
        e.preventDefault();
        deleteSelected();
      }

      // Escape key
      if (e.key === 'Escape') {
        if (drawingBox) setDrawingBox(null);
        else if (selectedItem) {
          setSelectedType(null);
          setSelectedIndex(null);
        } else {
          onClose();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceHeld(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, handleUndo, handleRedo, selectedIndex, drawingBox, selectedItem, onClose]);

  // Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 1. Background Image with dimmer
    if (bgImage?.complete) {
      ctx.globalAlpha = bgDimmer;
      ctx.drawImage(bgImage, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      ctx.globalAlpha = 1.0;
    } else {
      ctx.fillStyle = '#140f0d';
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }

    // 2. Grid lines
    if (showGridLines) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1 / zoom;
      const step = 32;
      ctx.beginPath();
      for (let x = 0; x <= WORLD_WIDTH; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_HEIGHT);
      }
      for (let y = 0; y <= WORLD_HEIGHT; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_WIDTH, y);
      }
      ctx.stroke();
    }

    // World border
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.75)';
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // 3. Walkable Floors Layer
    if (showFloors) {
      floors.forEach((f, idx) => {
        const isSelected = selectedType === 'floor' && selectedIndex === idx;
        const w = f.x2 - f.x1;
        const h = f.y2 - f.y1;

        ctx.fillStyle = isSelected
          ? `rgba(16, 185, 129, ${Math.min(0.85, overlayOpacity + 0.25)})`
          : `rgba(16, 185, 129, ${overlayOpacity * 0.75})`;
        ctx.fillRect(f.x1, f.y1, w, h);

        ctx.strokeStyle = isSelected ? '#10b981' : 'rgba(16, 185, 129, 0.85)';
        ctx.lineWidth = (isSelected ? 2.5 : 1.2) / zoom;
        ctx.strokeRect(f.x1, f.y1, w, h);

        if (zoom >= 0.5) {
          ctx.fillStyle = isSelected ? '#34d399' : 'rgba(52, 211, 153, 0.85)';
          ctx.font = `600 ${Math.max(10, Math.round(11 / zoom))}px ui-sans-serif, system-ui, sans-serif`;
          ctx.fillText(`Floor #${idx + 1}`, f.x1 + 5, f.y1 + 14);
        }
      });
    }

    // 4. Obstacles Layer
    if (showObstacles) {
      obstacles.forEach((ob, idx) => {
        const isSelected = selectedType === 'obstacle' && selectedIndex === idx;
        const w = ob.x2 - ob.x1;
        const h = ob.y2 - ob.y1;

        const baseColor = ob.through ? '168, 85, 247' : '239, 68, 68';
        const strokeColor = ob.through ? '#c084fc' : '#f87171';

        if (ob.shape === 'ellipse') {
          ctx.beginPath();
          ctx.ellipse(ob.x1 + w / 2, ob.y1 + h / 2, Math.max(1, w / 2), Math.max(1, h / 2), 0, 0, Math.PI * 2);
          ctx.fillStyle = isSelected
            ? `rgba(${baseColor}, ${Math.min(0.85, overlayOpacity + 0.3)})`
            : `rgba(${baseColor}, ${overlayOpacity * 0.8})`;
          ctx.fill();
          ctx.strokeStyle = isSelected ? '#ffffff' : strokeColor;
          ctx.lineWidth = (isSelected ? 2.5 : 1.2) / zoom;
          ctx.stroke();
        } else {
          ctx.fillStyle = isSelected
            ? `rgba(${baseColor}, ${Math.min(0.85, overlayOpacity + 0.3)})`
            : `rgba(${baseColor}, ${overlayOpacity * 0.8})`;
          ctx.fillRect(ob.x1, ob.y1, w, h);
          ctx.strokeStyle = isSelected ? '#ffffff' : strokeColor;
          ctx.lineWidth = (isSelected ? 2.5 : 1.2) / zoom;
          ctx.strokeRect(ob.x1, ob.y1, w, h);
        }

        if (zoom >= 0.45) {
          ctx.fillStyle = isSelected ? '#ffffff' : strokeColor;
          ctx.font = `600 ${Math.max(9, Math.round(10 / zoom))}px ui-sans-serif, system-ui, sans-serif`;
          ctx.fillText(ob.id, ob.x1 + 4, ob.y1 + 13);
        }
      });
    }

    // 5. Active Drawing Preview Box
    if (drawingBox) {
      const minX = Math.min(drawingBox.x1, drawingBox.x2);
      const minY = Math.min(drawingBox.y1, drawingBox.y2);
      const w = Math.abs(drawingBox.x2 - drawingBox.x1);
      const h = Math.abs(drawingBox.y2 - drawingBox.y1);

      ctx.fillStyle = activeTool === 'add-floor' ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)';
      ctx.fillRect(minX, minY, w, h);
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.lineWidth = 2.5 / zoom;
      ctx.strokeRect(minX, minY, w, h);
      ctx.setLineDash([]);

      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${Math.max(11, Math.round(12 / zoom))}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(`${w} × ${h} px`, minX + 6, minY + 18);
    }

    // 6. Selected Box Highlight & Resize Handles
    if (selectedItem) {
      const { x1, y1, x2, y2 } = selectedItem;
      const handles = getHandles(selectedItem);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([4 / zoom, 3 / zoom]);
      ctx.strokeRect(x1 - 2 / zoom, y1 - 2 / zoom, (x2 - x1) + 4 / zoom, (y2 - y1) + 4 / zoom);
      ctx.setLineDash([]);

      const handleVisualSize = 8 / zoom;
      handles.forEach((h) => {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(h.x - handleVisualSize / 2, h.y - handleVisualSize / 2, handleVisualSize, handleVisualSize);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(h.x - (handleVisualSize - 3 / zoom) / 2, h.y - (handleVisualSize - 3 / zoom) / 2, handleVisualSize - 3 / zoom, handleVisualSize - 3 / zoom);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1 / zoom;
        ctx.strokeRect(h.x - handleVisualSize / 2, h.y - handleVisualSize / 2, handleVisualSize, handleVisualSize);
      });
    }

    ctx.restore();
  }, [
    activeTool,
    bgDimmer,
    bgImage,
    drawingBox,
    floors,
    getHandles,
    obstacles,
    overlayOpacity,
    pan,
    selectedIndex,
    selectedItem,
    selectedType,
    showFloors,
    showGridLines,
    showObstacles,
    zoom,
  ]);

  // Pointer Down Handling
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Spacebar held OR Middle Click OR Pan Tool active -> Start Pan
    if (isSpaceHeld || e.button === 1 || activeTool === 'pan' || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const { wx, wy } = screenToWorld(sx, sy);

    // 1. Draw Mode
    if (activeTool === 'add-floor' || activeTool === 'add-solid' || activeTool === 'add-through') {
      recordHistory();
      setDrawingBox({ x1: snap(wx), y1: snap(wy), x2: snap(wx), y2: snap(wy) });
      return;
    }

    // 2. Accurate Screen-Space Hit Test for 8 Resize Handles (14px radius)
    if (selectedItem) {
      const handles = getHandles(selectedItem);
      const SCREEN_HIT_RADIUS = 14;

      for (const h of handles) {
        const { sx: hsx, sy: hsy } = worldToScreen(h.x, h.y);
        if (Math.hypot(sx - hsx, sy - hsy) <= SCREEN_HIT_RADIUS) {
          recordHistory();
          setActiveHandle(h.name);
          setDragInitialBox({ ...selectedItem });
          setDragStartPos({ x: wx, y: wy });
          return;
        }
      }
    }

    // 3. Hit Test Obstacles First (Top Layer)
    let found = false;
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const ob = obstacles[i];
      if (wx >= ob.x1 && wx <= ob.x2 && wy >= ob.y1 && wy <= ob.y2) {
        recordHistory();
        setSelectedType('obstacle');
        setSelectedIndex(i);
        setIsDraggingBox(true);
        setDragInitialBox({ x1: ob.x1, y1: ob.y1, x2: ob.x2, y2: ob.y2 });
        setDragStartPos({ x: wx, y: wy });
        found = true;
        break;
      }
    }

    // 4. Hit Test Floors Layer
    if (!found) {
      for (let i = floors.length - 1; i >= 0; i--) {
        const f = floors[i];
        if (wx >= f.x1 && wx <= f.x2 && wy >= f.y1 && wy <= f.y2) {
          recordHistory();
          setSelectedType('floor');
          setSelectedIndex(i);
          setIsDraggingBox(true);
          setDragInitialBox({ ...f });
          setDragStartPos({ x: wx, y: wy });
          found = true;
          break;
        }
      }
    }

    // 5. Clicked on Empty Map -> Deselect & Start Pan
    if (!found) {
      setSelectedType(null);
      setSelectedIndex(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // Pointer Move Handling
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { wx, wy } = screenToWorld(sx, sy);
    setCursorWorld({ x: wx, y: wy });

    // Handle Pan
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    // Handle Drawing Box
    if (drawingBox) {
      setDrawingBox((prev) => (prev ? { ...prev, x2: snap(wx), y2: snap(wy) } : null));
      return;
    }

    // Handle Resize Handle Dragging
    if (activeHandle && dragInitialBox && selectedIndex !== null) {
      const deltaX = snap(wx) - snap(dragStartPos.x);
      const deltaY = snap(wy) - snap(dragStartPos.y);

      let { x1, y1, x2, y2 } = dragInitialBox;
      if (activeHandle.includes('w')) x1 = Math.min(x1 + deltaX, x2 - 4);
      if (activeHandle.includes('e')) x2 = Math.max(x2 + deltaX, x1 + 4);
      if (activeHandle.includes('n')) y1 = Math.min(y1 + deltaY, y2 - 4);
      if (activeHandle.includes('s')) y2 = Math.max(y2 + deltaY, y1 + 4);

      if (selectedType === 'floor') {
        setFloors((prev) => prev.map((f, i) => (i === selectedIndex ? { ...f, x1, y1, x2, y2 } : f)));
      } else if (selectedType === 'obstacle') {
        setObstacles((prev) => prev.map((ob, i) => (i === selectedIndex ? { ...ob, x1, y1, x2, y2 } : ob)));
      }
      return;
    }

    // Handle Whole Box Moving
    if (isDraggingBox && dragInitialBox && selectedIndex !== null) {
      const deltaX = snap(wx) - snap(dragStartPos.x);
      const deltaY = snap(wy) - snap(dragStartPos.y);

      const x1 = dragInitialBox.x1 + deltaX;
      const y1 = dragInitialBox.y1 + deltaY;
      const x2 = dragInitialBox.x2 + deltaX;
      const y2 = dragInitialBox.y2 + deltaY;

      if (selectedType === 'floor') {
        setFloors((prev) => prev.map((f, i) => (i === selectedIndex ? { ...f, x1, y1, x2, y2 } : f)));
      } else if (selectedType === 'obstacle') {
        setObstacles((prev) => prev.map((ob, i) => (i === selectedIndex ? { ...ob, x1, y1, x2, y2 } : ob)));
      }
      return;
    }

    // Dynamic Hover Cursor Feedback
    if (isSpaceHeld || activeTool === 'pan') {
      setHoverCursor('grab');
    } else if (activeTool.startsWith('add')) {
      setHoverCursor('crosshair');
    } else if (selectedItem) {
      const handles = getHandles(selectedItem);
      let matchedCursor = null;
      for (const h of handles) {
        const { sx: hsx, sy: hsy } = worldToScreen(h.x, h.y);
        if (Math.hypot(sx - hsx, sy - hsy) <= 14) {
          matchedCursor = h.cursor;
          break;
        }
      }
      if (matchedCursor) {
        setHoverCursor(matchedCursor);
      } else if (wx >= selectedItem.x1 && wx <= selectedItem.x2 && wy >= selectedItem.y1 && wy <= selectedItem.y2) {
        setHoverCursor('move');
      } else {
        setHoverCursor('default');
      }
    } else {
      setHoverCursor('default');
    }
  };

  // Pointer Up Handling
  const handlePointerUp = () => {
    if (drawingBox) {
      const minX = Math.min(drawingBox.x1, drawingBox.x2);
      const maxX = Math.max(drawingBox.x1, drawingBox.x2);
      const minY = Math.min(drawingBox.y1, drawingBox.y2);
      const maxY = Math.max(drawingBox.y1, drawingBox.y2);

      if (maxX - minX >= 6 && maxY - minY >= 6) {
        if (activeTool === 'add-floor') {
          const newFloor: FloorRect = { x1: minX, y1: minY, x2: maxX, y2: maxY };
          setFloors((prev) => [...prev, newFloor]);
          setSelectedType('floor');
          setSelectedIndex(floors.length);
          setStatusMsg({ text: `Added Floor #${floors.length + 1}`, type: 'success' });
        } else if (activeTool === 'add-solid' || activeTool === 'add-through') {
          const newObs: ObstacleRect = {
            id: `obs-${Date.now().toString().slice(-4)}`,
            x1: minX,
            y1: minY,
            x2: maxX,
            y2: maxY,
            shape: 'rect',
            through: activeTool === 'add-through',
            occlude: true,
          };
          setObstacles((prev) => [...prev, newObs]);
          setSelectedType('obstacle');
          setSelectedIndex(obstacles.length);
          setStatusMsg({ text: `Added Obstacle: ${newObs.id}`, type: 'success' });
        }
        setTimeout(() => setStatusMsg(null), 2500);
      }
      setDrawingBox(null);
      setActiveTool('select');
    }

    setIsPanning(false);
    setIsDraggingBox(false);
    setActiveHandle(null);
    setDragInitialBox(null);
  };

  // Zoom on Wheel
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.14 : 0.88;
    const newZoom = Math.min(3.2, Math.max(0.35, zoom * factor));

    setPan({
      x: mouseX - ((mouseX - pan.x) / zoom) * newZoom,
      y: mouseY - ((mouseY - pan.y) / zoom) * newZoom,
    });
    setZoom(newZoom);
  };

  // Delete Selected
  const deleteSelected = () => {
    if (selectedIndex === null) return;
    recordHistory();
    if (selectedType === 'floor') {
      setFloors((prev) => prev.filter((_, i) => i !== selectedIndex));
      setStatusMsg({ text: 'Deleted floor box', type: 'info' });
    } else if (selectedType === 'obstacle') {
      const name = obstacles[selectedIndex]?.id;
      setObstacles((prev) => prev.filter((_, i) => i !== selectedIndex));
      setStatusMsg({ text: `Deleted obstacle: ${name}`, type: 'info' });
    }
    setSelectedType(null);
    setSelectedIndex(null);
    setTimeout(() => setStatusMsg(null), 2000);
  };

  // Duplicate Selected
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
    setStatusMsg({ text: 'Duplicated collider box', type: 'success' });
    setTimeout(() => setStatusMsg(null), 2000);
  };

  // Jump to specific Room
  const jumpTo = (targetX: number, targetY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPan({
      x: canvas.width / 2 - targetX * zoom,
      y: canvas.height / 2 - targetY * zoom,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 select-none animate-in fade-in duration-150"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
    >
      <div className="relative flex flex-col w-full h-full max-w-[1720px] max-h-[97vh] bg-[#110d0b] border border-amber-900/40 rounded-2xl shadow-2xl overflow-hidden text-neutral-200">
        {/* Sleek Compact Studio Header (Single Line ~46px) */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-amber-900/30 bg-[#16100e] text-xs">
          {/* Left Title & Status */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-amber-100 tracking-tight">Collider Studio</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                v2.1
              </span>
            </div>
          </div>

          {/* Center Room Jump Buttons */}
          <div className="hidden md:flex items-center gap-1 px-2 py-0.5 bg-black/40 border border-neutral-800 rounded-lg overflow-x-auto">
            <span className="text-[10px] font-bold text-neutral-500 uppercase px-1">Jump:</span>
            {ROOM_SHORTCUTS.map((r) => (
              <button
                key={r.name}
                onClick={() => jumpTo(r.x, r.y)}
                className="px-2 py-0.5 text-[11px] font-medium rounded hover:bg-white/10 text-neutral-300 hover:text-white transition-all flex items-center gap-1 whitespace-nowrap"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: r.color }} />
                {r.name}
              </button>
            ))}
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {statusMsg && (
              <div
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 shadow-sm ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : statusMsg.type === 'error'
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                {statusMsg.text}
              </div>
            )}
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Undo (Ctrl+Z)"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" /> Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" /> Redo
            </button>
            <button
              onClick={loadColliders}
              title="Revert all unsaved changes"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Revert
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/60 transition-all disabled:opacity-50 ml-1"
            >
              <Save className="w-3.5 h-3.5" /> Save & Apply
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Workspace Layout */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Floating Tool Palette (Left) */}
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-1 p-1 rounded-xl bg-[#181210]/95 border border-amber-900/40 shadow-xl backdrop-blur-md">
            <button
              onClick={() => setActiveTool('select')}
              title="Select / Move / Resize (V)"
              className={`p-2 rounded-lg text-xs flex items-center gap-1.5 font-semibold transition-all ${
                activeTool === 'select'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-neutral-300 hover:bg-white/10'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Select & Resize (V)</span>
            </button>
            <button
              onClick={() => setActiveTool('pan')}
              title="Pan Canvas (H / Hold Spacebar)"
              className={`p-2 rounded-lg text-xs flex items-center gap-1.5 font-semibold transition-all ${
                activeTool === 'pan' || isSpaceHeld
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-neutral-300 hover:bg-white/10'
              }`}
            >
              <Hand className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pan (Space / H)</span>
            </button>
            <div className="h-px bg-neutral-800 my-0.5" />
            <button
              onClick={() => setActiveTool('add-floor')}
              title="Draw Walkable Floor (F)"
              className={`p-2 rounded-lg text-xs flex items-center gap-1.5 font-semibold transition-all ${
                activeTool === 'add-floor'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Draw Floor (F)</span>
            </button>
            <button
              onClick={() => setActiveTool('add-solid')}
              title="Draw Solid Obstacle (O)"
              className={`p-2 rounded-lg text-xs flex items-center gap-1.5 font-semibold transition-all ${
                activeTool === 'add-solid'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Solid Obstacle (O)</span>
            </button>
            <button
              onClick={() => setActiveTool('add-through')}
              title="Draw Walk-Behind Scenery (T)"
              className={`p-2 rounded-lg text-xs flex items-center gap-1.5 font-semibold transition-all ${
                activeTool === 'add-through'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-purple-400 hover:bg-purple-500/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Walk-Behind (T)</span>
            </button>
          </div>

          {/* Canvas Viewport */}
          <div
            ref={containerRef}
            className="relative flex-1 bg-[#090706] overflow-hidden flex items-center justify-center"
            style={{ cursor: isPanning || isSpaceHeld ? 'grabbing' : hoverCursor }}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onWheel={handleWheel}
              className="block w-full h-full"
            />

            {/* Bottom Floating Canvas Navigation Bar */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#181210]/95 border border-amber-900/40 shadow-xl backdrop-blur-md text-xs font-sans">
              <button
                onClick={() => setZoom((z) => Math.max(0.35, z - 0.15))}
                className="p-1 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold text-amber-200 min-w-[45px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(3.2, z + 0.15))}
                className="p-1 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="h-3.5 w-px bg-neutral-700 mx-0.5" />
              <button
                onClick={() => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const fitZoom = Math.min(canvas.width / WORLD_WIDTH, canvas.height / WORLD_HEIGHT) * 0.95;
                  setZoom(fitZoom);
                  setPan({
                    x: (canvas.width - WORLD_WIDTH * fitZoom) / 2,
                    y: (canvas.height - WORLD_HEIGHT * fitZoom) / 2,
                  });
                }}
                className="px-2 py-0.5 text-[11px] text-neutral-300 hover:text-white hover:bg-neutral-800 rounded font-medium"
              >
                Fit Campus
              </button>
              <div className="h-3.5 w-px bg-neutral-700 mx-0.5" />
              <span className="text-[11px] text-neutral-400">Snap:</span>
              {[1, 2, 4, 8, 16].map((s) => (
                <button
                  key={s}
                  onClick={() => setSnapGrid(s)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded ${
                    snapGrid === s ? 'bg-amber-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {s}px
                </button>
              ))}
              <div className="h-3.5 w-px bg-neutral-700 mx-0.5" />
              <span className="text-[11px] font-mono text-neutral-400">
                X: <strong className="text-amber-200">{cursorWorld.x}</strong> Y:{' '}
                <strong className="text-amber-200">{cursorWorld.y}</strong>
              </span>
            </div>

            {/* Sidebar Toggle Button */}
            <button
              onClick={() => setIsSidebarOpen((v) => !v)}
              className="absolute top-3 right-3 z-20 p-2 rounded-lg bg-[#181210]/90 border border-amber-900/40 text-neutral-300 hover:text-white shadow-lg backdrop-blur-md"
              title={isSidebarOpen ? 'Hide Inspector' : 'Show Inspector'}
            >
              {isSidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </div>

          {/* Right Inspector & List Sidebar */}
          {isSidebarOpen && (
            <div className="w-80 bg-[#140e0c] border-l border-amber-900/30 flex flex-col overflow-hidden font-sans">
              {/* Sidebar Tabs */}
              <div className="flex border-b border-neutral-800/80 bg-[#100b09]">
                <button
                  onClick={() => setSidebarTab('inspector')}
                  className={`flex-1 py-2 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-colors ${
                    sidebarTab === 'inspector'
                      ? 'border-amber-500 text-amber-300 bg-amber-500/5'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Sliders className="w-3 h-3" /> Inspector
                </button>
                <button
                  onClick={() => setSidebarTab('list')}
                  className={`flex-1 py-2 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-colors ${
                    sidebarTab === 'list'
                      ? 'border-amber-500 text-amber-300 bg-amber-500/5'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Layers className="w-3 h-3" /> List ({floors.length + obstacles.length})
                </button>
                <button
                  onClick={() => setSidebarTab('settings')}
                  className={`flex-1 py-2 text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-colors ${
                    sidebarTab === 'settings'
                      ? 'border-amber-500 text-amber-300 bg-amber-500/5'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Eye className="w-3 h-3" /> Display
                </button>
              </div>

              {/* Tab 1: Inspector */}
              {sidebarTab === 'inspector' && (
                <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3">
                  {selectedItem ? (
                    <>
                      {/* Selection Header */}
                      <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between shadow-sm">
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 truncate">
                            {selectedType === 'floor' ? 'Walkable Floor' : 'Obstacle Barrier'}
                          </div>
                          <div className="text-xs font-bold text-amber-200 truncate">
                            {selectedType === 'floor' ? `Floor #${selectedIndex! + 1}` : (selectedItem as ObstacleRect).id}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={duplicateSelected}
                            title="Duplicate (Ctrl+D)"
                            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={deleteSelected}
                            title="Delete (Del / Backspace)"
                            className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Coordinates & Dimensions Form */}
                      <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col gap-2.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          Coordinates (px)
                        </span>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] font-mono text-neutral-400">Left (X1)</label>
                            <input
                              type="number"
                              value={selectedItem.x1}
                              onChange={(e) => {
                                recordHistory();
                                const val = Number(e.target.value);
                                if (selectedType === 'floor') {
                                  setFloors((prev) => prev.map((f, i) => (i === selectedIndex ? { ...f, x1: val } : f)));
                                } else {
                                  setObstacles((prev) => prev.map((ob, i) => (i === selectedIndex ? { ...ob, x1: val } : ob)));
                                }
                              }}
                              className="px-2 py-1 text-xs font-mono font-bold bg-black/60 border border-neutral-700 rounded text-amber-200 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] font-mono text-neutral-400">Top (Y1)</label>
                            <input
                              type="number"
                              value={selectedItem.y1}
                              onChange={(e) => {
                                recordHistory();
                                const val = Number(e.target.value);
                                if (selectedType === 'floor') {
                                  setFloors((prev) => prev.map((f, i) => (i === selectedIndex ? { ...f, y1: val } : f)));
                                } else {
                                  setObstacles((prev) => prev.map((ob, i) => (i === selectedIndex ? { ...ob, y1: val } : ob)));
                                }
                              }}
                              className="px-2 py-1 text-xs font-mono font-bold bg-black/60 border border-neutral-700 rounded text-amber-200 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] font-mono text-neutral-400">Right (X2)</label>
                            <input
                              type="number"
                              value={selectedItem.x2}
                              onChange={(e) => {
                                recordHistory();
                                const val = Number(e.target.value);
                                if (selectedType === 'floor') {
                                  setFloors((prev) => prev.map((f, i) => (i === selectedIndex ? { ...f, x2: val } : f)));
                                } else {
                                  setObstacles((prev) => prev.map((ob, i) => (i === selectedIndex ? { ...ob, x2: val } : ob)));
                                }
                              }}
                              className="px-2 py-1 text-xs font-mono font-bold bg-black/60 border border-neutral-700 rounded text-amber-200 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] font-mono text-neutral-400">Bottom (Y2)</label>
                            <input
                              type="number"
                              value={selectedItem.y2}
                              onChange={(e) => {
                                recordHistory();
                                const val = Number(e.target.value);
                                if (selectedType === 'floor') {
                                  setFloors((prev) => prev.map((f, i) => (i === selectedIndex ? { ...f, y2: val } : f)));
                                } else {
                                  setObstacles((prev) => prev.map((ob, i) => (i === selectedIndex ? { ...ob, y2: val } : ob)));
                                }
                              }}
                              className="px-2 py-1 text-xs font-mono font-bold bg-black/60 border border-neutral-700 rounded text-amber-200 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-neutral-800 text-[11px] text-neutral-400">
                          <span>Width: <strong className="text-white font-mono">{selectedItem.x2 - selectedItem.x1}px</strong></span>
                          <span>Height: <strong className="text-white font-mono">{selectedItem.y2 - selectedItem.y1}px</strong></span>
                        </div>
                      </div>

                      {/* Obstacle Properties */}
                      {selectedType === 'obstacle' && (
                        <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col gap-2.5">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                            Obstacle ID
                          </span>
                          <input
                            type="text"
                            value={(selectedItem as ObstacleRect).id}
                            onChange={(e) => {
                              const val = e.target.value;
                              setObstacles((prev) =>
                                prev.map((ob, i) => (i === selectedIndex ? { ...ob, id: val } : ob))
                              );
                            }}
                            className="px-2.5 py-1 text-xs font-mono bg-black/60 border border-neutral-700 rounded text-white focus:outline-none focus:border-amber-500"
                          />

                          <label className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-neutral-800 cursor-pointer hover:bg-black/60">
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
                              className="rounded border-neutral-700 bg-neutral-900 text-purple-600 focus:ring-0 w-3.5 h-3.5"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-purple-300">Walk-Behind (Through)</span>
                              <span className="text-[10px] text-neutral-400">Player walks behind scenery</span>
                            </div>
                          </label>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-neutral-500">
                      <MousePointer className="w-6 h-6 mb-1.5 opacity-40" />
                      <p className="text-xs">Click any box on the map to inspect, resize, or move.</p>
                      <p className="text-[10px] text-neutral-600 mt-1">Hold Spacebar to pan the map.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: List */}
              {sidebarTab === 'list' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-2 border-b border-neutral-800">
                    <div className="relative">
                      <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        placeholder="Search colliders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-7 pr-2.5 py-1 text-xs bg-black/60 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 px-1">
                      Obstacles ({filteredList.obstacles.length})
                    </div>
                    {filteredList.obstacles.map((ob) => (
                      <div
                        key={ob.id}
                        onClick={() => {
                          setSelectedType('obstacle');
                          setSelectedIndex(ob.index);
                          setSidebarTab('inspector');
                          jumpTo((ob.x1 + ob.x2) / 2, (ob.y1 + ob.y2) / 2);
                        }}
                        className={`p-2 rounded-lg border text-xs font-mono flex items-center justify-between cursor-pointer transition-all ${
                          selectedType === 'obstacle' && selectedIndex === ob.index
                            ? 'bg-rose-500/20 border-rose-500/60 text-rose-200'
                            : 'bg-neutral-900/60 border-neutral-800/60 hover:bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <span className="font-semibold truncate">{ob.id}</span>
                        <span className="text-[10px] text-neutral-500">{ob.x2 - ob.x1}×{ob.y2 - ob.y1}</span>
                      </div>
                    ))}

                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-1 mt-1.5">
                      Walkable Floors ({filteredList.floors.length})
                    </div>
                    {filteredList.floors.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => {
                          setSelectedType('floor');
                          setSelectedIndex(f.index);
                          setSidebarTab('inspector');
                          jumpTo((f.x1 + f.x2) / 2, (f.y1 + f.y2) / 2);
                        }}
                        className={`p-2 rounded-lg border text-xs font-mono flex items-center justify-between cursor-pointer transition-all ${
                          selectedType === 'floor' && selectedIndex === f.index
                            ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200'
                            : 'bg-neutral-900/60 border-neutral-800/60 hover:bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <span className="font-semibold">{f.id}</span>
                        <span className="text-[10px] text-neutral-500">{f.x2 - f.x1}×{f.y2 - f.y1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Display Settings */}
              {sidebarTab === 'settings' && (
                <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3">
                  <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Layer Visibility
                    </span>
                    <button
                      onClick={() => setShowFloors((v) => !v)}
                      className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-neutral-800 text-xs font-semibold"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Walkable Floors
                      </span>
                      {showFloors ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-neutral-600" />}
                    </button>
                    <button
                      onClick={() => setShowObstacles((v) => !v)}
                      className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-neutral-800 text-xs font-semibold"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Obstacles & Barriers
                      </span>
                      {showObstacles ? <Eye className="w-3.5 h-3.5 text-rose-400" /> : <EyeOff className="w-3.5 h-3.5 text-neutral-600" />}
                    </button>
                    <button
                      onClick={() => setShowGridLines((v) => !v)}
                      className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-neutral-800 text-xs font-semibold"
                    >
                      <span className="flex items-center gap-1.5">
                        <Grid className="w-3.5 h-3.5 text-neutral-400" /> 32px Grid Lines
                      </span>
                      {showGridLines ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <span className="text-neutral-600">Off</span>}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col gap-2.5">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Visual Sliders
                    </span>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-400">Map Dimmer</span>
                        <span className="font-mono text-amber-200">{Math.round(bgDimmer * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="1"
                        step="0.05"
                        value={bgDimmer}
                        onChange={(e) => setBgDimmer(Number(e.target.value))}
                        className="accent-amber-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-400">Collider Overlay Opacity</span>
                        <span className="font-mono text-amber-200">{Math.round(overlayOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={overlayOpacity}
                        onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                        className="accent-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
