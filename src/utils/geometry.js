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
 * Computes non-overlapping lane offsets for parallel connectors across a slide.
 * Solves interval allocation so parallel bottom-to-bottom or top-to-top lines
 * never collide or overlap on the same horizontal baseline.
 */
export function computeConnectorLanes(connectors = [], nodes = []) {
  const nodeMap = new Map((nodes || []).map((n) => [n.id, n]));
  const laneMap = new Map();

  const bottomLoops = [];
  const topLoops = [];
  const rightLoops = [];
  const leftLoops = [];

  for (const conn of (connectors || [])) {
    const fromNode = nodeMap.get(conn.fromId);
    const toNode = nodeMap.get(conn.toId);
    const { start, end, fromPort, toPort } = getConnectorEndpoints(conn, fromNode, toNode);

    // If user explicitly specified a manual offset, respect it directly
    if (conn.offset !== undefined && conn.offset !== null && conn.offset !== '') {
      laneMap.set(conn.id, { offset: Number(conn.offset), lane: conn.lane ?? 0 });
      continue;
    }

    if (fromPort === 'bottom' && toPort === 'bottom') {
      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      const span = maxX - minX;
      bottomLoops.push({ id: conn.id, minX, maxX, span, start, end });
    } else if (fromPort === 'top' && toPort === 'top') {
      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      const span = maxX - minX;
      topLoops.push({ id: conn.id, minX, maxX, span, start, end });
    } else if (fromPort === 'right' && toPort === 'right') {
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);
      const span = maxY - minY;
      rightLoops.push({ id: conn.id, minY, maxY, span, start, end });
    } else if (fromPort === 'left' && toPort === 'left') {
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);
      const span = maxY - minY;
      leftLoops.push({ id: conn.id, minY, maxY, span, start, end });
    }
  }

  // Allocate non-overlapping horizontal lanes
  const assignHorizontalLanes = (loops) => {
    // Sort shorter spans first (inner track), larger spans outer
    loops.sort((a, b) => a.span - b.span || a.minX - b.minX);
    const lanes = [];

    for (const loop of loops) {
      let assignedLane = -1;
      for (let l = 0; l < lanes.length; l++) {
        const hasCollision = lanes[l].some(
          (interval) => !(loop.maxX <= interval.minX + 15 || loop.minX >= interval.maxX - 15)
        );
        if (!hasCollision) {
          assignedLane = l;
          lanes[l].push({ minX: loop.minX, maxX: loop.maxX });
          break;
        }
      }

      if (assignedLane === -1) {
        assignedLane = lanes.length;
        lanes.push([{ minX: loop.minX, maxX: loop.maxX }]);
      }

      const offset = 48 + assignedLane * 36;
      laneMap.set(loop.id, { lane: assignedLane, offset });
    }
  };

  // Allocate non-overlapping vertical lanes
  const assignVerticalLanes = (loops) => {
    loops.sort((a, b) => a.span - b.span || a.minY - b.minY);
    const lanes = [];

    for (const loop of loops) {
      let assignedLane = -1;
      for (let l = 0; l < lanes.length; l++) {
        const hasCollision = lanes[l].some(
          (interval) => !(loop.maxY <= interval.minY + 15 || loop.minY >= interval.maxY - 15)
        );
        if (!hasCollision) {
          assignedLane = l;
          lanes[l].push({ minY: loop.minY, maxY: loop.maxY });
          break;
        }
      }

      if (assignedLane === -1) {
        assignedLane = lanes.length;
        lanes.push([{ minY: loop.minY, maxY: loop.maxY }]);
      }

      const offset = 48 + assignedLane * 36;
      laneMap.set(loop.id, { lane: assignedLane, offset });
    }
  };

  assignHorizontalLanes(bottomLoops);
  assignHorizontalLanes(topLoops);
  assignVerticalLanes(rightLoops);
  assignVerticalLanes(leftLoops);

  return laneMap;
}

/**
 * Compute multi-segment points for Orthogonal (elbow) paths.
 * Supports:
 * - Multi-track collision-free lane offsets via options
 * - Overarching Top-to-Top bridges
 * - Underarching Bottom-to-Bottom bridges
 * - Right-to-Right and Left-to-Left loops
 * - Cross-port step routing
 * - Automatic alignment for nearly aligned nodes to prevent stair-step kinks
 */
