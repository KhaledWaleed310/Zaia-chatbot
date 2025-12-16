import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function BookingCalendar({
  year,
  month,
  selectedDate,
  bookingsByDate = {},
  onDateSelect,
  onMonthChange
}) {
  // Get today's date for highlighting
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Calculate calendar grid
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Generate calendar days
  const calendarDays = [];

  // Empty cells for days before the first of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const handlePrevMonth = () => {
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  const getDateString = (day) => {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getBookingsForDay = (day) => {
    const dateStr = getDateString(day);
    return bookingsByDate[dateStr]?.bookings || [];
  };

  const getBookingCountForDay = (day) => {
    const dateStr = getDateString(day);
    return bookingsByDate[dateStr]?.total || 0;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {MONTHS[month - 1]} {year}
        </h2>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dateStr = getDateString(day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const bookingCount = getBookingCountForDay(day);
          const hasBookings = bookingCount > 0;

          // Get booking statuses for color coding
          const dayBookings = getBookingsForDay(day);
          const hasPending = dayBookings.some(b => b.status === 'pending');
          const hasConfirmed = dayBookings.some(b => b.status === 'confirmed');

          return (
            <button
              key={day}
              onClick={() => onDateSelect(dateStr)}
              className={`
                aspect-square flex flex-col items-center justify-center relative rounded-lg text-sm transition-all
                ${isSelected ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2' : ''}
                ${isToday && !isSelected ? 'bg-blue-50 text-blue-600 font-semibold' : ''}
                ${!isSelected && !isToday ? 'hover:bg-gray-100 text-gray-700' : ''}
              `}
            >
              <span>{day}</span>

              {/* Booking indicators */}
              {hasBookings && (
                <div className="flex gap-0.5 mt-1">
                  {hasPending && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-yellow-300' : 'bg-yellow-500'}`} />
                  )}
                  {hasConfirmed && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-green-300' : 'bg-green-500'}`} />
                  )}
                </div>
              )}

              {/* Booking count badge */}
              {bookingCount > 0 && (
                <span className={`
                  absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center
                  text-[10px] font-bold rounded-full
                  ${isSelected ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}
                `}>
                  {bookingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Confirmed</span>
        </div>
      </div>
    </div>
  );
}
