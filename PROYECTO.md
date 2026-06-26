# PROYECTO.md — FUTSAFEM (álbum digital de figuritas de futsal femenino)

Este documento es la fuente de verdad del proyecto. Claude Code debe leerlo antes de
programar y respetarlo en cada sesión.

---

## 1. Qué es la app

App de **álbum de figuritas digitales** de jugadoras y cuerpo técnico del futsal femenino
(Primera C, AFA). Las usuarias coleccionan figuritas, abren sobres, completan el álbum e
intercambian repetidas con otras usuarias mediante un sistema de "match" por swipe.
Moneda interna: **FutsaCoins** (🪙).

---

## 2. Stack técnico — REGLA DE COSTO CERO

Todo el MVP debe poder construirse y correr **sin ningún costo** (planes gratuitos):

- **Frontend:** HTML + CSS + JavaScript simples, con **Tailwind por CDN** (así ya vienen
  las pantallas de Stitch). Sin paso de build, sin framework, sin npm obligatorio.
- **Backend / datos:** **Firebase, plan Spark (gratis)**, usando el SDK por CDN:
  - **Authentication** (registro y login por email/contraseña).
  - **Firestore** (base de datos).
  - **Storage** (fotos de jugadoras y cuerpo técnico).
- **NO usar Cloud Functions** en el MVP (requieren plan de pago Blaze). Toda la lógica va
  del lado del cliente, protegida con **reglas de seguridad de Firestore**.
- **Deploy:** **Firebase Hosting** (gratis).

> Nota de seguridad: hacer la lógica del lado del cliente es válido para un MVP de prueba,
> pero es menos a prueba de trampas. El "endurecimiento" (RNG de sobres en servidor,
> límites e intercambios atómicos) se hace en una fase posterior, al pasar a Blaze.

---

## 3. Identidad visual (extraída del diseño de Stitch)

Respetar estos tokens; no rediseñar.

- **Fondo / surface:** `#111316` (oscuro casi negro)
- **Primario (lila/rosa):** `#ecb2ff`
- **Terciario (cian):** `#00dbe9`
- **Acento (lima):** `#c3f400`
- **Texto principal:** `#e2e2e6`
- **Tipografías:** Hanken Grotesk (texto), Archivo Narrow (títulos), JetBrains Mono (datos)
- **Íconos:** Material Symbols Outlined
- Tema oscuro por defecto (`class="dark"`).

Los diseños completos están en la carpeta exportada de Stitch
(`stitch_futsal_lbum_digital/`), una subcarpeta por pantalla con su `code.html`.

---

## 4. Roles de usuario

- **Hincha:** no sube foto. Accede a álbum, intercambio y (fase 2) tribuna. No genera figurita.
- **Jugadora:** sube foto obligatoria con camiseta. Genera figurita tras aprobación.
- **Cuerpo técnico (CT):** mismo flujo que jugadora.
- **Admin:** aprueba fotos, gestiona clubes, jugadoras, sobres y rarezas (fase 2).

---

## 5. Pantallas del MVP (FASE 1) — construir SOLO estas

Usar como base las pantallas de Stitch indicadas entre paréntesis:

1. Bienvenida / acceso (`bienvenida_y_acceso_futsafem`)
2. Registro jugadora (`registro_jugadora_actualizado`)
3. Registro cuerpo técnico (`registro_cuerpo_t_cnico_con_foto`)
4. Registro hincha (`registro_fan_o_hinchada`)
5. Registro: fecha de nacimiento (`registro_fecha_de_nacimiento`)
6. Registro: validación de edad (`registro_validaci_n_de_edad`)
7. Autorización del tutor (`autorizaci_n_del_tutor`)
8. Esperando consentimiento (`registro_esperando_consentimiento`)
9. Inicio de sesión (`inicio_de_sesi_n_futsafem`)
10. Home (`home_primera_c_futsal`)
11. Álbum (`lbum_digital`)
12. Abrir sobre (`apertura_de_sobre_inicio`)
13. Resultado de apertura (`resultado_de_apertura`)
14. Mercado de pases / intercambio (`mercado_de_pases`)
15. Celebración de match (`celebraci_n_de_match_mercado_de_pases`)
16. Perfil de usuario (`perfil_de_usuario_futsafem`)

Todo lo demás (paneles de admin, páginas de clubes, tienda, billetera, sponsors, 2FA,
validación social, tribuna) **queda para fases posteriores**. No construir todavía.

---

## 6. Modelo de datos (Firestore)

Colecciones principales:

- **users**: `uid`, `nombre`, `apodo`, `email`, `rol` (hincha|jugadora|ct|admin),
  `clubId`, `categoria`, `puesto`, `fechaNacimiento`, `edad` (calculada),
  `fotoUrl`, `estadoFoto` (sin_foto|en_revision|aprobada|rechazada),
  `estadoConsentimiento` (no_requerido|pendiente|aprobado), `futsacoins`, `rachaActual`.
