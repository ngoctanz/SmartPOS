"use client";

import * as React from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface DateRangeValue {
  period?: string;
  startDate?: string;
  endDate?: string;
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  showAllOption?: boolean;
  className?: string;
}

const PRESET_OPTIONS = [
  { value: "today", label: "Hôm nay" },
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "3month", label: "3 tháng" },
  { value: "6month", label: "6 tháng" },
  { value: "year", label: "Năm nay" },
];

const PERIOD_LABELS: Record<string, string> = {
  today: "Hôm nay",
  week: "Tuần này",
  month: "Tháng này",
  "3month": "3 tháng",
  "6month": "6 tháng",
  year: "Năm nay",
  custom: "Tùy chỉnh",
};

// Format date for display (dd/MM/yyyy)
const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

export function DateRangeFilter({
  value,
  onChange,
  showAllOption = true,
  className,
}: DateRangeFilterProps) {
  const [tempStartDate, setTempStartDate] = React.useState(value.startDate || "");
  const [tempEndDate, setTempEndDate] = React.useState(value.endDate || "");
  const [open, setOpen] = React.useState(false);
  const [expandedSection, setExpandedSection] = React.useState<"preset" | "custom" | null>(
    value.period === "custom" ? "custom" : value.period ? "preset" : null
  );

  // Sync temp dates when value changes
  React.useEffect(() => {
    if (value.period === "custom") {
      setTempStartDate(value.startDate || "");
      setTempEndDate(value.endDate || "");
    }
  }, [value]);

  // Update expanded section when value changes
  React.useEffect(() => {
    if (value.period === "custom") {
      setExpandedSection("custom");
    } else if (value.period) {
      setExpandedSection("preset");
    }
  }, [value.period]);

  const handlePresetSelect = (preset: string) => {
    onChange({
      period: preset,
      startDate: undefined,
      endDate: undefined,
    });
    setOpen(false);
  };

  const handleAllSelect = () => {
    onChange({
      period: undefined,
      startDate: undefined,
      endDate: undefined,
    });
    setOpen(false);
  };

  const handleApplyCustom = () => {
    if (tempStartDate && tempEndDate) {
      onChange({
        period: "custom",
        startDate: tempStartDate,
        endDate: tempEndDate,
      });
      setOpen(false);
    }
  };

  const toggleSection = (section: "preset" | "custom") => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Get display text
  const getDisplayText = () => {
    if (value.period === "custom" && value.startDate && value.endDate) {
      return `${formatDisplayDate(value.startDate)} - ${formatDisplayDate(value.endDate)}`;
    }
    if (value.period) {
      return PERIOD_LABELS[value.period] || value.period;
    }
    return "Tất cả";
  };

  const isPresetActive = value.period && value.period !== "custom";
  const isCustomActive = value.period === "custom";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline"
          size="lg"
          className={cn("w-[180px] justify-between font-normal shadow-sm border", className)}
        >
          <span className="truncate">{getDisplayText()}</span>
          <Calendar className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px] p-0">
        {/* Tất cả option */}
        {showAllOption && (
          <button
            onClick={handleAllSelect}
            className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent cursor-pointer"
          >
            <span>Tất cả</span>
            {!value.period && <Check className="h-4 w-4" />}
          </button>
        )}

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Mốc cố định - accordion header */}
        <button
          onClick={() => toggleSection("preset")}
          className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">Mốc cố định</span>
            {isPresetActive && <Check className="h-4 w-4 text-primary" />}
          </div>
          <ChevronDown 
            className={cn(
              "h-4 w-4 transition-transform",
              expandedSection === "preset" && "rotate-180"
            )} 
          />
        </button>

        {/* Mốc cố định - content */}
        {expandedSection === "preset" && (
          <div className="border-t bg-muted/30">
            {PRESET_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePresetSelect(option.value)}
                className="flex w-full items-center justify-between px-4 py-1.5 text-sm hover:bg-accent cursor-pointer"
              >
                <span>{option.label}</span>
                {value.period === option.value && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Tùy chỉnh - accordion header */}
        <button
          onClick={() => toggleSection("custom")}
          className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">Tùy chỉnh</span>
            {isCustomActive && <Check className="h-4 w-4 text-primary" />}
          </div>
          <ChevronDown 
            className={cn(
              "h-4 w-4 transition-transform",
              expandedSection === "custom" && "rotate-180"
            )} 
          />
        </button>

        {/* Tùy chỉnh - content */}
        {expandedSection === "custom" && (
          <div className="border-t bg-muted/30 p-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Từ ngày</Label>
              <Input
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Đến ngày</Label>
              <Input
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                min={tempStartDate}
                className="h-8"
              />
            </div>
            <Button 
              size="sm" 
              className="w-full"
              onClick={handleApplyCustom}
              disabled={!tempStartDate || !tempEndDate}
            >
              Áp dụng
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
