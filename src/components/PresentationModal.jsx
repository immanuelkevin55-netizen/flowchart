import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize
} from 'lucide-react';
import FlowNode from './FlowNode';
import FlowConnector from './FlowConnector';
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '../types/constants';

export default function PresentationModal({
  isOpen,
  slides = [],
  initialSlideIndex = 0,
  theme,
  onClose
}) {
  const [slideIdx, setSlideIdx] = useState(initialSlideIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const hudTimerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    setSlideIdx(initialSlideIndex);
  }, [initialSlideIndex, isOpen]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') {
        e.preventDefault();
        setSlideIdx((prev) => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'Backspace' || e.key === 'PageUp') {
        e.preventDefault();
        setSlideIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, slides.length, onClose]);

  // Auto-hide HUD on idle
  const handleMouseMove = () => {
    setShowHud(true);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => {
      setShowHud(false);
    }, 2800);
  };

  if (!isOpen || slides.length === 0) return null;

  const currentSlide = slides[slideIdx] || slides[0];
  const slideTheme = currentSlide.theme || theme;

  return (
    <div
      ref={containerRef}
      className="presentation-mode-root"
      onMouseMove={handleMouseMove}
      onClick={() => {
        // Clicking advance slide
        if (slideIdx < slides.length - 1) {
          setSlideIdx((prev) => prev + 1);
        }
      }}
    >
      {/* 16:9 Presentation Cinema Stage */}
      <div className="presentation-cinema-stage">
        <svg
          viewBox={`0 0 ${DEFAULT_CANVAS_WIDTH} ${DEFAULT_CANVAS_HEIGHT}`}
          className="presentation-slide-svg"
          style={{
            backgroundColor: slideTheme.bg || '#0F172A',
            boxShadow: '0 30px 80px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Arrowhead Markers for Connectors */}
          <defs>
            {['38BDF8', '818CF8', '10B981', 'F59E0B', 'EF4444', 'C084FC', '2563EB', 'D97706', 'FFFFFF'].map((cleanId) => (
              <marker
                key={cleanId}
                id={`arrow-${cleanId}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill={`#${cleanId}`} />
              </marker>
            ))}
          </defs>

          {/* Slide Header */}
          <g className="slide-header-group">
            {currentSlide.subtitle && (
              <text
                x={60}
                y={60}
                className="slide-header-subtitle"
                fill={slideTheme.subtitleColor || '#94A3B8'}
                fontSize={16}
                fontWeight={600}
                letterSpacing="1px"
              >
                {currentSlide.subtitle}
              </text>
            )}
            <text
              x={60}
              y={105}
              className="slide-header-title"
              fill={slideTheme.titleColor || '#F8FAFC'}
              fontSize={32}
              fontWeight={700}
            >
              {currentSlide.title || 'Slide Title'}
            </text>
            <line
              x1={60}
              y1={125}
              x2={DEFAULT_CANVAS_WIDTH - 60}
              y2={125}
              stroke={slideTheme.gridColor || 'rgba(255, 255, 255, 0.1)'}
              strokeWidth={1}
            />
          </g>

          {/* Connectors Layer */}
          <g className="canvas-connectors-layer">
            {(currentSlide.connectors || []).map((connector) => {
              const fromNode = (currentSlide.nodes || []).find((n) => n.id === connector.fromId);
              const toNode = (currentSlide.nodes || []).find((n) => n.id === connector.toId);
              return (
                <FlowConnector
                  key={connector.id}
                  connector={connector}
                  fromNode={fromNode}
                  toNode={toNode}
                  isSelected={false}
                  onSelect={() => {}}
                  onUpdate={() => {}}
                  onDelete={() => {}}
                />
              );
            })}
          </g>

          {/* Nodes Layer */}
          <g className="canvas-nodes-layer">
            {(currentSlide.nodes || []).map((node) => (
              <FlowNode
                key={node.id}
                node={node}
                isSelected={false}
                isTargeted={false}
                targetPort={null}
                onSelect={() => {}}
                onUpdate={() => {}}
                onDelete={() => {}}
                onDuplicate={() => {}}
                onStartConnect={() => {}}
                zoom={1}
                gridSnap={false}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Floating Bottom HUD Overlay */}
      <div
        className={`presentation-hud-bar ${showHud ? 'visible' : 'hidden'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="hud-ctrl-btn"
          disabled={slideIdx === 0}
          onClick={() => setSlideIdx((p) => Math.max(0, p - 1))}
          title="Previous Slide (Left Arrow)"
        >
          <ChevronLeft size={18} />
        </button>

        <span className="hud-slide-counter">
          Slide {slideIdx + 1} of {slides.length}
        </span>

        <button
          className="hud-ctrl-btn"
          disabled={slideIdx === slides.length - 1}
          onClick={() => setSlideIdx((p) => Math.min(slides.length - 1, p + 1))}
          title="Next Slide (Right Arrow, Space)"
        >
          <ChevronRight size={18} />
        </button>

        <div className="hud-divider" />

        <button
          className="hud-ctrl-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>

        <button
          className="hud-ctrl-btn exit"
          onClick={onClose}
          title="Exit Slideshow (Esc)"
        >
          <X size={16} />
          <span>Exit</span>
        </button>
      </div>
    </div>
  );
}
