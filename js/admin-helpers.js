import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  query,
  where,
  getCountFromServer,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { crearNotificacion } from "./notificaciones-helpers.js";

export async function listarUsuarias() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => d.data());
}

export async function cambiarDisponibilidadCuenta(uid, deshabilitada) {
  await updateDoc(doc(db, "users", uid), { deshabilitada });
}

export async function aprobarFotoAdmin(uid) {
  await updateDoc(doc(db, "users", uid), { estadoFoto: "aprobada" });
  await crearNotificacion(uid, "foto_aprobada", "¡Tu foto fue aprobada! Ya tenés tu figurita activa.");
}

export async function rechazarFotoAdmin(uid) {
  await updateDoc(doc(db, "users", uid), {
    estadoFoto: "sin_foto",
    fotoUrl: "",
    votosFotoAprobar: 0,
    votosFotoRechazar: 0,
  });
  await crearNotificacion(uid, "foto_rechazada", "Tu foto fue rechazada. Podés subir una nueva desde tu perfil.");
}

export async function obtenerFotosEnRevision() {
  const q = query(collection(db, "users"), where("estadoFoto", "==", "en_revision"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function contarPorEstadoFoto(estado) {
  const q = query(collection(db, "users"), where("estadoFoto", "==", estado));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function crearClub(id, nombre) {
  await setDoc(doc(db, "clubs", id), { id, nombre, escudoUrl: "", categoria: "" });
}

export async function actualizarClub(id, datos) {
  await updateDoc(doc(db, "clubs", id), datos);
}

export async function borrarClub(id) {
  await deleteDoc(doc(db, "clubs", id));
}

export async function listarJugadoras() {
  const snap = await getDocs(collection(db, "players"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function crearJugadora(datos) {
  const ref = await addDoc(collection(db, "players"), datos);
  return ref.id;
}

export async function actualizarJugadora(id, datos) {
  await updateDoc(doc(db, "players", id), datos);
}

export async function borrarJugadora(id) {
  await deleteDoc(doc(db, "players", id));
}

export async function listarStickers() {
  const snap = await getDocs(collection(db, "stickers"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function crearSticker(datos) {
  const ref = await addDoc(collection(db, "stickers"), datos);
  return ref.id;
}

export async function actualizarSticker(id, datos) {
  await updateDoc(doc(db, "stickers", id), datos);
}

export async function borrarSticker(id) {
  await deleteDoc(doc(db, "stickers", id));
}

const PROBABILIDADES_DEFAULT = {
  comun: { comun: 0.85, silver: 0.13, gold: 0.02 },
  silver: { comun: 0.70, silver: 0.25, gold: 0.05 },
  gold: { comun: 0.60, silver: 0.30, gold: 0.10 },
};

export async function obtenerConfigSobres() {
  const snap = await getDoc(doc(db, "config", "sobres"));
  return snap.exists() ? snap.data() : PROBABILIDADES_DEFAULT;
}

export async function actualizarConfigSobres(probabilidades) {
  await setDoc(doc(db, "config", "sobres"), probabilidades);
}
