const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const bcrypt = require("bcrypt");
const path = require("path");

// Initialize express
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configure Cloudinary
cloudinary.config({
  cloud_name: "dv6qifdrh",
  api_key: "732292154177262",
  api_secret: "MFb_6Yr8t2aPJCoZzF8RKyQgd1I",
});

// Connect to MongoDB directly
mongoose
  .connect(
    "mongodb+srv://hendhany03:969hfEEvWU6dgRTP@final.dhzpt.mongodb.net/meal?retryWrites=true&w=majority&appName=final",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    }
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(err));

// Create a schema and model for meals
const mealSchema = new mongoose.Schema({
  name: String,
  calories: Number,
  imageUrl: String,
  desc: String,
  mealType: String,
});

const Meal = mongoose.model("Meal", mealSchema);

// Setup multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Function to upload to Cloudinary using a stream
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream((error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// Route to add a meal
app.post("/addMeal", upload.single("image"), async (req, res) => {
  const { name, calories, desc, mealType } = req.body;
  if (!req.file) {
    return res.status(400).json({ error: "Image is required" });
  }
  try {
    const result = await uploadToCloudinary(req.file.buffer);
    const meal = new Meal({
      name,
      calories,
      imageUrl: result.secure_url,
      desc,
      mealType,
    });
    await meal.save();
    res.status(201).json({ message: "Meal added successfully", meal });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "An error occurred while adding the meal" });
  }
});

// Route to update a meal
app.put("/updateMeal/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { name, calories, desc, mealType } = req.body;

  try {
    const meal = await Meal.findById(id);
    if (!meal) {
      return res.status(404).json({ message: "Meal not found" });
    }

    let imageUrl = meal.imageUrl;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    }

    meal.name = name || meal.name;
    meal.calories = calories || meal.calories;
    meal.desc = desc || meal.desc;
    meal.mealType = mealType || meal.mealType;
    meal.imageUrl = imageUrl;

    await meal.save();

    res.status(200).json({ message: "Meal updated successfully", meal });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "An error occurred while updating the meal" });
  }
});

// Route to fetch all meals from MongoDB
app.get("/meals", async (req, res) => {
  try {
    const meals = await Meal.find();
    res.status(200).json(meals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Route to fetch a single meal by ID
app.get("/meals/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const meal = await Meal.findById(id);
    if (!meal) {
      return res.status(404).json({ message: "Meal not found" });
    }
    res.status(200).json(meal);
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching the meal" });
  }
});
// Route to fetch a single user by ID
app.get("/user/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const meal = await user.findById(id);
    if (!meal) {
      return res.status(404).json({ message: "user not found" });
    }
    res.status(200).json(meal);
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching the meal" });
  }
});

// Route to delete a meal
app.delete("/deleteMeal/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deletedMeal = await Meal.findByIdAndDelete(id);

    if (!deletedMeal) {
      return res.status(404).json({ error: "Meal not found" });
    }

    res.status(200).json({ message: "Meal deleted successfully", deletedMeal });
  } catch (error) {
    console.error("Error deleting meal:", error);
    res.status(500).json({ error: "An error occurred while deleting the meal" });
  }
});


app.get('/meals/:mealType', async (req, res) => {
  const { mealType } = req.params.mealType; // الحصول على mealType من الرابط
  try {
    const meals = await Meal.find({ mealType }); // البحث عن الوجبات بناءً على mealType
    if (meals.length === 0) {
      return res.status(404).json({ message: `No meals found for ${mealType}.` });
    }
    res.json(meals);
  } catch (error) {
    console.error("Error fetching meals by type:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Authentication Routes

// Define user schema and model for authentication
const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const User = mongoose.model("User", userSchema);

// Handle signup logic
app.post("/signup", async (req, res) => {
  const {userName, email, password } = req.body;
  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send("Email is already in use");
    }

    // Check if password is provided
    if (!password) {
      return res.status(400).send("Password is required");
    }

    // Hash the password before saving it
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

    // Create new user
    const newUser = new User({
      userName,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).send("Signup successful");
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).send("An error occurred.",error);
  }
});


// Render login page
app.get("/login", (req, res) => {
  res.render("login");
});

// Handle login logic
app.post("/login", async (req, res) => {
  const {userName, email, password } = req.body;

  try {
    // Check if user exists in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" }); // 401 Unauthorized
    }

    // Compare entered password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      // هنا يمكنك إضافة منطق الجلسة إذا لزم الأمر
      return res.json({ message: "Login successful", user }); // إرسال معلومات المستخدم
    } else {
      return res.status(401).json({ message: "Invalid email or password" }); // 401 Unauthorized
    }
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ message: "An error occurred. Please try again." }); // 500 Internal Server Error
  }
});

// Start server
const port = 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
