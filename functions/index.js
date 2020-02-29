const functions = require('firebase-functions');
const app = require('express')();
const fbAuth = require('./util/fbAuth');
const {getAllScreams, creatScream} = require('./handlers/screams');
const {registerUser, signin, uploadImage} = require('./handlers/users');

//scream routes
app.get('/screams', getAllScreams);
app.post('/create-scream', fbAuth, creatScream);

//auth routes
app.post('/register', registerUser);
app.post('/login', signin);
app.post('/user/image', fbAuth, uploadImage);

exports.api = functions.https.onRequest(app);
