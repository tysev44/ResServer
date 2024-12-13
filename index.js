const cors = require('cors');
const express = require('express');
const session = require('express-session');
const cookie = require('cookie-parser');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const argon2 = require('argon2');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');


// ---------------------- //
// ---give permission to client-- //
// ---------------- //

const corsOptions = {
    origin: ["http://localhost:3000", "*"],
    methods: ['GET', 'POST'],
    credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static('contents'));
app.use(cookie());

// ---------------------- //
// ---setting the session cookie-- //
// ---------------- //

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join('contents');
        fs.mkdir(uploadPath, { recursive: true }, (err) => {
            if (err) {
                return cb(err);
            }
            cb(null, uploadPath);
        });
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
});

const postupload = multer({
    storage: storage
})

let store;

try {
  // Initialize MongoStore with error handling
  store = new MongoStore({
    uri: 'mongodb+srv://tysev8301:oaWkFBiWMImk6NJg@cluster0.bwf8u.mongodb.net/e-commerce?retryWrites=true&w=majority', // Updated URI to avoid IPv6
    collectionName: 'rateLimit', // Collection for storing rate limit data
    expireTimeMs: 15 * 60 * 1000, // Expiration time for each entry
    userKey: (req) => req.ip, // Use IP address as the identifier
  });

  // Optional: Add an error listener for runtime errors console.log('MongoStore initialized successfully.');
} catch (error) {
    console.error('Failed to initialize MongoStore:', error.message);
    // Exit the process or use a fallback
    process.exit(1);
  }

const apiLimiter = rateLimit({
    store,
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 200, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(session({
    secret:'secret',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        expires: new Date(Date.now() + (1000 * 60 * 60 * 24 * 30)) // Expires 30 days from now
    }
}));




// ---------------------- //
// ---connecting to database-- //
// ---------------- //

const uri = 'mongodb+srv://tysev8301:oaWkFBiWMImk6NJg@cluster0.bwf8u.mongodb.net/e-commerce?retryWrites=true&w=majority';

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 200, // Adjust connection pool size as needed
};

// Connect to MongoDB
mongoose
  .connect(uri, options)
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// Listen for successful connection
mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB');
});

// Optional: Additional event listeners for connection management
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB connection disconnected');
});

mongoose.connect('mongodb+srv://tysev8301:oaWkFBiWMImk6NJg@cluster0.bwf8u.mongodb.net/e-commerce?retryWrites=true&w=majority', {
    maxPoolSize: 500
})
.catch((error) => {
    console.error('Error connecting to MongoDB', error);
});
 
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
});


////////////////////////////////////////
////////////////////////////////////////

const userSchema = new mongoose.Schema({
    email: String,
    verifyemail: String,
    otp: String,  
    first_name: String,
    title: String,
    address: String,
    password: String,
    ordered: Boolean,
});

const productsSchema1 = new mongoose.Schema({
    img: String,
    price: Number,
    orders: Number,
    available: Number,
    product_name: String,
    vissibility: String,
    description: String,
    category: String,
    rate: String,
    timer: String,
});

const cartSchema = new mongoose.Schema({
    uid: String,
    product_id: String,
    quantity: Number,
    timestamp: String,
});

const orderSchema = new mongoose.Schema({
    uid: String,
    product_id: String,
    quantity: Number,
    img: String,
    price: Number,
    product_name: String,
    timestamp: String,
    timer: String,
});

const historySchema = new mongoose.Schema({
    uid: String,
    product_id: String,
    quantity: Number,
    timer: String,
    img: String,
    price: Number,
    product_name: String,
    timestamp: String,
});

const likeSchema = new mongoose.Schema({
    uid: String,
    product_id: String,
    timestamp: String,
});

const searchSchema = new mongoose.Schema({
    uid: String,
    product_id: String,
    product_name: String,
    timestamp: String,
});

//////////////////////////////////////////
//////////////////////////////////////////

const cartSchema1 = new mongoose.Schema({
    uid: { type: String, default: '' },
    cart: [cartSchema]
});

