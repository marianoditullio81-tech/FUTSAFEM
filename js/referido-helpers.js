import { db } from "./firebase-init.js";
import {
  doc, setDoc, getDoc, getDocs, updateDoc, collection, query, where, limit,
  increment,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const COINS_POR_INVITADA = 30;
export const BONUS_ARMAR_EQUIPO = 200;
export const BONUS_INTEGRANTE_EQUIPO = 20;

function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

// Called at registration time to create the referral code and optionally link to a referrer.
export async function inicializarReferidos(uid, nombre, codigoReferente) {
  const codigo = generarCodigo();
  await setDoc(doc(db, 'codigosReferido', codigo), { uid, nombre });

  if (codigoReferente) {
    const refSnap = await getDoc(doc(db, 'codigosReferido', codigoReferente.toUpperCase()));
    if (refSnap.exists()) {
      const invitadoraId = refSnap.data().uid;
      if (invitadoraId !== uid) {
        await setDoc(doc(db, 'referidos', `${invitadoraId}_${uid}`), {
          invitadoraId,
          invitadaId: uid,
          fechaRegistro: new Date().toISOString(),
          emailVerificado: false,
          acreditado: false,
        });
      }
    }
  }

  return codigo;
}

// Called on home.html load: mark email verified + credit invitadora + collect own pending rewards.
export async function procesarReferidosDeUsuaria(user) {
  if (!user.emailVerified) {
    await cobrarPremiosPendientes(user.uid);
    return;
  }

  const q = query(
    collection(db, 'referidos'),
    where('invitadaId', '==', user.uid),
    where('emailVerificado', '==', false),
    limit(1),
  );
  const snaps = await getDocs(q);

  for (const snap of snaps.docs) {
    const data = snap.data();
    try {
      await updateDoc(snap.ref, { emailVerificado: true });
      await setDoc(doc(db, 'premiosPendientes', `ref_${snap.id}_base`), {
        userId: data.invitadoraId,
        tipo: 'referido_verificado',
        coins: COINS_POR_INVITADA,
        origen: user.uid,
        creadoEn: new Date().toISOString(),
        acreditado: false,
      });
      await _verificarBonusEquipo(data.invitadoraId);
    } catch (_) {
      // concurrent write by another client is fine — dedup by doc ID
    }
  }

  await cobrarPremiosPendientes(user.uid);
}

async function _verificarBonusEquipo(invitadoraId) {
  const invitadoraSnap = await getDoc(doc(db, 'users', invitadoraId));
  if (!invitadoraSnap.exists() || invitadoraSnap.data().bonusEquipoAcreditado) return;

  const q = query(
    collection(db, 'referidos'),
    where('invitadoraId', '==', invitadoraId),
    where('emailVerificado', '==', true),
  );
  const snaps = await getDocs(q);
  if (snaps.size < 5) return;

  try {
    await updateDoc(doc(db, 'users', invitadoraId), { bonusEquipoAcreditado: true });
  } catch (_) {
    return; // already set by another concurrent client
  }

  await setDoc(doc(db, 'premiosPendientes', `equipo_${invitadoraId}`), {
    userId: invitadoraId,
    tipo: 'bonus_armar_equipo',
    coins: BONUS_ARMAR_EQUIPO,
    origen: invitadoraId,
    creadoEn: new Date().toISOString(),
    acreditado: false,
  });

  const cinco = snaps.docs.slice(0, 5);
  for (const refDoc of cinco) {
    const invitadaId = refDoc.data().invitadaId;
    await setDoc(doc(db, 'premiosPendientes', `miembro_${invitadoraId}_${invitadaId}`), {
      userId: invitadaId,
      tipo: 'bonus_integrante_equipo',
      coins: BONUS_INTEGRANTE_EQUIPO,
      origen: invitadoraId,
      creadoEn: new Date().toISOString(),
      acreditado: false,
    });
  }
}

// Self-credits any pending rewards for the current user.
export async function cobrarPremiosPendientes(uid) {
  const q = query(
    collection(db, 'premiosPendientes'),
    where('userId', '==', uid),
    where('acreditado', '==', false),
  );
  const snaps = await getDocs(q);
  let totalCoins = 0;
  for (const snap of snaps.docs) {
    try {
      await updateDoc(snap.ref, { acreditado: true });
      totalCoins += snap.data().coins || 0;
    } catch (_) {
      // already collected
    }
  }
  if (totalCoins > 0) {
    await updateDoc(doc(db, 'users', uid), { futsacoins: increment(totalCoins) });
  }
  return totalCoins;
}

export async function contarReferidosVerificados(uid) {
  const q = query(
    collection(db, 'referidos'),
    where('invitadoraId', '==', uid),
    where('emailVerificado', '==', true),
  );
  const snaps = await getDocs(q);
  return snaps.size;
}
