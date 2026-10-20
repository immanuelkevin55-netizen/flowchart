/**
 * Calculate the exact coordinates of connection ports for a node
 */
export function getNodePortCoordinates(node, portId) {
  const { x, y, width = 160, height = 80 } = node;
  
  switch (portId) {
    case 'top':
      return { x: x + width / 2, y };
    case 'right':
      return { x: x + width, y: y + height / 2 };
    case 'bottom':
      return { x: x + width / 2, y: y + height };
    case 'left':
      return { x, y: y + height / 2 };
    case 'center':
      return { x: x + width / 2, y: y + height / 2 };
    default:
      return { x: x + width / 2, y: y + height / 2 };
  }
}

/**
 * Given connector data and optional nodes, calculate start and end points.
 */
export function getConnectorEndpoints(conn, fromNode, toNode) {
  const fromPort = conn.fromPort || 'right';
  const toPort = conn.toPort || 'left';

  let start = { x: conn.startX ?? 0, y: conn.startY ?? 0 };
  let end = { x: conn.endX ?? 0, y: conn.endY ?? 0 };

  if (fromNode) {
    start = getNodePortCoordinates(fromNode, fromPort);
  }

  if (toNode) {
    end = getNodePortCoordinates(toNode, toPort);
  }

  return { start, end, fromPort, toPort };
}

/**
 * Simplify orthogonal points by:
 * 1. Removing duplicate/adjacent points (< 2px apart)
 * 2. Merging collinear consecutive points (e.g. horizontal-horizontal or vertical-vertical)
 */
export function simplifyOrthogonalPoints(points) {
  if (!points || points.length <= 1) return points || [];

  // 1. Remove duplicate points
  const cleaned = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = cleaned[cleaned.length - 1];
    const curr = points[i];
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) >= 2) {
      cleaned.push(curr);
    }
  }

  if (cleaned.length <= 2) return cleaned;

  // 2. Collinear simplification
  const result = [cleaned[0]];
  for (let i = 1; i < cleaned.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = cleaned[i];
    const next = cleaned[i + 1];

    const isCollinearH = Math.abs(prev.y - curr.y) < 1 && Math.abs(curr.y - next.y) < 1;
    const isCollinearV = Math.abs(prev.x - curr.x) < 1 && Math.abs(curr.x - next.x) < 1;

    if (!isCollinearH && !isCollinearV) {
      result.push(curr);
    }
  }
  result.push(cleaned[cleaned.length - 1]);
  return result;
}

/**
 * Compute multi-segment points for Orthogonal (elbow) paths.
 * Supports:
 * - Overarching Top-to-Top bridges (e.g. from top of Box 1 up and over to top of Box 2)
 * - Underarching Bottom-to-Bottom bridges (e.g. from bottom of Box 3 down and under to bottom of Box 4)
 * - Right-to-Right and Left-to-Left loops
 * - Cross-port step routing
 * - Automatic alignment for nearly aligned nodes to prevent stair-step kinks
 */