const orderSchema1 = new mongoose.Schema({
    uid: { type: String, default: '' },
    timestamp: { type: String, default: '' },
    cart: [orderSchema]
});

const historySchema1 = new mongoose.Schema({
    uid: { type: String, default: '' },
    timestamp: { type: String, default: '' },
    history: [historySchema]
});

const likeSchema1 = new mongoose.Schema({
    uid: { type: String, default: '' },
    likes: [likeSchema]
});

const searchSchema1 = new mongoose.Schema({
    uid: { type: String, default: '' },
    search: [searchSchema]
});

const Users = mongoose.model('users', userSchema);
const Products = mongoose.model('products', productsSchema1);
const Cart = mongoose.model('carts', cartSchema1);
const order = mongoose.model('orders', orderSchema1);
const Likes = mongoose.model('likes', likeSchema1);
const History = mongoose.model('histories', historySchema1);
const Search = mongoose.model('searches', searchSchema1);

// ---------------------- //
// ---getting current user info -- //
// ---------------- //

app.post('/', apiLimiter, async(req, res) => {
    try {
        const email = req.session.email
        if(email){
            const sign = await Users.findOne({ email })
            res.json({ user : sign, status : 'online'})
        }else{
            return res.json({user: null, status : 'offline'})
        }
    } catch (error) {
        res.json({ status : 'error'})
    }
})


// ============================================================================================================== //
// ===================================SIGN-UP, LOG-IN & LOG-OUT starts============================================ //

// ---------------------- //
// ---sign up functionality-- //
// ---------------- //


app.post('/signup', apiLimiter, async(req, res) => {
    try {
        if(req.body.email){
            const exist = await Users.findOne({ email: req.body.email})
            if(exist){
                res.json({status: 'error', message:'Email already exists'})
            }else{
                
                const hashedPassword = await argon2.hash(req.body.password);
                const getuid = await Users.create({
                    first_name: req.body.name,
                    password: hashedPassword,
                    email: req.body.email,
                });
    
                req.session.email = getuid.email;
                req.session.save()
     
                res.json({status: 'success'})
            }
        }
    } catch (error) {
        res.json({ status : 'error'})
    }
})

// ---------------------- //
// ---logout functionality-- //
// ---------------- //

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.json({ status: 'Error', error: err });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie manually
        res.json({ status: 'success', message: 'Logged out successfully' });
    });
});


// ---------------------- //
// ---login functionality-- //
// ---------------- //

app.post('/login', apiLimiter, async(req, res) => {
    try {
        const email = req.body.email;

        await Users.findOne({ email : email }).then((updt)=>{
            if(updt){
                const password = updt.password
                const match = argon2.verify(password, req.body.password)
                
                if(!match){
                    return res.json({ status: 'error', message: 'Incorrect password' });
                } 
    
                req.session.email = email;
                req.session.save()
                req.session.uid = updt._id;
                req.session.save()
                res.json({ status: 'success'})
            }else{
                res.json({ status: 'error', message : 'Account does not exist' });
            }
        });
    } catch (error) {
        res.json({ status: 'error', message: 'Server error' });
    }
})

app.post('/forget_password', apiLimiter, async(req, res) => {
    try {
        const email = req.body.email;

        await Users.findOne({ email : email }).then((updt)=>{
            if(updt){
                res.json({ status: 'success'})
            }else{
                res.json({ status: 'error', message : 'Account does not exist' });
            }
        });
    } catch (error) {
        res.json({ status: 'error', message: 'Server error' });
    }
})
 

// ===================================== SIGN-UP, LOG-IN & LOG-OUT ends============================================ //
// =============================================================================================================== //

app.post('/uploadProduct', apiLimiter, postupload.single('img'), async (req, res) => {
    try {
        const value = JSON.parse(req.body.value);
        if(value){
            const product_name = value.product_name;
            const price = value.price;
            const rate = value.rate;
            const description = value.description;
            const available = value.available;
            const timer = value.timer;
            const category = value.category;
            const vissibility = "vissible";

            await Products.findOne({product_name}).then(async(usdt)=>{
                if(usdt?.img){
                    res.json({status: 'error', message:'product already exists'})
                }else{
                    await Products.create({
                        img : req.file.filename,
                        product_name,
                        price,
                        rate,
                        description,
                        available,
                        category,
                        vissibility,
                        timer
                    });
                    res.json({ status: 'success' });
                }
            })
        
        }else{
            res.json({ status: 'error', message: 'Enter all Fields' });
        }
        
    } catch (error) {
        res.json({ status: 'error', message: 'Server error' });
    }
});

