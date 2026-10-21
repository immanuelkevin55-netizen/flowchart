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
  showGrid = true,
  gridSnap = true
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Node Dragging state
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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

    // Responsive margins: 30-60px padding
    const padX = Math.max(30, Math.min(60, clientWidth * 0.05));
    const padY = Math.max(25, Math.min(45, clientHeight * 0.05));

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
      x: Math.max(16, centeredX),
      y: Math.max(16, centeredY)
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
    const padX = Math.max(30, Math.min(60, projectedW * 0.05));
    const padY = Math.max(25, Math.min(45, currentH * 0.05));

    const targetZoom = Math.min(
      (projectedW - padX * 2) / DEFAULT_CANVAS_WIDTH,
      (currentH - padY * 2) / DEFAULT_CANVAS_HEIGHT
    );
    const clamped = Math.max(0.35, Math.min(1.8, Number(targetZoom.toFixed(3))));

    const centeredX = Math.round((projectedW - DEFAULT_CANVAS_WIDTH * clamped) / 2);
    const centeredY = Math.round((currentH - DEFAULT_CANVAS_HEIGHT * clamped) / 2);

    // Instantly apply target zoom & pan so CSS transform transition matches sidebar transition smoothly
    setZoom(clamped);
    setPan({
      x: Math.max(16, centeredX),
      y: Math.max(16, centeredY)
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

  // Mouse wheel zoom
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((z) => Math.max(0.3, Math.min(2.5, z * zoomFactor)));
    } else {
      // Pan with trackpad
      setPan((p) => ({
        x: p.x - e.deltaX * 0.8,
        y: p.y - e.deltaY * 0.8
      }));
    }
  };

  // Canvas Mouse Down: Start Pan, or Start Freeform Arrow if Arrow Tool active
  const handleCanvasMouseDown = (e) => {
    // If middle click or space key held, start panning
    if (e.button === 1 || e.spaceKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelect(null, null);
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

    if (e.target.classList.contains('canvas-background-rect')) {
      onSelect(null, null);
    }
  };

  // Node Drag Start
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

    onSelect(nodeId, 'node');

    const node = slide.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    setDraggingNode(nodeId);
    setDragOffset({ x: x - node.x, y: y - node.y });
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
    // Panning
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    // Resizing Node with on-canvas handles
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

    // Dragging Node
    if (draggingNode) {
      let newX = x - dragOffset.x;
      let newY = y - dragOffset.y;

      if (gridSnap) {
        newX = snapToGrid(newX, 20);
        newY = snapToGrid(newY, 20);
      }

      onUpdateNode(draggingNode, {
        x: Math.max(0, Math.min(DEFAULT_CANVAS_WIDTH - 150, newX)),
        y: Math.max(120, Math.min(DEFAULT_CANVAS_HEIGHT - 80, newY))
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

  // Mouse Up: Complete Arrow Connection or Endpoint Drag
  const handleMouseUp = (e) => {
    if (isPanning) {
      setIsPanning(false);
    }

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
      className={`canvas-viewport ${activeTool === 'connector' ? 'tool-connector-active' : ''} ${(connecting || draggingEndpoint) ? 'is-connecting' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
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

      {/* Zoom / Pan Floating Control Bar */}
      <div className="canvas-controls-overlay">
        <button
          className="canvas-ctrl-btn"
          onClick={() => setZoom((z) => Math.min(2.2, z + 0.1))}
          title="Zoom In (Ctrl + Scroll)"
        >
          <ZoomIn size={15} />
        </button>
        <span className="canvas-zoom-label">{Math.round(zoom * 100)}%</span>
        <button
          className="canvas-ctrl-btn"
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
          title="Zoom Out (Ctrl - Scroll)"
        >
          <ZoomOut size={15} />
        </button>
        <button
          className="canvas-ctrl-btn"
          onClick={fitToScreen}
          title="Fit Slide to Screen"
        >
          <Maximize2 size={15} />
        </button>
        <button
          className="canvas-ctrl-btn"
          onClick={() => {
            setZoom(1);
            setPan({ x: 50, y: 50 });
          }}
          title="Reset View 100%"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* The 16:9 Presentation Stage */}
      <div
        className={`canvas-transform-wrapper ${(isPanning || draggingNode || connecting || draggingEndpoint || resizingNode) ? 'is-dragging' : 'smooth-adapt'}`}
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

          {/* Nodes Layer */}
          <g className="canvas-nodes-layer">
            {(slide.nodes || []).map((node) => (
              <g
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
              >
                <FlowNode
                  node={node}
                  isSelected={selectedId === node.id && selectedType === 'node'}
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
                  onStartResize={handleStartResize}
                />
              </g>
            ))}
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
