import { SHAPE_TYPES } from '../types/constants';

/**
 * Clean node label and detect shape type from syntax
 * [] -> process
 * {} -> decision
 * () or ([]) -> terminator
 * [( )] -> database
 */
function parseNodeToken(token) {
  const trimmed = token.trim();
  let text = trimmed;
  let shape = SHAPE_TYPES.PROCESS;

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    shape = SHAPE_TYPES.DECISION;
    text = trimmed.slice(1, -1).trim();
  } else if (trimmed.startsWith('([') && trimmed.endsWith('])')) {
    shape = SHAPE_TYPES.TERMINATOR;
    text = trimmed.slice(2, -2).trim();
  } else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    shape = SHAPE_TYPES.TERMINATOR;
    text = trimmed.slice(1, -1).trim();
  } else if (trimmed.startsWith('[(') && trimmed.endsWith(')]')) {
    shape = SHAPE_TYPES.DATABASE;
    text = trimmed.slice(2, -2).trim();
  } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    shape = SHAPE_TYPES.PROCESS;
    text = trimmed.slice(1, -1).trim();
  }

  // Remove potential ID prefix like "A[Process Name]" -> ID: A, text: Process Name
  const matchWithId = text.match(/^([A-Za-z0-9_-]+)\[(.*)\]$/);
  if (matchWithId) {
    return { idKey: matchWithId[1], text: matchWithId[2], shape };
  }

  const matchDecision = text.match(/^([A-Za-z0-9_-]+)\{(.*)\}$/);
  if (matchDecision) {
    return { idKey: matchDecision[1], text: matchDecision[2], shape: SHAPE_TYPES.DECISION };
  }

  return { idKey: text, text, shape };
}

/**
 * Parses user input text or Mermaid-like syntax and creates nodes and connectors with hierarchical layout
 */
