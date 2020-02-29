const functions = require('firebase-functions');
const app = require('express')();
const fbAuth = require('./util/fbAuth');
const {database} = require('./util/admin');
const {
    getAllScreams, creatScream, getScream, commentOnScream, likeScream, unlikeScream, deleteScream
} = require('./handlers/screams');
const {
    registerUser, signin, uploadImage, addUserDetails, getAuthenticatedUser, getUserDetails, markNotificationsRead
} = require('./handlers/users');

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
app.get('/user/:handle', getUserDetails);
app.post('/notifications', fbAuth, markNotificationsRead);

exports.api = functions.https.onRequest(app);

exports.deleteNotificationOnUnlike = functions.region('us-central1').firestore.document('likes/{id}')
    .onDelete((snapshot => {
        return database.doc(`/notifications/${snapshot.id}`).delete().then(() => {
        }).catch(err => {
            console.error(err);
        })
    }));

exports.createNotificationOnLike = functions.region('us-central1').firestore.document('likes/{id}')
    .onCreate((snapshot => {
        return database.doc(`/screams/${snapshot.data().screamId}`).get().then(doc => {
            if (doc.exists && doc.data().handle !== snapshot.data().handle) {
                return database.doc(`/notifications/${snapshot.id}`).set({
                    createdAt: new Date().toISOString(),
                    recipient: doc.data().handle,
                    sender: snapshot.data().handle,
                    type: 'like',
                    read: false,
                    screamId: doc.id
                })
            }
        }).catch(err => {
            console.error(err);
        })
    }));

exports.createNotificationOnComment = functions.region('us-central1').firestore.document('comments/{id}')
    .onCreate((snapshot => {
        return database.doc(`/screams/${snapshot.data().screamId}`).get().then(doc => {
            if (doc.exists && doc.data().handle !== snapshot.data().handle) {
                return database.doc(`/notifications/${snapshot.id}`).set({
                    createdAt: new Date().toISOString(),
                    recipient: doc.data().handle,
                    sender: snapshot.data().handle,
                    type: 'comment',
                    read: false,
                    screamId: doc.id
                })
            }
        }).catch(err => {
            console.error(err);
        })
    }));

exports.onUserImageChange = functions.region('us-central1').firestore.document('/users/{userId}')
    .onUpdate((change => {
        if (change.before.data().imageUrl !== change.after.data().imageUrl) {
            const batch = database.batch();
            return database.collection('screams').where('handle', '==', change.before.data().handle).get().then(data => {
                data.forEach(doc => {
                    const scream = database.doc(`/screams/${doc.id}`);
                    batch.update(scream, {userImage: change.after.data().imageUrl});
                });
                return batch.commit();
            })
        } else return true;
    }));

exports.onScreamDelete = functions.region('us-central1').firestore.document('/screams/{screamId}')
    .onDelete(((snapshot, context) => {
        const screamId = context.params.screamId;
        const batch = database.batch();
        return database.collection('comments').where('screamId', '==', screamId).get().then(data => {
            data.forEach(doc => {
                batch.delete(database.doc(`/comments/${doc.id}`));
            });
            return database.collection('likes').where('screamId', '==', screamId).get().then(data => {
                data.forEach(doc => {
                    batch.delete(database.doc(`/likes/${doc.id}`))
                });
                return database.collection('notifications').where('screamId', '==', screamId).get().then(data => {
                    data.forEach(doc => {
                        batch.delete(database.doc(`/notifications/${doc.id}`))
                    });
                    return batch.commit();
                })
            }).catch(err => console.error(err))
        })
    }));
