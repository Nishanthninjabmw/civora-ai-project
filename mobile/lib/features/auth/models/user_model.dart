enum UserRole {
  citizen('Citizen'),
  admin('Admin'),
  crew('Crew');

  final String value;
  const UserRole(this.value);

  static UserRole fromString(String? roleStr) {
    if (roleStr == null) return UserRole.citizen;
    final normalized = roleStr.trim().toLowerCase();
    if (normalized == 'admin') return UserRole.admin;
    if (normalized == 'crew') return UserRole.crew;
    return UserRole.citizen;
  }
}

class UserModel {
  final String id;
  final String name;
  final String email;
  final UserRole role;
  final String? token;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.token,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? 'User').toString(),
      email: (json['email'] ?? '').toString(),
      role: UserRole.fromString(json['role']?.toString()),
      token: json['token']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'email': email,
      'role': role.value,
      if (token != null) 'token': token,
    };
  }

  UserModel copyWith({
    String? id,
    String? name,
    String? email,
    UserRole? role,
    String? token,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role ?? this.role,
      token: token ?? this.token,
    );
  }
}
