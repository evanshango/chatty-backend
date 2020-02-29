const functions = require('firebase-functions');
const app = require('express')();
const fbAuth = require('./util/fbAuth');
const {database} = require('./util/admin');
const {
    getAllScreams, creatScream, getScream, commentOnScream, likeScream, unlikeScream, deleteScream
} = require('./handlers/screams');
const {registerUser, signin, uploadImage, addUserDetails, getAuthenticatedUser} = require('./handlers/users');

//scream routes
app.get('/screams', getAllScreams);
app.post('/scream', fbAuth, creatScream);
app.get('/scream/:screamId', getScream);
app.post('/scream/:screamId/comment', fbAuth, commentOnScream);
app.get('/scream/:screamId/like', fbAuth, likeScream);
app.get('/scream/:screamId/unlike', fbAuth, unlikeScream);
app.delete('/scream/:screamId', fbAuth, deleteScream);

//auth routes
app.post('/register', registerUser);
app.post('/login', signin);

app.post('/user/image', fbAuth, uploadImage);
app.post('/user', fbAuth, addUserDetails);
app.get('/user', fbAuth, getAuthenticatedUser);

exports.api = functions.https.onRequest(app);

exports.deleteNotificationOnUnlike = functions
    .region('us-central1').firestore.document('likes/{id}').onDelete((snapshot => {
    database.doc(`/notifications/${snapshot.id}`).delete().then(() => {
        return;
    }).catch(err => {
        console.error(err);
        return;
    })
}));

exports.createNotificationOnLike = functions
    .region('us-central1').firestore.document('likes/{id}').onCreate((snapshot => {
    database.doc(`/screams/${snapshot.data().screamId}`).get().then(doc => {
        if (doc.exists){
            return database.doc(`/notifications/${snapshot.id}`).set({
                createdAt: new Date().toISOString(),
                recipient: doc.data().handle,
                sender: snapshot.data().handle,
                type: 'like',
                read: false,
                screamId: doc.id
            })
        }
    }).then(() => {
        return;
    }).catch(err => {
        console.error(err);
        return;
    })
}));

exports.createNotificationOnComment = functions
    .region('us-central1').firestore.document('comments/{id}').onCreate((snapshot => {
    database.doc(`/screams/${snapshot.data().screamId}`).get().then(doc => {
        if (doc.exists){
            return database.doc(`/notifications/${snapshot.id}`).set({
                createdAt: new Date().toISOString(),
                recipient: doc.data().handle,
                sender: snapshot.data().handle,
                type: 'comment',
                read: false,
                screamId: doc.id
            })
        }
    }).then(() => {
        return;
    }).catch(err => {
        console.error(err);
        return;
    })
}));