- **clubs**: `id`, `nombre`, `escudoUrl`, `categoria`.
- **players**: `id`, `clubId`, `nombre`, `rol` (player|coach), `puesto`, `numero`.
- **stickers** (figuritas): `id`, `playerId`, `rareza` (comun|silver|gold|epica),
  `imagenUrl`, `temporada`.
- **userCollection**: `id`, `userId`, `stickerId`, `cantidad`, `bloqueada`.
  (cantidad > 1 = repetida; bloqueada = en trade activo).
- **trades**: `id`, `userA`, `userB`, `stickerA`, `stickerB`,
  `estado` (pendiente|match|completado|cancelado).
- **swipes**: `id`, `swiperId`, `targetUserId`, `stickerId`, `direccion` (like|pass).
- **packsLog**: historial de sobres abiertos (auditoría).

---

## 7. Reglas del juego (MVP)

### Sobres (probabilidades, configurables)
- **Sobre Común (3 figus):** Común 85% / Silver 13% / Gold 2%.
- **Sobre Silver (4 figus):** 1 Silver garantizada; resto Común 70% / Silver 25% / Gold 5%.
- **Sobre Gold (5 figus):** 1 Gold garantizada; resto Común 60% / Silver 30% / Gold 10%.
- **Épica:** NO sale en sobres normales (solo eventos, fase posterior).
- Las repetidas NO se evitan: son intencionales (alimentan el intercambio).

### Racha diaria (ciclo de 7 días)
- Días 1–4 y 6: 1 sobre común. Día 5: 1 sobre silver. Día 7: 1 sobre gold + créditos.
- Si se corta la racha, vuelve al día 1.

### Intercambio (mercado de pases / "Tinder")
- Solo aparecen intercambios posibles 1 a 1 y de **misma rareza**.
- Solo se intercambian repetidas; nunca figuritas únicas ni épicas.
- Swipe derecha = like; doble like (de ambas) = **match automático**, se intercambia y se registra.
- Límites diarios (configurables): ~30 swipes y ~5 matches por día.

---

## 8. Manejo de menores y consentimiento (OBLIGATORIO)

- En el registro se pide **fecha de nacimiento** y se calcula la edad.
- Si la jugadora es **menor de 18**:
  - Su figurita queda en estado **pendiente** hasta que un **tutor** apruebe el consentimiento.
  - Puede usar la app mientras tanto (álbum, intercambio), pero su figurita no se activa.
  - **Sin compras dentro de la app** para menores.
- El texto del consentimiento está en `consentimiento_tutor_menor.md`. En la app solo se
  muestra la **edad** (no la fecha exacta), que se guarda internamente.
- Pantallas involucradas: validación de edad → autorización del tutor → esperando consentimiento.

---

## 9. Roadmap

### FASE 1 — MVP núcleo (GRATIS) ← empezar acá
Onboarding (registro + login + control de edad + consentimiento del tutor), Home, Álbum,
abrir sobres, mercado de pases (intercambio), perfil. Una app jugable de punta a punta.

### FASE 2 — Comunidad y administración (sigue siendo gratis)
- Validación social de fotos (otras usuarias confirman identidad).
- Tribuna / foros (general y por club).
- Perfiles sociales e interacciones.
- Páginas de cada club (las ~20 ya diseñadas).
- Panel de administración: aprobación de fotos, gestión de jugadoras, clubes, sobres y rarezas.
- Notificaciones (incluido aviso de cumpleaños).
- Endurecimiento anti-trampa de sobres e intercambios.

### FASE 3 — Monetización (acá aparecen costos y repaso legal)
- Tienda de FutsaCoins y sobres pagos.
- Billetera virtual / integración con Mercado Pago.
- Sponsors y sobres temáticos.
- Fantasy futsal con estadísticas reales.
- Seguridad avanzada (2FA), estadísticas avanzadas, membresía premium.
- **Antes de monetizar imágenes de menores: revisión del consentimiento por abogado/a matriculado/a.**

---

## 10. Cómo construir (instrucciones para Claude Code)

- Construir **un flujo a la vez**, no todo junto. No avanzar a la siguiente pantalla hasta
  que la anterior funcione.
- Orden sugerido: (1) configurar Firebase y estructura → (2) registro + login + menores →
  (3) Home con datos reales → (4) Álbum → (5) abrir sobre → (6) mercado de pases.
- Respetar el diseño de Stitch (colores, tipografías, layout). No rediseñar.
- Antes de programar cada bloque, proponer un plan corto y esperar la confirmación del usuario.
