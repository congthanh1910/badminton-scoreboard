import { initializeApp } from 'firebase/app';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  increment,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import {
  type User,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { Nullable } from '@/utils/types';
import { pick } from 'lodash';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

export class Auth {
  login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }
  logout() {
    return signOut(auth);
  }
  onStateChanged(on: (uid: Nullable<User>) => void) {
    return onAuthStateChanged(
      auth,
      user => on(user),
      () => on(null)
    );
  }
}

export class Match {
  private fields = ['set'] as const;
  private value = {
    name: { a: 'A', b: 'B' },
    score: { a: 0, b: 0 },
    player: {
      a: [
        { name: 'player a 1', serve: false },
        { name: 'player a 2', serve: false },
      ],
      b: [
        { name: 'player b 1', serve: false },
        { name: 'player b 2', serve: false },
      ],
    },
  };
  create() {
    return addDoc(collection(db, 'matches'), {
      set: { st: this.value, nd: this.value, rd: this.value },
    });
  }
  async updateName(id: string, set: 'st' | 'nd' | 'rd', team: 'a' | 'b', name: string) {
    return updateDoc(doc(db, 'matches', id), {
      [`set.${set}.name.${team}`]: name,
    });
  }
  async updatePlayerName(
    id: string,
    set: 'st' | 'nd' | 'rd',
    team: 'a' | 'b',
    name1: string,
    name2: string
  ) {
    return updateDoc(doc(db, 'matches', id), {
      [`set.${set}.player.${team}`]: [
        { name: name1, serve: false },
        { name: name2, serve: false },
      ],
    });
  }
  async updateScore(id: string, set: 'st' | 'nd' | 'rd', team: 'a' | 'b', value: number) {
    return updateDoc(doc(db, 'matches', id), {
      [`set.${set}.score.${team}`]: increment(value),
    });
  }
  async updatePlayer(
    id: string,
    set: 'st' | 'nd' | 'rd',
    values: {
      a: [{ name: string; serve: boolean }, { name: string; serve: boolean }];
      b: [{ name: string; serve: boolean }, { name: string; serve: boolean }];
    }
  ) {
    return updateDoc(doc(db, 'matches', id), {
      [`set.${set}.player`]: values,
    });
  }
  onListener(id: string, next: (data: IMatch) => void) {
    return onSnapshot(doc(db, 'matches', id), doc => {
      if (!doc.exists()) return;
      next({ id: doc.id, ...pick(doc.data(), this.fields) });
    });
  }
}

export interface IMatch {
  id: string;
  set: {
    st: {
      name: { a: string; b: string };
      score: { a: number; b: number };
      player: {
        a: [{ name: string; serve: boolean }, { name: string; serve: boolean }];
        b: [{ name: string; serve: boolean }, { name: string; serve: boolean }];
      };
    };
    nd: {
      name: { a: string; b: string };
      score: { a: number; b: number };
      player: {
        a: [{ name: string; serve: boolean }, { name: string; serve: boolean }];
        b: [{ name: string; serve: boolean }, { name: string; serve: boolean }];
      };
    };
    rd: {
      name: { a: string; b: string };
      score: { a: number; b: number };
      player: {
        a: [{ name: string; serve: boolean }, { name: string; serve: boolean }];
        b: [{ name: string; serve: boolean }, { name: string; serve: boolean }];
      };
    };
  };
}
