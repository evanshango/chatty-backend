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
                createdAt: doc.data().createdAt
            });
        });
        return res.json(screams);
    }).catch(err => console.error(err))
};

exports.creatScream = (req, res) => {
    const newScream = {
        body: req.body.body,
        handle: req.user.handle,
        createdAt: new Date().toISOString()
    };
    database.collection('screams').add(newScream).then(doc => {
        res.json({message: `document ${doc.id} created successfully`})
    }).catch(err => {
        res.status(500).json({error: 'something went wrong'});
        console.error(err);
    })
};