app.post('/getProduct', apiLimiter, async (req, res) => {
    try {

        await Products.find().then(async(prd)=>{
            
            res.json({ status: 'success', prd });
        })
        
    } catch (error) {
        res.json({ status: 'error', message: 'Server error' });
    }
});

app.post('/EditProductInfo', apiLimiter, async (req, res) => {
    try {
        const product_name = req.body.product_name;
        const price = req.body.price;
        const rate = req.body.rate;
        const description = req.body.description;
        const available = req.body.available;
        const timer = req.body.timer;
        const category = req.body.category;

        await Products.updateOne({product_name},{
            product_name,
            price,
            rate,
            description,
            available,
            category,
            timer
        });
        
    } catch (error) {
        res.json({ status: 'error', message: 'Server error' });
    }
});

app.post('/EditProductImg', apiLimiter, postupload.single('img'), async (req, res) => {
    try {
        const product_name = req.body.product_name;

        await Products.updateOne({product_name},{
            img : req.file.filename,
        });
        
    } catch (error) {
        res.json({ status: 'error', message: 'Server error' });
    }
});

app.post('/GetSingleProduct', apiLimiter, async (req, res) => {
    try {
        const product_id = req.body.product_id;
        const uid = req.session.uid;

        const info =  await Products.findOne({_id: product_id})
        
        const likeArray = {
            product_id: "$likes.product_id",
            product_name: "$likes.product_name",
        }

        const getlikes = await Likes.aggregate([
            { $unwind: "$likes" },  
            { $match: { "likes.uid": uid, "likes.product_id": {$in: [product_id]}} }, 
            { $project: likeArray } 
        ]);  
        
        res.json({ status: 'success', info, getlikes});
    } catch (error) {
        res.json({ status: 'error', message: 'Server error' });
    }
}); 

app.post('/Getcategory', apiLimiter, async (req, res) => {
    try {
        const category = req.body.category;

        const products = await Products.find({
            visibility: { $nin: ["delete"] }, 
            category: `${category}`
        })
        
        res.json({ status: 'success', products});
    } catch (error) {
        res.json({ status: 'error', message: 'Server error' });
    }
}); 

app.post('/DeletProduct', apiLimiter, async (req, res) => {
    try {
        const product_name = req.body.product_name;

        await Products.updateOne({product_name},{
            vissibility : "delete",
        });
        
        res.json({ status: 'success'});
    } catch (error) {
        res.json({ status: 'error', message: 'Server error' });
    }
});

app.post('/Editlocation', apiLimiter, async (req, res) => {
    try {
        const uid = req.session.uid
        const address = req.body.address;

        if(uid){
            await Users.updateOne({_id: uid}, {address: address})
            res.json({ status: 'success'});
        }else{
            res.json({ status: 'offline' });
        }
        
    } catch (error) {
        res.json({ status: 'error', message: 'Server error' });
    }
});





// =========================================================================== //
// =============================CLIENTS SIDE====================================== //
// =========================================================================== //

