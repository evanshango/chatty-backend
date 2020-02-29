const {admin, database} = require('../util/admin');
const config = require('../util/config');
const firebase = require('firebase');
firebase.initializeApp(config);
const {validateRegData, validateSignInData, reduceUserDetails} = require('../util/validators');

exports.registerUser = (req, res) => {
    const newUser = {
        email: req.body.email, password: req.body.password, confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    };

    const {valid, errors} = validateRegData(newUser);
    if (!valid) return res.status(400).json(errors);
    const noImg = 'profile.png';
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
            userId,
            handle: newUser.handle,
            email: newUser.email,
            createdAt: new Date().toISOString(),
            imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`
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
};

exports.signin = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    const {valid, errors} = validateSignInData(user);
    if (!valid) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email, user.password).then(data => {
        return data.user.getIdToken();
    }).then(token => {
        return res.json({token})
    }).catch(error => {
        console.error(error);
        if (error.code === 'auth/wrong-password') {
            return res.status(403).json({general: 'Wrong credentials. Please try again'})
        } else return res.status(500).json({error: error.code})
    })
};

exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body);
    database.doc(`/users/${req.user.handle}`).update(userDetails).then(() => {
        return res.json({message: 'Profile details updated'})
    }).catch(err => {
        console.error(err);
        return res.status(500).json({error: err.code})
    })
};
//get logged in user details
exports.getAuthenticatedUser = (req, res) => {
    let userData = {};
    database.doc(`/users/${req.user.handle}`).get().then(doc => {
        if (doc.exists){
            userData.credentials = doc.data();
            return database.collection('likes').where('handle', '==', req.user.handle).get()
        }
    }).then(data => {
        userData.likes = [];
        data.forEach(doc => {
            userData.likes.push(doc.data)
        });
        return res.json(userData)
    }).catch(err => {
        console.error(err);
        return res.status(500).json({error: err.code})
    })
};

exports.uploadImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({headers: req.headers});
    let imageFileName;
    let imageToUpload = {};
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
            return res.status(400).json({error: 'Wrong file type submitted'})
        }
        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        imageFileName = `${Math.round(Math.random() * 100000000000)}.${imageExtension}`;
        const filePath = path.join(os.tmpdir(), imageFileName);
        imageToUpload = {filePath, mimetype};
        file.pipe(fs.createWriteStream(filePath));
    });
    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToUpload.filePath, {
            resumable: false, metadata: {
                metadate: {
                    contentType: imageToUpload.mimetype
                }
            }
        }).then(() => {
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
            return database.doc(`/users/${req.user.handle}`).update({imageUrl})
        }).then(() => {
            return res.json({message: 'Image uploaded successfully'})
        }).catch(err => {
            console.error(err);
            return res.status(500).json({error: err.code})
        })
    });
    busboy.end(req.rawBody)
};