export function getOrthogonalPoints(start, end, fromPort = 'right', toPort = 'left') {
  const { x: x1, y: y1 } = start;
  const { x: x2, y: y2 } = end;
  const dx = x2 - x1;
  const dy = y2 - y1;

  let rawPoints;

  // 1. TOP to TOP loop (Overarching bridge)
  if (fromPort === 'top' && toPort === 'top') {
    const loopY = Math.min(y1, y2) - 50;
    rawPoints = [
      { x: x1, y: y1 },
      { x: x1, y: loopY },
      { x: x2, y: loopY },
      { x: x2, y: y2 }
    ];
  }
  // 2. BOTTOM to BOTTOM loop (Underarching bridge)
  else if (fromPort === 'bottom' && toPort === 'bottom') {
    const loopY = Math.max(y1, y2) + 50;
    rawPoints = [
      { x: x1, y: y1 },
      { x: x1, y: loopY },
      { x: x2, y: loopY },
      { x: x2, y: y2 }
    ];
  }
  // 3. RIGHT to RIGHT loop (Right side feedback)
  else if (fromPort === 'right' && toPort === 'right') {
    const loopX = Math.max(x1, x2) + 50;
    rawPoints = [
      { x: x1, y: y1 },
      { x: loopX, y: y1 },
      { x: loopX, y: y2 },
      { x: x2, y: y2 }
    ];
  }
  // 4. LEFT to LEFT loop (Left side feedback)
  else if (fromPort === 'left' && toPort === 'left') {
    const loopX = Math.min(x1, x2) - 50;
    rawPoints = [
      { x: x1, y: y1 },
      { x: loopX, y: y1 },
      { x: loopX, y: y2 },
      { x: x2, y: y2 }
    ];
  }
  // 5. BOTTOM to TOP or TOP to BOTTOM
  else if ((fromPort === 'bottom' && toPort === 'top') || (fromPort === 'top' && toPort === 'bottom')) {
    // If nearly aligned vertically within 12px, render as a single straight vertical line
    if (Math.abs(x1 - x2) <= 12) {
      rawPoints = [
        { x: x1, y: y1 },
        { x: x1, y: y2 }
      ];
    } else {
      const midY = y1 + dy / 2;
      rawPoints = [
        { x: x1, y: y1 },
        { x: x1, y: midY },
        { x: x2, y: midY },
        { x: x2, y: y2 }
      ];
    }
  }
  // 6. RIGHT to LEFT or LEFT to RIGHT
  else if ((fromPort === 'right' && toPort === 'left') || (fromPort === 'left' && toPort === 'right')) {
    // Forward progression
    if ((fromPort === 'right' && x2 >= x1) || (fromPort === 'left' && x2 <= x1)) {
      // If nearly aligned horizontally within 12px, render as a single straight horizontal line
      if (Math.abs(y1 - y2) <= 12) {
        rawPoints = [
          { x: x1, y: y1 },
          { x: x2, y: y1 }
        ];
      } else {
        const midX = x1 + dx / 2;
        rawPoints = [
          { x: x1, y: y1 },
          { x: midX, y: y1 },
          { x: midX, y: y2 },
          { x: x2, y: y2 }
        ];
      }
    } else {
      // Loop around if pointing backwards
      const loopY = Math.min(y1, y2) - 50;
      rawPoints = [
        { x: x1, y: y1 },
        { x: x1 + (fromPort === 'right' ? 30 : -30), y: y1 },
        { x: x1 + (fromPort === 'right' ? 30 : -30), y: loopY },
        { x: x2 + (toPort === 'left' ? -30 : 30), y: loopY },
        { x: x2 + (toPort === 'left' ? -30 : 30), y: y2 },
        { x: x2, y: y2 }
      ];
    }
  }
  // 7. BOTTOM to LEFT / BOTTOM to RIGHT
  else if (fromPort === 'bottom' && (toPort === 'left' || toPort === 'right')) {
    rawPoints = [
      { x: x1, y: y1 },
      { x: x1, y: y2 },
      { x: x2, y: y2 }
    ];
  }
  // 8. TOP to LEFT / TOP to RIGHT
  else if (fromPort === 'top' && (toPort === 'left' || toPort === 'right')) {
    rawPoints = [
      { x: x1, y: y1 },
      { x: x1, y: y2 },
      { x: x2, y: y2 }
    ];
  }
  // 9. RIGHT to TOP / RIGHT to BOTTOM
  else if (fromPort === 'right' && (toPort === 'top' || toPort === 'bottom')) {
    rawPoints = [
      { x: x1, y: y1 },
      { x: x2, y: y1 },
      { x: x2, y: y2 }
    ];
  }
  // 10. LEFT to TOP / LEFT to BOTTOM
  else if (fromPort === 'left' && (toPort === 'top' || toPort === 'bottom')) {
    rawPoints = [
      { x: x1, y: y1 },
      { x: x2, y: y1 },
      { x: x2, y: y2 }
    ];
  }
  // Fallback step
  else {
    const midX = x1 + dx / 2;
    rawPoints = [
      { x: x1, y: y1 },
      { x: midX, y: y1 },
      { x: midX, y: y2 },
      { x: x2, y: y2 }
    ];
  }

  return simplifyOrthogonalPoints(rawPoints);
}

/**
 * Generate SVG Path string for connectors (Orthogonal, Straight, Curved)
 */
export function generateConnectorPath(start, end, type = 'orthogonal', fromPort = 'right', toPort = 'left') {
  const { x: x1, y: y1 } = start;
  const { x: x2, y: y2 } = end;

  if (type === 'straight') {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  if (type === 'curved') {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const factor = Math.max(30, Math.min(dx, dy) * 0.5 + 20);

    let cx1 = x1;
    let cy1 = y1;
    let cx2 = x2;
    let cy2 = y2;

    if (fromPort === 'bottom') cy1 += factor;
    else if (fromPort === 'top') cy1 -= factor;
    else if (fromPort === 'right') cx1 += factor;
    else if (fromPort === 'left') cx1 -= factor;

    if (toPort === 'bottom') cy2 += factor;
    else if (toPort === 'top') cy2 -= factor;
    else if (toPort === 'right') cx2 += factor;
    else if (toPort === 'left') cx2 -= factor;

    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  }

  // Orthogonal Multi-Segment Path
  const points = getOrthogonalPoints(start, end, fromPort, toPort);
  return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
}

/**
 * Calculate the midpoint of a connector for placing labels
 */
export function getConnectorMidpoint(start, end, type = 'orthogonal', fromPort = 'right', toPort = 'left') {
  if (type === 'straight' || type === 'curved') {
    return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  }

  const points = getOrthogonalPoints(start, end, fromPort, toPort);
  if (points.length >= 4) {
    // The horizontal or vertical bridge segment in the middle
    const p1 = points[1];
    const p2 = points[2];
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }

  if (points.length === 3) {
    // Pick midpoint of the longer segment
    const d1 = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
    const d2 = Math.hypot(points[2].x - points[1].x, points[2].y - points[1].y);
    if (d1 >= d2) {
      return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
    }
    return { x: (points[1].x + points[2].x) / 2, y: (points[1].y + points[2].y) / 2 };
  }

  if (points.length === 2) {
    return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
  }

  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

/**
 * Find closest port on a node given an arbitrary point
 */
export function getClosestPort(node, point) {
  const ports = ['top', 'right', 'bottom', 'left'];
  let closestPort = 'right';
  let minDistance = Infinity;

  for (const port of ports) {
    const coords = getNodePortCoordinates(node, port);
    const dist = Math.hypot(coords.x - point.x, coords.y - point.y);
    if (dist < minDistance) {
      minDistance = dist;
      closestPort = port;
    }
  }

  return { port: closestPort, distance: minDistance };
}

/**
 * Snap coordinate to grid
 */
export function snapToGrid(value, gridSize = 20) {
  return Math.round(value / gridSize) * gridSize;
}
