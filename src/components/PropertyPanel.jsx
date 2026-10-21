import React from 'react';
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
  Sliders,
  Type,
  Palette,
  FileSpreadsheet,
  CornerDownRight,
  PanelRightClose
} from 'lucide-react';

export default function PropertyPanel({
  selectedId,
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
  onToggleOpen
}) {
  const selectedNode =
    selectedType === 'node'
      ? (slide.nodes || []).find((n) => n.id === selectedId)
      : null;

  const selectedConnector =
    selectedType === 'connector'
      ? (slide.connectors || []).find((c) => c.id === selectedId)
      : null;

  const COLOR_PALETTES = [
    { label: 'Navy Slate', fill: '#1E293B', stroke: '#38BDF8', text: '#F8FAFC' },
    { label: 'Deep Blue', fill: '#1E3A8A', stroke: '#60A5FA', text: '#EFF6FF' },
    { label: 'Indigo Purple', fill: '#312E81', stroke: '#818CF8', text: '#EEF2FF' },
    { label: 'Emerald Forest', fill: '#064E3B', stroke: '#34D399', text: '#ECFDF5' },
    { label: 'Dark Cyan', fill: '#113537', stroke: '#2DD4BF', text: '#F0FDFA' },
    { label: 'Amber Warmth', fill: '#78350F', stroke: '#F59E0B', text: '#FFFBEB' },
    { label: 'Crimson Alert', fill: '#831843', stroke: '#F43F5E', text: '#FFF1F2' },
    { label: 'Obsidian Neutral', fill: '#18181B', stroke: '#71717A', text: '#FAFAFA' },
    { label: 'Pure Light', fill: '#FFFFFF', stroke: '#2563EB', text: '#0F172A' },
    { label: 'Light Green', fill: '#ECFDF5', stroke: '#059669', text: '#064E3B' }
  ];

  return (
    <aside className={`property-panel-sidebar ${!isOpen ? 'collapsed' : ''}`}>
      {/* 1. NODE PROPERTIES */}
      {selectedNode && (
        <div className="inspector-content">
          <div className="inspector-header">
            <Sliders size={16} className="inspector-header-icon" />
            <span className="inspector-title">Shape Properties</span>
            <div className="inspector-header-actions">
              <button
                className="inspector-action-btn"
                title="Duplicate"
                onClick={() => onDuplicateNode(selectedNode.id)}
              >
                <Copy size={13} />
              </button>
              <button
                className="inspector-action-btn danger"
                title="Delete"
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

          {/* Typography */}
          <div className="prop-group">
            <label className="prop-label">Typography</label>
            <div className="typo-controls-row">
              <div className="number-stepper">
                <span className="stepper-label">Size</span>
                <input
                  type="number"
                  min="9"
                  max="32"
                  className="prop-num-input"
                  value={selectedNode.fontSize || 14}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      fontSize: parseInt(e.target.value, 10) || 14
                    })
                  }
                />
              </div>

              <div className="button-toggle-group">
                <button
                  className={`toggle-icon-btn ${selectedNode.bold ? 'active' : ''}`}
                  onClick={() =>
                    onUpdateNode(selectedNode.id, { bold: !selectedNode.bold })
                  }
                  title="Bold"
                >
                  <Bold size={13} />
                </button>
                <button
                  className={`toggle-icon-btn ${selectedNode.italic ? 'active' : ''}`}
                  onClick={() =>
                    onUpdateNode(selectedNode.id, { italic: !selectedNode.italic })
                  }
                  title="Italic"
                >
                  <Italic size={13} />
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

          {/* Quick Color Presets */}
          <div className="prop-group">
            <label className="prop-label">Style Presets</label>
            <div className="color-swatches-grid">
              {COLOR_PALETTES.map((pal, idx) => (
                <button
                  key={idx}
                  className="color-swatch-card"
                  style={{ backgroundColor: pal.fill, borderColor: pal.stroke }}
                  title={pal.label}
                  onClick={() =>
                    onUpdateNode(selectedNode.id, {
                      fill: pal.fill,
                      stroke: pal.stroke,
                      textColor: pal.text
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

          {/* Custom Colors */}
          <div className="prop-group">
            <label className="prop-label">Custom Colors</label>
            <div className="color-pickers-row">
              <div className="picker-item">
                <span className="picker-label">Fill</span>
                <input
                  type="color"
                  className="color-input"
                  value={selectedNode.fill || '#1E293B'}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, { fill: e.target.value })
                  }
                />
              </div>

              <div className="picker-item">
                <span className="picker-label">Border</span>
                <input
                  type="color"
                  className="color-input"
                  value={selectedNode.stroke || '#38BDF8'}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, { stroke: e.target.value })
                  }
                />
              </div>

              <div className="picker-item">
                <span className="picker-label">Text</span>
                <input
                  type="color"
                  className="color-input"
                  value={selectedNode.textColor || '#F8FAFC'}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, { textColor: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Stroke Width & Style */}
          <div className="prop-group">
            <div className="two-col-row">
              <div>
                <label className="prop-label">Border Width</label>
                <select
                  className="prop-select"
                  value={selectedNode.strokeWidth || 2}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      strokeWidth: parseInt(e.target.value, 10)
                    })
                  }
                >
                  <option value={1}>1px Thin</option>
                  <option value={2}>2px Normal</option>
                  <option value={3}>3px Medium</option>
                  <option value={4}>4px Thick</option>
                </select>
              </div>

              <div>
                <label className="prop-label">Line Style</label>
                <select
                  className="prop-select"
                  value={selectedNode.strokeStyle || 'solid'}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      strokeStyle: e.target.value
                    })
                  }
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div className="prop-group">
            <label className="prop-label">Dimensions (px)</label>
            <div className="two-col-row">
              <div className="number-stepper">
                <span className="stepper-label">Width</span>
                <input
                  type="number"
                  min="80"
                  max="600"
                  className="prop-num-input"
                  value={selectedNode.width || 200}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      width: parseInt(e.target.value, 10) || 200
                    })
                  }
                />
              </div>
              <div className="number-stepper">
                <span className="stepper-label">Height</span>
                <input
                  type="number"
                  min="40"
                  max="400"
                  className="prop-num-input"
                  value={selectedNode.height || 80}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, {
                      height: parseInt(e.target.value, 10) || 80
                    })
                  }
                />
              </div>
            </div>
          </div>
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
