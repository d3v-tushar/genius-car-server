const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config()

app.use(cors());
app.use(express.json());

//MongoDB Database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@learnph.159fxoq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//JWT Verify
const verifyJWT = (req, res, next) =>{
    const authHeader= req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message: 'unauthorized access'})
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) =>{
        if(error){
            return res.status(403).send({message: 'Forbidden access'})
        }
        req.decoded = decoded;
        next();
    })
};

//To Genarate Access Tokhn write "node" in server side cmd then put "require('crypto').randomBytes(64).toString('hex')" this to genarate.
const run = async() =>{
    try{
        const servicesCollection = client.db('geniusCarDB').collection('services');
        const orderCollection = client.db('geniusCarDB').collection('orders');
        
        //Genarate JWT Token
        app.post('/jwt', (req, res) =>{
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1hr'});
            res.send({token});
        });

        app.get('/services', async(req, res) =>{
            //setting Price Range (Less then 20 or Greater then 20 or (Greater then 20 || Less then 50))
            //const query = {price: {$gte: 30, $lt: 100}};

            //Sorting Price order(A-Z or 1-10)
            const setOrder = req.query.order === "asce" ? 1 : -1;

            //Search Query $text 
            let query = {};
            const search = req.query.search;
            if(search.length){
                query = {$text: {$search: search}};
            };

            const cursor = servicesCollection.find(query).sort({price : setOrder});
            const services = await cursor.toArray();
            res.send(services);
        });

        //Get Each Service Details With Params
        app.get('/services/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const service = await servicesCollection.findOne(query);
            res.send(service);
        });


        //Store Each Orders Data to DataBase (JWT Verification Included)
        app.post('/orders', verifyJWT, async(req, res) =>{
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });

        //Display Specific Order Data to Specific User With Query (JWT Verification Included)
        app.get('/orders', verifyJWT, async(req, res) =>{
            const decoded = req.decoded;
            if(decoded.email !== req.query.email){
                return res.status(403).send({message: 'Unauthorized Access'});
            }

            let query = {};
            if(req.query.email){
                query = {
                    email: req.query.email
                }
            };
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        });

        //Setting or Updating Order Data With Params (JWT Verification Included)
        app.patch('/orders/:id', verifyJWT, async(req, res)=>{
            const id = req.params.id;
            const status = req.body.status;
            const query = {_id: ObjectId(id)};
            const updatedDoc = {
                $set:{
                    status: status
                }
            }
            const result = await orderCollection.updateOne(query, updatedDoc);
            res.send(result);
        });
        //Deleting Order With Params
        app.delete('/orders/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });

    }
    finally{

    }
}
run().catch(error => console.error(error))


app.get('/', (req, res) =>{
    res.send('Genius Car Server is Running')
});

app.listen(port, () =>{
    console.log(`Genius Car Server is Running on port: ${port}`)
});