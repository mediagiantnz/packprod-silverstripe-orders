import { useState } from 'react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangeFilterProps {
  onDateChange: (range: DateRange) => void;
  defaultPreset?: string;
}

const DATE_PRESETS = {
  today: 'Today',
  yesterday: 'Yesterday',
  thisWeek: 'This Week',
  lastWeek: 'Last Week',
  thisMonth: 'This Month',
  lastMonth: 'Last Month',
  thisYear: 'This Year',
  lastYear: 'Last Year',
  custom: 'Custom Range',
} as const;

type DatePreset = keyof typeof DATE_PRESETS;

function getDateRangeForPreset(preset: DatePreset): DateRange {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (preset) {
    case 'today':
      startDate = now;
      endDate = now;
      break;
    case 'yesterday':
      startDate = subDays(now, 1);
      endDate = subDays(now, 1);
      break;
    case 'thisWeek':
      startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'lastWeek':
      const lastWeekStart = subDays(startOfWeek(now, { weekStartsOn: 1 }), 7);
      startDate = lastWeekStart;
      endDate = endOfWeek(lastWeekStart, { weekStartsOn: 1 });
      break;
    case 'thisMonth':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case 'lastMonth':
      const lastMonthDate = subDays(startOfMonth(now), 1);
      startDate = startOfMonth(lastMonthDate);
      endDate = endOfMonth(lastMonthDate);
      break;
    case 'thisYear':
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      break;
    case 'lastYear':
      const lastYearDate = new Date(now.getFullYear() - 1, 0, 1);
      startDate = startOfYear(lastYearDate);
      endDate = endOfYear(lastYearDate);
      break;
    default:
      startDate = now;
      endDate = now;
  }

  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  };
}

export function DateRangeFilter({ onDateChange, defaultPreset = 'thisMonth' }: DateRangeFilterProps) {
  const [preset, setPreset] = useState<DatePreset>(defaultPreset as DatePreset);
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

  const handlePresetChange = (value: DatePreset) => {
    setPreset(value);
    if (value !== 'custom') {
      const range = getDateRangeForPreset(value);
      onDateChange(range);
    }
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      onDateChange({
        startDate: format(customStartDate, 'yyyy-MM-dd'),
        endDate: format(customEndDate, 'yyyy-MM-dd'),
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium mb-2 block">Date Range</label>
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="bg-card">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {Object.entries(DATE_PRESETS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset === 'custom' && (
        <>
          <div>
            <label className="text-sm font-medium mb-2 block">Start Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[200px] justify-start text-left font-normal',
                    !customStartDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customStartDate ? format(customStartDate, 'PPP') : <span>Pick start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[200px] justify-start text-left font-normal',
                    !customEndDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customEndDate ? format(customEndDate, 'PPP') : <span>Pick end date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  disabled={(date) => customStartDate ? date < customStartDate : false}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={handleCustomDateChange} disabled={!customStartDate || !customEndDate}>
            Apply
          </Button>
        </>
      )}
    </div>
  );
}
