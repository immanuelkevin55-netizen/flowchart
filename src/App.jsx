import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import Navbar from './components/Navbar';
import SlideDeckBar from './components/SlideDeckBar';
import Canvas from './components/Canvas';
import PropertyPanel from './components/PropertyPanel';
import TextToFlowModal from './components/TextToFlowModal';
import TemplatesModal from './components/TemplatesModal';
import PresentationModal from './components/PresentationModal';
import LoginScreen from './components/LoginScreen';
import { THEMES, SHAPE_TYPES, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from './types/constants';
import { TEMPLATES } from './utils/templates';
import { exportToPowerPoint } from './utils/pptxExporter';
import './App.css';

const STORAGE_KEY = 'slideflow_studio_deck_v2';

function getInitialDeck() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read saved deck from localStorage:', e);
  }
  return null;
}

export default function App() {
  const initialData = useRef(getInitialDeck()).current;

  // Main Presentation Deck State
  const [presentationTitle, setPresentationTitle] = useState(
    () => initialData?.presentationTitle || 'Process Architecture Presentation'
  );
  const [activeTheme, setActiveTheme] = useState(() => {
    if (initialData?.themeId && THEMES[initialData.themeId]) {
      return THEMES[initialData.themeId];
    }
    if (initialData?.activeTheme) {
      return initialData.activeTheme;
    }
    return THEMES.EXECUTIVE_NAVY;
  });
  const [isLightMode, setIsLightMode] = useState(
    () => Boolean(initialData?.isLightMode)
  );

  // Sidebar Collapse States
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(
    () => initialData?.isLeftSidebarOpen !== false
  );
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(
    () => initialData?.isRightSidebarOpen !== false
  );

  // Active Tool: 'select' | 'connector'
  const [activeTool, setActiveTool] = useState('select');

  // Fullscreen Presentation Mode State
  const [isPresenting, setIsPresenting] = useState(false);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ppt_user_session');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return null;
  });

  const handleLogout = () => {
    try {
      localStorage.removeItem('ppt_user_session');
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    showToast('Signed out successfully', 'info');
  };

  // Initialize slides from storage or clean fresh blank slide
  const [slides, setSlides] = useState(() => {
    if (initialData?.slides && initialData.slides.length > 0) {
      return initialData.slides;
    }
    return [{
      id: `slide-${Date.now()}-0`,
      title: 'Workflow Architecture & Decision Flow',
      subtitle: 'Process Diagram & Operational Hierarchy',
      notes: '',
      nodes: [],
      connectors: []
    }];
  });

  const [activeSlideIndex, setActiveSlideIndex] = useState(() => {
    if (typeof initialData?.activeSlideIndex === 'number' && initialData.slides?.[initialData.activeSlideIndex]) {
      return initialData.activeSlideIndex;
    }
    return 0;
  });

  // History stack for Undo / Redo
  const [history, setHistory] = useState({
    past: [],
    future: []
  });

  // Auto-persist presentation deck to localStorage on any edit
  useEffect(() => {
    try {
      const dataToSave = {
        presentationTitle,
        themeId: activeTheme.id,
        activeTheme,
        isLightMode,
        isLeftSidebarOpen,
        isRightSidebarOpen,
        slides,
        activeSlideIndex,
        savedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (err) {
      console.warn('Error saving presentation to localStorage:', err);
    }
  }, [presentationTitle, activeTheme, isLightMode, isLeftSidebarOpen, isRightSidebarOpen, slides, activeSlideIndex]);

  // Selection state
  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // 'node' | 'connector' | null

  // Canvas Settings
  const [showGrid, setShowGrid] = useState(true);
  const [gridSnap, setGridSnap] = useState(true);

  // Modals state
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isTextToFlowOpen, setIsTextToFlowOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState({ message: '', visible: false, type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ message, visible: true, type });
    setTimeout(() => {
      setToast({ message: '', visible: false, type: 'info' });
    }, 3800);
  };

  const activeSlide = slides[activeSlideIndex] || slides[0];

  // Toggle Light / Dark Studio Mode
  const handleToggleLightMode = () => {
    setIsLightMode((prev) => {
      const nextMode = !prev;
      if (nextMode) {
        setActiveTheme(THEMES.CLEAN_LIGHT);
        showToast('Switched to Light Studio Mode', 'info');
      } else {
        setActiveTheme(THEMES.EXECUTIVE_NAVY);
        showToast('Switched to Dark Studio Mode', 'info');
      }
      return nextMode;
    });
  };

  // Push new state to history stack
  const pushToHistory = useCallback((newSlides) => {
    setHistory((prev) => ({
      past: [...prev.past.slice(-25), slides],
      future: []
    }));
    setSlides(newSlides);
  }, [slides]);

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);

    setHistory({
      past: newPast,
      future: [slides, ...history.future]
    });
    setSlides(previous);
  }, [history, slides]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);

    setHistory({
      past: [...history.past, slides],
      future: newFuture
    });
    setSlides(next);
  }, [history, slides]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is currently typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        if (selectedType === 'node') handleDeleteNode(selectedId);
        if (selectedType === 'connector') handleDeleteConnector(selectedId);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedId && selectedType === 'node') {
        e.preventDefault();
        handleDuplicateNode(selectedId);
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'c' || e.key === 'C' || e.key === 'a' || e.key === 'A') {
        setActiveTool('connector');
        showToast('Draw Arrow Tool active! Click & drag anywhere to connect.', 'info');
      } else if (e.key === '[' || e.key === '{') {
        e.preventDefault();
        setIsLeftSidebarOpen((prev) => !prev);
      } else if (e.key === ']' || e.key === '}') {
        e.preventDefault();
        setIsRightSidebarOpen((prev) => !prev);
      } else if (e.key === 'F5') {
        e.preventDefault();
        setIsPresenting(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedType, handleUndo, handleRedo]);

  // Update current slide helper
  const updateCurrentSlide = (updater) => {
    const updated = slides.map((s, idx) => {
      if (idx !== activeSlideIndex) return s;
      return typeof updater === 'function' ? updater(s) : { ...s, ...updater };
    });
    pushToHistory(updated);
  };

  // 1. Slide Management
  const handleAddSlide = () => {
    const newSlide = {
      id: `slide-${Date.now()}-${slides.length}`,
      title: `Slide ${slides.length + 1} Workflow`,
      subtitle: 'Add subtitle or process description',
      notes: '',
      nodes: [
        {
          id: `node-${Date.now()}-1`,
          text: 'Start Process',
          shape: SHAPE_TYPES.TERMINATOR,
          x: 700,
          y: 200,
          width: 200,
          height: 70,
          fill: activeTheme.terminator.fill,
          stroke: activeTheme.terminator.stroke,
          textColor: activeTheme.terminator.textColor,
          strokeWidth: 2,
          fontSize: 14,
          fontFamily: 'Inter',
          textAlign: 'center'
        }
      ],
      connectors: []
    };

    const newSlides = [...slides, newSlide];
    pushToHistory(newSlides);
    setActiveSlideIndex(newSlides.length - 1);
    setSelectedId(null);
    setSelectedType(null);
    showToast(`Added Slide #${newSlides.length}`, 'success');
  };

  const handleDuplicateSlide = (index) => {
    const target = slides[index];
    const cloned = JSON.parse(JSON.stringify(target));
    cloned.id = `slide-${Date.now()}-${index}`;
    cloned.title = `${cloned.title} (Copy)`;

    const newSlides = [...slides.slice(0, index + 1), cloned, ...slides.slice(index + 1)];
    pushToHistory(newSlides);
    setActiveSlideIndex(index + 1);
    showToast(`Duplicated Slide #${index + 1}`, 'success');
  };

  const handleDeleteSlide = (index) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, idx) => idx !== index);
    pushToHistory(newSlides);
    setActiveSlideIndex(Math.max(0, index - 1));
    setSelectedId(null);
    setSelectedType(null);
    showToast(`Deleted Slide #${index + 1}`, 'info');
  };

  const handleMoveSlide = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= slides.length) return;
    const reordered = [...slides];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    pushToHistory(reordered);
    setActiveSlideIndex(toIndex);
  };

  // 2. Node & Shape Management
  const handleAddShape = (shapeType, defaultWidth = 200, defaultHeight = 80) => {
    // If user clicked "Connector Arrow" in palette
    if (shapeType === 'ARROW') {
      const newConn = {
        id: `conn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fromId: null,
        toId: null,
        startX: 650,
        startY: 380,
        endX: 850,
        endY: 380,
        label: '',
        type: 'orthogonal',
        color: activeTheme.connector || '#38BDF8',
        width: 2,
        style: 'solid'
      };

      updateCurrentSlide((s) => ({
        ...s,
        connectors: [...(s.connectors || []), newConn]
      }));

      setSelectedId(newConn.id);
      setSelectedType('connector');
      showToast('Added Connector Arrow! Drag its endpoint dots anywhere you want.', 'info');
      return;
    }

    let fill = activeTheme.primary.fill;
    let stroke = activeTheme.primary.stroke;
    let textColor = activeTheme.primary.textColor;

    if (shapeType === SHAPE_TYPES.DECISION) {
      fill = activeTheme.decision.fill;
      stroke = activeTheme.decision.stroke;
      textColor = activeTheme.decision.textColor;
    } else if (shapeType === SHAPE_TYPES.TERMINATOR) {
      fill = activeTheme.terminator.fill;
      stroke = activeTheme.terminator.stroke;
      textColor = activeTheme.terminator.textColor;
    }

    const newNode = {
      id: `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      text: shapeType === SHAPE_TYPES.DECISION ? 'Decision?' : 'New Step',
      shape: shapeType,
      x: 700 + Math.floor(Math.random() * 40 - 20),
      y: 350 + Math.floor(Math.random() * 40 - 20),
      width: defaultWidth,
      height: defaultHeight,
      fill,
      stroke,
      textColor,
      strokeWidth: 2,
      strokeStyle: 'solid',
      fontSize: 14,
      fontFamily: 'Inter',
      textAlign: 'center'
    };

    updateCurrentSlide((s) => ({
      ...s,
      nodes: [...(s.nodes || []), newNode]
    }));

    setSelectedId(newNode.id);
    setSelectedType('node');
  };

  const handleUpdateNode = (nodeId, updates) => {
    updateCurrentSlide((s) => ({
      ...s,
      nodes: (s.nodes || []).map((n) => (n.id === nodeId ? { ...n, ...updates } : n))
    }));
  };

  const handleDeleteNode = (nodeId) => {
    updateCurrentSlide((s) => ({
      ...s,
      nodes: (s.nodes || []).filter((n) => n.id !== nodeId),
      // Also remove all connectors touching this node
      connectors: (s.connectors || []).filter((c) => c.fromId !== nodeId && c.toId !== nodeId)
    }));
    setSelectedId(null);
    setSelectedType(null);
  };

  const handleDuplicateNode = (nodeId) => {
    const node = (activeSlide.nodes || []).find((n) => n.id === nodeId);
    if (!node) return;

    const cloned = {
      ...JSON.parse(JSON.stringify(node)),
      id: `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      x: node.x + 40,
      y: node.y + 40
    };

    updateCurrentSlide((s) => ({
      ...s,
      nodes: [...s.nodes, cloned]
    }));

    setSelectedId(cloned.id);
    setSelectedType('node');
  };

  // 3. Connector Management
  const handleAddConnector = (connectorData) => {
    const newConnector = {
      id: `conn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...connectorData
    };

    updateCurrentSlide((s) => ({
      ...s,
      connectors: [...(s.connectors || []), newConnector]
    }));

    setSelectedId(newConnector.id);
    setSelectedType('connector');
    showToast('Arrow connected! Drag endpoint handles anytime to reconnect.', 'info');
  };

  const handleUpdateConnector = (connId, updates) => {
    updateCurrentSlide((s) => ({
      ...s,
      connectors: (s.connectors || []).map((c) => (c.id === connId ? { ...c, ...updates } : c))
    }));
  };

  const handleDeleteConnector = (connId) => {
    updateCurrentSlide((s) => ({
      ...s,
      connectors: (s.connectors || []).filter((c) => c.id !== connId)
    }));
    setSelectedId(null);
    setSelectedType(null);
  };

  // Auto-Connect All Steps in Sequence (Left-to-Right)
  const handleAutoConnectSteps = () => {
    const currentNodes = [...(activeSlide.nodes || [])];
    if (currentNodes.length < 2) {
      showToast('Add at least 2 steps on the slide to auto-connect', 'info');
      return;
    }

    // Sort nodes by X coordinate (left to right)
    currentNodes.sort((a, b) => a.x - b.x);

    const newConnectors = [];
    for (let i = 0; i < currentNodes.length - 1; i++) {
      newConnectors.push({
        id: `conn-${Date.now()}-${i}`,
        fromId: currentNodes[i].id,
        toId: currentNodes[i + 1].id,
        fromPort: 'right',
        toPort: 'left',
        label: '',
        type: 'orthogonal',
        color: activeTheme.connector || '#38BDF8',
        width: 2,
        style: 'solid'
      });
    }

    updateCurrentSlide((s) => ({
      ...s,
      connectors: newConnectors
    }));

    showToast(`Linked all ${currentNodes.length} steps in sequence!`, 'success');
  };

  // 4. Modals and Templates
  const handleApplyTemplate = (template, asNewSlide = false) => {
    const tplTheme = THEMES[template.themeId] || activeTheme;
    setActiveTheme(tplTheme);

    const slidePayload = {
      id: `slide-${Date.now()}`,
      title: template.title,
      subtitle: template.subtitle,
      notes: template.notes || '',
      nodes: JSON.parse(JSON.stringify(template.nodes)),
      connectors: JSON.parse(JSON.stringify(template.connectors))
    };

    if (asNewSlide) {
      const newSlides = [...slides, slidePayload];
      pushToHistory(newSlides);
      setActiveSlideIndex(newSlides.length - 1);
      showToast(`Added template as Slide #${newSlides.length}`, 'success');
    } else {
      updateCurrentSlide(() => slidePayload);
      showToast(`Applied template to current slide`, 'success');
    }

    setSelectedId(null);
    setSelectedType(null);
  };

  const handleApplyTextToFlow = (data, asNewSlide = false) => {
    const slidePayload = {
      id: `slide-${Date.now()}`,
      title: data.title,
      subtitle: data.subtitle,
      notes: 'Generated from text workflow',
      nodes: data.nodes,
      connectors: data.connectors
    };

    if (asNewSlide) {
      const newSlides = [...slides, slidePayload];
      pushToHistory(newSlides);
      setActiveSlideIndex(newSlides.length - 1);
      showToast(`Added generated flow as Slide #${newSlides.length}`, 'success');
    } else {
      updateCurrentSlide(() => slidePayload);
      showToast(`Generated flowchart on current slide`, 'success');
    }

    setSelectedId(null);
    setSelectedType(null);
  };

  // 5. Native PowerPoint (.pptx) Export
  const handleExportPptx = async () => {
    try {
      setIsExporting(true);
      showToast('Generating native PowerPoint presentation...', 'info');

      const filename = await exportToPowerPoint({
        slides,
        activeTheme,
        presentationTitle,
        canvasWidth: DEFAULT_CANVAS_WIDTH,
        canvasHeight: DEFAULT_CANVAS_HEIGHT
      });

      showToast(`Exported "${filename}" successfully! Ready to open in PowerPoint.`, 'success');
    } catch (err) {
      console.error('PPTX Export error:', err);
      showToast('Failed to export PPTX. Check console for details.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // 6. High-Res PNG Export
  const handleExportPng = () => {
    try {
      const svg = document.querySelector('.slide-canvas-svg');
      if (!svg) return;

      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svg);

      // Add name spaces
      if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = DEFAULT_CANVAS_WIDTH;
        canvas.height = DEFAULT_CANVAS_HEIGHT;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${presentationTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_slide_${activeSlideIndex + 1}.png`;
        link.href = pngUrl;
        link.click();
        URL.revokeObjectURL(blobURL);

        showToast('Slide exported as high-resolution PNG!', 'success');
      };
      image.src = blobURL;
    } catch (err) {
      console.error('PNG export error:', err);
      showToast('Error exporting PNG image.', 'error');
    }
  };

  // 7. Save / Load Project JSON
  const handleSaveJson = () => {
    const projectData = {
      version: '1.0',
      title: presentationTitle,
      themeId: activeTheme.id,
      slides
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${presentationTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_project.json`;
    link.click();
    showToast('Project file saved!', 'success');
  };

  const handleLoadJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.slides && Array.isArray(data.slides)) {
          setPresentationTitle(data.title || 'Loaded Presentation');
          if (data.themeId && THEMES[data.themeId]) {
            setActiveTheme(THEMES[data.themeId]);
          }
          setSlides(data.slides);
          setActiveSlideIndex(0);
          setSelectedId(null);
          setSelectedType(null);
          showToast('Project loaded successfully!', 'success');
        } else {
          showToast('Invalid project file format.', 'error');
        }
      } catch (err) {
        console.error('Failed to parse JSON file:', err);
        showToast('Error reading project file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // 8. Start Fresh Presentation Deck
  const handleResetDeck = () => {
    if (window.confirm('Start a fresh presentation? This will clear current slides.')) {
      const freshSlide = {
        id: `slide-${Date.now()}-0`,
        title: 'Slide 1 - Workflow',
        subtitle: 'Process overview',
        notes: '',
        nodes: [
          {
            id: `node-${Date.now()}-1`,
            x: 200,
            y: 260,
            width: 170,
            height: 80,
            shape: SHAPE_TYPES.PROCESS,
            text: 'Start Process',
            fill: activeTheme.primary.fill,
            stroke: activeTheme.primary.stroke,
            strokeWidth: 2,
            fontSize: 14
          },
          {
            id: `node-${Date.now()}-2`,
            x: 480,
            y: 260,
            width: 170,
            height: 80,
            shape: SHAPE_TYPES.PROCESS,
            text: 'Next Step',
            fill: activeTheme.primary.fill,
            stroke: activeTheme.primary.stroke,
            strokeWidth: 2,
            fontSize: 14
          }
        ],
        connectors: [
          {
            id: `conn-${Date.now()}-1`,
            fromId: `node-${Date.now()}-1`,
            toId: `node-${Date.now()}-2`,
            fromPort: 'right',
            toPort: 'left',
            label: '',
            type: 'orthogonal',
            color: activeTheme.connector || '#38BDF8',
            width: 2,
            style: 'solid'
          }
        ]
      };
      setPresentationTitle('New Presentation');
      setSlides([freshSlide]);
      setActiveSlideIndex(0);
      setSelectedId(null);
      setSelectedType(null);
      setHistory({ past: [], future: [] });
      showToast('Started fresh presentation', 'info');
    }
  };

  // If unauthenticated, gate with the login screen
  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={(user) => {
          setCurrentUser(user);
          showToast(`Welcome back, ${user.username}!`, 'success');
        }}
      />
    );
  }

  return (
    <div className={`slideflow-app-root ${isLightMode ? 'light-theme' : 'dark-theme'}`}>
      {/* Top Navigation Bar */}
      <Navbar
        presentationTitle={presentationTitle}
        setPresentationTitle={setPresentationTitle}
        activeTheme={activeTheme}
        setActiveTheme={setActiveTheme}
        isLightMode={isLightMode}
        onToggleLightMode={handleToggleLightMode}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        gridSnap={gridSnap}
        setGridSnap={setGridSnap}
        isLeftSidebarOpen={isLeftSidebarOpen}
        onToggleLeftSidebar={() => setIsLeftSidebarOpen((prev) => !prev)}
        isRightSidebarOpen={isRightSidebarOpen}
        onToggleRightSidebar={() => setIsRightSidebarOpen((prev) => !prev)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenTextToFlow={() => setIsTextToFlowOpen(true)}
        onExportPptx={handleExportPptx}
        onExportPng={handleExportPng}
        onSaveJson={handleSaveJson}
        onLoadJson={handleLoadJson}
        onResetDeck={handleResetDeck}
        onPresent={() => setIsPresenting(true)}
        isExporting={isExporting}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Studio Workspace Layout */}
      <div className="workspace-main-layout">
        {/* Left Sidebar: Slide Deck & Shape Palette */}
        <SlideDeckBar
          slides={slides}
          activeSlideIndex={activeSlideIndex}
          onSelectSlide={(idx) => {
            setActiveSlideIndex(idx);
            setSelectedId(null);
            setSelectedType(null);
          }}
          onAddSlide={handleAddSlide}
          onDuplicateSlide={handleDuplicateSlide}
          onDeleteSlide={handleDeleteSlide}
          onMoveSlide={handleMoveSlide}
          onAddShape={handleAddShape}
          onAutoConnectSteps={handleAutoConnectSteps}
          theme={activeTheme}
          isOpen={isLeftSidebarOpen}
          onToggleOpen={() => setIsLeftSidebarOpen(false)}
        />

        {/* Center: 16:9 Presentation Stage Canvas */}
        <main className="workspace-canvas-stage">
          {/* Floating Reopen Tabs when sidebars are collapsed */}
          {!isLeftSidebarOpen && (
            <button
              className="sidebar-floating-toggle left"
              onClick={() => setIsLeftSidebarOpen(true)}
              title="Open Shapes & Slides ([)"
              aria-label="Open Left Sidebar"
            >
              <PanelLeftOpen size={15} />
              <span>Shapes & Slides</span>
            </button>
          )}

          {!isRightSidebarOpen && (
            <button
              className="sidebar-floating-toggle right"
              onClick={() => setIsRightSidebarOpen(true)}
              title="Open Properties (])"
              aria-label="Open Right Sidebar"
            >
              <PanelRightOpen size={15} />
              <span>Properties</span>
            </button>
          )}

          <Canvas
            slide={activeSlide}
            theme={activeTheme}
            selectedId={selectedId}
            selectedType={selectedType}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            isLeftSidebarOpen={isLeftSidebarOpen}
            isRightSidebarOpen={isRightSidebarOpen}
            onSelect={(id, type) => {
              setSelectedId(id);
              setSelectedType(type);
            }}
            onUpdateNode={handleUpdateNode}
            onUpdateConnector={handleUpdateConnector}
            onDeleteNode={handleDeleteNode}
            onDeleteConnector={handleDeleteConnector}
            onDuplicateNode={handleDuplicateNode}
            onAddConnector={handleAddConnector}
            onUpdateSlide={(updates) => updateCurrentSlide(updates)}
            onOpenTemplates={() => setIsTemplatesOpen(true)}
            showGrid={showGrid}
            gridSnap={gridSnap}
          />
        </main>

        {/* Right Sidebar: Properties & Slide Notes Inspector */}
        <PropertyPanel
          selectedId={selectedId}
          selectedType={selectedType}
          slide={activeSlide}
          theme={activeTheme}
          onUpdateNode={handleUpdateNode}
          onUpdateConnector={handleUpdateConnector}
          onDeleteNode={handleDeleteNode}
          onDeleteConnector={handleDeleteConnector}
          onDuplicateNode={handleDuplicateNode}
          onUpdateSlide={(updates) => updateCurrentSlide(updates)}
          isOpen={isRightSidebarOpen}
          onToggleOpen={() => setIsRightSidebarOpen(false)}
        />
      </div>

      {/* Text-to-Flow / AI Prompt Modal */}
      <TextToFlowModal
        isOpen={isTextToFlowOpen}
        onClose={() => setIsTextToFlowOpen(false)}
        onApply={handleApplyTextToFlow}
        currentTheme={activeTheme}
      />

      {/* Templates Library Modal */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onApplyTemplate={handleApplyTemplate}
      />

      {/* Fullscreen Presentation Slideshow Mode */}
      <PresentationModal
        isOpen={isPresenting}
        slides={slides}
        initialSlideIndex={activeSlideIndex}
        theme={activeTheme}
        onClose={() => setIsPresenting(false)}
      />

      {/* Toast Notification Alert */}
      {toast.visible && (
        <div className={`app-toast-alert ${toast.type}`}>
          <div className="toast-dot" />
          <span className="toast-text">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
