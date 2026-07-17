import 'package:flutter/material.dart';

/// Pantalla de bienvenida del andamiaje base. Se reemplaza por el flujo
/// real de onboarding (login → club → categoría → aprobación) en Fase 1.
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.shield_moon_outlined,
                size: 96,
                color: colorScheme.primary,
              ),
              const SizedBox(height: 24),
              Text(
                'FUTSAFEM',
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: colorScheme.primary,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                'App de colección para Futsal Femenino en Argentina',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 32),
              Chip(
                avatar: const Icon(Icons.check_circle, size: 18),
                label: const Text('Andamiaje base — Flutter Web'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
