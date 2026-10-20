import pptxgen from 'pptxgenjs';
import { getNodePortCoordinates, getConnectorEndpoints, getConnectorMidpoint, getOrthogonalPoints } from './geometry';
import { SHAPE_TYPES, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '../types/constants';

/**
 * Clean hex string for pptxgenjs (e.g. '#38BDF8' -> '38BDF8')
 */
export function cleanHex(color) {
  if (!color || color === 'transparent') return '';
  if (color.startsWith('#')) {
    const raw = color.substring(1);
    if (raw.length === 3) {
      return raw.split('').map(c => c + c).join('').toUpperCase();
    }
    return raw.toUpperCase();
  }
  if (color.startsWith('rgb')) {
    const parts = color.match(/\d+/g);
    if (parts && parts.length >= 3) {
      const r = parseInt(parts[0], 10).toString(16).padStart(2, '0');
      const g = parseInt(parts[1], 10).toString(16).padStart(2, '0');
      const b = parseInt(parts[2], 10).toString(16).padStart(2, '0');
      return (r + g + b).toUpperCase();
    }
  }
  return color.toUpperCase();
}

/**
 * Map application shape type to pptxgenjs ShapeType
 */
function mapShapeToPptx(shapeType, pres) {
  switch (shapeType) {
    case SHAPE_TYPES.PROCESS:
      return pres.ShapeType.rect;
    case SHAPE_TYPES.TERMINATOR:
      return pres.ShapeType.roundRect;
    case SHAPE_TYPES.SUBPROCESS:
      return pres.ShapeType.roundRect;
    case SHAPE_TYPES.DECISION:
      return pres.ShapeType.diamond;
    case SHAPE_TYPES.DATABASE:
      return pres.ShapeType.can;
    case SHAPE_TYPES.DOCUMENT:
      return pres.ShapeType.flowChartDocument;
    case SHAPE_TYPES.DATA:
      return pres.ShapeType.flowChartInputOutput;
    case SHAPE_TYPES.PREPARATION:
      return pres.ShapeType.flowChartPreparation;
    case SHAPE_TYPES.CALLOUT:
      return pres.ShapeType.wedgeRoundRectCallout;
    case SHAPE_TYPES.TEXTBOX:
    default:
      return pres.ShapeType.rect;
  }
}

/**
 * Export the full presentation to a native PowerPoint (.pptx) file
 */
export async function exportToPowerPoint({
  slides = [],
  activeTheme,
  presentationTitle = 'SlideFlow-Presentation',
  canvasWidth = DEFAULT_CANVAS_WIDTH,
  canvasHeight = DEFAULT_CANVAS_HEIGHT
}) {
  const pres = new pptxgen();

  // 16:9 Widescreen dimensions in inches (13.333 x 7.5 inches)
  const SLIDE_WIDTH_INCHES = 13.333;
  const SLIDE_HEIGHT_INCHES = 7.5;

  pres.defineLayout({
    name: 'CUSTOM_16X9',
    width: SLIDE_WIDTH_INCHES,
    height: SLIDE_HEIGHT_INCHES
  });
  pres.layout = 'CUSTOM_16X9';
  pres.title = presentationTitle;

  const scaleX = SLIDE_WIDTH_INCHES / canvasWidth;
  const scaleY = SLIDE_HEIGHT_INCHES / canvasHeight;

  for (let sIdx = 0; sIdx < slides.length; sIdx++) {
    const slideData = slides[sIdx];
    const theme = slideData.theme || activeTheme;
    const slide = pres.addSlide();

    // 1. Slide Background
    const bgHex = cleanHex(theme.bg || '#0F172A');
    if (bgHex) {
      slide.background = { color: bgHex };
    }

    // 2. Slide Title & Header
    if (slideData.title) {
      slide.addText(slideData.title, {
        x: 0.8,
        y: 0.45,
        w: 11.7,
        h: 0.55,
        fontSize: 22,
        bold: true,
        color: cleanHex(theme.titleColor || '#F8FAFC'),
        fontFace: 'Calibri',
        valign: 'middle'
      });
    }

    // Slide Subtitle / Category
    if (slideData.subtitle) {
      slide.addText(slideData.subtitle, {
        x: 0.8,
        y: 1.0,
        w: 11.7,
        h: 0.35,
        fontSize: 12,
        color: cleanHex(theme.subtitleColor || '#94A3B8'),
        fontFace: 'Calibri',
        valign: 'top'
      });
    }

    const nodesMap = new Map();
    (slideData.nodes || []).forEach(n => nodesMap.set(n.id, n));

    // 3. Connectors & Lines
    const connectors = slideData.connectors || [];
    for (const conn of connectors) {
      const fromNode = nodesMap.get(conn.fromId);
      const toNode = nodesMap.get(conn.toId);
      
      const { start, end } = getConnectorEndpoints(conn, fromNode, toNode);
      if (!start || !end || (start.x === 0 && start.y === 0 && end.x === 0 && end.y === 0)) continue;

      const connColor = cleanHex(conn.color || theme.connector || '#38BDF8');
      const connWidth = conn.width || 2;
      const isDashed = conn.style === 'dashed';

      // Check connector type
      if (conn.type === 'straight' || conn.type === 'curved') {
        const x1 = start.x * scaleX;
        const y1 = start.y * scaleY;
        const x2 = end.x * scaleX;
        const y2 = end.y * scaleY;

        const dist = Math.hypot(x2 - x1, y2 - y1);
        if (dist < 0.005) continue;

        const isHorizontal = Math.abs(y2 - y1) < 0.015;
        const isVertical = Math.abs(x2 - x1) < 0.015;

        let x, y, w, h, flipH, flipV;

        if (isHorizontal) {
          x = Math.min(x1, x2);
          y = y1;
          w = Math.abs(x2 - x1);
          h = 0;
          flipH = x2 < x1;
          flipV = false;
        } else if (isVertical) {
          x = x1;
          y = Math.min(y1, y2);
          w = 0;
          h = Math.abs(y2 - y1);
          flipH = false;
          flipV = y2 < y1;
        } else {
          x = Math.min(x1, x2);
          y = Math.min(y1, y2);
          w = Math.abs(x2 - x1);
          h = Math.abs(y2 - y1);
          flipH = x2 < x1;
          flipV = y2 < y1;
        }

        slide.addShape(pres.ShapeType.line, {
          x,
          y,
          w,
          h,
          flipH,
          flipV,
          line: {
            color: connColor,
            width: connWidth,
            dashType: isDashed ? 'dash' : 'solid',
            endArrowType: 'triangle'
          }
        });
      } else {
        // Orthogonal Multi-Segment Connector in PowerPoint
        const fromPort = conn.fromPort || 'right';
        const toPort = conn.toPort || 'left';
        const points = getOrthogonalPoints(start, end, fromPort, toPort);

        // Collect valid segments and filter out degenerate segments (length < 0.005 inches)
        const validSegments = [];
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          const px1 = p1.x * scaleX;
          const py1 = p1.y * scaleY;
          const px2 = p2.x * scaleX;
          const py2 = p2.y * scaleY;
          if (Math.hypot(px2 - px1, py2 - py1) >= 0.005) {
            validSegments.push({ px1, py1, px2, py2 });
          }
        }

        for (let i = 0; i < validSegments.length; i++) {
          const { px1, py1, px2, py2 } = validSegments[i];
          const isLastSegment = i === validSegments.length - 1;

          const isHorizontal = Math.abs(py2 - py1) < 0.01;
          const isVertical = Math.abs(px2 - px1) < 0.01;

          let x, y, w, h, flipH, flipV;

          if (isHorizontal) {
            x = Math.min(px1, px2);
            y = py1;
            w = Math.abs(px2 - px1);
            h = 0;
            flipH = px2 < px1;
            flipV = false;
          } else if (isVertical) {
            x = px1;
            y = Math.min(py1, py2);
            w = 0;
            h = Math.abs(py2 - py1);
            flipH = false;
            flipV = py2 < py1;
          } else {
            x = Math.min(px1, px2);
            y = Math.min(py1, py2);
            w = Math.abs(px2 - px1);
            h = Math.abs(py2 - py1);
            flipH = px2 < px1;
            flipV = py2 < py1;
          }

          slide.addShape(pres.ShapeType.line, {
            x,
            y,
            w,
            h,
            flipH,
            flipV,
            line: {
              color: connColor,
              width: connWidth,
              dashType: isDashed ? 'dash' : 'solid',
              endArrowType: isLastSegment ? 'triangle' : 'none'
            }
          });
        }
      }

      // Connector Label (e.g. "Yes", "No", "Condition")
      if (conn.label && conn.label.trim()) {
        const mid = getConnectorMidpoint(start, end, conn.type, conn.fromPort, conn.toPort);
        const lx = mid.x * scaleX - 0.55;
        const ly = mid.y * scaleY - 0.18;

        slide.addText(conn.label, {
          x: Math.max(0.1, lx),
          y: Math.max(0.1, ly),
          w: 1.1,
          h: 0.36,
          fill: { color: cleanHex(theme.surface || '#1E293B') },
          line: { color: connColor, width: 1 },
          color: cleanHex(theme.titleColor || '#FFFFFF'),
          fontSize: 9,
          bold: true,
          align: 'center',
          valign: 'middle',
          fontFace: 'Calibri'
        });
      }
    }

    // 4. Flowchart Nodes (Real editable shapes!)
    const nodes = slideData.nodes || [];
    for (const node of nodes) {
      const nx = node.x * scaleX;
      const ny = node.y * scaleY;
      const nw = (node.width || 180) * scaleX;
      const nh = (node.height || 90) * scaleY;

      const shapeType = mapShapeToPptx(node.shape || SHAPE_TYPES.PROCESS, pres);
      const isTextbox = node.shape === SHAPE_TYPES.TEXTBOX;

      const fillConfig = isTextbox
        ? { color: '' }
        : { color: cleanHex(node.fill || theme.primary.fill) };

      const lineConfig = isTextbox
        ? { color: '', width: 0 }
        : {
            color: cleanHex(node.stroke || theme.primary.stroke),
            width: node.strokeWidth || 1.5,
            dashType: node.strokeStyle === 'dashed' ? 'dash' : 'solid'
          };

      const fontSize = Math.max(9, Math.round((node.fontSize || 14) * 0.85));

      slide.addText(node.text || '', {
        shape: shapeType,
        x: nx,
        y: ny,
        w: nw,
        h: nh,
        fill: fillConfig,
        line: lineConfig,
        color: cleanHex(node.textColor || theme.primary.textColor || '#FFFFFF'),
        fontSize: fontSize,
        fontFace: node.fontFamily || 'Calibri',
        bold: !!node.bold,
        italic: !!node.italic,
        align: node.textAlign || 'center',
        valign: 'middle',
        wrap: true,
        margin: 5
      });
    }

    // 5. Speaker Notes
    if (slideData.notes && slideData.notes.trim()) {
      slide.addNotes(slideData.notes);
    }
  }

  // Generate and download `.pptx` file in browser
  const filename = `${presentationTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.pptx`;
  await pres.writeFile({ fileName: filename });
  return filename;
}