export function getOrthogonalPoints(start, end, fromPort = 'right', toPort = 'left', options = {}) {
  const { x: x1, y: y1 } = start;
  const { x: x2, y: y2 } = end;
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Concentric multi-track lane spacing:
  // Can be controlled explicitly via options.offset or options.lane
  const spanX = Math.abs(dx);
  const fallbackTierX = Math.min(5, Math.max(0, Math.floor((spanX - 60) / 160)));
  const loopOffsetY = options.offset != null
    ? options.offset
    : (options.lane != null ? 48 + options.lane * 36 : 48 + fallbackTierX * 36);

  const spanY = Math.abs(dy);
  const fallbackTierY = Math.min(5, Math.max(0, Math.floor((spanY - 60) / 140)));
  const loopOffsetX = options.offset != null
    ? options.offset
    : (options.lane != null ? 48 + options.lane * 36 : 48 + fallbackTierY * 36);

  let rawPoints;

  // 1. TOP to TOP loop (Overarching bridge)
  if (fromPort === 'top' && toPort === 'top') {
    const loopY = Math.min(y1, y2) - loopOffsetY;
    rawPoints = [
      { x: x1, y: y1 },
      { x: x1, y: loopY },
      { x: x2, y: loopY },
      { x: x2, y: y2 }
    ];
  }
  // 2. BOTTOM to BOTTOM loop (Underarching bridge)
  else if (fromPort === 'bottom' && toPort === 'bottom') {
    const loopY = Math.max(y1, y2) + loopOffsetY;
    rawPoints = [
      { x: x1, y: y1 },
      { x: x1, y: loopY },
      { x: x2, y: loopY },
      { x: x2, y: y2 }
    ];
  }
  // 3. RIGHT to RIGHT loop (Right side feedback)
  else if (fromPort === 'right' && toPort === 'right') {
    const loopX = Math.max(x1, x2) + loopOffsetX;
    rawPoints = [
      { x: x1, y: y1 },
      { x: loopX, y: y1 },
      { x: loopX, y: y2 },
      { x: x2, y: y2 }
    ];
  }
  // 4. LEFT to LEFT loop (Left side feedback)
  else if (fromPort === 'left' && toPort === 'left') {
    const loopX = Math.min(x1, x2) - loopOffsetX;
    rawPoints = [
      { x: x1, y: y1 },
      { x: loopX, y: y1 },
      { x: loopX, y: y2 },
      { x: x2, y: y2 }
    ];
  }
  // 5. BOTTOM to TOP or TOP to BOTTOM
  else if ((fromPort === 'bottom' && toPort === 'top') || (fromPort === 'top' && toPort === 'bottom')) {
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
    if ((fromPort === 'right' && x2 >= x1) || (fromPort === 'left' && x2 <= x1)) {
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
      const loopY = Math.min(y1, y2) - loopOffsetY;
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
 * Generate SVG Path string for connectors (Orthogonal, Straight, Curved).
 * Automatically applies smooth rounded fillet corners for orthogonal elbows.
 */
export function generateConnectorPath(start, end, type = 'orthogonal', fromPort = 'right', toPort = 'left', options = {}) {
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

  // Orthogonal Multi-Segment Path with Smooth Rounded Fillet Corners
  const points = getOrthogonalPoints(start, end, fromPort, toPort, options);
  if (!points || points.length === 0) return '';
  if (points.length <= 2) {
    return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  }

  const r = options.cornerRadius ?? 12;
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const d1x = curr.x - prev.x;
    const d1y = curr.y - prev.y;
    const len1 = Math.hypot(d1x, d1y);

    const d2x = next.x - curr.x;
    const d2y = next.y - curr.y;
    const len2 = Math.hypot(d2x, d2y);

    if (len1 < 1 || len2 < 1) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const radius = Math.min(r, len1 / 2, len2 / 2);

    const u1x = d1x / len1;
    const u1y = d1y / len1;
    const u2x = d2x / len2;
    const u2y = d2y / len2;

    const bx = curr.x - u1x * radius;
    const by = curr.y - u1y * radius;
    const ax = curr.x + u2x * radius;
    const ay = curr.y + u2y * radius;

    d += ` L ${bx} ${by}`;
    d += ` Q ${curr.x} ${curr.y} ${ax} ${ay}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * Calculate the midpoint of a connector for placing labels or directional badges
 */
export function getConnectorMidpoint(start, end, type = 'orthogonal', fromPort = 'right', toPort = 'left', options = {}) {
  if (type === 'straight' || type === 'curved') {
    return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  }

  const points = getOrthogonalPoints(start, end, fromPort, toPort, options);
  if (points.length >= 4) {
    // The horizontal or vertical bridge segment in the middle
    const p1 = points[1];
    const p2 = points[2];
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }

  if (points.length === 3) {
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
