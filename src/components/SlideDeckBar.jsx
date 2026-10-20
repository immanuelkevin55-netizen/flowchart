import React, { useState } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  Square,
  Diamond,
  CircleDot,
  Database,
  FileText,
  Hexagon,
  MessageSquare,
  Type,
  Layers,
  Component,
  ArrowRight,
  GitFork,
  PanelLeftClose,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { SHAPE_TYPES } from '../types/constants';

export default function SlideDeckBar({
  slides,
  activeSlideIndex,
  onSelectSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onMoveSlide,
  onAddShape,
  onAutoConnectSteps,
  theme,
  isOpen = true,
  onToggleOpen
}) {
  const [activeTab, setActiveTab] = useState('shapes'); // 'shapes' | 'slides'

  const shapesList = [
    {
      type: SHAPE_TYPES.PROCESS,
      name: 'Process',
      desc: 'Standard Action or Step',
      icon: Square,
      defaultWidth: 200,
      defaultHeight: 80
    },
    {
      type: SHAPE_TYPES.DECISION,
      name: 'Decision',
      desc: 'Conditional Branch / If-Else',
      icon: Diamond,
      defaultWidth: 180,
      defaultHeight: 90
    },
    {
      type: SHAPE_TYPES.TERMINATOR,
      name: 'Start / End',
      desc: 'Flow entry or exit point',
      icon: CircleDot,
      defaultWidth: 200,
      defaultHeight: 70
    },
    {
      type: SHAPE_TYPES.DATABASE,
      name: 'Database',
      desc: 'Storage or Data Entity',
      icon: Database,
      defaultWidth: 190,
      defaultHeight: 90
    },
    {
      type: SHAPE_TYPES.DOCUMENT,
      name: 'Document',
      desc: 'Report or Generated Output',
      icon: FileText,
      defaultWidth: 190,
      defaultHeight: 80
    },
    {
      type: SHAPE_TYPES.DATA,
      name: 'Input / Output',
      desc: 'Data received or transmitted',
      icon: Square,
      defaultWidth: 190,
      defaultHeight: 80
    },
    {
      type: SHAPE_TYPES.PREPARATION,
      name: 'Preparation',
      desc: 'Initialization or Setup',
      icon: Hexagon,
      defaultWidth: 190,
      defaultHeight: 80
    },
    {
      type: SHAPE_TYPES.CALLOUT,
      name: 'Callout Note',
      desc: 'Annotation or explanation',
      icon: MessageSquare,
      defaultWidth: 180,
      defaultHeight: 75
    },
    {
      type: 'ARROW',
      name: 'Connector Arrow',
      desc: 'Draw or place an arrow',
      icon: ArrowRight,
      defaultWidth: 150,
      defaultHeight: 0
    },
    {
      type: SHAPE_TYPES.TEXTBOX,
      name: 'Text Label',
      desc: 'Freeform text without border',
      icon: Type,
      defaultWidth: 180,
      defaultHeight: 50
    }
  ];

  return (
    <aside className={`slide-deck-sidebar ${!isOpen ? 'collapsed' : ''}`}>
      {/* Sidebar Header Tabs */}
      <div className="sidebar-tab-header">
        <button
          className={`sidebar-tab-btn ${activeTab === 'shapes' ? 'active' : ''}`}
          onClick={() => setActiveTab('shapes')}
        >
          <Component size={14} />
          <span>Shapes</span>
        </button>
        <button
          className={`sidebar-tab-btn ${activeTab === 'slides' ? 'active' : ''}`}
          onClick={() => setActiveTab('slides')}
        >
          <Layers size={14} />
          <span>Slides ({slides.length})</span>
        </button>
        {onToggleOpen && (
          <button
            className="sidebar-collapse-btn"
            onClick={onToggleOpen}
            title="Collapse Sidebar (Shortcut: [)"
            aria-label="Collapse Left Sidebar"
          >
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      <div className="sidebar-content-scroll">
        {/* TAB 1: SHAPES PALETTE */}
        {activeTab === 'shapes' && (
          <div className="shape-palette-container">
            <div className="sidebar-section-title">
              <span>Click or Drag to Add</span>
            </div>

            <div className="shape-items-grid">
              {shapesList.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.type}
                    className="shape-palette-item"
                    onClick={() => onAddShape(item.type, item.defaultWidth, item.defaultHeight)}
                    title={`Add ${item.name} (${item.desc})`}
                  >
                    <div className="shape-icon-preview">
                      <IconComponent size={20} className="shape-preview-svg" />
                    </div>
                    <span className="shape-item-label">{item.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="sidebar-action-box">
              <button
                className="auto-wire-btn"
                onClick={onAutoConnectSteps}
                title="Automatically link all boxes in sequence"
              >
                <GitFork size={14} />
                <span>Auto-Connect All Steps</span>
              </button>
            </div>

            <div className="sidebar-hint-box">
              <p className="hint-title">⚡ <strong>How to Draw Arrows:</strong></p>
              <ul className="hint-list">
                <li>Click <strong>Draw Arrow</strong> at the top &amp; drag anywhere</li>
                <li>Click any box and drag from the <strong>glowing edge dots</strong></li>
                <li>Click <strong>Connector Arrow</strong> above to drop an arrow</li>
                <li>Drag arrow endpoints to <strong>reconnect anywhere</strong></li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: SLIDES LIST */}
        {activeTab === 'slides' && (
          <div className="slides-navigator-container">
            <div className="slides-header-row">
              <span className="sidebar-section-title">Presentation Slides</span>
              <button
                className="add-slide-mini-btn"
                onClick={onAddSlide}
                title="Add New Slide"
              >
                <Plus size={14} />
                <span>New Slide</span>
              </button>
            </div>

            <div className="slides-list">
              {slides.map((s, index) => {
                const isActive = index === activeSlideIndex;
                const nodeCount = (s.nodes || []).length;
                const connectorCount = (s.connectors || []).length;

                return (
                  <div
                    key={s.id || index}
                    className={`slide-card-item ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectSlide(index)}
                  >
                    {/* Slide Number Badge */}
                    <div className="slide-card-top-row">
                      <span className="slide-num-badge">#{index + 1}</span>
                      <div className="slide-actions-row">
                        {index > 0 && (
                          <button
                            className="slide-mini-action-btn"
                            title="Move Slide Up"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveSlide && onMoveSlide(index, index - 1);
                            }}
                          >
                            <ChevronUp size={12} />
                          </button>
                        )}
                        {index < slides.length - 1 && (
                          <button
                            className="slide-mini-action-btn"
                            title="Move Slide Down"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveSlide && onMoveSlide(index, index + 1);
                            }}
                          >
                            <ChevronDown size={12} />
                          </button>
                        )}
                        <button
                          className="slide-mini-action-btn"
                          title="Duplicate Slide"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateSlide(index);
                          }}
                        >
                          <Copy size={12} />
                        </button>
                        {slides.length > 1 && (
                          <button
                            className="slide-mini-action-btn danger"
                            title="Delete Slide"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSlide(index);
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Slide Mini Preview Canvas Box */}
                    <div
                      className="slide-thumbnail-box"
                      style={{
                        backgroundColor: (s.theme || theme).bg || '#0F172A',
                        borderColor: isActive ? 'var(--accent, #38BDF8)' : 'rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div className="thumbnail-title-line" style={{ color: (s.theme || theme).titleColor || '#F8FAFC' }}>
                        {s.title || `Slide ${index + 1}`}
                      </div>
                      <div className="thumbnail-stats">
                        {nodeCount} shapes • {connectorCount} connectors
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
