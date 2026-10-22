import React, { useState } from 'react';
import {
  SHAPE_TYPES,
  CONNECTOR_TYPES
} from '../types/constants';
import {
  Trash2,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Sliders,
  Type,
  Palette,
  FileSpreadsheet,
  CornerDownRight,
  PanelRightClose,
  Layers,
  MoveHorizontal,
  MoveVertical
} from 'lucide-react';

export default function PropertyPanel({
  selectedId,
  selectedIds = [],
  selectedType,
  slide,
  theme,
  onUpdateNode,
  onUpdateConnector,
  onDeleteNode,
  onDeleteConnector,
  onDuplicateNode,
  onUpdateSlide,
  isOpen = true,
  onToggleOpen,
  onAlignMiddle
}) {
  const [activeTab, setActiveTab] = useState('style'); // 'style' | 'text' | 'arrange'

  const selectedNode =
    selectedType === 'node'
      ? (slide.nodes || []).find((n) => n.id === selectedId)
      : null;

  const selectedConnector =
    selectedType === 'connector'
      ? (slide.connectors || []).find((c) => c.id === selectedId)
      : null;

  const STYLE_PRESETS = [
    { label: 'White Slate', fill: '#FFFFFF', stroke: '#64748B', text: '#0F172A' },
    { label: 'Sky Cyan', fill: '#E0F2FE', stroke: '#0284C7', text: '#0369A1' },
    { label: 'Mint Emerald', fill: '#DCFCE7', stroke: '#16A34A', text: '#15803D' },
    { label: 'Amber Gold', fill: '#FEF3C7', stroke: '#D97706', text: '#B45309' },
    { label: 'Rose Pink', fill: '#FFE4E6', stroke: '#E11D48', text: '#BE123C' },
    { label: 'Purple Lavender', fill: '#EDE9FE', stroke: '#7C3AED', text: '#6D28D9' },
    { label: 'Navy Slate', fill: '#1E293B', stroke: '#38BDF8', text: '#F8FAFC' },
    { label: 'Obsidian Dark', fill: '#18181B', stroke: '#71717A', text: '#FAFAFA' },
    { label: 'Deep Indigo', fill: '#1E1B4B', stroke: '#818CF8', text: '#EEF2FF' },
    { label: 'Forest Teal', fill: '#064E3B', stroke: '#34D399', text: '#ECFDF5' }
  ];

  // Alignment actions in Arrange tab
  const handleAlign = (alignmentType) => {
    if (!selectedNode) return;
    const allNodes = slide.nodes || [];
    if (allNodes.length < 2) return;

    if (alignmentType === 'middle') {
      if (onAlignMiddle) {
        onAlignMiddle();
        return;
      }
      const otherNodes = allNodes.filter((n) => n.id !== selectedNode.id);
      const nearest = otherNodes.reduce((prev, curr) =>
        Math.abs(curr.x - selectedNode.x) < Math.abs(prev.x - selectedNode.x) ? curr : prev
      );
      const targetCenterY = nearest.y + (nearest.height || 80) / 2;
      onUpdateNode(selectedNode.id, {
        y: Math.round(targetCenterY - (selectedNode.height || 80) / 2)
      });
      return;
    }

    if (alignmentType === 'center') {
      const otherNodes = allNodes.filter((n) => n.id !== selectedNode.id);
      const nearest = otherNodes.reduce((prev, curr) =>
        Math.abs(curr.y - selectedNode.y) < Math.abs(prev.y - selectedNode.y) ? curr : prev
      );
      const targetCenterX = nearest.x + (nearest.width || 180) / 2;
      onUpdateNode(selectedNode.id, {
        x: Math.round(targetCenterX - (selectedNode.width || 180) / 2)
      });
      return;
    }

    if (alignmentType === 'top') {
      const otherNodes = allNodes.filter((n) => n.id !== selectedNode.id);
      const nearest = otherNodes.reduce((prev, curr) =>
        Math.abs(curr.x - selectedNode.x) < Math.abs(prev.x - selectedNode.x) ? curr : prev
      );
      onUpdateNode(selectedNode.id, { y: nearest.y });
      return;
    }

    if (alignmentType === 'bottom') {
      const otherNodes = allNodes.filter((n) => n.id !== selectedNode.id);
      const nearest = otherNodes.reduce((prev, curr) =>
        Math.abs(curr.x - selectedNode.x) < Math.abs(prev.x - selectedNode.x) ? curr : prev
      );
      const targetBottom = nearest.y + (nearest.height || 80);
      onUpdateNode(selectedNode.id, { y: targetBottom - (selectedNode.height || 80) });
      return;
    }

    if (alignmentType === 'left') {
      const otherNodes = allNodes.filter((n) => n.id !== selectedNode.id);
      const nearest = otherNodes.reduce((prev, curr) =>
        Math.abs(curr.y - selectedNode.y) < Math.abs(prev.y - selectedNode.y) ? curr : prev
      );
      onUpdateNode(selectedNode.id, { x: nearest.x });
      return;
    }

    if (alignmentType === 'right') {
      const otherNodes = allNodes.filter((n) => n.id !== selectedNode.id);
      const nearest = otherNodes.reduce((prev, curr) =>
        Math.abs(curr.y - selectedNode.y) < Math.abs(prev.y - selectedNode.y) ? curr : prev
      );
      const targetRight = nearest.x + (nearest.width || 180);
      onUpdateNode(selectedNode.id, { x: targetRight - (selectedNode.width || 180) });
      return;
    }

    if (alignmentType === 'distributeH') {
      const nodesSorted = [...allNodes].sort((a, b) => a.x - b.x);
      if (nodesSorted.length <= 2) return;
      const firstX = nodesSorted[0].x;
      const lastX = nodesSorted[nodesSorted.length - 1].x;
      const totalSpan = lastX - firstX;
      const step = totalSpan / (nodesSorted.length - 1);
      const newNodes = (slide.nodes || []).map((n) => {
        const idx = nodesSorted.findIndex((s) => s.id === n.id);
        if (idx > 0 && idx < nodesSorted.length - 1) {
          return { ...n, x: Math.round(firstX + step * idx) };
        }
        return n;
      });
      onUpdateSlide({ nodes: newNodes });
    }
  };

  const handleBringToFront = () => {
    if (!selectedNode) return;
    const nodes = slide.nodes || [];
    const otherNodes = nodes.filter((n) => n.id !== selectedNode.id);
    onUpdateSlide({ nodes: [...otherNodes, selectedNode] });
  };

  const handleSendToBack = () => {
    if (!selectedNode) return;
    const nodes = slide.nodes || [];
    const otherNodes = nodes.filter((n) => n.id !== selectedNode.id);
    onUpdateSlide({ nodes: [selectedNode, ...otherNodes] });
  };

  return (
    <aside className={`property-panel-sidebar ${!isOpen ? 'collapsed' : ''}`}>
      {/* 1. NODE PROPERTIES */}
      {selectedNode && (
        <div className="inspector-content">
          <div className="inspector-header">
            <Sliders size={16} className="inspector-header-icon" />
            <span className="inspector-title">Format Shape</span>
            <div className="inspector-header-actions">
              <button
                className="inspector-action-btn"
                title="Duplicate Shape (Ctrl+D)"
                onClick={() => onDuplicateNode(selectedNode.id)}
              >
                <Copy size={13} />
              </button>
              <button
                className="inspector-action-btn danger"
                title="Delete Shape (Delete / Backspace)"
                onClick={() => onDeleteNode(selectedNode.id)}
              >
                <Trash2 size={13} />
              </button>
              {onToggleOpen && (
                <button
                  className="inspector-action-btn"
                  title="Close Inspector (Shortcut: ])"
                  onClick={onToggleOpen}
                >
                  <PanelRightClose size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Draw.io 3-Tab Bar (Style | Text | Arrange) */}
          <div className="drawio-tabs-bar">
            <button
              type="button"
              className={`drawio-tab-btn ${activeTab === 'style' ? 'active' : ''}`}
              onClick={() => setActiveTab('style')}
            >
              <Palette size={13} />
              <span>Style</span>
            </button>
            <button
              type="button"
              className={`drawio-tab-btn ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => setActiveTab('text')}
            >
              <Type size={13} />
              <span>Text</span>
            </button>
            <button
              type="button"
              className={`drawio-tab-btn ${activeTab === 'arrange' ? 'active' : ''}`}
              onClick={() => setActiveTab('arrange')}
            >
              <Sliders size={13} />
              <span>Arrange</span>
            </button>
          </div>

          {/* TAB 1: STYLE */}
          {activeTab === 'style' && (
            <div className="drawio-tab-panel">
              {/* Presets Grid */}
              <div className="prop-group">
                <label className="prop-label">Style Presets</label>
                <div className="color-swatches-grid">
                  {STYLE_PRESETS.map((pal, idx) => (
                    <button
                      key={idx}
                      className="color-swatch-card"
                      style={{ backgroundColor: pal.fill, borderColor: pal.stroke }}
                      title={pal.label}
                      onClick={() =>
                        onUpdateNode(selectedNode.id, {
                          fill: pal.fill,
                          stroke: pal.stroke,
                          textColor: pal.text,
                          fillEnabled: true,
                          strokeEnabled: true
                        })
                      }
                    >
                      <span style={{ color: pal.text, fontSize: '10px', fontWeight: 'bold' }}>
                        Aa
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Shape Type Selector */}
              <div className="prop-group">
                <label className="prop-label">Shape Type</label>
                <select
                  className="prop-select"
                  value={selectedNode.shape || SHAPE_TYPES.PROCESS}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, { shape: e.target.value })
                  }
                >
                  <option value={SHAPE_TYPES.PROCESS}>Process (Rectangle)</option>
                  <option value={SHAPE_TYPES.DECISION}>Decision (Diamond)</option>
                  <option value={SHAPE_TYPES.TERMINATOR}>Start / End (Pill)</option>
                  <option value={SHAPE_TYPES.SUBPROCESS}>Sub-process (Task)</option>
                  <option value={SHAPE_TYPES.DATABASE}>Database (Cylinder)</option>
                  <option value={SHAPE_TYPES.DOCUMENT}>Document (Report)</option>
                  <option value={SHAPE_TYPES.DATA}>Data (Input/Output)</option>
                  <option value={SHAPE_TYPES.PREPARATION}>Preparation (Hexagon)</option>
                  <option value={SHAPE_TYPES.CALLOUT}>Callout Note</option>
                  <option value={SHAPE_TYPES.TEXTBOX}>Text Box Only</option>
                </select>
              </div>

              {/* Fill Controls (Draw.io style with toggle) */}
              <div className="prop-group">
                <div className="prop-label-row">
                  <label className="drawio-checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedNode.fillEnabled !== false}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, { fillEnabled: e.target.checked })
                      }
                    />
                    <span>Fill Color</span>
                  </label>
                  <span className="prop-val-badge">
                    {selectedNode.fillEnabled === false ? 'Transparent' : (selectedNode.fill || '#1E293B')}
                  </span>
                </div>
                <div className="two-col-row">
                  <div className="picker-item">
                    <span className="picker-label">Color</span>
                    <input
                      type="color"
                      disabled={selectedNode.fillEnabled === false}
                      className="color-input"
                      value={selectedNode.fill || '#1E293B'}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, { fill: e.target.value, fillEnabled: true })
                      }
                    />
                  </div>
                  <div className="number-stepper">
                    <span className="stepper-label">Opacity</span>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      step="5"
                      className="prop-num-input"
                      value={selectedNode.opacity !== undefined ? selectedNode.opacity : 100}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          opacity: Math.min(100, Math.max(10, parseInt(e.target.value, 10) || 100))
                        })
                      }
                    />
                    <span className="stepper-unit">%</span>
                  </div>
                </div>
              </div>

              {/* Line / Border Controls (Draw.io style) */}
              <div className="prop-group">
                <div className="prop-label-row">
                  <label className="drawio-checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedNode.strokeEnabled !== false}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, { strokeEnabled: e.target.checked })
                      }
                    />
                    <span>Line (Border)</span>
                  </label>
                  <span className="prop-val-badge">
                    {selectedNode.strokeEnabled === false ? 'None' : (selectedNode.stroke || '#38BDF8')}
                  </span>
                </div>
                <div className="two-col-row">
                  <div className="picker-item">
                    <span className="picker-label">Color</span>
                    <input
                      type="color"
                      disabled={selectedNode.strokeEnabled === false}
                      className="color-input"
                      value={selectedNode.stroke || '#38BDF8'}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, { stroke: e.target.value, strokeEnabled: true })
                      }
                    />
                  </div>
                  <div>
                    <select
                      className="prop-select"
                      disabled={selectedNode.strokeEnabled === false}
                      value={selectedNode.strokeWidth || 2}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          strokeWidth: parseInt(e.target.value, 10)
                        })
                      }
                    >
                      <option value={1}>1 pt</option>
                      <option value={2}>2 pt</option>
                      <option value={3}>3 pt</option>
                      <option value={4}>4 pt</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '6px' }}>
                  <select
                    className="prop-select"
                    disabled={selectedNode.strokeEnabled === false}
                    value={selectedNode.strokeStyle || 'solid'}
                    onChange={(e) =>
                      onUpdateNode(selectedNode.id, {
                        strokeStyle: e.target.value
                      })
                    }
                  >
                    <option value="solid">Solid Line</option>
                    <option value="dashed">Dashed Line</option>
                  </select>
                </div>
              </div>

              {/* Style Actions */}
              <div className="prop-group" style={{ marginTop: '4px' }}>
                <button
                  type="button"
                  className="drawio-secondary-btn"
                  onClick={() =>
                    onUpdateNode(selectedNode.id, {
                      fill: '#1E293B',
                      stroke: '#38BDF8',
                      textColor: '#F8FAFC',
                      strokeWidth: 2,
                      strokeStyle: 'solid',
                      fillEnabled: true,
                      strokeEnabled: true,
                      opacity: 100
                    })
                  }
                >
                  Reset to Default Style
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TEXT */}
          {activeTab === 'text' && (
            <div className="drawio-tab-panel">
              {/* Text Content */}
              <div className="prop-group">
                <label className="prop-label">Label Text</label>
                <textarea
                  className="prop-textarea"
                  rows={3}
                  value={selectedNode.text || ''}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, { text: e.target.value })
                  }
                  placeholder="Enter node text..."
                />
              </div>

              {/* Font Family Selector */}
              <div className="prop-group">
                <label className="prop-label">Font Family</label>
                <select
                  className="prop-select"
                  value={selectedNode.fontFamily || 'Inter, sans-serif'}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, { fontFamily: e.target.value })
                  }
                >
                  <option value="Inter, sans-serif">Inter (Modern Sans)</option>
                  <option value="Helvetica, Arial, sans-serif">Helvetica / Arial</option>
                  <option value="'JetBrains Mono', monospace">JetBrains Mono (Code)</option>
                  <option value="'Outfit', sans-serif">Outfit (Display)</option>
                  <option value="Georgia, serif">Georgia (Editorial Serif)</option>
                </select>
              </div>

              {/* Font Size & Formats */}
              <div className="prop-group">
                <label className="prop-label">Typography &amp; Style</label>
                <div className="typo-controls-row">
                  <div className="number-stepper">
                    <span className="stepper-label">Size</span>
                    <input
                      type="number"
                      min="9"
                      max="36"
                      className="prop-num-input"
                      value={selectedNode.fontSize || 14}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          fontSize: parseInt(e.target.value, 10) || 14
                        })
                      }
                    />
                    <span className="stepper-unit">px</span>
                  </div>

                  <div className="button-toggle-group">
                    <button
                      className={`toggle-icon-btn ${selectedNode.bold ? 'active' : ''}`}
                      onClick={() =>
                        onUpdateNode(selectedNode.id, { bold: !selectedNode.bold })
                      }
                      title="Bold (B)"
                    >
                      <Bold size={13} />
                    </button>
                    <button
                      className={`toggle-icon-btn ${selectedNode.italic ? 'active' : ''}`}
                      onClick={() =>
                        onUpdateNode(selectedNode.id, { italic: !selectedNode.italic })
                      }
                      title="Italic (I)"
                    >
                      <Italic size={13} />
                    </button>
                    <button
                      className={`toggle-icon-btn ${selectedNode.underline ? 'active' : ''}`}
                      onClick={() =>
                        onUpdateNode(selectedNode.id, { underline: !selectedNode.underline })
                      }
                      title="Underline (U)"
                    >
                      <Underline size={13} />
                    </button>
                  </div>

                  <div className="button-toggle-group">
                    <button
                      className={`toggle-icon-btn ${selectedNode.textAlign === 'left' ? 'active' : ''}`}
                      onClick={() =>
                        onUpdateNode(selectedNode.id, { textAlign: 'left' })
                      }
                      title="Align Left"
                    >
                      <AlignLeft size={13} />
                    </button>
                    <button
                      className={`toggle-icon-btn ${(!selectedNode.textAlign || selectedNode.textAlign === 'center') ? 'active' : ''}`}
                      onClick={() =>
                        onUpdateNode(selectedNode.id, { textAlign: 'center' })
                      }
                      title="Align Center"
                    >
                      <AlignCenter size={13} />
                    </button>
                    <button
                      className={`toggle-icon-btn ${selectedNode.textAlign === 'right' ? 'active' : ''}`}
                      onClick={() =>
                        onUpdateNode(selectedNode.id, { textAlign: 'right' })
                      }
                      title="Align Right"
                    >
                      <AlignRight size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Text Color */}
              <div className="prop-group">
                <label className="prop-label">Font Color</label>
                <div className="color-pickers-row">
                  <div className="picker-item">
                    <span className="picker-label">Color</span>
                    <input
                      type="color"
                      className="color-input"
                      value={selectedNode.textColor || '#F8FAFC'}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, { textColor: e.target.value })
                      }
                    />
                    <span className="prop-val-badge" style={{ marginLeft: 'auto' }}>
                      {selectedNode.textColor || '#F8FAFC'}
                    </span>
                  </div>
                </div>
                <div className="quick-label-presets" style={{ marginTop: '8px' }}>
                  {[
                    { name: 'White', hex: '#FFFFFF' },
                    { name: 'Slate', hex: '#F8FAFC' },
                    { name: 'Dark', hex: '#0F172A' },
                    { name: 'Sky', hex: '#38BDF8' },
                    { name: 'Emerald', hex: '#10B981' },
                    { name: 'Amber', hex: '#F59E0B' },
                    { name: 'Rose', hex: '#F43F5E' }
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      className={`preset-pill ${(selectedNode.textColor || '#F8FAFC').toLowerCase() === c.hex.toLowerCase() ? 'active' : ''}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => onUpdateNode(selectedNode.id, { textColor: c.hex })}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: c.hex, border: '1px solid rgba(255,255,255,0.2)' }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ARRANGE */}
          {activeTab === 'arrange' && (
            <div className="drawio-tab-panel">
              {/* Straight Alignment Section (Draw.io Hero) */}
              <div className="prop-group">
                <label className="prop-label">Align to Same Line</label>
                <button
                  type="button"
                  className="drawio-align-hero-btn"
                  title="Align this box (and neighbors) straight to the exact same middle horizontal line"
                  onClick={() => handleAlign('middle')}
                >
                  <MoveHorizontal size={15} />
                  <span>Align Middle (Straight Center Line)</span>
                </button>

                <div className="arrange-btn-grid" style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    className="arrange-btn"
                    title="Align Top"
                    onClick={() => handleAlign('top')}
                  >
                    Top
                  </button>
                  <button
                    type="button"
                    className="arrange-btn"
                    title="Align Center Column"
                    onClick={() => handleAlign('center')}
                  >
                    Center
                  </button>
                  <button
                    type="button"
                    className="arrange-btn"
                    title="Align Bottom"
                    onClick={() => handleAlign('bottom')}
                  >
                    Bottom
                  </button>
                  <button
                    type="button"
                    className="arrange-btn"
                    title="Align Left"
                    onClick={() => handleAlign('left')}
                  >
                    Left
                  </button>
                  <button
                    type="button"
                    className="arrange-btn"
                    title="Align Right"
                    onClick={() => handleAlign('right')}
                  >
                    Right
                  </button>
                  <button
                    type="button"
                    className="arrange-btn"
                    title="Distribute Horizontal Spacing Evenly"
                    onClick={() => handleAlign('distributeH')}
                  >
                    Distribute
                  </button>
                </div>
              </div>

              {/* Dimensions (Width / Height) */}
              <div className="prop-group">
                <label className="prop-label">Dimensions (Size)</label>
                <div className="two-col-row">
                  <div className="number-stepper">
                    <span className="stepper-label">W</span>
                    <input
                      type="number"
                      min="60"
                      max="800"
                      step="10"
                      className="prop-num-input"
                      value={selectedNode.width || 200}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          width: parseInt(e.target.value, 10) || 200
                        })
                      }
                    />
                    <span className="stepper-unit">px</span>
                  </div>
                  <div className="number-stepper">
                    <span className="stepper-label">H</span>
                    <input
                      type="number"
                      min="40"
                      max="500"
                      step="10"
                      className="prop-num-input"
                      value={selectedNode.height || 80}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          height: parseInt(e.target.value, 10) || 80
                        })
                      }
                    />
                    <span className="stepper-unit">px</span>
                  </div>
                </div>
              </div>

              {/* Position (X / Y) */}
              <div className="prop-group">
                <label className="prop-label">Position (Coordinates)</label>
                <div className="two-col-row">
                  <div className="number-stepper">
                    <span className="stepper-label">X</span>
                    <input
                      type="number"
                      className="prop-num-input"
                      value={Math.round(selectedNode.x || 0)}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          x: parseInt(e.target.value, 10) || 0
                        })
                      }
                    />
                    <span className="stepper-unit">px</span>
                  </div>
                  <div className="number-stepper">
                    <span className="stepper-label">Y</span>
                    <input
                      type="number"
                      className="prop-num-input"
                      value={Math.round(selectedNode.y || 0)}
                      onChange={(e) =>
                        onUpdateNode(selectedNode.id, {
                          y: parseInt(e.target.value, 10) || 0
                        })
                      }
                    />
                    <span className="stepper-unit">px</span>
                  </div>
                </div>
              </div>

              {/* Layer Ordering */}
              <div className="prop-group">
                <label className="prop-label">Layer Order</label>
                <div className="two-col-row">
                  <button
                    type="button"
                    className="drawio-secondary-btn"
                    onClick={handleBringToFront}
                  >
                    Bring to Front
                  </button>
                  <button
                    type="button"
                    className="drawio-secondary-btn"
                    onClick={handleSendToBack}
                  >
                    Send to Back
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="prop-group" style={{ marginTop: '8px' }}>
                <div className="two-col-row">
                  <button
                    type="button"
                    className="drawio-secondary-btn"
                    onClick={() => onDuplicateNode(selectedNode.id)}
                  >
                    <Copy size={13} />
                    <span>Duplicate</span>
                  </button>
                  <button
                    type="button"
                    className="drawio-secondary-btn danger"
                    onClick={() => onDeleteNode(selectedNode.id)}
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. CONNECTOR PROPERTIES */}
      {selectedConnector && (
        <div className="inspector-content">
          <div className="inspector-header">
            <CornerDownRight size={16} className="inspector-header-icon" />
            <span className="inspector-title">Connector Properties</span>
            <div className="inspector-header-actions">
              <button
                className="inspector-action-btn danger"
                title="Delete Connector"
                onClick={() => onDeleteConnector(selectedConnector.id)}
              >
                <Trash2 size={13} />
              </button>
              {onToggleOpen && (
                <button
                  className="inspector-action-btn"
                  title="Close Inspector (Shortcut: ])"
                  onClick={onToggleOpen}
                >
                  <PanelRightClose size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Connector Routing Type */}
          <div className="prop-group">
            <label className="prop-label">Connector Routing</label>
            <select
              className="prop-select"
              value={selectedConnector.type || CONNECTOR_TYPES.ORTHOGONAL}
              onChange={(e) =>
                onUpdateConnector(selectedConnector.id, { type: e.target.value })
              }
            >
              <option value={CONNECTOR_TYPES.ORTHOGONAL}>Orthogonal (90° Step)</option>
              <option value={CONNECTOR_TYPES.CURVED}>Curved (Smooth Bezier)</option>
              <option value={CONNECTOR_TYPES.STRAIGHT}>Straight Line</option>
            </select>
          </div>

          {/* Connector Label */}
          <div className="prop-group">
            <div className="prop-label-row">
              <label className="prop-label">Branch Label</label>
              {selectedConnector.label && (
                <button
                  type="button"
                  className="quick-clear-btn"
                  onClick={() => onUpdateConnector(selectedConnector.id, { label: '' })}
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="text"
              className="prop-input"
              value={selectedConnector.label || ''}
              onChange={(e) =>
                onUpdateConnector(selectedConnector.id, { label: e.target.value })
              }
              placeholder="e.g. Yes, No, Success, Error..."
            />
            <div className="quick-label-presets">
              {['Yes', 'No', 'True', 'False', 'Pass', 'Fail'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`preset-pill ${selectedConnector.label === preset ? 'active' : ''}`}
                  onClick={() => onUpdateConnector(selectedConnector.id, { label: preset })}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Line Color & Width */}
          <div className="prop-group">
            <div className="two-col-row">
              <div className="picker-item">
                <span className="picker-label">Color</span>
                <input
                  type="color"
                  className="color-input"
                  value={selectedConnector.color || '#38BDF8'}
                  onChange={(e) =>
                    onUpdateConnector(selectedConnector.id, { color: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="prop-label">Thickness</label>
                <select
                  className="prop-select"
                  value={selectedConnector.width || 2}
                  onChange={(e) =>
                    onUpdateConnector(selectedConnector.id, {
                      width: parseInt(e.target.value, 10)
                    })
                  }
                >
                  <option value={1}>1px</option>
                  <option value={2}>2px</option>
                  <option value={3}>3px</option>
                  <option value={4}>4px</option>
                </select>
              </div>
            </div>

            {/* Quick Distinguishable Connector Colors */}
            <div className="quick-label-presets" style={{ marginTop: '8px' }}>
              {[
                { name: 'Sky', hex: '#38BDF8' },
                { name: 'Emerald', hex: '#10B981' },
                { name: 'Purple', hex: '#A855F7' },
                { name: 'Amber', hex: '#F59E0B' },
                { name: 'Rose', hex: '#F43F5E' },
                { name: 'Slate', hex: '#94A3B8' }
              ].map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  className={`preset-pill ${(selectedConnector.color || '#38BDF8').toLowerCase() === c.hex.toLowerCase() ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => onUpdateConnector(selectedConnector.id, { color: c.hex })}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: c.hex }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Line Style */}
          <div className="prop-group">
            <label className="prop-label">Dash Style</label>
            <select
              className="prop-select"
              value={selectedConnector.style || 'solid'}
              onChange={(e) =>
                onUpdateConnector(selectedConnector.id, { style: e.target.value })
              }
            >
              <option value="solid">Solid Arrow</option>
              <option value="dashed">Dashed Arrow</option>
            </select>
          </div>

          {/* Routing Track Lane / Spacing */}
          <div className="prop-group">
            <label className="prop-label">Routing Track (Lane)</label>
            <div className="quick-label-presets">
              {[
                { label: 'Auto (Smart)', value: undefined },
                { label: 'Lane 1 (48px)', value: 48 },
                { label: 'Lane 2 (84px)', value: 84 },
                { label: 'Lane 3 (120px)', value: 120 }
              ].map((lane) => (
                <button
                  key={lane.label}
                  type="button"
                  className={`preset-pill ${selectedConnector.offset === lane.value || (lane.value === undefined && selectedConnector.offset === undefined) ? 'active' : ''}`}
                  onClick={() => onUpdateConnector(selectedConnector.id, { offset: lane.value })}
                >
                  {lane.label}
                </button>
              ))}
            </div>
          </div>

          {/* Port attachment endpoints */}
          <div className="prop-group">
            <label className="prop-label">Connection Ports</label>
            <div className="two-col-row">
              <div>
                <span className="sub-label">From Port</span>
                <select
                  className="prop-select"
                  value={selectedConnector.fromPort || 'bottom'}
                  onChange={(e) =>
                    onUpdateConnector(selectedConnector.id, { fromPort: e.target.value })
                  }
                >
                  <option value="top">Top</option>
                  <option value="right">Right</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                </select>
              </div>
              <div>
                <span className="sub-label">To Port</span>
                <select
                  className="prop-select"
                  value={selectedConnector.toPort || 'top'}
                  onChange={(e) =>
                    onUpdateConnector(selectedConnector.id, { toPort: e.target.value })
                  }
                >
                  <option value="top">Top</option>
                  <option value="right">Right</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SLIDE & DECK SETTINGS (when nothing is selected) */}
      {!selectedNode && !selectedConnector && (
        <div className="inspector-content">
          <div className="inspector-header">
            <FileSpreadsheet size={16} className="inspector-header-icon" />
            <span className="inspector-title">Slide Settings</span>
            {onToggleOpen && (
              <div className="inspector-header-actions">
                <button
                  className="inspector-action-btn"
                  title="Close Inspector (Shortcut: ])"
                  onClick={onToggleOpen}
                >
                  <PanelRightClose size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Slide Title */}
          <div className="prop-group">
            <label className="prop-label">Slide Title</label>
            <input
              type="text"
              className="prop-input"
              value={slide.title || ''}
              onChange={(e) => onUpdateSlide({ title: e.target.value })}
              placeholder="e.g. Authentication Flow Architecture"
            />
          </div>

          {/* Slide Subtitle / Category */}
          <div className="prop-group">
            <label className="prop-label">Slide Subtitle / Category</label>
            <input
              type="text"
              className="prop-input"
              value={slide.subtitle || ''}
              onChange={(e) => onUpdateSlide({ subtitle: e.target.value })}
              placeholder="e.g. Enterprise Security Architecture"
            />
          </div>

          {/* Slide Speaker Notes */}
          <div className="prop-group">
            <div className="prop-label-row">
              <label className="prop-label">Speaker Notes</label>
              <span className="badge-pptx-feature">Exports to PPT</span>
            </div>
            <textarea
              className="prop-textarea"
              rows={5}
              value={slide.notes || ''}
              onChange={(e) => onUpdateSlide({ notes: e.target.value })}
              placeholder="Type notes for the presenter here. These will be exported directly into the PowerPoint presentation slide notes!"
            />
            <span className="prop-help-text">
              Notes appear in PowerPoint Presenter View during your talk.
            </span>
          </div>

          {/* Presentation Aspect Ratio & Format */}
          <div className="prop-group">
            <label className="prop-label">Slide Format</label>
            <div className="format-badge-card">
              <div className="format-title">16:9 Widescreen (1920 × 1080)</div>
              <div className="format-desc">
                Optimized for modern monitors, projectors, and Google Slides / Keynote.
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
