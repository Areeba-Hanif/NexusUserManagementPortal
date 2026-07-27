const User = require('../models/User'); // Adjust path to your User model

exports.getDashboardStats = async (req, res) => {
    try {
        // Run database queries in parallel for efficiency
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ status: 'Active' });
        const adminUsers = await User.countDocuments({ role: 'Admin' });
        const standardUsers = await User.countDocuments({ role: { $in: ['User', 'Viewer', 'Standard User'] } });

        // Calculate users registered in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentSignups = await User.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        res.status(200).json({
            totalUsers: totalUsers,
            activeUsers: activeUsers,
            adminUsers: adminUsers,
            standardUsers: standardUsers,
            recentSignups: recentSignups
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: "Failed to load dashboard metrics.", error: error.message });
    }
};