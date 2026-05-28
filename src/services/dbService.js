import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

/**
 * Helper to check if Firebase/Firestore is initialized and configured.
 */
const isFirebaseReady = () => {
  return !!db;
};

/**
 * Saves the campaign parameters for a specific user.
 * Falls back to localStorage if Firebase is not configured.
 */
export async function saveCampaignParams(userId, params) {
  if (!userId) return;
  
  if (isFirebaseReady()) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { campaignParams: params }, { merge: true });
      console.log('Campaign parameters saved to Firestore.');
    } catch (error) {
      console.error('Error saving campaign parameters to Firestore:', error);
    }
  } else {
    localStorage.setItem(`campaignParams_${userId}`, JSON.stringify(params));
    localStorage.setItem('campaignParams', JSON.stringify(params)); // legacy fallback
  }
}

/**
 * Retrieves the campaign parameters for a specific user.
 */
export async function getCampaignParams(userId) {
  if (!userId) return null;

  if (isFirebaseReady()) {
    try {
      const userRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists() && docSnap.data().campaignParams) {
        return docSnap.data().campaignParams;
      }
    } catch (error) {
      console.error('Error getting campaign parameters from Firestore:', error);
    }
    return null;
  } else {
    const saved = localStorage.getItem(`campaignParams_${userId}`) || localStorage.getItem('campaignParams');
    return saved ? JSON.parse(saved) : null;
  }
}

/**
 * Saves the checklist tasks for a specific user.
 */
export async function saveTasks(userId, tasks) {
  if (!userId) return;

  if (isFirebaseReady()) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { tasks }, { merge: true });
      console.log('Tasks saved to Firestore.');
    } catch (error) {
      console.error('Error saving tasks to Firestore:', error);
    }
  } else {
    localStorage.setItem(`campaignTasks_${userId}`, JSON.stringify(tasks));
    localStorage.setItem('campaignTasks', JSON.stringify(tasks)); // legacy fallback
  }
}

/**
 * Retrieves the checklist tasks for a specific user.
 */
export async function getTasks(userId) {
  if (!userId) return null;

  if (isFirebaseReady()) {
    try {
      const userRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists() && docSnap.data().tasks) {
        return docSnap.data().tasks;
      }
    } catch (error) {
      console.error('Error getting tasks from Firestore:', error);
    }
    return null;
  } else {
    const saved = localStorage.getItem(`campaignTasks_${userId}`) || localStorage.getItem('campaignTasks');
    return saved ? JSON.parse(saved) : null;
  }
}

/**
 * Saves the CRM contacts list for a specific user.
 */
export async function saveContacts(userId, contacts) {
  if (!userId) return;

  if (isFirebaseReady()) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { contacts }, { merge: true });
      console.log('CRM contacts saved to Firestore.');
    } catch (error) {
      console.error('Error saving CRM contacts to Firestore:', error);
    }
  } else {
    localStorage.setItem(`crmContacts_${userId}`, JSON.stringify(contacts));
    localStorage.setItem('crmContacts', JSON.stringify(contacts)); // legacy fallback
  }
}

/**
 * Retrieves the CRM contacts list for a specific user.
 */
export async function getContacts(userId) {
  if (!userId) return null;

  if (isFirebaseReady()) {
    try {
      const userRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists() && docSnap.data().contacts) {
        return docSnap.data().contacts;
      }
    } catch (error) {
      console.error('Error getting CRM contacts from Firestore:', error);
    }
    return null;
  } else {
    const saved = localStorage.getItem(`crmContacts_${userId}`) || localStorage.getItem('crmContacts');
    return saved ? JSON.parse(saved) : null;
  }
}

/**
 * Saves subscription payment status.
 */
export async function savePaymentStatus(userId, status) {
  if (!userId) return;

  if (isFirebaseReady()) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { paymentStatus: status }, { merge: true });
      console.log('Payment status saved to Firestore.');
    } catch (error) {
      console.error('Error saving payment status to Firestore:', error);
    }
  } else {
    localStorage.setItem(`paymentStatus_${userId}`, JSON.stringify(status));
  }
}

/**
 * Retrieves subscription payment status.
 */
export async function getPaymentStatus(userId) {
  if (!userId) return null;

  if (isFirebaseReady()) {
    try {
      const userRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists() && docSnap.data().paymentStatus) {
        return docSnap.data().paymentStatus;
      }
    } catch (error) {
      console.error('Error getting payment status from Firestore:', error);
    }
    return null;
  } else {
    const saved = localStorage.getItem(`paymentStatus_${userId}`);
    return saved ? JSON.parse(saved) : null;
  }
}