export function parseTextToFlowchart(input, currentTheme, slideWidth = 1600, slideHeight = 900) {
  const lines = input
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('graph ') && !l.startsWith('flowchart ') && !l.startsWith('%%'));

  const nodesMap = new Map();
  const rawConnections = [];

  let nextId = 1;
  const getOrCreateNode = (token) => {
    const { idKey, text, shape } = parseNodeToken(token);
    const normalizedKey = idKey.toLowerCase();

    if (nodesMap.has(normalizedKey)) {
      const existing = nodesMap.get(normalizedKey);
      if (existing.shape === SHAPE_TYPES.PROCESS && shape !== SHAPE_TYPES.PROCESS) {
        existing.shape = shape;
      }
      return existing;
    }

    const id = `node-${Date.now()}-${nextId++}`;
    let fill = currentTheme.primary.fill;
    let stroke = currentTheme.primary.stroke;
    let textColor = currentTheme.primary.textColor;

    if (shape === SHAPE_TYPES.DECISION) {
      fill = currentTheme.decision.fill;
      stroke = currentTheme.decision.stroke;
      textColor = currentTheme.decision.textColor;
    } else if (shape === SHAPE_TYPES.TERMINATOR) {
      fill = currentTheme.terminator.fill;
      stroke = currentTheme.terminator.stroke;
      textColor = currentTheme.terminator.textColor;
    }

    const newNode = {
      id,
      key: normalizedKey,
      text: text || `Step ${nextId}`,
      shape,
      width: shape === SHAPE_TYPES.DECISION ? 180 : 200,
      height: shape === SHAPE_TYPES.DECISION ? 100 : 80,
      fill,
      stroke,
      textColor,
      strokeWidth: 2,
      fontSize: 14,
      fontFamily: 'Inter',
      textAlign: 'center'
    };

    nodesMap.set(normalizedKey, newNode);
    return newNode;
  };

  // Regex patterns to match connections:
  // e.g. A -->|Yes| B
  // e.g. A -> B
  // e.g. [Start] -> [Step 1]
  const arrowRegex = /(-->|->|==>)/;

  for (const line of lines) {
    if (arrowRegex.test(line)) {
      // Handle chaining like: A -> B -> C
      const parts = line.split(arrowRegex);
      const cleanParts = [];
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (arrowRegex.test(part)) continue;
        if (part) cleanParts.push(part);
      }

      for (let i = 0; i < cleanParts.length - 1; i++) {
        let fromPart = cleanParts[i];
        let toPart = cleanParts[i + 1];
        let label = '';

        // Check for edge label: |Label|
        const labelMatch = toPart.match(/^\|([^|]+)\|\s*(.*)$/);
        if (labelMatch) {
          label = labelMatch[1].trim();
          toPart = labelMatch[2].trim();
        }

        const fromNode = getOrCreateNode(fromPart);
        const toNode = getOrCreateNode(toPart);

        rawConnections.push({
          fromId: fromNode.id,
          toId: toNode.id,
          label,
          type: 'orthogonal'
        });
      }
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Bullet point fallback: sequential flow
      const text = line.replace(/^[-*]\s*/, '').trim();
      getOrCreateNode(text);
    }
  }

  // If no connections were detected (e.g. user just listed bullet points), connect them sequentially
  const nodesList = Array.from(nodesMap.values());
  if (rawConnections.length === 0 && nodesList.length > 1) {
    for (let i = 0; i < nodesList.length - 1; i++) {
      rawConnections.push({
        fromId: nodesList[i].id,
        toId: nodesList[i + 1].id,
        label: '',
        type: 'orthogonal'
      });
    }
  }

  // Hierarchical Topological Layout Calculation
  // 1. Calculate in-degrees
  const inDegree = new Map();
  const childrenMap = new Map();
  nodesList.forEach(n => {
    inDegree.set(n.id, 0);
    childrenMap.set(n.id, []);
  });

  rawConnections.forEach(c => {
    inDegree.set(c.toId, (inDegree.get(c.toId) || 0) + 1);
    if (childrenMap.has(c.fromId)) {
      childrenMap.get(c.fromId).push(c.toId);
    }
  });

  // 2. Assign levels via BFS / Topological Layers
  const levels = new Map();
  const queue = nodesList.filter(n => inDegree.get(n.id) === 0).map(n => n.id);
  
  if (queue.length === 0 && nodesList.length > 0) {
    queue.push(nodesList[0].id);
  }

  queue.forEach(id => levels.set(id, 0));

  const visited = new Set();
  while (queue.length > 0) {
    const currId = queue.shift();
    visited.add(currId);
    const currLevel = levels.get(currId) || 0;
    const children = childrenMap.get(currId) || [];

    children.forEach(childId => {
      const childLevel = levels.get(childId);
      if (childLevel === undefined || childLevel < currLevel + 1) {
        levels.set(childId, currLevel + 1);
      }
      if (!visited.has(childId) && !queue.includes(childId)) {
        queue.push(childId);
      }
    });
  }

  // Catch any disconnected nodes
  nodesList.forEach(n => {
    if (!levels.has(n.id)) {
      levels.set(n.id, 0);
    }
  });

  // Group nodes by level
  const levelGroups = new Map();
  nodesList.forEach(n => {
    const lvl = levels.get(n.id) || 0;
    if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
    levelGroups.get(lvl).push(n);
  });

  const maxLevel = Math.max(...Array.from(levelGroups.keys()), 0);
  const startY = 160;
  const availableHeight = slideHeight - startY - 100;
  const rowSpacing = maxLevel > 0 ? Math.min(140, availableHeight / maxLevel) : 120;

  // Position nodes horizontally per level
  levelGroups.forEach((groupNodes, lvl) => {
    const y = startY + lvl * rowSpacing;
    const totalGroupWidth = groupNodes.reduce((acc, n) => acc + (n.width || 200) + 40, -40);
    let currentX = Math.max(80, (slideWidth - totalGroupWidth) / 2);

    groupNodes.forEach(node => {
      node.x = Math.round(currentX);
      node.y = Math.round(y);
      currentX += (node.width || 200) + 40;
    });
  });

  // Connectors with proper ports
  const finalConnectors = rawConnections.map((conn, idx) => {
    const fromNode = nodesMap.get(nodesList.find(n => n.id === conn.fromId)?.key);
    const toNode = nodesMap.get(nodesList.find(n => n.id === conn.toId)?.key);

    let fromPort = 'bottom';
    let toPort = 'top';

    if (fromNode && toNode) {
      if (toNode.y < fromNode.y) {
        fromPort = 'right';
        toPort = 'right';
      } else if (toNode.x > fromNode.x + 200) {
        fromPort = 'right';
        toPort = 'left';
      } else if (toNode.x < fromNode.x - 200) {
        fromPort = 'left';
        toPort = 'right';
      }
    }

    return {
      id: `conn-${Date.now()}-${idx}`,
      fromId: conn.fromId,
      toId: conn.toId,
      fromPort,
      toPort,
      label: conn.label || '',
      type: 'orthogonal',
      color: currentTheme.connector || '#38BDF8',
      width: 2,
      style: 'solid'
    };
  });

  return {
    nodes: nodesList,
    connectors: finalConnectors
  };
}
