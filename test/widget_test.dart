import 'package:flutter_test/flutter_test.dart';

import 'package:futsafem/app.dart';

void main() {
  testWidgets('Welcome screen renders FUTSAFEM branding', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const FutsafemApp());

    expect(find.text('FUTSAFEM'), findsOneWidget);
    expect(
      find.text('App de colección para Futsal Femenino en Argentina'),
      findsOneWidget,
    );
  });
}
