import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../core/constants/api_constants.dart';
import '../models/user_model.dart';

class AuthState {
  final bool isLoading;
  final UserModel? user;
  final UserRole? selectedPortal;
  final String? errorMessage;
  final UserRole? mismatchRole;

  const AuthState({
    this.isLoading = false,
    this.user,
    this.selectedPortal,
    this.errorMessage,
    this.mismatchRole,
  });

  bool get isAuthenticated => user != null;

  AuthState copyWith({
    bool? isLoading,
    UserModel? user,
    UserRole? selectedPortal,
    String? errorMessage,
    UserRole? mismatchRole,
    bool clearUser = false,
    bool clearError = false,
    bool clearMismatch = false,
    bool clearPortal = false,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      user: clearUser ? null : (user ?? this.user),
      selectedPortal: clearPortal ? null : (selectedPortal ?? this.selectedPortal),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      mismatchRole: clearMismatch ? null : (mismatchRole ?? this.mismatchRole),
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    Future.microtask(() => restoreSession());
    return const AuthState(isLoading: true);
  }

  /// Check stored session and restore valid user
  Future<void> restoreSession() async {
    try {
      final token = await SecureStorageService.getToken();
      final cachedUser = await SecureStorageService.getUser();

      if (token != null && cachedUser != null) {
        state = state.copyWith(user: cachedUser, isLoading: false);

        // Verify token against backend in background
        try {
          final res = await apiClient.get(ApiConstants.me);
          if (res is Map<String, dynamic>) {
            final refreshedUser = UserModel.fromJson(res).copyWith(token: token);
            await SecureStorageService.saveUser(refreshedUser);
            state = state.copyWith(user: refreshedUser);
          }
        } catch (e) {
          if (e is UnauthorizedException) {
            // Token expired on server
            await logout();
          }
        }
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (_) {
      state = state.copyWith(isLoading: false);
    }
  }

  void selectPortal(UserRole role) {
    state = state.copyWith(
      selectedPortal: role,
      clearError: true,
      clearMismatch: true,
    );
  }

  void resetPortal() {
    state = state.copyWith(
      clearPortal: true,
      clearError: true,
      clearMismatch: true,
    );
  }

  void clearError() {
    state = state.copyWith(clearError: true, clearMismatch: true);
  }

  /// Authoritative Login with role verification
  Future<bool> login({
    required String email,
    required String password,
    required UserRole selectedRole,
  }) async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearMismatch: true,
    );

    try {
      final response = await apiClient.post(
        ApiConstants.login,
        data: {
          'email': email.trim().toLowerCase(),
          'password': password,
        },
      );

      if (response is! Map<String, dynamic>) {
        throw ApiException(message: 'Invalid response from CIVORA server.');
      }

      final loggedInUser = UserModel.fromJson(response);

      // AUTHORITATIVE ROLE VERIFICATION
      // The selected portal is only a UI entry point; we verify the authoritative role returned by the server.
      if (loggedInUser.role != selectedRole) {
        state = state.copyWith(
          isLoading: false,
          mismatchRole: loggedInUser.role,
          errorMessage:
              'Access Denied: This account is registered with the role "${loggedInUser.role.value}", but you are signing in through the "${selectedRole.value} Portal".',
        );
        return false;
      }

      // Save token and session
      if (loggedInUser.token != null) {
        await SecureStorageService.saveToken(loggedInUser.token!);
      }
      await SecureStorageService.saveUser(loggedInUser);

      state = state.copyWith(
        isLoading: false,
        user: loggedInUser,
        selectedPortal: loggedInUser.role,
        clearError: true,
        clearMismatch: true,
      );
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.message,
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Login failed: ${e.toString()}',
      );
      return false;
    }
  }

  Future<void> logout() async {
    await SecureStorageService.clearSession();
    state = state.copyWith(
      clearUser: true,
      clearPortal: true,
      clearError: true,
      clearMismatch: true,
    );
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
