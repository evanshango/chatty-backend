const {database} = require('../util/admin');

exports.getAllScreams = (req, res) => {
    database.collection('screams').orderBy('createdAt', 'desc')
        .get().then(data => {
        let screams = [];
        data.forEach(doc => {
            screams.push({
                screamId: doc.id,
                body: doc.data().body,
                handle: doc.data().handle,
                createdAt: doc.data().createdAt,
                userImage: doc.data().userImage,
                likeCount: doc.data().likeCount,
                commentCount: doc.data().commentCount,
            });
        });
        return res.json(screams);
    }).catch(err => console.error(err))
};

exports.creatScream = (req, res) => {
    if (req.body.body.trim() === '') {
        return res.status(400).json({ body: 'Body must not be empty' });
    }
    const newScream = {
        body: req.body.body,
        handle: req.user.handle,
        createdAt: new Date().toISOString(),
        userImage: req.user.imageUrl,
        likCount: 0,
        commentCount: 0
    };
    database.collection('screams').add(newScream).then(doc => {
        const resScream = newScream;
        resScream.screamId = doc.id;
        res.json(resScream)
    }).catch(err => {
        res.status(500).json({error: 'something went wrong'});
        console.error(err);
    })
};

exports.getScream = (req, res) => {
    let screamData = {};
    database.doc(`/screams/${req.params.screamId}`).get().then(doc => {
        if (!doc.exists) {
            return res.status(404).json({error: 'Scream not found'})
        }
        screamData = doc.data();
        screamData.screamId = doc.id;
        return database.collection('comments').orderBy('createdAt', 'desc')
            .where('screamId', '==', req.params.screamId).get();
    }).then(data => {
        screamData.comments = [];
        data.forEach(doc => {
            screamData.comments.push(doc.data())
        });
        return res.json(screamData)
    }).catch(err => {
        console.log(err);
        return res.status(500).json({error: err.code})
    })
};

exports.commentOnScream = (req, res) => {
    if (req.body.body.trim() === '') return res.status(400).json({comment: 'Must not be empty'});
    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        screamId: req.params.screamId,
        handle: req.user.handle,
        userImage: req.user.imageUrl
    };
    database.doc(`/screams/${req.params.screamId}`).get().then(doc => {
        if (!doc.exists) {
            return res.status(404).json({error: 'Scream not found'});
        }
        return doc.ref.update({commentCount: doc.data().commentCount + 1})
    }).then(() => {
        return database.collection('comments').add(newComment);
    }).then(() => {
        res.json(newComment)
    }).catch(err => {
        console.log(err);
        return res.status(500).json({error: 'Something went wrong'})
    })
};

exports.likeScream = (req, res) => {
    const likeDoc = database.collection('likes').where('handle', '==', req.user.handle)
        .where('screamId', '==', req.params.screamId).limit(1);
    const screamDoc = database.doc(`/screams/${req.params.screamId}`);

    let screamData;
    screamDoc.get().then(doc => {
        if (doc.exists) {
            screamData = doc.data();
            screamData.screamId = doc.id;
            return likeDoc.get();
        } else {
            return res.status(404).json({error: 'Scream not found'})
        }
    }).then(data => {
        if (data.empty) {
            return database.collection('likes').add({
                screamId: req.params.screamId,
                handle: req.user.handle,
                createdAt: new Date().toISOString()
            }).then(() => {
                screamData.likeCount++;
                return screamDoc.update({likeCount: screamData.likeCount})
            }).then(() => {
                return res.json(screamData);
            })
        } else {
            return res.status(400).json({error: 'Scream already liked'})
        }
    }).catch(err => {
        console.log(err);
        res.status(500).json({error: err.code})
    })
};

exports.unlikeScream = (req, res) => {
    const likeDoc = database.collection('likes')
        .where('handle', '==', req.user.handle)
        .where('screamId', '==', req.params.screamId).limit(1);
    const screamDoc = database.doc(`/screams/${req.params.screamId}`);

    let screamData;
    screamDoc.get().then(doc => {
        if (doc.exists) {
            screamData = doc.data();
            screamData.screamId = doc.id;
            return likeDoc.get();
        } else {
            return res.status(404).json({error: 'Scream not found'})
        }
    }).then(data => {
        if (data.empty) {
            return res.status(400).json({error: 'Scream not liked'})
        } else {
            return database.doc(`/likes/${data.docs[0].id}`).delete().then(() => {
                screamData.likeCount--;
                return screamDoc.update({likeCount: screamData.likeCount})
            }).then(() => {
                res.json(screamData)
            })
        }
    }).catch(err => {
        console.log(err);
        res.status(500).json({error: err.code})
    })
};

exports.deleteScream = (req, res) => {
    const document = database.doc(`/screams/${req.params.screamId}`);
    document.get().then(doc => {
        if (!doc.exists){
            return res.status(404).json({error: 'Scream not found'})
        }
        if (doc.data().handle !== req.user.handle){
            return res.status(403).json({error: 'Unauthorized request'})
        } else {
            return document.delete();
        }
    }).then(() => {
        res.json({message: 'Scream deleted successfully'})
    }).catch(err => {
        console.log(err);
        return res.status(500).json({error: err.code})
    })
};
