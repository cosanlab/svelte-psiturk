const fs = require('fs');
const firebase = require('firebase');
require('firebase/firestore');

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

const db = firebase.firestore();
const data = fs.readFileSync('firebase_seed.json');
const docs = JSON.parse(data);

docs.forEach((doc) => {
  db.collection('recordings').add(doc)
    .then((ref) => {
      console.log(`Added ${ref.id}`);
    })
    .catch((err) => console.error(err));
});
