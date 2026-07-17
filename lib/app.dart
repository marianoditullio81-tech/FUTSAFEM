import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
import 'core/widgets/welcome_screen.dart';

class FutsafemApp extends StatelessWidget {
  const FutsafemApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FUTSAFEM',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      home: const WelcomeScreen(),
    );
  }
}