app.post('/get_display', apiLimiter, async (req, res) => {
    const uid = req.session.uid
    try {
       if(uid){
            // Fetch the menu using aggregation to group by category
            const menu = await Products.aggregate([
                {
                    $match: {
                        visibility: { $nin: ["delete"] },  // Exclude deleted items
                        category: { 
                            $in: ["Rice Dishes", "Meat & Fish", "Main Dishes", "Soup"]  // Ensure correct category names and casing
                        }
                    }
                },
                {
                    $group: {
                        _id: "$category",  // Group by category
                        doc: { $first: "$$ROOT" }  // Select first document from each group
                    }
                },
                {
                    $replaceRoot: { newRoot: "$doc" }  // Replace root with the grouped document
                }
            ]);

            // Fetch first submenu categories
            const fst_submenu = await Products.find({
                visibility: { $nin: ["delete"] },  // Exclude deleted items
                category: { 
                    $in: ["Sweets", "Beverages"]  // Correct category names and casing
                }
            }).limit(8);  // Limit the results to 8

            // Fetch second submenu categories
            const sec_submenu = await Products.find({
                visibility: { $nin: ["delete"] },  // Exclude deleted items
                category: { 
                    $in: ["Snacks", "Meat & Fish"]  // Correct category names and casing
                }
            }).limit(8);  // Limit the results to 8

            const fstArray = fst_submenu?.length > 0 ? fst_submenu?.map((item)=> item?._id.toString()) : []

            const secArray = sec_submenu?.length > 0 ? sec_submenu?.map((item)=> item?._id.toString()) : []

            const combineall = [...new Set([...fstArray, ...secArray])]
            
            const likeArray = {
                product_id: "$likes.product_id",
                product_name: "$likes.product_name",
            }

            const getlikes = await Likes.aggregate([
                { $unwind: "$likes" },  
                { $match: { "likes.uid": uid, "likes.product_id": {$in: combineall}} }, 
                { $project: likeArray } 
            ]);  

            // Respond with the fetched data
            res.json({ status: 'success', menu, fst_submenu, sec_submenu, getlikes });
       }else{

            res.json({ status: 'logout', message: 'User is not logged in.' });
       }
    } catch (error) { 
        // Handle server errors gracefully
        res.json({ status: 'error', message: 'Server error', error: error.message });
    }
});



app.post('/getMenu', apiLimiter, async (req, res) => {
    try {
        const uid = req.session.uid

        const prd = await Products.find()

        const productId = prd?.length > 0 ? prd?.map((prod)=>prod?._id)  : []

        const productIdAsStrings = productId.map(id => id.toString());
        
        const likeArray = {
            product_id: "$likes.product_id",
            product_name: "$likes.product_name",
        }

        const getlikes = await Likes.aggregate([
            { $unwind: "$likes" },  
            { $match: { "likes.uid": uid, "likes.product_id": {$in: productIdAsStrings}} }, 
            { $project: likeArray } 
        ]);        
        
        res.json({ status: 'success', prd, getlikes });
    
    } catch (error) {
        res.json({ status: 'error', message: 'Server error' });
    }
});


// ---------------------- //
// ---make order functionality-- //
// ---------------- //

app.post('/make_order', apiLimiter, async (req, res) => {
    try {
        const orderArray = req.body.orderArray;
        const uid = req.session.uid;
        const make_order = JSON.parse(orderArray)

        if(make_order?.length > 0 ){
            const objects = make_order?.map((orders) => ({
                uid: uid,  // assuming `uid` is available in the outer scope
                product_id: orders.product_id,
                quantity: orders.quantity,
                img: orders.img,
                price: orders.price,
                product_name: orders.product_name,
                timestamp: Math.floor(new Date().getTime() / 1000)
            }));

            await order.create({
                uid,
                timestamp: Math.floor(new Date().getTime() / 1000),
                cart : {objects}
            })

            await Users.updateOne(
                {uid},
                {$set: { ordered : true }}
            )
            res.json({ status: 'success'});
        }else{
            res.json({ status: 'error no orders sent'});
        }
        
    } catch (error) {
        res.json({ status: 'error', message: 'Server error' });
    }
});

app.post('/order_History', apiLimiter, async (req, res) => {
    try {
        const orderArray = req.body.orderArray;
        const uid = req.body.uid;
        const make_order = JSON.parse(orderArray)

        if(make_order?.length > 0 ){
            const objects = make_order?.map((orders) => ({
                uid: uid,  // assuming `uid` is available in the outer scope
                product_id: orders.product_id,
                quantity: orders.quantity,
                img: orders.img,
                price: orders.price,
                product_name: orders.product_name,
                timestamp: Math.floor(new Date().getTime() / 1000)
            }));

            await History.create({
                uid,
                timestamp: Math.floor(new Date().getTime() / 1000),
                cart : {objects}
            })

            await Users.updateOne(
                {uid},
                {$set: { ordered : false }}
            )

            res.json({ status: 'success'});
        }else{
            res.json({ status: 'error no orders sent'});
        }
        
    } catch (error) {
        res.json({ status: 'error', message: 'Server error' });
    }
});




