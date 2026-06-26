import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  increment,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const LIMITE_SWIPES_DIARIO = 30;
const LIMITE_MATCHES_DIARIO = 5;

function hoyComoTexto() {
  return new Date().toISOString().slice(0, 10);
}

async function obtenerStickersMap() {
  const snap = await getDocs(collection(db, "stickers"));
  const map = new Map();
  snap.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
  return map;
}

async function obtenerColeccionDe(uid) {
  const snap = await getDocs(query(collection(db, "userCollection"), where("userId", "==", uid)));
  const map = new Map();
  snap.forEach((d) => map.set(d.data().stickerId, { id: d.id, ...d.data() }));
  return map;
}

async function obtenerTradesDeUsuaria(uid) {
  const [comoA, comoB] = await Promise.all([
    getDocs(query(collection(db, "trades"), where("userA", "==", uid))),
    getDocs(query(collection(db, "trades"), where("userB", "==", uid))),
  ]);
  const trades = [];
  comoA.forEach((d) => trades.push({ id: d.id, ...d.data() }));
  comoB.forEach((d) => trades.push({ id: d.id, ...d.data() }));
  return trades;
}

export async function contarSwipesHoy(uid) {
  const snap = await getDocs(
    query(collection(db, "swipes"), where("swiperId", "==", uid), where("fecha", "==", hoyComoTexto()))
  );
  return snap.size;
}

export async function contarMatchesHoy(uid) {
  const trades = await obtenerTradesDeUsuaria(uid);
  return trades.filter((t) => t.fecha === hoyComoTexto() && t.estado !== "pendiente" && t.estado !== "cancelado").length;
}

export async function obtenerColaIntercambios(uid) {
  const [stickersMap, miColeccion, trades] = await Promise.all([
    obtenerStickersMap(),
    obtenerColeccionDe(uid),
    obtenerTradesDeUsuaria(uid),
  ]);

  const propuestasEntrantes = trades.filter((t) => t.userB === uid && t.estado === "pendiente");

  const stickersConTradeActivo = new Set();
  trades
    .filter((t) => t.estado === "pendiente" || t.estado === "match")
    .forEach((t) => {
      stickersConTradeActivo.add(t.stickerA);
      stickersConTradeActivo.add(t.stickerB);
    });

  const misRepetidas = [];
  const misFaltantes = new Set();
  for (const [stickerId, sticker] of stickersMap) {
    const entrada = miColeccion.get(stickerId);
    if (entrada && entrada.cantidad > 1 && !stickersConTradeActivo.has(stickerId)) {
      misRepetidas.push({ stickerId, rareza: sticker.rareza });
    }
    if (!entrada || entrada.cantidad === 0) {
      misFaltantes.add(stickerId);
    }
  }

  const candidatosSalientes = [];
  if (misRepetidas.length > 0) {
    const repetidasGlobalesSnap = await getDocs(query(collection(db, "userCollection"), where("cantidad", ">", 1)));
    for (const d of repetidasGlobalesSnap.docs) {
      const entrada = d.data();
      if (entrada.userId === uid) continue;
      if (!misFaltantes.has(entrada.stickerId)) continue;
      if (stickersConTradeActivo.has(entrada.stickerId)) continue;
      const stickerObjetivo = stickersMap.get(entrada.stickerId);
      if (!stickerObjetivo) continue;
      const ofrecida = misRepetidas.find((r) => r.rareza === stickerObjetivo.rareza);
      if (!ofrecida) continue;
      candidatosSalientes.push({
        tipo: "saliente",
        targetUserId: entrada.userId,
        stickerObjetivoId: entrada.stickerId,
        stickerOfrecidoId: ofrecida.stickerId,
        rareza: stickerObjetivo.rareza,
      });
    }
  }

  const cola = [
    ...propuestasEntrantes.map((t) => ({
      tipo: "entrante",
      trade: t,
      stickerObjetivoId: uid === t.userA ? t.stickerB : t.stickerA,
      stickerOfrecidoId: uid === t.userA ? t.stickerA : t.stickerB,
    })),
    ...candidatosSalientes,
  ];

  return { cola, stickersMap };
}

export async function obtenerJugadorasDeStickers(stickerIds, stickersMap) {
  const playerIds = [...new Set(stickerIds.map((id) => stickersMap.get(id)?.playerId).filter(Boolean))];
  const jugadoras = new Map();
  await Promise.all(
    playerIds.map(async (id) => {
      const snap = await getDoc(doc(db, "players", id));
      if (snap.exists()) jugadoras.set(id, snap.data());
    })
  );
  return jugadoras;
}

async function registrarSwipe(uid, stickerId, direccion) {
  await addDoc(collection(db, "swipes"), {
    swiperId: uid,
    stickerId,
    direccion,
    fecha: hoyComoTexto(),
  });
}

export async function proponerIntercambio(uid, candidato) {
  await registrarSwipe(uid, candidato.stickerObjetivoId, "like");
  await addDoc(collection(db, "trades"), {
    userA: uid,
    stickerA: candidato.stickerOfrecidoId,
    userB: candidato.targetUserId,
    stickerB: candidato.stickerObjetivoId,
    estado: "pendiente",
    completadoPorA: false,
    completadoPorB: false,
    fecha: hoyComoTexto(),
  });
}

export async function descartarCandidato(uid, candidato) {
  await registrarSwipe(uid, candidato.stickerObjetivoId, "pass");
}

export async function responderPropuesta(uid, item, decision) {
  const tradeRef = doc(db, "trades", item.trade.id);
  await registrarSwipe(uid, item.stickerObjetivoId, decision);
  if (decision === "pass") {
    await updateDoc(tradeRef, { estado: "cancelado" });
    return { match: false };
  }
  await updateDoc(tradeRef, { estado: "match" });
  await completarTradePropia(uid, { ...item.trade, estado: "match" });
  return { match: true };
}

export async function completarTradePropia(uid, trade) {
  const soyA = trade.userA === uid;
  const stickerOfrecido = soyA ? trade.stickerA : trade.stickerB;
  const stickerRecibido = soyA ? trade.stickerB : trade.stickerA;

  const refOfrecido = doc(db, "userCollection", `${uid}_${stickerOfrecido}`);
  await updateDoc(refOfrecido, { cantidad: increment(-1) });

  const refRecibido = doc(db, "userCollection", `${uid}_${stickerRecibido}`);
  const snapRecibido = await getDoc(refRecibido);
  if (snapRecibido.exists()) {
    await updateDoc(refRecibido, { cantidad: increment(1) });
  } else {
    await setDoc(refRecibido, { userId: uid, stickerId: stickerRecibido, cantidad: 1, bloqueada: false });
  }

  const tradeRef = doc(db, "trades", trade.id);
  await updateDoc(tradeRef, soyA ? { completadoPorA: true } : { completadoPorB: true });

  const actualizado = await getDoc(tradeRef);
  const data = actualizado.data();
  if (data.completadoPorA && data.completadoPorB) {
    await updateDoc(tradeRef, { estado: "completado" });
  }
}

export async function sincronizarTradesPropios(uid) {
  const trades = await obtenerTradesDeUsuaria(uid);
  for (const trade of trades) {
    if (trade.estado !== "match") continue;
    const soyA = trade.userA === uid;
    const yaCompleteMiParte = soyA ? trade.completadoPorA : trade.completadoPorB;
    if (!yaCompleteMiParte) {
      await completarTradePropia(uid, trade);
    }
  }
}

export { LIMITE_SWIPES_DIARIO, LIMITE_MATCHES_DIARIO };
