import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Sparkles,
  LayoutTemplate,
  Undo2,
  Redo2,
  Grid,
  Magnet,
  Palette,
  ChevronDown,
  Image as ImageIcon,
  FolderOpen,
  Save,
  Check,
  Sun,
  Moon,
  MousePointer,
  ArrowRight,
  RotateCcw,
  PanelLeft,
  PanelRight,
  Play,
  LogOut,
  User
} from 'lucide-react';
import { THEMES } from '../types/constants';

export default function Navbar({
  presentationTitle,
  setPresentationTitle,
  activeTheme,
  setActiveTheme,
  isLightMode,
  onToggleLightMode,
  activeTool,
  setActiveTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showGrid,
  setShowGrid,
  gridSnap,
  setGridSnap,
  isLeftSidebarOpen = true,
  onToggleLeftSidebar,
  isRightSidebarOpen = true,
  onToggleRightSidebar,
  onOpenTemplates,
  onOpenTextToFlow,
  onExportPptx,
  onExportPng,
  onSaveJson,
  onLoadJson,
  onResetDeck,
  onPresent,
  isExporting,
  currentUser,
  onLogout
}) {
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <header className="app-navbar">
      {/* Brand & Deck Title */}
      <div className="navbar-left">
        <div className="navbar-brand">
          <div className="brand-icon-box">
            <FileSpreadsheet size={18} className="brand-icon" />
          </div>
          <div className="brand-text">
            <div className="brand-title-row">
              <span className="brand-name">SlideFlow</span>
              <span className="brand-badge">PPTX</span>
            </div>
          </div>
        </div>

        <div className="navbar-divider" />

        {/* Presentation Deck Name Input & Autosave Status */}
        <div className="deck-title-wrapper" title="Rename Presentation">
          <input
            type="text"
            className="deck-title-input"
            value={presentationTitle}
            onChange={(e) => setPresentationTitle(e.target.value)}
            placeholder="Presentation Name"
          />
        </div>

        <div className="autosave-badge" title="All edits automatically saved in your browser">
          <Check size={12} className="autosave-icon" />
          <span className="autosave-text">Saved</span>
        </div>
      </div>

      {/* Center Action Tools */}
      <div className="navbar-center">
        {/* Undo / Redo */}
        <div className="navbar-btn-group">
          <button
            className="nav-tool-btn"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            className="nav-tool-btn"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={15} />
          </button>
        </div>

        <div className="navbar-divider" />

        {/* View & Canvas Display Controls: Grid & Snap */}
        <div className="navbar-btn-group">
          <button
            className={`nav-tool-btn ${showGrid ? 'active' : ''}`}
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Canvas Grid"
          >
            <Grid size={15} />
          </button>
          <button
            className={`nav-tool-btn ${gridSnap ? 'active' : ''}`}
            onClick={() => setGridSnap(!gridSnap)}
            title="Toggle Snap to Grid (20px)"
          >
            <Magnet size={15} />
          </button>
        </div>

        <div className="navbar-divider" />

        {/* Quick Starters: Templates & AI/Text-to-Flow */}
        <button
          className="nav-action-pill templates-pill"
          onClick={onOpenTemplates}
          title="Browse flowchart templates"
        >
          <LayoutTemplate size={14} />
          <span>Templates</span>
        </button>

        <button
          className="nav-action-pill ai-pill"
          onClick={onOpenTextToFlow}
          title="Create from text, Mermaid, or prompt"
        >
          <Sparkles size={14} />
          <span>AI Flow</span>
        </button>
      </div>

      {/* Right Controls: Theme, Light/Dark Mode, and Export CTA */}
      <div className="navbar-right">
        {/* Theme Picker Dropdown */}
        <div className="relative-dropdown-container">
          <button
            className="nav-action-pill theme-pill"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            title={`Color Theme: ${activeTheme.name}`}
          >
            <Palette size={14} />
            <span className="theme-pill-label">Theme</span>
            <div className="theme-color-dots mini">
              <span style={{ backgroundColor: activeTheme.bg }} className="color-dot bg-dot" />
              <span style={{ backgroundColor: activeTheme.primary.stroke }} className="color-dot stroke-dot" />
            </div>
            <ChevronDown size={12} />
          </button>

          {showThemeMenu && (
            <div
              className="navbar-dropdown theme-dropdown"
              onClick={() => setShowThemeMenu(false)}
            >
              <div className="dropdown-header">PowerPoint Themes</div>
              {Object.values(THEMES).map((th) => (
                <div
                  key={th.id}
                  className={`theme-option-row ${th.id === activeTheme.id ? 'active' : ''}`}
                  onClick={() => setActiveTheme(th)}
                >
                  <div className="theme-color-dots">
                    <span style={{ backgroundColor: th.bg }} className="color-dot bg-dot" />
                    <span style={{ backgroundColor: th.primary.stroke }} className="color-dot stroke-dot" />
                    <span style={{ backgroundColor: th.decision.fill }} className="color-dot accent-dot" />
                  </div>
                  <span className="theme-option-name">{th.name}</span>
                  {th.id === activeTheme.id && <Check size={14} className="theme-check-icon" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Light / Dark Mode Studio Toggle */}
        <button
          className={`theme-mode-icon-btn ${isLightMode ? 'light-mode-active' : ''}`}
          onClick={onToggleLightMode}
          title={isLightMode ? "Switch to Dark Studio" : "Switch to Light Studio"}
          aria-label={isLightMode ? "Switch to Dark Studio" : "Switch to Light Studio"}
        >
          {isLightMode ? <Moon size={15} className="moon-icon" /> : <Sun size={15} className="sun-icon" />}
        </button>

        {/* Fullscreen Presentation Mode Button */}
        {onPresent && (
          <button
            className="nav-action-pill present-pill"
            onClick={onPresent}
            title="Present Slideshow (F5)"
          >
            <Play size={13} fill="currentColor" />
            <span>Present</span>
          </button>
        )}

        {/* Primary Export Split Button */}
        <div className="export-combo-container">
          <button
            className="primary-export-btn"
            onClick={onExportPptx}
            disabled={isExporting}
            title="Download real, editable PowerPoint (.pptx) file"
          >
            <Download size={14} className={isExporting ? 'spin-icon' : ''} />
            <span>{isExporting ? 'Exporting...' : 'Export PPTX'}</span>
          </button>

          <div className="export-btn-divider" />

          <button
            className="export-dropdown-trigger"
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="More export options (PNG, JSON, Reset)"
            aria-label="More export options"
          >
            <ChevronDown size={14} />
          </button>

          {showExportMenu && (
            <div
              className="navbar-dropdown export-dropdown"
              onClick={() => setShowExportMenu(false)}
            >
              <button className="dropdown-item" onClick={onExportPptx}>
                <FileSpreadsheet size={15} className="item-icon pptx-icon" />
                <div>
                  <div className="item-title">PowerPoint (.pptx)</div>
                  <div className="item-desc">Native editable shapes & connectors</div>
                </div>
              </button>

              <button className="dropdown-item" onClick={onExportPng}>
                <ImageIcon size={15} className="item-icon png-icon" />
                <div>
                  <div className="item-title">High-Res PNG</div>
                  <div className="item-desc">Image for Slack, Notion or Docs</div>
                </div>
              </button>

              <div className="dropdown-divider" />

              <button className="dropdown-item" onClick={onSaveJson}>
                <Save size={15} className="item-icon json-icon" />
                <div>
                  <div className="item-title">Save Project File</div>
                  <div className="item-desc">Download .json backup to re-edit later</div>
                </div>
              </button>

              <label className="dropdown-item file-upload-item">
                <FolderOpen size={15} className="item-icon open-icon" />
                <div>
                  <div className="item-title">Open Project File</div>
                  <div className="item-desc">Load saved .json diagram</div>
                </div>
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={onLoadJson}
                />
              </label>

              <div className="dropdown-divider" />

              <button className="dropdown-item reset-item" onClick={onResetDeck}>
                <RotateCcw size={15} className="item-icon reset-icon" />
                <div>
                  <div className="item-title">Start Fresh Presentation</div>
                  <div className="item-desc">Reset canvas and start a new blank diagram</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* User Profile & Sign Out Button */}
        {currentUser && (
          <div className="navbar-user-profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
            <div
              className="navbar-user-badge"
              title={`Logged in as ${currentUser.username} (${currentUser.role || 'User'})`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '14px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#38BDF8'
              }}
            >
              <User size={13} />
              <span>{currentUser.username}</span>
            </div>
            <button
              type="button"
              className="navbar-icon-btn logout-btn"
              onClick={onLogout}
              title="Sign Out"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 9px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#F87171',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <LogOut size={13} />
              <span>Exit</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
