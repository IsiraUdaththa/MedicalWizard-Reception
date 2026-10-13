import { useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CalendarFilterProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CalendarFilter({
  selectedDate,
  onSelectDate,
}: CalendarFilterProps) {
  const [today] = useState<Date>(() => new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => selectedDate ?? new Date(),
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  function handlePrevMonth() {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }

  function handleNextMonth() {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }

  function handleToday() {
    const today = new Date();
    setCurrentMonth(today);
    onSelectDate(today);
  }

  function handleTomorrow() {
    const tomorrow = addDays(new Date(), 1);
    setCurrentMonth(tomorrow);
    onSelectDate(tomorrow);
  }

  function handleDayClick(day: Date) {
    if (selectedDate && isSameDay(day, selectedDate)) {
      onSelectDate(null);
    } else {
      if (!isSameMonth(day, currentMonth)) {
        setCurrentMonth(day);
      }
      onSelectDate(day);
    }
  }

  return (
    <Card className="w-full border-slate-200 shadow-xs p-1 m-1 pb-4w">
      <CardHeader className="px-4 pt-4 ">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CalendarDays className="size-4 text-teal-700" />
            <span>Filter by Date</span>
          </CardTitle>

          {selectedDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectDate(null)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-slate-900"
            >
              <RotateCcw className="mr-1 size-3" />
              Reset date
            </Button>
          )}
        </div>

        {/* Quick Date Shortcuts */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant={selectedDate === null ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectDate(null)}
            className={`h-7 px-2.5 text-xs ${
              selectedDate === null
                ? "bg-teal-700 text-white hover:bg-teal-800"
                : "text-slate-600"
            }`}
          >
            All dates
          </Button>
          <Button
            type="button"
            variant={
              selectedDate !== null && isToday(selectedDate)
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={handleToday}
            className={`h-7 px-2.5 text-xs ${
              selectedDate !== null && isToday(selectedDate)
                ? "bg-teal-700 text-white hover:bg-teal-800"
                : "text-slate-600"
            }`}
          >
            Today
          </Button>
          <Button
            type="button"
            variant={
              selectedDate !== null &&
              isSameDay(selectedDate, addDays(today, 1))
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={handleTomorrow}
            className={`h-7 px-2.5 text-xs ${
              selectedDate !== null &&
              isSameDay(selectedDate, addDays(today, 1))
                ? "bg-teal-700 text-white hover:bg-teal-800"
                : "text-slate-600"
            }`}
          >
            Tomorrow
          </Button>
        </div>
      </CardHeader>

      <CardContent className="">
        {/* Month Navigation */}
        <div className="mb-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-sm font-semibold text-slate-800">
            {format(currentMonth, "MMMM yyyy")}
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7"
              aria-label="Previous month"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7"
              aria-label="Next month"
              onClick={handleNextMonth}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-1 text-[11px] font-medium text-slate-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((day) => {
            const isSelected = selectedDate
              ? isSameDay(day, selectedDate)
              : false;
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);

            let dayClasses =
              "size-8 mx-auto flex items-center justify-center text-xs rounded-md transition-colors select-none";

            if (isSelected) {
              dayClasses +=
                " bg-teal-700 text-white font-semibold shadow-xs hover:bg-teal-800";
            } else if (isCurrentDay) {
              dayClasses +=
                " font-semibold text-teal-700 ring-1 ring-teal-500 hover:bg-teal-50";
            } else if (isCurrentMonth) {
              dayClasses += " text-slate-700 hover:bg-slate-100";
            } else {
              dayClasses += " text-slate-300 hover:bg-slate-50";
            }

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleDayClick(day)}
                className={dayClasses}
                aria-label={format(day, "PPPP")}
                aria-pressed={isSelected}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>

        {/* Selected date readout */}
        <div className="mt-4 rounded-md bg-slate-50 p-2.5 text-center text-xs text-slate-600">
          {selectedDate ? (
            <p>
              Showing appointments for{" "}
              <span className="font-semibold text-teal-800">
                {format(selectedDate, "EEEE, MMM d, yyyy")}
              </span>
            </p>
          ) : (
            <p className="text-slate-500">
              Showing <span className="font-medium text-slate-700">all scheduled dates</span>. Click any date to filter.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
