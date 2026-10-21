import React, { useState } from 'react';
import {
  getConnectorEndpoints,
  generateConnectorPath,
  getConnectorMidpoint
} from '../utils/geometry';
import { Trash2 } from 'lucide-react';

export default function FlowConnector({
  connector,
  fromNode,
  toNode,
  isSelected,
  isHovered,
  isDimmed,
  options = {},
  onSelect,
  onHover,
  onUpdate,
  onDelete,
  onStartDragEndpoint
}) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelInput, setLabelInput] = useState(connector.label || '');

  const {
    id,
    type = 'orthogonal',
    color = '#38BDF8',
    width = 2,
    style = 'solid',
    label = ''
  } = connector;

  const { start, end, fromPort, toPort } = getConnectorEndpoints(connector, fromNode, toNode);

  // If both endpoints are at (0,0) and neither node exists, skip
  if (!fromNode && !toNode && (!connector.startX && !connector.endX)) {
    return null;
  }

  const pathD = generateConnectorPath(start, end, type, fromPort, toPort, options);
  const mid = getConnectorMidpoint(start, end, type, fromPort, toPort, options);
  const strokeDash = style === 'dashed' ? '6,4' : undefined;

  const handleLabelSubmit = () => {
    setIsEditingLabel(false);
    onUpdate(id, { label: labelInput });
  };

  const tooltipText = `${fromNode?.text || 'Start'} ➔ ${toNode?.text || 'Target'}`;

  return (
    <g
      className={`flow-connector-group ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isDimmed ? 'dimmed' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id, e);
      }}
      onMouseEnter={() => onHover && onHover(id)}
      onMouseLeave={() => onHover && onHover(null)}
      style={{
        opacity: isDimmed ? 0.22 : 1,
        transition: 'opacity 0.2s ease'
      }}
    >
      {/* Invisible wider hit-target line for effortless clicking and hovering */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={22}
        className="connector-hit-area"
      />

      {/* Selected or Hover Glow Halo */}
      {(isSelected || isHovered) && (
        <path
          d={pathD}
          fill="none"
          stroke={isSelected ? 'var(--accent-glow, #38BDF8)' : color}
          strokeWidth={width + (isSelected ? 8 : 6)}
          strokeOpacity={isSelected ? 0.6 : 0.4}
          className="connector-glow-halo"
        />
      )}

      {/* Actual Connector Path */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={isHovered ? width + 1 : width}
        strokeDasharray={strokeDash}
        markerEnd={`url(#arrow-${color.replace('#', '')})`}
        className="flow-connector-path"
      />

      {/* Animated Flow Dash when hovered or selected */}
      {(isSelected || isHovered) && (
        <path
          d={pathD}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={Math.max(1.5, width - 0.5)}
          strokeDasharray="6 8"
          strokeOpacity={0.85}
          className="flow-connector-pulse-line"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* When selected: Interactive Drag Handles at Start and End points */}
      {isSelected && onStartDragEndpoint && (
        <g className="connector-endpoint-handles">
          {/* Start Point Handle */}
          <circle
            cx={start.x}
            cy={start.y}
            r={7}
            className="connector-endpoint-handle start"
            onMouseDown={(e) => {
              e.stopPropagation();
              onStartDragEndpoint(id, 'start', e);
            }}
            title="Drag to reconnect start anywhere"
          />

          {/* End Point Handle */}
          <circle
            cx={end.x}
            cy={end.y}
            r={7}
            className="connector-endpoint-handle end"
            onMouseDown={(e) => {
              e.stopPropagation();
              onStartDragEndpoint(id, 'end', e);
            }}
            title="Drag to reconnect arrow tip anywhere"
          />
        </g>
      )}

      {/* Interactive Floating Connection Tooltip on Hover */}
      {isHovered && !isEditingLabel && (fromNode || toNode) && (
        <g
          transform={`translate(${mid.x}, ${mid.y - (label ? 24 : 16)})`}
          className="connector-hover-tooltip"
          style={{ pointerEvents: 'none' }}
        >
          <rect
            x={-Math.max(38, (tooltipText.length * 6.5 + 20) / 2)}
            y={-11}
            width={Math.max(76, tooltipText.length * 6.5 + 20)}
            height={22}
            rx={11}
            fill="#0F172A"
            stroke={color}
            strokeWidth={1.5}
            filter="drop-shadow(0 2px 8px rgba(0,0,0,0.5))"
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fill="#F8FAFC"
            fontSize="10px"
            fontWeight="600"
            letterSpacing="0.3px"
          >
            {tooltipText}
          </text>
        </g>
      )}

      {/* Connector Label Badge */}
      {(label || isEditingLabel || isSelected) && (
        <g
          transform={`translate(${mid.x}, ${mid.y})`}
          className="connector-label-group"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(id, e);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setLabelInput(label);
            setIsEditingLabel(true);
          }}
        >
          {isEditingLabel ? (
            <foreignObject x={-60} y={-16} width={120} height={32}>
              <input
                type="text"
                className="connector-inline-input"
                autoFocus
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onBlur={handleLabelSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLabelSubmit();
                  if (e.key === 'Escape') setIsEditingLabel(false);
                }}
              />
            </foreignObject>
          ) : (
            <g>
              <rect
                x={-Math.max(26, (label.length * 7 + 18) / 2)}
                y={-12}
                width={Math.max(52, label.length * 7 + 18)}
                height={24}
                rx={12}
                className="connector-label-bg"
                style={{
                  fill: 'var(--panel-bg, #1E293B)',
                  stroke: color,
                  strokeWidth: 1.5
                }}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                className="connector-label-text"
                style={{
                  fill: 'var(--text-main, #F8FAFC)',
                  fontSize: '11px',
                  fontWeight: '600'
                }}
              >
                {label || '+ Label'}
              </text>
            </g>
          )}
        </g>
      )}

      {/* Delete button when connector is selected */}
      {isSelected && !isEditingLabel && (
        <g
          transform={`translate(${mid.x + 36}, ${mid.y - 14})`}
          className="connector-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          title="Delete Arrow"
        >
          <circle cx={10} cy={10} r={12} fill="#EF4444" />
          <foreignObject x={3} y={3} width={14} height={14} style={{ pointerEvents: 'none' }}>
            <Trash2 size={13} color="#FFFFFF" />
          </foreignObject>
        </g>
      )}
    </g>
  );
}
