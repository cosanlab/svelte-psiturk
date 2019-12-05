// Initialize firebase
import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBSDQTQrnklilGdmyZcEXMGhIwg0dFpNlY',
  authDomain: 'thought-segmentation.firebaseapp.com',
  databaseURL: 'https://thought-segmentation.firebaseio.com',
  projectId: 'thought-segmentation',
  storageBucket: 'thought-segmentation.appspot.com',
  messagingSenderId: '456731753647',
  appId: '1:456731753647:web:079b4e850e4c03f2e1a85a'
};

firebase.initializeApp(firebaseConfig);

// Export firebase globals for use elsewhere in the app
export const db = firebase.firestore();
export const storage = firebase.storage();

// Functions to parse the URL to get workerID, hitID, and assignmentID
const unescapeURL = (s) => decodeURIComponent(s.replace(/\+/g, '%20'));
const getURLParams = () => {
  const params = {};
  const m = window.location.href.match(/[\\?&]([^=]+)=([^&#]*)/g);
  if (m) {
    let i = 0;
    while (i < m.length) {
      const a = m[i].match(/.([^=]+)=(.*)/);
      params[unescapeURL(a[1])] = unescapeURL(a[2]);
      i += 1;
    }
  }
  if (!params.workerId && !params.assignmentId && !params.hitId) {
    params.workerId = 'test-worker';
    params.assignmentId = 'test-assignment';
    params.hitId = 'test-hit';
  }
  return params;
};

// Use those functions to get the window URL params and make them available throughout the app
export const params = getURLParams();

// Shuffle array elements inplace: https://javascript.info/task/shuffle
export const fisherYatesShuffle = (array) => {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i

    // swap elements array[i] and array[j]
    // we use "destructuring assignment" syntax to achieve that
    // you'll find more details about that syntax in later chapters
    // same can be written as:
    // let t = array[i]; array[i] = array[j]; array[j] = t
    // eslint-disable-next-line no-param-reassign
    [array[i], array[j]] = [array[j], array[i]];
  }
};
