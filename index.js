const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


// MiddleWare
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sp5uy.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
    try{
        await client.connect();
        const productCollection = client.db('computer-parts-manufacturer').collection('products');
        const orderCollection = client.db('computer-parts-manufacturer').collection('orders');
        const userCollection = client.db('computer-parts-manufacturer').collection('users');
       
        // get all products API
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        })
        // get single product
        app.get('/products/:id', async (req, res) =>{
            const id =  req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        })

        // get orders by email from orders
        app.get('/order', async (req, res) =>{
          const email = req.query.email;
          const query = {email:email};
          const orders = await orderCollection.find(query).toArray();
          res.send(orders);
        })

        // post orders to database
        app.post('/order', async (req, res) =>{
          const order = req.body;
          const result = await orderCollection.insertOne(order);
          res.send(result);
        })

        // put users to new collection
        app.put('/user/:email', async (req, res) =>{
          const email = req.params.email;
          const user = req.body;
          const filter = {email:email};
          const options = { upsert:true }
          const updateDoc = {
            $set: user
        };
          const result = await userCollection.updateOne(filter, updateDoc, options);
          res.send(result);
        })
    }
    finally{

    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello from computer Manufacturer!')
})

app.listen(port, () => {
  console.log(`Computers Manufacturer listening on port ${port}`)
})