const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


// MiddleWare
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sp5uy.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);

app.get('/', (req, res) => {
  res.send('Hello from computer Manufacturer!')
})

app.listen(port, () => {
  console.log(`Computers Manufacturer listening on port ${port}`)
})