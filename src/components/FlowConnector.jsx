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
  onSelect,
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

  const pathD = generateConnectorPath(start, end, type, fromPort, toPort);
  const mid = getConnectorMidpoint(start, end, type, fromPort, toPort);
  const strokeDash = style === 'dashed' ? '6,4' : undefined;

  const handleLabelSubmit = () => {
    setIsEditingLabel(false);
    onUpdate(id, { label: labelInput });
  };

  return (
    <g
      className={`flow-connector-group ${isSelected ? 'selected' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id, e);
      }}
    >
      {/* Invisible wider hit-target line for effortless clicking */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        className="connector-hit-area"
      />

      {/* Selected Halo Glow */}
      {isSelected && (
        <path
          d={pathD}
          fill="none"
          stroke="var(--accent-glow, #38BDF8)"
          strokeWidth={width + 6}
          strokeOpacity={0.45}
        />
      )}

      {/* Actual Connector Path */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeDasharray={strokeDash}
        markerEnd={`url(#arrow-${color.replace('#', '')})`}
        className="flow-connector-path"
      />

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