// ================================================ ADDING TO CARTS AND LIKES starts =============================================== \\

    // ____________________________________ ============= CART FUNCTION starts ============== ___________________________________ \\

// ---------------------------------------- //
// --- add to cart for both users functionality --- //
// --------------------------------- //

app.post('/addcart', apiLimiter, async(req, res) => {
    try {
        if(req.session.uid){
            const uid = req.session.uid
            const cartDetails = {
                uid: uid,
                product_id: req.body.product_id,
                quantity: req.body.quantity,
                timestamp: Math.floor(new Date().getTime() / 1000)
            }
            const guestCarts = await Cart.findOne({uid})
            if(!guestCarts){
                await Cart.create({
                    uid,
                    cart: [cartDetails]
                });
                res.json({ status: 'success'})
            }else{
                const carts = await Cart.findOne({
                    uid: uid, 
                    "cart.product_id": req.body.product_id
                });            
    
                if(carts){
                    await Cart.updateOne(
                        { "cart.product_id": req.body.product_id }, 
                        { $set: { "cart.$.quantity": carts?.cart[0]?.quantity + 1 } } 
                    );
                }else{
                    await Cart.updateOne(
                        { uid },
                        { $push: { cart: cartDetails } }
                    );
                }
                res.json({ status: 'success'})
            }
        }else{
            res.json({ status: 'logout'})
        }
    } catch (error) {
        res.json({ status: 'error'})
    }
})


// ---------------------- //
// ---grab cart for both guest and user functionality-- //
// ---------------- //

app.post('/getcart', apiLimiter, async (req, res) => {
    try {
        if (req.session.uid) {
            const uid = req.session.uid;

            // Find cart by user ID
            const getCart = await Cart.findOne({ uid });
            if (!getCart || !getCart.cart || getCart.cart.length === 0) {
                return res.json({ status: 'empty', message: 'Your cart is empty.' });
            }

            // Get the product IDs from the cart
            const cartProductIds = getCart.cart.map(item => item.product_id);

            // Find the products corresponding to those IDs
            const products = await Products.find({ _id: { $in: cartProductIds } });
            if (!products || products.length === 0) {
                return res.json({ status: 'not_found', message: 'Products not found.' });
            }

            let calculatedTotal = 0;

            // Calculate the total price based on cart quantities and product prices
            getCart.cart.forEach(cartItem => {
                const product = products.find(prod => prod._id.toString() === cartItem.product_id.toString());
                if (product) {
                    calculatedTotal += product.price * cartItem.quantity;
                }
            });

            // Send response with cart details and calculated total
            res.json({ 
                status: 'found', 
                products, 
                cart: getCart.cart, 
                total: calculatedTotal 
            });
        } else {
            // Handle case where user is not logged in
            res.json({ status: 'logout', message: 'User is not logged in.' });
        }
    } catch (error) {
        console.error('Error fetching cart data:', error);
        res.status(500).json({ status: 'error', message: 'Something went wrong while fetching the cart.' });
    }
});



// ---------------------- //
// ---delete from cart functionality-- //
// ---------------- //
app.post('/deletcart', apiLimiter, async(req, res)=>{
   try {
    const product_id = req.body.product_id
    if(req.session.uid){
        const uid = req.session.uid
        const carts = await Cart.findOne({
            uid: uid, 
            "cart.product_id": req.body.product_id
        }); 
        if(carts){
            await Cart.findOneAndUpdate(
                { uid: uid }, 
                { $pull: { cart: { product_id: product_id } } },
                { new: true }
            );
            res.json({status: 'success'})
        }else{
            res.json({status: 'not found'})
        }
    }
   } catch (error) {
    res.json({status: 'error'})
   }
})


