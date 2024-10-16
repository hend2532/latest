
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/users', { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
});

// Define user schema and model
const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    }
});

const User = mongoose.model('User', userSchema);

// Create a new user with a hashed password
async function createUser(email, plainPassword) {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = new User({
        email,
        password: hashedPassword
    });

    await user.save();
    console.log('User created:', user);
}

// Example usage:
createUser('test@example.com', 'password123');
