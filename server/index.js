const express = require('express');

const app = express();

app.use(require('cors')());
app.use(require('morgan')('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) =>{
    res.send('ok');
})

const db = require('./db')

app.get('/db', async(req, res) => {
    await db.get(req.query)
    .then(data => res.json(data))
    .catch(err => res.status(500).json({err}));
})

app.post('/db', async (req, res) => {
    await db.create(req.body)
    .then(data => res.json(data))
    .catch(err => res.status(500).json({err}));
})

app.put('/db', async (req, res) => {
    await db.update(req.body)
    .then(data => res.json(data))
    .catch(err => res.status(500).json({err}));
})

app.delete('/db', async (req, res) => {
    await db.remove(req.query)
    .then(data => res.json(data))
    .catch(err => res.status(500).json({err}));
})


app.listen(1337, () =>{
    console.log("tmp server")
})