// ---------------------- //
// ---INCREMENT CART functionality-- //
// ---------------- //

app.post('/incrementcart', apiLimiter, async (req, res) => {
    try {
        const product_id = req.body.product_id;
    
        if (req.session.uid) {
            const uid = req.session.uid;
    
            try {
                // Find the cart document for the user and product
                const carts = await Cart.findOne({
                    uid: uid,
                    "cart.product_id": product_id
                });
    
                if (carts) {
                    // Use $inc to increment the quantity of the product in the cart
                    await Cart.updateOne(
                        {
                            uid: uid,  // Ensure we're updating the correct user's cart
                            "cart.product_id": product_id  // Ensure the correct product is updated
                        },
                        {
                            $inc: { "cart.$.quantity": 1 }  // Increment the quantity by 1
                        }
                    );
    
                    res.json({ status: 'success' });
                } else {
                    res.json({ status: 'product not found in cart' });
                }
            } catch (error) {
                res.status(500).json({ status: 'error', message: 'Internal Server Error' });
            }
        } else {
            res.json({ status: 'logout' });
        }
    } catch (error) {
        res.json({status: 'error'})
    }
});



// ---------------------- //
// ---DECREMENT CART functionality-- //
// ---------------- //
app.post('/decrementcart', apiLimiter, async (req, res) => {
    try {
        const product_id = req.body.product_id;
    
        if (req.session.uid) {
            const uid = req.session.uid;
    
            try {
                // Find the cart document for the user and check if the product is in the cart
                const carts = await Cart.findOne({
                    uid: uid,
                    "cart.product_id": product_id
                });
    
                if (carts) {
                    // Find the product index in the cart
                    const productIndex = carts.cart.findIndex(item => item.product_id.toString() === product_id.toString());
    
                    if (productIndex !== -1) {
                        const product = carts.cart[productIndex];
    
                        // If quantity is greater than 1, decrement it
                        if (product.quantity > 1) {
                            await Cart.updateOne(
                                {
                                    uid: uid,
                                    "cart.product_id": product_id
                                },
                                {
                                    $inc: { "cart.$.quantity": -1 }  // Decrement quantity by 1
                                }
                            );
                        } else {
                            // If quantity is 1 or less, remove the product from the cart
                            await Cart.updateOne(
                                { uid: uid },
                                { $pull: { cart: { product_id: product_id } } }
                            );
                        }
    
                        res.json({ status: 'success' });
                    } else {
                        res.json({ status: 'product not found in cart' });
                    }
                } else {
                    res.json({ status: 'cart not found' });
                }
            } catch (error) {
                console.error("Error decrementing cart item:", error);
                res.status(500).json({ status: 'error', message: 'Internal Server Error' });
            }
        } else {
            res.json({ status: 'not authenticated' });
        }
    } catch (error) {
        res.json({status: 'error'})
    }
});




 

    // ____________________________________=================CART FUNCTION ends==============____________________________________ //




// ---Search functionality-- //
// ---------------- //
app.post('/search', apiLimiter, async (req, res) => {

        const product_name = req.body.product_name;
    
        if (req.session.uid) {
            try {
                // Find the cart document for the user and check if the product is in the cart
                const search = await Products.find({
                    product_name: { $regex: product_name, $options: 'i' },
                })
                res.json({search, status: 'success'})
            } catch (error) {
                console.error("Error decrementing cart item:", error);
                res.status(500).json({ status: 'error', message: 'Internal Server Error' });
            }
        } else {
            res.json({ status: 'not authenticated' });
        }

});




