import React, { useState } from 'react';
import { Sparkles, X, Wand2, Lightbulb, ArrowRight, Layers } from 'lucide-react';
import { parseTextToFlowchart } from '../utils/textParser';

const SAMPLE_PROMPTS = [
  {
    title: 'User Login & 2FA Flow',
    text: `[User Submits Login] -> [Verify Password with DB]
[Verify Password with DB] -> {Credentials Valid?}
{Credentials Valid?} -> |No| [Display Error & Lockout Check]
{Credentials Valid?} -> |Yes| {Is 2FA Enabled?}
{Is 2FA Enabled?} -> |Yes| [Send SMS / Authenticator Challenge]
{Is 2FA Enabled?} -> |No| [Issue JWT Auth Token]
[Send SMS / Authenticator Challenge] -> {Code Valid?}
{Code Valid?} -> |Yes| [Issue JWT Auth Token]
{Code Valid?} -> |No| [Reject Verification]
[Issue JWT Auth Token] -> ([Access Dashboard])`
  },
  {
    title: 'Customer Order & Fulfillment',
    text: `([Customer Places Order]) -> [Charge Credit Card via Stripe]
[Charge Credit Card via Stripe] -> {Payment Succeeded?}
{Payment Succeeded?} -> |No| [Notify Customer & Prompt Retry]
{Payment Succeeded?} -> |Yes| [(Update Inventory Database)]
[(Update Inventory Database)] -> [Dispatch Order to Warehouse]
[Dispatch Order to Warehouse] -> [Send Shipping Tracking Email]
[Send Shipping Tracking Email] -> ([Order Complete])`
  },
  {
    title: 'Incident Response & Triage',
    text: `([Production Alert Fires]) -> [Ping On-Call Engineer]
[Ping On-Call Engineer] -> {Acknowledge within 5m?}
{Acknowledge within 5m?} -> |No| [Escalate to Secondary Lead]
{Acknowledge within 5m?} -> |Yes| {Is High Severity?}
{Is High Severity?} -> |Yes| [Open Zoom War Room & Post to Statuspage]
{Is High Severity?} -> |No| [Investigate Logs & Push Patch]
[Open Zoom War Room & Post to Statuspage] -> [Deploy Emergency Rollback]
[Deploy Emergency Rollback] -> ([Post-Mortem Review])`
  }
];

export default function TextToFlowModal({
  isOpen,
  onClose,
  onApply,
  currentTheme
}) {
  const [inputText, setInputText] = useState(SAMPLE_PROMPTS[0].text);
  const [slideTitle, setSlideTitle] = useState('Automated Workflow Architecture');

  if (!isOpen) return null;

  const handleGenerate = (asNewSlide = false) => {
    if (!inputText.trim()) return;
    const { nodes, connectors } = parseTextToFlowchart(inputText, currentTheme);
    onApply({
      title: slideTitle,
      subtitle: 'Generated via Text-to-Flowchart Engine',
      nodes,
      connectors
    }, asNewSlide);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window text-to-flow-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge">
              <Sparkles size={18} className="sparkle-icon" />
            </div>
            <div>
              <h2 className="modal-title">AI / Text-to-Flowchart Engine</h2>
              <p className="modal-subtitle">
                Type plain text, arrow sequences, or Mermaid diagram syntax to generate a layout instantly.
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Quick Sample Chips */}
          <div className="sample-chips-row">
            <span className="chips-label">
              <Lightbulb size={13} /> Try sample:
            </span>
            {SAMPLE_PROMPTS.map((sample, i) => (
              <button
                key={i}
                className="sample-chip-btn"
                onClick={() => {
                  setInputText(sample.text);
                  setSlideTitle(sample.title);
                }}
              >
                {sample.title}
              </button>
            ))}
          </div>

          {/* Slide Title Field */}
          <div className="modal-input-field">
            <label className="field-label">Slide Title</label>
            <input
              type="text"
              className="prop-input"
              value={slideTitle}
              onChange={(e) => setSlideTitle(e.target.value)}
              placeholder="e.g. User Authentication Flow"
            />
          </div>

          {/* Text Area */}
          <div className="modal-input-field">
            <label className="field-label">Diagram Syntax or Natural Sequence</label>
            <textarea
              className="modal-syntax-textarea"
              rows={9}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="[Step 1] -> [Step 2]&#10;[Step 2] -> {Decision?}&#10;{Decision?} -> |Yes| [Step 3]&#10;{Decision?} -> |No| [Fallback]"
            />
          </div>

          {/* Syntax Cheatsheet */}
          <div className="syntax-cheatsheet-card">
            <span className="cheatsheet-title">Syntax Helper:</span>
            <div className="cheatsheet-tags">
              <code>[Process Box]</code>
              <code>{'{Decision Diamond}'}</code>
              <code>([Start / End])</code>
              <code>[(Database)]</code>
              <code>-&gt; |Label| (Connected Arrow)</code>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <div className="footer-action-group">
            <button
              className="action-btn-outline"
              onClick={() => handleGenerate(true)}
              title="Add as a new slide without altering current slide"
            >
              <Layers size={14} />
              <span>Add as New Slide</span>
            </button>
            <button
              className="primary-btn"
              onClick={() => handleGenerate(false)}
            >
              <Wand2 size={14} />
              <span>Replace Current Slide</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
