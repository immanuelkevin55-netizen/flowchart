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
  onStartDragEndpoint,
  onInsertNodeBetween
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
        opacity: 1,
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
