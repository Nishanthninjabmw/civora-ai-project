import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../features/auth/models/user_model.dart';

class SecureStorageService {
  static const _storage = FlutterSecureStorage();
  static const String _keyToken = 'civora_token';
  static const String _keyUser = 'civora_user';

  /// Save JWT token
  static Future<void> saveToken(String token) async {
    try {
      await _storage.write(key: _keyToken, value: token);
    } catch (_) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyToken, token);
    }
  }

  /// Read JWT token
  static Future<String?> getToken() async {
    try {
      final token = await _storage.read(key: _keyToken);
      if (token != null && token.isNotEmpty) return token;
    } catch (_) {}

    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyToken);
  }

  /// Save authenticated User object
  static Future<void> saveUser(UserModel user) async {
    final userJson = jsonEncode(user.toJson());
    try {
      await _storage.write(key: _keyUser, value: userJson);
    } catch (_) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyUser, userJson);
    }
  }

  /// Read cached User object
  static Future<UserModel?> getUser() async {
    String? userJson;
    try {
      userJson = await _storage.read(key: _keyUser);
    } catch (_) {}

    if (userJson == null || userJson.isEmpty) {
      final prefs = await SharedPreferences.getInstance();
      userJson = prefs.getString(_keyUser);
    }

    if (userJson != null && userJson.isNotEmpty) {
      try {
        final map = jsonDecode(userJson) as Map<String, dynamic>;
        return UserModel.fromJson(map);
      } catch (_) {}
    }
    return null;
  }

  /// Clear token and session
  static Future<void> clearSession() async {
    try {
      await _storage.delete(key: _keyToken);
      await _storage.delete(key: _keyUser);
    } catch (_) {}

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyToken);
    await prefs.remove(_keyUser);
  }
}
