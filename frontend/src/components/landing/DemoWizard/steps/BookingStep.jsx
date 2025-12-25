import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Video, MapPin, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDemoWizard } from '../index';

const BOOKING_TYPES = [
  { id: 'demo', name: 'Product Demo', duration: '30 min', icon: Video },
  { id: 'consultation', name: 'Consultation', duration: '45 min', icon: Calendar },
  { id: 'meeting', name: 'In-Person Meeting', duration: '60 min', icon: MapPin }
];

const TIME_SLOTS = [
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM'
];

const CALENDAR_DAYS = [
  { day: 'Mon', date: 16, available: true },
  { day: 'Tue', date: 17, available: true },
  { day: 'Wed', date: 18, available: false },
  { day: 'Thu', date: 19, available: true },
  { day: 'Fri', date: 20, available: true },
  { day: 'Sat', date: 21, available: false },
  { day: 'Sun', date: 22, available: false }
];

export const BookingStep = () => {
  const { currentStepData } = useDemoWizard();
  const [selectedType, setSelectedType] = useState('demo');
  const [selectedDay, setSelectedDay] = useState(16);
  const [selectedTime, setSelectedTime] = useState('10:00 AM');

  const StepIcon = currentStepData.icon;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-700 mb-4">
          <StepIcon className="w-4 h-4 mr-2" />
          {currentStepData.estimatedTime}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          {currentStepData.title}
        </h2>

        <p className="text-lg text-gray-600 max-w-2xl mx-auto">{currentStepData.description}</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: Booking Types */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Appointment Types</h3>
            <div className="space-y-3">
              {BOOKING_TYPES.map((type) => {
                const TypeIcon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={cn(
                      'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all',
                      selectedType === type.id
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          selectedType === type.id ? 'bg-pink-100' : 'bg-gray-100'
                        )}
                      >
                        <TypeIcon
                          className={cn(
                            'w-5 h-5',
                            selectedType === type.id ? 'text-pink-600' : 'text-gray-500'
                          )}
                        />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{type.name}</p>
                        <p className="text-sm text-gray-500">{type.duration}</p>
                      </div>
                    </div>
                    {selectedType === type.id && (
                      <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar Integrations */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Calendar Sync</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Google', color: 'bg-red-500', connected: true },
                { name: 'Outlook', color: 'bg-blue-500', connected: false },
                { name: 'Calendly', color: 'bg-purple-500', connected: false }
              ].map((cal) => (
                <div
                  key={cal.name}
                  className={cn(
                    'p-3 rounded-xl border text-center transition-all',
                    cal.connected ? 'border-pink-200 bg-pink-50' : 'border-gray-200'
                  )}
                >
                  <div
                    className={`w-8 h-8 ${cal.color} rounded-lg flex items-center justify-center mx-auto mb-2 text-white font-bold text-sm`}
                  >
                    {cal.name[0]}
                  </div>
                  <p className="text-xs font-medium text-gray-700">{cal.name}</p>
                  {cal.connected && (
                    <span className="text-xs text-pink-600">Connected</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Column: Calendar Preview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-white rounded-xl border p-6 sticky top-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">December 2024</h3>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Week View */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {CALENDAR_DAYS.map((day) => (
                <button
                  key={day.date}
                  disabled={!day.available}
                  onClick={() => day.available && setSelectedDay(day.date)}
                  className={cn(
                    'p-3 rounded-xl text-center transition-all',
                    !day.available && 'opacity-40 cursor-not-allowed',
                    selectedDay === day.date
                      ? 'bg-pink-500 text-white'
                      : day.available
                        ? 'bg-gray-50 hover:bg-gray-100'
                        : 'bg-gray-50'
                  )}
                >
                  <p className="text-xs font-medium mb-1">{day.day}</p>
                  <p className="text-lg font-bold">{day.date}</p>
                </button>
              ))}
            </div>

            {/* Time Slots */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Available Times
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={cn(
                      'p-3 rounded-lg text-sm font-medium transition-all',
                      selectedTime === time
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Booking Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 p-4 bg-gradient-to-r from-pink-100 to-rose-100 rounded-xl border border-pink-200"
            >
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-pink-600" />
                <span className="text-sm font-semibold text-pink-700">Booking Preview</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-gray-900">
                    {BOOKING_TYPES.find((t) => t.id === selectedType)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium text-gray-900">Dec {selectedDay}, 2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium text-gray-900">{selectedTime}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BookingStep;