// ---Save Search functionality-- //
// ---------------- //
app.post('/save_search', apiLimiter, async (req, res) => {
    const uid = req.session.uid;

    if (uid) {
        try {

            const searchDetails = {
                uid: uid,
                product_id: req.body.product_id,
                product_name: req.body.product_name,
                timestamp: Math.floor(new Date().getTime() / 1000)
            }
            const guestsearch = await Search.findOne({uid})
            if(!guestsearch){
                await Search.create({
                    uid,
                    search: [searchDetails]
                });
                res.json({ status: 'success'})
            }else{
                const srch = await Search.findOne({
                    uid: uid, 
                    "search.product_id": req.body.product_id
                });            
    
                if(srch){
                    await Search.updateOne(
                        { "search.product_id": req.body.product_id }, 
                        { $set: { "search.$.timestamp": Math.floor(new Date().getTime() / 1000) } } 
                    );
                }else{
                    await Search.updateOne(
                        { uid },
                        { $push: { search: searchDetails } }
                    );
                }
                res.json({ status: 'success'})
            }

        } catch (error) {
            console.error("Error decrementing cart item:", error);
            res.status(500).json({ status: 'error', message: 'Internal Server Error' });
        }
    } else {
        res.json({ status: 'not authenticated' });
    }
});





    // ________________________________=================LIKES FUNCTIION starts==============_______________________________ //

// ---------------------- //
// ---add to likes for both user functionality-- //
// ---------------- //

app.post('/addlikes', apiLimiter, async(req, res) => {
    try {
        if(req.session.uid){
            const uid = req.session.uid
            const getlikes = await Likes.findOne({uid})
            const likeDetails = {
                uid: uid,
                product_id: req.body.product_id,
                quantity: req.body.quantity,
                timestamp: Math.floor(new Date().getTime() / 1000)
            }
            if(getlikes){
                const handlelikes = await Likes.findOne({
                    uid: uid, 
                    "likes.product_id": req.body.product_id
                });            
    
                if(handlelikes){
                    res.json({status: 'success'})
                }else{
                    await Likes.updateOne(
                        {uid}, 
                        { $push: {likes: likeDetails} } 
                    );
                    res.json({status: 'success'})
                }
            }else{
                await Likes.create({
                    uid, 
                    likes : [likeDetails]
                });
                res.json({status: 'success'})
            }
        }
    } catch (error) {
        res.json({status: 'error'})
    }
})


// ---------------------- //
// ---grab likes for both guest and user functionality-- //
// ---------------- //

app.post('/getlikes', apiLimiter, async(req, res) => {

    try {
        if (req.session.uid) {
            const uid = req.session.uid;

            // Find cart by user ID
            const getCart = await Likes.findOne({ uid });
            if (!getCart || !getCart?.likes || getCart?.likes?.length === 0) {
                return res.json({ status: 'empty', message: 'Your cart is empty.' });
            }

            // Get the product IDs from the cart
            const cartProductIds = getCart?.likes?.map(item => item.product_id);

            // Find the products corresponding to those IDs
            const products = await Products.find({ _id: { $in: cartProductIds } });
            if (!products || products.length === 0) {
                return res.json({ status: 'not_found', message: 'Products not found.' });
            }

            // Send response with cart details and calculated total
            res.json({ 
                status: 'found', 
                products, 
            });
        } else {
            // Handle case where user is not logged in
            res.json({ status: 'logout', message: 'User is not logged in.' });
        }
    } catch (error) {
        console.error('Error fetching cart data:', error);
        res.status(500).json({ status: 'error', message: 'Something went wrong while fetching the cart.' });
    }
})




// ---------------------- //
// ---delete from like functionality-- //
// ---------------- //
app.post('/deletlike', apiLimiter, async(req, res)=>{
    try {
        const product_id = req.body.product_id
        if(req.session.uid){
            const uid = req.session.uid
            const getlikes = await Likes.findOne({
                uid: uid, 
                "likes.product_id": req.body.product_id
            }); 
            if(getlikes){
                await Likes.findOneAndUpdate(
                    { uid: uid }, 
                    { $pull: { likes: { product_id: product_id } } },
                    { new: true }
                );
                res.json({status: 'success'})
            }else{
                res.json({status: 'not found'})
            }
        }
    } catch (error) {
        res.json({status: 'error'})
    }
})


    // ____________________________________=================LIKES FUNCTIION ends==============___________________________________ //

// =================================================ADDING TO CARTS AND LIKES ends================================================== //





// Start the Express server
app.listen(4000, '0.0.0.0');
