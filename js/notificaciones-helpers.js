import { db } from "./firebase-init.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
