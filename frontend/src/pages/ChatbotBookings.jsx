import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  RefreshCw,
  Calendar,
  Clock,
  Users,
  Phone,
  User,
  Check,
  X,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { chatbots, bookings } from '../utils/api';
import BookingCalendar from '../components/BookingCalendar';

export default function ChatbotBookings() {
  const { t, i18n } = useTranslation('dashboard');

  // Use localized month and weekday names
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };
  const { id } = useParams();
  const navigate = useNavigate();

  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Calendar state
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(null);

  // Calendar data
  const [calendarData, setCalendarData] = useState(null);
  const [stats, setStats] = useState({ pending: 0, confirmed: 0, cancelled: 0, total: 0 });

  // Selected day bookings
  const [selectedBookings, setSelectedBookings] = useState([]);

  // Action loading states
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    loadBot();
  }, [id]);

  useEffect(() => {
    if (bot) {
      loadCalendar();
    }
  }, [bot, year, month]);

  useEffect(() => {
    if (calendarData && selectedDate) {
      const dayData = calendarData.days[selectedDate];
      setSelectedBookings(dayData?.bookings || []);
    } else {
      setSelectedBookings([]);
    }
  }, [calendarData, selectedDate]);

  const loadBot = async () => {
    try {
      const response = await chatbots.get(id);
      setBot(response.data);
    } catch (err) {
      setError(t('bookings.error.loadFailed', 'Failed to load chatbot'));
      console.error(err);
    }
  };

  const loadCalendar = async () => {
    try {
      setRefreshing(true);
      const response = await bookings.getCalendar(id, year, month);
      setCalendarData(response.data);
      setStats(response.data.stats || { pending: 0, confirmed: 0, cancelled: 0, total: 0 });
    } catch (err) {
      console.error('Failed to load calendar:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMonthChange = (newYear, newMonth) => {
    setYear(newYear);
    setMonth(newMonth);
    setSelectedDate(null);
  };

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
  };

  const handleRefresh = () => {
    loadCalendar();
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      setActionLoading(prev => ({ ...prev, [bookingId]: true }));
      await bookings.updateStatus(id, bookingId, newStatus);
      // Refresh calendar to get updated data
      await loadCalendar();
    } catch (err) {
      console.error('Failed to update booking status:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return badges[status] || badges.pending;
  };

  const getBookingTypeLabel = (type) => {
    const labels = {
      room: t('bookings.types.room', 'Room Booking'),
      meeting: t('bookings.types.meeting', 'Meeting'),
      table: t('bookings.types.table', 'Table Reservation'),
      appointment: t('bookings.types.appointment', 'Appointment'),
      service: t('bookings.types.service', 'Service'),
      event: t('bookings.types.event', 'Event'),
      other: t('bookings.types.other', 'Booking')
    };
    return labels[type] || labels.other;
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: t('bookings.pending', 'Pending'),
      confirmed: t('bookings.confirmed', 'Confirmed'),
      cancelled: t('bookings.cancelled', 'Cancelled')
    };
    return labels[status] || status;
  };

  const getWhatsAppLink = (phone) => {
    // Convert Arabic numerals to Western numerals
    const arabicToWestern = {
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
      '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
    };

    let cleaned = phone;
    // Replace Arabic numerals with Western numerals
    Object.entries(arabicToWestern).forEach(([arabic, western]) => {
      cleaned = cleaned.replace(new RegExp(arabic, 'g'), western);
    });

    // Remove all non-digit characters except +
    cleaned = cleaned.replace(/[^\d+]/g, '');

    // Add Egypt country code if starts with 0
    if (cleaned.startsWith('0')) {
      cleaned = '20' + cleaned.substring(1);
    }

    return `https://wa.me/${cleaned}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/chatbots')}
            className="text-blue-600 hover:underline"
          >
            {t('bookings.backToChatbots', 'Back to Chatbots')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/chatbots/${id}`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {t('bookings.title', 'Bookings')} - {bot?.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {t('bookings.subtitle', 'Manage reservations and appointments')}
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {t('bookings.refresh', 'Refresh')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-sm text-gray-500">{t('bookings.pending', 'Pending')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.confirmed}</p>
                <p className="text-sm text-gray-500">{t('bookings.confirmed', 'Confirmed')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">{t('bookings.total', 'Total This Month')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar */}
          <div>
            <BookingCalendar
              year={year}
              month={month}
              selectedDate={selectedDate}
              bookingsByDate={calendarData?.days || {}}
              onDateSelect={handleDateSelect}
              onMonthChange={handleMonthChange}
            />
          </div>

          {/* Selected Day Bookings */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedDate ? formatDate(selectedDate) : t('bookings.selectDate', 'Select a date')}
            </h3>

            {!selectedDate && (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('bookings.clickToSee', 'Click on a date to see bookings')}</p>
              </div>
            )}

            {selectedDate && selectedBookings.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('bookings.noBookings', 'No bookings for this date')}</p>
              </div>
            )}

            {selectedDate && selectedBookings.length > 0 && (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {selectedBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          {getBookingTypeLabel(booking.booking_type)}
                        </span>
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {booking.guest_name}
                        </h4>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(booking.status)}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a
                          href={getWhatsAppLink(booking.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {booking.phone}
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{booking.time}</span>
                        {booking.duration && (
                          <span className="text-gray-400">({booking.duration})</span>
                        )}
                      </div>

                      {booking.people_count && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>{booking.people_count} {t('bookings.people', 'people')}</span>
                        </div>
                      )}

                      {booking.purpose && (
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-400" />
                          <span>{booking.purpose}</span>
                        </div>
                      )}

                      {booking.extras && booking.extras.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {booking.extras.map((extra, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                            >
                              {extra}
                            </span>
                          ))}
                        </div>
                      )}

                      {booking.notes && (
                        <p className="text-gray-500 italic mt-2">"{booking.notes}"</p>
                      )}
                    </div>

                    {/* Actions */}
                    {booking.status === 'pending' && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                          disabled={actionLoading[booking.id]}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading[booking.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          {t('bookings.confirm', 'Confirm')}
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                          disabled={actionLoading[booking.id]}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white text-red-600 text-sm font-medium border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        >
                          {actionLoading[booking.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          {t('bookings.cancel', 'Cancel')}
                        </button>
                      </div>
                    )}

                    {/* WhatsApp Contact Button */}
                    <a
                      href={getWhatsAppLink(booking.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 mt-3 px-3 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      {t('bookings.contactWhatsApp', 'Contact on WhatsApp')}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
