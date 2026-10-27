import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:civora_app/main.dart';

void main() {
  testWidgets('CIVORA smoke test renders portal entry', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: CivoraApp(),
      ),
    );

    // Initial pump
    await tester.pump();

    // Verify CIVORA brand title is rendered
    expect(find.text('CIVORA'), findsWidgets);
  });
}
