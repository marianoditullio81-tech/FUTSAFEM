import { db } from "./firebase-init.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { obtenerClub, hoyComoTexto } from "./home-helpers.js";

export async function crearNotificacion(userId, tipo, texto) {
  await addDoc(collection(db, "notificaciones"), {
    userId,
    tipo,
    texto,
    leida: false,
    creadoEn: serverTimestamp(),
  });
}

export async function obtenerNotificaciones(userId) {
  const snap = await getDocs(query(collection(db, "notificaciones"), where("userId", "==", userId)));
  const notificaciones = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  notificaciones.sort((a, b) => (b.creadoEn && b.creadoEn.toMillis ? b.creadoEn.toMillis() : 0) - (a.creadoEn && a.creadoEn.toMillis ? a.creadoEn.toMillis() : 0));
  return notificaciones;
}

export async function contarNoLeidas(userId) {
  const snap = await getDocs(
    query(collection(db, "notificaciones"), where("userId", "==", userId), where("leida", "==", false))
  );
  return snap.size;
}

export async function marcarLeida(notifId) {
  await updateDoc(doc(db, "notificaciones", notifId), { leida: true });
}

export async function marcarTodasLeidas(userId) {
  const snap = await getDocs(
    query(collection(db, "notificaciones"), where("userId", "==", userId), where("leida", "==", false))
  );
  await Promise.all(snap.docs.map((d) => updateDoc(doc(db, "notificaciones", d.id), { leida: true })));
}

export function esCumpleañosHoy(fechaNacimiento) {
  if (!fechaNacimiento) return false;
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  return nacimiento.getUTCMonth() === hoy.getMonth() && nacimiento.getUTCDate() === hoy.getDate();
}

// Cualquier usuaria que abre la app puede disparar esto: busca a quién le
// toca cumpleaños hoy y genera los saludos. La marca en "avisosCumple" (con
// id determinístico por usuaria+día) evita duplicar el aviso si varias
// usuarias abren la app el mismo día; si dos lo intentan a la vez, la
// segunda escritura del marcador es rechazada por las reglas de Firestore
// (ya existe el documento) y esa usuaria se saltea silenciosamente.
export async function procesarCumpleañosDeHoy() {
  const hoy = hoyComoTexto();
  const snap = await getDocs(collection(db, "users"));
  const todas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const cumpleañeras = todas.filter((u) => esCumpleañosHoy(u.fechaNacimiento));

  for (const cumpleañera of cumpleañeras) {
    const marcaRef = doc(db, "avisosCumple", `cumple_${cumpleañera.id}_${hoy}`);
    try {
      await setDoc(marcaRef, { userId: cumpleañera.id, fecha: hoy, procesadoEn: serverTimestamp() });
    } catch {
      continue;
    }

    await crearNotificacion(
      cumpleañera.id,
      "cumpleanos_personal",
      "¡Feliz cumple! FUTSAFEM te desea que tengas un hermoso día y muchos abrazos de gooool ⚽"
    );

    const esAdulta = typeof cumpleañera.edad === "number" ? cumpleañera.edad >= 18 : true;
    if (esAdulta || cumpleañera.permiteSaludoPublico) {
      const club = await obtenerClub(cumpleañera.clubId);
      const nombreClub = club ? club.nombre : "FUTSAFEM";
      const texto = `Hoy es el cumple de ${cumpleañera.nombre} del club ${nombreClub}, FUTSAFEM te desea que tengas un hermoso día y muchos abrazos de gooool ⚽`;
      const otras = todas.filter((u) => u.id !== cumpleañera.id);
      await Promise.all(otras.map((u) => crearNotificacion(u.id, "cumpleanos_publico", texto)));
    }
  }
}
