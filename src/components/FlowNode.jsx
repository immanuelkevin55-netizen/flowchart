import React, { useState, useRef, useEffect } from 'react';
import { SHAPE_TYPES } from '../types/constants';
import { Trash2, Copy } from 'lucide-react';

export default function FlowNode({
  node,
  isSelected,
  isTargeted,
  targetPort,
  isHoveredAsSource = false,
  isHoveredAsTarget = false,
  isDimmed = false,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onStartConnect,
  onConnectPortHover,
  onStartResize,
  zoom = 1,
  gridSnap = true
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text || '');
  const textInputRef = useRef(null);

  useEffect(() => {
    setEditText(node.text || '');
  }, [node.text]);

  useEffect(() => {
    if (isEditing && textInputRef.current) {
      textInputRef.current.focus();
      textInputRef.current.select();
    }
  }, [isEditing]);

  const handleTextSubmit = () => {
    setIsEditing(false);
    onUpdate(node.id, { text: editText });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(node.text || '');
    }
  };

  const {
    id,
    x = 100,
    y = 100,
    width = 200,
    height = 90,
    shape = SHAPE_TYPES.PROCESS,
    fill: rawFill = '#1E293B',
    stroke: rawStroke = '#38BDF8',
    strokeWidth = 2,
    strokeStyle = 'solid',
    textColor = '#F8FAFC',
    fontSize = 14,
    bold = false,
    italic = false,
    underline = false,
    fontFamily = 'inherit',
    textAlign = 'center',
    fillEnabled = true,
    strokeEnabled = true,
    opacity = 100
  } = node;

  const fill = fillEnabled === false ? 'transparent' : rawFill;
  const stroke = strokeEnabled === false ? 'transparent' : rawStroke;

  // Single clean port per edge
  const ports = [
    { id: 'top', cx: width / 2, cy: 0, label: 'Top' },
    { id: 'right', cx: width, cy: height / 2, label: 'Right' },
    { id: 'bottom', cx: width / 2, cy: height, label: 'Bottom' },
    { id: 'left', cx: 0, cy: height / 2, label: 'Left' }
  ];

  // Render SVG Shape geometry
  const renderShapeGeometry = () => {
    const strokeDash = strokeStyle === 'dashed' ? '6,4' : undefined;

    switch (shape) {
      case SHAPE_TYPES.TERMINATOR:
        return (
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            rx={Math.min(width, height) / 2}
            ry={Math.min(width, height) / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDash}
            className="flow-node-shape"
          />
        );

      case SHAPE_TYPES.DECISION: {
        const points = `${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}`;
        return (
          <polygon
            points={points}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDash}
            className="flow-node-shape"
          />
        );
      }

      case SHAPE_TYPES.DATA: {
        const skew = Math.min(30, width * 0.15);
        const points = `${skew},0 ${width},0 ${width - skew},${height} 0,${height}`;
        return (
          <polygon
            points={points}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDash}
            className="flow-node-shape"
          />
        );
      }

      case SHAPE_TYPES.PREPARATION: {
        const chamfer = Math.min(25, width * 0.15);
        const points = `${chamfer},0 ${width - chamfer},0 ${width},${height / 2} ${width - chamfer},${height} ${chamfer},${height} 0,${height / 2}`;
        return (
          <polygon
            points={points}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDash}
            className="flow-node-shape"
          />
        );
      }

      case SHAPE_TYPES.DATABASE: {
        const ellipseH = Math.min(18, height * 0.22);
        return (
          <g className="flow-node-shape">
            {/* Cylinder body */}
            <path
              d={`M 0 ${ellipseH} 
                  L 0 ${height - ellipseH} 
                  A ${width / 2} ${ellipseH} 0 0 0 ${width} ${height - ellipseH} 
                  L ${width} ${ellipseH} 
                  Z`}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
            />
            {/* Top cap */}
            <ellipse
              cx={width / 2}
              cy={ellipseH}
              rx={width / 2}
              ry={ellipseH}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </g>
        );
      }

      case SHAPE_TYPES.DOCUMENT: {
        const waveH = Math.min(16, height * 0.18);
        return (
          <path
            d={`M 0 0 
                L ${width} 0 
                L ${width} ${height - waveH} 
                Q ${width * 0.75} ${height} ${width * 0.5} ${height - waveH} 
                T 0 ${height - waveH} 
                Z`}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDash}
            className="flow-node-shape"
          />
        );
      }

      case SHAPE_TYPES.TEXTBOX:
        return (
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="transparent"
            stroke={isSelected ? stroke : 'transparent'}
            strokeWidth={1}
            strokeDasharray="4,4"
            className="flow-node-shape"
          />
        );

      case SHAPE_TYPES.SUBPROCESS:
        return (
          <g className="flow-node-shape">
            <rect
              x={0}
              y={0}
              width={width}
              height={height}
              rx={6}
              ry={6}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
            />
            <line x1={14} y1={0} x2={14} y2={height} stroke={stroke} strokeWidth={1.5} />
            <line x1={width - 14} y1={0} x2={width - 14} y2={height} stroke={stroke} strokeWidth={1.5} />
          </g>
        );

      case SHAPE_TYPES.PROCESS:
      default:
        return (
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            rx={8}
            ry={8}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDash}
            className="flow-node-shape"
          />
        );
    }
  };

  return (
    <g
      className={`flow-node-group ${isSelected ? 'selected' : ''} ${isHoveredAsSource ? 'source-active' : ''} ${isHoveredAsTarget ? 'target-active' : ''}`}
      transform={`translate(${x}, ${y})`}
      style={{
        opacity: isDimmed ? 0.35 : (opacity !== undefined ? opacity / 100 : 1),
        transition: 'opacity 0.2s ease'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id, e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      {/* Source Highlight Glow & Badge when connected arrow is hovered */}
      {isHoveredAsSource && (
        <g className="node-source-highlight" style={{ pointerEvents: 'none' }}>
          <rect
            x={-6}
            y={-6}
            width={width + 12}
            height={height + 12}
            rx={14}
            fill="none"
            stroke="#10B981"
            strokeWidth={3}
            filter="drop-shadow(0 0 10px rgba(16, 185, 129, 0.8))"
          />
          <foreignObject x={width / 2 - 42} y={-26} width={84} height={24}>
            <div
              style={{
                background: '#10B981',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: '700',
                textAlign: 'center',
                lineHeight: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                letterSpacing: '0.4px'
              }}
            >
              ▲ SOURCE
            </div>
          </foreignObject>
        </g>
      )}

      {/* Target Highlight Glow & Badge when connected arrow is hovered */}
      {isHoveredAsTarget && (
        <g className="node-target-highlight" style={{ pointerEvents: 'none' }}>
          <rect
            x={-6}
            y={-6}
            width={width + 12}
            height={height + 12}
            rx={14}
            fill="none"
            stroke="#38BDF8"
            strokeWidth={3}
            filter="drop-shadow(0 0 10px rgba(56, 189, 248, 0.8))"
          />
          <foreignObject x={width / 2 - 42} y={-26} width={84} height={24}>
            <div
              style={{
                background: '#0284C7',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: '700',
                textAlign: 'center',
                lineHeight: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                letterSpacing: '0.4px'
              }}
            >
              ▼ TARGET
            </div>
          </foreignObject>
        </g>
      )}

      {/* Magnetic Target Snap Glow while dragging an arrow */}
      {isTargeted && (
        <rect
          x={-6}
          y={-6}
          width={width + 12}
          height={height + 12}
          rx={14}
          fill="rgba(56, 189, 248, 0.12)"
          stroke="var(--brand-primary, #38BDF8)"
          strokeWidth={2.5}
          className="node-targeted-halo"
        />
      )}

      {/* Node Drop Shadow / Selection Glow */}
      {/* Node Selection Outline (Draw.io style dashed blue boundary) */}
      {isSelected && (
        <rect
          x={-2}
          y={-2}
          width={width + 4}
          height={height + 4}
          rx={shape === SHAPE_TYPES.TERMINATOR ? Math.min(width, height) / 2 : 4}
          fill="none"
          stroke="#00A8FF"
          strokeWidth={1.5}
          strokeDasharray="4,4"
          className="node-selection-outline"
        />
      )}

      {/* Primary Shape */}
      {renderShapeGeometry()}

      {/* Node Text / Inline Editor */}
      {isEditing ? (
        <foreignObject x={8} y={8} width={width - 16} height={height - 16}>
          <textarea
            ref={textInputRef}
            className="node-inline-textarea"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleTextSubmit}
            onKeyDown={handleKeyDown}
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: bold ? 'bold' : 'normal',
              fontStyle: italic ? 'italic' : 'normal',
              textDecoration: underline ? 'underline' : 'none',
              fontFamily: fontFamily || 'inherit',
              color: textColor,
              textAlign
            }}
          />
        </foreignObject>
      ) : (
        <foreignObject
          x={shape === SHAPE_TYPES.DECISION ? width * 0.15 : 10}
          y={shape === SHAPE_TYPES.DECISION ? height * 0.15 : 8}
          width={shape === SHAPE_TYPES.DECISION ? width * 0.7 : width - 20}
          height={shape === SHAPE_TYPES.DECISION ? height * 0.7 : height - 16}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="node-text-container"
            style={{
              color: textColor,
              fontSize: `${fontSize}px`,
              fontWeight: bold ? '700' : '500',
              fontStyle: italic ? 'italic' : 'normal',
              textDecoration: underline ? 'underline' : 'none',
              fontFamily: fontFamily || 'inherit',
              textAlign,
              display: 'flex',
              alignItems: 'center',
              justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
              height: '100%',
              width: '100%',
              whiteSpace: 'pre-line',
              wordBreak: 'break-word',
              userSelect: 'none',
              lineHeight: 1.3
            }}
          >
            {node.text || 'Double click to edit'}
          </div>
        </foreignObject>
      )}

      {/* Connection Ports: Always in DOM, cleanly toggled with CSS without state flicker */}
      {ports.map((port) => (
        <g
          key={port.id}
          className="flow-node-port-handle"
          onMouseEnter={() => onConnectPortHover && onConnectPortHover(id, port.id)}
          onMouseLeave={() => onConnectPortHover && onConnectPortHover(null, null)}
          onMouseDown={(e) => {
            e.stopPropagation();
            onStartConnect(id, port.id, e);
          }}
        >
          {/* Invisible wide hit-target area (16px radius for effortless grabbing) */}
          <circle
            cx={port.cx}
            cy={port.cy}
            r={16}
            fill="transparent"
            className="port-hit-area"
          />
          {/* Subtle outer glow ring */}
          <circle
            cx={port.cx}
            cy={port.cy}
            r={targetPort === port.id ? 14 : 10}
            fill={targetPort === port.id ? "rgba(56, 189, 248, 0.5)" : "rgba(56, 189, 248, 0.25)"}
            className="port-halo-ring"
          />
          {/* Crisp visible inner port dot */}
          <circle
            cx={port.cx}
            cy={port.cy}
            r={targetPort === port.id ? 7.5 : 5.5}
            fill={targetPort === port.id ? "var(--brand-primary, #38BDF8)" : "#FFFFFF"}
            stroke={targetPort === port.id ? "#FFFFFF" : "var(--brand-primary, #38BDF8)"}
            strokeWidth={2.5}
            className="port-visible-dot"
          />
        </g>
      ))}

      {/* Floating Action Menu for Selected Node */}
      {isSelected && !isEditing && (
        <foreignObject x={width / 2 - 60} y={-44} width={120} height={36} className="node-floating-toolbar-wrapper">
          <div className="node-floating-toolbar">
            <button
              title="Duplicate (Ctrl+D)"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(id);
              }}
              className="toolbar-mini-btn"
            >
              <Copy size={13} />
            </button>
            <button
              title="Delete (Del)"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              className="toolbar-mini-btn danger"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </foreignObject>
      )}

      {/* Interactive On-Canvas Resize Handles */}
      {isSelected && !isEditing && onStartResize && (
        <g className="flow-node-resize-handles">
          {[
            { id: 'nw', cx: 0, cy: 0, cursor: 'nwse-resize' },
            { id: 'n',  cx: width / 2, cy: 0, cursor: 'ns-resize' },
            { id: 'ne', cx: width, cy: 0, cursor: 'nesw-resize' },
            { id: 'e',  cx: width, cy: height / 2, cursor: 'ew-resize' },
            { id: 'se', cx: width, cy: height, cursor: 'nwse-resize' },
            { id: 's',  cx: width / 2, cy: height, cursor: 'ns-resize' },
            { id: 'sw', cx: 0, cy: height, cursor: 'nesw-resize' },
            { id: 'w',  cx: 0, cy: height / 2, cursor: 'ew-resize' }
          ].map((h) => (
            <g
              key={h.id}
              style={{ cursor: h.cursor }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onStartResize(id, h.id, e);
              }}
            >
              {/* Invisible wider hit target for effortless grab */}
              <circle cx={h.cx} cy={h.cy} r={8} fill="transparent" />
              {/* Draw.io Crisp Cyan Circular Dot Handle */}
              <circle
                cx={h.cx}
                cy={h.cy}
                r={4.5}
                fill="#00A8FF"
                stroke="#FFFFFF"
                strokeWidth={1.5}
                className="resize-handle-circle"
              />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}
