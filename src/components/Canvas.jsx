import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import FlowNode from './FlowNode';
import FlowConnector from './FlowConnector';
import { snapToGrid, getConnectorEndpoints, getClosestPort, generateConnectorPath, computeConnectorLanes } from '../utils/geometry';
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '../types/constants';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, MousePointer, ArrowRight, LayoutTemplate, Sparkles } from 'lucide-react';

export default function Canvas({
  slide,
  theme,
  selectedId,
  selectedType, // 'node' | 'connector' | null
  selectedIds = [],
  onSelectMultiple,
  activeTool = 'select', // 'select' | 'connector'
  setActiveTool,
  isLeftSidebarOpen = true,
  isRightSidebarOpen = true,
  onSelect,
  onUpdateNode,
  onUpdateConnector,
  onDeleteNode,
  onDeleteConnector,
  onDuplicateNode,
  onAddConnector,
  onUpdateSlide,
  onOpenTemplates,
  onAlignMiddle,
  showGrid = true,
  gridSnap = true
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Global spacebar listener for Draw.io-style grab-to-pan
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) {
          return;
        }
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Node Dragging state
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Marquee Selection state: { startX, startY, currentX, currentY }
  const [selectionBox, setSelectionBox] = useState(null);

  // Group Dragging state: { primaryId, startMouseX, startMouseY, initialPositions, hasDragged, wasMulti, shiftKey }
  const [groupDragState, setGroupDragState] = useState(null);

  // Draw.io Smart Alignment Guides: Array of { type: 'horizontal'|'vertical', y, x, x1, x2, y1, y2 }
  const [alignmentGuides, setAlignmentGuides] = useState([]);
  // Live dragging coordinate tooltip: { x, y, text }
  const [dragTooltip, setDragTooltip] = useState(null);

  // Connector drawing state
  // connecting: { fromId, fromPort, startX, startY, mouseX, mouseY }
  const [connecting, setConnecting] = useState(null);
  const [hoveredPort, setHoveredPort] = useState({ nodeId: null, portId: null });

  // Connector Endpoint Dragging state (dragging start or end of an existing arrow)
  // draggingEndpoint: { connId, endpoint: 'start' | 'end', mouseX, mouseY }
  const [draggingEndpoint, setDraggingEndpoint] = useState(null);

  // Hovered connector for interactive path tracing & box illumination
  const [hoveredConnectorId, setHoveredConnectorId] = useState(null);

  // Dynamically calculate collision-free multi-track lanes across slide connectors
  const connectorLanes = useMemo(
    () => computeConnectorLanes(slide.connectors || [], slide.nodes || []),
    [slide.connectors, slide.nodes]
  );

  const hoveredConn = (slide.connectors || []).find((c) => c.id === hoveredConnectorId);
  const hoveredSourceId = hoveredConn?.fromId;
  const hoveredTargetId = hoveredConn?.toId;

  // Node Resizing state: { nodeId, handle, startClientX, startClientY, startX, startY, startWidth, startHeight }
  const [resizingNode, setResizingNode] = useState(null);

  // Slide Header Inline Editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(slide.title || '');
  const [isEditingSubtitle, setIsEditingSubtitle] = useState(false);
  const [subtitleInput, setSubtitleInput] = useState(slide.subtitle || '');

  useEffect(() => {
    setTitleInput(slide.title || '');
    setSubtitleInput(slide.subtitle || '');
  }, [slide.title, slide.subtitle]);

  // Screen to Canvas coordinate conversion
  const screenToCanvas = (clientX, clientY) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / zoom;
    const y = (clientY - rect.top) / zoom;
    return { x, y };
  };

  // Center/Fit slide dynamically to current available canvas container
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;

    // Responsive margins: 36-70px padding for beautiful balanced centering
    const padX = Math.max(36, Math.min(70, clientWidth * 0.05));
    const padY = Math.max(30, Math.min(50, clientHeight * 0.05));

    const availableWidth = clientWidth - padX * 2;
    const availableHeight = clientHeight - padY * 2;

    const targetZoom = Math.min(
      availableWidth / DEFAULT_CANVAS_WIDTH,
      availableHeight / DEFAULT_CANVAS_HEIGHT
    );
    const clamped = Math.max(0.35, Math.min(1.8, Number(targetZoom.toFixed(3))));

    const centeredX = Math.round((clientWidth - DEFAULT_CANVAS_WIDTH * clamped) / 2);
    const centeredY = Math.round((clientHeight - DEFAULT_CANVAS_HEIGHT * clamped) / 2);

    setZoom(clamped);
    setPan({
      x: centeredX,
      y: centeredY
    });
  }, []);

  // Reset to 100% zoom and center slide in viewport
  const resetTo100 = useCallback(() => {
    if (!containerRef.current) {
      setZoom(1);
      return;
    }
    const { clientWidth, clientHeight } = containerRef.current;
    const centeredX = Math.round((clientWidth - DEFAULT_CANVAS_WIDTH) / 2);
    const centeredY = Math.round((clientHeight - DEFAULT_CANVAS_HEIGHT) / 2);
    setZoom(1);
    setPan({ x: centeredX, y: centeredY });
  }, []);

  // Zoom In / Zoom Out by step centered at viewport center
  const handleZoomStep = useCallback((delta) => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const cx = clientWidth / 2;
    const cy = clientHeight / 2;

    setZoom((prevZoom) => {
      const newZoom = Math.max(0.3, Math.min(2.5, Number((prevZoom + delta).toFixed(2))));
      if (newZoom === prevZoom) return prevZoom;
      const ratio = newZoom / prevZoom;
      setPan((prevPan) => ({
        x: Math.round(cx - (cx - prevPan.x) * ratio),
        y: Math.round(cy - (cy - prevPan.y) * ratio)
      }));
      return newZoom;
    });
  }, []);

  const isFirstRender = useRef(true);
  const prevLeftOpen = useRef(isLeftSidebarOpen);
  const prevRightOpen = useRef(isRightSidebarOpen);

  // Auto-adapt canvas size and center dynamically when sidebars are opened or closed
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fitToScreen();
      return;
    }

    const leftChanged = prevLeftOpen.current !== isLeftSidebarOpen;
    const rightChanged = prevRightOpen.current !== isRightSidebarOpen;
    prevLeftOpen.current = isLeftSidebarOpen;
    prevRightOpen.current = isRightSidebarOpen;

    if (!leftChanged && !rightChanged) return;

    if (!containerRef.current) return;
    const currentW = containerRef.current.clientWidth;
    const currentH = containerRef.current.clientHeight;

    // Project anticipated canvas width based on sidebar toggle deltas (left: 260px, right: 300px)
    let deltaW = 0;
    if (leftChanged) {
      deltaW += isLeftSidebarOpen ? -260 : 260;
    }
    if (rightChanged) {
      deltaW += isRightSidebarOpen ? -300 : 300;
    }

    const projectedW = Math.max(300, currentW + deltaW);
    const padX = Math.max(36, Math.min(70, projectedW * 0.05));
    const padY = Math.max(30, Math.min(50, currentH * 0.05));

    const targetZoom = Math.min(
      (projectedW - padX * 2) / DEFAULT_CANVAS_WIDTH,
      (currentH - padY * 2) / DEFAULT_CANVAS_HEIGHT
    );
    const clamped = Math.max(0.35, Math.min(1.8, Number(targetZoom.toFixed(3))));

    const centeredX = Math.round((projectedW - DEFAULT_CANVAS_WIDTH * clamped) / 2);
    const centeredY = Math.round((currentH - DEFAULT_CANVAS_HEIGHT * clamped) / 2);

    setZoom(clamped);
    setPan({
      x: centeredX,
      y: centeredY
    });

    // Final subpixel alignment check after CSS animation completes
    const timer = setTimeout(() => {
      fitToScreen();
    }, 280);

    return () => clearTimeout(timer);
  }, [isLeftSidebarOpen, isRightSidebarOpen, fitToScreen]);

  // Handle container and window resize dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    let resizeTimer = null;

    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        fitToScreen();
      }, 80);
    });

    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      clearTimeout(resizeTimer);
    };
  }, [fitToScreen]);

  // Mouse wheel zoom & pan (Draw.io style zoom-to-cursor)
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.08 : 0.92;

      setZoom((prevZoom) => {
        const newZoom = Math.max(0.3, Math.min(2.5, Number((prevZoom * factor).toFixed(3))));
        if (newZoom === prevZoom) return prevZoom;
        const ratio = newZoom / prevZoom;
        setPan((prevPan) => ({
          x: Math.round(mouseX - (mouseX - prevPan.x) * ratio),
          y: Math.round(mouseY - (mouseY - prevPan.y) * ratio)
        }));
        return newZoom;
      });
    } else if (e.shiftKey) {
      // Shift + Wheel = Horizontal Scroll
      setPan((p) => ({
        ...p,
        x: p.x - e.deltaY * 0.85
      }));
    } else {
      // 2D Pan on trackpad or vertical scroll
      setPan((p) => ({
        x: p.x - e.deltaX * 0.85,
        y: p.y - e.deltaY * 0.85
      }));
    }
  }, []);

  // Attach non-passive wheel event listener so e.preventDefault() works
  // and completely stops browser window zoom during Ctrl+Wheel / pinch gestures
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Canvas Mouse Down: Start Pan, or Start Freeform Arrow if Arrow Tool active, or Start Marquee Box Selection
  const handleCanvasMouseDown = (e) => {
    // If middle click or space key held, start panning
    if (e.button === 1 || isSpacePressed) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      if (onSelectMultiple) onSelectMultiple([], null);
      else onSelect(null, null);
      return;
    }

    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    // If Arrow Tool is active, start drawing an arrow from this exact point!
    if (activeTool === 'connector') {
      const snappedX = gridSnap ? snapToGrid(x, 20) : x;
      const snappedY = gridSnap ? snapToGrid(y, 20) : y;
      setConnecting({
        fromId: null,
        fromPort: null,
        startX: snappedX,
        startY: snappedY,
        mouseX: snappedX,
        mouseY: snappedY
      });
      return;
    }

    // Start Marquee Box Selection when clicking empty canvas surface
    const isBackground = e.target.classList.contains('canvas-background-rect') ||
                         e.target.classList.contains('slide-canvas-svg') ||
                         e.target.classList.contains('canvas-viewport');

    if (isBackground) {
      if (!e.shiftKey) {
        if (onSelectMultiple) onSelectMultiple([], null);
        else onSelect(null, null);
      }
      setSelectionBox({
        startX: x,
        startY: y,
        currentX: x,
        currentY: y
      });
    }
  };

  // Node Drag Start (Single or Multi-select Group Drag)
  const handleNodeMouseDown = (nodeId, e) => {
    e.stopPropagation();

    // If Arrow Tool is active, start drawing an arrow from this node!
    if (activeTool === 'connector') {
      const node = slide.nodes.find((n) => n.id === nodeId);
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const closest = node ? getClosestPort(node, { x, y }) : { port: 'right' };
      handleStartConnect(nodeId, closest.port, e);
      return;
    }

    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    const currentSelectedIds = selectedIds && selectedIds.length > 0
      ? selectedIds
      : (selectedId ? [selectedId] : []);

    let updatedSelectedIds;

    if (e.shiftKey) {
      if (currentSelectedIds.includes(nodeId)) {
        updatedSelectedIds = currentSelectedIds.filter((id) => id !== nodeId);
      } else {
        updatedSelectedIds = [...currentSelectedIds, nodeId];
      }
    } else {
      // If the clicked node is already part of a multi-selection, keep the group intact for group dragging!
      if (currentSelectedIds.includes(nodeId) && currentSelectedIds.length > 1) {
        updatedSelectedIds = currentSelectedIds;
      } else {
        updatedSelectedIds = [nodeId];
      }
    }

    if (onSelectMultiple) {
      onSelectMultiple(updatedSelectedIds, updatedSelectedIds.length > 0 ? 'node' : null);
    } else {
      onSelect(nodeId, 'node');
    }

    // Set up group dragging for ALL nodes in the active selection
    const activeNodes = (slide.nodes || []).filter((n) => updatedSelectedIds.includes(n.id));
    const initPositions = {};
    activeNodes.forEach((n) => {
      initPositions[n.id] = { x: n.x, y: n.y, width: n.width, height: n.height };
    });

    setGroupDragState({
      primaryId: nodeId,
      startMouseX: x,
      startMouseY: y,
      initialPositions: initPositions,
      hasDragged: false,
      shiftKey: e.shiftKey,
      wasMulti: currentSelectedIds.includes(nodeId) && currentSelectedIds.length > 1
    });
  };

  // Start Drawing Connector from port or quick-arrow button
  const handleStartConnect = (fromId, fromPort, e) => {
    e.stopPropagation();
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const node = slide.nodes.find((n) => n.id === fromId);
    
    setConnecting({
      fromId,
      fromPort,
      startX: node ? node.x + node.width / 2 : x,
      startY: node ? node.y + node.height / 2 : y,
      mouseX: x,
      mouseY: y
    });
  };

  // Start dragging an existing connector's endpoint ('start' | 'end')
  const handleStartDragEndpoint = (connId, endpoint, e) => {
    e.stopPropagation();
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    setDraggingEndpoint({
      connId,
      endpoint,
      mouseX: x,
      mouseY: y
    });
  };

  // Node Resize Start
  const handleStartResize = (nodeId, handle, e) => {
    e.stopPropagation();
    const node = (slide.nodes || []).find((n) => n.id === nodeId);
    if (!node) return;
    setResizingNode({
      nodeId,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: node.x,
      startY: node.y,
      startWidth: node.width || 180,
      startHeight: node.height || 80
    });
  };

  // Mathematical magnetic node and port finder
  const findTargetNodeAndPort = (point, excludeId = null) => {
    const nodes = slide.nodes || [];
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (node.id === excludeId) continue;

      const pad = 40; // generous 40px magnetic snap distance
      if (
        point.x >= node.x - pad &&
        point.x <= node.x + node.width + pad &&
        point.y >= node.y - pad &&
        point.y <= node.y + node.height + pad
      ) {
        const { port } = getClosestPort(node, point);
        return { nodeId: node.id, portId: port };
      }
    }
    return { nodeId: null, portId: null };
  };

  // Mouse Move
  const handleMouseMove = (e) => {
    // 1. Panning
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    // 2. Marquee Selection Box
    if (selectionBox) {
      const newBox = { ...selectionBox, currentX: x, currentY: y };
      setSelectionBox(newBox);

      const bx = Math.min(newBox.startX, x);
      const by = Math.min(newBox.startY, y);
      const bw = Math.abs(x - newBox.startX);
      const bh = Math.abs(y - newBox.startY);

      if (bw > 6 || bh > 6) {
        const intersecting = (slide.nodes || [])
          .filter((n) => {
            return (
              n.x + n.width >= bx &&
              n.x <= bx + bw &&
              n.y + n.height >= by &&
              n.y <= by + bh
            );
          })
          .map((n) => n.id);

        if (onSelectMultiple) {
          onSelectMultiple(intersecting, intersecting.length > 0 ? 'node' : null);
        }
      }
      return;
    }

    // 3. Resizing Node with on-canvas handles
    if (resizingNode) {
      const dx = (e.clientX - resizingNode.startClientX) / zoom;
      const dy = (e.clientY - resizingNode.startClientY) / zoom;

      let newX = resizingNode.startX;
      let newY = resizingNode.startY;
      let newW = resizingNode.startWidth;
      let newH = resizingNode.startHeight;

      if (resizingNode.handle.includes('e')) {
        newW = Math.max(80, resizingNode.startWidth + dx);
      }
      if (resizingNode.handle.includes('s')) {
        newH = Math.max(40, resizingNode.startHeight + dy);
      }
      if (resizingNode.handle.includes('w')) {
        const rawW = resizingNode.startWidth - dx;
        if (rawW >= 80) {
          newW = rawW;
          newX = resizingNode.startX + dx;
        }
      }
      if (resizingNode.handle.includes('n')) {
        const rawH = resizingNode.startHeight - dy;
        if (rawH >= 40) {
          newH = rawH;
          newY = resizingNode.startY + dy;
        }
      }

      if (gridSnap) {
        newX = snapToGrid(newX, 20);
        newY = snapToGrid(newY, 20);
        newW = snapToGrid(newW, 20);
        newH = snapToGrid(newH, 20);
      }

      onUpdateNode(resizingNode.nodeId, {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH)
      });
      return;
    }

    // 4. Group Dragging (Move all selected flowchart shapes together with Draw.io Smart Alignment)
    if (groupDragState) {
      groupDragState.hasDragged = true;
      const primaryInit = groupDragState.initialPositions[groupDragState.primaryId];
      const rawDx = x - groupDragState.startMouseX;
      const rawDy = y - groupDragState.startMouseY;

      let targetX = primaryInit.x + rawDx;
      let targetY = primaryInit.y + rawDy;
      const w = primaryInit.width || 180;
      const h = primaryInit.height || 80;

      const otherNodes = (slide.nodes || []).filter(
        (n) => !groupDragState.initialPositions[n.id]
      );

      const guides = [];
      let snappedY = null;
      let snappedX = null;
      const SNAP_TOLERANCE = 8; // Magnetic snap within 8px

      const cy = targetY + h / 2;
      const cx = targetX + w / 2;

      for (const other of otherNodes) {
        const otherW = other.width || 180;
        const otherH = other.height || 80;
        const otherCy = other.y + otherH / 2;
        const otherCx = other.x + otherW / 2;

        // 1. Center-to-Center Horizontal Alignment (Draw.io Cyan line in Image 1!)
        if (snappedY === null && Math.abs(cy - otherCy) <= SNAP_TOLERANCE) {
          snappedY = Math.round(otherCy - h / 2);
          guides.push({
            type: 'horizontal',
            y: otherCy,
            x1: Math.min(targetX, other.x) - 40,
            x2: Math.max(targetX + w, other.x + otherW) + 40
          });
        }

        // 2. Top-Edge to Top-Edge Alignment
        if (snappedY === null && Math.abs(targetY - other.y) <= SNAP_TOLERANCE - 2) {
          snappedY = other.y;
          guides.push({
            type: 'horizontal',
            y: other.y,
            x1: Math.min(targetX, other.x) - 40,
            x2: Math.max(targetX + w, other.x + otherW) + 40
          });
        }

        // 3. Bottom-Edge to Bottom-Edge Alignment
        if (snappedY === null && Math.abs((targetY + h) - (other.y + otherH)) <= SNAP_TOLERANCE - 2) {
          snappedY = other.y + otherH - h;
          guides.push({
            type: 'horizontal',
            y: other.y + otherH,
            x1: Math.min(targetX, other.x) - 40,
            x2: Math.max(targetX + w, other.x + otherW) + 40
          });
        }

        // 4. Center-to-Center Vertical Alignment
        if (snappedX === null && Math.abs(cx - otherCx) <= SNAP_TOLERANCE) {
          snappedX = Math.round(otherCx - w / 2);
          guides.push({
            type: 'vertical',
            x: otherCx,
            y1: Math.min(targetY, other.y) - 40,
            y2: Math.max(targetY + h, other.y + otherH) + 40
          });
        }

        // 5. Left-Edge to Left-Edge Alignment
        if (snappedX === null && Math.abs(targetX - other.x) <= SNAP_TOLERANCE - 2) {
          snappedX = other.x;
          guides.push({
            type: 'vertical',
            x: other.x,
            y1: Math.min(targetY, other.y) - 40,
            y2: Math.max(targetY + h, other.y + otherH) + 40
          });
        }

        // 6. Right-Edge to Right-Edge Alignment
        if (snappedX === null && Math.abs((targetX + w) - (other.x + otherW)) <= SNAP_TOLERANCE - 2) {
          snappedX = other.x + otherW - w;
          guides.push({
            type: 'vertical',
            x: other.x,
            y1: Math.min(targetY, other.y) - 40,
            y2: Math.max(targetY + h, other.y + otherH) + 40
          });
        }
      }

      // If not snapped by smart guides, use absolute 20px grid snap
      if (snappedX === null && gridSnap) {
        snappedX = snapToGrid(targetX, 20);
      }
      if (snappedY === null && gridSnap) {
        snappedY = snapToGrid(targetY, 20);
      }

      const effectiveX = snappedX !== null ? snappedX : targetX;
      const effectiveY = snappedY !== null ? snappedY : targetY;

      const dx = effectiveX - primaryInit.x;
      const dy = effectiveY - primaryInit.y;

      setAlignmentGuides(guides);
      setDragTooltip({
        x: effectiveX + w / 2,
        y: effectiveY + h + 24,
        text: `${Math.round(effectiveX)}, ${Math.round(effectiveY)}`
      });

      // Constrain within slide boundaries
      const nodeIds = Object.keys(groupDragState.initialPositions);
      let minAllowedDx = -Infinity;
      let maxAllowedDx = Infinity;
      let minAllowedDy = -Infinity;
      let maxAllowedDy = Infinity;

      nodeIds.forEach((id) => {
        const init = groupDragState.initialPositions[id];
        if (init) {
          const minDx = 20 - init.x;
          const maxDx = (DEFAULT_CANVAS_WIDTH - init.width - 20) - init.x;
          const minDy = 140 - init.y;
          const maxDy = (DEFAULT_CANVAS_HEIGHT - init.height - 20) - init.y;

          if (minDx > minAllowedDx) minAllowedDx = minDx;
          if (maxDx < maxAllowedDx) maxAllowedDx = maxDx;
          if (minDy > minAllowedDy) minAllowedDy = minDy;
          if (maxDy < maxAllowedDy) maxAllowedDy = maxDy;
        }
      });

      const clampedDx = Math.max(minAllowedDx, Math.min(maxAllowedDx, dx));
      const clampedDy = Math.max(minAllowedDy, Math.min(maxAllowedDy, dy));

      const updatedNodes = (slide.nodes || []).map((n) => {
        const init = groupDragState.initialPositions[n.id];
        if (!init) return n;
        return {
          ...n,
          x: Math.round(init.x + clampedDx),
          y: Math.round(init.y + clampedDy)
        };
      });

      onUpdateSlide && onUpdateSlide({ nodes: updatedNodes });
      return;
    }

    // 5. Dragging single node (fallback)
    if (draggingNode) {
      let newX = x - dragOffset.x;
      let newY = y - dragOffset.y;

      if (gridSnap) {
        newX = snapToGrid(newX, 20);
        newY = snapToGrid(newY, 20);
      }

      onUpdateNode(draggingNode, {
        x: Math.max(0, Math.min(DEFAULT_CANVAS_WIDTH - 150, newX)),
        y: Math.max(148, Math.min(DEFAULT_CANVAS_HEIGHT - 80, newY))
      });
      return;
    }

    // Drawing new Connector
    if (connecting) {
      const target = findTargetNodeAndPort({ x, y }, connecting.fromId);
      setHoveredPort(target);
      setConnecting((prev) => ({ ...prev, mouseX: x, mouseY: y }));
      return;
    }

    // Dragging existing Connector Endpoint
    if (draggingEndpoint) {
      const target = findTargetNodeAndPort({ x, y });
      setHoveredPort(target);
      setDraggingEndpoint((prev) => ({ ...prev, mouseX: x, mouseY: y }));
    }
  };

  // Mouse Up: Complete Arrow Connection, Endpoint Drag, or Selection Box
  const handleMouseUp = (e) => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (selectionBox) {
      setSelectionBox(null);
    }

    if (groupDragState) {
      if (!groupDragState.hasDragged && groupDragState.wasMulti && !groupDragState.shiftKey) {
        if (onSelectMultiple) {
          onSelectMultiple([groupDragState.primaryId], 'node');
        }
      }
      setGroupDragState(null);
    }
    setAlignmentGuides([]);
    setDragTooltip(null);

    if (draggingNode) {
      setDraggingNode(null);
    }

    if (resizingNode) {
      setResizingNode(null);
    }

    // Complete drawing new connector
    if (connecting) {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const snappedX = gridSnap ? snapToGrid(x, 20) : x;
      const snappedY = gridSnap ? snapToGrid(y, 20) : y;
      const target = findTargetNodeAndPort({ x, y }, connecting.fromId);

      const newConnector = {
        label: '',
        type: 'orthogonal',
        color: theme.connector || '#38BDF8',
        width: 2,
        style: 'solid'
      };

      // 1. If started from a node
      if (connecting.fromId) {
        newConnector.fromId = connecting.fromId;
        newConnector.fromPort = connecting.fromPort || 'right';

        // Check if dropped on another node
        if (target.nodeId) {
          newConnector.toId = target.nodeId;
          newConnector.toPort = target.portId || 'left';
        } else {
          // CONNECT ANYWHERE: Released in empty space -> sets free end coordinates!
          newConnector.toId = null;
          newConnector.endX = snappedX;
          newConnector.endY = snappedY;
        }
      } else {
        // 2. Started from free space (Arrow tool)
        newConnector.startX = connecting.startX;
        newConnector.startY = connecting.startY;

        if (target.nodeId) {
          newConnector.toId = target.nodeId;
          newConnector.toPort = target.portId || 'left';
        } else {
          // Free start to free end!
          newConnector.endX = snappedX;
          newConnector.endY = snappedY;
        }
      }

      onAddConnector(newConnector);
      setConnecting(null);
      setHoveredPort({ nodeId: null, portId: null });

      // Reset back to select tool after drawing an arrow
      if (activeTool === 'connector' && setActiveTool) {
        setActiveTool('select');
      }
    }

    // Complete dragging connector endpoint
    if (draggingEndpoint) {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const snappedX = gridSnap ? snapToGrid(x, 20) : x;
      const snappedY = gridSnap ? snapToGrid(y, 20) : y;
      const { connId, endpoint } = draggingEndpoint;
      const target = findTargetNodeAndPort({ x, y });

      if (endpoint === 'start') {
        if (target.nodeId) {
          onUpdateConnector(connId, {
            fromId: target.nodeId,
            fromPort: target.portId || 'right',
            startX: null,
            startY: null
          });
        } else {
          onUpdateConnector(connId, {
            fromId: null,
            fromPort: null,
            startX: snappedX,
            startY: snappedY
          });
        }
      } else {
        // endpoint === 'end'
        if (target.nodeId) {
          onUpdateConnector(connId, {
            toId: target.nodeId,
            toPort: target.portId || 'left',
            endX: null,
            endY: null
          });
        } else {
          onUpdateConnector(connId, {
            toId: null,
            toPort: null,
            endX: snappedX,
            endY: snappedY
          });
        }
      }

      setDraggingEndpoint(null);
      setHoveredPort({ nodeId: null, portId: null });
    }
  };

  // Collect unique colors for marker arrowheads
  const connectorColors = Array.from(
    new Set([
      theme.connector || '#38BDF8',
      '#EF4444',
      '#10B981',
      '#F59E0B',
      '#8B5CF6',
      ...(slide.connectors || []).map((c) => c.color || '#38BDF8')
    ])
  );

  return (
    <div
      ref={containerRef}
      className={`canvas-viewport ${isSpacePressed ? 'is-space-pressed' : ''} ${isPanning ? 'is-panning' : ''} ${activeTool === 'connector' ? 'tool-connector-active' : ''} ${(connecting || draggingEndpoint) ? 'is-connecting' : ''}`}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Multi-Selection Info Badge with Align Action */}
      {(selectedIds || []).length > 1 && (
        <div className="canvas-multiselect-badge">
          <span>{(selectedIds || []).length} shapes selected</span>
          <div className="canvas-multiselect-divider" />
          <button
            type="button"
            className="canvas-multiselect-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAlignMiddle && onAlignMiddle();
            }}
            title="Align all selected shapes to exact same horizontal line (Alt + A)"
          >
            <span>✨ Align Middle Straight</span>
          </button>
        </div>
      )}

      {/* Tool Selection Bar (Top Left of Canvas) */}
      <div className={`canvas-tool-selector-overlay ${!isLeftSidebarOpen ? 'shifted-for-sidebar' : ''}`}>
        <button
          className={`canvas-tool-mode-btn ${activeTool === 'select' ? 'active' : ''}`}
          onClick={() => setActiveTool && setActiveTool('select')}
          title="Select / Move Tool (V)"
        >
          <MousePointer size={15} />
          <span>Select</span>
        </button>
        <button
          className={`canvas-tool-mode-btn ${activeTool === 'connector' ? 'active' : ''}`}
          onClick={() => setActiveTool && setActiveTool('connector')}
          title="Draw Arrow Tool (C) — Click & Drag anywhere to create an arrow!"
        >
          <ArrowRight size={15} />
          <span>Draw Arrow</span>
        </button>
      </div>

      {/* Zoom / Pan Floating Control Bar (Draw.io style) */}
      <div className="canvas-controls-overlay">
        <button
          className="canvas-ctrl-btn"
          onClick={() => handleZoomStep(-0.1)}
          title="Zoom Out (Ctrl - Scroll)"
        >
          <ZoomOut size={15} />
        </button>
        <button
          className="canvas-zoom-label-btn"
          onClick={resetTo100}
          title="Click to Reset 100% (Draw.io)"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          className="canvas-ctrl-btn"
          onClick={() => handleZoomStep(0.1)}
          title="Zoom In (Ctrl + Scroll)"
        >
          <ZoomIn size={15} />
        </button>
        <div className="canvas-ctrl-divider" />
        <button
          className="canvas-ctrl-btn"
          onClick={fitToScreen}
          title="Fit Slide to Screen"
        >
          <Maximize2 size={15} />
        </button>
        <button
          className="canvas-ctrl-btn"
          onClick={resetTo100}
          title="Reset View 100% (Centered)"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* The 16:9 Presentation Stage */}
      <div
        className={`canvas-transform-wrapper ${(isPanning || draggingNode || connecting || draggingEndpoint || resizingNode || groupDragState || selectionBox) ? 'is-dragging' : 'smooth-adapt'}`}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        <svg
          ref={svgRef}
          width={DEFAULT_CANVAS_WIDTH}
          height={DEFAULT_CANVAS_HEIGHT}
          className="slide-canvas-svg"
          style={{
            backgroundColor: theme.bg || '#0F172A',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Arrowhead Markers for Connectors */}
          <defs>
            {connectorColors.map((col) => {
              const cleanId = col.replace('#', '');
              return (
                <marker
                  key={cleanId}
                  id={`arrow-${cleanId}`}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill={col} />
                </marker>
              );
            })}

            {/* Subtle Grid Pattern */}
            {showGrid && (
              <pattern
                id="canvas-grid-pattern"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="2" r="1.2" fill={theme.gridColor || 'rgba(255, 255, 255, 0.08)'} />
              </pattern>
            )}
          </defs>

          {/* Background Grid Layer */}
          {showGrid && (
            <rect
              width={DEFAULT_CANVAS_WIDTH}
              height={DEFAULT_CANVAS_HEIGHT}
              fill="url(#canvas-grid-pattern)"
              className="canvas-background-rect"
            />
          )}

          {/* Clickable Background surface */}
          <rect
            width={DEFAULT_CANVAS_WIDTH}
            height={DEFAULT_CANVAS_HEIGHT}
            fill="transparent"
            className="canvas-background-rect"
            onClick={() => onSelect(null, null)}
          />

          {/* 16:9 Presentation Slide Header Section */}
          <g className="slide-header-group">
            {/* Slide Category / Subtitle */}
            {isEditingSubtitle ? (
              <foreignObject x={60} y={40} width={DEFAULT_CANVAS_WIDTH - 120} height={32}>
                <input
                  type="text"
                  className="slide-header-subtitle-input"
                  value={subtitleInput}
                  onChange={(e) => setSubtitleInput(e.target.value)}
                  onBlur={() => {
                    setIsEditingSubtitle(false);
                    onUpdateSlide({ subtitle: subtitleInput });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingSubtitle(false);
                      onUpdateSlide({ subtitle: subtitleInput });
                    }
                  }}
                  autoFocus
                />
              </foreignObject>
            ) : (
              <text
                x={60}
                y={60}
                className="slide-header-subtitle"
                fill={theme.subtitleColor || '#94A3B8'}
                onClick={() => setIsEditingSubtitle(true)}
                title="Click to edit subtitle"
              >
                {slide.subtitle || 'Click to add slide category or subtitle'}
              </text>
            )}

            {/* Slide Title */}
            {isEditingTitle ? (
              <foreignObject x={60} y={68} width={DEFAULT_CANVAS_WIDTH - 120} height={50}>
                <input
                  type="text"
                  className="slide-header-title-input"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={() => {
                    setIsEditingTitle(false);
                    onUpdateSlide({ title: titleInput });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingTitle(false);
                      onUpdateSlide({ title: titleInput });
                    }
                  }}
                  autoFocus
                />
              </foreignObject>
            ) : (
              <text
                x={60}
                y={105}
                className="slide-header-title"
                fill={theme.titleColor || '#F8FAFC'}
                onClick={() => setIsEditingTitle(true)}
                title="Click to edit slide title"
              >
                {slide.title || 'Untitled Slide'}
              </text>
            )}

            {/* Slide 16:9 Aspect ratio marker watermark */}
            <text
              x={DEFAULT_CANVAS_WIDTH - 60}
              y={70}
              textAnchor="end"
              className="slide-aspect-watermark"
              fill={theme.subtitleColor || '#64748B'}
              opacity={0.5}
            >
              16:9 WIDESCREEN SLIDE
            </text>
            <line
              x1={60}
              y1={125}
              x2={DEFAULT_CANVAS_WIDTH - 60}
              y2={125}
              stroke={theme.gridColor || 'rgba(255, 255, 255, 0.1)'}
              strokeWidth={1}
            />
          </g>

          {/* Connectors Layer (Below Nodes) */}
          <g className="canvas-connectors-layer">
            {(slide.connectors || []).map((connector) => {
              const fromNode = (slide.nodes || []).find((n) => n.id === connector.fromId);
              const toNode = (slide.nodes || []).find((n) => n.id === connector.toId);

              // If dragging this connector's endpoint live
              let renderedConn = connector;
              if (draggingEndpoint && draggingEndpoint.connId === connector.id) {
                if (draggingEndpoint.endpoint === 'start') {
                  renderedConn = {
                    ...connector,
                    fromId: hoveredPort.nodeId || null,
                    fromPort: hoveredPort.portId || connector.fromPort,
                    startX: hoveredPort.nodeId ? null : draggingEndpoint.mouseX,
                    startY: hoveredPort.nodeId ? null : draggingEndpoint.mouseY
                  };
                } else {
                  renderedConn = {
                    ...connector,
                    toId: hoveredPort.nodeId || null,
                    toPort: hoveredPort.portId || connector.toPort,
                    endX: hoveredPort.nodeId ? null : draggingEndpoint.mouseX,
                    endY: hoveredPort.nodeId ? null : draggingEndpoint.mouseY
                  };
                }
              }

              const laneOptions = connectorLanes.get(connector.id) || {};

              return (
                <FlowConnector
                  key={connector.id}
                  connector={renderedConn}
                  fromNode={fromNode}
                  toNode={toNode}
                  options={laneOptions}
                  isSelected={selectedId === connector.id && selectedType === 'connector'}
                  isHovered={hoveredConnectorId === connector.id}
                  isDimmed={Boolean(hoveredConnectorId && hoveredConnectorId !== connector.id && selectedId !== connector.id)}
                  onSelect={(id) => onSelect(id, 'connector')}
                  onHover={setHoveredConnectorId}
                  onUpdate={onUpdateConnector}
                  onDelete={onDeleteConnector}
                  onStartDragEndpoint={handleStartDragEndpoint}
                />
              );
            })}

            {/* Live Active Connector Drawing Line */}
            {connecting && (
              <g className="live-connector-line">
                {(() => {
                  let sx = connecting.startX;
                  let sy = connecting.startY;

                  if (connecting.fromId) {
                    const fromNode = (slide.nodes || []).find((n) => n.id === connecting.fromId);
                    if (fromNode) {
                      const endpoints = getConnectorEndpoints(
                        { fromPort: connecting.fromPort || 'right' },
                        fromNode,
                        null
                      );
                      sx = endpoints.start.x;
                      sy = endpoints.start.y;
                    }
                  }

                  let ex = connecting.mouseX;
                  let ey = connecting.mouseY;

                  // If hovering over a target node or port, snap to it!
                  if (hoveredPort.nodeId) {
                    const toNode = (slide.nodes || []).find((n) => n.id === hoveredPort.nodeId);
                    if (toNode) {
                      const endpoints = getConnectorEndpoints(
                        { toPort: hoveredPort.portId || 'left' },
                        null,
                        toNode
                      );
                      ex = endpoints.end.x;
                      ey = endpoints.end.y;
                    }
                  }

                  const liveFromPort = connecting.fromPort || 'right';
                  const liveToPort = hoveredPort.portId || (ey < sy ? 'top' : (ey > sy + 30 ? 'bottom' : 'left'));
                  const livePath = generateConnectorPath({ x: sx, y: sy }, { x: ex, y: ey }, 'orthogonal', liveFromPort, liveToPort);

                  return (
                    <path
                      d={livePath}
                      fill="none"
                      stroke={theme.connector || '#38BDF8'}
                      strokeWidth={2.5}
                      strokeDasharray="6,4"
                      markerEnd={`url(#arrow-${(theme.connector || '#38BDF8').replace('#', '')})`}
                    />
                  );
                })()}
              </g>
            )}
          </g>

          {/* Marquee Selection Rectangle */}
          {selectionBox && (
            <rect
              x={Math.min(selectionBox.startX, selectionBox.currentX)}
              y={Math.min(selectionBox.startY, selectionBox.currentY)}
              width={Math.abs(selectionBox.currentX - selectionBox.startX)}
              height={Math.abs(selectionBox.currentY - selectionBox.startY)}
              fill="rgba(56, 189, 248, 0.12)"
              stroke="var(--brand-primary, #38BDF8)"
              strokeWidth={1.5}
              strokeDasharray="4,4"
              rx={3}
              pointerEvents="none"
            />
          )}

          {/* Draw.io Style Smart Centering & Alignment Guide Lines */}
          {alignmentGuides.map((g, idx) => (
            <g key={`align-guide-${idx}`} className="canvas-alignment-guide" pointerEvents="none">
              {g.type === 'horizontal' ? (
                <>
                  {/* Subtle wide glow */}
                  <line
                    x1={g.x1}
                    y1={g.y}
                    x2={g.x2}
                    y2={g.y}
                    stroke="rgba(0, 168, 255, 0.35)"
                    strokeWidth={4}
                  />
                  {/* Crisp Draw.io cyan laser line */}
                  <line
                    x1={g.x1}
                    y1={g.y}
                    x2={g.x2}
                    y2={g.y}
                    stroke="#00A8FF"
                    strokeWidth={1.5}
                  />
                  {/* End tick marks */}
                  <line x1={g.x1} y1={g.y - 4} x2={g.x1} y2={g.y + 4} stroke="#00A8FF" strokeWidth={1.5} />
                  <line x1={g.x2} y1={g.y - 4} x2={g.x2} y2={g.y + 4} stroke="#00A8FF" strokeWidth={1.5} />
                </>
              ) : (
                <>
                  {/* Subtle wide glow */}
                  <line
                    x1={g.x}
                    y1={g.y1}
                    x2={g.x}
                    y2={g.y2}
                    stroke="rgba(0, 168, 255, 0.35)"
                    strokeWidth={4}
                  />
                  {/* Crisp Draw.io cyan laser line */}
                  <line
                    x1={g.x}
                    y1={g.y1}
                    x2={g.x}
                    y2={g.y2}
                    stroke="#00A8FF"
                    strokeWidth={1.5}
                  />
                  {/* End tick marks */}
                  <line x1={g.x - 4} y1={g.y1} x2={g.x + 4} y2={g.y1} stroke="#00A8FF" strokeWidth={1.5} />
                  <line x1={g.x - 4} y1={g.y2} x2={g.x + 4} y2={g.y2} stroke="#00A8FF" strokeWidth={1.5} />
                </>
              )}
            </g>
          ))}

          {/* Live Drag Coordinate Tooltip (Image 1 style) */}
          {dragTooltip && (
            <g
              className="canvas-drag-coord-tooltip"
              transform={`translate(${dragTooltip.x}, ${dragTooltip.y})`}
              pointerEvents="none"
            >
              <rect
                x={-36}
                y={-12}
                width={72}
                height={22}
                rx={4}
                fill="#FFFFFF"
                stroke="#D1D5DB"
                strokeWidth={1}
                filter="drop-shadow(0 2px 5px rgba(0,0,0,0.25))"
              />
              <text
                x={0}
                y={3}
                textAnchor="middle"
                fill="#1F2937"
                fontSize={11}
                fontFamily="var(--font-mono, monospace)"
                fontWeight="600"
              >
                {dragTooltip.text}
              </text>
            </g>
          )}

          {/* Nodes Layer */}
          <g className="canvas-nodes-layer">
            {(slide.nodes || []).map((node) => {
              const currentIds = selectedIds && selectedIds.length > 0
                ? selectedIds
                : (selectedId ? [selectedId] : []);
              const isSelected = currentIds.includes(node.id) && selectedType === 'node';
              const isMulti = currentIds.length > 1;

              return (
                <g
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                >
                  <FlowNode
                    node={node}
                    isSelected={isSelected}
                    isTargeted={hoveredPort.nodeId === node.id}
                    targetPort={hoveredPort.nodeId === node.id ? hoveredPort.portId : null}
                    isHoveredAsSource={hoveredSourceId === node.id}
                    isHoveredAsTarget={hoveredTargetId === node.id}
                    isDimmed={Boolean(hoveredConnectorId && hoveredSourceId !== node.id && hoveredTargetId !== node.id)}
                    onSelect={(id) => onSelect(id, 'node')}
                    onUpdate={onUpdateNode}
                    onDelete={onDeleteNode}
                    onDuplicate={onDuplicateNode}
                    onStartConnect={handleStartConnect}
                    onConnectPortHover={(nodeId, portId) =>
                      setHoveredPort({ nodeId, portId })
                    }
                    zoom={zoom}
                    gridSnap={gridSnap}
                    onStartResize={isMulti ? null : handleStartResize}
                  />
                </g>
              );
            })}
          </g>

          {/* Empty Slide Guide Overlay */}
          {(!slide.nodes || slide.nodes.length === 0) && (
            <foreignObject
              x={DEFAULT_CANVAS_WIDTH / 2 - 270}
              y={DEFAULT_CANVAS_HEIGHT / 2 - 130}
              width={540}
              height={260}
              className="canvas-empty-state-fo"
            >
              <div className="canvas-empty-state-card" xmlns="http://www.w3.org/1999/xhtml">
                <div className="empty-state-icon-badge">
                  <LayoutTemplate size={26} />
                </div>
                <h3 className="empty-state-title">Clean Presentation Slide</h3>
                <p className="empty-state-desc">
                  Drag &amp; drop shapes from the left panel to design your workflow, or select an expertly crafted pre-applied template.
                </p>
                <div className="empty-state-actions">
                  <button
                    type="button"
                    className="empty-state-btn primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTemplates && onOpenTemplates();
                    }}
                  >
                    <Sparkles size={16} />
                    <span>Browse Pre-Applied Templates</span>
                  </button>
                </div>
              </div>
            </foreignObject>
          )}
        </svg>
      </div>
    </div>
  );
}
