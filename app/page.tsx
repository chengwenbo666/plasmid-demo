'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { snapgeneToJson } from '@teselagen/bio-parsers';
import {
  ChevronRight,
  CircleHelp,
  Download,
  FileUp,
  FlaskConical,
  Info,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

type Feature = {
  color?: string;
  end: number;
  id: string;
  name: string;
  start: number;
  strand?: number;
  type?: string;
};

type SequenceData = {
  circular: boolean;
  features: Feature[];
  name: string;
  size: number;
};

type ModelContextTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: unknown) => unknown | Promise<unknown>;
};

type WebMcpDocument = Document & {
  modelContext?: {
    registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => void | Promise<void>;
  };
};

const FEATURE_COLORS = ['#5B7CFA', '#E07740', '#43A69A', '#A568D5', '#D25875', '#B68B2B', '#4C86B8', '#7B9E44'];
const TYPE_COLORS: Record<string, string> = {
  CDS: '#5B7CFA', gene: '#5B7CFA', promoter: '#E07740', rep_origin: '#43A69A',
  terminator: '#A568D5', primer_bind: '#D25875', misc_feature: '#B68B2B',
};

const DEMO_SEQUENCE: SequenceData = {
  circular: true,
  name: 'pBR322–GFP',
  size: 5487,
  features: [
    { id: 'ori', name: 'ColE1 ori', start: 4400, end: 5310, strand: 1, type: 'rep_origin', color: '#43A69A' },
    { id: 'amp', name: 'AmpR', start: 960, end: 1832, strand: -1, type: 'CDS', color: '#5B7CFA' },
    { id: 'prom', name: 'T7 promoter', start: 2190, end: 2252, strand: 1, type: 'promoter', color: '#E07740' },
    { id: 'gfp', name: 'EGFP', start: 2301, end: 3017, strand: 1, type: 'CDS', color: '#A568D5' },
    { id: 'term', name: 'T7 terminator', start: 3056, end: 3135, strand: 1, type: 'terminator', color: '#D25875' },
    { id: 'mcs', name: 'MCS', start: 2050, end: 2160, strand: 1, type: 'misc_feature', color: '#B68B2B' },
  ],
};

function normalizeColor(color: string | undefined, fallback: string) {
  if (!color) return fallback;
  const trimmed = color.trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ? trimmed : fallback;
}

function clampName(name: string, max = 16) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function polar(cx: number, cy: number, radius: number, angle: number) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function arcFlag(angle: number) { return angle > Math.PI ? 1 : 0; }

function normalizedSpan(start: number, end: number, size: number) {
  const raw = end - start;
  return ((raw % size) + size) % size || Math.max(1, Math.abs(raw));
}

function overlaps(a: [number, number], b: [number, number], size: number, gap: number) {
  for (const shift of [-size, 0, size]) {
    if (a[0] - gap < b[1] + shift && b[0] + shift < a[1] + gap) return true;
  }
  return false;
}

function assignLanes(features: Feature[], size: number) {
  const lanes: Array<Array<[number, number]>> = [];
  const laneById = new Map<string, number>();
  const gap = Math.max(15, Math.round(size * 0.006));
  [...features]
    .sort((a, b) => normalizedSpan(b.start, b.end, size) - normalizedSpan(a.start, a.end, size))
    .forEach((feature) => {
      const span = normalizedSpan(feature.start, feature.end, size);
      const range: [number, number] = [feature.start, feature.start + span];
      let lane = lanes.findIndex((items) => items.every((item) => !overlaps(range, item, size, gap)));
      if (lane === -1) { lane = lanes.length; lanes.push([]); }
      lanes[lane].push(range);
      laneById.set(feature.id, lane);
    });
  return laneById;
}

