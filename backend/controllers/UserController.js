const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';


exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password!" });
        }

        let isMatch = false;

        // Check if the stored password is a bcrypt hash 
        const isBcryptHash = user.password && user.password.startsWith('$2');

        if (isBcryptHash) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            // Fallback for plain text passwords created previously
            isMatch = (password === user.password);

            // Optional auto-migration: Hash plain text password on successful login
            if (isMatch) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(password, salt);
                await user.save();
            }
        }

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password!" });
        }

        // Sign JWT token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: "Success",
            token: token,
            name: user.name,
            role: user.role
        });
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists with this email!" });
        }

        // Hash password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || "Viewer"
        });

        res.status(201).json({ 
            message: "User created successfully!", 
            user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role } 
        });
    } catch (err) {
        res.status(500).json({ message: "Database Insertion Failed", error: err.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { name, email, role } = req.body;

        // Find user by ID and update fields
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, role },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        res.status(200).json({
            message: "User updated successfully!",
            user: updatedUser
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to update user", error: err.message });
    }
};

exports.getUserList = async (req, res) => {
    try {
        // Password field ko exclude karke baaki user records le aayen
        const users = await User.find({}).select('-password'); 
        
        console.log(`[DB] Fetched ${users.length} users successfully.`);
        return res.status(200).json(users);
    } catch (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({ message: "Failed to fetch users", error: err.message });
    }
};

exports.getUserDetail = async (req, res) => {
    try {
        const user = await User.findById(req.params.id); // MongoDB Object ID (_id) use karega
        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json({ message: "User not found!" });
        }
    } catch (err) {
        res.status(500).json({ message: "Invalid ID format", error: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (deletedUser) {
            res.status(200).json({ message: "User deleted successfully from cloud!" });
        } else {
            res.status(404).json({ message: "User does not exist" });
        }
    } catch (err) {
        res.status(500).json({ message: "Error deleting user", error: err.message });
    }
};