import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '../types/constants';

export const HEADER_SAFE_Y = 148; // Presentation slide title & category protection clearance
export const CANVAS_MARGIN = 35;

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
  const assignHorizontalLanes = (loops, isTop = false) => {
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

      const offset = isTop ? 38 + assignedLane * 28 : 44 + assignedLane * 34;
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

      const offset = 44 + assignedLane * 34;
      laneMap.set(loop.id, { lane: assignedLane, offset });
    }
  };

  assignHorizontalLanes(bottomLoops, false);
  assignHorizontalLanes(topLoops, true);
  assignVerticalLanes(rightLoops);
  assignVerticalLanes(leftLoops);

  return laneMap;
}

/**
 * Compute multi-segment points for Orthogonal (elbow) paths with Draw.io Manhattan routing.
 * Ensures:
 * - Strict port exit normals (leaves node outward along port direction)
 * - Strict port entry approach (arrives from outside toward target port)
 * - Protected slide header area (no loops or segments breach y < HEADER_SAFE_Y = 148)
 * - Collision-free multi-track lane offsets
 * - Collinear merging and smooth fillet corner compatibility
 */
export function getOrthogonalPoints(start, end, fromPort = 'right', toPort = 'left', options = {}) {
  const { x: x1, y: y1 } = start;
  const { x: x2, y: y2 } = end;
  const dx = x2 - x1;
  const dy = y2 - y1;

  const minMargin = options.minMargin ?? 24;
  const laneIndex = options.lane ?? 0;

  // Multi-track lane spacing
  const spanX = Math.abs(dx);
  const fallbackTierX = Math.min(5, Math.max(0, Math.floor((spanX - 60) / 160)));
  const assignedTierX = options.lane ?? fallbackTierX;
  const loopOffsetY = options.offset != null
    ? options.offset
    : (40 + assignedTierX * 28);

  const spanY = Math.abs(dy);
  const fallbackTierY = Math.min(5, Math.max(0, Math.floor((spanY - 60) / 140)));
  const assignedTierY = options.lane ?? fallbackTierY;
  const loopOffsetX = options.offset != null
    ? options.offset
    : (40 + assignedTierY * 30);

  let rawPoints;

  // 1. TOP to TOP loop (Overarching bridge)
  if (fromPort === 'top' && toPort === 'top') {
    const rawLoopY = Math.min(y1, y2) - loopOffsetY;
    const safeHeaderFloor = HEADER_SAFE_Y + Math.min(56, laneIndex * 14);
    const loopY = Math.max(safeHeaderFloor, rawLoopY);

    rawPoints = [
      { x: x1, y: y1 },
      { x: x1, y: loopY },
      { x: x2, y: loopY },
      { x: x2, y: y2 }
    ];
  }

  // 2. BOTTOM to BOTTOM loop (Underarching bridge)
  else if (fromPort === 'bottom' && toPort === 'bottom') {
    const rawLoopY = Math.max(y1, y2) + loopOffsetY;
    const loopY = Math.min(DEFAULT_CANVAS_HEIGHT - 35 - Math.min(56, laneIndex * 14), rawLoopY);
    rawPoints = [
      { x: x1, y: y1 },
      { x: x1, y: loopY },
      { x: x2, y: loopY },
      { x: x2, y: y2 }
    ];
  }

  // 3. RIGHT to RIGHT loop (Right-side loop)
  else if (fromPort === 'right' && toPort === 'right') {
    const rawLoopX = Math.max(x1, x2) + loopOffsetX;
    const loopX = Math.min(DEFAULT_CANVAS_WIDTH - 35 - Math.min(56, laneIndex * 14), rawLoopX);
    rawPoints = [
      { x: x1, y: y1 },
      { x: loopX, y: y1 },
      { x: loopX, y: y2 },
      { x: x2, y: y2 }
    ];
  }

  // 4. LEFT to LEFT loop (Left-side loop)
  else if (fromPort === 'left' && toPort === 'left') {
    const rawLoopX = Math.min(x1, x2) - loopOffsetX;
    const loopX = Math.max(35 + Math.min(56, laneIndex * 14), rawLoopX);
    rawPoints = [
      { x: x1, y: y1 },
      { x: loopX, y: y1 },
      { x: loopX, y: y2 },
      { x: x2, y: y2 }
    ];
  }

  // 5. RIGHT to LEFT (Standard forward horizontal flow or backward feedback)
  else if (fromPort === 'right' && toPort === 'left') {
    if (x2 >= x1 + minMargin * 2) {
      if (Math.abs(y1 - y2) <= 14) {
        rawPoints = [
          { x: x1, y: y1 },
          { x: x2, y: y1 }
        ];
      } else {
        const midX = (x1 + x2) / 2;
        rawPoints = [
          { x: x1, y: y1 },
          { x: midX, y: y1 },
          { x: midX, y: y2 },
          { x: x2, y: y2 }
        ];
      }
    } else {
      // Backward feedback loop
      const rawLoopY = Math.min(y1, y2) - loopOffsetY;
      const safeHeaderFloor = HEADER_SAFE_Y + Math.min(56, laneIndex * 14);
      const loopY = Math.max(safeHeaderFloor, rawLoopY);
      const exitX = x1 + minMargin;
      const enterX = x2 - minMargin;
      rawPoints = [
        { x: x1, y: y1 },
        { x: exitX, y: y1 },
        { x: exitX, y: loopY },
        { x: enterX, y: loopY },
        { x: enterX, y: y2 },
        { x: x2, y: y2 }
      ];
    }
  }

  // 6. LEFT to RIGHT (Opposite horizontal flow or backward feedback)
  else if (fromPort === 'left' && toPort === 'right') {
    if (x2 <= x1 - minMargin * 2) {
      if (Math.abs(y1 - y2) <= 14) {
        rawPoints = [
          { x: x1, y: y1 },
          { x: x2, y: y1 }
        ];
      } else {
        const midX = (x1 + x2) / 2;
        rawPoints = [
          { x: x1, y: y1 },
          { x: midX, y: y1 },
          { x: midX, y: y2 },
          { x: x2, y: y2 }
        ];
      }
    } else {
      // Backward loop
      const rawLoopY = Math.min(y1, y2) - loopOffsetY;
      const safeHeaderFloor = HEADER_SAFE_Y + Math.min(56, laneIndex * 14);
      const loopY = Math.max(safeHeaderFloor, rawLoopY);
      const exitX = x1 - minMargin;
      const enterX = x2 + minMargin;
      rawPoints = [
        { x: x1, y: y1 },
        { x: exitX, y: y1 },
        { x: exitX, y: loopY },
        { x: enterX, y: loopY },
        { x: enterX, y: y2 },
        { x: x2, y: y2 }
      ];
    }
  }

  // 7. BOTTOM to TOP (Downward vertical flow or upward feedback)
  else if (fromPort === 'bottom' && toPort === 'top') {
    if (y2 >= y1 + minMargin * 2) {
      if (Math.abs(x1 - x2) <= 14) {
        rawPoints = [
          { x: x1, y: y1 },
          { x: x1, y: y2 }
        ];
      } else {
        const midY = (y1 + y2) / 2;
        rawPoints = [
          { x: x1, y: y1 },
          { x: x1, y: midY },
          { x: x2, y: midY },
          { x: x2, y: y2 }
        ];
      }
    } else {
      // Upward feedback loop: routes around laterally
      const routeRight = x2 >= x1;
      const loopX = routeRight
        ? Math.min(DEFAULT_CANVAS_WIDTH - 35, Math.max(x1, x2) + loopOffsetX)
        : Math.max(35, Math.min(x1, x2) - loopOffsetX);
      const exitY = y1 + minMargin;
      const enterY = Math.max(HEADER_SAFE_Y, y2 - minMargin);
      rawPoints = [
        { x: x1, y: y1 },
        { x: x1, y: exitY },
        { x: loopX, y: exitY },
        { x: loopX, y: enterY },
        { x: x2, y: enterY },
        { x: x2, y: y2 }
      ];
    }
  }

  // 8. TOP to BOTTOM (Upward vertical flow or downward feedback)
  else if (fromPort === 'top' && toPort === 'bottom') {
    if (y2 <= y1 - minMargin * 2) {
      if (Math.abs(x1 - x2) <= 14) {
        rawPoints = [
          { x: x1, y: y1 },
          { x: x1, y: y2 }
        ];
      } else {
        const midY = (y1 + y2) / 2;
        rawPoints = [
          { x: x1, y: y1 },
          { x: x1, y: midY },
          { x: x2, y: midY },
          { x: x2, y: y2 }
        ];
      }
    } else {
      // Downward loop: routes around laterally
      const routeRight = x2 >= x1;
      const loopX = routeRight
        ? Math.min(DEFAULT_CANVAS_WIDTH - 35, Math.max(x1, x2) + loopOffsetX)
        : Math.max(35, Math.min(x1, x2) - loopOffsetX);
      const exitY = Math.max(HEADER_SAFE_Y, y1 - minMargin);
      const enterY = y2 + minMargin;
      rawPoints = [
        { x: x1, y: y1 },
        { x: x1, y: exitY },
        { x: loopX, y: exitY },
        { x: loopX, y: enterY },
        { x: x2, y: enterY },
        { x: x2, y: y2 }
      ];
    }
  }

  // 9. BOTTOM to LEFT (Exits down, enters rightward into left)
  else if (fromPort === 'bottom' && toPort === 'left') {
    if (x2 >= x1 + minMargin && y2 >= y1 + minMargin) {
      rawPoints = [
        { x: x1, y: y1 },
        { x: x1, y: y2 },
        { x: x2, y: y2 }
      ];
    } else {
      const exitY = y1 + minMargin;
      const enterX = x2 - minMargin;
      rawPoints = [
        { x: x1, y: y1 },
        { x: x1, y: exitY },
        { x: enterX, y: exitY },
        { x: enterX, y: y2 },
        { x: x2, y: y2 }
      ];
    }
  }

  // 10. BOTTOM to RIGHT (Exits down, enters leftward into right)
  else if (fromPort === 'bottom' && toPort === 'right') {
    if (x2 <= x1 - minMargin && y2 >= y1 + minMargin) {
      rawPoints = [
        { x: x1, y: y1 },
        { x: x1, y: y2 },
        { x: x2, y: y2 }
      ];
    } else {
      const exitY = y1 + minMargin;
      const enterX = x2 + minMargin;
      rawPoints = [
        { x: x1, y: y1 },
        { x: x1, y: exitY },
        { x: enterX, y: exitY },
        { x: enterX, y: y2 },
        { x: x2, y: y2 }
      ];
    }
  }

  // 11. TOP to LEFT (Exits up, enters rightward into left)
  else if (fromPort === 'top' && toPort === 'left') {
    if (x2 >= x1 + minMargin && y2 <= y1 - minMargin) {
      const safeY = Math.max(HEADER_SAFE_Y, y2);
      rawPoints = [
        { x: x1, y: y1 },
        { x: x1, y: safeY },
        { x: x2, y: safeY }
      ];
    } else {
      const exitY = Math.max(HEADER_SAFE_Y, y1 - minMargin);
      const enterX = x2 - minMargin;
      rawPoints = [
        { x: x1, y: y1 },
        { x: x1, y: exitY },
        { x: enterX, y: exitY },
        { x: enterX, y: y2 },
        { x: x2, y: y2 }
      ];
    }
  }

  // 12. TOP to RIGHT (Exits up, enters leftward into right)
  else if (fromPort === 'top' && toPort === 'right') {
    if (x2 <= x1 - minMargin && y2 <= y1 - minMargin) {
      const safeY = Math.max(HEADER_SAFE_Y, y2);
      rawPoints = [
        { x: x1, y: y1 },
        { x: x1, y: safeY },
        { x: x2, y: safeY }
      ];
    } else {
      const exitY = Math.max(HEADER_SAFE_Y, y1 - minMargin);
      const enterX = x2 + minMargin;
      rawPoints = [
        { x: x1, y: y1 },
        { x: x1, y: exitY },
        { x: enterX, y: exitY },
        { x: enterX, y: y2 },
        { x: x2, y: y2 }
      ];
    }
  }

  // 13. RIGHT to TOP (Exits right, enters downward into top)
  else if (fromPort === 'right' && toPort === 'top') {
    if (x2 >= x1 + minMargin && y2 >= y1 + minMargin) {
      rawPoints = [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 }
      ];
    } else {
      const exitX = x1 + minMargin;
      const enterY = Math.max(HEADER_SAFE_Y, y2 - minMargin);
      rawPoints = [
        { x: x1, y: y1 },
        { x: exitX, y: y1 },
        { x: exitX, y: enterY },
        { x: x2, y: enterY },
        { x: x2, y: y2 }
      ];
    }
  }

  // 14. RIGHT to BOTTOM (Exits right, enters upward into bottom)
  else if (fromPort === 'right' && toPort === 'bottom') {
    if (x2 >= x1 + minMargin && y2 <= y1 - minMargin) {
      rawPoints = [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 }
      ];
    } else {
      const exitX = x1 + minMargin;
      const enterY = Math.min(DEFAULT_CANVAS_HEIGHT - 35, y2 + minMargin);
      rawPoints = [
        { x: x1, y: y1 },
        { x: exitX, y: y1 },
        { x: exitX, y: enterY },
        { x: x2, y: enterY },
        { x: x2, y: y2 }
      ];
    }
  }

  // 15. LEFT to TOP (Exits left, enters downward into top)
  else if (fromPort === 'left' && toPort === 'top') {
    if (x2 <= x1 - minMargin && y2 >= y1 + minMargin) {
      rawPoints = [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 }
      ];
    } else {
      const exitX = x1 - minMargin;
      const enterY = Math.max(HEADER_SAFE_Y, y2 - minMargin);
      rawPoints = [
        { x: x1, y: y1 },
        { x: exitX, y: y1 },
        { x: exitX, y: enterY },
        { x: x2, y: enterY },
        { x: x2, y: y2 }
      ];
    }
  }

  // 16. LEFT to BOTTOM (Exits left, enters upward into bottom)
  else if (fromPort === 'left' && toPort === 'bottom') {
    if (x2 <= x1 - minMargin && y2 <= y1 - minMargin) {
      rawPoints = [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 }
      ];
    } else {
      const exitX = x1 - minMargin;
      const enterY = Math.min(DEFAULT_CANVAS_HEIGHT - 35, y2 + minMargin);
      rawPoints = [
        { x: x1, y: y1 },
        { x: exitX, y: y1 },
        { x: exitX, y: enterY },
        { x: x2, y: enterY },
        { x: x2, y: y2 }
      ];
    }
  }

  // Fallback step (safely routed)
  else {
    const midX = (x1 + x2) / 2;
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
