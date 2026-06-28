import { db } from "./firebase-init.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
  getCountFromServer,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const UMBRAL_VOTOS = 3;

export async function contarFotosPendientes(uidActual) {
  const q = query(collection(db, "users"), where("estadoFoto", "==", "en_revision"));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function obtenerFotosPendientes(uidActual) {
  const q = query(collection(db, "users"), where("estadoFoto", "==", "en_revision"));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data())
    .filter((u) => u.uid !== uidActual);
}

export async function yaVoteEstaFoto(targetUid, voterUid) {
  const snap = await getDoc(doc(db, "votosFoto", `${targetUid}_${voterUid}`));
  return snap.exists();
}

export async function votarFoto(targetUid, voterUid, voto) {
  const voteRef = doc(db, "votosFoto", `${targetUid}_${voterUid}`);
  const userRef = doc(db, "users", targetUid);

  await runTransaction(db, async (tx) => {
    const voteSnap = await tx.get(voteRef);
    if (voteSnap.exists()) {
      throw new Error("Ya votaste esta foto.");
    }

    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("Esta usuaria ya no existe.");
    }

    const datos = userSnap.data();
    if (datos.estadoFoto !== "en_revision") {
      throw new Error("Esta foto ya fue resuelta.");
    }

    const votosAprobar = (datos.votosFotoAprobar || 0) + (voto === "aprobar" ? 1 : 0);
    const votosRechazar = (datos.votosFotoRechazar || 0) + (voto === "rechazar" ? 1 : 0);

    let estadoFoto = "en_revision";
    if (votosAprobar >= UMBRAL_VOTOS) {
      estadoFoto = "aprobada";
    } else if (votosRechazar >= UMBRAL_VOTOS) {
      // No se borra la foto todavía: queda visible para que la administradora
      // confirme el rechazo desde el panel de admin.
      estadoFoto = "rechazada_revision";
    }

    tx.set(voteRef, { targetUid, voterUid, voto, creadoEn: serverTimestamp() });
    tx.update(userRef, { votosFotoAprobar: votosAprobar, votosFotoRechazar: votosRechazar, estadoFoto });
  });
}

export async function obtenerFotosRechazadasPendientes() {
  const q = query(collection(db, "users"), where("estadoFoto", "==", "rechazada_revision"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function confirmarRechazoFoto(targetUid) {
  const userRef = doc(db, "users", targetUid);
  await updateDoc(userRef, {
    estadoFoto: "sin_foto",
    fotoUrl: "",
    votosFotoAprobar: 0,
    votosFotoRechazar: 0,
  });
}
