const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const app = express();
const port = process.env.PORT || 5000;


// MiddleWare
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sp5uy.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log(authHeader);
  if (!authHeader) {
      return res.status(401).send({ message: 'UnAuthorized Access' })
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
          console.log(err);
          return res.status(403).send({ message: 'Forbidden Access' })
      }
      req.decoded = decoded;
      next();
  });
}

async function run(){
    try{
        await client.connect();
        const productCollection = client.db('computer-parts-manufacturer').collection('products');
        const orderCollection = client.db('computer-parts-manufacturer').collection('orders');
        const userCollection = client.db('computer-parts-manufacturer').collection('users');
        const reviewCollection = client.db('computer-parts-manufacturer').collection('reviews');
        const paymentCollection = client.db('computer-parts-manufacturer').collection('payments');
       
        // get all products API
        app.get('/products',  async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        })
        // get single product
        app.get('/products/:id',  async (req, res) =>{
            const id =  req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        })

        // get orders by email from orders
        app.get('/order',verifyJWT, async (req, res) =>{
          const email = req.query.email;
          const decodedEmail = req.decoded.email;
          if(email === decodedEmail){
            const query = {email:email};
            const orders = await orderCollection.find(query).toArray();
            return res.send(orders);
          }
          else{
            return res.status(403).send({message: 'forbidden Access'})
          }
        })

        // get order id for payment from order collection
        app.get('/order/:id', verifyJWT, async (req, res)=>{
          const id = req.params.id;
          const query = {_id: ObjectId(id)}
          const order = await orderCollection.findOne(query);
          res.send(order);
        })

        // get all users from user collection
        app.get('/user',  async (req, res)=>{
          const users = await userCollection.find().toArray();
          res.send(users);
        })

        // get all reviews
        app.get('/review',  async (req, res)=>{
          const reviews = await reviewCollection.find().toArray();
          res.send(reviews);
        })

        // Add a new product by admin
        app.post('/products', async(req, res)=>{
          const newProduct = req.body;
          const result = await productCollection.insertOne(newProduct);
          res.send(result);
      })

        // Add a Review
        app.post('/reviews', async(req, res)=>{
          const newReview = req.body;
          const result = await reviewCollection.insertOne(newReview);
          res.send(result);
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
          const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' })
          res.send({result, token});
        })

        // update profile
        app.put('/user/update/:email', async (req, res) =>{
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

      //    // update available quantity
      //    app.put('/product/update/:id', async(req, res) => {
      //     const id = req.params.id;
      //     const data = req.body;
      //     const filter = {_id: ObjectId(id)};
      //     const options = { upsert: true}
      //     const updateDocument = {
      //         $set: {...data},
      //     }
      //     const result = await productCollection.updateOne(filter, updateDocument, options);
      //     res.send(result);
      // });

        // user admin api put
        app.put('/user/admin/:email', verifyJWT, async (req, res) =>{
          const email = req.params.email;
          const requester = req.decoded.email;
          const requesterAccount = await userCollection.findOne({email:requester});
          if(requesterAccount.role ==='admin'){
            const filter = {email:email};
            const updateDoc = {
              $set: {role:'admin'},
          };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
          }
          else{
            res.status(403).send({message: 'forbidden'})
          }
        })

        // get admin to verify admin role
        app.get('/admin/:email', async (req, res) => {
          const email = req.params.email;
          const user = await userCollection.findOne({ email: email });
          const isAdmin = user.role === 'admin';
          res.send({ admin: isAdmin })
      })

      // stripe payment intent
      app.post('/create-payment-intent', verifyJWT, async(req, res) =>{
        const service = req.body;
        const price = service.price;
        const amount = price*100;
        const paymentIntent = await stripe.paymentIntents.create({
          amount : amount,
          currency: 'usd',
          payment_method_types:['card']
        });
        res.send({clientSecret: paymentIntent.client_secret})
      });

      // patch api for stripe
      app.patch('/order/:id', async (req, res)=>{
        const id = req.params.id;
        const payment = req.body;
        const filter = {_id: ObjectId(id)};
        const updatedDoc = {
          $set: {
            paid: true,
            transactionId: payment.transactionId,
          }
      }

      const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
      const result = await paymentCollection.insertOne(payment);
      res.send(updatedDoc);
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