import { db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  getCountFromServer,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function obtenerClub(clubId) {
  if (!clubId) return null;
  const snap = await getDoc(doc(db, "clubs", clubId));
  return snap.exists() ? snap.data() : null;
}

export async function obtenerClubes() {
  const snap = await getDocs(collection(db, "clubs"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function contarStickersTotales() {
  const snap = await getCountFromServer(collection(db, "stickers"));
  return snap.data().count;
}

export async function contarColeccionUnica(uid) {
  const q = query(collection(db, "userCollection"), where("userId", "==", uid));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export function hoyComoTexto() {
  const hoy = new Date();
  return hoy.toISOString().slice(0, 10);
}

export function esSobreDisponibleHoy(perfil) {
  return perfil.ultimaAperturaFecha !== hoyComoTexto();
}
