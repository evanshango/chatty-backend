const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();
admin.initializeApp();

const firebaseConfig = {
    apiKey: "AIzaSyCycbN5HYVxdoJp7CIf43KZsRq57t_SRds",
    authDomain: "chatty-e4d82.firebaseapp.com",
    databaseURL: "https://chatty-e4d82.firebaseio.com",
    projectId: "chatty-e4d82",
    storageBucket: "chatty-e4d82.appspot.com",
    messagingSenderId: "775339024027",
    appId: "1:775339024027:web:799334f4ee15302d19303e",
    measurementId: "G-VH10C68B6F"
};

const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const database = admin.firestore();

app.get('/screams', (req, res) => {
    database.collection('screams').orderBy('createdAt', 'desc')
        .get().then(data => {
        let screams = [];
        data.forEach(doc => {
            screams.push({
                screamId: doc.id,
                body: doc.data().body,
                handle: doc.data().handle,
                createdAt: doc.data().createdAt
            });
        });
        return res.json(screams);
    }).catch(err => console.error(err))
});

const isEmail = (email) => {
    const regExp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    return !!email.match(regExp);
};

const isEmpty = (string) => {
    return string.trim() === '';
};

app.post('/create-scream', (req, res) => {
    const newScream = {
        body: req.body.body,
        handle: req.body.handle,
        createdAt: new Date().toISOString()
    };
    database.collection('screams').add(newScream).then(doc => {
        res.json({message: `document ${doc.id} created successfully`})
    }).catch(err => {
        res.status(500).json({error: 'something went wrong'});
        console.error(err);
    })
});
//Signup Route
app.post('/register', (req, res) => {
    const newUser = {
        email: req.body.email, password: req.body.password, confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    };

    let errors = {};

    if (isEmpty(newUser.email)) {
        errors.email = 'Email must not be empty'
    } else if (!isEmail(newUser.email)) {
        errors.email = 'Must be a valid email address'
    }

    if (isEmpty(newUser.password)) errors.password = 'Must not be empty';
    if (newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Passwords must be the same';
    if (isEmpty(newUser.handle)) errors.handle = 'Must not be empty';

    if (Object.keys(errors).length > 0) return res.status(400).json(errors);
    let token, userId;
    database.doc(`/users/${newUser.handle}`).get().then(doc => {
        if (doc.exists) {
            return res.status(400).json({handle: 'This handle is already taken'})
        } else {
            return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
        }
    }).then(data => {
        userId = data.user.uid;
        return data.user.getIdToken();
    }).then(authToken => {
        token = authToken;
        const userCredentials = {
            userId, handle: newUser.handle, email: newUser.email, createdAt: new Date().toISOString()
        };
        return database.doc(`/users/${newUser.handle}`).set(userCredentials)
    }).then(() => {
        return res.status(201).json({token})
    }).catch(err => {
        console.error(err);
        if (err.code === 'auth/email-already-in-use') {
            return res.status(400).json({email: 'Email is already in use'})
        } else {
            return res.status(500).json({error: err.code});
        }
    })
});

exports.api = functions.https.onRequest(app);
