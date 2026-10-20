import React from 'react';
import { X, LayoutTemplate, Plus, CheckCircle, Sparkles, Layers } from 'lucide-react';
import { TEMPLATES } from '../utils/templates';
import { THEMES } from '../types/constants';

export default function TemplatesModal({
  isOpen,
  onClose,
  onApplyTemplate
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window templates-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge">
              <LayoutTemplate size={18} className="template-icon" />
            </div>
            <div>
              <h2 className="modal-title">Flowchart Presentation Templates</h2>
              <p className="modal-subtitle">
                Select an expertly crafted flowchart slide to jumpstart your presentation.
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Templates Grid */}
        <div className="modal-body templates-grid-body">
          <div className="templates-cards-grid">
            {TEMPLATES.map((tpl) => {
              const nodeCount = (tpl.nodes || []).length;
              const connCount = (tpl.connectors || []).length;
              const tplTheme = THEMES[tpl.themeId] || THEMES.EXECUTIVE_NAVY;

              return (
                <div key={tpl.id} className="template-showcase-card">
                  {/* Category Tag & Badge */}
                  <div className="card-top-tag-row">
                    <span className="category-pill">{tpl.category}</span>
                    <span className="stats-pill">
                      {nodeCount} Nodes • {connCount} Connectors
                    </span>
                  </div>

                  {/* Template Title & Description */}
                  <h3 className="template-card-title">{tpl.title}</h3>
                  <p className="template-card-subtitle">{tpl.subtitle}</p>

                  {/* Preview Banner Mock */}
                  <div
                    className="template-preview-banner"
                    style={{
                      backgroundColor: tplTheme.bg,
                      borderColor: tplTheme.primary.stroke
                    }}
                  >
                    <div className="mini-diagram-preview">
                      <div
                        className="mini-node mini-terminator"
                        style={{
                          backgroundColor: tplTheme.terminator.fill,
                          borderColor: tplTheme.terminator.stroke
                        }}
                      />
                      <div className="mini-arrow" style={{ backgroundColor: tplTheme.connector }} />
                      <div
                        className="mini-node mini-process"
                        style={{
                          backgroundColor: tplTheme.primary.fill,
                          borderColor: tplTheme.primary.stroke
                        }}
                      />
                      <div className="mini-arrow" style={{ backgroundColor: tplTheme.connector }} />
                      <div
                        className="mini-node mini-decision"
                        style={{
                          backgroundColor: tplTheme.decision.fill,
                          borderColor: tplTheme.decision.stroke
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="template-card-actions">
                    <button
                      className="template-action-btn secondary"
                      onClick={() => {
                        onApplyTemplate(tpl, true);
                        onClose();
                      }}
                      title="Add this template as a new slide"
                    >
                      <Layers size={13} />
                      <span>Add as New Slide</span>
                    </button>

                    <button
                      className="template-action-btn primary"
                      onClick={() => {
                        onApplyTemplate(tpl, false);
                        onClose();
                      }}
                      title="Replace current slide with this template"
                    >
                      <CheckCircle size={13} />
                      <span>Apply to Current</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <span className="templates-footer-hint">
            💡 All templates automatically export as 100% native PowerPoint shapes and connectors.
          </span>
          <button className="secondary-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
