import 'package:flutter/material.dart';

/// Tema base de FUTSAFEM. Los colores institucionales por club viven en
/// `clubs.primaryColor` / `clubs.secondaryColor` (ver Firestore schema);
/// este es el tema neutro de la app antes de resolver el club del usuario.
class AppTheme {
  AppTheme._();

  static const Color seedColor = Color(0xFF7C3AED);

  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: seedColor),
    );
  }

  static ThemeData get dark {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: seedColor,
        brightness: Brightness.dark,
      ),
    );
  }
}