function featureBandPath(feature: Feature, size: number, radius: number, bandWidth: number, cx: number, cy: number) {
  const startAngle = -Math.PI / 2 + (feature.start / size) * Math.PI * 2;
  const span = Math.max((normalizedSpan(feature.start, feature.end, size) / size) * Math.PI * 2, 0.028);
  const direction = feature.strand === -1 ? -1 : 1;
  const sweep = direction === 1 ? 1 : 0;
  const outerRadius = radius + bandWidth / 2;
  const innerRadius = radius - bandWidth / 2;
  const bandStart = direction === 1 ? startAngle : startAngle + span;
  const bandEnd = bandStart + direction * span;
  const outerStart = polar(cx, cy, outerRadius, bandStart);
  const outerEnd = polar(cx, cy, outerRadius, bandEnd);
  const innerEnd = polar(cx, cy, innerRadius, bandEnd);
  const innerStart = polar(cx, cy, innerRadius, bandStart);
  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${outerRadius} ${outerRadius} 0 ${arcFlag(span)} ${sweep} ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${innerRadius} ${innerRadius} 0 ${arcFlag(span)} ${sweep === 1 ? 0 : 1} ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function hasArrowHead(feature: Feature, size: number) {
  const span = (normalizedSpan(feature.start, feature.end, size) / size) * Math.PI * 2;
  const type = feature.type?.toLowerCase() ?? '';
  return span >= 0.14 && !['rep_origin', 'origin', 'misc_feature', 'primer_bind', 'terminator'].includes(type);
}

function isPromoter(feature: Feature) {
  return /promoter|启动子/i.test(feature.name);
}

function promoterArrowPath(feature: Feature, size: number, radius: number, bandWidth: number, cx: number, cy: number) {
  const startAngle = -Math.PI / 2 + (feature.start / size) * Math.PI * 2;
  const direction = feature.strand === -1 ? -1 : 1;
  const rIn = radius - bandWidth / 2;
  const rOut = radius + bandWidth / 2 + 6;
  const armAngle = Math.min(0.22, Math.max(0.12, bandWidth * 0.006));
  const tipAngle = Math.min(0.07, Math.max(0.045, bandWidth * 0.0018));
  const halfW = bandWidth / 2;
  const stemInner = polar(cx, cy, rIn, startAngle);
  const stemOuter = polar(cx, cy, rOut, startAngle);
  const shaftOuter = polar(cx, cy, rOut + halfW, startAngle + direction * armAngle);
  const tip = polar(cx, cy, rOut, startAngle + direction * (armAngle + tipAngle));
  const shaftInner = polar(cx, cy, rOut - halfW, startAngle + direction * armAngle);
  return [
    `M ${stemInner.x.toFixed(2)} ${stemInner.y.toFixed(2)}`,
    `L ${stemOuter.x.toFixed(2)} ${stemOuter.y.toFixed(2)}`,
    `L ${shaftOuter.x.toFixed(2)} ${shaftOuter.y.toFixed(2)}`,
    `L ${tip.x.toFixed(2)} ${tip.y.toFixed(2)}`,
    `L ${shaftInner.x.toFixed(2)} ${shaftInner.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function featurePath(feature: Feature, size: number, radius: number, bandWidth: number, cx: number, cy: number) {
  const startAngle = -Math.PI / 2 + (feature.start / size) * Math.PI * 2;
  const span = Math.max((normalizedSpan(feature.start, feature.end, size) / size) * Math.PI * 2, 0.028);
  if (isPromoter(feature) || !hasArrowHead(feature, size)) return featureBandPath(feature, size, radius, bandWidth, cx, cy);
  const direction = feature.strand === -1 ? -1 : 1;
  const sweep = direction === 1 ? 1 : 0;
  const outerRadius = radius + bandWidth / 2;
  const innerRadius = radius - bandWidth / 2;
  // A single, conventional triangular arrowhead pointing along the feature direction.
  const headAngle = Math.min(span * 0.58, Math.min(0.18, Math.max(0.04, span * 0.32)));
  const bodySpan = Math.max(0.003, span - headAngle);
  const arrowStart = direction === 1 ? startAngle : startAngle + span;
  const outerStart = polar(cx, cy, outerRadius, arrowStart);
  const outerBodyEnd = polar(cx, cy, outerRadius, arrowStart + direction * bodySpan);
  const headBaseAngle = arrowStart + direction * bodySpan;
  const headExtra = Math.min(9, bandWidth * 0.38);
  const outerHeadBase = polar(cx, cy, outerRadius + headExtra, headBaseAngle);
  const tip = polar(cx, cy, radius, arrowStart + direction * span);
  const innerHeadBase = polar(cx, cy, innerRadius - headExtra, headBaseAngle);
  const innerBodyEnd = polar(cx, cy, innerRadius, arrowStart + direction * bodySpan);
  const innerStart = polar(cx, cy, innerRadius, arrowStart);
  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${outerRadius} ${outerRadius} 0 ${arcFlag(bodySpan)} ${sweep} ${outerBodyEnd.x.toFixed(2)} ${outerBodyEnd.y.toFixed(2)}`,
    `L ${outerHeadBase.x.toFixed(2)} ${outerHeadBase.y.toFixed(2)}`,
    `L ${tip.x.toFixed(2)} ${tip.y.toFixed(2)}`,
    `L ${innerHeadBase.x.toFixed(2)} ${innerHeadBase.y.toFixed(2)}`,
    `L ${innerBodyEnd.x.toFixed(2)} ${innerBodyEnd.y.toFixed(2)}`,
    `A ${innerRadius} ${innerRadius} 0 ${arcFlag(bodySpan)} ${sweep === 1 ? 0 : 1} ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function featureLabelArcPath(feature: Feature, size: number, radius: number, cx: number, cy: number) {
  const startAngle = -Math.PI / 2 + (feature.start / size) * Math.PI * 2;
  const span = Math.max((normalizedSpan(feature.start, feature.end, size) / size) * Math.PI * 2, 0.028);
  const midAngle = startAngle + span / 2;
  // Use the readable direction for each half of the circle while keeping the text on the feature arc.
  const direction = Math.sin(midAngle) > 0 ? -1 : 1;
  const sweep = direction === 1 ? 1 : 0;
  const arcStart = direction === 1 ? startAngle : startAngle + span;
  const arcEnd = arcStart + direction * span;
  const start = polar(cx, cy, radius, arcStart);
  const end = polar(cx, cy, radius, arcEnd);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${arcFlag(span)} ${sweep} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function readableTangentAngle(angle: number) {
  let degrees = (angle * 180) / Math.PI + 90;
  const normalized = ((degrees % 360) + 360) % 360;
  if (normalized > 90 && normalized < 270) degrees += 180;
  return degrees;
}

function isLightColor(value: string) {
  const hex = value.replace('#', '');
  const expanded = hex.length === 3 ? hex.split('').map((part) => `${part}${part}`).join('') : hex.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return false;
  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  return (red * 0.299 + green * 0.587 + blue * 0.114) > 163;
}

function PlasmidMap({ data, selectedIds, width, labels }: { data: SequenceData; selectedIds: Set<string>; width: number; labels: boolean }) {
  const features = data.features.filter((feature) => selectedIds.has(feature.id));
  const cx = 400;
  const cy = 320;
  const baseRadius = 174;
  return (
    <svg id="plasmid-map" xmlns="http://www.w3.org/2000/svg" width="800" height="640" viewBox="0 0 800 640" role="img" aria-label={`${data.name} plasmid map`} className="h-full w-full overflow-visible" preserveAspectRatio="xMidYMid meet" shapeRendering="geometricPrecision">
      <title>{`${data.name} · simplified plasmid map`}</title>
      <defs>{features.map((feature) => <path key={feature.id} id={`feature-label-arc-${feature.id}`} d={featureLabelArcPath(feature, data.size, baseRadius, cx, cy)} fill="none" />)}</defs>
      <circle cx={cx} cy={cy} r={baseRadius} fill="none" stroke="#6A6A6A" strokeWidth="10" />
      {features.map((feature, index) => {
        const radius = baseRadius;
        const color = normalizeColor(feature.color, TYPE_COLORS[feature.type ?? ''] ?? FEATURE_COLORS[index % FEATURE_COLORS.length]);
        const span = normalizedSpan(feature.start, feature.end, data.size);
        const midAngle = -Math.PI / 2 + ((feature.start + span / 2) / data.size) * Math.PI * 2;
        const arcLength = (span / data.size) * Math.PI * 2 * radius;
        const label = clampName(feature.name, 26);
        const labelFitsArrow = arcLength >= Math.max(98, label.length * 7.2 + 30);
        const labelPoint = polar(cx, cy, radius, midAngle);
        const labelInsideRing = /\bmcs\b/i.test(feature.name);
        const innerLabelPoint = polar(cx, cy, radius - width / 2 - 28, midAngle);
        const innerFeatureAnchor = polar(cx, cy, radius - width / 2 - 1, midAngle);
        const calloutAnchor = polar(cx, cy, radius + width / 2 + 1, midAngle);
        const calloutElbow = polar(cx, cy, radius + width / 2 + 22, midAngle);
        const rightSide = Math.cos(midAngle) >= 0;
        const labelWidth = Math.min(205, Math.max(44, label.length * 7.7 + 18));
        const labelHeight = 22;
        const boxX = rightSide ? calloutElbow.x + 10 : calloutElbow.x - labelWidth - 10;
        const boxY = Math.max(10, Math.min(608 - labelHeight, calloutElbow.y - labelHeight / 2));
        const connectorX = rightSide ? boxX : boxX + labelWidth;
        const innerBoxX = innerLabelPoint.x - labelWidth / 2;
        const innerBoxY = innerLabelPoint.y - labelHeight / 2;
        return <g key={feature.id} data-feature-name={feature.name}>
          <path d={featurePath(feature, data.size, radius, width, cx, cy)} fill={color} stroke="#3C3C3C" strokeWidth="1.35" strokeLinejoin="miter" />
          {isPromoter(feature) && <path d={promoterArrowPath(feature, data.size, radius, width, cx, cy)} fill={color} stroke="#3C3C3C" strokeWidth="1.35" strokeLinejoin="miter" />}
          {labels && labelFitsArrow && <text fill={isLightColor(color) ? '#141414' : '#FFFFFF'} fontFamily="Arial" fontSize={Math.max(11, Math.min(16, width * 0.55))} fontWeight="600" dominantBaseline="middle"><textPath href={`#feature-label-arc-${feature.id}`} startOffset="50%" textAnchor="middle">{label}</textPath></text>}
          {labels && !labelFitsArrow && labelInsideRing && <g>
            <path d={`M ${innerFeatureAnchor.x.toFixed(2)} ${innerFeatureAnchor.y.toFixed(2)} L ${innerLabelPoint.x.toFixed(2)} ${innerLabelPoint.y.toFixed(2)}`} fill="none" stroke="#929292" strokeWidth="1.2" />
            <rect x={innerBoxX.toFixed(2)} y={innerBoxY.toFixed(2)} width={labelWidth.toFixed(2)} height={labelHeight} rx="6" fill="#FFFFFF" stroke="#9C9C9C" strokeWidth="1.1" />
            <text x={innerLabelPoint.x.toFixed(2)} y={(innerLabelPoint.y + 0.6).toFixed(2)} fill="#171717" fontFamily="Arial" fontSize="12" fontWeight="500" textAnchor="middle" dominantBaseline="middle">{label}</text>
          </g>}
          {labels && !labelFitsArrow && !labelInsideRing && <g>
            <path d={`M ${calloutAnchor.x.toFixed(2)} ${calloutAnchor.y.toFixed(2)} L ${calloutElbow.x.toFixed(2)} ${calloutElbow.y.toFixed(2)} L ${connectorX.toFixed(2)} ${(boxY + labelHeight / 2).toFixed(2)}`} fill="none" stroke="#929292" strokeWidth="1.2" strokeLinejoin="round" />
            <rect x={boxX.toFixed(2)} y={boxY.toFixed(2)} width={labelWidth.toFixed(2)} height={labelHeight} rx="6" fill="#FFFFFF" stroke="#9C9C9C" strokeWidth="1.1" />
            <text x={(boxX + labelWidth / 2).toFixed(2)} y={(boxY + labelHeight / 2 + 0.6).toFixed(2)} fill="#171717" fontFamily="Arial" fontSize="12" fontWeight="500" textAnchor="middle" dominantBaseline="middle">{label}</text>
          </g>}
        </g>;
      })}
      <text x={cx} y={cy + 1} fill="#111111" fontFamily="Arial" fontSize="20" fontWeight="700" textAnchor="middle" dominantBaseline="middle">{clampName(data.name, 34)}</text>
    </svg>
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<SequenceData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bandWidth, setBandWidth] = useState(28);
  const [showLabels, setShowLabels] = useState(true);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const displayedFeatures = useMemo(() => data?.features.filter((feature) => selectedIds.has(feature.id)) ?? [], [data, selectedIds]);

  async function handleFile(file?: File) {
    if (!file) return;
    setError('');
    if (!file.name.toLowerCase().endsWith('.dna')) {
      setError('请上传 SnapGene 的 .dna 文件。这个版本会直接读取其中的 feature 信息并重新生成可编辑 SVG。');
      return;
    }
    setBusy(true);
    try {
      const results = await snapgeneToJson(file, { fileName: file.name });
      const result = results?.[0];
      const parsed = result?.parsedSequence;
      if (!result?.success || !parsed?.size) throw new Error(result?.messages?.join(' ') || '无法读取这个文件');
      const features: Feature[] = (parsed.features ?? [])
        .filter((feature: { start?: number; end?: number }) => typeof feature.start === 'number' && typeof feature.end === 'number')
        .map((feature: Omit<Feature, 'id'>, index: number) => ({ ...feature, id: `feature-${index}`, name: feature.name?.trim() || `Feature ${index + 1}` }));
      if (!features.length) throw new Error('文件中没有可显示的 feature。');
      const nextData: SequenceData = { circular: parsed.circular !== false, features, name: parsed.name?.trim() || file.name.replace(/\.dna$/i, ''), size: parsed.size };
      setData(nextData);
      setSelectedIds(new Set(features.map((feature) => feature.id)));
      setFileName(file.name);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '读取失败，请确认文件来自 SnapGene。');
    } finally { setBusy(false); }
  }

  function loadDemo() {
    setData(DEMO_SEQUENCE);
    setSelectedIds(new Set(DEMO_SEQUENCE.features.map((feature) => feature.id)));
    setBandWidth(28); setShowLabels(true); setFileName('示例：pBR322–GFP.dna'); setError('');
  }

  function reset() {
    setData(null); setSelectedIds(new Set()); setFileName(''); setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  function toggleFeature(id: string) {
    setSelectedIds((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function downloadSvg() {
    const svg = document.getElementById('plasmid-map');
    if (!svg || !data) return;
    const source = `<?xml version="1.0" encoding="UTF-8"?>\n${svg.outerHTML.replace(' class="h-full w-full overflow-visible"', '')}`;
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.name.replace(/[^a-zA-Z0-9-_\u4e00-\u9fa5]/g, '_')}_schematic.svg`;
    link.click(); URL.revokeObjectURL(url);
  }

  useEffect(() => {
    const context = (document as WebMcpDocument).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    const readState = () => ({
      ready: Boolean(data),
      name: data?.name ?? null,
      totalFeatures: data?.features.length ?? 0,
      visibleFeatureIds: [...selectedIds],
      bandWidth,
      showLabels,
    });

    try {
      void Promise.resolve(context.registerTool({
        name: 'read_schematic_state',
        title: '读取质粒示意图状态',
        description: '读取当前已上传质粒图谱的名称、可见元件、箭头环带宽度和标签状态。',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => readState(),
      }, { signal: lifecycle.signal })).catch(() => undefined);

      void Promise.resolve(context.registerTool({
        name: 'configure_schematic',
        title: '设置质粒示意图',
        description: '在用户已经上传 SnapGene 文件后，设置箭头环带宽度、标签显示，以及要保留的 feature。',
        inputSchema: {
          type: 'object',
          properties: {
            bandWidth: { type: 'number', minimum: 14, maximum: 54 },
            showLabels: { type: 'boolean' },
            featureIds: { type: 'array', items: { type: 'string' } },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: async (input) => {
          if (!data) throw new Error('请先通过页面上传 SnapGene .dna 文件。');
          if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('设置格式无效。');
          const settings = input as { bandWidth?: unknown; showLabels?: unknown; featureIds?: unknown };
          let nextBandWidth = bandWidth;
          let nextShowLabels = showLabels;
          let nextFeatureIds = [...selectedIds];
          if (settings.bandWidth !== undefined) {
            if (typeof settings.bandWidth !== 'number' || !Number.isFinite(settings.bandWidth) || settings.bandWidth < 14 || settings.bandWidth > 54) {
              throw new Error('bandWidth 必须是 14 到 54 之间的数字。');
            }
            nextBandWidth = Math.round(settings.bandWidth);
            setBandWidth(nextBandWidth);
          }
          if (settings.showLabels !== undefined) {
            if (typeof settings.showLabels !== 'boolean') throw new Error('showLabels 必须为布尔值。');
            nextShowLabels = settings.showLabels;
            setShowLabels(nextShowLabels);
          }
          if (settings.featureIds !== undefined) {
            if (!Array.isArray(settings.featureIds) || settings.featureIds.some((id) => typeof id !== 'string')) throw new Error('featureIds 必须为字符串数组。');
            const available = new Set(data.features.map((feature) => feature.id));
            if (settings.featureIds.some((id) => !available.has(id))) throw new Error('featureIds 中包含不存在的 feature。');
            nextFeatureIds = settings.featureIds;
            setSelectedIds(new Set(nextFeatureIds));
          }
          await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
          return {
            ready: true,
            name: data.name,
            totalFeatures: data.features.length,
            visibleFeatureIds: nextFeatureIds,
            bandWidth: nextBandWidth,
            showLabels: nextShowLabels,
            updated: true,
          };
        },
      }, { signal: lifecycle.signal })).catch(() => undefined);
    } catch {
      // WebMCP is optional in browsers that do not expose the proposed API.
    }
    return () => lifecycle.abort();
  }, [bandWidth, data, selectedIds, showLabels]);

  return <main className="min-h-screen bg-[#F6F8F4] text-[#1A3031]">
    <header className="border-b border-[#DDE8E4] bg-[#F6F8F4]/90 px-5 py-4 backdrop-blur sm:px-9">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
        <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#195B58] text-white shadow-[0_8px_24px_rgba(25,91,88,0.20)]"><FlaskConical className="size-[19px]" strokeWidth={2.1} /></div><div><p className="text-base font-bold tracking-[-0.03em]">Plasmid Sketch</p><p className="text-[11px] font-medium tracking-[0.06em] text-[#607878]">质粒示意图生成器</p></div></div>
        <Badge variant="outline" className="hidden border-[#C9DEDA] bg-[#F6FFFC] text-[#326864] sm:inline-flex"><span className="size-1.5 rounded-full bg-[#51A796]" /> 本地处理，不上传文件</Badge>
      </div>
    </header>

    {!data ? <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[1180px] items-center gap-12 px-5 py-14 lg:grid-cols-[1fr_420px] lg:px-9">
      <div className="max-w-2xl">
        <Badge className="mb-5 bg-[#E4F1EC] text-[#28645C] hover:bg-[#E4F1EC]">为小尺寸科研图而生</Badge>
        <h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-[-0.055em] text-[#173A3A] sm:text-6xl">重新绘制你的<br /><span className="text-[#238477]">质粒示意图</span></h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-[#5D7474] sm:text-lg">直接导入 SnapGene <code className="rounded bg-[#E6EFEC] px-1.5 py-0.5 text-sm text-[#315D5A]">.dna</code> 文件，保留 feature、方向和颜色，再以适合论文小面板的箭头环带宽度导出 SVG。</p>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#496666]"><span className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-[#E3F0ED] text-[#278172]">✓</span> 真正可调的箭头带宽</span><span className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-[#E3F0ED] text-[#278172]">✓</span> 生成可编辑矢量 SVG</span></div>
      </div>
      <div className="rounded-[28px] border border-dashed border-[#90B5AE] bg-white p-3 shadow-[0_24px_70px_rgba(41,80,75,0.10)]">
        <label className="group flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-[20px] bg-[radial-gradient(circle_at_50%_0%,#F1FBF7_0%,#FFFFFF_55%)] px-8 text-center transition hover:bg-[#F4FCF9]" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFile(event.dataTransfer.files?.[0]); }}>
          <div className="grid size-16 place-items-center rounded-2xl bg-[#E3F2ED] text-[#238477] transition group-hover:scale-105">{busy ? <LoaderCircle className="size-7 animate-spin" /> : <FileUp className="size-7" />}</div><h2 className="mt-5 text-lg font-bold">上传 SnapGene 文件</h2><p className="mt-2 max-w-[250px] text-sm leading-6 text-[#698080]">拖入或选择一个 <strong>.dna</strong> 文件，在浏览器中完成解析和作图。</p><span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#195B58] px-4 py-2.5 text-sm font-semibold text-white shadow-sm">选择 .dna 文件 <ChevronRight className="size-4" /></span><input ref={inputRef} type="file" accept=".dna" className="sr-only" onChange={(event) => void handleFile(event.target.files?.[0])} />
        </label>
        <button type="button" onClick={loadDemo} className="mx-auto mt-4 flex items-center gap-2 text-sm font-medium text-[#47736D] transition hover:text-[#195B58]"><Sparkles className="size-4" /> 先查看示例</button>
        {error && <p className="mx-4 mb-2 mt-3 rounded-lg bg-[#FFF1F0] px-3 py-2 text-sm text-[#AF4640]">{error}</p>}
      </div>
    </section> : <section className="mx-auto max-w-[1440px] px-5 py-6 sm:px-9">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.12em] text-[#478078]">WORKSPACE</p><div className="mt-1 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-[-0.035em]">{data.name}</h1><Badge variant="secondary" className="bg-[#E5EFEC] text-[#4D6B6A]">{data.size.toLocaleString()} bp</Badge><Badge variant="secondary" className="bg-[#E5EFEC] text-[#4D6B6A]">{displayedFeatures.length}/{data.features.length} features</Badge></div><p className="mt-1 text-xs text-[#79908F]">来源：{fileName}</p></div><div className="flex items-center gap-2"><Button variant="ghost" onClick={reset} className="text-[#587271]"><RotateCcw /> 换一个文件</Button><Button onClick={downloadSvg} className="h-9 bg-[#195B58] px-4 text-white hover:bg-[#124A48]"><Download /> 下载 SVG</Button></div></div>
      <div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)_285px]">
        <aside className="order-2 rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-[0_10px_30px_rgba(35,74,68,0.05)] xl:order-1"><div className="flex items-center justify-between border-b border-[#E5EFEC] pb-4"><div><h2 className="font-bold">示意图设置</h2><p className="mt-0.5 text-xs text-[#728887]">先缩小，再调宽度</p></div><CircleHelp className="size-4 text-[#8AA09E]" aria-label="箭头环带宽度指 feature 色块沿半径方向的实际宽度" /></div><div className="mt-6"><div className="flex items-baseline justify-between"><label className="text-sm font-semibold">箭头环带宽度</label><output className="rounded-md bg-[#E7F4F0] px-2 py-0.5 text-xs font-bold text-[#277269]">{bandWidth}px</output></div><Slider className="mt-4" min={14} max={54} step={1} value={[bandWidth]} onValueChange={(value) => setBandWidth(Array.isArray(value) ? value[0] : value)} aria-label="箭头环带宽度" /><div className="mt-2 flex justify-between text-[11px] text-[#8A9D9B]"><span>细</span><span>适合小图</span><span>宽</span></div></div><div className="mt-6 flex items-center justify-between rounded-xl bg-[#F2F7F5] px-3.5 py-3"><div><p className="text-sm font-semibold">显示 feature 标签</p><p className="mt-0.5 text-xs text-[#728887]">短 feature 使用注释框</p></div><Switch checked={showLabels} onCheckedChange={setShowLabels} aria-label="显示 feature 标签" /></div><div className="mt-7 rounded-xl border border-[#D7E8E3] bg-[#F4FAF8] p-3.5"><div className="flex gap-2"><Info className="mt-0.5 size-4 shrink-0 text-[#338175]" /><p className="text-xs leading-5 text-[#547573]">导出的 SVG 是重新生成的矢量图：箭头带宽由这里控制，不受 SnapGene 默认箭头比例限制。</p></div></div></aside>
        <div className="order-1 min-h-[520px] rounded-2xl border border-[#DCE8E5] bg-[radial-gradient(circle_at_50%_42%,#FFFFFF_0%,#F7FBF9_70%,#EDF5F1_100%)] p-5 shadow-[0_10px_30px_rgba(35,74,68,0.05)] xl:order-2"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold tracking-[0.1em] text-[#6D8885]">SVG PREVIEW</p><p className="text-xs text-[#78908D]">透明背景 · 可编辑</p></div><div className="mx-auto h-[min(68vh,680px)] min-h-[440px] max-w-[720px]"><PlasmidMap data={data} selectedIds={selectedIds} width={bandWidth} labels={showLabels} /></div></div>
        <aside className="order-3 rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-[0_10px_30px_rgba(35,74,68,0.05)]"><div className="flex items-end justify-between border-b border-[#E5EFEC] pb-4"><div><h2 className="font-bold">保留的元件</h2><p className="mt-0.5 text-xs text-[#728887]">点击精简图谱</p></div><button type="button" className="text-xs font-semibold text-[#28776D]" onClick={() => setSelectedIds(new Set(data.features.map((feature) => feature.id)))}>全部显示</button></div><div className="mt-2 max-h-[430px] space-y-1 overflow-y-auto pr-1">{data.features.map((feature, index) => { const active = selectedIds.has(feature.id); const color = normalizeColor(feature.color, TYPE_COLORS[feature.type ?? ''] ?? FEATURE_COLORS[index % FEATURE_COLORS.length]); return <button key={feature.id} type="button" onClick={() => toggleFeature(feature.id)} className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition ${active ? 'bg-[#F0F8F5]' : 'opacity-45 hover:bg-[#F6F8F7]'}`} aria-pressed={active}><span className="size-3 shrink-0 rounded-sm" style={{ background: color }} /><span className="min-w-0 flex-1 truncate text-sm font-medium">{feature.name}</span>{active ? <span className="text-xs font-bold text-[#278171]">保留</span> : <X className="size-3.5 text-[#829795]" />}</button>; })}</div><p className="mt-4 border-t border-[#E5EFEC] pt-4 text-xs leading-5 text-[#78908D]">建议小尺寸主图保留 4–8 个核心 feature；完整构建信息可放在补充材料。</p></aside>
      </div>
    </section>}
    <footer className="border-t border-[#E0EAE6] px-5 py-5 text-center text-xs text-[#78908D]">文件仅在当前浏览器内存中处理。关闭页面后不会保留序列或注释。</footer>
  </main>;
}
