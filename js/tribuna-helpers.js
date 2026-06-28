import { db } from "./firebase-init.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function obtenerMensajes(clubId) {
  const q = query(collection(db, "mensajesTribuna"), where("clubId", "==", clubId || ""));
  const snap = await getDocs(q);
  const mensajes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  mensajes.sort((a, b) => (b.creadoEn && b.creadoEn.toMillis ? b.creadoEn.toMillis() : 0) - (a.creadoEn && a.creadoEn.toMillis ? a.creadoEn.toMillis() : 0));
  return mensajes.slice(0, 50);
}

export async function publicarMensaje({ autorUid, autorNombre, autorFotoUrl, clubId, texto }) {
  await addDoc(collection(db, "mensajesTribuna"), {
    autorUid,
    autorNombre: autorNombre || "",
    autorFotoUrl: autorFotoUrl || "",
    clubId: clubId || "",
    texto,
    creadoEn: serverTimestamp(),
  });
}
