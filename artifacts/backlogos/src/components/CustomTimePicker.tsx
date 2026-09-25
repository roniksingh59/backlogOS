import { useState, useEffect } from 'react';
import { Clock3, Plus, Minus, Sparkles, BookOpen, PenTool, RotateCcw } from 'lucide-react';

interface CustomTimePickerProps {
  value: number; // total minutes per day
  onChange: (minutes: number) => void;
}

const PRESETS = [
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1 hr', minutes: 60 },
  { label: '1.5 hrs', minutes: 90 },
  { label: '2 hrs', minutes: 120 },
  { label: '2.5 hrs', minutes: 150 },
  { label: '3 hrs', minutes: 180 },
  { label: '4 hrs', minutes: 240 },
  { label: '5 hrs', minutes: 300 },
];

export function CustomTimePicker({ value, onChange }: CustomTimePickerProps) {
  const currentTotal = Math.max(15, value || 60);
  const hours = Math.floor(currentTotal / 60);
  const minutes = currentTotal % 60;

  // Local state for free typing before commit
  const [localHours, setLocalHours] = useState(hours);
  const [localMinutes, setLocalMinutes] = useState(minutes);

  useEffect(() => {
    setLocalHours(Math.floor(currentTotal / 60));
    setLocalMinutes(currentTotal % 60);
  }, [currentTotal]);

  const updateDuration = (newHours: number, newMinutes: number) => {
    const validHours = Math.max(0, Math.min(14, isNaN(newHours) ? 0 : newHours));
    const validMinutes = Math.max(0, Math.min(59, isNaN(newMinutes) ? 0 : newMinutes));
    const total = validHours * 60 + validMinutes;
    // Minimum 15 minutes to be useful
    const safeTotal = Math.max(15, total);
    setLocalHours(Math.floor(safeTotal / 60));
    setLocalMinutes(safeTotal % 60);
    onChange(safeTotal);
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setLocalHours(0);
      return;
    }
    const clamped = Math.max(0, Math.min(14, val));
    setLocalHours(clamped);
    updateDuration(clamped, localMinutes);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setLocalMinutes(0);
      return;
    }
    const clamped = Math.max(0, Math.min(59, val));
    setLocalMinutes(clamped);
    updateDuration(localHours, clamped);
  };

  const stepHours = (delta: number) => {
    const nextHours = Math.max(0, Math.min(14, localHours + delta));
    updateDuration(nextHours, localMinutes);
  };

  const stepMinutes = (delta: number) => {
    let nextMinutes = localMinutes + delta;
    let nextHours = localHours;
    if (nextMinutes >= 60) {
      nextHours = Math.min(14, nextHours + 1);
      nextMinutes = nextMinutes % 60;
    } else if (nextMinutes < 0) {
      if (nextHours > 0) {
        nextHours -= 1;
        nextMinutes = 60 + nextMinutes;
      } else {
        nextMinutes = 15; // minimum
      }
    }
    updateDuration(nextHours, nextMinutes);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mins = Number(e.target.value);
    onChange(mins);
  };

  // Pacing calculations
  const learningMinutes = Math.round(currentTotal * 0.4);
  const practiceMinutes = Math.round(currentTotal * 0.4);
  const revisionMinutes = currentTotal - learningMinutes - practiceMinutes;

  const isPresetActive = (mins: number) => currentTotal === mins;
  const isCustom = !PRESETS.some((p) => p.minutes === currentTotal);

  const formatDisplayTime = (totalMins: number) => {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h === 0) return `${m} minutes`;
    if (m === 0) return `${h} ${h === 1 ? 'hour' : 'hours'}`;
    return `${h} ${h === 1 ? 'hour' : 'hours'} ${m} mins`;
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-background/50 p-4 sm:p-5 shadow-xs transition-all">
      {/* Hidden fallback select for backward compatibility with automated tools */}
      <select
        value={currentTotal}
        onChange={(e) => onChange(Number(e.target.value))}
        className="sr-only"
        data-testid="select-time"
        aria-hidden="true"
        tabIndex={-1}
      >
        <option value={currentTotal}>{currentTotal} minutes</option>
      </select>

      {/* Header with live total */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Clock3 size={17} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Daily Available Time
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-foreground tracking-tight">
                {formatDisplayTime(currentTotal)}
              </span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                {currentTotal} min/day
              </span>
            </div>
          </div>
        </div>

        {isCustom && (
          <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground border border-accent/40">
            Custom Pace ✨
          </span>
        )}
      </div>

      {/* Preset Quick-Buttons */}
      <div className="mt-4">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Quick Presets (or customize below):
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
          {PRESETS.map((p) => {
            const active = isPresetActive(p.minutes);
            return (
              <button
                key={p.minutes}
                type="button"
                onClick={() => onChange(p.minutes)}
                className={`focus-ring rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-xs font-bold'
                    : 'border-border/80 bg-card/60 text-muted-foreground hover:border-primary/50 hover:bg-card hover:text-foreground'
                }`}
                data-testid={`preset-time-${p.minutes}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Own Time Inputs (Hours + Minutes) */}
      <div className="mt-5 rounded-xl border border-primary/20 bg-card/80 p-3.5 sm:p-4">
        <p className="text-xs font-bold text-foreground flex items-center justify-between">
          <span>Set Your Exact Study Hours & Minutes:</span>
          <span className="text-[11px] font-normal text-muted-foreground">Type any amount</span>
        </p>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Hours Box */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Hours</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => stepHours(-1)}
                disabled={localHours <= 0 && localMinutes <= 15}
                aria-label="Decrease hour"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border/80 bg-muted/40 text-foreground transition hover:bg-muted disabled:opacity-40"
              >
                <Minus size={14} />
              </button>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  max="14"
                  value={localHours}
                  onChange={handleHoursChange}
                  data-testid="input-custom-hours"
                  className="focus-ring h-10 w-full rounded-lg border border-input bg-background px-3 text-center text-sm font-bold text-foreground shadow-xs"
                />
                <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-muted-foreground">
                  hr
                </span>
              </div>
              <button
                type="button"
                onClick={() => stepHours(1)}
                disabled={localHours >= 14}
                aria-label="Increase hour"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border/80 bg-muted/40 text-foreground transition hover:bg-muted disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Minutes Box */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Minutes</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => stepMinutes(-15)}
                disabled={localHours === 0 && localMinutes <= 15}
                aria-label="Decrease minutes"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border/80 bg-muted/40 text-foreground transition hover:bg-muted disabled:opacity-40"
              >
                <Minus size={14} />
              </button>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  step="5"
                  value={localMinutes}
                  onChange={handleMinutesChange}
                  data-testid="input-custom-minutes"
                  className="focus-ring h-10 w-full rounded-lg border border-input bg-background px-3 text-center text-sm font-bold text-foreground shadow-xs"
                />
                <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-muted-foreground">
                  min
                </span>
              </div>
              <button
                type="button"
                onClick={() => stepMinutes(15)}
                disabled={localHours >= 14 && localMinutes >= 45}
                aria-label="Increase minutes"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border/80 bg-muted/40 text-foreground transition hover:bg-muted disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Range Slider for visual dragging */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>Fine-tune slider</span>
            <span>15 min — 8 hrs</span>
          </div>
          <input
            type="range"
            min="15"
            max="480"
            step="15"
            value={currentTotal > 480 ? 480 : currentTotal}
            onChange={handleSliderChange}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            aria-label="Time slider"
          />
        </div>
      </div>

      {/* Realistic 3-Phase Daily Distribution Preview */}
      <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-3.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles size={12} className="text-primary" /> Daily Task Distribution
        </p>
        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/80 p-2">
            <BookOpen size={14} className="text-primary shrink-0" />
            <div className="min-w-0">
              <span className="block font-semibold text-foreground truncate">Learning (40%)</span>
              <span className="text-[11px] text-muted-foreground">{learningMinutes} min</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/80 p-2">
            <PenTool size={14} className="text-amber-500 shrink-0" />
            <div className="min-w-0">
              <span className="block font-semibold text-foreground truncate">Practice (40%)</span>
              <span className="text-[11px] text-muted-foreground">{practiceMinutes} min</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/80 p-2">
            <RotateCcw size={14} className="text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <span className="block font-semibold text-foreground truncate">Revision (20%)</span>
              <span className="text-[11px] text-muted-foreground">{revisionMinutes} min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
