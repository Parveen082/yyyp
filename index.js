require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;
const MONGO_URI = process.env.MONGO_URI;
const AUTH_KEY = process.env.AUTH_KEY;

if (!MONGO_URI || !AUTH_KEY) {
    console.error("❌ MONGO_URI or AUTH_KEY is missing in .env file");
    process.exit(1);
}

let isConnected = false;

const connectDB = async () => {
    if (!isConnected) {
        try {
            await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
            isConnected = true;
            console.log("✅ Connected to MongoDB");
        } catch (error) {
            console.error("❌ MongoDB Connection Error:", error.message);
            process.exit(1);
        }
    }
};

// Middleware for Authorization
const authorize = (req, res, next) => {
    const authHeader = req.headers['x-auth-key'];
    if (!authHeader || authHeader !== AUTH_KEY) {
        return res.status(403).json({ message: "❌ Unauthorized Access" });
    }
    next();
};

// Middleware to enforce JSON Content-Type
const enforceJson = (req, res, next) => {
    if (req.headers['content-type'] !== 'application/json') {
        return res.status(400).json({ message: "❌ Content-Type must be application/json" });
    }
    next();
};

app.use(express.json());
app.use(authorize); 
app.use(enforceJson); 


const ProductSchema = new mongoose.Schema({
    mobile: { type: String, required: true, unique: true }, 
    name: { type: String, required: true },
    dob: { type: String, required: true },
    email: { type: String, required: true },  
    employeeType: { type: String, required: true },
    pancard: { type: String, required: true }  
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model('zyps', ProductSchema);

// Handle duplicate mobile errors
ProductSchema.post('save', function (error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error("❌ Duplicate entry: Mobile number already exists."));
    } else {
        next(error);
    }
});

// Create Product (Check only `mobile` for duplicates)
app.post('/products', async (req, res) => {
    await connectDB();
    try {
        const { mobile } = req.body;

        // Check if `mobile` already exists
        const existingProduct = await Product.findOne({ mobile });

        if (existingProduct) {
            return res.status(400).json({ message: "❌ Duplicate entry: Mobile number already exists." });
        }

        const product = await Product.create(req.body);
        res.status(201).json({ message: "✅ zypp lead created", product });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "❌ Duplicate key error", error });
        }
        res.status(500).json({ message: "❌ Error creating zypp lead", error: error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
