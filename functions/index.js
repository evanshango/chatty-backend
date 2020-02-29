const functions = require('firebase-functions');
const app = require('express')();
const fbAuth = require('./util/fbAuth');
const {getAllScreams, creatScream, getScream, commentOnScream, likeScream, unlikeScream} = require('./handlers/screams');
const {registerUser, signin, uploadImage, addUserDetails, getAuthenticatedUser} = require('./handlers/users');

//scream routes
app.get('/screams', getAllScreams);
app.post('/scream', fbAuth, creatScream);
app.get('/scream/:screamId', getScream);
app.post('/scream/:screamId/comment', fbAuth, commentOnScream);
app.get('/scream/:screamId/like', fbAuth, likeScream);
app.get('/scream/:screamId/unlike', fbAuth, unlikeScream);

//auth routes
app.post('/register', registerUser);
app.post('/login', signin);

app.post('/user/image', fbAuth, uploadImage);
app.post('/user', fbAuth, addUserDetails);
app.get('/user', fbAuth, getAuthenticatedUser);

exports.api = functions.https.onRequest(app);
