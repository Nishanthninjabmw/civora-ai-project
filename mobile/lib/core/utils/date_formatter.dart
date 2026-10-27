import 'package:intl/intl.dart';

class DateFormatter {
  static final DateFormat _shortDate = DateFormat('MMM d, y');
  static final DateFormat _dateTime = DateFormat('MMM d, y • h:mm a');
  static final DateFormat _timeOnly = DateFormat('h:mm a');

  static String formatDate(dynamic date) {
    if (date == null) return 'N/A';
    try {
      final parsed = date is DateTime ? date : DateTime.parse(date.toString());
      return _shortDate.format(parsed.toLocal());
    } catch (_) {
      return date.toString();
    }
  }

  static String formatDateTime(dynamic date) {
    if (date == null) return 'N/A';
    try {
      final parsed = date is DateTime ? date : DateTime.parse(date.toString());
      return _dateTime.format(parsed.toLocal());
    } catch (_) {
      return date.toString();
    }
  }

  static String formatTime(dynamic date) {
    if (date == null) return '';
    try {
      final parsed = date is DateTime ? date : DateTime.parse(date.toString());
      return _timeOnly.format(parsed.toLocal());
    } catch (_) {
      return '';
    }
  }
}
